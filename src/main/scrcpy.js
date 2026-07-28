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
const { t } = require('../i18n/runtime.cjs');

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
// Título usado em cada espelhamento — para o reinício recriar a janela igual.
const titles = new Map(); // serial -> string

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
      '--window-title', title || t('scrcpy.windowTitle'),
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
          ? t('scrcpy.notFound')
          : String(err.message || err),
      });
    });

    child.on('exit', (code) => {
      children.delete(serial);
      // Saída rápida com erro = falhou ao abrir (ex.: aparelho desconectado).
      if (code !== 0) {
        const lastLine = stderrTail.trim().split('\n').filter(Boolean).pop();
        settle({ ok: false, error: lastLine || t('scrcpy.exited', { code }) });
      } else {
        settle({ ok: true });
      }
    });

    children.set(serial, child);
    titles.set(serial, title);
    // Se em 2s o processo continua vivo, a janela abriu — considera sucesso.
    setTimeout(() => settle({ ok: true }), 2000);
  });
}

// Reinicia o espelhamento de um aparelho, SE estiver aberto (senão, não faz
// nada). Usado após a alternância de modos: a troca de resolução faz o
// encoder de vídeo renegociar e o stream pode cair para um tamanho menor e
// FICAR nele até a sessão ser recriada — visto no S8/LineageOS em 18/07/2026
// (display virtual preso em 1050x2160 com o aparelho em resolução plena).
function restartIfRunning(serial) {
  const child = children.get(serial);
  if (!child) return Promise.resolve({ ok: true, restarted: false });
  return new Promise((resolve) => {
    let done = false;
    const relaunch = () => {
      if (done) return;
      done = true;
      start(serial, titles.get(serial)).then((r) => resolve({ ...r, restarted: true }));
    };
    child.once('exit', relaunch);
    try { child.kill(); } catch { /* já morreu; o exit resolve */ }
    // Rede de segurança: processo que não encerra em 3s não é recriado por
    // cima (duas janelas seria pior que uma degradada).
    setTimeout(() => { if (!done) { done = true; resolve({ ok: false, restarted: false }); } }, 3000);
  });
}

// Encerra todos os espelhamentos (chamado quando o app fecha).
function stopAll() {
  for (const child of children.values()) {
    try { child.kill(); } catch { /* já morreu */ }
  }
  children.clear();
}

module.exports = { start, stopAll, restartIfRunning };
