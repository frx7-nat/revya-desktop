// src/main/settingsStore.js
// Preferências do PROGRAMA (não do aparelho) — hoje só o idioma.
//
// É o irmão do `revertStore`: mesmo lugar (userData do Electron), mesma
// defensividade. A diferença é o escopo — o `revertStore` guarda um arquivo por
// aparelho, porque descreve o estado de um celular; aqui é um arquivo só, do
// computador, porque descreve como o programa se apresenta.
//
// Nada aqui pode derrubar o app na abertura: arquivo ausente, corrompido ou
// escrito por uma versão futura tem de cair no padrão e seguir. É a primeira
// coisa lida no boot, e uma exceção aqui seria uma janela que não abre.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { coerceLanguage, normalizeLanguage } = require('../i18n/index.cjs');

function file() {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'settings.json');
}

/**
 * Idioma na primeira execução: o do sistema operacional, pela mesma regra do
 * launcher Android — casa por idioma, e o que não for português vira inglês.
 * `app.getLocale()` só responde de verdade depois do evento `ready`.
 */
function systemLanguage() {
  try {
    return normalizeLanguage(app.getLocale());
  } catch {
    return coerceLanguage(undefined);
  }
}

function read() {
  try {
    const raw = fs.readFileSync(file(), 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    // Ausente na primeira execução, e corrompido é possível se a máquina
    // desligar no meio da escrita. Os dois caem no padrão.
    return {};
  }
}

function write(patch) {
  const next = { ...read(), ...patch };
  try {
    fs.writeFileSync(file(), JSON.stringify(next, null, 2), 'utf8');
  } catch {
    // Disco cheio ou permissão negada: a preferência não sobrevive ao
    // fechamento, mas a sessão corrente continua funcionando. Perder a
    // preferência é aceitável; travar a troca de idioma não é.
  }
  return next;
}

/** Nunca devolve idioma inválido — arquivo editado à mão cai no padrão. */
function getLanguage() {
  const saved = read().language;
  if (saved === undefined || saved === null) return systemLanguage();
  return coerceLanguage(saved);
}

function setLanguage(lang) {
  const safe = coerceLanguage(lang);
  write({ language: safe });
  return safe;
}

module.exports = { getLanguage, setLanguage, systemLanguage };
