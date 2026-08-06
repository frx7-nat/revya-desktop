// src/main/runner.js
// Traduz uma task do catálogo em chamadas ADB concretas.
// Roda no processo main (acesso a child_process).

const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const crypto = require('crypto');
const { execFile } = require('child_process');
const adb = require('../adb/adb');
const { t } = require('../i18n/runtime.cjs');

// Hash SHA-256 de um arquivo, para conferir a integridade de APKs baixados.
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

// Baixa um APK de uma URL para uma pasta temporária e devolve o caminho local.
// Segue redirecionamentos simples (302), comuns em repositórios de APK.
function downloadApk(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Muitos redirecionamentos'));
    const dest = path.join(os.tmpdir(), `revya-${Date.now()}.apk`);
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
      // Aspas simples nos caminhos (ex.: nome de usuário com apóstrofo)
      // quebrariam o comando do PowerShell; dobrá-las é o escape correto.
      const q = (s) => String(s).replace(/'/g, "''");
      execFile('powershell', [
        '-NoProfile', '-Command',
        `Expand-Archive -LiteralPath '${q(zipPath)}' -DestinationPath '${q(destDir)}' -Force`,
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
async function installBundled(serial, archivePath, { signal } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'revya-'));
  try {
    await extractZip(archivePath, tmpDir);
    const apks = findApks(tmpDir);
    if (apks.length === 0) throw new Error(t('runner.error.noApkInBundle'));
    if (apks.length === 1) {
      await adb.installApk(serial, apks[0], { signal });
    } else {
      await adb.installMultiple(serial, apks, { signal });
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Instala um arquivo local no aparelho, seja .apk simples ou pacote
// .apkm/.xapk. Desativa o verificador de pacotes (Play Protect para ADB) SÓ
// durante a instalação, guardando o valor anterior para restaurar ao final —
// não deixamos uma proteção do sistema desligada permanentemente.
//
// Caminho ÚNICO de instalação do programa: usado tanto pela task do catálogo
// (o launcher) quanto pelo arrastar-e-soltar de um APK do usuário. Os dois
// merecem o mesmo tratamento — inclusive a tradução dos erros do Android para
// os códigos que a interface sabe explicar.
async function installApkFile(serial, apkPath, { signal } = {}) {
  const prevVerifier = normalizePrev(
    (await adb.getSetting(serial, 'global', 'verifier_verify_adb_installs').catch(() => 'null')).trim()
  );
  await adb.putSetting(serial, 'global', 'verifier_verify_adb_installs', 0).catch(() => {});

  try {
    const ext = path.extname(apkPath).toLowerCase();
    if (ext === '.apkm' || ext === '.xapk') {
      await installBundled(serial, apkPath, { signal });
    } else {
      await adb.installApk(serial, apkPath, { signal });
    }
  } catch (e) {
    if (e.message.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
      throw new Error('ALREADY_INSTALLED:');
    }
    if (e.message.includes('INSTALL_FAILED_VERIFICATION_FAILURE')) {
      throw new Error('VERIFICATION_FAILURE:');
    }
    throw e;
  } finally {
    if (prevVerifier === null) {
      await adb.deleteSetting(serial, 'global', 'verifier_verify_adb_installs').catch(() => {});
    } else {
      await adb.putSetting(serial, 'global', 'verifier_verify_adb_installs', prevVerifier).catch(() => {});
    }
  }
}

// Pasta onde os APKs ficam empacotados.
function apkDir() {
  return process.resourcesPath && !process.defaultApp
    ? path.join(process.resourcesPath, 'apks')
    : path.join(__dirname, '..', '..', 'apks');
}

// Dpi padrão de TV pareado com a resolução (pela menor dimensão do painel):
// 1080p→320, 1440p→480, 4K→640 — os mesmos valores das tasks de resolução.
const TV_DENSITY_BY_MIN_DIM = { 1080: 320, 1440: 480, 2160: 640 };

// Launcher nativo do modo celular (One UI Home). O launcher padrão segue um
// mapeamento FIXO por modo: modo TV = launcher do catálogo (task.pkg), modo
// celular = este. Sem essa âncora, uma volta ao celular que falhasse deixaria
// o launcher de TV registrado como "launcher do celular", e a alternância
// nunca mais sairia dele.
const PHONE_HOME_PKG = 'com.sec.android.app.launcher';

// Trocar o launcher PADRÃO não troca quem está NA TELA: o launcher antigo
// continua visível até alguém apertar Início. Este helper dá esse toque pelo
// ADB e CONFERE o resultado lendo o app em primeiro plano, repetindo algumas
// vezes (poucos segundos no pior caso) — a alternância de modos termina com o
// launcher certo aberto, sem o usuário precisar pegar o aparelho.
// Se o aparelho não expõe o primeiro plano (leitura null), toca Início 2x às
// cegas e assume sucesso — o toque em Início é inofensivo.
const KEYCODE_HOME = 3;
const KEYCODE_WAKEUP = 224;

// Prepara a TELA para uma alternância: acorda o display se estiver dormindo e
// dispensa a tela de bloqueio quando não há senha. Com senha, o sistema mostra
// a tela de desbloqueio — devolvemos o obstáculo para a interface PERGUNTAR
// (desbloquear é decisão do usuário; segurança não se contorna por ADB).
// Leituras indisponíveis não travam o fluxo: sem informação, seguimos.
async function ensureScreenReady(serial) {
  const state = await adb.getScreenState(serial);
  if (state === 'asleep') {
    await adb.sendKeyEvent(serial, KEYCODE_WAKEUP).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
  }
  let locked = await adb.isKeyguardShowing(serial);
  if (locked) {
    await adb.dismissKeyguard(serial).catch(() => {});
    await new Promise((r) => setTimeout(r, 900));
    locked = await adb.isKeyguardShowing(serial);
    if (locked) {
      return {
        ok: false,
        obstacle: 'locked',
        message: t('runner.locked'),
      };
    }
  }
  return { ok: true };
}

async function ensureHomeOnScreen(serial, pkg) {
  let fg = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    fg = await adb.getForegroundPackage(serial).catch(() => null);
    if (fg === pkg) return true;
    await adb.sendKeyEvent(serial, KEYCODE_HOME).catch(() => {});
    await new Promise((r) => setTimeout(r, 900));
    if (fg === null && attempt >= 1) break; // sem leitura: 2 toques bastam
  }
  fg = await adb.getForegroundPackage(serial).catch(() => null);
  return fg === null || fg === pkg;
}

// Calcula o dpi alvo de uma task 'density' a partir da resolução ATUAL do
// aparelho (override, se houver; senão a física). mode 'default' usa o dpi
// pareado; 'small' aplica 20% a menos (elementos menores = mais conteúdo na
// tela) e 'large' 20% a mais (elementos maiores = leitura mais fácil de longe).
async function densityTarget(serial, mode) {
  const size = await adb.getDisplaySize(serial);
  const current = size.override || size.physical || '';
  const dims = current.split('x').map(Number).filter((n) => Number.isFinite(n));
  const base = dims.length === 2 ? TV_DENSITY_BY_MIN_DIM[Math.min(...dims)] : undefined;
  if (!base) {
    throw new Error(t('runner.error.needResolution'));
  }
  if (mode === 'small') return Math.round(base * 0.8);
  if (mode === 'large') return Math.round(base * 1.2);
  return base;
}

async function runTask(serial, task) {
  switch (task.kind) {
    case 'remove': {
      const results = [];
      try {
        for (const pkg of task.pkgs) {
          // Só tenta remover o que existe — evita ruído de erro em aparelhos
          // que já não traziam aquele app.
          if (await adb.hasPackage(serial, pkg)) {
            await adb.removePackage(serial, pkg);
            results.push(pkg);
          }
        }
      } catch (e) {
        // Falha no meio da lista: os pacotes já removidos precisam continuar
        // reversíveis. Anexa a reversão parcial ao erro; o main a persiste.
        if (results.length) {
          e.partialRevert = { kind: 'restore-many', pkgs: results };
        }
        throw e;
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
      if (!src) throw new Error(t('runner.error.noApkSource'));

      // ATUALIZAÇÃO POR versionCode.
      // Só vale para app que embarcamos e cuja versão conhecemos: a task
      // declara `minVersionCode` (hoje, o launcher Revya TV). Sem esse
      // campo o comportamento é o de sempre — instala/reinstala.
      //
      // Existir não basta como critério: um aparelho já provisionado tem o
      // launcher instalado e ficaria preso na versão antiga para sempre. Aqui
      // comparamos com o que está no aparelho e só reinstalamos se o nosso for
      // mais novo. Se for igual ou mais velho, não encostamos no aparelho.
      const jaInstalado = task.pkg ? await adb.hasPackage(serial, task.pkg) : false;
      if (jaInstalado && task.minVersionCode) {
        const atual = await adb.getVersionCode(serial, task.pkg);
        if (atual !== null && atual >= task.minVersionCode) {
          // Nada a fazer — e nada a reverter: não fomos nós que instalamos.
          return { detail: t('runner.alreadyUpdated', { version: atual }), revert: null };
        }
      }

      if (src.type === 'local') {
        // src.dir é a subpasta de categoria (ex.: 'launchers'); opcional.
        apkPath = src.dir
          ? path.join(apkDir(), src.dir, src.apk)
          : path.join(apkDir(), src.apk);
        if (!fs.existsSync(apkPath)) {
          throw new Error(t('runner.error.apkNotFound', { path: `${src.dir ? src.dir + '/' : ''}${src.apk}` }));
        }
      } else if (src.type === 'url') {
        // Baixa o APK do repositório para uma pasta temporária e instala.
        // Se a task traz um sha256 esperado, o arquivo é conferido antes de
        // tocar no aparelho — proteção contra download corrompido/adulterado.
        apkPath = await downloadApk(src.url);
        if (src.sha256) {
          const got = await sha256File(apkPath);
          if (got.toLowerCase() !== String(src.sha256).toLowerCase()) {
            fs.unlink(apkPath, () => {});
            throw new Error(t('runner.error.checksumMismatch'));
          }
        }
      } else {
        throw new Error(t('runner.error.unknownSource', { type: src.type }));
      }

      await installApkFile(serial, apkPath);

      // Reverter instalação = desinstalar o app que ADICIONAMOS. Se o app já
      // estava no aparelho e nós só o atualizamos, desinstalar seria remover
      // algo que não era nosso — e, no caso do launcher, deixaria o aparelho
      // sem tela inicial. Atualização não gera reversão.
      const revert = (task.pkg && !jaInstalado) ? { kind: 'uninstall', pkg: task.pkg } : null;
      return { detail: t(jaInstalado ? 'runner.updated' : 'runner.installed'), revert };
    }
    case 'setting': {
      // Captura o valor anterior ANTES de escrever, para poder reverter.
      const prev = (await adb.getSetting(serial, task.ns, task.key)).trim();
      // Escreve e confirma lendo de volta (evita falha silenciosa).
      await adb.putSettingVerified(serial, task.ns, task.key, task.value);
      return {
        detail: t('runner.applied'),
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
          const err = new Error(`${applied.length}/${task.keys.length} aplicadas. Falhou em ${key}: ${e.message}`);
          // As chaves já aplicadas precisam continuar reversíveis mesmo com a
          // task falhando. Anexa a reversão parcial ao erro; o main a persiste.
          if (prevs.length) {
            err.partialRevert = { kind: 'settings', ns: task.ns, keys: prevs };
          }
          throw err;
        }
      }
      return {
        detail: t('runner.appliedCount', { n: applied.length }),
        revert: { kind: 'settings', ns: task.ns, keys: prevs },
      };
    }
    case 'home': {
      if (!task.pkg) {
        throw new Error(t('runner.error.noLauncherPkg'));
      }
      if (!(await adb.hasPackage(serial, task.pkg))) {
        throw new Error(t('runner.error.launcherNotInstalled'));
      }
      const prevHome = await adb.getCurrentHome(serial);
      await adb.setHomeActivity(serial, task.pkg);
      // VERIFICA se realmente virou padrão (em alguns Galaxy não pega de 1ª).
      const nowHome = await adb.getCurrentHome(serial);
      if (nowHome && !nowHome.includes(task.pkg)) {
        throw new Error(t('runner.error.launcherKept'));
      }
      // Traz o launcher de TV para a TELA: sem este toque em Início, o
      // launcher do celular continuaria visível por cima até um toque manual.
      const onScreen = await ensureHomeOnScreen(serial, task.pkg);
      // O modo celular volta ao launcher que ESTAVA ativo antes da troca —
      // respeitando launchers de terceiros (mako, Nova, Niagara, etc.). O One
      // UI Home entra só como ÂNCORA de segurança: quando o "anterior" não é
      // legível, ou é o próprio launcher de TV (sobra de uma volta que falhou),
      // caso em que restaurá-lo grudaria a alternância no launcher de TV.
      const phoneHome = (prevHome && prevHome !== task.pkg)
        ? prevHome
        : ((await adb.hasPackage(serial, PHONE_HOME_PKG)) ? PHONE_HOME_PKG : null);
      return {
        detail: onScreen
          ? t('runner.homeSet')
          : t('runner.homeSetTapHome'),
        revert: phoneHome ? { kind: 'home', prev: phoneHome } : null,
      };
    }
    case 'rotate': {
      // Força paisagem de verdade: trava rotação + define paisagem + obriga
      // todos os apps a respeitarem (fixed-to-user-rotation).
      const prevAccel = (await adb.getSetting(serial, 'system', 'accelerometer_rotation')).trim();
      const prevRot = (await adb.getSetting(serial, 'system', 'user_rotation')).trim();
      // Se a task traz uma rotação EXPLÍCITA (0–3), ela tem precedência: é a
      // posição que o usuário encontrou girando a tela até funcionar (botão
      // "Girar tela"), salva no perfil TV — o snapshot da alternância de
      // modos a preserva, e cada ativação do modo TV volta exatamente a ela.
      // Sem rotação explícita, o ALVO depende do formato ATUAL do display:
      // com uma resolução de TV já aplicada (override paisagem, ex.:
      // 3840x2160), a orientação natural do display JÁ é deitada —
      // user_rotation=1 giraria 90° e deixaria a tela EM PÉ (foi o que
      // acontecia no "Corrigir agora"). Sem override, o painel do celular é
      // em pé e 1 = 90° = paisagem. A heurística acerta na maioria dos
      // aparelhos; nos que ela erra, o usuário corrige girando — e a posição
      // certa vira a explícita daí em diante.
      let target = 1;
      if (Number.isInteger(task.rotation) && task.rotation >= 0 && task.rotation <= 3) {
        target = task.rotation;
      } else {
        try {
          const size = await adb.getDisplaySize(serial);
          const dims = (size.override || '').split('x').map(Number);
          if (dims.length === 2 && dims.every(Number.isFinite) && dims[0] > dims[1]) target = 0;
        } catch { /* sem leitura: mantém o padrão do painel em pé */ }
      }
      await adb.putSetting(serial, 'system', 'accelerometer_rotation', 0);
      await adb.putSetting(serial, 'system', 'user_rotation', target);
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
          ? t('runner.landscapeForced')
          : t('runner.landscapeApplied'),
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
      const revert = { kind: 'wmsize', hadOverride: !!before.override, override: before.override };
      // Densidade pareada (dpi de TV para a resolução escolhida): interface na
      // escala certa para ver do sofá. Registrada na mesma entrada de reversão.
      // Entradas antigas não têm os campos de densidade — a reversão detecta
      // pela ausência e não mexe no dpi nesses casos.
      if (task.density) {
        const beforeDensity = await adb.getDisplayDensity(serial);
        await adb.setDisplayDensity(serial, task.density);
        revert.hadDensity = !!beforeDensity.override;
        revert.density = beforeDensity.override;
      }
      return {
        detail: task.density
          ? t('runner.resolutionWithDensity', { w: task.width, h: task.height, dpi: task.density })
          : t('runner.resolution', { w: task.width, h: task.height }),
        revert,
      };
    }
    case 'density': {
      // Tamanho da interface: dpi calculado a partir da resolução atual
      // (padrão de TV ou 20% menor). Se a task traz um dpi explícito (snapshot
      // do modo TV personalizado pelo usuário), ele tem precedência.
      // Guarda o dpi anterior para reverter.
      const target = task.dpi || (await densityTarget(serial, task.mode));
      const before = await adb.getDisplayDensity(serial);
      await adb.setDisplayDensity(serial, target);
      return {
        detail: t('runner.densityApplied', { dpi: target }),
        revert: { kind: 'density', hadDensity: !!before.override, density: before.override },
      };
    }
    case 'dnd': {
      // Ativa o Não Perturbe em modo prioridade (alarmes e chamadas marcadas
      // como favoritas ainda passam). O estado anterior vem do zen_mode.
      const prev = normalizePrev((await adb.getSetting(serial, 'global', 'zen_mode')).trim());
      await adb.setDnd(serial, 'priority');
      // Confirma lendo o zen_mode de volta — em Android antigo o subcomando
      // pode não existir e falhar silenciosamente.
      const now = (await adb.getSetting(serial, 'global', 'zen_mode')).trim();
      if (now === '0' || now === '' || now === 'null') {
        throw new Error(t('runner.error.dndFailed'));
      }
      return { detail: t('runner.dndOn'), revert: { kind: 'dnd', prev } };
    }
    default:
      throw new Error(t('runner.error.unknownTaskKind', { kind: task.kind }));
  }
}

// Normaliza o retorno do 'settings get': quando a chave não existe, o ADB
// devolve a string 'null'. Guardamos isso como null de verdade, para na
// reversão sabermos que a chave deve ser APAGADA (e não reescrita com "null").
function normalizePrev(raw) {
  return (raw === 'null' || raw === '') ? null : raw;
}

// Kinds de reversão que o revertEntry sabe desfazer — a FONTE ÚNICA da
// allowlist. O import de registro valida contra ela para nunca aceitar um kind
// órfão (que só quebraria mais tarde, numa reversão). Manter em sincronia com
// o switch do revertEntry abaixo.
const REVERT_KINDS = new Set([
  'restore', 'restore-many', 'uninstall', 'setting', 'settings',
  'home', 'rotate', 'wmsize', 'density', 'dnd',
]);

// Reverte uma entrada previamente registrada. Retorna texto do resultado.
// Lança erro se não conseguir (o chamador trata item a item).
async function revertEntry(serial, entry) {
  const r = entry.revert;
  if (!r) throw new Error(t('runner.error.noRevertInfo'));

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
      if (fail.length) throw new Error(t('runner.error.partialReactivate', { ok: ok.length, total: r.pkgs.length }));
      return t('runner.reactivated', { n: ok.length });
    }
    case 'uninstall': {
      // App que NÓS instalamos: desinstalação completa (adb uninstall).
      // Não usar removePackage aqui — o 'pm uninstall -k --user 0' dele é
      // para apps de sistema; em apps instalados por nós o Android recusa
      // o -k e a reversão falharia.
      await adb.uninstallPackage(serial, r.pkg);
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
      // Restaura o launcher do celular e CONFERE o resultado: em alguns
      // Galaxy o set-home-activity falha em silêncio — sem a conferência, o
      // launcher de TV continuaria como padrão no modo celular sem aviso.
      for (let attempt = 0; attempt < 2; attempt++) {
        await adb.setHomeActivity(serial, r.prev);
        const now = await adb.getCurrentHome(serial);
        if (!now || now.includes(r.prev)) {
          // Traz o launcher do celular para a TELA — sem este toque em
          // Início, o launcher de TV continuaria visível por cima.
          const onScreen = await ensureHomeOnScreen(serial, r.prev);
          return onScreen
            ? t('runner.launcherRestored')
            : t('runner.launcherRestoredTapHome');
        }
      }
      throw new Error(t('runner.error.launcherKeptTv'));
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
      return t('runner.rotationRestored');
    }
    case 'wmsize': {
      if (r.hadOverride && r.override) {
        const [w, h] = r.override.split('x');
        await adb.setDisplaySize(serial, Number(w), Number(h));
      } else {
        await adb.setDisplaySize(serial, null, null);
      }
      // Só restaura a densidade se esta entrada a alterou (campo presente).
      if (r.hadDensity !== undefined) {
        if (r.hadDensity && r.density) await adb.setDisplayDensity(serial, r.density);
        else await adb.setDisplayDensity(serial, null);
      }
      return t('runner.resolutionRestored');
    }
    case 'density': {
      // Restaura o dpi anterior (ou o padrão de fábrica, se não havia override).
      if (r.hadDensity && r.density) await adb.setDisplayDensity(serial, r.density);
      else await adb.setDisplayDensity(serial, null);
      return 'Tamanho da interface restaurado';
    }
    case 'dnd': {
      // Restaura o modo anterior do Não Perturbe a partir do zen_mode salvo.
      const map = { 1: 'priority', 2: 'none', 3: 'alarms' };
      await adb.setDnd(serial, map[r.prev] || 'off');
      return t('runner.dndRestored');
    }
    default:
      throw new Error(t('runner.error.unknownRevertKind', { kind: r.kind }));
  }
}

// Leitura com ASSENTAMENTO para os kinds que re-layoutam (density/wmsize): o
// One UI pode levar um instante para assentar o novo layout, e uma leitura
// única logo após a troca pega um valor intermediário — falso "não confirmou".
// Relê até estabilizar. O custo (a espera) é pago SÓ quando a 1ª leitura
// diverge do esperado — no caminho feliz é leitura única, sem atraso.
//
// PACIÊNCIA AMPLIADA em 29/07/2026 (era `retries: 2, settleMs: 700` = ~1,4 s).
//
// Medido no roteiro da Fase 0: a conferência pós-troca acusava divergência
// FALSA em 3 de 4 trocas — S21 FE por cabo (7/8), S23 Ultra por cabo (8/9) e
// S23 por Wi-Fi (8/9). Nas três, rodar a MESMA `verifyTask` minutos depois dava
// tudo OK, sem ninguém tocar no aparelho.
//
// A quarta medição é a que explica: quando a resolução foi aplicada ISOLADA
// (na retomada de uma troca interrompida), a conferência passou 9/9. Ou seja,
// o override de 4K com densidade pareada assenta em mais de 1,4 s quando
// disputa o aparelho com o resto da fila.
//
// O efeito era o usuário leigo ver "use Corrigir agora" e reexecutar operação
// que já estava certa — e passar a desconfiar do diagnóstico do próprio app.
//
// ~4,5 s cobrem o observado com folga. O custo continua sendo pago só quando a
// leitura diverge: no caminho feliz nada muda.
async function confirmStable(readFn, isOk, { retries = 4, settleMs = 900 } = {}) {
  let value = await readFn();
  if (isOk(value)) return { value, ok: true };
  for (let i = 0; i < retries; i++) {
    await new Promise((r) => setTimeout(r, settleMs));
    value = await readFn();
    if (isOk(value)) return { value, ok: true };
  }
  return { value, ok: false };
}

// Verifica, SEM alterar nada, se o efeito de uma task continua valendo no
// aparelho — atualizações do One UI e reinícios às vezes desfazem ajustes.
// Retorna { ok, detail? } para o check-up da UI mostrar o que se perdeu.
async function verifyTask(serial, task) {
  switch (task.kind) {
    case 'remove': {
      const back = [];
      for (const pkg of task.pkgs) {
        if (await adb.hasPackage(serial, pkg)) back.push(pkg);
      }
      return back.length
        ? { ok: false, detail: t('runner.verify.appsBack', { back: back.length, total: task.pkgs.length }) }
        : { ok: true };
    }
    case 'install': {
      if (!task.pkg) return { ok: true, detail: t('runner.verify.noPackage') };
      if (!(await adb.hasPackage(serial, task.pkg))) {
        return { ok: false, detail: t('runner.verify.notInstalled') };
      }
      // Para o app que embarcamos, "instalado" não basta: uma versão velha
      // presa no aparelho é uma falha de check-up, não um sucesso.
      if (task.minVersionCode) {
        const atual = await adb.getVersionCode(serial, task.pkg);
        if (atual !== null && atual < task.minVersionCode) {
          return { ok: false, detail: t('runner.verify.outdated', { version: atual }) };
        }
      }
      return { ok: true };
    }
    case 'setting': {
      const cur = (await adb.getSetting(serial, task.ns, task.key)).trim();
      return cur === String(task.value)
        ? { ok: true }
        : { ok: false, detail: t('runner.verify.currentValue', { value: cur || t('runner.empty') }) };
    }
    case 'settings': {
      for (const { key, value } of task.keys) {
        const cur = (await adb.getSetting(serial, task.ns, key)).trim();
        if (cur !== String(value)) {
          return { ok: false, detail: t('runner.verify.keyChanged', { key, value: cur || t('runner.emptyShort') }) };
        }
      }
      return { ok: true };
    }
    case 'home': {
      const home = await adb.getCurrentHome(serial);
      if (home && home.includes(task.pkg)) return { ok: true };
      // Leitura indisponível (logo após a troca o sistema pode devolver o
      // seletor em vez de um launcher): confere quem está NA TELA — se o
      // launcher esperado está em primeiro plano, o efeito real está valendo.
      if (!home) {
        const fg = await adb.getForegroundPackage(serial).catch(() => null);
        if (fg === task.pkg) return { ok: true, detail: t('runner.verify.confirmedOnScreen') };
      }
      return { ok: false, detail: t('runner.verify.currentLauncher', { launcher: home || t('runner.unknown') }) };
    }
    case 'rotate': {
      const accel = (await adb.getSetting(serial, 'system', 'accelerometer_rotation')).trim();
      if (accel !== '0') return { ok: false, detail: t('runner.verify.autoRotateBack') };
      const rot = (await adb.getSetting(serial, 'system', 'user_rotation')).trim();
      // Perfil com rotação EXPLÍCITA (posição escolhida pelo usuário girando
      // a tela): confere contra ela. Chave ausente/vazia equivale a 0.
      if (Number.isInteger(task.rotation) && task.rotation >= 0 && task.rotation <= 3) {
        const okExplicit = rot === String(task.rotation)
          || (task.rotation === 0 && (rot === '' || rot === 'null'));
        return okExplicit ? { ok: true } : { ok: false, detail: t('runner.verify.rotationChanged') };
      }
      // Sem rotação explícita, o valor CERTO depende do formato atual do
      // display (mesma regra da aplicação): com resolução de TV (override
      // paisagem), a orientação natural já é deitada — 0 é paisagem, e 1/3
      // deixariam a tela EM PÉ (o sistema também reseta para 0 sozinho ao
      // trocar o display, sem a tela mudar: não é divergência). Painel em
      // pé: 90°/270° = paisagem.
      const size = await adb.getDisplaySize(serial);
      const dims = (size.override || '').split('x').map(Number);
      const landscapeNatural = dims.length === 2 && dims.every(Number.isFinite) && dims[0] > dims[1];
      const okRot = landscapeNatural
        ? (rot === '0' || rot === '' || rot === 'null')
        : (rot === '1' || rot === '3');
      return okRot ? { ok: true } : { ok: false, detail: t('runner.verify.rotationChanged') };
    }
    case 'wmsize': {
      // Aceita as dimensões trocadas (1080x1920): com a rotação travada em
      // 90°, o mesmo override pode ser lido girado — não é uma divergência.
      // Leitura com assentamento (o override re-layouta).
      const sizeOk = (s) => s.override === `${task.width}x${task.height}`
        || s.override === `${task.height}x${task.width}`;
      const sr = await confirmStable(() => adb.getDisplaySize(serial), sizeOk);
      if (!sr.ok) {
        return { ok: false, detail: t('runner.verify.currentResolution', { value: sr.value.override || sr.value.physical || '?' }) };
      }
      if (task.density) {
        const dr = await confirmStable(
          () => adb.getDisplayDensity(serial),
          (d) => d.override === task.density
        );
        if (!dr.ok) {
          return { ok: false, detail: t('runner.verify.currentDensity', { value: dr.value.override || dr.value.physical || '?' }) };
        }
      }
      return { ok: true };
    }
    case 'density': {
      let target = task.dpi;
      if (!target) {
        try {
          target = await densityTarget(serial, task.mode);
        } catch {
          return { ok: false, detail: t('runner.verify.noTvResolution') };
        }
      }
      // Assentamento: o dpi re-layouta; relê se a 1ª leitura divergir.
      const res = await confirmStable(
        () => adb.getDisplayDensity(serial),
        (d) => d.override === target
      );
      return res.ok
        ? { ok: true }
        : { ok: false, detail: t('runner.verify.currentDensity', { value: res.value.override || res.value.physical || '?' }) };
    }
    case 'dnd': {
      const zen = (await adb.getSetting(serial, 'global', 'zen_mode')).trim();
      return zen !== '0' && zen !== 'null' && zen !== ''
        ? { ok: true }
        : { ok: false, detail: t('runner.verify.dndOff') };
    }
    default:
      return { ok: true, detail: t('runner.verify.noCheck') };
  }
}

// Confere, SEM alterar nada, se um estado de reversão está valendo no
// aparelho — o espelho do verifyTask para a direção TV → celular: enquanto o
// verifyTask confere o perfil TV aplicado, este confere se os valores de
// CELULAR (phoneRevert/revert) foram de fato restaurados. É a segunda ponta
// da conferência final da alternância de modos.
async function verifyRevert(serial, revert) {
  switch (revert.kind) {
    case 'setting': {
      const cur = normalizePrev((await adb.getSetting(serial, revert.ns, revert.key)).trim());
      return cur === revert.prev
        ? { ok: true }
        : { ok: false, detail: t('runner.verify.currentValue', { value: cur ?? t('runner.empty') }) };
    }
    case 'settings': {
      for (const { key, prev } of revert.keys) {
        const cur = normalizePrev((await adb.getSetting(serial, revert.ns, key)).trim());
        if (cur !== prev) {
          return { ok: false, detail: t('runner.revertVerify.keyNotBack', { key, value: cur ?? t('runner.emptyShort') }) };
        }
      }
      return { ok: true };
    }
    case 'home': {
      const home = await adb.getCurrentHome(serial);
      return !home || home.includes(revert.prev)
        ? { ok: true }
        : { ok: false, detail: t('runner.verify.currentLauncher', { launcher: home }) };
    }
    case 'rotate': {
      const accel = normalizePrev((await adb.getSetting(serial, 'system', 'accelerometer_rotation')).trim());
      const rot = normalizePrev((await adb.getSetting(serial, 'system', 'user_rotation')).trim());
      return accel === revert.accel && rot === revert.rot
        ? { ok: true }
        : { ok: false, detail: t('runner.revertVerify.rotationNotBack') };
    }
    case 'wmsize': {
      const want = revert.hadOverride && revert.override ? revert.override : null;
      // Tolera dimensões trocadas (leitura com a tela girada), como o verifyTask.
      // Leitura com assentamento (o override re-layouta).
      const sameSize = (size) => {
        const cur = size.override || null;
        return want === cur
          || (!!want && !!cur && want.split('x').sort().join() === cur.split('x').sort().join());
      };
      const sr = await confirmStable(() => adb.getDisplaySize(serial), sameSize);
      if (!sr.ok) {
        return { ok: false, detail: t('runner.verify.currentResolution', { value: sr.value.override || sr.value.physical || '?' }) };
      }
      if (revert.hadDensity !== undefined) {
        const wantD = revert.hadDensity && revert.density ? revert.density : null;
        const dr = await confirmStable(
          () => adb.getDisplayDensity(serial),
          (d) => (d.override || null) === wantD
        );
        if (!dr.ok) {
          return { ok: false, detail: t('runner.verify.currentDensity', { value: dr.value.override || dr.value.physical || '?' }) };
        }
      }
      return { ok: true };
    }
    case 'density': {
      const want = revert.hadDensity && revert.density ? revert.density : null;
      // Assentamento: o dpi re-layouta; relê se a 1ª leitura divergir.
      const res = await confirmStable(
        () => adb.getDisplayDensity(serial),
        (d) => (d.override || null) === want
      );
      return res.ok
        ? { ok: true }
        : { ok: false, detail: t('runner.verify.currentDensity', { value: res.value.override || res.value.physical || '?' }) };
    }
    case 'dnd': {
      const zen = (await adb.getSetting(serial, 'global', 'zen_mode')).trim();
      const want = revert.prev == null ? '0' : String(revert.prev);
      return zen === want || (want === '0' && (zen === '' || zen === 'null'))
        ? { ok: true }
        : { ok: false, detail: t('runner.revertVerify.dndNotBack') };
    }
    default:
      return { ok: true, detail: t('runner.revertVerify.noCheck') };
  }
}

// Dpi que o app usa em modo TV: os pareados por resolução (320/480/640) e as
// variações de ±20% do "tamanho da interface" — valores que um celular
// dificilmente teria como override próprio.
const TV_DPI_VALUES = new Set([256, 320, 384, 480, 512, 576, 640, 768]);

// O retrato "de celular" capturado numa ida ao modo TV tem CARA DE TV?
// É a vacina contra a contaminação do phoneRevert (caso do S21 FE em
// 21/07/2026): se uma volta anterior ficou torta no meio, a captura da ida
// seguinte lê valores de TV e os grava como "estado do celular" — e toda
// volta ao celular passa a devolver uma interface torta, para sempre.
// Detectada a cara de TV, o chamador DESCARTA a captura e mantém o
// phoneRevert anterior (ou o estado original) — fontes mais confiáveis que
// uma captura duvidosa. Custo do falso positivo: um valor que o usuário
// legitimamente igualou ao do modo TV volta ao anterior na próxima volta ao
// celular — recuperável ajustando no aparelho; o verdadeiro positivo evita a
// interface torta permanente.
function captureLooksLikeTv(task, revert) {
  if (!task || !revert) return false;
  switch (revert.kind) {
    case 'setting':
      // O "estado do celular" é exatamente o valor que o modo TV aplica.
      return revert.prev != null && String(revert.prev) === String(task.value);
    case 'settings': {
      if (!Array.isArray(revert.keys) || revert.keys.length === 0) return false;
      const tv = new Map((task.keys || []).map((k) => [k.key, String(k.value)]));
      return revert.keys.every((k) => k.prev != null && tv.get(k.key) === String(k.prev));
    }
    case 'wmsize':
      // Celular não tem override de resolução — qualquer um capturado como
      // "estado de celular" é resíduo de TV. (Um override legítimo anterior
      // ao app está preservado em entry.revert, o fallback do chamador.)
      return !!revert.hadOverride;
    case 'density': {
      if (!revert.hadDensity || !revert.density) return false;
      if (task.dpi && revert.density === task.dpi) return true;
      return TV_DPI_VALUES.has(Number(revert.density));
    }
    case 'dnd':
      // zen_mode 1 (prioridade) é o que o modo TV liga.
      return String(revert.prev) === '1';
    default:
      // rotate nunca gera phoneRevert; home já tem âncora própria no runTask.
      return false;
  }
}

// Fotografa o estado ATUAL do aparelho para uma task já aplicada — é o que
// mantém o perfil TV "vivo": se o usuário personalizou ajustes ao longo dos
// dias (outro dpi, outra fonte), a foto vira o novo perfil e a próxima
// ativação do modo TV volta EXATAMENTE para como ele deixou.
//
// Retorna a task atualizada com os valores atuais, ou null quando não há o
// que adotar:
//   - valor igual ao do perfil salvo (nada mudou);
//   - tipo sem captura: dnd é característica fixa do modo TV,
//     remove/install são estruturais (não alternam entre modos), e o launcher
//     padrão (home) é FIXO por modo — TV = launcher de TV, celular = One UI
//     Home — para uma troca manual num modo não vazar para o outro;
//   - mudança com CARA DE RESET do sistema — a chave sumiu, o override de
//     resolução/dpi foi limpo, ou o valor voltou ao estado original pré-modo-TV
//     (originalRevert). Nesses casos o perfil é preservado, para uma
//     atualização do One UI ou um reinício não "contaminar" o modo TV salvo.
// Tipos que o `captureTask` abaixo SABE refotografar. Espelha exatamente os
// `case` do switch — quem acrescentar um caso lá precisa acrescentar aqui.
//
// Serve para responder uma pergunta que o `main.js` precisa fazer: o
// `entry.task` guardado é um PERFIL VIVO ou uma CÓPIA CONGELADA do catálogo?
//
// Para os tipos daqui, é perfil vivo: o usuário personalizou, foi fotografado,
// e o perfil deve vencer o catálogo. Para os demais o `captureTask` sempre
// devolve `null`, então o `entry.task` nunca é atualizado — fica exatamente
// como o catálogo era no dia da primeira aplicação, e vencer o catálogo atual
// é sempre errado.
//
// Foi assim que o `tw-home` de um aparelho provisionado antes de 25/07/2026
// continuou apontando para `com.spocky.projengmenu` depois que o catálogo
// passou a instalar o launcher próprio: o valor congelado ganhava do atual em
// TODA ida ao modo TV, não só na primeira.
const CAPTURABLE_KINDS = new Set(['setting', 'settings', 'wmsize', 'density', 'rotate']);

async function captureTask(serial, task, originalRevert) {
  switch (task.kind) {
    case 'setting': {
      const cur = normalizePrev((await adb.getSetting(serial, task.ns, task.key)).trim());
      if (cur === null || cur === String(task.value)) return null;
      if (originalRevert && originalRevert.kind === 'setting' && cur === originalRevert.prev) return null;
      return { ...task, value: cur };
    }
    case 'settings': {
      const origPrev = new Map(
        originalRevert && originalRevert.kind === 'settings'
          ? originalRevert.keys.map((k) => [k.key, k.prev])
          : []
      );
      let changed = false;
      const nextKeys = [];
      for (const { key, value } of task.keys) {
        const cur = normalizePrev((await adb.getSetting(serial, task.ns, key)).trim());
        if (cur === null || cur === String(value) || (origPrev.has(key) && cur === origPrev.get(key))) {
          nextKeys.push({ key, value });
        } else {
          nextKeys.push({ key, value: cur });
          changed = true;
        }
      }
      return changed ? { ...task, keys: nextKeys } : null;
    }
    case 'wmsize': {
      const size = await adb.getDisplaySize(serial);
      if (!size.override) return null; // resolução resetada pelo sistema: mantém o perfil
      const dims = size.override.split('x').map(Number);
      if (dims.length !== 2 || dims.some((n) => !Number.isFinite(n) || n <= 0)) return null;
      // Com a rotação do modo TV travada em 90°, o mesmo override pode ser
      // LIDO com as dimensões trocadas (1080x1920 em vez de 1920x1080). Isso
      // não é personalização — adotá-lo giraria o modo TV em 90° na próxima
      // ativação. Compara como par de dimensões, ignorando a ordem.
      const sameDims = Math.min(...dims) === Math.min(task.width, task.height)
        && Math.max(...dims) === Math.max(task.width, task.height);
      let next = null;
      if (!sameDims) {
        // Resolução de TV é paisagem por definição: normaliza a leitura para
        // largura ≥ altura, mesmo que tenha sido lida com a tela girada.
        next = { ...task, width: Math.max(...dims), height: Math.min(...dims) };
      }
      if (task.density) {
        const density = await adb.getDisplayDensity(serial);
        if (density.override && density.override !== task.density) {
          next = { ...(next || task), density: density.override };
        }
      }
      return next;
    }
    case 'density': {
      const density = await adb.getDisplayDensity(serial);
      if (!density.override) return null; // dpi resetado pelo sistema: mantém o perfil
      let target;
      try {
        target = task.dpi || (await densityTarget(serial, task.mode));
      } catch {
        return null;
      }
      if (density.override === target) return null;
      return { ...task, dpi: density.override };
    }
    case 'rotate': {
      // A POSIÇÃO da rotação faz parte do perfil TV: se o usuário girou a
      // tela até a posição certa (botão "Girar tela" ou ajuste no aparelho),
      // é para ela que o modo TV deve voltar — não para o alvo da heurística.
      const accel = normalizePrev((await adb.getSetting(serial, 'system', 'accelerometer_rotation')).trim());
      // Rotação automática ligada = estado de celular ou reset do sistema:
      // não é personalização do modo TV — mantém o perfil salvo.
      if (accel !== '0') return null;
      const rotRaw = normalizePrev((await adb.getSetting(serial, 'system', 'user_rotation')).trim());
      const rot = rotRaw === null ? 0 : Number(rotRaw);
      if (!Number.isInteger(rot) || rot < 0 || rot > 3) return null;
      // Valor idêntico ao estado ORIGINAL pré-modo-TV (com a mesma trava):
      // tem cara de reset — preserva o perfil em vez de adotá-lo.
      if (originalRevert && originalRevert.kind === 'rotate'
          && originalRevert.accel === '0' && originalRevert.rot === String(rot)) return null;
      if (task.rotation === rot) return null;
      return { ...task, rotation: rot };
    }
    default:
      return null;
  }
}

module.exports = { runTask, revertEntry, verifyTask, verifyRevert, captureTask, captureLooksLikeTv, ensureScreenReady, installApkFile, REVERT_KINDS, CAPTURABLE_KINDS };
