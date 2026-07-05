// src/main/main.js
// Processo principal do Electron. Cria a janela, registra os handlers IPC
// que o renderer chama através do preload, e serve o bundle do React.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const adb = require('../adb/adb');
const { checkDevices } = require('../adb/adbOrchestrator');
const { runTask, revertEntry } = require('./runner');
const revertStore = require('./revertStore');

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 720,
    minWidth: 980,
    backgroundColor: '#141318',
    title: 'DexArmor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Interceptação do fechar: na primeira tentativa, em vez de fechar, avisamos
  // o renderer para mostrar o pop-up de acessórios. Só fechamos de fato quando
  // o renderer confirma (allowClose = true).
  let allowClose = false;
  win.on('close', (e) => {
    if (!allowClose) {
      e.preventDefault();
      win.webContents.send('show-close-popup');
    }
  });
  // O renderer chama isto quando o usuário confirma o fechamento no pop-up.
  ipcMain.on('confirm-close', () => {
    allowClose = true;
    win.close();
  });

  // Em DEV (--dev): carrega do servidor do Vite, com hot reload.
  // Em PRODUÇÃO: carrega o HTML buildado pelo Vite em dist/renderer.
  const isDev = process.argv.includes('--dev');
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html'));
  }
}

// ---- Handlers IPC: toda a lógica ADB vive aqui, no main ----
ipcMain.handle('adb:listDevices', () => adb.listDevices());
ipcMain.handle('adb:describeDevice', (_e, serial) => adb.describeDevice(serial));

// Aplica uma task. Agora runTask devolve { detail, revert }. Guardamos a
// informação de reversão no disco e devolvemos só o detail ao renderer
// (a interface não precisa conhecer os detalhes de reversão).
ipcMain.handle('adb:runTask', async (_e, serial, task) => {
  const { detail, revert } = await runTask(serial, task);
  if (revert) {
    revertStore.addEntry(serial, { taskId: task.id, label: task.label, revert });
  }
  return detail;
});

// Quantas reversões pendentes existem para este aparelho (habilita o botão).
ipcMain.handle('revert:count', (_e, serial) => revertStore.count(serial));

// Lista as entradas de reversão (para o diálogo de confirmação mostrar o que
// será desfeito).
ipcMain.handle('revert:list', (_e, serial) => revertStore.read(serial).entries);

// Executa a reversão de UMA entrada (o renderer chama uma por uma, para poder
// mostrar o progresso item a item). Em sucesso, remove a entrada do registro.
ipcMain.handle('revert:one', async (_e, serial, taskId) => {
  const data = revertStore.read(serial);
  const entry = data.entries.find((x) => x.taskId === taskId);
  if (!entry) throw new Error('Entrada de reversão não encontrada');
  const result = await revertEntry(serial, entry); // pode lançar
  revertStore.removeEntries(serial, [taskId]);
  return result;
});

// Detecção + recuperação automática do ADB para a tela "Conecte seu Galaxy".
// Reaproveita adb.adbPath() (binário empacotado, resolvido por plataforma) e
// emite as fases de progresso de volta ao renderer via canal 'adb:phase'.
ipcMain.handle('adb:check', async (event, opts = {}) => {
  return checkDevices({
    adbPath: adb.adbPath(),
    recover: opts.recover ?? true,
    onStatus: (fase) => event.sender.send('adb:phase', fase),
  });
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
