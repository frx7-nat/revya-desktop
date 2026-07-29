// src/adb/adbOrchestrator.js
// -----------------------------------------------------------------------------
// Fecha o ciclo de recuperação automática do DexArmor.
//
// Fluxo:
//   1. Roda `adb devices -l` e diagnostica (via adbDiagnostics.js).
//   2. Se o dispositivo em foco pedir recuperação (autoRecover), executa esses
//      subcomandos do ADB — UMA única vez — sem incomodar o usuário.
//   3. Reconsulta o estado e devolve o diagnóstico final.
//
// A recuperação roda no MÁXIMO uma vez por chamada: não há recursão, então não
// há risco de loop infinito. Se depois do reinício o problema persistir, o
// objeto retornado traz os `steps` para o usuário resolver na mão.
//
// Roda no processo MAIN do Electron (CommonJS), onde child_process tem acesso
// ao sistema. O caminho do binário do adb é injetado por quem chama
// (src/main/main.js usa o adbPath() de src/adb/adb.js).
// -----------------------------------------------------------------------------

const { execFile } = require('child_process');
const { promisify } = require('util');
const { diagnose, adbNaoEncontrado, parseAdbDevices } = require('./adbDiagnostics.js');

const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reconectar endpoint sem fio depois do `kill-server`. Curto de propósito: um
// endpoint inalcançável só falha quando o TCP desiste, e a recuperação inteira
// ficaria presa nisso. Medido em 29/07/2026: `adb connect` num IP sem ninguém
// escutando levou vários segundos até "Operation timed out".
const RECONNECT_TIMEOUT_MS = 4000;

/**
 * Executa um comando do adb e devolve o stdout. Tenta aproveitar o stdout
 * mesmo quando o adb retorna código de erro (alguns subcomandos fazem isso).
 *
 * @param {string} adbPath caminho do binário (ou 'adb' se estiver no PATH)
 * @param {string[]} args  ex.: ['devices', '-l']
 * @param {number} timeoutMs
 * @returns {Promise<string>} stdout
 * @throws marca err.adbNotFound = true quando o binário não existe (ENOENT)
 */
async function runAdb(adbPath, args, timeoutMs) {
  try {
    const { stdout } = await execFileAsync(adbPath, args, { timeout: timeoutMs });
    return stdout || '';
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      err.adbNotFound = true;
      throw err;
    }
    // Comando falhou, mas pode ter produzido stdout útil — aproveita.
    if (err && typeof err.stdout === 'string' && err.stdout.length > 0) {
      return err.stdout;
    }
    throw err;
  }
}

/**
 * Consulta o estado dos dispositivos, recupera automaticamente se preciso e
 * devolve o diagnóstico final.
 *
 * @param {object} [opts]
 * @param {string} [opts.adbPath='adb']        Caminho do binário do adb.
 * @param {boolean} [opts.recover=true]        Tentar recuperação automática.
 * @param {number} [opts.timeoutMs=15000]      Timeout por comando do adb.
 * @param {number} [opts.recoveryDelayMs=800]  Espera após reiniciar o servidor,
 *                                             para o daemon subir antes da
 *                                             reconsulta.
 * @param {(fase: string) => void} [opts.onStatus] Callback de progresso. Fases:
 *                                             'querying' | 'recovering' |
 *                                             'requerying' | 'done'.
 * @returns {Promise<object>} resultado do diagnose() + { recoveryAttempted }.
 */
async function checkDevices(opts = {}) {
  const {
    adbPath = 'adb',
    recover = true,
    timeoutMs = 15000,
    recoveryDelayMs = 800,
    onStatus = () => {},
  } = opts;

  // 1) Primeira consulta -------------------------------------------------------
  onStatus('querying');
  let rawOutput;
  try {
    rawOutput = await runAdb(adbPath, ['devices', '-l'], timeoutMs);
  } catch (err) {
    if (err.adbNotFound) {
      onStatus('done');
      return { ...adbNaoEncontrado(), recoveryAttempted: false };
    }
    throw err; // erro inesperado: deixe a camada superior logar/tratar
  }

  let result = diagnose(rawOutput);

  // 2) Recuperação automática (no máximo uma vez) ------------------------------
  //
  // NÃO recuperar quando o aparelho em foco é SEM FIO e está `offline`.
  //
  // A recuperação é `kill-server` + `start-server`, e o `kill-server` derruba
  // toda conexão TCP. Para um endpoint sem fio isso apaga o pareamento em vez
  // de restaurá-lo — e nada o traz de volta sozinho.
  //
  // Medido em 29/07/2026, e a comparação é o que decide:
  //
  //   COM a recuperação  (cenário 2 do roteiro): o aparelho sumiu da lista, a
  //     tela caiu em "Nenhum Galaxy detectado" com passos sobre cabo USB, e
  //     PERMANECEU assim mesmo depois de o aparelho voltar à rede.
  //   SEM a recuperação  (cenário 6, onde o diálogo de troca era dono do
  //     fluxo): a entrada ficou `offline`, o pareamento sobreviveu, e a conexão
  //     voltou sozinha quando o aparelho retornou.
  //
  // Ou seja: sem fio, `offline` se resolve pela espera. A "recuperação"
  // atrapalhava um caso que já se curava.
  //
  // Só este caso é excluído. `noPermissions` e `unknown` seguem recuperando —
  // são estados de USB, e ali o reinício do servidor de fato ajuda.
  const foco = result.actionable || {};
  const focoSemFio = /^[^\s:]+:\d+$/.test(foco.serial || '');
  const pularRecuperacao = focoSemFio && foco.state === 'offline';

  const recovery = pularRecuperacao ? null : (foco && foco.autoRecover);
  if (recover && Array.isArray(recovery) && recovery.length > 0) {
    onStatus('recovering');
    // Endpoints SEM FIO presentes ANTES da recuperação.
    //
    // O `kill-server` derruba o daemon inteiro, e com ele TODA conexão TCP —
    // não só a que está com problema. Para um aparelho por cabo isso é
    // inofensivo (o USB é reenumerado sozinho). Para um sem fio, apaga o
    // pareamento: o aparelho some da lista e não volta, porque nada refaz o
    // `adb connect`.
    //
    // O efeito medido em 29/07/2026 (roteiro de erros ADB, cenário 2): um S23
    // por Wi-Fi que ficou `offline` por alguns segundos caía em "Nenhum Galaxy
    // detectado", com passos sobre CABO USB — e permanecia assim mesmo depois
    // de o aparelho voltar à rede (ping com 0% de perda). O remédio era pior
    // que a doença: sem a recuperação, a entrada continuava `offline` e voltava
    // sozinha; com ela, sumia de vez.
    //
    // É o cenário primário do produto — o aparelho mora na TV, por Wi-Fi, e
    // rede oscila.
    const wireless = parseAdbDevices(rawOutput)
      .map((d) => d.serial)
      .filter((s) => /^[^\s:]+:\d+$/.test(s));
    try {
      // ex.: ['kill-server', 'start-server'] — operação global do ADB
      for (const subcommand of recovery) {
        await runAdb(adbPath, [subcommand], timeoutMs);
      }
      await sleep(recoveryDelayMs); // dá tempo do daemon reiniciar
      // Refaz cada conexão sem fio que existia antes. Melhor-esforço: se o
      // aparelho ainda estiver fora do ar, o `connect` falha e o diagnóstico
      // seguinte reporta o estado real — que é o comportamento correto. O
      // timeout é curto de propósito: conectar a um endpoint inalcançável
      // demora até o TCP desistir, e a recuperação não pode ficar presa nisso.
      for (const endpoint of wireless) {
        try {
          await runAdb(adbPath, ['connect', endpoint], RECONNECT_TIMEOUT_MS);
        } catch { /* aparelho ainda fora do ar: o diagnóstico abaixo dirá */ }
      }
    } catch (err) {
      if (err.adbNotFound) {
        onStatus('done');
        return { ...adbNaoEncontrado(), recoveryAttempted: true };
      }
      // Falha na recuperação não é fatal: seguimos para reconsultar mesmo assim.
    }

    // 3) Reconsulta após o reinício -------------------------------------------
    onStatus('requerying');
    try {
      const freshOutput = await runAdb(adbPath, ['devices', '-l'], timeoutMs);
      result = diagnose(freshOutput);
    } catch (err) {
      if (err.adbNotFound) {
        onStatus('done');
        return { ...adbNaoEncontrado(), recoveryAttempted: true };
      }
      // Se a reconsulta falhar, mantém o diagnóstico anterior.
    }

    onStatus('done');
    return { ...result, recoveryAttempted: true };
  }

  onStatus('done');
  return { ...result, recoveryAttempted: false };
}

/**
 * Conveniência: aguarda até um Galaxy ficar pronto (`isReady`) ou estourar o
 * tempo. Útil para esperas headless (sem UI). A ConnectPhoneScreen NÃO usa esta
 * função — ela faz o polling no renderer para mostrar o diagnóstico ao vivo.
 *
 * @param {object} [opts] mesmas opções de checkDevices, mais:
 * @param {number} [opts.pollIntervalMs=2000]
 * @param {number} [opts.overallTimeoutMs=120000]
 * @returns {Promise<object>} último resultado (pronto ou não, ao fim do tempo).
 */
async function waitForReadyDevice(opts = {}) {
  const {
    pollIntervalMs = 2000,
    overallTimeoutMs = 120000,
    onStatus = () => {},
    ...rest
  } = opts;

  const deadline = Date.now() + overallTimeoutMs;
  let first = true;

  while (true) {
    const result = await checkDevices({
      ...rest,
      recover: first, // recupera só na primeira passada
      onStatus,
    });
    first = false;

    if (result.hasReadyDevice || Date.now() >= deadline) {
      return result;
    }
    await sleep(pollIntervalMs);
  }
}

module.exports = {
  checkDevices,
  waitForReadyDevice,
};
