# CHANGESET — Saída dos APKs de terceiros (27/07/2026)

## Por quê

O DexArmor é um produto vendido. Embutir e redistribuir o APK de outra empresa
(Netflix, Disney+, Aptoide, AetherSX2, Projectivy…) é risco legal do projeto,
não do usuário. A decisão: o programa passa a fazer **apenas a transformação do
celular**. Os aplicativos são escolha e responsabilidade de quem usa, e entram
pelo caminho que o app já tinha — o arrastar-e-soltar.

## O que saiu

- **Catálogo de apps de terceiros** em `src/renderer/data/tasks.js`: as
  categorias `multimidia` (12 apps), `ferramentas` (5) e `emuladores` (1)
  deixaram de existir. O grupo `install` ficou com uma única task,
  `lnch-dexarmor` (o launcher próprio), e virou um grupo de `tasks` comum —
  sem o nível de categorias.
- **Arquivos** de `apks/multimidia`, `apks/navegacao`, `apks/emuladores` e o
  `{Launcher} Projectivy Launcher.apkm`. Foram **movidos**, não apagados (são
  ignorados pelo git), para `~/dexarmor-apks-removidos/`.
- **`InstallGroup`** (acordeões de categoria) em `TaskPanel.jsx`, e o ramo
  `group.categories` em `TaskPanel` e em `ALL_TASKS`.

Sair do catálogo **não desinstala nada**: aparelhos já provisionados seguem com
o que foi instalado antes.

## O que entrou

- **Aviso "Como instalar apps e enviar arquivos"** — `data/sideloadGuide.js` +
  `components/SideloadGuideDialog.jsx`, no mesmo modelo do guia do DeX e do de
  primeiros passos (passos com ícone, tom âmbar). Abre pelo botão do bloco de
  aviso que ocupa o lugar do catálogo, dentro do grupo "Instalar o launcher de
  TV". No catálogo, o aviso é o par de campos `notice`/`noticeAction` do grupo,
  renderizado pelo `GroupNotice`.
- **Aba "Contribua com o projeto"** — `components/ContributeTab.jsx` fixa no
  rodapé da coluna esquerda (canto inferior esquerdo da janela, fora da área que
  rola) e `components/ContributeDialog.jsx` centralizado, com a mensagem e
  **três espaços de QR code**. Conteúdo em `data/contribute.js`; enquanto
  `image` for `null`, cada espaço mostra a moldura tracejada. Discreta por
  decisão: só abre por clique, não bloqueia nada, não volta a perguntar.
- **Instalação de pacotes pelo arrastar-e-soltar.** Com o catálogo fora, esta
  passou a ser a via principal de instalar apps — e ela só aceitava `.apk`
  simples, enquanto os `.apkm`/`.xapk` (APKMirror) são o formato mais comum.
  O `send:apk` agora usa o mesmo caminho da task do catálogo.

## Refatoração que isso exigiu

`runner.js` ganhou **`installApkFile(serial, apkPath, { signal })`** — extraído
de dentro da task `install`, agora exportado e usado também pelo `send:apk` do
`main.js`. Caminho único de instalação: detecta bundle (`.apkm`/`.xapk`) e
extrai, contorna o verificador de pacotes (Play Protect para ADB) só durante a
instalação restaurando o valor anterior, e traduz `INSTALL_FAILED_*` para os
códigos que a interface explica. `installBundled` e `adb.installMultiple`
passaram a aceitar `AbortSignal` — o envio segue cancelável.

`utils/errors.js`: `friendlySendError` passou a traduzir `VERIFICATION_FAILURE:`
e `ALREADY_INSTALLED:`, que antes só apareciam no fluxo das tasks (onde o
`ProgressPanel` abre o guia do Play Protect).

## Textos ajustados

`firstSetupGuide.js` (passo 3), `DevicePanel.jsx` (legenda da Configuração
recomendada), `SendOverlay.jsx` (alvo de instalação e dica do ROMs),
`apks/README.txt`, `README.md` e `DOCUMENTACAO.md`.

## Pendência conhecida

As pastas `release/` ainda contêm builds antigos **com os APKs de terceiros
dentro** (`resources/apks/`). Não distribuir esses artefatos — gerar novos com
`npm run dist:*`.
