// src/main/main.js
// Processo principal do Electron. Cria a janela, registra os handlers IPC
// que o renderer chama através do preload, e serve o bundle do React.

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const adb = require('../adb/adb');
const { checkDevices } = require('../adb/adbOrchestrator');
const { runTask, revertEntry, verifyTask, verifyRevert, captureTask, captureLooksLikeTv, ensureScreenReady, installApkFile, REVERT_KINDS, CAPTURABLE_KINDS } = require('./runner');
const revertStore = require('./revertStore');
const settingsStore = require('./settingsStore');
const mainI18n = require('../i18n/runtime.cjs');
const { t } = mainI18n;
const scrcpy = require('./scrcpy');

// Rótulo humano de uma task, resolvido pelo CATÁLOGO.
//
// O `tasks.js` deixou de carregar prosa em 27/07/2026 (o texto foi para
// `src/i18n/*.json`), então `task.label` passou a ser `undefined`. Isso importa
// aqui porque o rótulo é GRAVADO no registro de reversão — e a validação de
// importação exige `okStr(e.label, 500)`. Sem esta função, todo registro novo
// nasceria com `label: undefined` e falharia ao ser reimportado.
function taskLabel(task) {
  if (!task || !task.id) return '';
  const key = `tasks.${task.id}.label`;
  return mainI18n.t(key) === key ? (task.label || task.id) : mainI18n.t(key);
}

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
  //
  // Rede de segurança: se nenhuma tela confirmar que exibiu o pop-up (tela
  // "Conecte seu Galaxy", renderer ainda carregando ou travado), fechamos
  // direto após um curto prazo — o X nunca pode "não responder".
  let allowClose = false;
  let closeFallback = null;

  // Desligar/reiniciar o Windows não espera pop-up de ninguém. Sem isto, a
  // interceptação abaixo seguraria o encerramento da sessão.
  //
  // `removeAllListeners` pelo mesmo motivo dos handlers de IPC logo abaixo: no
  // macOS, reabrir pelo Dock chama `createWindow()` de novo, e sem a limpeza
  // cada reabertura deixaria mais um ouvinte preso ao `allowClose` de uma
  // janela que já não existe.
  app.removeAllListeners('session-end');
  app.on('session-end', () => { allowClose = true; });

  win.on('close', (e) => {
    if (allowClose) return;

    // O pop-up só faz sentido quando QUEM FECHOU está olhando para a janela.
    //
    // Um pedido de fechamento vindo DE FORA — o instalador encerrando o app
    // antes de atualizar, um script, o gerenciador de tarefas — chega com a
    // janela SEM FOCO. Interceptar nesse caso põe o pop-up atrás da janela de
    // quem pediu: ninguém confirma, o app nunca fecha, e o instalador desiste
    // com "Não é possível fechar o DexArmor. Feche a janela e clique em
    // Repetir".
    //
    // Encontrado em 28/07/2026 testando a atualização no Windows. Não é caso
    // raro: atualizar com o programa aberto é o cenário mais comum que existe,
    // e o usuário leigo não tem como adivinhar que precisa ir a outra janela
    // confirmar algo.
    //
    // Clicar no X foca a janela antes de fechá-la, então o caminho do usuário
    // continua vendo o pop-up normalmente.
    if (!win.isFocused()) return;

    e.preventDefault();
    win.webContents.send('show-close-popup');
    clearTimeout(closeFallback);
    closeFallback = setTimeout(() => {
      allowClose = true;
      if (!win.isDestroyed()) win.close();
    }, 800);
  });
  // O renderer avisa que o pop-up está na tela — cancela o fechamento direto.
  ipcMain.removeAllListeners('close-popup-shown');
  ipcMain.on('close-popup-shown', () => clearTimeout(closeFallback));
  // O renderer chama isto quando o usuário confirma o fechamento no pop-up.
  // removeAllListeners: no macOS, reabrir pelo Dock cria uma nova janela e
  // este handler é registrado de novo — sem a limpeza, o handler antigo
  // (apontando para a janela destruída) também dispararia e lançaria erro.
  ipcMain.removeAllListeners('confirm-close');
  ipcMain.on('confirm-close', () => {
    clearTimeout(closeFallback);
    allowClose = true;
    if (!win.isDestroyed()) win.close();
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

// ---- Idioma -----------------------------------------------------------------
// O renderer lê o idioma na abertura e o grava quando o usuário troca. O valor
// vive no main porque os DOIS processos produzem texto de tela: o runner devolve
// `detail` já em linguagem humana, e uma preferência que só existisse no
// renderer deixaria essas frases no idioma errado.
ipcMain.handle('settings:getLanguage', () => {
  // Ler é também a hora de SINCRONIZAR: o renderer pergunta na abertura, e é
  // essa chamada que alinha o main com a preferência salva. Sem isto o primeiro
  // `detail` do runner sairia no idioma de origem.
  const lang = settingsStore.getLanguage();
  mainI18n.setLanguage(lang);
  return lang;
});
ipcMain.handle('settings:setLanguage', (_e, lang) => {
  const saved = settingsStore.setLanguage(lang);
  mainI18n.setLanguage(saved);
  return saved;
});

// ---- Handlers IPC: toda a lógica ADB vive aqui, no main ----
ipcMain.handle('adb:listDevices', () => adb.listDevices());
ipcMain.handle('adb:describeDevice', (_e, serial) => adb.describeDevice(serial));

// Aplica uma task. Agora runTask devolve { detail, revert }. Guardamos a
// informação de reversão no disco e devolvemos só o detail ao renderer
// (a interface não precisa conhecer os detalhes de reversão).
// Se a task falhar NO MEIO (ex.: 3 de 5 pacotes removidos), o erro traz
// `partialRevert` — persistimos essa reversão parcial antes de repassar o
// erro, para o que já foi alterado continuar desfazível.
// A task inteira também é gravada na entrada: o check-up verifica contra o
// que foi REALMENTE aplicado (ex.: dpi escolhido no diálogo), não contra o
// valor do catálogo.
ipcMain.handle('adb:runTask', async (_e, serial, task) => {
  const storeKey = await stableSerial(serial);
  let result;
  try {
    result = await runTask(serial, task);
  } catch (err) {
    if (err && err.partialRevert) {
      revertStore.addEntry(storeKey, { taskId: task.id, label: taskLabel(task), task, revert: err.partialRevert });
    }
    throw err;
  }
  const { detail, revert } = result;
  if (revert) {
    revertStore.addEntry(storeKey, { taskId: task.id, label: taskLabel(task), task, revert });
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
  if (!entry) throw new Error(t('main.revertEntryNotFound'));
  // Entrada adormecida (aparelho em modo celular): o ajuste em tese JÁ está
  // desfeito no aparelho. Mas "em tese" não basta — se a volta ao celular
  // escreveu um phoneRevert contaminado com valores de TV, a entrada está
  // dormente COM o aparelho ainda torto, e descartá-la sem conferir perderia
  // o estado original para sempre (foi exatamente o que aconteceu com um
  // S21 FE em 21/07/2026). O contrato da Reversão é devolver o aparelho ao
  // estado ORIGINAL — então a conferência é contra entry.revert (conferir o
  // phoneRevert não pegaria a contaminação: o aparelho COMBINA com um retrato
  // contaminado que foi escrito "com sucesso"). Se o original não confirma,
  // executa a reversão de verdade em vez de só esquecer a entrada.
  if (entry.dormant) {
    let intact = false;
    try { intact = entry.revert ? (await verifyRevert(serial, entry.revert)).ok : false; }
    catch { intact = false; /* sem leitura = não dá para afirmar; reverte */ }
    if (!intact) {
      const result = await revertEntry(serial, entry); // pode lançar; entrada fica
      revertStore.appendJournal(storeKey, { type: 'dormente-restaurado', detail: taskId });
      revertStore.removeEntries(storeKey, [taskId]);
      return t('main.restoredNotOriginal', { result });
    }
    revertStore.removeEntries(storeKey, [taskId]);
    return t('main.alreadyUndone');
  }
  const result = await revertEntry(serial, entry); // pode lançar
  revertStore.removeEntries(storeKey, [taskId]);
  return result;
});

// ---- Alternância de modos (ponte celular ⇄ TV) ------------------------------
// As tasks "de modo" (settings/resolução/launcher padrão/etc.) alternam em
// segundos; as estruturais (apps instalados, bloatware removido) ficam nos
// dois modos. Quem decide o que é "de modo" é o renderer (catálogo); o main
// só executa sobre as entradas indicadas.

// Qual task usar: a do PERFIL SALVO ou a do CATÁLOGO ATUAL?
//
// A resposta depende do tipo, e o critério é se aquele tipo pode ter virado
// perfil vivo. `entry.task` só é perfil vivo para os tipos que o `captureTask`
// refotografa (CAPTURABLE_KINDS). Nesses, ele reflete o que o usuário
// personalizou e DEVE vencer o catálogo — é a funcionalidade "sua interface
// vira o novo perfil".
//
// Para os demais (`home`, `dnd`), o `captureTask` sempre devolve `null`: o
// `entry.task` nunca é atualizado e fica congelado como o catálogo era no dia
// da primeira aplicação. Deixá-lo vencer significa que **nenhuma mudança de
// catálogo chega a um aparelho já provisionado**, em nenhuma ida ao modo TV —
// e não só na primeira.
//
// O caso concreto que motivou isto (registro de 15/07/2026 ainda nesta
// máquina): `tw-home` com `pkg: com.spocky.projengmenu`. Depois que o catálogo
// passou a usar o launcher próprio, aquele aparelho voltaria ao Projectivy
// indefinidamente — em silêncio se o Projectivy ainda estivesse instalado, ou
// falhando com "launcher não instalado" se não estivesse.
//
// O `fallbackTask` vem do renderer com a entrada ATUAL do catálogo. Quando ele
// não existe (task saiu do catálogo), o `entry.task` ainda serve de último
// recurso — melhor reaplicar algo conhecido do que não ter o que reaplicar.
//
// Efeito colateral desejado: como o `sleepOneImpl` regrava `patch.task` com o
// que escolheu aqui, um registro desatualizado se CORRIGE SOZINHO na próxima
// ida ao modo celular. Não é preciso migrar registro nenhum.
function preferredTask(entry, fallbackTask) {
  if (entry.task && CAPTURABLE_KINDS.has(entry.task.kind)) return entry.task;
  return fallbackTask || entry.task || null;
}

// Adormece UMA entrada: fotografa o modo TV como está AGORA (o perfil vivo —
// personalizações feitas ao longo dos dias viram o novo perfil), devolve o
// aparelho ao estado celular registrado e marca a entrada como dormant.
// `fallbackTask` cobre registros antigos que não gravaram entry.task.
// `force` reexecuta mesmo uma entrada já dormente — é o "Corrigir agora" da
// conferência final. Nesse caso o snapshot do perfil TV é PULADO: o aparelho
// já está em estado de celular, e fotografá-lo contaminaria o perfil TV salvo.
// `layer: 'original'` é o RESET DE INTERFACE: em vez do perfil celular vivo
// (phoneRevert), devolve o estado ORIGINAL da primeira aplicação
// (entry.revert) e APAGA o phoneRevert — é a saída quando o retrato vivo foi
// contaminado com valores de TV e o "modo celular" ficou torto. O perfil TV
// (entry.task) não é tocado nem refotografado: o estado atual do aparelho é
// justamente o que está sob suspeita.
async function sleepOneImpl(serial, storeKey, taskId, fallbackTask, { force = false, layer = 'live' } = {}) {
  const data = revertStore.read(storeKey);
  const entry = data.entries.find((x) => x.taskId === taskId);
  if (!entry) throw new Error(t('main.entryNotFound'));
  if (entry.dormant && !force) return t('main.alreadyPhoneMode');
  const baseTask = preferredTask(entry, fallbackTask);
  // 1) Snapshot do perfil TV (não fatal: se a leitura falhar, mantém o atual).
  let snapshot = null;
  if (layer !== 'original' && baseTask && !entry.dormant) {
    try { snapshot = await captureTask(serial, baseTask, entry.revert); } catch { /* mantém */ }
  }
  // 2) Reverte no aparelho para o ÚLTIMO estado de celular conhecido
  //    (phoneRevert, atualizado a cada ida ao modo TV) — não para o estado
  //    original: se o usuário mudou algo no modo celular ao longo dos dias
  //    (outro launcher padrão, outra rotação/exibição), é para lá que ele
  //    volta. O estado ORIGINAL (entry.revert) fica reservado à Reversão
  //    completa e ao reset de interface. Se falhar, NÃO marca dormant — a
  //    entrada continua ativa e reversível, e o renderer reporta o item como
  //    pendente.
  //    Exceção: a ROTAÇÃO volta sempre ao estado ORIGINAL do aparelho — ela
  //    não tem "perfil celular vivo" (ver mode:wakeOne), e um phoneRevert
  //    antigo pode carregar valores de TV de uma volta que falhou.
  const phoneState = layer === 'original'
    ? entry.revert
    : (entry.revert && entry.revert.kind === 'rotate'
      ? entry.revert
      : (entry.phoneRevert || entry.revert));
  const result = await revertEntry(serial, { ...entry, revert: phoneState });
  // 3) Persiste o perfil (possivelmente atualizado pelo snapshot) + dormant.
  const patch = { dormant: true };
  if (snapshot || baseTask) patch.task = snapshot || baseTask;
  // Reset de interface: o retrato vivo estava (possivelmente) contaminado —
  // apagá-lo faz a próxima volta ao celular partir do estado original, até
  // uma nova ida ao TV capturar um retrato limpo. `undefined` some do JSON.
  if (layer === 'original') patch.phoneRevert = undefined;
  revertStore.updateEntry(storeKey, taskId, patch);
  return result;
}

// Acorda UMA entrada: reaplica a task do perfil salvo (como o usuário a deixou
// na última vez em modo TV). O addEntry funde a reversão preservando o estado
// ORIGINAL do aparelho e limpa o dormant.
async function wakeOneImpl(serial, storeKey, taskId, fallbackTask) {
  const data = revertStore.read(storeKey);
  const entry = data.entries.find((x) => x.taskId === taskId);
  if (!entry) throw new Error(t('main.entryNotFound'));
  const task = preferredTask(entry, fallbackTask);
  if (!task) throw new Error(t('main.noProfileToReapply'));
  // Dormente = ida LIMPA ao modo TV (o aparelho está em estado de celular).
  // Não dormente = RETOMADA de uma ida que falhou no meio: parte dos valores
  // no aparelho já é de TV, e o retrato capturado agora não pode SUBSTITUIR o
  // perfil celular — só complementar o que faltou (merge abaixo).
  const wasDormant = !!entry.dormant;
  // VACINA contra contaminação do phoneRevert: uma captura com "cara de TV"
  // (valores que o próprio modo TV aplica — resíduo de uma volta que ficou
  // torta) NÃO vira retrato do celular. Cai para o phoneRevert anterior — se
  // ele mesmo não tiver cara de TV (arquivos anteriores à vacina podem ter) —
  // ou para o estado original. O descarte fica anotado no diário.
  const sanitizeCapture = (captured) => {
    if (!captureLooksLikeTv(task, captured)) return captured;
    revertStore.appendJournal(storeKey, { type: 'captura-descartada', taskId });
    if (entry.phoneRevert && !captureLooksLikeTv(task, entry.phoneRevert)) {
      return entry.phoneRevert;
    }
    return entry.revert || null;
  };
  try {
    const { detail, revert } = await runTask(serial, task);
    if (revert) {
      // O estado capturado agora, ANTES de aplicar o modo TV, é o retrato
      // mais recente do modo celular — vira o phoneRevert (perfil celular
      // vivo), depois de passar pela vacina acima. O merge do addEntry segue
      // preservando o estado ORIGINAL em entry.revert, para a Reversão
      // completa.
      // Exceção: a ROTAÇÃO não ganha phoneRevert. Se uma volta ao celular
      // falhasse no meio, os valores de TV (tela girada e travada) seriam
      // capturados aqui como "estado do celular" e o aparelho passaria a
      // alternar torto para sempre. O modo celular volta sempre à rotação
      // original (entry.revert).
      const patch = { taskId, label: entry.label, task, revert };
      if (revert.kind !== 'rotate') {
        const captured = sanitizeCapture(revert);
        if (captured) {
          patch.phoneRevert = wasDormant
            ? captured
            : revertStore.mergeRevert(entry.phoneRevert, captured);
        }
      }
      revertStore.addEntry(storeKey, patch);
    } else {
      revertStore.updateEntry(storeKey, taskId, { dormant: false });
    }
    return detail;
  } catch (err) {
    // Aplicação parcial (ex.: 2 de 3 chaves): o que entrou precisa continuar
    // reversível e a entrada volta a contar como ativa. O phoneRevert passa
    // pela mesma vacina e pelo mesmo merge da retomada — o retrato parcial
    // não pode apagar chaves de celular já capturadas numa tentativa
    // anterior.
    if (err && err.partialRevert) {
      const captured = sanitizeCapture(err.partialRevert);
      const patch = { taskId, label: entry.label, task, revert: err.partialRevert };
      if (captured) {
        patch.phoneRevert = wasDormant
          ? captured
          : revertStore.mergeRevert(entry.phoneRevert, captured);
      }
      revertStore.addEntry(storeKey, patch);
    }
    throw err;
  }
}

ipcMain.handle('mode:sleepOne', async (_e, serial, taskId, fallbackTask) =>
  sleepOneImpl(serial, await stableSerial(serial), taskId, fallbackTask));

ipcMain.handle('mode:wakeOne', async (_e, serial, taskId, fallbackTask) =>
  wakeOneImpl(serial, await stableSerial(serial), taskId, fallbackTask));

// ---- Robustez da alternância: obstáculos viram PERGUNTAS -------------------
// Classifica um erro num obstáculo que a interface sabe perguntar ao usuário,
// em vez de seguir às cegas marcando avisos.
function classifyObstacle(err) {
  const msg = String((err && err.message) || err || '');
  if (/not found|no devices|offline|connection reset|protocol fault|closed/i.test(msg)) return 'disconnected';
  if (/unauthorized/i.test(msg)) return 'unauthorized';
  if (/Launcher não está instalado/i.test(msg)) return 'launcher-missing';
  return 'error';
}

// Chave do obstáculo → chave do catálogo. O mapa guarda CHAVES, não frases:
// é constante de módulo, avaliada no `require`, quando o idioma ainda não foi
// lido do disco — congelar o texto aqui deixaria a mensagem no idioma errado.
const OBSTACLE_KEYS = {
  disconnected: 'main.obstacle.disconnected',
  unauthorized: 'main.obstacle.unauthorized',
  'launcher-missing': 'main.obstacle.launcherMissing',
  busy: 'main.obstacle.busy',
  identity: 'main.obstacle.identity',
};

// ---- Lock de troca única por aparelho (invariante: 1 troca por aparelho) ----
// O main é a ÚNICA autoridade: uma operação de alternância em voo bloqueia
// qualquer outra no MESMO aparelho — rede contra duplo clique, ponte automática
// disparando durante troca manual e reconexão no meio de uma retomada. Escopo
// de OPERAÇÃO (adquirido e liberado a cada passo, sempre em finally), então o
// lock NUNCA vaza se um renderer fechar no meio de uma troca.
const activeSwitches = new Set();
class SwitchBusyError extends Error {
  constructor() { super(t(OBSTACLE_KEYS.busy)); this.switchBusy = true; }
}
async function withSwitchLock(storeKey, fn) {
  if (activeSwitches.has(storeKey)) throw new SwitchBusyError();
  activeSwitches.add(storeKey);
  try { return await fn(); }
  finally { activeSwitches.delete(storeKey); }
}

function cleanMessage(err) {
  return String((err && err.message) || err || 'Erro desconhecido');
}

// Pré-checagem da alternância: aparelho responde? tela pronta (acesa e sem
// bloqueio)? launcher de TV presente (na ida ao modo TV)? Falhar AQUI é
// barato — nenhuma escrita aconteceu ainda; a interface pergunta e o usuário
// resolve antes de o aparelho ficar meio-trocado.
ipcMain.handle('mode:preflight', async (_e, serial, opts = {}) => {
  if (!(await adb.deviceAlive(serial))) {
    return {
      ok: false,
      obstacle: 'disconnected',
      message: t('main.obstacle.notResponding'),
    };
  }
  // Pré-condição de IDENTIDADE nos fluxos AUTOMÁTICOS (ponte automática e
  // retomada), que aplicam sem o usuário pedir naquele instante: lê o
  // ro.serialno FRESCO (sem cache) e confere que o aparelho conectado é MESMO
  // o do registro. Divergência (o transporte foi reatribuído a outro aparelho)
  // = corrige o cache e NÃO aplica às cegas — vira pergunta. Sem leitura, não
  // bloqueia por isso (o fail-safe do resto do fluxo cobre).
  if (opts.confirmIdentity) {
    const stable = await stableSerial(serial);
    let fresh = null;
    try { fresh = (await adb.getSerialNo(serial)).trim(); } catch { /* sem leitura */ }
    if (fresh && fresh !== stable) {
      serialCache.set(serial, fresh);
      return { ok: false, obstacle: 'identity', message: t(OBSTACLE_KEYS.identity) };
    }
  }
  const screen = await ensureScreenReady(serial).catch(() => ({ ok: true }));
  if (!screen.ok) return screen;
  if (opts.direction === 'tv' && opts.launcherPkg) {
    // Se a própria checagem falhar (ex.: queda no meio), não acuse o launcher
    // à toa — o passo seguinte classifica o problema real.
    const has = await adb.hasPackage(serial, opts.launcherPkg).catch(() => true);
    if (!has) {
      return { ok: false, obstacle: 'launcher-missing', message: t(OBSTACLE_KEYS['launcher-missing']) };
    }
  }
  return { ok: true };
});

// Executa UM passo da alternância com robustez: erro comum ganha uma nova
// tentativa silenciosa (soluço momentâneo do ADB resolve sozinho); falha
// persistente volta ESTRUTURADA com o obstáculo classificado — a interface
// pausa a fila e pergunta, nunca deixa a exceção crua estourar no meio.
ipcMain.handle('mode:switchOne', async (_e, serial, direction, taskId, fallbackTask, opts = {}) => {
  const storeKey = await stableSerial(serial);
  // Outra troca já roda neste aparelho: recusa amigável, sem tocar em nada.
  if (activeSwitches.has(storeKey)) {
    return { ok: false, obstacle: 'busy', message: t(OBSTACLE_KEYS.busy) };
  }
  const run = () => (direction === 'phone'
    ? sleepOneImpl(serial, storeKey, taskId, fallbackTask, { force: !!opts.force, layer: opts.layer })
    : wakeOneImpl(serial, storeKey, taskId, fallbackTask));
  // Retry PACIENTE só em falha transitória (soluço do canal): um erro genérico
  // ou uma queda momentânea (disconnected) merece 2–3 tentativas antes de virar
  // obstáculo — cada retry é anotado no diário, então um cabo que começa a
  // degradar aparece ali ANTES de virar falha. Falha DEFINITIVA (autorização
  // pendente, launcher ausente) não é retentada: vira pergunta na hora. As
  // impls são idempotentes (check-então-age), então reexecutar é seguro. Tudo
  // sob o lock do aparelho (liberado no finally, mesmo em erro).
  return withSwitchLock(storeKey, async () => {
    const TRIES = 3;
    let lastErr;
    for (let attempt = 0; attempt < TRIES; attempt++) {
      try {
        return { ok: true, detail: await run() };
      } catch (err) {
        lastErr = err;
        const kind = classifyObstacle(err);
        const transient = kind === 'disconnected' || kind === 'error';
        if (!transient || attempt === TRIES - 1) {
          return { ok: false, obstacle: kind, message: OBSTACLE_KEYS[kind] ? t(OBSTACLE_KEYS[kind]) : cleanMessage(err) };
        }
        revertStore.appendJournal(storeKey, {
          type: 'retry-transitorio',
          detail: `${direction} · ${taskId} · tentativa ${attempt + 1}`,
        });
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    const kind = classifyObstacle(lastErr);
    return { ok: false, obstacle: kind, message: OBSTACLE_KEYS[kind] ? t(OBSTACLE_KEYS[kind]) : cleanMessage(lastErr) };
  }).catch((err) => (err && err.switchBusy
    ? { ok: false, obstacle: 'busy', message: t(OBSTACLE_KEYS.busy) }
    : { ok: false, obstacle: classifyObstacle(err), message: cleanMessage(err) }));
});

// Conferência final da alternância (só leitura): a ida ao TV confere o perfil
// aplicado (verifyTask); a volta ao celular confere o estado restaurado
// (verifyRevert, com a mesma escolha de camada do sleep — rotação vai ao
// original, o resto ao perfil celular vivo; `layer: 'original'` confere
// contra o estado original, para o reset de interface).
ipcMain.handle('mode:verifyOne', async (_e, serial, direction, taskId, fallbackTask, opts = {}) => {
  const storeKey = await stableSerial(serial);
  const data = revertStore.read(storeKey);
  const entry = data.entries.find((x) => x.taskId === taskId);
  if (!entry) return { ok: true, detail: t('main.check.noJournal') };
  try {
    if (direction === 'tv') {
      const task = preferredTask(entry, fallbackTask);
      if (!task) return { ok: true, detail: t('main.check.noProfile') };
      return await verifyTask(serial, task);
    }
    const phoneState = opts.layer === 'original'
      ? entry.revert
      : (entry.revert && entry.revert.kind === 'rotate'
        ? entry.revert
        : (entry.phoneRevert || entry.revert));
    if (!phoneState) return { ok: true, detail: t('main.check.noState') };
    return await verifyRevert(serial, phoneState);
  } catch (err) {
    return { ok: false, detail: cleanMessage(err) };
  }
});

// Preferências por aparelho (ex.: ativar modo TV automaticamente ao conectar).
ipcMain.handle('mode:getPrefs', async (_e, serial) => revertStore.getPrefs(await stableSerial(serial)));
ipcMain.handle('mode:setPrefs', async (_e, serial, patch) => revertStore.setPrefs(await stableSerial(serial), patch));

// Diário de trocas: o renderer anota o RESUMO de cada alternância (direção,
// variante, quantos ok/aviso/pulado/bloqueado). Campos fora da lista são
// ignorados — o diário guarda só o que o diagnóstico usa.
ipcMain.handle('mode:journal', async (_e, serial, event = {}) => {
  const allowed = ['type', 'direction', 'variant', 'done', 'warn', 'skipped', 'blocked', 'stopped', 'detail'];
  const clean = {};
  for (const k of allowed) if (event[k] !== undefined) clean[k] = event[k];
  revertStore.appendJournal(await stableSerial(serial), clean);
  return true;
});

// Leitura do diário (a seção Manutenção mostra os eventos mais recentes).
ipcMain.handle('mode:journalList', async (_e, serial) =>
  revertStore.read(await stableSerial(serial)).journal || []);

// ---- Perfis nomeados de interface --------------------------------------------
// A combinação que FUNCIONOU vira um perfil com nome ("Sala 4K"): a fotografia
// das tasks de modo ativas, com os valores como estão AGORA no aparelho — o
// mesmo snapshot da alternância de modos. Quem decide quais entradas são "de
// modo" é o renderer (catálogo), como na ponte: ele envia { taskId,
// fallbackTask } de cada uma. Aplicar um perfil acontece no renderer, pela
// mesma esteira das execuções (progresso na lateral + reversão com merge).

ipcMain.handle('profiles:list', async (_e, serial) =>
  revertStore.getProfiles(await stableSerial(serial)));

ipcMain.handle('profiles:save', async (_e, serial, name, items = []) => {
  const clean = String(name || '').trim();
  if (!clean) throw new Error(t('main.profile.needName'));
  const storeKey = await stableSerial(serial);
  const data = revertStore.read(storeKey);
  const tasks = [];
  for (const { taskId, fallbackTask } of items) {
    const entry = data.entries.find((x) => x.taskId === taskId);
    if (!entry || entry.dormant) continue; // só o que está ATIVO na tela agora
    const baseTask = preferredTask(entry, fallbackTask);
    if (!baseTask) continue;
    // Fotografa o valor ATUAL no aparelho (giros de tela e ajustes recentes
    // entram); leitura indisponível não trava — fica o último perfil conhecido.
    let snap = null;
    try { snap = await captureTask(serial, baseTask, entry.revert); } catch { /* mantém */ }
    // O perfil vivo (entry.task) acompanha a foto: salvar um perfil também é
    // dizer "a interface de agora é a boa".
    if (snap) revertStore.updateEntry(storeKey, taskId, { task: snap });
    tasks.push(snap || baseTask);
  }
  if (!tasks.length) {
    throw new Error(t('main.profile.nothingToSave'));
  }
  return revertStore.saveProfile(storeKey, { name: clean, tasks });
});

ipcMain.handle('profiles:delete', async (_e, serial, profileId) =>
  revertStore.deleteProfile(await stableSerial(serial), profileId));

// Fim de sessão após a Reversão completa: apaga as preferências e marca o
// recomeço. O histórico de reversão em si já foi consumido item a item pelo
// revert:one; entradas de itens que falharam permanecem (seguem reversíveis).
ipcMain.handle('session:reset', async (_e, serial) => revertStore.resetSession(await stableSerial(serial)));

// ---- Controle remoto virtual ------------------------------------------------
// O computador vira o controle do "TV-celular": teclas via input keyevent,
// por USB ou Wi-Fi. Allowlist proposital (nome amigável -> keycode Android):
// o renderer nunca envia códigos arbitrários ao shell do aparelho.
const REMOTE_KEYS = {
  back: 4,        // KEYCODE_BACK
  home: 3,        // KEYCODE_HOME
  up: 19, down: 20, left: 21, right: 22, ok: 23, // setas + confirmar (DPAD)
  vol_up: 24, vol_down: 25, mute: 164,           // volume
  play_pause: 85, // KEYCODE_MEDIA_PLAY_PAUSE
};
ipcMain.handle('remote:key', async (_e, serial, keyName) => {
  const code = REMOTE_KEYS[keyName];
  if (!code) throw new Error(`Tecla desconhecida: ${keyName}`);
  await adb.sendKeyEvent(serial, code);
  return true;
});

// ---- Girar tela (correção de rotação a qualquer momento) --------------------
// A heurística da task de rotação pode errar o lado em alguns aparelhos e a
// tela ficar em pé na TV — travando o uso. Este botão gira UM quarto de volta
// por vez (0°→90°→180°→270°→0°), quantas vezes o usuário precisar, até a
// posição certa. Cada giro:
//   - passa pelo runTask de 'rotate' com rotação EXPLÍCITA (mantém a trava de
//     rotação e o fixed-to-user-rotation, que obriga os apps a respeitarem);
//   - registra/funde a reversão (o estado ORIGINAL do aparelho é preservado
//     pelo merge do revertStore — a Reversão completa continua exata);
//   - atualiza o perfil TV na hora (entry.task.rotation): a posição que
//     funcionou é a que volta em toda ativação do modo TV daqui em diante.
ipcMain.handle('screen:rotate', async (_e, serial) => {
  const storeKey = await stableSerial(serial);
  // Sob o mesmo lock da ponte: girar a tela no meio de uma troca de modo
  // atropelaria a rotação que a troca está aplicando. Uma coisa por vez.
  try {
    return await withSwitchLock(storeKey, async () => {
      const data = revertStore.read(storeKey);
      const entry = data.entries.find((e) => e.taskId === 'tw-rotate');
      const baseTask = (entry && entry.task) || {
        id: 'tw-rotate', label: t('tasks.tw-rotate.label'), kind: 'rotate', modeScope: 'mode',
        repeatable: true,
      };
      // Próximo quarto de volta a partir da rotação ATUAL do aparelho (chave
      // ausente/vazia equivale a 0). 'null' vira NaN e cai no padrão paisagem.
      const rotRaw = (await adb.getSetting(serial, 'system', 'user_rotation')).trim();
      const cur = rotRaw === '' ? 0 : Number(rotRaw);
      const next = Number.isInteger(cur) && cur >= 0 && cur <= 3 ? (cur + 1) % 4 : 1;
      const task = { ...baseTask, rotation: next };
      const { revert } = await runTask(serial, task);
      if (revert) {
        revertStore.addEntry(storeKey, { taskId: task.id, label: task.label, task, revert });
      } else {
        revertStore.updateEntry(storeKey, task.id, { task, dormant: false });
      }
      return { rotation: next };
    });
  } catch (err) {
    if (err && err.switchBusy) throw new Error(t(OBSTACLE_KEYS.busy));
    throw err;
  }
});

// ---- Painel de saúde ----------------------------------------------------------
// Bateria (nível, temperatura, carga) + armazenamento livre. Só leitura —
// nada é alterado no aparelho.
ipcMain.handle('health:get', async (_e, serial) => {
  const [battery, storage] = await Promise.all([
    adb.getBatteryHealth(serial),
    adb.getStorageInfo(serial),
  ]);
  return { battery, storage };
});

// ---- Limpeza com um clique ----------------------------------------------------
// Só toca em arquivos temporários (cache): nenhum dado ou login é apagado —
// operação segura por natureza, fora do registro de reversão.

// Bytes -> texto amigável para o registro em disco.
// O separador decimal segue o idioma: vírgula em português é decimal, em
// inglês é separador de MILHAR — "1,50 GB" num registro em inglês se lê como
// mil e quinhentos.
function fmtBytes(b) {
  if (b == null) return '—';
  const g = b / 1024 ** 3;
  if (g >= 1) {
    return `${g.toLocaleString(mainI18n.getLanguage() === 'pt' ? 'pt-BR' : 'en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    })} GB`;
  }
  return `${Math.max(1, Math.round(b / 1024 ** 2))} MB`;
}

// Pasta de registros escolhida pelo projeto: Documentos › DexArmor ›
// registros-limpeza — visível e encontrável pelo usuário leigo (nada de
// pastas ocultas de sistema).
function cleanupLogDir() {
  const dir = path.join(app.getPath('documents'), 'DexArmor', 'registros-limpeza');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Prévia: o que a limpeza vai liberar, app por app (cache do dumpsys
// diskstats). Só leitura — a UI mostra a lista enquanto o pit stop acontece.
ipcMain.handle('clean:preview', async (_e, serial) => {
  const list = await adb.getCacheSizes(serial).catch(() => []);
  return { items: list.filter((x) => x.cacheBytes > 1024 * 1024).slice(0, 8) };
});

// Limpeza: mede cache por app e espaço livre ANTES e DEPOIS do trim-caches —
// devolve o que foi liberado (total e por app) e grava um registro .txt na
// pasta do projeto, para o usuário ter histórico das manutenções.
ipcMain.handle('clean:caches', async (_e, serial) => {
  const storeKey = await stableSerial(serial);
  const before = await adb.getStorageInfo(serial);
  const cachesBefore = await adb.getCacheSizes(serial).catch(() => []);

  await adb.trimCaches(serial);

  const after = await adb.getStorageInfo(serial);
  const cachesAfter = await adb.getCacheSizes(serial).catch(() => []);
  const afterMap = new Map(cachesAfter.map((x) => [x.pkg, x.cacheBytes]));
  const items = cachesBefore
    .map((x) => ({ pkg: x.pkg, freedBytes: Math.max(0, x.cacheBytes - (afterMap.get(x.pkg) ?? 0)) }))
    .filter((x) => x.freedBytes > 512 * 1024)
    .sort((a, b) => b.freedBytes - a.freedBytes)
    .slice(0, 8);
  const freedBytes = (after.freeBytes != null && before.freeBytes != null)
    ? Math.max(0, after.freeBytes - before.freeBytes)
    : null;

  // Registro em disco — falha na gravação não derruba a limpeza (que já
  // aconteceu no aparelho); o caminho volta null e a UI omite a linha.
  let logPath = null;
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `limpeza-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}h${pad(now.getMinutes())}.txt`;
    logPath = path.join(cleanupLogDir(), name);
    const lines = [
      t('main.cleanup.title'),
      // A data segue o idioma da interface, não pt-BR fixo: o relatório é
      // aberto pelo mesmo usuário que escolheu o idioma.
      t('main.cleanup.date', { date: now.toLocaleString(mainI18n.getLanguage() === 'pt' ? 'pt-BR' : 'en-US') }),
      t('main.cleanup.device', { device: storeKey }),
      '',
      t('main.cleanup.freeBefore', { value: fmtBytes(before.freeBytes) }),
      t('main.cleanup.freeAfter', { value: fmtBytes(after.freeBytes) }),
      t('main.cleanup.freed', { value: fmtBytes(freedBytes) }),
      '',
      items.length ? t('main.cleanup.perApp') : t('main.cleanup.noPerApp'),
      ...items.map((x) => `  - ${x.pkg}: ${fmtBytes(x.freedBytes)}`),
      '',
      t('main.cleanup.onlyCache'),
      t('main.cleanup.noDataDeleted'),
    ];
    fs.writeFileSync(logPath, lines.join('\n'), 'utf8');
  } catch { logPath = null; }

  return { freedBytes, freeBytes: after.freeBytes, totalBytes: after.totalBytes, items, logPath };
});

// Abre a pasta de registros no Finder/Explorer — um clique para o leigo achar.
ipcMain.handle('clean:openLogs', async () => {
  await shell.openPath(cleanupLogDir());
  return true;
});

// Check-up: confere (sem alterar nada) se o efeito de uma task ainda vale.
ipcMain.handle('adb:verifyTask', (_e, serial, task) => verifyTask(serial, task));

// Ativa a conexão por Wi-Fi: descobre o IP do aparelho, reinicia o adbd em
// modo TCP e conecta. Depois disso o cabo pode ser removido — o aparelho
// continua aparecendo em `adb devices` com o serial "ip:5555".
ipcMain.handle('adb:enableWifi', async (_e, serial) => {
  const ip = await adb.getWifiIp(serial);
  if (!ip) {
    throw new Error(t('main.wifi.notOnWifi'));
  }
  await adb.enableTcpip(serial, 5555);
  // O adbd do aparelho reinicia em modo TCP e pode demorar mais que o
  // esperado em alguns aparelhos — tenta conectar algumas vezes.
  let out = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    out = await adb.connectTcp(`${ip}:5555`).catch((e) => String(e.message || e));
    if (/connected/i.test(out)) return { ip, wifiSerial: `${ip}:5555` };
  }
  // "No route to host" no macOS quase sempre é a permissão de Rede Local
  // negada ao app (Privacidade e Segurança), não um problema do roteador —
  // traduzimos para uma orientação que o usuário consegue seguir.
  if (/no route to host/i.test(out)) {
    throw new Error(
      t('main.wifi.blockedMacOS')
    );
  }
  throw new Error(t('main.wifi.failed', { reason: (out || '').trim() || t('main.wifi.noAnswer') }));
});

// Espelhamento da tela do aparelho (scrcpy) numa janela nativa controlável
// por mouse/teclado. Um por aparelho; a janela fecha junto com o app.
ipcMain.handle('scrcpy:start', (_e, serial, title) => scrcpy.start(serial, title));
// Recria a sessão de espelhamento após uma troca de modo (se estiver aberta):
// a mudança de resolução pode degradar o stream até a sessão ser recriada.
ipcMain.handle('scrcpy:restart', (_e, serial) => scrcpy.restartIfRunning(serial));

// --- Enviar para o celular ---------------------------------------------------
// Destinos fixos de envio de arquivos. O renderer manda só a chave; o mapa
// completo vive aqui no main (o renderer nunca monta caminhos sozinho).
const SEND_DESTINATIONS = {
  // `labelKey`, não `label`: este mapa é constante de módulo e o idioma ainda
  // não existe quando ele é avaliado. Quem envia resolve na hora.
  download: { dir: '/sdcard/Download', labelKey: 'dest.download' },
  movies:   { dir: '/sdcard/Movies',   labelKey: 'dest.movies' },
  music:    { dir: '/sdcard/Music',    labelKey: 'dest.music' },
  roms:     { dir: '/sdcard/ROMs',     labelKey: 'dest.roms' },
};

// Espaço livre do aparelho (bytes) no armazenamento compartilhado, para checar
// ANTES de enviar se os arquivos cabem — evita falhar no meio com erro cru.
ipcMain.handle('send:freespace', async (_e, serial) => {
  return adb.getStorageInfo(serial, '/sdcard');
});

// Cancelamento do envio em andamento. Só existe um envio por vez (a interface
// processa os arquivos em fila), então basta abortar o controlador corrente.
let currentSendAbort = null;
ipcMain.handle('send:cancel', () => {
  if (currentSendAbort) { currentSendAbort.abort(); return true; }
  return false;
});

// Envia um arquivo comum para uma das pastas fixas, com progresso em tempo
// real transmitido ao renderer via evento 'send:progress'. Cancelável.
ipcMain.handle('send:file', async (event, serial, localPath, destKey) => {
  const dest = SEND_DESTINATIONS[destKey];
  if (!dest) throw new Error('Destino desconhecido');
  const fileName = path.basename(localPath);
  const controller = new AbortController();
  currentSendAbort = controller;
  try {
    await adb.ensureDir(serial, dest.dir);
    await adb.pushFile(serial, localPath, `${dest.dir}/${fileName}`, (info) => {
      // info = { percent, transferredBytes, totalBytes }
      event.sender.send('send:progress', { fileName, kind: 'file', ...info });
    }, { signal: controller.signal });
    return { fileName, dir: dest.dir, label: t(dest.labelKey) };
  } catch (err) {
    // Cancelamento é resultado esperado, não erro: evita ruído no log do main.
    if (String(err?.message) === 'CANCELLED') return { cancelled: true };
    throw err;
  } finally {
    if (currentSendAbort === controller) currentSendAbort = null;
  }
});

// Instala um APK diretamente no aparelho. Passa pelo MESMO caminho da task do
// catálogo (installApkFile): aceita .apk simples e pacotes .apkm/.xapk, e
// contorna o verificador de pacotes durante a instalação. Desde que o catálogo
// de apps saiu do programa, esta é a via principal de instalar aplicativos.
// O progresso do install não é percentual — sinalizamos indeterminado com -1.
// Cancelável.
ipcMain.handle('send:apk', async (event, serial, localPath) => {
  const fileName = path.basename(localPath);
  const controller = new AbortController();
  currentSendAbort = controller;
  event.sender.send('send:progress', { fileName, kind: 'apk', percent: -1 });
  try {
    await installApkFile(serial, localPath, { signal: controller.signal });
    return { fileName };
  } catch (err) {
    if (String(err?.message) === 'CANCELLED') return { cancelled: true };
    throw err;
  } finally {
    if (currentSendAbort === controller) currentSendAbort = null;
  }
});

// Salva um relatório de configuração em arquivo de texto (o renderer monta o
// conteúdo; aqui só abrimos o diálogo de salvar e gravamos).
ipcMain.handle('report:save', async (_e, text) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: t('main.dialog.saveReport'),
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
  if (!data.entries.length) throw new Error(t('main.import.nothingToExport'));
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: t('main.dialog.exportJournal'),
    defaultPath: `dexarmor-reversao-${storeKey}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, JSON.stringify({ serial: storeKey, ...data }, null, 2), 'utf8');
  return true;
});

// Validação do registro importado (entrada externa vinda de outro computador):
// TUDO-OU-NADA. Devolve as entradas limpas ou lança com mensagem clara — nada
// é importado se qualquer entrada não passar. Fecha o ponto silencioso do
// import: um kind órfão entraria na esteira e só quebraria mais tarde, numa
// reversão. A allowlist vem do próprio runner (REVERT_KINDS), para nunca
// divergir do que o revertEntry sabe desfazer.
// Este teto de ARQUIVO é o que protege contra campo gigante: nenhuma string
// isolada pode passar de 2 MB se o arquivo inteiro não passa. Havia aqui um
// `MAX_STR = 20000` declarado e nunca usado, removido em 29/07/2026 — ele
// sugeria uma lacuna que não existe. Se for reintroduzir limite por campo,
// saiba que é reforço, não correção.
const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // um registro real tem KBs
const MAX_IMPORT_ENTRIES = 500;
function okStr(v, max) {
  return typeof v === 'string' && v.length > 0 && v.length <= max && !v.includes('\0');
}
function validKindOf(obj) {
  return obj && typeof obj === 'object' && typeof obj.kind === 'string' && REVERT_KINDS.has(obj.kind);
}
function validateImport(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.entries)) {
    throw new Error(t('main.import.notRevya'));
  }
  if (raw.entries.length > MAX_IMPORT_ENTRIES) {
    throw new Error(t('main.import.tooManyEntries', { n: raw.entries.length }));
  }
  const clean = [];
  for (const e of raw.entries) {
    if (!e || typeof e !== 'object') throw new Error(t('main.import.malformedEntry'));
    if (!okStr(e.taskId, 200)) throw new Error(t('main.import.noTaskId'));
    if (!okStr(e.label, 500)) throw new Error(t('main.import.badLabel', { taskId: e.taskId }));
    if (!validKindOf(e.revert)) {
      throw new Error(t('main.import.unknownRevertKind', {
        taskId: e.taskId,
        detail: e.revert && e.revert.kind ? ` (${e.revert.kind})` : '',
      }));
    }
    // phoneRevert (perfil celular vivo), quando presente, também é revertido —
    // seu kind precisa estar na mesma allowlist.
    if (e.phoneRevert !== undefined && !validKindOf(e.phoneRevert)) {
      throw new Error(t('main.import.badPhoneProfile', { taskId: e.taskId }));
    }
    clean.push(e);
  }
  return clean;
}

// Importa um registro exportado em outro computador. As entradas passam pela
// validação acima (tudo-ou-nada) e depois pelo mesmo merge do addEntry (o
// estado original de cada task é preservado).
ipcMain.handle('revert:import', async (_e, serial) => {
  const storeKey = await stableSerial(serial);
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: t('main.dialog.importJournal'),
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths || !filePaths[0]) return null;
  const file = filePaths[0];
  // Limite de tamanho ANTES de ler para a memória: um arquivo enorme é ruído
  // ou ataque, não um registro do DexArmor.
  let size = 0;
  try { size = fs.statSync(file).size; } catch { throw new Error(t('main.import.unreadable')); }
  if (size > MAX_IMPORT_BYTES) {
    throw new Error(t('main.import.tooLarge'));
  }
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error(t('main.import.notJson')); }
  // Valida TUDO antes de aplicar QUALQUER coisa — sem import parcial.
  const clean = validateImport(raw);
  for (const entry of clean) revertStore.addEntry(storeKey, entry);
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
