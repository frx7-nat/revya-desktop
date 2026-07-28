// src/renderer/utils/locale.js
// Formatação de NÚMERO e DATA por idioma.
//
// ## Por que isto existe
//
// Traduzir as palavras não traduz os números. O projeto nasceu em português e
// espalhou `.toFixed(1).replace('.', ',')` — que força vírgula decimal — e
// `toLocaleDateString('pt-BR')` em vários pontos. Com a interface em inglês,
// isso produzia:
//
//     "212,1 GB free of 225,4 GB"      (o correto é 212.1 / 225.4)
//     "saved on 28/07/2026"            (o correto é 7/28/2026)
//
// O primeiro é pior do que parece: em inglês a vírgula é separador de MILHAR,
// então "212,1 GB" se lê como duzentos e doze mil — o número muda de ordem de
// grandeza aos olhos de quem lê.
//
// ## Por que nenhuma guarda pega
//
// As três checagens do `check-i18n.js` olham TEXTO: paridade de catálogo,
// literal que parece português e literal em posição de interface. Formatação
// de número não é texto de tela — é código. Passa em verde nas três.
//
// Foi encontrado em 28/07/2026 **olhando uma captura do app rodando**, não por
// ferramenta. É a mesma lição do dia: guarda verde não é interface verificada.
//
// ## Uso
//
// `language` vem do `useT()`. Função pura recebe por PARÂMETRO — hook dentro
// de função que não é componente quebra em tempo de execução, não no build.

/** Idioma da aplicação -> tag BCP-47 para as APIs `Intl`. */
export function localeFor(language) {
  return language === 'pt' ? 'pt-BR' : 'en-US';
}

/**
 * Número com casas decimais fixas, no separador do idioma.
 * `num(212.05, 'pt', 1)` -> "212,1"   ·   `num(212.05, 'en', 1)` -> "212.1"
 */
export function num(value, language, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(localeFor(language), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Número com as casas que ele tiver, sem forçar nem arredondar.
 * Para valor cujo número de casas É a informação — escala de fonte 1,15 não
 * pode virar 1,2. O `num()` com `digits` fixo faria isso em silêncio.
 * `decimal(1.15, 'pt')` -> "1,15"   ·   `decimal(1.15, 'en')` -> "1.15"
 */
export function decimal(value, language) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(localeFor(language), { maximumFractionDigits: 20 });
}

/** Data curta no formato do idioma (28/07/2026 em pt, 7/28/2026 em en). */
export function shortDate(value, language) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(localeFor(language));
}
