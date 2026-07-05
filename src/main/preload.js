// src/main/preload.js
// Ponte segura: expõe apenas funções específicas ao renderer.
// contextIsolation fica ligado, então o renderer nunca toca em Node direto.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listDevices: () => ipcRenderer.invoke('adb:listDevices'),
  describeDevice: (serial) => ipcRenderer.invoke('adb:describeDevice', serial),
  runTask: (serial, task) => ipcRenderer.invoke('adb:runTask', serial, task),

  // Detecção + recuperação automática (tela "Conecte seu Galaxy").
  checkDevices: (opts) => ipcRenderer.invoke('adb:check', opts),
  // Recebe as fases do orquestrador. Devolve uma função de cleanup.
  onPhase: (cb) => {
    const handler = (_e, fase) => cb(fase);
    ipcRenderer.on('adb:phase', handler);
    return () => ipcRenderer.removeListener('adb:phase', handler);
  },

  // Pop-up de fechamento: o main avisa quando o usuário tenta fechar.
  // Devolve uma função de cleanup, no mesmo padrão do onPhase.
  onShowClosePopup: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('show-close-popup', handler);
    return () => ipcRenderer.removeListener('show-close-popup', handler);
  },
  // O renderer confirma o fechamento (após o usuário decidir no pop-up).
  confirmClose: () => ipcRenderer.send('confirm-close'),

  // Reversão de alterações.
  revertCount: (serial) => ipcRenderer.invoke('revert:count', serial),
  revertList: (serial) => ipcRenderer.invoke('revert:list', serial),
  revertOne: (serial, taskId) => ipcRenderer.invoke('revert:one', serial, taskId),
  revertExport: (serial) => ipcRenderer.invoke('revert:export', serial),
  revertImport: (serial) => ipcRenderer.invoke('revert:import', serial),

  // Check-up: verifica se um ajuste aplicado continua valendo no aparelho.
  verifyTask: (serial, task) => ipcRenderer.invoke('adb:verifyTask', serial, task),

  // Conexão por Wi-Fi (dispensa o cabo depois do primeiro pareamento).
  enableWifi: (serial) => ipcRenderer.invoke('adb:enableWifi', serial),

  // Salva o relatório de configuração em arquivo de texto.
  saveReport: (text) => ipcRenderer.invoke('report:save', text),

  // Espelha a tela do celular numa janela (scrcpy), controlável por mouse.
  startMirror: (serial, title) => ipcRenderer.invoke('scrcpy:start', serial, title),
});
