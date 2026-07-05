# DexArmor

App Windows (Electron) que provisiona celulares Samsung como dispositivos de
mídia para TV via ADB — sem root. Remove bloatware, instala apps de TV e
emuladores, e aplica ajustes de sistema.

## Estrutura

```
src/
  adb/adb.js            Wrapper de baixo nível em torno do adb.exe
  main/
    main.js             Processo principal Electron + handlers IPC
    preload.js          Ponte segura (contextBridge) main <-> renderer
    runner.js           Orquestrador: task do catálogo -> chamadas ADB
  renderer/
    index.html          Entrada HTML
    main.jsx            Bootstrap do React
    App.jsx             Layout de 3 colunas e estado da aplicação
    theme/theme.js      Tema MUI customizado (escuro, acento âmbar)
    data/tasks.js       Catálogo de modificações (auditável)
    components/
      TaskPanel.jsx     Aba esquerda  — seleção de modificações
      DevicePanel.jsx   Aba central   — reconhecimento do aparelho
      ProgressPanel.jsx Aba direita   — progresso passo a passo
platform-tools/         (você adiciona) binários ADB por plataforma:
  win/                  adb.exe + AdbWinApi.dll + AdbWinUsbApi.dll
  mac/                  adb (sem extensão, chmod +x)
  linux/                adb (sem extensão, chmod +x)
apks/                   (você adiciona) APKs leanback e emuladores
```

## Setup

1. `npm install`
2. Baixe o platform-tools do Google **de cada plataforma que for distribuir** e
   coloque os binários em `platform-tools/win`, `platform-tools/mac` e/ou
   `platform-tools/linux`. No Mac/Linux, `chmod +x` no binário `adb`.
3. Coloque os APKs nas subpastas de `apks/` (veja `apks/README.txt`) e
   descomente os apps correspondentes em `src/renderer/data/tasks.js`.

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
`extraResources` inclui só o binário ADB da plataforma alvo. Builds de Mac
precisam rodar em macOS; o ideal é gerar cada plataforma no seu próprio
sistema (ou em CI).

## Decisões de design

- **Toda lógica ADB roda no main**, nunca no renderer — `contextIsolation`
  ligado, `nodeIntegration` desligado. O renderer só fala via `window.api`.
- **Catálogo de tasks separado da execução** (`data/tasks.js` vs `runner.js`):
  dá pra auditar a lista de pacotes sem ler código de execução.
- **Remoção só por usuário** (`pm uninstall --user 0`): reversível por reset de
  fábrica, mais seguro que mexer em partição de sistema.

## Limites conhecidos

- Depuração USB precisa estar ligada manualmente pelo usuário — não há como
  automatizar esse passo inicial.
- Não vira Android TV de verdade; é uma experiência de TV sobre o Android/DeX.
- Apps "for TV" com checagem de leanback podem recusar instalação por sideload.
- Antes de remover qualquer pacote novo, valide: remover o pacote errado pode
  deixar o aparelho instável.
```
