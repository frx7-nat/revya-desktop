// src/adb/adb.js
// Wrapper em torno do adb.exe empacotado em platform-tools.
// Toda comunicação com o aparelho passa por aqui.

const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { t } = require('../i18n/runtime.cjs');
const { ehSemFio } = require('./serial.js');

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
// Timeout padrão de 20s: comandos comuns (settings/wm/dumpsys) respondem em
// menos de 1s — se estourar, o aparelho travou ou caiu, e é melhor falhar
// rápido e deixar a interface perguntar do que prender o usuário por 1 min.
// Operações longas (instalação, limpeza) passam timeouts próprios.
function adb(args, { timeout = 20000, signal } = {}) {
  return new Promise((resolve, reject) => {
    execFile(adbPath(), args, { timeout, signal }, (err, stdout, stderr) => {
      if (err) {
        // Cancelado pelo usuário (AbortSignal): mensagem padronizada.
        if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
          return reject(new Error('CANCELLED'));
        }
        return reject(new Error(stderr || err.message));
      }
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
      // `wireless` vem resolvido daqui de propósito. Antes o renderer decidia
      // com `serial.includes(':')`, o que rotulava um aparelho da Depuração sem
      // fio (serial mDNS, sem dois-pontos) como "· USB" no seletor — sem cabo
      // nenhum ligado. Regra da casa: lógica de ADB no main, o renderer só
      // renderiza. Ver `serial.js`.
      return { serial, state, model: info.model, device: info.device, wireless: ehSemFio(serial) };
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
    wireless: ehSemFio(serial), // ver a nota em listDevices
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

// Instala um APK a partir de um caminho local. Aceita um AbortSignal para
// permitir o cancelamento pelo usuário (o envio via arrastar-e-soltar usa isso).
async function installApk(serial, apkPath, { signal } = {}) {
  return adb(['-s', serial, 'install', '-r', apkPath], { timeout: 180000, signal });
}

// Instala múltiplos APKs (split APKs de pacotes .apkm / .xapk). Também aceita
// AbortSignal: pacotes soltos na janela são canceláveis como qualquer envio.
async function installMultiple(serial, apkPaths, { signal } = {}) {
  return adb(['-s', serial, 'install-multiple', '-r', ...apkPaths], { timeout: 300000, signal });
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
    throw new Error(t('adb.settingRejected', { key }));
  }
  return readBack;
}

// Define o launcher padrão (tela inicial) pelo nome do pacote.
async function setHomeActivity(serial, pkg) {
  return adb(['-s', serial, 'shell', 'cmd', 'package', 'set-home-activity', pkg]);
}

// Descobre qual é o launcher (home) padrão atual. Usado para registrar o
// estado antes de trocar, para conseguir reverter depois — e na conferência.
// Duas fontes, na ordem: 'cmd shortcut get-default-launcher' (Android 10+,
// a leitura mais direta) e o resolve da categoria HOME. IMPORTANTE: logo
// após uma troca de launcher padrão, o resolve pode devolver o SELETOR do
// sistema ("android/...ResolverActivity") em vez de um launcher — isso não é
// um launcher e vira null (o chamador decide o fallback).
async function getCurrentHome(serial) {
  try {
    const out = await adb(['-s', serial, 'shell', 'cmd', 'shortcut', 'get-default-launcher']);
    const m = /ComponentInfo\{([^/}]+)\//.exec(out);
    if (m && m[1].includes('.')) return m[1];
  } catch { /* comando não existe em Android mais antigo; tenta o resolve */ }
  try {
    const out = await adb(['-s', serial, 'shell', 'cmd', 'package', 'resolve-activity', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.HOME', '--brief']);
    // A saída traz algo como "com.sec.android.app.launcher/.Home" na 2ª linha.
    const line = out.split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';
    const pkg = line.split('/')[0];
    if (pkg && pkg.includes('.') && pkg !== 'android') return pkg;
    return null;
  } catch {
    return null;
  }
}

// Descobre qual app está NA TELA (em primeiro plano) agora. Necessário após a
// troca do launcher padrão: o set-home-activity muda só o PADRÃO — quem estava
// visível continua visível até um toque no Início. Esta leitura permite
// conferir se o toque surtiu efeito.
// Tenta o gerenciador de atividades (topResumedActivity no Android 10+,
// mResumedActivity nos antigos) e cai para o foco de janela do window manager.
// Devolve o nome do pacote, ou null quando o aparelho não expõe a informação.
async function getForegroundPackage(serial) {
  try {
    const out = await adb(['-s', serial, 'shell', 'dumpsys activity activities | grep ResumedActivity'], { timeout: 15000 });
    const m = /ActivityRecord\{[^}]*?\su\d+\s+([A-Za-z0-9._]+)\//.exec(out);
    if (m) return m[1];
  } catch { /* aparelho sem grep/dumpsys acessível; tenta o foco de janela */ }
  try {
    const out = await adb(['-s', serial, 'shell', 'dumpsys window | grep mCurrentFocus'], { timeout: 15000 });
    const m = /mCurrentFocus=Window\{[^}]*?\s([A-Za-z0-9._]+)\//.exec(out);
    if (m) return m[1];
  } catch { /* sem leitura de primeiro plano neste aparelho */ }
  return null;
}

// Confirma rapidamente que o aparelho está acessível (responde ao shell).
// Pré-checagem da alternância de modos: transforma um aparelho fora do ar em
// resposta curta e clara, em vez de uma fila de timeouts.
async function deviceAlive(serial) {
  try {
    const out = await adb(['-s', serial, 'shell', 'echo', 'ok'], { timeout: 5000 });
    return out.includes('ok');
  } catch {
    return false;
  }
}

// Estado da tela: 'awake' | 'asleep' | null (aparelho não expõe a leitura).
async function getScreenState(serial) {
  try {
    const out = await adb(['-s', serial, 'shell', 'dumpsys power | grep -i wakefulness=']);
    const m = /wakefulness(?:Raw)?=(\w+)/i.exec(out);
    if (!m) return null;
    return /awake/i.test(m[1]) ? 'awake' : 'asleep';
  } catch {
    return null;
  }
}

// A tela de bloqueio (keyguard) está visível? true | false | null (sem leitura).
async function isKeyguardShowing(serial) {
  try {
    const out = await adb(['-s', serial, 'shell', 'dumpsys activity activities | grep mKeyguardShowing']);
    const m = /mKeyguardShowing=(true|false)/.exec(out);
    return m ? m[1] === 'true' : null;
  } catch {
    return null;
  }
}

// Dispensa a tela de bloqueio quando NÃO há senha/PIN (bloqueio por deslizar).
// Com senha, o sistema apenas mostra a tela de desbloqueio — e é o correto:
// a segurança do usuário não se contorna por ADB.
async function dismissKeyguard(serial) {
  return adb(['-s', serial, 'shell', 'wm', 'dismiss-keyguard']);
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
      // Sentinela INTERNA, nunca exibida: o chamador (runner.js) engole este
      // erro e só marca `forced = false`. Slug em inglês para não se confundir
      // com texto de tela — a guarda de i18n acusava a versão em português.
      throw new Error('ROTATION_LOCK_UNAVAILABLE');
    }
  }
}

// Define o tamanho/resolução do display. Sem args reseta para o padrão.
// ATENÇÃO À ORIENTAÇÃO. O `wm size` fala na orientação NATURAL do aparelho —
// num Galaxy, retrato. O catálogo fala em resolução de TV, que é paisagem
// ("Full HD 1920x1080"). Passar os valores de paisagem direto cria um display
// retrato de 1920 de largura por 1080 de altura: girado, a janela vira
// 1080x1920 (9:16) e a interface do launcher — que ocupa o maior 16:9 que
// couber — encolhe para uma faixa no meio da tela, usando ~28% da altura.
// Foi exatamente o que aconteceu em 25/07/2026 com os presets Full HD e 4K.
//
// Aqui normalizamos: a dimensão MENOR vai primeiro quando o painel é retrato
// (e o contrário num aparelho de painel paisagem, como certos tablets), em vez
// de assumir a orientação.
async function setDisplaySize(serial, width, height) {
  if (width == null || height == null) {
    return adb(['-s', serial, 'shell', 'wm', 'size', 'reset']);
  }
  const menor = Math.min(width, height);
  const maior = Math.max(width, height);
  let alvo = `${menor}x${maior}`;                      // padrão: painel retrato
  const { physical } = await getDisplaySize(serial).catch(() => ({ physical: null }));
  if (physical) {
    const [pw, ph] = physical.split('x').map(Number);
    if (pw > ph) alvo = `${maior}x${menor}`;           // painel naturalmente paisagem
  }
  return adb(['-s', serial, 'shell', 'wm', 'size', alvo]);
}

// Lê o tamanho atual do display (para registrar antes de mudar, e reverter).
async function getDisplaySize(serial) {
  const out = await adb(['-s', serial, 'shell', 'wm', 'size']);
  const phys = /Physical size:\s*(\d+x\d+)/.exec(out);
  const over = /Override size:\s*(\d+x\d+)/.exec(out);
  return { physical: phys ? phys[1] : null, override: over ? over[1] : null };
}

// Lê a densidade (dpi) atual do display, física e forçada.
async function getDisplayDensity(serial) {
  const out = await adb(['-s', serial, 'shell', 'wm', 'density']);
  const phys = /Physical density:\s*(\d+)/.exec(out);
  const over = /Override density:\s*(\d+)/.exec(out);
  return { physical: phys ? Number(phys[1]) : null, override: over ? Number(over[1]) : null };
}

// Define a densidade (dpi) do display. Sem valor, reseta para o padrão.
async function setDisplayDensity(serial, dpi) {
  if (dpi == null) {
    return adb(['-s', serial, 'shell', 'wm', 'density', 'reset']);
  }
  return adb(['-s', serial, 'shell', 'wm', 'density', String(dpi)]);
}

// Ativa/ajusta o Não Perturbe pelo gerenciador de notificações.
// Modos aceitos: 'on' | 'priority' | 'none' | 'alarms' | 'off'.
// O estado atual é lido pelo setting global 'zen_mode'
// (0=desligado, 1=prioridade, 2=silêncio total, 3=só alarmes).
async function setDnd(serial, mode) {
  return adb(['-s', serial, 'shell', 'cmd', 'notification', 'set_dnd', mode]);
}

// Serial "de fábrica" do aparelho (ro.serialno). Estável entre USB e Wi-Fi —
// na conexão TCP o serial de transporte vira "ip:porta", mas este não muda.
async function getSerialNo(serial) {
  return adb(['-s', serial, 'shell', 'getprop', 'ro.serialno']);
}

// Descobre o IP do aparelho na rede Wi-Fi. Tenta a rota padrão (traz o campo
// src) e cai para o endereço da interface wlan0.
async function getWifiIp(serial) {
  try {
    const out = await adb(['-s', serial, 'shell', 'ip', 'route']);
    const m = /\bsrc\s+(\d+\.\d+\.\d+\.\d+)/.exec(out);
    if (m) return m[1];
  } catch { /* tenta o fallback abaixo */ }
  const out2 = await adb(['-s', serial, 'shell', 'ip', '-f', 'inet', 'addr', 'show', 'wlan0']).catch(() => '');
  const m2 = /inet\s+(\d+\.\d+\.\d+\.\d+)/.exec(out2);
  return m2 ? m2[1] : null;
}

// Reinicia o adbd do aparelho escutando em TCP (modo Wi-Fi).
async function enableTcpip(serial, port = 5555) {
  return adb(['-s', serial, 'tcpip', String(port)]);
}

// Conecta a um aparelho por TCP ('ip:porta'). Devolve a saída crua do adb.
async function connectTcp(hostPort) {
  return adb(['connect', hostPort]);
}

// Confirma se um pacote existe no aparelho. A comparação é por linha exata:
// 'pm list packages com.mubi' também lista 'com.mubi.pro', e um includes()
// simples daria falso positivo.
async function hasPackage(serial, pkg) {
  const out = await adb(['-s', serial, 'shell', 'pm', 'list', 'packages', pkg]);
  return out.split('\n').some((line) => line.trim() === `package:${pkg}`);
}

// versionCode do pacote instalado, ou null se não estiver instalado / não der
// para ler. É o que permite ATUALIZAR um app já presente em vez de só pular.
//
// No S21 FE (Android 16) a linha vem como `versionCode=1 minSdk=26 targetSdk=34`.
// O dumpsys pode imprimir `versionCode=` mais de uma vez (seções por usuário,
// pacote base + sobreposições), então pegamos o MENOR valor. O critério é
// deliberadamente conservador: errar para baixo faz, no pior caso, reinstalar
// um APK igual; errar para cima deixaria de atualizar um aparelho.
async function getVersionCode(serial, pkg) {
  try {
    const out = await adb(['-s', serial, 'shell', 'dumpsys', 'package', pkg]);
    const codes = [...out.matchAll(/versionCode=(\d+)/g)].map((m) => Number(m[1]));
    if (!codes.length) return null;
    return Math.min(...codes);
  } catch {
    return null;
  }
}

// --- Controle remoto virtual -------------------------------------------------
// Envia uma tecla ao aparelho, como um controle remoto (input keyevent).
// O keycode numérico chega validado do main (allowlist) — aqui só executa.
async function sendKeyEvent(serial, keycode) {
  return adb(['-s', serial, 'shell', 'input', 'keyevent', String(keycode)], { timeout: 10000 });
}

// --- Saúde do aparelho -------------------------------------------------------
// Parser puro do 'dumpsys battery' (exportado para testes). A temperatura vem
// em décimos de °C (302 = 30,2 °C). Status: 2 = carregando, 5 = carga cheia.
function parseBatteryDump(out) {
  const num = (re) => { const m = re.exec(out); return m ? Number(m[1]) : null; };
  const level = num(/level:\s*(\d+)/);
  const tempRaw = num(/temperature:\s*(\d+)/);
  const status = num(/status:\s*(\d+)/);
  const plugged = /(AC|USB|Wireless) powered:\s*true/i.test(out);
  return {
    level,
    tempC: tempRaw != null ? Math.round(tempRaw / 10 * 10) / 10 : null,
    charging: status === 2 || status === 5,
    full: status === 5,
    plugged,
  };
}

// Bateria: nível, temperatura e situação de carga.
async function getBatteryHealth(serial) {
  const out = await adb(['-s', serial, 'shell', 'dumpsys', 'battery']);
  return parseBatteryDump(out);
}

// Parser puro do 'df /data' (exportado para testes). Formato toybox típico:
// Filesystem 1K-blocks Used Available Use% Mounted — blocos de 1K.
//
// IMPORTANTE: a ordem das colunas NÃO é garantida entre versões do
// Android/toybox/busybox — houve aparelho em que a leitura por posição fixa
// exibia o espaço OCUPADO como "livre". Por isso as colunas são localizadas
// pelo NOME no cabeçalho (Used / Available); a posição clássica fica só como
// último recurso quando não há cabeçalho. Coerência final: livre nunca pode
// exceder o total, e valores ausentes são derivados dos outros dois.
function parseDf(out) {
  const empty = { totalBytes: null, usedBytes: null, freeBytes: null };
  const lines = String(out || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return empty;

  const hasHeader = /filesystem/i.test(lines[0]);
  const header = hasHeader ? lines[0].split(/\s+/) : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  // Linha de dados: a montada na partição de dados, senão a última. O ponto
  // de montagem varia por aparelho — uns reportam `/data`, outros
  // `/data/user/0` (visto no S23 Ultro/Android 16) — por isso o padrão aceita
  // o sufixo /user/<n> opcional. Sem correspondência, cai na última linha.
  const row = dataLines.find((l) => /\s\/data(\/user\/\d+)?$/.test(l))
    || dataLines[dataLines.length - 1] || '';
  const parts = row.split(/\s+/);
  // Nome do dispositivo longo (ex.: /dev/block/.../by-name/userdata) faz o df
  // QUEBRAR a linha: o nome fica sozinho numa linha e os números na seguinte.
  // Nesse caso a linha de dados começa direto num número — realinha as
  // colunas inserindo o nome ausente, senão o total leria o ocupado.
  if (parts.length && /^\d+$/.test(parts[0])) parts.unshift('');

  // Índice de uma coluna pelo nome no cabeçalho; sem cabeçalho ou sem a
  // coluna, cai na posição clássica.
  const col = (re, fallback) => {
    const i = header.findIndex((c) => re.test(c));
    return i >= 0 ? i : fallback;
  };
  const bytes = (i) => {
    const raw = parts[i];
    const n = Number(raw);
    return raw != null && raw !== '' && Number.isFinite(n) && n >= 0 ? n * 1024 : null;
  };

  const totalBytes = bytes(col(/blocks$|^size$/i, 1));
  let usedBytes = bytes(col(/^used$/i, 2));
  let freeBytes = bytes(col(/^avail(able)?$|^free$/i, 3));

  // Redes de segurança: deriva o que faltou e rejeita "livre" maior que o
  // total (sinal de coluna errada) recalculando a partir do ocupado.
  if (totalBytes != null && usedBytes == null && freeBytes != null) {
    usedBytes = Math.max(0, totalBytes - freeBytes);
  }
  if (totalBytes != null && usedBytes != null
      && (freeBytes == null || freeBytes > totalBytes)) {
    freeBytes = Math.max(0, totalBytes - usedBytes);
  }
  if (totalBytes == null || freeBytes == null) return empty;
  return { totalBytes, usedBytes, freeBytes };
}

// Armazenamento de uma partição. Padrão '/data' (onde vivem apps e caches);
// o envio de arquivos consulta '/sdcard' (o destino real das pastas).
async function getStorageInfo(serial, mount = '/data') {
  const out = await adb(['-s', serial, 'shell', 'df', mount]);
  return parseDf(out);
}

// --- Limpeza com um clique ---------------------------------------------------
// Pede ao Android para liberar os caches de TODOS os apps até sobrar o espaço
// indicado — um valor alto significa "limpe o máximo possível". Só remove
// arquivos temporários: nenhum dado, login ou configuração é apagado (os apps
// recriam o cache quando precisam), por isso NÃO entra no registro de reversão.
async function trimCaches(serial, desired = '512G') {
  return adb(['-s', serial, 'shell', 'pm', 'trim-caches', desired], { timeout: 120000 });
}

// Parser puro do 'dumpsys diskstats' (exportado para testes): extrai o cache
// por app a partir dos arrays paralelos "Package Names" e "Cache Sizes"
// (bytes). É o que permite MOSTRAR o que a limpeza vai liberar, app por app.
// Aparelhos antigos não trazem essas listas — devolve [] sem quebrar.
function parseDiskstats(out) {
  try {
    const names = /Package Names:\s*(\[[^\]]*\])/.exec(out);
    const caches = /Cache Sizes:\s*(\[[^\]]*\])/.exec(out);
    if (!names || !caches) return [];
    const pkgs = JSON.parse(names[1]);
    const sizes = JSON.parse(caches[1]);
    if (!Array.isArray(pkgs) || !Array.isArray(sizes) || pkgs.length !== sizes.length) return [];
    return pkgs
      .map((pkg, i) => ({ pkg, cacheBytes: Number(sizes[i]) || 0 }))
      .sort((a, b) => b.cacheBytes - a.cacheBytes);
  } catch {
    return [];
  }
}

// Cache ocupado por app, do maior para o menor.
async function getCacheSizes(serial) {
  const out = await adb(['-s', serial, 'shell', 'dumpsys', 'diskstats'], { timeout: 30000 });
  return parseDiskstats(out);
}

// --- Envio de arquivos para o aparelho ---------------------------------------
// Garante que uma pasta existe no aparelho (mkdir -p é idempotente).
async function ensureDir(serial, dir) {
  return adb(['-s', serial, 'shell', 'mkdir', '-p', dir]);
}

// Escapa um caminho para uso seguro dentro do shell do aparelho (aspas simples).
function shellQuote(p) {
  return `'${String(p).replace(/'/g, `'\\''`)}'`;
}

// Envia um arquivo do computador para o aparelho, com progresso em tempo real.
// Usa spawn (em vez do wrapper comum) porque a transferência é longa e
// precisamos acompanhar o andamento enquanto roda, não só o resultado final.
//
// O progresso vem de DUAS fontes, para funcionar em qualquer versão do
// platform-tools e — principalmente — no app empacotado, onde a saída do adb
// é redirecionada (pipe, não um terminal) e nesse caso o adb NÃO imprime o
// "[ 42%]". As fontes são:
//   1) parser do stdout/stderr do próprio `adb push` (quando ele emite);
//   2) sondagem do tamanho do arquivo já gravado no aparelho (fallback que
//      funciona mesmo sem TTY) — dá o percentual real crescendo.
//
// onProgress recebe { percent, transferredBytes, totalBytes }. percent vai de
// 0 a 100; totalBytes fica 0 quando não deu para medir o tamanho local.
//
// Aceita um AbortSignal ({ signal }): ao abortar, o processo do `adb push` é
// encerrado e a promessa rejeita com Error('CANCELLED') — o envio por
// arrastar-e-soltar usa isso para o botão "Cancelar".
function pushFile(serial, localPath, remotePath, onProgress, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('CANCELLED')); return; }

    const bin = adbPath(); // mesmo resolvedor de binário usado por adb()

    let totalBytes = 0;
    try { totalBytes = fs.statSync(localPath).size; } catch { /* segue sem tamanho */ }

    let lastPercent = 0;
    let gotRealPercent = false; // o adb começou a emitir "[ x%]" sozinho
    let pollTimer = null;
    let aborted = false;
    // Timeout de INATIVIDADE: um cabo em mau contato deixa o push pendurado
    // para sempre. Se o canal ficar mudo (sem novo byte transferido nem saída
    // do adb) por muito tempo, matamos e reportamos. Só arma quando HÁ um sinal
    // de progresso a acompanhar (tamanho local medido ou % do próprio adb) —
    // sem sinal não dá para distinguir "travado" de "copiando em silêncio", e
    // aí preferimos não matar um envio saudável.
    const INACTIVITY_MS = 60000;
    let lastActivity = Date.now();
    let lastWritten = 0; // maior tamanho já visto no aparelho (mede o avanço real)
    let timedOut = false;
    let watchdog = null;
    const bump = () => { lastActivity = Date.now(); };

    const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
    const report = (percent, transferredBytes) => {
      if (!onProgress) return;
      const p = Math.max(0, Math.min(100, Math.round(percent)));
      onProgress({ percent: p, transferredBytes, totalBytes });
    };

    // Sinaliza o início imediatamente (a interface já mostra o arquivo/tamanho).
    report(0, 0);

    const child = spawn(bin, ['-s', serial, 'push', localPath, remotePath]);
    let stderrBuf = '';

    // Fonte 1: o próprio adb, quando imprime "[ 42%]" (stdout OU stderr).
    const feed = (chunk) => {
      bump(); // qualquer byte do adb = canal vivo
      const text = chunk.toString();
      const matches = text.match(/\[\s*(\d{1,3})%\]/g);
      if (!matches) return;
      const m = /(\d{1,3})/.exec(matches[matches.length - 1]);
      if (!m) return;
      const val = Math.min(100, Number(m[1]));
      if (val > 0) { gotRealPercent = true; stopPoll(); } // adb assumiu o controle
      if (val > lastPercent) {
        lastPercent = val;
        report(val, Math.round((val / 100) * totalBytes));
      }
    };

    child.stdout.on('data', feed);
    child.stderr.on('data', (c) => { stderrBuf += c.toString(); feed(c); });

    // Fonte 2: sonda o tamanho já gravado no aparelho enquanto o adb não estiver
    // emitindo percentual próprio. Falha em silêncio (arquivo ainda não existe,
    // stat indisponível, nome com caracteres estranhos) e trava em 99% até o
    // adb confirmar o fim, para não mostrar "100%" antes da hora.
    if (totalBytes > 0) {
      pollTimer = setInterval(() => {
        if (gotRealPercent) return;
        adb(['-s', serial, 'shell', `stat -c %s ${shellQuote(remotePath)} 2>/dev/null`], { timeout: 8000 })
          .then((out) => {
            const written = Number((out || '').trim());
            if (!Number.isFinite(written) || written <= 0) return;
            // Só conta como atividade se o arquivo CRESCEU: um tamanho parado
            // (transferência travada) não pode manter o watchdog acordado.
            if (written > lastWritten) { lastWritten = written; bump(); }
            const val = Math.min(99, Math.floor((written / totalBytes) * 100));
            if (val > lastPercent) { lastPercent = val; report(val, written); }
          })
          .catch(() => { /* ignora: cai para o feedback indeterminado na interface */ });
      }, 900);
    }

    // Watchdog de inatividade: só age quando há sinal de progresso mensurável
    // (poll ativo ou % do adb). Sem sinal, mantém o comportamento de hoje.
    watchdog = setInterval(() => {
      if (!(totalBytes > 0 || gotRealPercent)) return;
      if (Date.now() - lastActivity > INACTIVITY_MS) {
        timedOut = true;
        stopPoll();
        try { child.kill(); } catch { /* processo já saiu */ }
      }
    }, 5000);

    // Cancelamento: encerra o processo do push e para a sondagem.
    const onAbort = () => {
      aborted = true;
      stopPoll();
      child.kill();
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => {
      stopPoll();
      if (watchdog) { clearInterval(watchdog); watchdog = null; }
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    child.on('error', (err) => { cleanup(); reject(aborted ? new Error('CANCELLED') : err); });
    child.on('close', (code) => {
      cleanup();
      if (aborted) {
        reject(new Error('CANCELLED'));
      } else if (timedOut) {
        reject(new Error(t('adb.pushStalled')));
      } else if (code === 0) {
        report(100, totalBytes);
        resolve();
      } else {
        reject(new Error(stderrBuf.trim() || t('adb.pushExited', { code })));
      }
    });
  });
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
  getForegroundPackage,
  deviceAlive,
  getScreenState,
  isKeyguardShowing,
  dismissKeyguard,
  deleteSetting,
  hasPackage,
  getVersionCode,
  setDnd,
  getSerialNo,
  getWifiIp,
  enableTcpip,
  connectTcp,
  setFixToUserRotation,
  setDisplaySize,
  getDisplaySize,
  setDisplayDensity,
  getDisplayDensity,
  sendKeyEvent,
  getBatteryHealth,
  getStorageInfo,
  trimCaches,
  getCacheSizes,
  ensureDir,
  pushFile,
  parseBatteryDump,
  parseDf,
  parseDiskstats,
};
