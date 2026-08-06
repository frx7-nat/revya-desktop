#!/usr/bin/env node
// scripts/verify-win.js
// Roda logo depois do `dist:win`. Faz duas coisas que já custaram caro:
//
//   1. TESTA os .exe de verdade (7z t abre o arquivo NSIS e confere cada
//      entrada). Build "SUCCESSFUL" não prova que o artefato presta.
//   2. Imprime o SHA-256, que é o que separa "arquivo bom" de "arquivo que se
//      corrompeu no caminho até o Windows".
//
// ## Por que isto existe
//
// O Kaspersky desta máquina APAGA o instalador NSIS minutos depois de criado —
// em `release/` e em QUALQUER pasta dentro da pasta pessoal, porque varre a
// pasta pessoal inteira. Só `/private/tmp` escapa, e é por isso que o
// `dist:win` escreve lá.
//
// O sintoma no Windows era enganoso: "NSIS Error — Installer integrity check
// has failed", que parece download ruim. Não era. O arquivo já saía mutilado
// da origem. E parecia intermitente porque o alvo `portable` roda com
// `CRCCheck off` e não reclamava — só o `nsis` se autoverifica.
//
// O PORTÁTIL NUNCA FOI APAGADO, em nenhuma pasta. Quando o instalador sumir,
// ele é o caminho que funciona.

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DIR = '/private/tmp/revya-build';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// `7z t` é o teste real: descompacta e confere. Sem o 7z instalado, seguimos
// com o hash — melhor um aviso do que travar o build por falta de ferramenta.
function testar(file) {
  try {
    const out = execFileSync('7z', ['t', file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return /Everything is Ok/.test(out) ? 'ok' : 'FALHOU';
  } catch (e) {
    if (e.code === 'ENOENT') return 'sem 7z (brew install p7zip)';
    return 'FALHOU';
  }
}

if (!fs.existsSync(DIR)) {
  console.error(`\n  Pasta ${DIR} não existe — o build não chegou a rodar?\n`);
  process.exit(1);
}

const exes = fs.readdirSync(DIR).filter((f) => f.endsWith('.exe')).sort();
if (exes.length === 0) {
  console.error(`\n  Nenhum .exe em ${DIR}.\n`);
  process.exit(1);
}

// Empacota cada .exe num ZIP para o TRANSPORTE.
//
// Motivo: `.exe` não assinado em trânsito é mexido pelos antivírus das DUAS
// pontas — o daqui e o do PC de destino. Dentro do ZIP ele deixa de ser
// executável aos olhos deles. E o ZIP tem CRC por arquivo: se algo se
// corromper no caminho, a EXTRAÇÃO falha alto, em vez de entregar um .exe
// quebrado que só vai reclamar na hora de instalar (que foi o que aconteceu).
function zipar(exe) {
  const zip = exe.replace(/\.exe$/, '.zip');
  try {
    fs.rmSync(zip, { force: true });
    execFileSync('7z', ['a', '-tzip', '-mx=1', zip, exe], { stdio: 'ignore' });
    const out = execFileSync('7z', ['t', zip], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return /Everything is Ok/.test(out) ? zip : null;
  } catch {
    return null;
  }
}

console.log(`\n  Instaláveis Windows em ${DIR}\n`);
let algumFalhou = false;
for (const nome of exes) {
  const full = path.join(DIR, nome);
  const estado = testar(full);
  if (estado === 'FALHOU') algumFalhou = true;
  const mb = (fs.statSync(full).size / 1024 / 1024).toFixed(1);
  console.log(`  ${nome}`);
  console.log(`     integridade  ${estado}`);
  console.log(`     tamanho      ${mb} MB`);
  console.log(`     SHA-256      ${sha256(full)}`);
  const zip = estado === 'ok' ? zipar(full) : null;
  if (zip) {
    console.log(`     ZIP p/ enviar  ${path.basename(zip)}`);
    console.log(`     SHA-256 do ZIP ${sha256(zip)}`);
  }
  console.log('');
}

console.log('  COMO LEVAR PARA O WINDOWS');
console.log('     1. Transfira o .ZIP, não o .exe — o .exe solto é mexido pelos');
console.log('        antivírus das duas pontas; dentro do ZIP, não.');
console.log('     2. No Windows, confira o hash do ZIP ANTES de extrair:');
console.log('           Get-FileHash arquivo.zip -Algorithm SHA256');
console.log('        Diferente = corrompeu no caminho. Não adianta extrair.');
console.log('     3. Extraia. Se a extração acusar erro de CRC, o mesmo vale.');
console.log('');
console.log('  Copie DESTA pasta, nunca de release/ nem de dentro da pasta pessoal:');
console.log('  o antivírus apaga o instalador NSIS em qualquer lugar da pasta pessoal.');
console.log('  Se ele sumir antes de você copiar, use o -portable — ele nunca foi');
console.log('  apagado, não instala, não desinstala e não tem checagem para falhar.');
console.log('');

process.exit(algumFalhou ? 1 : 0);
