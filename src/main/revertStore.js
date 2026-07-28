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

// Versão do schema do registro. Arquivos SEM o campo `version` são tratados
// como versão 1 (todos os registros criados antes desta blindagem). O valor
// hoje é ter o PONTO DE ENTRADA pronto (migrate) para quando a estrutura
// evoluir de novo — a migração 1→2 só carimba o campo.
const SCHEMA_VERSION = 2;

// Recebe um registro de qualquer versão e devolve a atual. Migração central:
// um único lugar para evoluir a estrutura sem espalhar `if version` pelo código.
function migrate(data) {
  if (!data || typeof data !== 'object') return { entries: [], version: SCHEMA_VERSION };
  const version = Number(data.version) || 1;
  if (version >= SCHEMA_VERSION) return data;
  // 1 → 2: sem transformação de dados; só o carimbo da versão.
  return { ...data, version: SCHEMA_VERSION };
}

// Guard de reentrância: a recuperação do backup reescreve o registro e anota no
// diário, e essas operações releem o arquivo — sem o guard, um principal
// corrompido dispararia a recuperação em cascata.
const recovering = new Set();

// Recuperação do backup: o arquivo principal corrompeu (ex.: queda de energia
// no meio de uma gravação) e o .bak salvou o dia. Renormaliza o principal a
// partir do backup bom e anota no diário — a recuperação NUNCA é silenciosa.
function recoverFromBackup(serial, file, data) {
  if (recovering.has(file)) return;
  recovering.add(file);
  try {
    write(serial, data); // reescreve o principal; write() protege o .bak
    appendJournal(serial, { type: 'registro-recuperado-do-backup' });
  } catch { /* recuperação é melhor-esforço; o dado bom já foi devolvido */ }
  finally { recovering.delete(file); }
}

// Lê o registro de reversão de um aparelho. Retorna { entries: [] } se vazio.
// Se o arquivo principal estiver corrompido (ex.: queda de energia no meio de
// uma gravação), cai para o backup .bak antes de desistir — perder este
// registro silenciosamente faria o app "esquecer" tudo que aplicou no aparelho.
// Recuperar do backup renormaliza o principal e deixa um rastro no diário.
function read(serial) {
  const file = fileFor(serial);
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data && Array.isArray(data.entries)) return migrate(data);
  } catch { /* principal ilegível: tenta o backup abaixo */ }
  try {
    const data = JSON.parse(fs.readFileSync(`${file}.bak`, 'utf8'));
    if (data && Array.isArray(data.entries)) {
      recoverFromBackup(serial, file, data);
      return migrate(data);
    }
  } catch { /* sem backup válido também: registro vazio */ }
  return { entries: [], version: SCHEMA_VERSION };
}

// Grava o registro completo de forma ATÔMICA: escreve num arquivo temporário
// e renomeia por cima do definitivo (rename é atômico no mesmo volume). O
// arquivo anterior vira .bak — é o fallback do read() se algo corromper.
function write(serial, data) {
  const file = fileFor(serial);
  const tmp = `${file}.tmp`;
  const payload = { ...data, version: SCHEMA_VERSION };
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  try {
    // Só faz backup do principal se ele estiver ÍNTEGRO: um principal
    // corrompido JAMAIS pode sobrescrever um .bak bom (senão a recuperação
    // perderia sua última rede). O JSON.parse é a prova de integridade.
    if (fs.existsSync(file)) {
      JSON.parse(fs.readFileSync(file, 'utf8'));
      fs.copyFileSync(file, `${file}.bak`);
    }
  } catch { /* principal ausente/corrompido: preserva o .bak bom como está */ }
  fs.renameSync(tmp, file);
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

// Checagem viva da lei 1 (revert imutável): o merge é SÓ aditivo — um valor
// já capturado no estado original nunca pode sumir. Retorna true se algo caiu
// entre `before` e `after` (só acontece num bug de merge). Nunca dá crash.
function revertDropped(before, after) {
  if (!before || !after || before.kind !== after.kind) return false;
  if (before.kind === 'restore-many') {
    return (before.pkgs || []).some((p) => !(after.pkgs || []).includes(p));
  }
  if (before.kind === 'settings') {
    return (before.keys || []).some((k) =>
      !(after.keys || []).some((x) => x.key === k.key && x.prev === k.prev));
  }
  // Kinds escalares: o mergeRevert devolve o original intacto — qualquer
  // diferença é perda.
  return JSON.stringify(before) !== JSON.stringify(after);
}

// Acrescenta uma entrada de reversão (uma por task aplicada). Se a task já
// tem entrada, faz o merge preservando o estado original (ver mergeRevert).
function addEntry(serial, entry) {
  const data = read(serial);
  const existing = data.entries.find((e) => e.taskId === entry.taskId);
  if (existing) {
    existing.label = entry.label;
    // Guarda a última versão APLICADA da task (ex.: dpi escolhido no diálogo)
    // — é contra ela que o check-up verifica, não contra o catálogo.
    if (entry.task) existing.task = entry.task;
    const revertBefore = existing.revert;
    existing.revert = mergeRevert(existing.revert, entry.revert);
    // Guardião da lei 1: se o merge perdeu um valor original, deixa rastro no
    // diário (o estado do aparelho segue; o registro é que denuncia o bug).
    if (revertDropped(revertBefore, existing.revert)) {
      // Anota no MESMO objeto data (persistido pelo write do fim do addEntry).
      // Chamar appendJournal aqui faria uma escrita separada que o write final
      // sobrescreveria, perdendo o rastro.
      pushJournalInto(data, { type: 'invariante-violada', detail: 'revert-mutado' });
    }
    // Perfil celular vivo: o retrato mais recente do modo celular (capturado
    // na ida ao modo TV). É o destino da PRÓXIMA volta ao modo celular; o
    // estado original em `revert` fica reservado à Reversão completa. Só o
    // wake envia este campo — uma reaplicação em pleno modo TV não deve
    // contaminar o perfil celular com valores de TV.
    if (entry.phoneRevert) existing.phoneRevert = entry.phoneRevert;
    // Reaplicada = ativa de novo: uma entrada adormecida (modo celular) que
    // volta a ser aplicada deixa de estar adormecida.
    delete existing.dormant;
  } else {
    data.entries.push(entry);
  }
  data.updatedAt = new Date().toISOString();
  write(serial, data);
  return data;
}

// Atualiza campos de uma entrada existente (ex.: marcar dormant na troca de
// modo, ou gravar o snapshot do perfil TV em entry.task). Merge raso.
function updateEntry(serial, taskId, patch) {
  const data = read(serial);
  const entry = data.entries.find((e) => e.taskId === taskId);
  if (!entry) return data;
  Object.assign(entry, patch);
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

// Preferências por aparelho (ex.: autoTv = ativar modo TV ao conectar).
// Moram no mesmo arquivo do registro, então seguem o serial estável e
// sobrevivem à troca USB↔Wi-Fi.
function getPrefs(serial) {
  return read(serial).prefs || {};
}

function setPrefs(serial, patch) {
  const data = read(serial);
  data.prefs = { ...(data.prefs || {}), ...patch };
  data.updatedAt = new Date().toISOString();
  write(serial, data);
  return data.prefs;
}

// Encerra a "sessão" de configuração após uma Reversão completa: apaga as
// preferências do aparelho (ex.: modo TV automático) e marca o recomeço.
// As entradas que sobraram (itens que FALHARAM ao reverter) são preservadas
// de propósito — precisam continuar reversíveis na nova sessão.
// Os PERFIS nomeados também são preservados: são patrimônio do usuário
// ("Sala 4K" continua valendo se ele reconfigurar o aparelho depois).
function resetSession(serial) {
  const data = read(serial);
  delete data.prefs;
  data.sessionStartedAt = new Date().toISOString();
  data.updatedAt = new Date().toISOString();
  write(serial, data);
  return data;
}

// ---- Diário de trocas -------------------------------------------------------
// Histórico curto de eventos por aparelho (trocas de modo, capturas
// descartadas pela vacina, dormentes restaurados na Reversão). Vive no mesmo
// arquivo do registro, então segue o serial estável e entra no
// export/import. Transforma o próximo "ficou torto" num diagnóstico de
// minutos: dá para ver QUANDO cada troca rodou e o que falhou — sem depender
// da memória de ninguém.
const JOURNAL_MAX = 80;

// Empurra um evento no diário de um objeto data JÁ em mãos (sem tocar o disco).
// Usado por quem vai gravar o data de qualquer jeito (addEntry) para não fazer
// uma escrita separada que a gravação seguinte sobrescreveria.
function pushJournalInto(data, event) {
  data.journal = data.journal || [];
  data.journal.push({ at: new Date().toISOString(), ...event });
  // Mantém só os últimos eventos: diário é diagnóstico, não histórico eterno.
  if (data.journal.length > JOURNAL_MAX) data.journal = data.journal.slice(-JOURNAL_MAX);
}

function appendJournal(serial, event) {
  const data = read(serial);
  pushJournalInto(data, event);
  data.updatedAt = new Date().toISOString();
  write(serial, data);
}

// ---- Perfis nomeados de interface -------------------------------------------
// Um perfil é a fotografia NOMEADA da interface que funcionou ("Sala 4K",
// "Quarto Full HD"): as tasks de modo com os valores exatos daquele momento.
// Moram no mesmo arquivo do registro — seguem o serial estável do aparelho e
// entram no export/import de JSON automaticamente.

function getProfiles(serial) {
  return read(serial).profiles || [];
}

// Nome repetido (ignorando maiúsculas/espaços) ATUALIZA o perfil existente —
// é o gesto natural de "regravar por cima" depois de melhorar a interface.
function saveProfile(serial, { name, tasks }) {
  const data = read(serial);
  data.profiles = data.profiles || [];
  const norm = (s) => String(s).trim().toLowerCase();
  const existing = data.profiles.find((p) => norm(p.name) === norm(name));
  const now = new Date().toISOString();
  if (existing) {
    existing.name = String(name).trim();
    existing.tasks = tasks;
    existing.updatedAt = now;
  } else {
    data.profiles.push({
      id: `p-${Date.now()}`, name: String(name).trim(), tasks,
      createdAt: now, updatedAt: now,
    });
  }
  data.updatedAt = now;
  write(serial, data);
  return data.profiles;
}

function deleteProfile(serial, profileId) {
  const data = read(serial);
  data.profiles = (data.profiles || []).filter((p) => p.id !== profileId);
  data.updatedAt = new Date().toISOString();
  write(serial, data);
  return data.profiles;
}

// mergeRevert também é exportado: o mode:wakeOne o usa para fundir o
// phoneRevert numa RETOMADA de troca que falhou no meio — as chaves já
// aplicadas leriam valores de TV na segunda tentativa, e a fusão preserva o
// retrato de celular capturado na primeira.
module.exports = {
  read, addEntry, updateEntry, removeEntries, count,
  getPrefs, setPrefs, resetSession, mergeRevert,
  getProfiles, saveProfile, deleteProfile,
  appendJournal,
};
