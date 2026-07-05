COMO HOSPEDAR OS APKS
=====================

Coloque cada arquivo .apk na subpasta da sua categoria. O nome do arquivo
deve bater EXATAMENTE com o campo `source.apk` em src/renderer/data/tasks.js.

Estrutura:
  apks/
    launchers/    {Launcher} Projectivy Launcher.apkm   (padrão do sistema)
    multimidia/   kodi.apk, jellyfin.apk, ...
    navegacao/    tvbro.apk, ...
    emuladores/   retroarch.apk, ...

FONTES RECOMENDADAS (APK OFICIAL, NÃO USE VERSÕES "MOD"/"PREMIUM"):
  - F-Droid: https://f-droid.org  (APKs oficiais com URL estável)
  - APKMirror: https://apkmirror.com  (revisão manual, assinatura original)

Projectivy Launcher -> pacote oficial: com.spocky.projengmenu

Depois de adicionar um APK, confira se o `pkg` no tasks.js corresponde ao
nome real do pacote (importante para o app saber se já está instalado).
