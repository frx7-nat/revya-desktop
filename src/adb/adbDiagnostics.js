// src/adb/adbDiagnostics.js
// -----------------------------------------------------------------------------
// Diagnóstico de estados do ADB para o DexArmor.
//
// Recebe a saída CRUA do comando `adb devices` (string) e devolve, para cada
// dispositivo, um objeto com mensagem em linguagem simples e os próximos passos
// que a UI deve mostrar. NÃO retorna JSX — a camada React/Electron só renderiza
// os dados.
//
// Roda no processo MAIN (CommonJS), junto com o restante da lógica ADB.
// -----------------------------------------------------------------------------

const { t, tList } = require('../i18n/runtime.cjs');

/** Estados canônicos que o app reconhece. */
const DeviceState = {
  READY: 'ready',                 // device -> pronto para provisionar
  UNAUTHORIZED: 'unauthorized',   // detectado, falta tocar em "Permitir" no telefone
  OFFLINE: 'offline',             // detectado mas não responde
  NO_PERMISSIONS: 'no_permissions', // app não consegue acessar o dispositivo (driver/servidor)
  NO_DEVICES: 'no_devices',       // nenhum dispositivo na lista
  OTHER_MODE: 'other_mode',       // bootloader/recovery/sideload/authorizing
  UNKNOWN: 'unknown',             // estado não previsto
};

/** Severidade, para a UI escolher cor/ícone. */
const Severity = {
  OK: 'ok',
  ACTION_NEEDED: 'action_needed', // depende de uma ação do usuário
  BLOCKED: 'blocked',             // precisa de algo do ambiente (driver, cabo, etc.)
};

/**
 * Mensagens por estado. `autoRecover` lista comandos que o APP pode tentar
 * sozinho antes de incomodar o usuário (reinício do servidor ADB resolve boa
 * parte dos casos offline / no permissions).
 */
// Severidade, chave do catálogo e recuperação automática.
//
// O TEXTO não mora aqui. Esta é constante de módulo, avaliada no `require`,
// quando o idioma ainda não foi lido do disco — uma frase escrita aqui ficaria
// congelada no idioma de origem. O que fica é a `key`; quem monta a mensagem é
// `describeDevice`, no momento em que ela vai à tela.
const MESSAGES = {
  [DeviceState.READY]:        { severity: Severity.OK,            key: 'diagnostics.ready',         autoRecover: null },
  [DeviceState.UNAUTHORIZED]: { severity: Severity.ACTION_NEEDED, key: 'diagnostics.unauthorized',  autoRecover: null },
  [DeviceState.OFFLINE]:      { severity: Severity.ACTION_NEEDED, key: 'diagnostics.offline',       autoRecover: ['kill-server', 'start-server'] },
  [DeviceState.NO_PERMISSIONS]: { severity: Severity.BLOCKED,     key: 'diagnostics.noPermissions', autoRecover: ['kill-server', 'start-server'] },
  [DeviceState.NO_DEVICES]:   { severity: Severity.BLOCKED,       key: 'diagnostics.noDevices',     autoRecover: null },
  [DeviceState.OTHER_MODE]:   { severity: Severity.ACTION_NEEDED, key: 'diagnostics.otherMode',     autoRecover: null },
  [DeviceState.UNKNOWN]:      { severity: Severity.BLOCKED,       key: 'diagnostics.unknown',       autoRecover: ['kill-server', 'start-server'] },
};


/**
 * Converte o token cru de estado (ex.: "device", "unauthorized",
 * "no permissions (...)") no estado canônico.
 * @param {string} rawState
 * @returns {string} DeviceState
 */
function classifyState(rawState) {
  const s = rawState.trim().toLowerCase();
  if (s.startsWith('no permissions')) return DeviceState.NO_PERMISSIONS;
  if (s.startsWith('device')) return DeviceState.READY; // "device" ou "device usb:... (com -l)"
  if (s.startsWith('unauthorized')) return DeviceState.UNAUTHORIZED;
  if (s.startsWith('offline')) return DeviceState.OFFLINE;
  if (['recovery', 'bootloader', 'sideload', 'authorizing', 'host'].some((m) => s.startsWith(m))) {
    return DeviceState.OTHER_MODE;
  }
  return DeviceState.UNKNOWN;
}

/**
 * Faz o parse da saída de `adb devices` (com ou sem a flag -l).
 * @param {string} rawOutput
 * @returns {Array<{serial: string, rawState: string, state: string}>}
 */
function parseAdbDevices(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') return [];

  return rawOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    // descarta o cabeçalho e mensagens do daemon
    .filter((line) => !/^list of devices attached/i.test(line))
    .filter((line) => !/^\*/.test(line)) // ex.: "* daemon started successfully *"
    .map((line) => {
      // serial é o primeiro campo; o estado é o resto da linha
      const match = line.match(/^(\S+)\s+(.*)$/);
      if (!match) return null;
      const [, serial, rest] = match;
      return { serial, rawState: rest, state: classifyState(rest) };
    })
    .filter(Boolean);
}

/**
 * Monta o objeto de diagnóstico de um único dispositivo, pronto para a UI.
 * @param {{serial: string, state: string}} device
 */
// Um serial no formato `host:porta` é uma conexão SEM FIO (`adb connect`).
// Seriais de USB são alfanuméricos sem dois-pontos.
const ehSemFio = (serial) => /^[^\s:]+:\d+$/.test(serial || '');

function describeDevice({ serial, state }) {
  const info = MESSAGES[state] || MESSAGES[DeviceState.UNKNOWN];

  // `offline` SEM FIO tem causa e saída diferentes do `offline` por cabo, e a
  // partir de 29/07/2026 tem também COMPORTAMENTO diferente: o orquestrador
  // deixou de aplicar `kill-server` nesse caso, porque ali ele apagava o
  // pareamento em vez de restaurá-lo (ver adbOrchestrator.js).
  //
  // Sem esta variante o usuário leria "aguarde, o DexArmor vai reiniciar a
  // conexão automaticamente" — promessa que o app deixou de cumprir — seguida
  // de dois passos sobre trocar o CABO, num aparelho que não tem cabo nenhum.
  const key = (state === DeviceState.OFFLINE && ehSemFio(serial))
    ? 'diagnostics.offlineWireless'
    : info.key;

  return {
    serial,
    state,
    severity: info.severity,
    title: t(`${key}.title`),
    message: t(`${key}.message`),
    steps: tList(`${key}.steps`),
    autoRecover: info.autoRecover, // null OU array de subcomandos do adb (ex.: ['kill-server','start-server'])
    isReady: state === DeviceState.READY,
  };
}

/**
 * Diagnóstico completo a partir da saída crua do `adb devices`.
 *
 * @param {string} rawOutput  stdout de `adb devices` ou `adb devices -l`
 * @returns {{
 *   devices: Array<object>,
 *   actionable: object|null,  // melhor candidato para a UI focar
 *   hasReadyDevice: boolean,
 *   overall: object           // resumo quando não há nenhum dispositivo
 * }}
 */
function diagnose(rawOutput) {
  const parsed = parseAdbDevices(rawOutput);
  const devices = parsed.map(describeDevice);

  if (devices.length === 0) {
    const empty = describeDevice({ serial: null, state: DeviceState.NO_DEVICES });
    return {
      devices: [],
      actionable: empty,
      hasReadyDevice: false,
      overall: empty,
    };
  }

  const hasReadyDevice = devices.some((d) => d.isReady);

  // Prioridade do que a UI deve destacar: pronto > algo que o usuário resolve > bloqueado.
  const priority = {
    [Severity.OK]: 0,
    [Severity.ACTION_NEEDED]: 1,
    [Severity.BLOCKED]: 2,
  };
  const actionable = [...devices].sort(
    (a, b) => priority[a.severity] - priority[b.severity],
  )[0];

  return { devices, actionable, hasReadyDevice, overall: actionable };
}

/**
 * Caso especial: o binário do adb não existe / não está no PATH.
 * Chame ANTES de diagnose() quando o spawn falhar com ENOENT.
 */
function adbNaoEncontrado() {
  return {
    devices: [],
    actionable: {
      serial: null,
      state: DeviceState.UNKNOWN,
      severity: Severity.BLOCKED,
      title: t('diagnostics.adbMissing.title'),
      message: t('diagnostics.adbMissing.message'),
      steps: tList('diagnostics.adbMissing.steps'),
      autoRecover: null,
      isReady: false,
    },
    hasReadyDevice: false,
    overall: null,
  };
}

module.exports = {
  DeviceState,
  Severity,
  parseAdbDevices,
  diagnose,
  adbNaoEncontrado,
};
