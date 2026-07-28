// src/renderer/i18n/RichText.jsx
// Texto do catálogo com PEDAÇOS EM DESTAQUE no lugar dos `{placeholders}`.
//
// O problema que resolve: frases como
//
//   "Estes arquivos ocupam <b>2,1 GB</b>, mas o celular só tem <b>800 MB</b>
//    livres."
//
// No código original o negrito estava no meio do JSX, o que obriga a quebrar a
// frase em pedaços. Pedaço não se traduz: a ordem das partes muda entre
// idiomas, e em inglês a mesma frase não tem os números nas mesmas posições.
//
// Aqui a frase vai INTEIRA para o catálogo, com `{needed}` e `{free}` no lugar
// dos números. O `t` é chamado SEM `vars` — os placeholders precisam sobreviver
// até aqui — e este componente os troca por nós React em negrito.
//
// Quem traduz fica livre para pôr os números onde a língua pedir.

import React from 'react';

/**
 * @param {string} text   frase já traduzida, ainda com os `{placeholders}`
 * @param {object} values mapa placeholder → conteúdo (string ou nó React)
 * @param {Function} [wrap] como destacar; padrão é <b>
 */
export default function RichText({ text, values, wrap }) {
  const render = wrap || ((v, k) => <b key={k}>{v}</b>);
  // O split com grupo de captura mantém os delimitadores no resultado.
  const parts = String(text).split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{(\w+)\}$/);
        if (!m) return part;
        const value = values ? values[m[1]] : undefined;
        // Placeholder sem valor fica visível, em vez de sumir da frase — mesma
        // regra do `interpolate` no núcleo: falha tem de ser vista.
        return value === undefined ? part : render(value, i);
      })}
    </>
  );
}
