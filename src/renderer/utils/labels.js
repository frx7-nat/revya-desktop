// src/renderer/utils/labels.js
// Rótulo de uma entrada do REGISTRO DE REVERSÃO.
//
// O registro em disco guarda o rótulo em texto puro, no idioma em que o
// aparelho foi provisionado — um aparelho configurado em português tem
// "Apps de escritório" congelado no JSON, e trocar a interface para inglês não
// reescreve o arquivo (nem deveria: é histórico do que foi feito).
//
// Mas o registro guarda também o `taskId`. Quando a task ainda existe no
// catálogo, é o catálogo ATUAL que manda — assim a lista de reversão fala o
// idioma da interface, não o da instalação. O texto salvo só entra quando o
// `taskId` não está mais no catálogo: aí não há o que traduzir, e mostrar o que
// foi gravado é melhor do que mostrar a chave crua.
//
// Existe aqui, e não copiado em cada diálogo, porque três telas fazem a mesma
// pergunta (ResetDialog, ModeSwitchDialog e a lista lateral do App) e três
// cópias divergiriam.

import { has } from '../i18n';

/**
 * @param {Function} t     o `t` do useT() — passado, e não importado, para o
 *                         componente redesenhar quando o idioma mudar.
 * @param {{taskId: string, label?: string}} entry
 */
export function entryLabel(t, entry) {
  if (!entry) return '';
  const key = `tasks.${entry.taskId}.label`;
  return has(key) ? t(key) : (entry.label || entry.taskId || '');
}
