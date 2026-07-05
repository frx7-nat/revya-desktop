// src/main/runner.js
// Traduz uma task do catálogo em chamadas ADB concretas.
// Roda no processo main (acesso a child_process).

const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { execFile } = require('child_process');
const adb = require('../adb/adb');

// Baixa um APK de uma URL para uma pasta temporária e devolve o caminho local.
// Segue redirecionamentos simples (302), comuns em repositórios de APK.
function downloadApk(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Muitos redirecionamentos'));
    const dest = path.join(os.tmpdir(), `dexarmor-${Date.now()}.apk`);
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return resolve(downloadApk(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`Falha no download (HTTP ${res.statusCode})`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Extrai um arquivo ZIP (.apkm / .xapk) para destDir usando a ferramenta nativa do SO.
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(destDir, { recursive: true });
    if (process.platform === 'win32') {
      execFile('powershell', [
        '-NoProfile', '-Command',
        `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`,
      ], { timeout: 60000 }, (err) => (err ? reject(err) : resolve()));
    } else {
      execFile('unzip', ['-o', zipPath, '-d', destDir], { timeout: 60000 }, (err, _out, stderr) => {
        // unzip retorna código 1 em warnings inofensivos (campos extras do ZIP);
        // código > 1 indica falha real.
        if (err && err.code > 1) return reject(new Error(stderr || err.message));
        resolve();
      });
    }
  });
}

// Varre destDir recursivamente e retorna todos os arquivos .apk encontrados.
function findApks(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findApks(full));
    else if (entry.name.endsWith('.apk')) results.push(full);
  }
  return results;
}

// Instala um pacote .apkm ou .xapk: extrai o ZIP, coleta os APKs internos
// e usa adb install-multiple para split APKs ou adb install para APK único.
async function installBundled(serial, archivePath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dexarmor-'));
  try {
    await extractZip(archivePath, tmpDir);
    const apks = findApks(tmpDir);
    if (apks.length === 0) throw new Error('Nenhum APK encontrado no pacote');
    if (apks.length === 1) {
      await adb.installApk(serial, apks[0]);
    } else {
      await adb.installMultiple(serial, apks);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Pasta onde os APKs ficam empacotados.
function apkDir() {
  return process.resourcesPath && !process.defaultApp
    ? path.join(process.resourcesPath, 'apks')
    : path.join(__dirname, '..', '..', 'apks');
}

async function runTask(serial, task) {
  switch (task.kind) {
    case 'remove': {
      const results = [];
      for (const pkg of task.pkgs) {
        // Só tenta remover o que existe — evita ruído de erro em aparelhos
        // que já não traziam aquele app.
        if (await adb.hasPackage(serial, pkg)) {
          await adb.removePackage(serial, pkg);
          results.push(pkg);
        }
      }
      // Reverter = reativar SÓ os pacotes que realmente removemos (não os que
      // já estavam ausentes). Cada um vira uma sub-reversão.
      const revert = results.length
        ? { kind: 'restore-many', pkgs: results }
        : null;
      return {
        detail: results.length ? `Removidos: ${results.length}` : 'Nada a remover',
        revert,
      };
    }
    case 'install': {
      let apkPath;
      const src = task.source || (task.apk ? { type: 'local', apk: task.apk } : null);
      if (!src) throw new Error('App sem origem de APK definida');

      if (src.type === 'local') {
        // src.dir é a subpasta de categoria (ex.: 'launchers'); opcional.
        apkPath = src.dir
          ? path.join(apkDir(), src.dir, src.apk)
          : path.join(apkDir(), src.apk);
        if (!fs.existsSync(apkPath)) {
          throw new Error(`APK não encontrado: ${src.dir ? src.dir + '/' : ''}${src.apk}`);
        }
      } else if (src.type === 'url') {
        // Baixa o APK do repositório para uma pasta temporária e instala.
        apkPath = await downloadApk(src.url);
      } else {
        throw new Error(`Origem de APK desconhecida: ${src.type}`);
      }

      // Tenta desativar o verificador de pacotes (Play Protect para ADB).
      await adb.adb(['-s', serial, 'shell', 'settings', 'put', 'global', 'verifier_verify_adb_installs', '0']).catch(() => {});

      try {
        const ext = path.extname(apkPath).toLowerCase();
        if (ext === '.apkm' || ext === '.xapk') {
          await installBundled(serial, apkPath);
        } else {
          await adb.installApk(serial, apkPath);
        }
      } catch (e) {
        if (e.message.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
          throw new Error('ALREADY_INSTALLED:');
        }
        if (e.message.includes('INSTALL_FAILED_VERIFICATION_FAILURE')) {
          throw new Error('VERIFICATION_FAILURE:');
        }
        throw e;
      }

      // Reverter instalação = desinstalar o app que adicionamos (se tiver pkg).
      const revert = task.pkg ? { kind: 'uninstall', pkg: task.pkg } : null;
      return { detail: 'Instalado', revert };
    }
    case 'setting': {
      // Captura o valor anterior ANTES de escrever, para poder reverter.
      const prev = (await adb.getSetting(serial, task.ns, task.key)).trim();
      // Escreve e confirma lendo de volta (evita falha silenciosa).
      await adb.putSettingVerified(serial, task.ns, task.key, task.value);
      return {
        detail: 'Aplicado',
        revert: { kind: 'setting', ns: task.ns, key: task.key, prev: normalizePrev(prev) },
      };
    }
    case 'settings': {
      // Múltiplas chaves no mesmo namespace (ex.: as 3 escalas de animação).
      // Cada uma é verificada; se uma falhar, reporta qual.
      // Captura o valor anterior de cada uma antes de escrever.
      const applied = [];
      const prevs = [];
      for (const { key, value } of task.keys) {
        const prev = (await adb.getSetting(serial, task.ns, key)).trim();
        try {
          await adb.putSettingVerified(serial, task.ns, key, value);
          prevs.push({ key, prev: normalizePrev(prev) });
          applied.push(key);
        } catch (e) {
          throw new Error(`${applied.length}/${task.keys.length} aplicadas. Falhou em ${key}: ${e.message}`);
        }
      }
      return {
        detail: `Aplicado (${applied.length} ajustes)`,
        revert: { kind: 'settings', ns: task.ns, keys: prevs },
      };
    }
    case 'home': {
      if (!task.pkg) {
        throw new Error('Launcher padrão não configurado (defina o pacote)');
      }
      if (!(await adb.hasPackage(serial, task.pkg))) {
        throw new Error('Launcher não está instalado — marque para instalar primeiro');
      }
      const prevHome = await adb.getCurrentHome(serial);
      await adb.setHomeActivity(serial, task.pkg);
      // VERIFICA se realmente virou padrão (em alguns Galaxy não pega de 1ª).
      const nowHome = await adb.getCurrentHome(serial);
      if (nowHome && !nowHome.includes(task.pkg)) {
        throw new Error('O sistema manteve o launcher antigo. No celular, toque no botão Início e escolha o launcher de TV como padrão.');
      }
      return {
        detail: 'Definido como tela inicial',
        revert: prevHome ? { kind: 'home', prev: prevHome } : null,
      };
    }
    case 'rotate': {
      // Força paisagem de verdade: trava rotação + define paisagem + obriga
      // todos os apps a respeitarem (fixed-to-user-rotation).
      const prevAccel = (await adb.getSetting(serial, 'system', 'accelerometer_rotation')).trim();
      const prevRot = (await adb.getSetting(serial, 'system', 'user_rotation')).trim();
      await adb.putSetting(serial, 'system', 'accelerometer_rotation', 0);
      await adb.putSetting(serial, 'system', 'user_rotation', 1); // 1 = 90° (paisagem)
      // O comando 'wm' que força apps teimosos é o mais frágil (varia por
      // versão e pode não existir). Se falhar, a rotação básica acima JÁ foi
      // aplicada — então não derrubamos a task, só sinalizamos no detalhe.
      let forced = true;
      try {
        await adb.setFixToUserRotation(serial, true);
      } catch {
        forced = false;
      }
      return {
        detail: forced
          ? 'Paisagem forçada'
          : 'Paisagem aplicada (alguns apps podem ainda abrir em pé neste aparelho)',
        revert: {
          kind: 'rotate',
          accel: normalizePrev(prevAccel),
          rot: normalizePrev(prevRot),
          forced,
        },
      };
    }
    case 'wmsize': {
      const before = await adb.getDisplaySize(serial);
      await adb.setDisplaySize(serial, task.width, task.height);
      return {
        detail: `Resolução ${task.width}x${task.height}`,
        revert: { kind: 'wmsize', hadOverride: !!before.override, override: before.override },
      };
    }
    default:
      throw new Error(`Tipo de task desconhecido: ${task.kind}`);
  }
}

// Normaliza o retorno do 'settings get': quando a chave não existe, o ADB
// devolve a string 'null'. Guardamos isso como null de verdade, para na
// reversão sabermos que a chave deve ser APAGADA (e não reescrita com "null").
function normalizePrev(raw) {
  return (raw === 'null' || raw === '') ? null : raw;
}

// Reverte uma entrada previamente registrada. Retorna texto do resultado.
// Lança erro se não conseguir (o chamador trata item a item).
async function revertEntry(serial, entry) {
  const r = entry.revert;
  if (!r) throw new Error('Sem informação de reversão');

  switch (r.kind) {
    case 'restore': {
      // App removido: reativa para o usuário.
      await adb.restorePackage(serial, r.pkg);
      return 'Reativado';
    }
    case 'restore-many': {
      // Vários apps removidos numa task: reativa cada um. Se um falhar,
      // continua os outros e reporta no final.
      const ok = [];
      const fail = [];
      for (const pkg of r.pkgs) {
        try { await adb.restorePackage(serial, pkg); ok.push(pkg); }
        catch { fail.push(pkg); }
      }
      if (fail.length) throw new Error(`Reativados ${ok.length}/${r.pkgs.length}`);
      return `Reativados (${ok.length})`;
    }
    case 'uninstall': {
      // App que instalamos: remove.
      await adb.removePackage(serial, r.pkg);
      return 'Removido';
    }
    case 'setting': {
      if (r.prev === null) await adb.deleteSetting(serial, r.ns, r.key);
      else await adb.putSetting(serial, r.ns, r.key, r.prev);
      return 'Restaurado';
    }
    case 'settings': {
      for (const { key, prev } of r.keys) {
        if (prev === null) await adb.deleteSetting(serial, r.ns, key);
        else await adb.putSetting(serial, r.ns, key, prev);
      }
      return 'Restaurado';
    }
    case 'home': {
      await adb.setHomeActivity(serial, r.prev);
      return 'Launcher restaurado';
    }
    case 'rotate': {
      // Libera a rotação forçada (só se foi aplicada) e restaura os valores.
      if (r.forced !== false) {
        try { await adb.setFixToUserRotation(serial, false); } catch { /* ignora */ }
      }
      if (r.accel === null) await adb.deleteSetting(serial, 'system', 'accelerometer_rotation');
      else await adb.putSetting(serial, 'system', 'accelerometer_rotation', r.accel);
      if (r.rot === null) await adb.deleteSetting(serial, 'system', 'user_rotation');
      else await adb.putSetting(serial, 'system', 'user_rotation', r.rot);
      return 'Rotação restaurada';
    }
    case 'wmsize': {
      if (r.hadOverride && r.override) {
        const [w, h] = r.override.split('x');
        await adb.setDisplaySize(serial, Number(w), Number(h));
      } else {
        await adb.setDisplaySize(serial, null, null);
      }
      return 'Resolução restaurada';
    }
    default:
      throw new Error(`Tipo de reversão desconhecido: ${r.kind}`);
  }
}

module.exports = { runTask, revertEntry };
