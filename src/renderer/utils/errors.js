// src/renderer/utils/errors.js
import { t } from '../i18n';

// Erros vindos do processo main chegam embrulhados pelo Electron:
//   "Error invoking remote method 'adb:enableWifi': Error: <mensagem>"
// Para o usuário (leigo), só a <mensagem> interessa. Este helper remove o
// embrulho em qualquer lugar que exiba erros na interface.
export function friendlyError(e) {
  return String((e && e.message) || e)
    .replace(/Error invoking remote method '[^']+':\s*/g, '')
    .replace(/^Error:\s*/, '');
}

// Traduz os erros crus do adb (envio de arquivos / instalação de APK) para uma
// frase clara para o usuário leigo. Se não reconhecer, cai na mensagem limpa.
//
// Os PADRÕES continuam em inglês e NÃO se traduzem: são a saída literal do adb
// e do Android, que não mudam com o idioma da interface. Só a frase de resposta
// passa pelo catálogo.
//
// Usa o `t` de módulo (não o hook) porque isto é uma função pura, chamada de
// dentro de handlers — ver a nota no topo de `renderer/i18n/index.jsx`.
export function friendlySendError(e) {
  const raw = friendlyError(e);
  const m = raw.toLowerCase();

  if (/no space left|insufficient_storage|enospc/.test(m)) return t('errors.noSpace');
  if (/no devices|device (not found|offline)|device '.*' not found|closed|connection reset|protocol fault/.test(m)) {
    return t('errors.disconnected');
  }
  if (/write failed|undefined error|broken pipe|epipe|i\/?o error|input\/output error|transport/.test(m)) {
    return t('errors.interrupted');
  }
  if (/permission denied|read-only|operation not permitted|eacces/.test(m)) {
    return t('errors.permissionDenied');
  }
  // Códigos que o main devolve traduzidos (installApkFile). No fluxo das
  // tasks o ProgressPanel abre o guia do Play Protect; aqui, no envio por
  // arrastar-e-soltar, o passo a passo vai na própria frase.
  if (/^verification_failure:/.test(m)) return t('errors.playProtect');
  if (/^already_installed:/.test(m)) return t('errors.alreadyInstalled');
  if (/signatures do not match|update_incompatible|version_downgrade/.test(m)) {
    return t('errors.alreadyInstalled');
  }
  if (/invalid.*apk|failed to parse|not.*valid.*package|install_failed_invalid_apk/.test(m)) {
    return t('errors.invalidApk');
  }
  if (/timed out|timeout|etimedout/.test(m)) return t('errors.timeout');
  return raw;
}
