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
  onShowClosePopup: (callback) => {
    ipcRenderer.on('show-close-popup', callback);
  },
  // O renderer confirma o fechamento (após o usuário decidir no pop-up).
  confirmClose: () => ipcRenderer.send('confirm-close'),

  // Reversão de alterações.
  revertCount: (serial) => ipcRenderer.invoke('revert:count', serial),
  revertList: (serial) => ipcRenderer.invoke('revert:list', serial),
  revertOne: (serial, taskId) => ipcRenderer.invoke('revert:one', serial, taskId),
});
