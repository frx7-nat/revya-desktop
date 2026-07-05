// src/main/scrcpy.js
// Espelhamento da tela do aparelho via scrcpy (https://github.com/Genymobile/scrcpy).
// Abre uma janela nativa com a tela do celular, controlável por mouse/teclado —
// útil nas etapas do setup que pedem toques no aparelho (autorizar depuração,
// escolher launcher padrão etc.) sem precisar pegar o telefone na mão.
//
// O binário segue o mesmo padrão do platform-tools: fica em scrcpy/<os>/ no
// desenvolvimento e em resources/scrcpy no app empacotado (electron-builder
// copia só a pasta da plataforma alvo). Se não estiver empacotado, caímos
// para o scrcpy instalado no sistema (ex.: Homebrew), se existir no PATH.
//
// Importante: apontamos o scrcpy para o NOSSO adb (env ADB). Sem isso, ele
// usaria o adb dele — versões diferentes de adb derrubam o servidor uma da
// outra e a conexão do DexArmor cairia no meio do espelhamento.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const adb = require('../adb/adb');

function osFolder() {
  switch (process.platform) {
    case 'win32': return 'win';
    case 'darwin': return 'mac';
    default: return 'linux';
  }
}

// Caminho do binário empacotado (produção) ou da pasta de dev.
function scrcpyPath() {
  const binary = process.platform === 'win32' ? 'scrcpy.exe' : 'scrcpy';
  const isProd = process.resourcesPath && !process.defaultApp;
  const base = isProd
    ? path.join(process.resourcesPath, 'scrcpy')
    : path.join(__dirname, '..', '..', 'scrcpy', osFolder());
  return path.join(base, binary);
}

// Um espelhamento por aparelho; evita abrir duas janelas do mesmo celular.
const children = new Map(); // serial -> ChildProcess

// Inicia o espelhamento. Resolve com { ok } quando a janela abre (processo
// sobrevive ao arranque) ou { ok: false, error } quando falha rápido.
function start(serial, title) {
  if (children.has(serial)) {
    return Promise.resolve({ ok: true, already: true });
  }

  const bundled = scrcpyPath();
  const env = { ...process.env, ADB: adb.adbPath() };
  let command = bundled;
  if (fs.existsSync(bundled)) {
    // Builds portáteis acham o scrcpy-server ao lado do executável, mas
    // fixamos o caminho para não depender do diretório de trabalho.
    const server = path.join(path.dirname(bundled), 'scrcpy-server');
    if (fs.existsSync(server)) env.SCRCPY_SERVER_PATH = server;
  } else {
    // Sem binário empacotado: tenta o scrcpy do sistema (PATH).
    command = 'scrcpy';
  }

  return new Promise((resolve) => {
    const child = spawn(command, [
      '-s', serial,
      '--window-title', title || 'DexArmor — Tela do celular',
    ], { env, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

    let stderrTail = '';
    child.stderr.on('data', (d) => {
      stderrTail = (stderrTail + d.toString()).slice(-600);
    });

    let settled = false;
    const settle = (result) => {
      if (!settled) { settled = true; resolve(result); }
    };

    child.on('error', (err) => {
      children.delete(serial);
      settle({
        ok: false,
        error: err.code === 'ENOENT'
          ? 'scrcpy não encontrado. Coloque os binários em scrcpy/ (veja o README da pasta) ou instale o scrcpy no sistema.'
          : String(err.message || err),
      });
    });

    child.on('exit', (code) => {
      children.delete(serial);
      // Saída rápida com erro = falhou ao abrir (ex.: aparelho desconectado).
      if (code !== 0) {
        const lastLine = stderrTail.trim().split('\n').filter(Boolean).pop();
        settle({ ok: false, error: lastLine || `scrcpy encerrou com código ${code}` });
      } else {
        settle({ ok: true });
      }
    });

    children.set(serial, child);
    // Se em 2s o processo continua vivo, a janela abriu — considera sucesso.
    setTimeout(() => settle({ ok: true }), 2000);
  });
}

// Encerra todos os espelhamentos (chamado quando o app fecha).
function stopAll() {
  for (const child of children.values()) {
    try { child.kill(); } catch { /* já morreu */ }
  }
  children.clear();
}

module.exports = { start, stopAll };
