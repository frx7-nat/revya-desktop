# Guia de Integração — Detecção e Recuperação de ADB no DexArmor

> **Para o Claude Code:** este guia integra quatro arquivos ao projeto DexArmor
> (Electron + React + Material UI). Eles implementam o fluxo de detecção de
> dispositivos, recuperação automática de erros do ADB e a tela de conexão.
> **Adapte os caminhos à estrutura real do repositório** — os caminhos abaixo são
> sugestões. Siga os passos na ordem.

---

## O que este conjunto faz

Quando o usuário conecta um Galaxy por USB, o app detecta o estado via `adb devices`,
tenta se recuperar sozinho de erros comuns (reiniciando o servidor ADB) e mostra ao
usuário, em linguagem simples, o que fazer quando depende dele (ex.: autorizar a
depuração USB no aparelho). A tela reage sozinha: quando o telefone fica pronto, ela
avança.

## Os quatro arquivos

| Arquivo | Camada | Papel |
|---|---|---|
| `adbDiagnostics.js` | Main (lógica pura) | Faz parse da saída de `adb devices` e classifica o estado em mensagens prontas para a UI. Sem dependências. |
| `adbOrchestrator.js` | **Main** (usa `child_process`) | Roda o ADB, executa a recuperação automática uma vez e reconsulta o estado. Importa `adbDiagnostics.js`. |
| `DeviceStatusCard.jsx` | Renderer (MUI) | Componente presentacional: renderiza o diagnóstico (título, mensagem, passos, spinner). |
| `ConnectPhoneScreen.jsx` | Renderer (MUI) | Tela "Conecte seu Galaxy": faz polling, atualiza o cartão ao vivo e avança quando pronto. Importa `DeviceStatusCard.jsx`. |

**Regra de ouro:** `adbDiagnostics.js` e `adbOrchestrator.js` rodam no processo
**main** (têm acesso a `child_process`). Os dois `.jsx` rodam no **renderer**. A
comunicação entre eles é feita por IPC (Passos 3 e 4).

---

## Passo 0 — Inspecione o projeto antes de mexer

Antes de criar arquivos, identifique no repositório:

1. **A estrutura de pastas do Electron.** Onde fica o processo main (ex.:
   `src/main/`, `electron/`, `public/electron.js`) e o renderer (ex.:
   `src/renderer/`, `src/`).
2. **O sistema de módulos do main.** Veja se o `package.json` tem `"type": "module"`
   (ESM) ou não (CommonJS). Os arquivos `.js` usam **ESM** (`import`/`export`). Se o
   main for **CommonJS**, converta `adbDiagnostics.js` e `adbOrchestrator.js` para
   `require`/`module.exports` (ou garanta que o bundler do main aceite ESM).
3. **O arquivo de preload** já existente e a config de `webPreferences` da
   `BrowserWindow`.
4. **Onde o app renderiza as telas/rotas** no renderer (para montar a
   `ConnectPhoneScreen`).
5. **Se o Material UI já está instalado** (`@mui/material`, `@mui/icons-material`).

> Reporte ao usuário a estrutura encontrada e como você vai mapear os caminhos antes
> de prosseguir, caso difira muito do sugerido aqui.

---

## Passo 1 — Dependências

O DexArmor já usa Material UI, mas confirme que estes pacotes estão presentes. Se
faltar algum, instale:

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

---

## Passo 2 — Posicione os arquivos

Sugestão de mapeamento (ajuste à estrutura real):

```
src/main/adb/adbDiagnostics.js      ← lógica pura
src/main/adb/adbOrchestrator.js     ← orquestrador (main)
src/renderer/components/DeviceStatusCard.jsx
src/renderer/screens/ConnectPhoneScreen.jsx
```

Ao mover, **corrija os caminhos dos imports** dentro dos arquivos:

- `adbOrchestrator.js` importa `./adbDiagnostics.js` (mantenha os dois na mesma pasta).
- `ConnectPhoneScreen.jsx` importa `DeviceStatusCard.jsx` — ajuste o caminho relativo
  conforme onde cada um ficar.

**Se o main for CommonJS**, converta os dois `.js`:
- Troque `export function x` por `function x` + `module.exports = { x }`.
- Troque `import { diagnose } from './adbDiagnostics.js'` por
  `const { diagnose } = require('./adbDiagnostics.js')`.
- Troque `import { execFile } from 'node:child_process'` por
  `const { execFile } = require('node:child_process')`, e o mesmo para
  `node:util`.

---

## Passo 3 — Ponte IPC no preload

Adicione ao arquivo de preload existente (não substitua o que já houver):

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dexarmor', {
  checkDevices: (opts) => ipcRenderer.invoke('adb:check', opts),
  onPhase: (cb) => {
    const handler = (_e, fase) => cb(fase);
    ipcRenderer.on('adb:phase', handler);
    return () => ipcRenderer.removeListener('adb:phase', handler); // cleanup
  },
});
```

Confirme que a `BrowserWindow` usa este preload e está com isolamento de contexto
ligado:

```js
webPreferences: {
  preload: /* caminho do preload */,
  contextIsolation: true,
  nodeIntegration: false,
}
```

Se o objeto `window.dexarmor` já existir para outras finalidades, **mescle** estas
duas funções nele em vez de criar outro.

---

## Passo 4 — Handler no processo main + caminho do ADB

No processo main, registre o handler que chama o orquestrador. **Importante:** o app
depende do binário do ADB, então não confie no `adb` do PATH do usuário — aponte para
o binário empacotado.

```js
const { app, ipcMain } = require('electron');
const path = require('node:path');
// Ajuste para import se o main for ESM:
const { checkDevices } = require('./adb/adbOrchestrator.js');

function getAdbPath() {
  if (app.isPackaged) {
    const bin = process.platform === 'win32' ? 'adb.exe' : 'adb';
    // platform-tools empacotado via extraResources (veja abaixo)
    return path.join(process.resourcesPath, 'platform-tools', bin);
  }
  return 'adb'; // em desenvolvimento, usa o ADB do PATH
}

ipcMain.handle('adb:check', async (event, opts = {}) => {
  return checkDevices({
    adbPath: getAdbPath(),
    recover: opts.recover ?? true,
    onStatus: (fase) => event.sender.send('adb:phase', fase),
  });
});
```

### Empacotar o binário do ADB (electron-builder)

Coloque o `platform-tools` (com o `adb`/`adb.exe` e as DLLs no Windows) em
`resources/platform-tools/` e adicione ao `package.json`:

```json
"build": {
  "extraResources": [
    { "from": "resources/platform-tools", "to": "platform-tools" }
  ]
}
```

> Se o projeto usa outro empacotador (electron-forge, etc.), faça o equivalente para
> copiar `platform-tools` para os resources e ajuste `getAdbPath()`.

---

## Passo 5 — Monte a tela no renderer

Onde o app decide qual tela mostrar, renderize a `ConnectPhoneScreen`. Garanta que ela
esteja dentro do `ThemeProvider` do MUI (provavelmente já está, no topo do app):

```jsx
import ConnectPhoneScreen from './screens/ConnectPhoneScreen.jsx';

// ...
<ConnectPhoneScreen
  onReady={(resultado) => {
    // Galaxy pronto e confirmado pelo usuário — siga para o provisionamento.
    // ex.: navegar para a próxima etapa do fluxo do DexArmor.
  }}
/>
```

Opções úteis: `pollIntervalMs` (padrão 2000) e `autoAdvance` (padrão `false`; se
`true`, chama `onReady` automaticamente ao detectar o dispositivo pronto, sem clique).

---

## Passo 6 — Verificação

Após integrar, valide:

1. **Build do main** sem erros de módulo (ESM/CJS coerente).
2. **Sem telefone conectado:** a tela mostra "Nenhum Galaxy detectado" com os passos
   de cabo/depuração USB.
3. **Telefone conectado sem autorizar:** o cartão mostra "Autorize o computador no
   telefone" e os passos; ao tocar em Permitir no aparelho, a tela avança em ~2s.
4. **`window.dexarmor`** existe no renderer (cheque no DevTools) — confirma que o
   preload carregou.
5. **App empacotado:** `getAdbPath()` resolve para o binário em `resources` e o ADB
   funciona sem instalação manual pelo usuário.

---

## Notas importantes

- **Não há risco de loop de recuperação.** O reinício do servidor ADB roda no máximo
  uma vez por rodada (controlado internamente). Não adicione `recover: true` em
  chamadas de polling repetidas — a `ConnectPhoneScreen` já cuida disso.
- **`waitForReadyDevice()`** (exportada pelo orquestrador) existe para esperas
  *headless* (sem UI). A tela **não** a usa, de propósito: o polling no renderer
  permite mostrar o diagnóstico ao vivo durante a espera.
- **Linguagem ao usuário:** as mensagens em `adbDiagnostics.js` estão em pt-BR e em
  linguagem simples. Ajuste o texto lá (um único lugar) se quiser mudar o tom — a UI
  apenas renderiza.
- **Autorização é barreira de segurança:** o app sempre dependerá de o usuário tocar
  em "Permitir" no aparelho; não há como contornar isso, e o fluxo já o guia até lá.
