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
const MESSAGES = {
  [DeviceState.READY]: {
    severity: Severity.OK,
    title: 'Galaxy pronto',
    message: 'Dispositivo autorizado e respondendo. Pode iniciar a configuração.',
    steps: [],
    autoRecover: null,
  },

  [DeviceState.UNAUTHORIZED]: {
    severity: Severity.ACTION_NEEDED,
    title: 'Autorize o computador no telefone',
    message:
      'O DexArmor encontrou seu Galaxy, mas ele ainda não confia neste ' +
      'computador. Isso é normal na primeira conexão.',
    steps: [
      'Desbloqueie a tela do seu Galaxy (o aviso só aparece com a tela desbloqueada).',
      'Toque em "Permitir" no aviso "Permitir depuração USB?".',
      'Marque "Sempre permitir deste computador" antes de tocar em Permitir.',
      'Se o aviso não aparecer: puxe a barra de notificações e mude o modo USB de "Apenas carga" para "Transferência de arquivos (MTP)".',
    ],
    autoRecover: null, // por segurança, só o usuário pode autorizar no aparelho
  },

  [DeviceState.OFFLINE]: {
    severity: Severity.ACTION_NEEDED,
    title: 'Dispositivo não está respondendo',
    message:
      'O Galaxy aparece, mas não está respondendo aos comandos. Geralmente é ' +
      'o serviço do ADB travado, cabo ruim ou o aparelho em estado estranho.',
    steps: [
      'Aguarde — o DexArmor vai reiniciar a conexão automaticamente.',
      'Se continuar, troque o cabo USB ou a porta do computador.',
      'Desconecte e reconecte o telefone.',
    ],
    autoRecover: ['kill-server', 'start-server'],
  },

  [DeviceState.NO_PERMISSIONS]: {
    severity: Severity.BLOCKED,
    title: 'Sem permissão para acessar o dispositivo',
    message:
      'O computador detectou o Galaxy mas não consegue acessá-lo. Costuma ser ' +
      'o serviço do ADB travado ou o driver USB ausente/desatualizado (Windows).',
    steps: [
      'Aguarde — o DexArmor vai reiniciar o serviço do ADB automaticamente.',
      'No Windows: reinstale o driver USB da Samsung e tente de novo.',
      'No Mac/Linux: reconecte o cabo após o reinício do serviço.',
    ],
    autoRecover: ['kill-server', 'start-server'],
  },

  [DeviceState.NO_DEVICES]: {
    severity: Severity.BLOCKED,
    title: 'Nenhum Galaxy detectado',
    message: 'O computador não está enxergando nenhum dispositivo.',
    steps: [
      'Confirme que o cabo está conectado — e que é um cabo de DADOS, não só de carga.',
      'Ative a Depuração USB: Configurações → Opções de desenvolvedor → Depuração USB.',
      'Se as Opções de desenvolvedor não aparecem: Configurações → Sobre o telefone → toque 7 vezes em "Número da versão".',
      'No Windows, instale o driver USB da Samsung se o aparelho não aparecer.',
    ],
    autoRecover: null,
  },

  [DeviceState.OTHER_MODE]: {
    severity: Severity.ACTION_NEEDED,
    title: 'Telefone em modo especial',
    message:
      'O Galaxy está em um modo que não permite a configuração agora ' +
      '(recovery, bootloader ou similar).',
    steps: [
      'Reinicie o telefone normalmente até o sistema Android carregar.',
      'Reconecte e tente de novo.',
    ],
    autoRecover: null,
  },

  [DeviceState.UNKNOWN]: {
    severity: Severity.BLOCKED,
    title: 'Estado não reconhecido',
    message:
      'O dispositivo retornou um estado que o DexArmor ainda não conhece. ' +
      'Reinicie o telefone e a conexão e tente novamente.',
    steps: [
      'Desconecte e reconecte o telefone.',
      'Reinicie o aparelho se o problema continuar.',
    ],
    autoRecover: ['kill-server', 'start-server'],
  },
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
function describeDevice({ serial, state }) {
  const info = MESSAGES[state] || MESSAGES[DeviceState.UNKNOWN];
  return {
    serial,
    state,
    severity: info.severity,
    title: info.title,
    message: info.message,
    steps: info.steps,
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
      title: 'ADB não encontrado',
      message:
        'O DexArmor não encontrou o ADB no sistema. Ele é necessário para se ' +
        'comunicar com o Galaxy.',
      steps: [
        'Verifique se o ADB foi empacotado junto com o aplicativo.',
        'Se você instalou manualmente, confirme que a pasta platform-tools está no PATH.',
      ],
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
