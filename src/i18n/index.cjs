// src/i18n/index.cjs
// Núcleo de tradução — compartilhado pelos DOIS processos do Electron.
//
// ## Por que .cjs e por que JSON
//
// O processo principal é CommonJS (`require`) e o renderer é ESM empacotado
// pelo Vite. Um módulo só, em CommonJS, é o formato que os dois leem sem
// truque de interoperabilidade; os catálogos ficam em JSON pelo mesmo motivo —
// `require('./pt.json')` no Node e `import` no Vite funcionam nativamente.
//
// A função é SEM ESTADO de propósito: recebe o idioma como argumento. Quem
// guarda "qual é o idioma agora" é cada processo do seu jeito (o main num
// arquivo em userData, o renderer num contexto do React). Estado compartilhado
// entre processos é o que costuma sair de sincronia.
//
// ## Chaves
//
// Namespace por origem: `runner.*`, `errors.*`, `tasks.*`, `ui.*`. A chave é
// estável; o texto é que muda. Renomear chave é renomear em todos os catálogos.

const pt = require('./pt.json');
const en = require('./en.json');

const CATALOGS = { pt, en };
const LANGUAGES = ['pt', 'en'];

// O idioma de origem do projeto. Serve de rede: chave ausente na tradução cai
// aqui em vez de mostrar o nome da chave ao usuário. A guarda de build existe
// justamente para que essa rede nunca precise entrar em ação.
const SOURCE_LANGUAGE = 'pt';

/**
 * Resolve um locale do sistema ('pt-BR', 'en-US', 'de-DE') para um dos idiomas
 * que temos. Mesma regra do launcher Android: casa pelo IDIOMA, ignorando a
 * região, e o que não for português cai em inglês — é o mundo, não o Brasil.
 */
function normalizeLanguage(locale) {
  const tag = String(locale || '').toLowerCase();
  if (tag.startsWith('pt')) return 'pt';
  if (tag.startsWith('en')) return 'en';
  return 'en';
}

/** Só aceita idioma que exista de fato; qualquer outra coisa vira o de origem. */
function coerceLanguage(lang) {
  return LANGUAGES.includes(lang) ? lang : SOURCE_LANGUAGE;
}

/**
 * Busca `a.b.c` no objeto aninhado. Devolve undefined se faltar qualquer
 * degrau — nunca lança.
 */
function lookup(catalog, key) {
  let node = catalog;
  for (const part of String(key).split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Interpolação `{nome}`. Placeholder sem valor correspondente fica como está,
 * em vez de virar "undefined" no meio da frase — se algo der errado, o texto
 * ainda se lê.
 */
function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole);
}

/**
 * @param {string} lang  'pt' | 'en'
 * @param {string} key   chave com namespace, ex.: 'runner.applied'
 * @param {object} [vars] valores para os `{placeholders}`
 * @returns {string} sempre uma string — nunca undefined, nunca lança.
 */
function translate(lang, key, vars) {
  const chosen = coerceLanguage(lang);
  const text = lookup(CATALOGS[chosen], key)
    ?? lookup(CATALOGS[SOURCE_LANGUAGE], key);
  // Última linha de defesa: a própria chave. É feio na tela, e é para ser —
  // texto faltando tem de ser óbvio para quem testa, não silencioso. O
  // `String()` mantém a promessa da assinatura mesmo com chave nula ou numérica
  // vinda de dado malformado; devolver `null` aqui empurraria o problema para o
  // ponto de exibição, longe da causa.
  if (text === undefined) return String(key);
  return interpolate(text, vars);
}

/**
 * Igual ao [translate], mas para LISTA de frases — os passos de um diagnóstico,
 * por exemplo.
 *
 * Existe porque a alternativa seria numerar as chaves (`step1`, `step2`…), e aí
 * o número de passos passaria a viver no código em vez de no catálogo: uma
 * tradução que precisasse de um passo a mais não teria como acrescentá-lo. Com
 * array, quem manda na quantidade é o texto.
 *
 * @returns {string[]} sempre um array — vazio se a chave não existir ou não
 *          apontar para uma lista.
 */
function translateList(lang, key, vars) {
  const chosen = coerceLanguage(lang);
  const pick = (cat) => {
    let node = cat;
    for (const part of String(key).split('.')) {
      if (node == null || typeof node !== 'object') return undefined;
      node = node[part];
    }
    return Array.isArray(node) ? node : undefined;
  };
  const list = pick(CATALOGS[chosen]) ?? pick(CATALOGS[SOURCE_LANGUAGE]);
  if (!list) return [];
  return list.map((item) => interpolate(String(item), vars));
}

/**
 * Existe texto para esta chave?
 *
 * Serve para campo OPCIONAL — a explicação do "?" ao lado de uma modificação,
 * por exemplo. Sem isto, o catálogo de dados precisaria carregar um booleano
 * `temInfo` só para dizer o que o próprio catálogo de textos já sabe, e os dois
 * sairiam de sincronia no dia em que alguém acrescentasse a explicação sem
 * lembrar do booleano.
 *
 * Consulta o idioma de ORIGEM: é ele que define o que existe no produto. A
 * tradução faltando é problema da guarda de paridade, não motivo para o campo
 * sumir da interface em inglês.
 */
function has(key) {
  return lookup(CATALOGS[SOURCE_LANGUAGE], key) !== undefined;
}

module.exports = {
  CATALOGS,
  LANGUAGES,
  SOURCE_LANGUAGE,
  normalizeLanguage,
  coerceLanguage,
  translate,
  translateList,
  has,
};
