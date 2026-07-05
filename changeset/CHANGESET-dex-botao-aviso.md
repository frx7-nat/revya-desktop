# Changeset — Botão "Desativar DeX" + aviso do HDMI

Complementa o changeset anterior (`CHANGESET-dex-vs-tv.md`). Adiciona:
1. O aviso de que o menu do DeX só aparece com o HDMI conectado.
2. Um botão "DESATIVAR DEX" no topo do painel esquerdo (aba Modificações).

Pré-requisito: o changeset `CHANGESET-dex-vs-tv.md` já aplicado (o diálogo
DexGuideDialog e o estado `dexGuide` no App já existem).

**3 arquivos editados.** Nenhum arquivo novo.

---

## 1. EDITAR: `src/renderer/data/dexGuide.js`

Adicionar a constante do aviso ao final do arquivo, após `DEX_NOTE`:

ENCONTRAR:
```js
export const DEX_NOTE = 'Os nomes das opções podem variar um pouco conforme o modelo e a versão. Se não encontrar pelo caminho acima, busque por "DeX" na busca dos Ajustes.';
```
SUBSTITUIR POR:
```js
export const DEX_NOTE = 'Os nomes das opções podem variar um pouco conforme o modelo e a versão. Se não encontrar pelo caminho acima, busque por "DeX" na busca dos Ajustes.';

// Aviso importante: em muitos aparelhos (ex.: S21 FE), o menu do Samsung DeX
// só aparece nas configurações DEPOIS que o HDMI está conectado. Sem o cabo
// ligado, a opção fica indisponível. Por isso esta etapa costuma ser feita ao
// final, com o aparelho já na TV — não na primeira conexão ao computador.
export const DEX_HDMI_WARNING = 'O menu do DeX só aparece nas configurações com o aparelho já conectado à TV pelo HDMI. Sem o cabo ligado, a opção fica indisponível — por isso o ideal é fazer este passo ao final, já com o celular na TV.';
```

---

## 2. EDITAR: `src/renderer/components/DexGuideDialog.jsx`

### 2a. Importar o aviso e um ícone de info:

ENCONTRAR:
```jsx
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import * as Icons from '@mui/icons-material';
import { DEX_EXPLAIN, DEX_VERSIONS, DEX_NOTE } from '../data/dexGuide';
```
SUBSTITUIR POR:
```jsx
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import * as Icons from '@mui/icons-material';
import { DEX_EXPLAIN, DEX_VERSIONS, DEX_NOTE, DEX_HDMI_WARNING } from '../data/dexGuide';
```

### 2b. Adicionar o componente de aviso (logo após a função `Ico`):

ENCONTRAR:
```jsx
function Ico({ name, ...props }) {
  const C = Icons[name] || Icons.HelpOutline;
  return <C {...props} />;
}
```
SUBSTITUIR POR:
```jsx
function Ico({ name, ...props }) {
  const C = Icons[name] || Icons.HelpOutline;
  return <C {...props} />;
}

// Aviso destacado: o DeX só aparece nas configurações com o HDMI conectado.
function HdmiWarning() {
  return (
    <Stack direction="row" spacing={1.2} sx={{
      p: 1.5, borderRadius: 2, mb: 2.5,
      bgcolor: 'rgba(255,185,74,0.1)', border: '1px solid rgba(255,185,74,0.3)',
    }}>
      <InfoOutlinedIcon sx={{ fontSize: 20, color: 'primary.main', flexShrink: 0, mt: 0.1 }} />
      <Typography variant="caption" sx={{ fontSize: '0.76rem', lineHeight: 1.5, color: 'text.primary' }}>
        {DEX_HDMI_WARNING}
      </Typography>
    </Stack>
  );
}
```

### 2c. Mostrar o aviso na tela de explicação (após o parágrafo de intro):

ENCONTRAR:
```jsx
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.55, mb: 2.5 }}>
        {DEX_EXPLAIN.intro}
      </Typography>

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {DEX_EXPLAIN.compare.map((c) => {
```
SUBSTITUIR POR:
```jsx
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.55, mb: 2.5 }}>
        {DEX_EXPLAIN.intro}
      </Typography>

      <HdmiWarning />

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {DEX_EXPLAIN.compare.map((c) => {
```

### 2d. Mostrar o aviso no guia (antes da lista de passos, só p/ quem tem DeX):

ENCONTRAR (a primeira ocorrência, dentro da função `Guide`):
```jsx
      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {version.steps.map((s, i) => (
```
SUBSTITUIR POR:
```jsx
      {/* Aviso só para quem tem DeX (não faz sentido para 'nodex'). */}
      {ver !== 'nodex' && <HdmiWarning />}

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {version.steps.map((s, i) => (
```

(Atenção: há duas ocorrências de `<Stack spacing={1.5} sx={{ mb: 2.5 }}>` no
arquivo — uma em `Explain` e outra em `Guide`. Esta edição é na de `Guide`,
que vem logo após o bloco do `ToggleButtonGroup` de versões. Se o editor pedir,
escolha a que está depois de `version.steps`.)

---

## 3. EDITAR: `src/renderer/components/TaskPanel.jsx`

### 3a. Importar Button e TvIcon:

ENCONTRAR:
```jsx
import {
  Box, Typography, Checkbox, FormControlLabel, Divider, Stack,
  Accordion, AccordionSummary, AccordionDetails, ToggleButtonGroup, ToggleButton,
  Link, Chip, Collapse, IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { TASK_GROUPS, ACCESSORY_GROUPS } from '../data/tasks';
```
SUBSTITUIR POR:
```jsx
import {
  Box, Typography, Checkbox, FormControlLabel, Divider, Stack,
  Accordion, AccordionSummary, AccordionDetails, ToggleButtonGroup, ToggleButton,
  Link, Chip, Collapse, IconButton, Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TvIcon from '@mui/icons-material/Tv';
import { TASK_GROUPS, ACCESSORY_GROUPS } from '../data/tasks';
```

### 3b. Adicionar a prop `onOpenDexGuide` e o botão no topo da aba Modificações:

ENCONTRAR:
```jsx
export default function TaskPanel({ selected, completed, onToggle, disabled, view: viewProp, onViewChange }) {
```
SUBSTITUIR POR:
```jsx
export default function TaskPanel({ selected, completed, onToggle, disabled, view: viewProp, onViewChange, onOpenDexGuide }) {
```

ENCONTRAR (o bloco que renderiza a aba de modificações — abre com o map direto):
```jsx
      {view === 'accessories' ? (
        <AccessoriesView />
      ) : (
        TASK_GROUPS.map((group) => (
```
SUBSTITUIR POR:
```jsx
      {view === 'accessories' ? (
        <AccessoriesView />
      ) : (
        <>
          {/* Atalho fixo no topo: abre o tutorial de desativar o DeX.
              Fica antes das modificações por ser um passo à parte (guiado,
              não aplicado via ADB). */}
          <Button
            fullWidth variant="outlined" color="primary" startIcon={<TvIcon />}
            onClick={onOpenDexGuide}
            sx={{ mb: 2.5, py: 1, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em' }}
          >
            Desativar DeX
          </Button>

          {TASK_GROUPS.map((group) => (
```

### 3c. Fechar o fragmento no fim do map (era `))` + `)}`, vira `))` + `</>` + `)}`):

ENCONTRAR (final do componente):
```jsx
            <Divider sx={{ mt: 1.5 }} />
          </Box>
        ))
      )}
    </Box>
  );
}
```
SUBSTITUIR POR:
```jsx
            <Divider sx={{ mt: 1.5 }} />
          </Box>
          ))}
        </>
      )}
    </Box>
  );
}
```

---

## 4. EDITAR: `src/renderer/App.jsx`

Passar `onOpenDexGuide` também ao TaskPanel (além do DevicePanel, que já recebe).

ENCONTRAR:
```jsx
          <TaskPanel
            selected={selected} completed={completed} onToggle={toggle} disabled={running}
            view={leftView} onViewChange={setLeftView}
          />
```
SUBSTITUIR POR:
```jsx
          <TaskPanel
            selected={selected} completed={completed} onToggle={toggle} disabled={running}
            view={leftView} onViewChange={setLeftView}
            onOpenDexGuide={() => setDexGuide(true)}
          />
```

---

## Resumo

| Arquivo | Ação |
|---------|------|
| `src/renderer/data/dexGuide.js` | + constante `DEX_HDMI_WARNING` |
| `src/renderer/components/DexGuideDialog.jsx` | + componente de aviso, exibido nas 2 telas |
| `src/renderer/components/TaskPanel.jsx` | + botão "Desativar DeX" no topo + fragmento |
| `src/renderer/App.jsx` | + prop `onOpenDexGuide` no TaskPanel |

Depois de aplicar: o botão "DESATIVAR DEX" aparece no topo do painel esquerdo
(aba Modificações), e o diálogo passa a exibir o aviso sobre o HDMI nas duas
telas. O diálogo pode ser reaberto quantas vezes quiser, pelo botão do painel
esquerdo ou pelo botão no painel central.
