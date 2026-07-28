// src/i18n/runtime.cjs
// Idioma corrente do PROCESSO PRINCIPAL (main + adb).
//
// O `runner` devolve `detail` já em linguagem humana ("Resolução 1920x1080
// aplicada"), e esse texto vai direto para a tela — então o main precisa saber
// o idioma tanto quanto o renderer.
//
// O estado é de MÓDULO, não passado por parâmetro: as funções do runner são
// chamadas de dezenas de pontos, e enfiar um `lang` em todas as assinaturas
// espalharia o assunto por todo o arquivo sem ganho. O escopo é um processo só,
// de vida curta e com um usuário só — não há concorrência de idiomas.
//
// Quem o mantém em dia é o `main.js`: lê do `settingsStore` no boot e grava
// aqui de novo quando o renderer troca. Se essa sincronia falhar, o pior caso é
// um `detail` no idioma anterior — nada quebra.
//
// Mora em `src/i18n/` e não em `src/main/` de propósito: `src/adb/` também
// produz texto de tela (o diagnóstico de conexão). Se o estado vivesse no
// `main/`, a camada de baixo passaria a depender da de cima — inversão que
// costuma virar ciclo de require na primeira reorganização.

const core = require('./index.cjs');

let current = core.SOURCE_LANGUAGE;

function setLanguage(lang) {
  current = core.coerceLanguage(lang);
  return current;
}

function getLanguage() {
  return current;
}

/** Mesma assinatura do `t` do renderer, menos o idioma — que é o de módulo. */
function t(key, vars) {
  return core.translate(current, key, vars);
}

/** Versão de lista — ver `translateList` no núcleo. */
function tList(key, vars) {
  return core.translateList(current, key, vars);
}

module.exports = { t, tList, setLanguage, getLanguage };
