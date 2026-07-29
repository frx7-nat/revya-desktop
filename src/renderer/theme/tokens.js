// src/renderer/theme/tokens.js
// Tokens de cor do documento de referência (DESIGN-bmw-m.md).
//
// ---------------------------------------------------------------------------
// POR QUE ESTE ARQUIVO EXISTE (29/07/2026)
//
// Os mesmos hexadecimais estavam declarados em QUATRO lugares: `M_TOKENS` no
// ControlCenter (que era código morto, removido na Fase 1) e um `TOK` local em
// cada um de HealthPanel, ProfilesPanel e CleanupPanel.
//
// Três cópias vivas com valores idênticos e nomes idênticos, mas conteúdos
// DIFERENTES: o HealthPanel declarava seis tokens, os outros dois só três. Quem
// precisasse de `dataBlue` no ProfilesPanel acabaria escrevendo o hexadecimal à
// mão — que é exatamente como uma quarta cópia nasce.
//
// Mudar uma cor do design exigia encontrar quatro arquivos, e o quarto era o
// morto, que ninguém atualizaria.
// ---------------------------------------------------------------------------

/** Faixa tricolor da BMW M — só a Central de Controle usa. */
export const M_TRICOLOR = ['#0066b1', '#1c69d4', '#e22718'];

export const TOK = {
  surfaceSoft: '#0d0d0d',
  surfaceCard: '#1a1a1a',
  hairline: '#3c3c3c',
  hairlineStrong: '#262626',
  dataBlue: '#1c69d4',   // marca de dados (série única) — o azul heritage
  warning: '#f4b400',
  red: '#e22718',
};
