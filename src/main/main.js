// src/main/main.js
// Processo principal do Electron. Cria a janela, registra os handlers IPC
// que o renderer chama através do preload, e serve o bundle do React.

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const adb = require('../adb/adb');
const { checkDevices } = require('../adb/adbOrchestrator');
const { runTask, revertEntry, verifyTask } = require('./runner');
const revertStore = require('./revertStore');
const scrcpy = require('./scrcpy');

// O registro de reversão é indexado pelo serial DE FÁBRICA (ro.serialno),
// não pelo serial de transporte do adb: na conexão Wi-Fi o transporte vira
// "ip:porta", e sem essa tradução as reversões se fragmentariam entre USB e
// Wi-Fi como se fossem dois aparelhos. Por USB os dois valores coincidem nos
// Samsung, então registros antigos continuam válidos.
const serialCache = new Map();
async function stableSerial(serial) {
  const hit = serialCache.get(serial);
  if (hit) return hit;
  try {
    const sn = (await adb.getSerialNo(serial)).trim();
    if (sn) {
      serialCache.set(serial, sn);
      return sn;
    }
  } catch { /* aparelho pode estar fora do ar; usa o transporte sem cachear */ }
  return serial;
}

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
  // removeAllListeners: no macOS, reabrir pelo Dock cria uma nova janela e
  // este handler é registrado de novo — sem a limpeza, o handler antigo
  // (apontando para a janela destruída) também dispararia e lançaria erro.
  ipcMain.removeAllListeners('confirm-close');
  ipcMain.on('confirm-close', () => {
    allowClose = true;
    win.close();
  });

  // Qualquer link com target=_blank (ex.: vitrine de acessórios) abre no
  // navegador padrão do sistema, nunca numa janela do Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
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
// Se a task falhar NO MEIO (ex.: 3 de 5 pacotes removidos), o erro traz
// `partialRevert` — persistimos essa reversão parcial antes de repassar o
// erro, para o que já foi alterado continuar desfazível.
ipcMain.handle('adb:runTask', async (_e, serial, task) => {
  const storeKey = await stableSerial(serial);
  let result;
  try {
    result = await runTask(serial, task);
  } catch (err) {
    if (err && err.partialRevert) {
      revertStore.addEntry(storeKey, { taskId: task.id, label: task.label, revert: err.partialRevert });
    }
    throw err;
  }
  const { detail, revert } = result;
  if (revert) {
    revertStore.addEntry(storeKey, { taskId: task.id, label: task.label, revert });
  }
  return detail;
});

// Quantas reversões pendentes existem para este aparelho (habilita o botão).
ipcMain.handle('revert:count', async (_e, serial) => revertStore.count(await stableSerial(serial)));

// Lista as entradas de reversão (para o diálogo de confirmação mostrar o que
// será desfeito).
ipcMain.handle('revert:list', async (_e, serial) => revertStore.read(await stableSerial(serial)).entries);

// Executa a reversão de UMA entrada (o renderer chama uma por uma, para poder
// mostrar o progresso item a item). Em sucesso, remove a entrada do registro.
ipcMain.handle('revert:one', async (_e, serial, taskId) => {
  const storeKey = await stableSerial(serial);
  const data = revertStore.read(storeKey);
  const entry = data.entries.find((x) => x.taskId === taskId);
  if (!entry) throw new Error('Entrada de reversão não encontrada');
  const result = await revertEntry(serial, entry); // pode lançar
  revertStore.removeEntries(storeKey, [taskId]);
  return result;
});

// Check-up: confere (sem alterar nada) se o efeito de uma task ainda vale.
ipcMain.handle('adb:verifyTask', (_e, serial, task) => verifyTask(serial, task));

// Ativa a conexão por Wi-Fi: descobre o IP do aparelho, reinicia o adbd em
// modo TCP e conecta. Depois disso o cabo pode ser removido — o aparelho
// continua aparecendo em `adb devices` com o serial "ip:5555".
ipcMain.handle('adb:enableWifi', async (_e, serial) => {
  const ip = await adb.getWifiIp(serial);
  if (!ip) {
    throw new Error('O aparelho não está em uma rede Wi-Fi. Conecte-o à mesma rede do computador e tente de novo.');
  }
  await adb.enableTcpip(serial, 5555);
  // O adbd do aparelho reinicia em modo TCP; dá um tempo antes de conectar.
  await new Promise((r) => setTimeout(r, 1500));
  const out = await adb.connectTcp(`${ip}:5555`);
  if (!/connected/i.test(out)) {
    throw new Error(`Não foi possível conectar por Wi-Fi (${out.trim() || 'sem resposta'})`);
  }
  return { ip, wifiSerial: `${ip}:5555` };
});

// Espelhamento da tela do aparelho (scrcpy) numa janela nativa controlável
// por mouse/teclado. Um por aparelho; a janela fecha junto com o app.
ipcMain.handle('scrcpy:start', (_e, serial, title) => scrcpy.start(serial, title));

// Salva um relatório de configuração em arquivo de texto (o renderer monta o
// conteúdo; aqui só abrimos o diálogo de salvar e gravamos).
ipcMain.handle('report:save', async (_e, text) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Salvar relatório de configuração',
    defaultPath: `dexarmor-relatorio-${new Date().toISOString().slice(0, 10)}.txt`,
    filters: [{ name: 'Texto', extensions: ['txt'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, text, 'utf8');
  return true;
});

// Exporta o registro de reversão do aparelho para um JSON — permite desfazer
// as alterações a partir de OUTRO computador (o registro mora nesta máquina).
ipcMain.handle('revert:export', async (_e, serial) => {
  const storeKey = await stableSerial(serial);
  const data = revertStore.read(storeKey);
  if (!data.entries.length) throw new Error('Não há reversões para exportar');
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar registro de reversão',
    defaultPath: `dexarmor-reversao-${storeKey}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, JSON.stringify({ serial: storeKey, ...data }, null, 2), 'utf8');
  return true;
});

// Importa um registro exportado em outro computador. As entradas passam pelo
// mesmo merge do addEntry (o estado original de cada task é preservado).
ipcMain.handle('revert:import', async (_e, serial) => {
  const storeKey = await stableSerial(serial);
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importar registro de reversão',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths || !filePaths[0]) return null;
  const raw = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  if (!raw || !Array.isArray(raw.entries)) {
    throw new Error('Arquivo inválido: não é um registro de reversão do DexArmor');
  }
  for (const entry of raw.entries) {
    if (entry && entry.taskId && entry.revert) revertStore.addEntry(storeKey, entry);
  }
  return revertStore.count(storeKey);
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

// Fecha as janelas de espelhamento junto com o app.
app.on('quit', () => scrcpy.stopAll());
