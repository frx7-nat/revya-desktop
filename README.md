# DexArmor

App desktop (Electron) que provisiona celulares Samsung como dispositivos de
mídia para TV via ADB — sem root. Remove bloatware, instala o launcher de TV
próprio, aplica ajustes de sistema, e sabe **desfazer tudo** (registro de
reversão por aparelho). Aplicativos de terceiros não são distribuídos: o
usuário instala os dele arrastando o APK para a janela.

## Estrutura

```
src/
  adb/
    adb.js              Wrapper de baixo nível em torno do adb (comandos por função)
    adbDiagnostics.js   Diagnóstico de estados do ADB em linguagem simples
    adbOrchestrator.js  Detecção + recuperação automática do servidor ADB
  main/
    main.js             Processo principal Electron + handlers IPC
    preload.js          Ponte segura (contextBridge) main <-> renderer
    runner.js           Orquestrador: task do catálogo -> chamadas ADB (+ verificação)
    revertStore.js      Registro de reversão em disco (por serial de fábrica)
    scrcpy.js           Espelhamento da tela do aparelho (scrcpy)
  renderer/
    index.html          Entrada HTML
    main.jsx            Bootstrap do React
    Root.jsx            Gate de entrada: tela "Conecte seu Galaxy" antes do App
    App.jsx             Layout de 3 colunas e estado da aplicação
    theme/theme.js      Tema MUI customizado (escuro, acento âmbar)
    data/tasks.js       Catálogo de modificações + preset recomendado (auditável)
    screens/
      ConnectPhoneScreen.jsx  Tela-gate com diagnóstico ao vivo do ADB
    components/
      TaskPanel.jsx         Aba esquerda  — modificações, check-up e reversão
      DevicePanel.jsx       Aba central   — aparelho, preset recomendado, Wi-Fi, espelhamento
      ProgressPanel.jsx     Aba direita   — progresso passo a passo + relatório
      DeviceStatusCard.jsx  Cartão de diagnóstico da tela de conexão
      TvResolutionDialog.jsx  Pergunta da resolução da TV (preset recomendado)
      CheckupDialog.jsx     Verifica se os ajustes aplicados continuam valendo
      ResetDialog.jsx       Reversão das alterações (+ exportar/importar registro)
      CloseDialog.jsx       Pop-up de fechamento (apresenta acessórios)
      DexGuideDialog.jsx    Guia "Desative o DeX"
      PhoneMock.jsx / PhoneScreen.jsx / PhoneAccessories.jsx  Celular central
platform-tools/         (você adiciona) binários ADB por plataforma:
  win/                  adb.exe + AdbWinApi.dll + AdbWinUsbApi.dll
  mac/                  adb (sem extensão, chmod +x)
  linux/                adb (sem extensão, chmod +x)
scrcpy/                 (você adiciona) release oficial do scrcpy por plataforma
                        (ver scrcpy/README.txt) — botão "Ver tela do celular"
apks/                   só o APK próprio: launchers/{Launcher} DexArmor TV.apk
```

## Setup

1. `npm install`
2. Baixe o platform-tools do Google **de cada plataforma que for distribuir** e
   coloque os binários em `platform-tools/win`, `platform-tools/mac` e/ou
   `platform-tools/linux`. No Mac/Linux, `chmod +x` no binário `adb`.
3. (Opcional, para o espelhamento de tela) Baixe o release oficial do scrcpy e
   coloque o conteúdo em `scrcpy/<plataforma>/` — ver `scrcpy/README.txt`. Sem
   ele, o app tenta o scrcpy do sistema (PATH).
4. Coloque o APK do launcher em `apks/launchers/` (veja `apks/README.txt`).
   **Nenhum APK de terceiro entra aqui** — o programa não redistribui apps.

No CI (GitHub Actions), platform-tools e scrcpy são baixados automaticamente.

## Rodar em desenvolvimento

```
npm run dev
```

Sobe o servidor do Vite (porta 5173) e o Electron juntos, com hot reload do
renderer. O Electron espera o Vite ficar pronto antes de abrir a janela.

## Rodar build de produção localmente

```
npm start
```

Faz o build do renderer com Vite e abre o Electron carregando o HTML buildado
(sem servidor de dev). Útil para testar como ficará empacotado.

## Gerar instaladores

```
npm run dist:win     # NSIS (instalador) + portable .exe
npm run dist:mac     # .dmg (Intel x64 + Apple Silicon arm64)
npm run dist:linux   # AppImage + .deb
npm run dist         # plataforma atual
```

Cada comando builda o renderer antes de empacotar. O filtro `${os}` no
`extraResources` inclui só os binários (ADB e scrcpy) da plataforma alvo. As
dependências de UI (React/MUI) ficam em `devDependencies` — o bundle do Vite já
embute tudo, então nenhum `node_modules` vai para o instalador. Builds de Mac
precisam rodar em macOS; o ideal é gerar cada plataforma no seu próprio sistema
(ou em CI).

## Decisões de design

- **Toda lógica ADB roda no main**, nunca no renderer — `contextIsolation`
  ligado, `nodeIntegration` desligado. O renderer só fala via `window.api`.
- **Catálogo de tasks separado da execução** (`data/tasks.js` vs `runner.js`):
  dá pra auditar a lista de pacotes sem ler código de execução.
- **Remoção só por usuário** (`pm uninstall --user 0`): reversível por reset de
  fábrica, mais seguro que mexer em partição de sistema.
- **Tudo que o app altera é registrado antes** (`revertStore.js`): cada task
  captura o estado anterior e o botão "Reverter alterações" desfaz na ordem
  inversa da aplicação. O registro é indexado pelo serial de fábrica
  (`ro.serialno`), então continua válido alternando entre USB e Wi-Fi, e pode
  ser exportado/importado para reverter a partir de outro computador.
- **Escrita verificada**: settings são lidos de volta após o `put`; falha
  silenciosa vira erro real. O check-up reusa essa ideia para conferir se os
  ajustes continuam valendo depois de updates/reboots.
- **Preset recomendado ≠ decisões do usuário**: o botão de 1 clique aplica só o
  que é seguro em qualquer aparelho; resolução da TV é perguntada num diálogo
  (com densidade pareada), e bloqueio de tela/streaming ficam na seleção manual.

## Limites conhecidos

- Depuração USB precisa estar ligada manualmente pelo usuário — não há como
  automatizar esse passo inicial.
- Não vira Android TV de verdade; é uma experiência de TV sobre o Android/DeX.
- Apps "for TV" com checagem de leanback podem recusar instalação por sideload.
- Antes de remover qualquer pacote novo, valide: remover o pacote errado pode
  deixar o aparelho instável.
- Com a resolução 16:9 forçada, o painel do celular mostra a interface como uma
  faixa com barras pretas — é esperado; a imagem espelhada preenche a TV.
