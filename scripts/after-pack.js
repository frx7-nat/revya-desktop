// scripts/after-pack.js
// Gancho `afterPack` do electron-builder. Roda depois de montar o .app e ANTES
// de gerar o DMG, então o que vai para o instalável já sai corrigido.
//
// ---------------------------------------------------------------------------
// POR QUE ISTO EXISTE (28/07/2026)
//
// O macOS recusava o app com o pior diagnóstico possível:
//
//     "Malware Bloqueado e Movido para o Lixo
//      O app DexArmor.app não foi aberto porque contém malware."
//
// Não era o antivírus da máquina — era o GATEKEEPER da Apple. O `spctl`
// respondia:
//
//     notarization indicates this code has been revoked
//
// E a causa estava na assinatura que o electron-builder deixava:
//
//     Identifier=Electron          <- identificador do binário do Electron
//     flags=0x20002(adhoc,linker-signed)
//     Info.plist=not bound
//
// `linker-signed` quer dizer que NÃO houve passagem de assinatura: o app ficou
// com a marca mínima que o compilador do Electron deixou, herdando o
// identificador "Electron". Nessa condição o Gatekeeper casa com uma
// revogação de notarização e trata o app como malware — dialog sem contorno,
// arquivo movido para o Lixo.
//
// ---------------------------------------------------------------------------
// O QUE ESTE GANCHO RESOLVE, E O QUE NÃO RESOLVE
//
// Medido nos dois estados:
//
//   sem assinar (como vinha)  -> "notarization ... has been revoked"  = MALWARE
//   ad-hoc com id próprio     -> "rejected"                           = aviso normal
//
// "rejected" é o veredito de qualquer app sem Developer ID: o usuário vê
// "desenvolvedor não identificado" e ABRE com botão direito → Abrir, ou por
// Ajustes → Privacidade e Segurança. É atrito, mas tem saída.
//
// O que ISTO NÃO FAZ: eliminar o aviso. Para o app abrir com duplo clique sem
// nenhuma advertência é preciso Developer ID + notarização da Apple
// (US$ 99/ano). Este gancho tira o app da categoria "malware" e o devolve à
// categoria "não assinado", que é onde ele de fato está.
// ---------------------------------------------------------------------------

const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  const appId = context.packager.appInfo.id;

  // `--deep` é desaconselhado pela Apple para assinatura REAL (o certo é
  // assinar de dentro para fora). Para ad-hoc serve, e é o que mantém este
  // gancho simples: o objetivo aqui não é uma cadeia de confiança, é apagar o
  // identificador "Electron" herdado e a marca `linker-signed`.
  execFileSync('codesign', [
    '--force', '--deep', '--sign', '-', '--identifier', appId, appPath,
  ], { stdio: 'inherit' });

  // CONFERE o resultado. Assinar e não verificar já nos custou um dia inteiro
  // em outra frente hoje: build verde não prova artefato bom.
  //
  // `codesign -dv` escreve em STDERR, não em stdout — capturar só o stdout
  // devolve string vazia e a checagem abaixo acusa "undefined". Foi o que
  // aconteceu na primeira versão deste gancho.
  const res = require('child_process').spawnSync('codesign', ['-dv', appPath], { encoding: 'utf8' });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const id = (out.match(/^Identifier=(.*)$/m) || [])[1];
  if (id !== appId) {
    throw new Error(`afterPack: identificador ficou "${id}", esperado "${appId}"`);
  }
  if (/linker-signed/.test(out)) {
    throw new Error('afterPack: o app continua linker-signed — a assinatura não pegou');
  }
  console.log(`  • assinatura ad-hoc aplicada  identifier=${id}`);
};
