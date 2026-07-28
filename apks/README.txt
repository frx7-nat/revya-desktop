APKS EMBUTIDOS NO PROGRAMA
==========================

REGRA (27/07/2026): só entra aqui APK QUE NOS PERTENCE.

O catálogo de aplicativos de terceiros (streaming, ferramentas, emuladores e
o Projectivy Launcher) foi REMOVIDO do DexArmor. Motivo: redistribuir o APK
de outra empresa dentro de um programa vendido é um problema legal nosso. O
DexArmor faz a transformação do celular; os aplicativos que o usuário quiser
ele instala a partir dos arquivos dele, arrastando para a janela do programa
("Instalar no celular" — aceita .apk, .apkm e .xapk).

Os arquivos que estavam aqui foram movidos para fora do projeto, em
  /Users/natalierjunior/dexarmor-apks-removidos/

Estrutura atual:
  apks/
    launchers/    {Launcher} DexArmor TV.apk   (launcher próprio, padrão do modo TV)

O nome do arquivo deve bater EXATAMENTE com o campo `source.apk` do catálogo
em src/renderer/data/tasks.js, e `pkg` com o nome real do pacote (é como o
programa sabe se já está instalado). Ao publicar uma versão nova do launcher,
suba o versionCode no build.gradle.kts do launcher E o `minVersionCode` da
task lnch-dexarmor — é o que dispara a reinstalação com -r.
