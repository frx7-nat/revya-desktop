// src/adb/adb.js
// Wrapper em torno do adb.exe empacotado em platform-tools.
// Toda comunicação com o aparelho passa por aqui.

const { execFile } = require('child_process');
const path = require('path');

// Mapeia o process.platform do Node para o nome de pasta usado no projeto.
// macOS reporta 'darwin'; aqui guardamos os binários em platform-tools/mac.
function osFolder() {
  switch (process.platform) {
    case 'win32': return 'win';
    case 'darwin': return 'mac';
    default: return 'linux';
  }
}

// Resolve o caminho do binário adb conforme a plataforma e o ambiente.
//
// Em PRODUÇÃO: o electron-builder já copiou a pasta da plataforma certa
// (platform-tools/${os}) para resources/platform-tools — então é flat.
//
// Em DEV: as três pastas coexistem em platform-tools/{win,mac,linux},
// e escolhemos a subpasta da plataforma atual.
function adbPath() {
  const binary = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const isProd = process.resourcesPath && !process.defaultApp;
  const base = isProd
    ? path.join(process.resourcesPath, 'platform-tools')
    : path.join(__dirname, '..', '..', 'platform-tools', osFolder());
  return path.join(base, binary);
}

// Executa um comando adb e devolve stdout. Rejeita em erro.
function adb(args, { timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(adbPath(), args, { timeout }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

// Lista dispositivos conectados e autorizados.
async function listDevices() {
  const out = await adb(['devices', '-l']);
  return out
    .split('\n')
    .slice(1) // pula o cabeçalho "List of devices attached"
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state, ...rest] = line.split(/\s+/);
      const info = Object.fromEntries(
        rest.map((kv) => kv.split(':')).filter((p) => p.length === 2)
      );
      return { serial, state, model: info.model, device: info.device };
    });
}

// Lê uma propriedade do sistema (ex.: ro.product.model).
async function getProp(serial, prop) {
  return adb(['-s', serial, 'shell', 'getprop', prop]);
}

// Identifica o aparelho com infos amigáveis para a aba central.
async function describeDevice(serial) {
  const [model, brand, android, sdk, battery] = await Promise.all([
    getProp(serial, 'ro.product.model'),
    getProp(serial, 'ro.product.brand'),
    getProp(serial, 'ro.build.version.release'),
    getProp(serial, 'ro.build.version.sdk'),
    adb(['-s', serial, 'shell', 'dumpsys', 'battery']).catch(() => ''),
  ]);
  const levelMatch = /level:\s*(\d+)/.exec(battery);
  // DeX está presente em Galaxy S/Note/A de gama média pra cima.
  const dexSupport = /samsung/i.test(brand);
  return {
    serial,
    model,
    brand,
    android,
    sdk: Number(sdk),
    battery: levelMatch ? Number(levelMatch[1]) : null,
    dexSupport,
  };
}

// Desabilita (uninstall por usuário) um pacote. Reversível por reset de fábrica.
async function removePackage(serial, pkg) {
  return adb(['-s', serial, 'shell', 'pm', 'uninstall', '-k', '--user', '0', pkg]);
}

// Reabilita um pacote previamente removido por usuário.
async function restorePackage(serial, pkg) {
  return adb(['-s', serial, 'shell', 'cmd', 'package', 'install-existing', pkg]);
}

// Instala um APK a partir de um caminho local.
async function installApk(serial, apkPath) {
  return adb(['-s', serial, 'install', '-r', apkPath], { timeout: 180000 });
}

// Instala múltiplos APKs (split APKs de pacotes .apkm / .xapk).
async function installMultiple(serial, apkPaths) {
  return adb(['-s', serial, 'install-multiple', '-r', ...apkPaths], { timeout: 300000 });
}

// Remove completamente um pacote do dispositivo (apaga dados).
// Diferente de removePackage, que é um user-uninstall reversível.
// Usado para resolver conflito de assinatura antes de reinstalar.
async function uninstallPackage(serial, pkg) {
  return adb(['-s', serial, 'uninstall', pkg], { timeout: 60000 });
}

// Aplica uma configuração via settings put (namespace: system|secure|global).
async function putSetting(serial, namespace, key, value) {
  return adb(['-s', serial, 'shell', 'settings', 'put', namespace, key, String(value)]);
}

// Lê uma configuração de volta. Retorna a string crua ('null' se não existe).
async function getSetting(serial, namespace, key) {
  return adb(['-s', serial, 'shell', 'settings', 'get', namespace, key]);
}

// Escreve E confirma: muitos settings em secure/global falham SILENCIOSAMENTE
// (o put retorna sem erro mas nada muda, por falta de WRITE_SECURE_SETTINGS).
// Aqui lemos o valor de volta e só consideramos sucesso se bateu.
async function putSettingVerified(serial, namespace, key, value) {
  await putSetting(serial, namespace, key, value);
  const readBack = (await getSetting(serial, namespace, key)).trim();
  if (readBack !== String(value)) {
    throw new Error(`Sistema não aceitou a alteração (${key}). Pode exigir permissão extra neste aparelho.`);
  }
  return readBack;
}

// Define o launcher padrão (tela inicial) pelo nome do pacote.
async function setHomeActivity(serial, pkg) {
  return adb(['-s', serial, 'shell', 'cmd', 'package', 'set-home-activity', pkg]);
}

// Descobre qual é o launcher (home) padrão atual. Usado para registrar o
// estado antes de trocar, para conseguir reverter depois.
async function getCurrentHome(serial) {
  // 'cmd shortcut get-default-launcher' nem sempre existe; resolvemos pela
  // consulta de qual app responde à categoria HOME como preferido.
  try {
    const out = await adb(['-s', serial, 'shell', 'cmd', 'package', 'resolve-activity', '-c', 'android.intent.category.HOME', '--brief']);
    // A saída traz algo como "com.sec.android.app.launcher/.Home" na 2ª linha.
    const line = out.split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';
    const pkg = line.split('/')[0];
    return pkg && pkg.includes('.') ? pkg : null;
  } catch {
    return null;
  }
}

// Apaga uma configuração, fazendo o sistema voltar ao padrão dela. Usado na
// reversão quando a chave não existia antes da nossa alteração.
async function deleteSetting(serial, namespace, key) {
  return adb(['-s', serial, 'shell', 'settings', 'delete', namespace, key]);
}

// Força a rotação do display, fazendo TODOS os apps respeitarem a orientação
// do usuário em vez de cada um impor a sua. enabled=true força; false libera.
//
// O nome do comando MUDOU entre versões do Android:
//   - Android 12+ (inclui o One UI do S21 FE): wm fixed-to-user-rotation
//   - Versões mais antigas:                    wm set-fix-to-user-rotation
// Tentamos a forma nova primeiro; se o aparelho não a reconhecer, caímos para
// a antiga. Assim funciona nos dois casos.
async function setFixToUserRotation(serial, enabled) {
  const arg = enabled ? 'enabled' : 'disabled';
  try {
    return await adb(['-s', serial, 'shell', 'wm', 'fixed-to-user-rotation', arg]);
  } catch (e1) {
    try {
      return await adb(['-s', serial, 'shell', 'wm', 'set-fix-to-user-rotation', arg]);
    } catch (e2) {
      throw new Error('forçar-rotação-indisponível');
    }
  }
}

// Define o tamanho/resolução do display. Sem args reseta para o padrão.
async function setDisplaySize(serial, width, height) {
  if (width == null || height == null) {
    return adb(['-s', serial, 'shell', 'wm', 'size', 'reset']);
  }
  return adb(['-s', serial, 'shell', 'wm', 'size', `${width}x${height}`]);
}

// Lê o tamanho atual do display (para registrar antes de mudar, e reverter).
async function getDisplaySize(serial) {
  const out = await adb(['-s', serial, 'shell', 'wm', 'size']);
  const phys = /Physical size:\s*(\d+x\d+)/.exec(out);
  const over = /Override size:\s*(\d+x\d+)/.exec(out);
  return { physical: phys ? phys[1] : null, override: over ? over[1] : null };
}

// Confirma se um pacote existe no aparelho.
async function hasPackage(serial, pkg) {
  const out = await adb(['-s', serial, 'shell', 'pm', 'list', 'packages', pkg]);
  return out.includes(`package:${pkg}`);
}

module.exports = {
  adb,
  adbPath,
  listDevices,
  describeDevice,
  removePackage,
  restorePackage,
  installApk,
  installMultiple,
  uninstallPackage,
  putSetting,
  getSetting,
  putSettingVerified,
  setHomeActivity,
  getCurrentHome,
  deleteSetting,
  hasPackage,
  setFixToUserRotation,
  setDisplaySize,
  getDisplaySize,
};
