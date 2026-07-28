// src/main/preload.js
// Ponte segura: expõe apenas funções específicas ao renderer.
// contextIsolation fica ligado, então o renderer nunca toca em Node direto.

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Idioma da interface. Lido uma vez na abertura; gravado quando o usuário
  // troca no rodapé da coluna esquerda.
  getLanguage: () => ipcRenderer.invoke('settings:getLanguage'),
  setLanguage: (lang) => ipcRenderer.invoke('settings:setLanguage', lang),

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
  // O renderer avisa que o pop-up está visível — cancela o fechamento direto
  // que o main dispararia por segurança se ninguém respondesse.
  ackClosePopup: () => ipcRenderer.send('close-popup-shown'),

  // Reversão de alterações.
  revertCount: (serial) => ipcRenderer.invoke('revert:count', serial),
  revertList: (serial) => ipcRenderer.invoke('revert:list', serial),
  revertOne: (serial, taskId) => ipcRenderer.invoke('revert:one', serial, taskId),
  revertExport: (serial) => ipcRenderer.invoke('revert:export', serial),
  revertImport: (serial) => ipcRenderer.invoke('revert:import', serial),

  // Check-up: verifica se um ajuste aplicado continua valendo no aparelho.
  verifyTask: (serial, task) => ipcRenderer.invoke('adb:verifyTask', serial, task),

  // Alternância de modos (ponte celular ⇄ TV): adormece/acorda uma entrada de
  // modo por vez (o renderer dirige a fila para mostrar o progresso).
  modeSleepOne: (serial, taskId, fallbackTask) => ipcRenderer.invoke('mode:sleepOne', serial, taskId, fallbackTask),
  modeWakeOne: (serial, taskId, fallbackTask) => ipcRenderer.invoke('mode:wakeOne', serial, taskId, fallbackTask),
  // Alternância robusta: pré-checagem (aparelho vivo, tela pronta, launcher
  // presente), um passo com obstáculo classificado (a interface pergunta em
  // vez de seguir às cegas) e conferência final — tudo com retorno
  // estruturado { ok, ... }, sem exceção crua atravessando o IPC.
  modePreflight: (serial, opts) => ipcRenderer.invoke('mode:preflight', serial, opts),
  modeSwitchOne: (serial, direction, taskId, fallbackTask, opts) => ipcRenderer.invoke('mode:switchOne', serial, direction, taskId, fallbackTask, opts),
  modeVerifyOne: (serial, direction, taskId, fallbackTask, opts) => ipcRenderer.invoke('mode:verifyOne', serial, direction, taskId, fallbackTask, opts),
  // Preferências por aparelho (ex.: modo TV automático ao conectar).
  modeGetPrefs: (serial) => ipcRenderer.invoke('mode:getPrefs', serial),
  modeSetPrefs: (serial, patch) => ipcRenderer.invoke('mode:setPrefs', serial, patch),

  // Perfis nomeados de interface ("Sala 4K"): salvar a interface atual com um
  // nome, listar e excluir. Aplicar é no renderer (mesma esteira das tasks).
  profilesList: (serial) => ipcRenderer.invoke('profiles:list', serial),
  profilesSave: (serial, name, items) => ipcRenderer.invoke('profiles:save', serial, name, items),
  profilesDelete: (serial, profileId) => ipcRenderer.invoke('profiles:delete', serial, profileId),
  // Fim de sessão após a Reversão completa (apaga preferências e histórico).
  sessionReset: (serial) => ipcRenderer.invoke('session:reset', serial),

  // Controle remoto virtual: envia uma tecla por nome (validada no main).
  sendRemoteKey: (serial, keyName) => ipcRenderer.invoke('remote:key', serial, keyName),
  // Girar tela: um quarto de volta por giro, quantas vezes for preciso.
  // A posição escolhida vira o perfil TV (com reversão registrada).
  rotateScreen: (serial) => ipcRenderer.invoke('screen:rotate', serial),
  // Painel de saúde: bateria + armazenamento (só leitura).
  getHealth: (serial) => ipcRenderer.invoke('health:get', serial),
  // Limpeza com um clique: prévia do que será liberado (por app), execução
  // com relatório detalhado + registro em disco, e atalho para abrir a pasta.
  cleanPreview: (serial) => ipcRenderer.invoke('clean:preview', serial),
  cleanCaches: (serial) => ipcRenderer.invoke('clean:caches', serial),
  openCleanLogs: () => ipcRenderer.invoke('clean:openLogs'),

  // Conexão por Wi-Fi (dispensa o cabo depois do primeiro pareamento).
  enableWifi: (serial) => ipcRenderer.invoke('adb:enableWifi', serial),

  // Salva o relatório de configuração em arquivo de texto.
  saveReport: (text) => ipcRenderer.invoke('report:save', text),

  // Espelha a tela do celular numa janela (scrcpy), controlável por mouse.
  startMirror: (serial, title) => ipcRenderer.invoke('scrcpy:start', serial, title),
  restartMirror: (serial) => ipcRenderer.invoke('scrcpy:restart', serial),
  modeJournal: (serial, event) => ipcRenderer.invoke('mode:journal', serial, event),
  modeJournalList: (serial) => ipcRenderer.invoke('mode:journalList', serial),

  // Enviar para o celular: caminho real do arquivo arrastado + envio/instalação.
  // Resolve o caminho real (no disco) de um File arrastado para a janela.
  // Electron moderno removeu file.path do renderer; o caminho oficial é
  // webUtils.getPathForFile, chamado AQUI no preload. O fallback cobre
  // versões antigas do Electron onde file.path ainda existia.
  getFilePath: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch { /* cai para o fallback */ }
    return file && file.path ? file.path : null;
  },

  // Envia um arquivo para uma pasta fixa do aparelho
  // ('download' | 'movies' | 'music' | 'roms').
  sendFile: (serial, localPath, destKey) =>
    ipcRenderer.invoke('send:file', serial, localPath, destKey),

  // Instala um APK diretamente no aparelho.
  sendApk: (serial, localPath) =>
    ipcRenderer.invoke('send:apk', serial, localPath),

  // Cancela o envio/instalação em andamento (botão "Cancelar").
  cancelSend: () => ipcRenderer.invoke('send:cancel'),

  // Espaço livre (bytes) no armazenamento do celular, para checar se cabe antes
  // de enviar. Retorna { totalBytes, usedBytes, freeBytes }.
  getSendFreeSpace: (serial) => ipcRenderer.invoke('send:freespace', serial),

  // Progresso ({ fileName, kind, percent, transferredBytes, totalBytes };
  // percent -1 = indeterminado).
  onSendProgress: (callback) =>
    ipcRenderer.on('send:progress', (_e, data) => callback(data)),
});
