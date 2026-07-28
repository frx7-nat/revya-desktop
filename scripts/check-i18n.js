#!/usr/bin/env node
// scripts/check-i18n.js
// Guarda de i18n do desktop — irmã da tarefa `checkI18n` do launcher Android.
//
// Roda antes do `vite build` (ver package.json), em milissegundos.
//
// ## Duas checagens, com rigor DIFERENTE — e o motivo importa
//
//   A. PARIDADE dos catálogos. Falha dura, desde já. `pt.json` e `en.json` já
//      estão iguais, então exigir isso não custa nada e impede a regressão
//      clássica: acrescentar a chave num arquivo só e o usuário ver a frase no
//      idioma errado, sem erro nenhum no build.
//
//   B. TEXTO CRAVADO no código. Aqui não dá para exigir tudo hoje: a migração
//      está no meio, e ~200 strings seguem em português dentro de main.js, dos
//      guias e dos diálogos. Uma falha dura pararia o desenvolvimento por causa
//      de trabalho que já se sabe pendente.
//
//      Então é uma CATRACA: `i18n-baseline.json` lista os arquivos ainda não
//      migrados, com a contagem atual. Arquivo fora da lista tem de estar
//      limpo. Arquivo da lista não pode PIORAR. E quando um arquivo fica limpo,
//      o build exige que ele saia da lista — é isso que impede a linha de base
//      de virar um depósito permanente.
//
// ## O que conta como "texto cravado"
//
// Literal que PARECE PORTUGUÊS: tem acento, ou traz uma palavra funcional da
// língua ("que", "não", "para", "você"...). O idioma de origem do projeto é o
// português, então é isso que sobra por migrar.
//
// A escolha é deliberada e tem um limite conhecido: uma string escrita direto
// em inglês passaria batido. Em compensação, não acusa as centenas de literais
// técnicos que um app Electron tem — nome de pacote, chave de setting, valor de
// CSS, id de IPC. Uma guarda que grita demais é desligada, e aí não guarda nada.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'src', 'i18n');
const BASELINE = path.join(__dirname, 'i18n-baseline.json');
const SCAN_DIRS = ['src/main', 'src/renderer', 'src/adb'];

// Palavras funcionais do português. Só entram formas que praticamente não
// aparecem em identificador ou string técnica em inglês.
const PT_WORDS = /\b(não|nao|você|voce|está|para|com|uma|dos|das|pelo|pela|seu|sua|isso|esse|essa|aqui|quando|porque|então|mais|já|ainda|também|todos|toda|cada|entre|sobre|até|sem|nenhum|celular|aparelho|tela|arquivo|arquivos|configuração|reversão)\b/i;
const ACCENTS = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/;

function looksPortuguese(text) {
  const bare = text.replace(/\$\{[^{}]*\}/g, '').trim();
  if (bare.length < 4) return false;
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(bare)) return false;
  // Sem espaço E sem acento não é frase: é identificador. Esta linha sozinha
  // elimina a maior fonte de falso positivo do projeto — nome de pacote
  // (`com.samsung.android.bixby.agent`), que casa com a palavra "com" da lista
  // e apareceu em 60 acusações falsas no tasks.js na primeira versão.
  const hasSpace = /\s/.test(bare);
  const hasAccent = ACCENTS.test(bare);
  if (!hasSpace && !hasAccent) return false;
  return hasAccent || PT_WORDS.test(bare);
}

/**
 * Remove comentários preservando strings.
 *
 * ## Por que LINHA A LINHA
 *
 * A primeira versão varria o arquivo inteiro de uma vez e errava feio: basta
 * uma aspa dentro de um literal de regex (`/[^']+/`, comuns no runner e no
 * adb) para o analisador entrar em "modo string" e nunca mais sair. Dali em
 * diante nenhum `//` era reconhecido, e a guarda passou a acusar seis frases
 * que estavam dentro de comentários no runner.js — texto que ninguém vê.
 *
 * O estado de aspa simples/dupla agora ZERA a cada linha. JavaScript não deixa
 * essas strings atravessarem linha (sem barra invertida), então nada se perde,
 * e um engano fica contido numa linha em vez de contaminar o arquivo.
 *
 * Só a crase atravessa, porque template literal legitimamente ocupa várias
 * linhas. Limite conhecido: um `//` DENTRO de um template multilinha seria
 * cortado. Não acontece neste projeto, e o custo de errar é uma acusação a
 * menos, não uma a mais.
 */
function stripComments(src) {
  const out = [];
  let inBlock = false;
  let inTemplate = false;

  for (const line of src.split('\n')) {
    let res = '';
    let i = 0;
    let quote = null;   // "'" ou '"' — zerado no fim da linha
    const n = line.length;

    // RESSINCRONIZAÇÃO. Linha que começa com `//` enquanto achamos estar dentro
    // de um template é prova de que perdemos a conta — e a prova vale mais que
    // o estado.
    //
    // Acontece de verdade: `adb.js:530` tem
    //     return `'${String(p).replace(/'/g, `'\\''`)}'`;
    // — uma regex com aspas dentro de um template aninhado. Como o analisador
    // não conhece literal de regex, a aspa da regex abre "modo string", as
    // crases desemparelham e o estado vazava por ~40 linhas, fazendo a guarda
    // acusar quatro trechos de COMENTÁRIO como texto de tela.
    //
    // Entender regex de verdade exigiria saber se `/` é divisão ou início de
    // literal, o que precisa de parser. Isto custa uma linha e limita o
    // estrago: o erro morre no próximo comentário em vez de contaminar o
    // arquivo.
    if (inTemplate && !inBlock && line.trim().startsWith('//')) inTemplate = false;

    while (i < n) {
      const c = line[i];
      const next = line[i + 1];

      if (inBlock) {
        if (c === '*' && next === '/') { inBlock = false; i += 2; } else i++;
        continue;
      }
      if (inTemplate) {
        res += c;
        if (c === '\\') { res += next || ''; i += 2; continue; }
        if (c === '`') inTemplate = false;
        i++;
        continue;
      }
      if (quote) {
        res += c;
        if (c === '\\') { res += next || ''; i += 2; continue; }
        if (c === quote) quote = null;
        i++;
        continue;
      }
      if (c === '/' && next === '/') break;              // resto da linha é comentário
      if (c === '/' && next === '*') { inBlock = true; i += 2; continue; }
      if (c === '`') { inTemplate = true; res += c; i++; continue; }
      if (c === '"' || c === "'") { quote = c; res += c; i++; continue; }
      res += c; i++;
    }
    out.push(res);
  }
  return out.join('\n');
}

function findHardcoded(file) {
  const src = fs.readFileSync(file, 'utf8');
  const code = stripComments(src);
  const hits = [];
  const seen = new Set();

  const push = (text) => {
    const key = text.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    hits.push(key.length > 70 ? key.slice(0, 70) + '…' : key);
  };

  // Literais de string (aspas simples, duplas e template).
  for (const m of code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    const text = m[1] ?? m[2] ?? m[3] ?? '';
    if (looksPortuguese(text)) push(text);
  }
  // Texto solto de JSX: >Alguma frase<
  for (const m of code.matchAll(/>([^<>{}]{4,})</g)) {
    if (looksPortuguese(m[1])) push(m[1]);
  }
  return hits;
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(js|jsx|cjs)$/.test(name)) acc.push(full);
  }
  return acc;
}

// Array conta como FOLHA, não se entra nele.
//
// Listas de passos (o diagnóstico do adb) podem legitimamente ter tamanhos
// diferentes por idioma — uma instrução que precisa de dois passos em português
// pode caber em um em inglês. Recursar produziria `steps.0`, `steps.1`… e a
// paridade passaria a exigir o mesmo NÚMERO de itens, engessando a tradução. O
// que importa aqui é que a lista exista nos dois lados.
function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]);
}

// ---------------------------------------------------------------------------

const problems = [];

// --- A. paridade -----------------------------------------------------------
const catalogs = {};
for (const f of fs.readdirSync(CATALOG_DIR).filter((f) => f.endsWith('.json'))) {
  catalogs[path.basename(f, '.json')] = JSON.parse(
    fs.readFileSync(path.join(CATALOG_DIR, f), 'utf8'));
}
const langs = Object.keys(catalogs);
const keysByLang = Object.fromEntries(langs.map((l) => [l, new Set(flatten(catalogs[l]))]));
const union = new Set(langs.flatMap((l) => [...keysByLang[l]]));
for (const key of [...union].sort()) {
  const missing = langs.filter((l) => !keysByLang[l].has(key));
  if (missing.length) {
    problems.push(`catálogo: a chave '${key}' falta em ${missing.map((l) => `${l}.json`).join(', ')}`);
  }
}

// --- B. texto cravado, com catraca ------------------------------------------
const baseline = fs.existsSync(BASELINE)
  ? JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
  : {};

const files = SCAN_DIRS.flatMap((d) => {
  const full = path.join(ROOT, d);
  return fs.existsSync(full) ? walk(full) : [];
});

const current = {};
for (const file of files) {
  const rel = path.relative(ROOT, file);
  // O próprio catálogo e o núcleo são feitos de texto — não se auto-acusam.
  if (rel.startsWith(path.join('src', 'i18n'))) continue;
  const hits = findHardcoded(file);
  if (hits.length) current[rel] = hits.length;

  const allowed = baseline[rel];
  if (allowed === undefined) {
    if (hits.length) {
      problems.push(
        `${rel}: ${hits.length} texto(s) em português cravado(s) — use t(), ou registre o arquivo em scripts/i18n-baseline.json\n` +
        hits.slice(0, 5).map((h) => `        "${h}"`).join('\n'));
    }
  } else if (hits.length > allowed) {
    problems.push(
      `${rel}: ${hits.length} textos cravados, mas a linha de base permite ${allowed}. ` +
      'A catraca só desce — migre o texto novo em vez de subir o número.');
  }
}

// Arquivo que ficou limpo tem de sair da lista. Sem isto a linha de base vira
// permissão permanente, e a catraca deixa de travar.
for (const rel of Object.keys(baseline)) {
  const now = current[rel] || 0;
  if (now === 0) {
    problems.push(`${rel}: migrado! Remova a entrada de scripts/i18n-baseline.json.`);
  } else if (now < baseline[rel]) {
    problems.push(
      `${rel}: caiu de ${baseline[rel]} para ${now}. Baixe o número em scripts/i18n-baseline.json ` +
      'para travar o progresso.');
  }
}

// ---------------------------------------------------------------------------

if (process.argv.includes('--write-baseline')) {
  fs.writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
  const total = Object.values(current).reduce((a, b) => a + b, 0);
  console.log(`Linha de base gravada: ${Object.keys(current).length} arquivos, ${total} textos pendentes.`);
  process.exit(0);
}

if (problems.length) {
  console.error(`\nGuarda de i18n encontrou ${problems.length} problema(s):\n`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error('');
  process.exit(1);
}

const pending = Object.values(current).reduce((a, b) => a + b, 0);
console.log(`i18n ok — ${union.size} chaves em ${langs.length} idiomas · ${pending} textos ainda por migrar.`);
