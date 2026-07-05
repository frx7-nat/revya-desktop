scrcpy — espelhamento da tela do celular (botão "Ver tela do celular")
=======================================================================

O DexArmor usa o scrcpy (https://github.com/Genymobile/scrcpy, Apache 2.0)
para abrir a tela do aparelho numa janela controlável por mouse/teclado.

Assim como o platform-tools, os binários NÃO ficam no Git. Coloque o conteúdo
do release oficial de cada plataforma na subpasta correspondente:

  scrcpy/win/    scrcpy-win64-vX.Y.zip           (scrcpy.exe + DLLs + scrcpy-server)
  scrcpy/mac/    scrcpy-macos-*-vX.Y.tar.gz      (scrcpy + scrcpy-server)
  scrcpy/linux/  scrcpy-linux-x86_64-vX.Y.tar.gz (scrcpy + scrcpy-server)

Downloads: https://github.com/Genymobile/scrcpy/releases

Notas:
- No Mac/Linux, garanta permissão de execução: chmod +x scrcpy/<os>/scrcpy
- Para Macs, o build x86_64 roda também em Apple Silicon (via Rosetta) —
  é o que o CI empacota para servir aos dois. Para desenvolvimento local em
  Apple Silicon, prefira o aarch64 (mais rápido).
- O app aponta o scrcpy para o adb do próprio DexArmor (env ADB), então o
  adb que vem no release do scrcpy é ignorado e pode ser apagado.
- Sem os binários, o app tenta o scrcpy instalado no sistema (PATH); se não
  houver, o botão mostra um erro explicando.
- O CI (.github/workflows/build.yml) baixa tudo automaticamente no build.
