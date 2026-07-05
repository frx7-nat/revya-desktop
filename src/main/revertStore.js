// src/main/revertStore.js
// Persistência do "registro de reversão": antes de aplicar mudanças, o app
// guarda como o aparelho estava, para conseguir desfazer depois.
//
// O arquivo fica no disco do COMPUTADOR (pasta userData do Electron), um por
// aparelho (identificado pelo serial). Não fica no celular. Isso significa que
// a reversão funciona a partir do mesmo computador que aplicou as mudanças.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Caminho do arquivo de reversão de um aparelho específico.
function fileFor(serial) {
  const dir = path.join(app.getPath('userData'), 'revert');
  fs.mkdirSync(dir, { recursive: true });
  // Serial pode ter caracteres estranhos; sanitiza para nome de arquivo.
  const safe = String(serial).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(dir, `${safe}.json`);
}

// Lê o registro de reversão de um aparelho. Retorna { entries: [] } se vazio.
function read(serial) {
  try {
    const raw = fs.readFileSync(fileFor(serial), 'utf8');
    const data = JSON.parse(raw);
    return data && Array.isArray(data.entries) ? data : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

// Grava o registro completo.
function write(serial, data) {
  fs.writeFileSync(fileFor(serial), JSON.stringify(data, null, 2), 'utf8');
}

// Combina a reversão antiga com a nova quando a MESMA task é reaplicada.
// Regra geral: o estado ORIGINAL (o mais antigo) é o que vale — se a task já
// foi aplicada antes, o "valor anterior" capturado na reaplicação é o valor
// que nós mesmos colocamos, não o do usuário. Para listas (pacotes/chaves),
// unimos: itens novos entram, itens repetidos mantêm o registro original.
function mergeRevert(oldRevert, newRevert) {
  if (!oldRevert) return newRevert;
  if (!newRevert || newRevert.kind !== oldRevert.kind) return oldRevert;
  switch (oldRevert.kind) {
    case 'restore-many':
      return { ...oldRevert, pkgs: [...new Set([...oldRevert.pkgs, ...newRevert.pkgs])] };
    case 'settings': {
      const keys = [...oldRevert.keys];
      for (const k of newRevert.keys) {
        if (!keys.some((x) => x.key === k.key)) keys.push(k);
      }
      return { ...oldRevert, keys };
    }
    default:
      // setting / home / rotate / wmsize / uninstall: mantém o original.
      return oldRevert;
  }
}

// Acrescenta uma entrada de reversão (uma por task aplicada). Se a task já
// tem entrada, faz o merge preservando o estado original (ver mergeRevert).
function addEntry(serial, entry) {
  const data = read(serial);
  const existing = data.entries.find((e) => e.taskId === entry.taskId);
  if (existing) {
    existing.label = entry.label;
    existing.revert = mergeRevert(existing.revert, entry.revert);
  } else {
    data.entries.push(entry);
  }
  data.updatedAt = new Date().toISOString();
  write(serial, data);
  return data;
}

// Remove entradas por taskId (após reverter com sucesso).
function removeEntries(serial, taskIds) {
  const data = read(serial);
  data.entries = data.entries.filter((e) => !taskIds.includes(e.taskId));
  data.updatedAt = new Date().toISOString();
  write(serial, data);
  return data;
}

// Quantas entradas de reversão existem (usado para habilitar o botão de reset).
function count(serial) {
  return read(serial).entries.length;
}

module.exports = { read, addEntry, removeEntries, count };
