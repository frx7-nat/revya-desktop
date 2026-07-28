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

/**
 * C. TEXTO CRU EM POSIÇÃO DE INTERFACE — checagem ESTRUTURAL.
 *
 * ## Por que a checagem B não bastou
 *
 * A B pergunta "isto parece português?". Em 28/07/2026 a usuária rodou o app
 * pela primeira vez (o Kaspersky impedia — ver PENDENCIAS) e viu títulos ainda
 * em português com o idioma em inglês. A B passava em verde. Três furos:
 *
 *   1. `looksPortuguese` exige espaço OU acento. "Telemetria", "Bateria",
 *      "Progresso", "Enviado" — palavra única sem acento — nunca eram vistas.
 *      Título de seção tem exatamente esse formato.
 *   2. `PT_WORDS` não tem `de`, `da`, `do`, `no`, `na`, `em`. "Central de
 *      controle" tem espaço, não tem acento e não casa nada. Passava.
 *      Acrescentá-las não resolve: "do" e "as" são inglês legítimo, e a B
 *      varre TODO literal — o falso positivo inviabilizaria a guarda.
 *   3. O regex de JSX era `>([^<>{}]{4,})<`. As chaves na classe negada matam
 *      o casamento quando o texto tem `{expressão}` no meio — que é o caso
 *      comum. `{model ? … : t('…')} Pode escolher as modificações` era
 *      invisível.
 *
 * ## A troca de pergunta
 *
 * Aqui não se pergunta o idioma: pergunta-se a POSIÇÃO. Em `src/renderer`,
 * texto que chega ao olho do usuário — filho de JSX e props de texto — tem de
 * vir de `t()`. Qualquer literal ali é suspeito, em qualquer idioma. Isso pega
 * inclusive o texto escrito direto em inglês, que a B assume como limite.
 *
 * O preço é acusar o que legitimamente não se traduz: "DeX", "Wi-Fi", "4K
 * (2160p)". Esses se declaram com `// i18n-ok` — o mesmo marcador da tarefa
 * `checkI18n` do launcher, para quem trabalha nos dois lados não precisar
 * lembrar de duas convenções. O marcador vale na linha ou em qualquer linha do
 * bloco de comentário logo acima, porque o motivo raramente cabe no fim da
 * linha e obrigar a espremer produz `// i18n-ok` sem explicação.
 */
const UI_PROPS = /\b(label|title|help|placeholder|sub|text|primary|secondary|heading|subtitle|caption|hint|note|alt|aria-label)\s*=\s*(?:"([^"\n]{2,})"|'([^'\n]{2,})')/g;
// O `</` no fim é o que separa JSX de código. Sem ele, `>` e `<` de comparação
// (`if (history.length > 2)`, `for (let i = 0; i < n)`) casavam com qualquer
// coisa até o próximo sinal, e a checagem acusou 234 trechos — quase todos
// fragmentos de código. Exigir a TAG DE FECHAMENTO derruba isso para o que
// realmente é filho de JSX.
//
// Limite conhecido: texto seguido de elemento aninhado em vez de fechamento
// (`<p>Olá <b>mundo</b></p>`) não casa o primeiro pedaço. Aceitável — negrito
// no meio de frase já é caso do RichText, que vem do catálogo.
const JSX_TEXT = />([^<>]{2,400}?)<\//g;
const HAS_WORD = /[A-Za-zÀ-ÿ]{2,}/;

function findBareUiText(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const rawLines = raw.split('\n');

  // Linhas cobertas por `// i18n-ok`: a própria, ou a que tem um bloco de
  // comentário logo acima contendo o marcador.
  // Vale nos DOIS estilos de comentário, porque em JSX os dois aparecem: `//`
  // funciona dentro de um bloco de código, mas na posição de FILHO só existe
  // `{/* … */}`. Exigir um estilo só obrigaria a lembrar qual, no meio da
  // edição — e o marcador que não pega falha em silêncio, que é o pior modo.
  //
  // O marcador cobre a própria linha e a primeira linha de CÓDIGO abaixo dele.
  // Uma linha só, de propósito: um comentário dizendo "vale para as duas
  // linhas seguintes" não tem como ser verificado, e a segunda linha ficaria
  // isenta sem que ninguém percebesse. Um marcador por elemento.
  // Mapa de linhas que são comentário. Precisa de ESTADO de bloco: um
  // `{/* … */}` de três linhas tem a do meio começando com palavra comum
  // ("procura o número da versão"), que teste algum de prefixo não reconhece.
  // Sem isto, a busca pela linha de código parava no meio do próprio
  // comentário e marcava a linha errada — o `label="API"` seguia acusado com
  // o marcador logo acima dele.
  const isComment = new Array(rawLines.length).fill(false);
  let inBlock = false;
  rawLines.forEach((line, i) => {
    const s = line.trim();
    if (inBlock) {
      isComment[i] = true;
      if (s.includes('*/')) inBlock = false;
      return;
    }
    if (s === '' || s.startsWith('//')) { isComment[i] = true; return; }
    if (s.startsWith('/*') || s.startsWith('{/*')) {
      isComment[i] = true;
      if (!s.includes('*/')) inBlock = true;
    }
  });

  // O marcador cobre a própria linha e a primeira linha de CÓDIGO abaixo dele.
  // Uma linha só, de propósito: um comentário dizendo "vale para as duas
  // linhas seguintes" não tem como ser verificado, e a segunda ficaria isenta
  // sem ninguém perceber. Um marcador por elemento.
  const marked = new Set();
  rawLines.forEach((line, i) => {
    if (!line.includes('i18n-ok')) return;
    marked.add(i);
    let j = i + 1;
    while (j < rawLines.length && isComment[j]) j++;
    if (j < rawLines.length) marked.add(j);
  });

  // `stripComments` preserva a contagem de linhas, então o deslocamento no
  // texto limpo ainda converte em número de linha do arquivo original.
  const code = stripComments(raw);
  const lineOf = (idx) => code.slice(0, idx).split('\n').length - 1;

  const hits = [];
  const add = (text, idx) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t.length < 2 || !HAS_WORD.test(t)) return;
    // Sobra de código, não texto de tela. Um `>` de COMPARAÇÃO dentro de uma
    // chave JSX (`{n > 50 ? t('a') : t('b')}`) faz o casamento começar no meio
    // da expressão, e a contagem de profundidade não salva porque ela já
    // começou torta. Esses restos sempre trazem parêntese ou abrem com dígito;
    // texto que o usuário lê não faz nem uma coisa nem outra.
    // O preço é não ver um texto de tela com parêntese solto em filho de JSX —
    // uma acusação a menos, nunca uma a mais.
    if (/[()]/.test(t)) return;
    if (!/^[A-Za-zÀ-ÿ]/.test(t)) return;
    const start = lineOf(idx);
    const end = lineOf(idx + text.length);
    for (let l = start; l <= end; l++) if (marked.has(l)) return;
    hits.push({ line: start + 1, text: t.length > 60 ? `${t.slice(0, 60)}…` : t });
  };

  for (const m of code.matchAll(UI_PROPS)) {
    add(m[2] ?? m[3] ?? '', m.index);
  }
  for (const m of code.matchAll(JSX_TEXT)) {
    // Tira as {expressões} e olha o que sobra de texto solto entre elas —
    // é isto que o regex antigo, com `{}` na classe negada, deixava passar.
    //
    // A contagem de PROFUNDIDADE é necessária: `{t('k', { a: 1 })}` tem chaves
    // aninhadas, e um `\{[^{}]*\}` simples casa só até a primeira `}`, deixando
    // o resto da chamada virar "texto". Foi o que produziu 82 acusações como
    // `") : t('checkup.driftOne')}"` — fragmento de código, não texto de tela.
    const bruto = m[1];
    if (/=>|\breturn\b/.test(bruto)) continue;
    let depth = 0;
    let buf = '';
    let bufStart = m.index + 1;
    for (let i = 0; i < bruto.length; i++) {
      const c = bruto[i];
      if (c === '{') {
        if (depth === 0) { add(buf, bufStart); buf = ''; }
        depth++;
      } else if (c === '}') {
        depth = Math.max(0, depth - 1);
        if (depth === 0) bufStart = m.index + 1 + i + 1;
      } else if (depth === 0) {
        buf += c;
      }
    }
    add(buf, bufStart);
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

// --- C. texto cru em posição de interface -----------------------------------
//
// Sem catraca e sem linha de base: nasce em ZERO e tem de continuar em zero.
// A catraca da B existia porque havia ~200 textos pendentes quando ela foi
// escrita; aqui não há dívida a acomodar — o renderer foi limpo em 28/07/2026,
// no mesmo dia em que esta checagem foi escrita.
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (!rel.endsWith('.jsx')) continue;
  if (!rel.startsWith(path.join('src', 'renderer'))) continue;
  const bare = findBareUiText(file);
  if (bare.length) {
    problems.push(
      `${rel}: ${bare.length} texto(s) cru(s) em posição de interface — use t(), ` +
      'ou declare com // i18n-ok e o motivo\n' +
      bare.slice(0, 6).map((h) => `        :${h.line}  "${h.text}"`).join('\n'));
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
