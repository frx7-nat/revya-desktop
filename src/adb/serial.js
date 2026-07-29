// src/adb/serial.js
// -----------------------------------------------------------------------------
// SERIAL DE CONEXÃO — a única definição de "isto é sem fio?".
//
// Módulo puro de propósito: só lógica de string, nenhuma dependência. É o que
// permite que `adb.js`, `adbDiagnostics.js` e `adbOrchestrator.js` compartilhem
// a mesma resposta sem que um arraste o i18n do outro.
//
// O adb expõe aparelhos sem fio em DOIS formatos, e eles se comportam de modo
// diferente depois de um `kill-server`:
//
//   host:porta          `adb connect 192.168.3.3:5555`, o que o DexArmor usa
//                       (main.js: tcpip 5555 + connect). Morre no kill-server e
//                       NÃO volta sozinho — alguém tem de refazer o `connect`.
//
//   ..._adb-tls-connect._tcp   Depuração sem fio do Android 11+, via mDNS. Ex.:
//                       `adb-RXCX50450PW-k9RVfP._adb-tls-connect._tcp`. O
//                       pareamento vive no aparelho e o servidor do adb
//                       redescobre e reconecta sozinho ao subir — medido em
//                       29/07/2026: a entrada nasceu `offline` e virou `device`
//                       sem ninguém pedir.
//
// Seriais de USB são alfanuméricos, sem dois-pontos e sem sufixo de serviço.
//
// ## Histórico, porque ele importa aqui
//
// Até 29/07/2026 só o formato `host:porta` era reconhecido, e a checagem estava
// espalhada em CINCO lugares: um regex em `adbDiagnostics.js`, dois inline em
// `adbOrchestrator.js` e três `serial.includes(':')` no renderer.
//
// O R12 unificou os três primeiros e o commit afirmou "agora há UMA definição".
// **Estava errado** — os do renderer sobreviveram, porque a busca foi pelo
// regex e não pela semântica. Só apareceram quando um aparelho de verdade foi
// pareado pela Depuração sem fio e o seletor da interface mostrou o mesmo
// telefone duas vezes, uma delas rotulada "· USB" sem cabo nenhum ligado.
//
// Daí este arquivo: enquanto a resposta morava junto de quem a usava, cada novo
// consumidor reescrevia a sua.
// -----------------------------------------------------------------------------

/** `adb connect host:porta` — precisa ser refeito à mão após um kill-server. */
const SEM_FIO_HOST_PORTA = /^[^\s:]+:\d+$/;

/** Serviço mDNS da Depuração sem fio — o adb o redescobre por conta própria. */
const SEM_FIO_MDNS = /\._tcp\.?$/;

/** É uma conexão sem fio? (qualquer um dos dois formatos) */
function ehSemFio(serial) {
  const s = serial || '';
  return SEM_FIO_HOST_PORTA.test(s) || SEM_FIO_MDNS.test(s);
}

/**
 * O `kill-server` destrói esta conexão de forma DEFINITIVA?
 *
 * Só o `host:porta`: nada refaz o `adb connect` sozinho. O mDNS fica de fora
 * de propósito — o servidor do adb o redescobre ao subir.
 *
 * É a distinção que decide duas coisas no orquestrador: se vale pular a
 * recuperação (só onde ela destrói) e quais endpoints reconectar depois (só os
 * que não voltam sozinhos). Para o mDNS, reiniciar o servidor é inofensivo e
 * pode até resolver — refazer a descoberta é justamente o que ele faz ao subir.
 */
function killServerDestroi(serial) {
  return SEM_FIO_HOST_PORTA.test(serial || '');
}

module.exports = { ehSemFio, killServerDestroi };
