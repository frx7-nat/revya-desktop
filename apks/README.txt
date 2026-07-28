APKS EMBUTIDOS NO PROGRAMA
==========================

REGRA (27/07/2026): só entra aqui APK QUE NOS PERTENCE.

O catálogo de aplicativos de terceiros (streaming, ferramentas, emuladores e
o Projectivy Launcher) foi REMOVIDO do DexArmor. Motivo: REDISTRIBUIR o APK
de outra empresa, sem licença para isso, é problema de direito autoral.

ATENÇÃO AO MOTIVO (corrigido em 28/07/2026). Até esta data a frase acima dizia
"dentro de um programa vendido". Está errado e é perigoso: distribuir software
de terceiros sem licença é infração INDEPENDENTEMENTE de haver cobrança —
grátis também é distribuição. Quando o DexArmor passou a ser gratuito, a
redação antiga sugeria que a regra tinha caído. Não caiu. Cobrar nunca foi a
parte que importava.

O DexArmor faz a transformação do celular; os aplicativos que o usuário quiser
ele instala a partir dos arquivos DELE, arrastando para a janela do programa
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
