# Changeset — Etapa "DeX vs Experiência de TV"

Instruções para o Claude Code aplicar no projeto DexArmor existente.
**2 arquivos novos** e **2 arquivos editados**.

A etapa aparece como um botão "DeX vs Experiência de TV" abaixo do botão de
aplicar (visível quando o aparelho está validado). Ao clicar, abre um diálogo
com duas telas: (1) explicação da diferença DeX vs TV, (2) guia passo a passo
para desativar o DeX, com os passos variando por versão do One UI.

---

## 1. ARQUIVO NOVO: `src/renderer/data/dexGuide.js`

Criar com o conteúdo completo abaixo:

```js
// src/renderer/data/dexGuide.js
// Conteúdo da etapa "DeX vs Experiência de TV".
//
// Duas partes:
//   1) EXPLAIN  — por que essa etapa existe (a diferença entre DeX e TV).
//   2) STEPS    — como desligar o DeX, com variação por versão do One UI,
//                 porque a Samsung mudou o caminho no One UI 8 (Android 16).

export const DEX_EXPLAIN = {
  intro: 'Alguns aparelhos Samsung têm o modo DeX. Ao conectar no HDMI, o DeX abre sozinho e assume a tela — e isso atrapalha a experiência de TV que acabamos de montar.',
  compare: [
    {
      icon: 'DesktopWindows',
      title: 'Modo DeX',
      desc: 'Abre uma área de trabalho parecida com um computador. Pensado para produtividade, com janelas e mouse — não para assistir TV no sofá.',
      tone: 'muted',
    },
    {
      icon: 'Tv',
      title: 'Experiência de TV',
      desc: 'Abre direto no launcher de TV, com navegação simples pelo controle. É o que queremos para usar o aparelho como uma TV box.',
      tone: 'accent',
    },
  ],
  conclusion: 'Por isso, em aparelhos com DeX, é preciso desativar a abertura automática dele. Sem DeX no caminho, o celular abre direto na interface de TV ao ligar no HDMI.',
};

export const DEX_VERSIONS = [
  {
    id: 'ui67',
    label: 'One UI 6 / 7',
    hint: 'Android 14 / 15 — a maioria dos aparelhos hoje',
    steps: [
      { icon: 'Settings', title: 'Abra os Ajustes', body: 'No celular, vá em Ajustes › Dispositivos conectados.' },
      { icon: 'DesktopWindows', title: 'Entre no Samsung DeX', body: 'Toque em "Samsung DeX".' },
      { icon: 'ToggleOff', title: 'Desligue a abertura automática', body: 'Desative "Iniciar automaticamente quando o HDMI for conectado".' },
      { icon: 'CheckCircle', title: 'Pronto', body: 'Agora, ao conectar no HDMI, o aparelho abre na interface de TV em vez do DeX.' },
    ],
  },
  {
    id: 'ui8',
    label: 'One UI 8',
    hint: 'Android 16 — aparelhos mais recentes',
    steps: [
      { icon: 'Settings', title: 'Abra os Ajustes', body: 'No celular, vá em Ajustes › Dispositivos conectados › Samsung DeX.' },
      { icon: 'Monitor', title: 'Entre em "Tela conectada"', body: 'Toque em "Tela conectada" (Connected display).' },
      { icon: 'ScreenShare', title: 'Escolha "Espelhar"', body: 'Selecione "Espelhar" em vez de "Estender". Espelhar abre a interface de TV; estender abre o DeX.' },
      { icon: 'CheckCircle', title: 'Pronto', body: 'O aparelho passa a espelhar a tela ao conectar no HDMI, abrindo direto no launcher de TV.' },
    ],
  },
  {
    id: 'nodex',
    label: 'Meu aparelho não tem DeX',
    hint: 'Ex.: Galaxy Z Flip e modelos de entrada',
    steps: [
      { icon: 'CheckCircle', title: 'Nada a fazer', body: 'Sem DeX, o aparelho já abre direto na interface de TV ao conectar no HDMI. Pode pular esta etapa.' },
    ],
  },
];

export const DEX_NOTE = 'Os nomes das opções podem variar um pouco conforme o modelo e a versão. Se não encontrar pelo caminho acima, busque por "DeX" na busca dos Ajustes.';
```

---

## 2. ARQUIVO NOVO: `src/renderer/components/DexGuideDialog.jsx`

Criar com o conteúdo completo abaixo:

```jsx
// src/renderer/components/DexGuideDialog.jsx
// Etapa "DeX vs Experiência de TV", exibida num diálogo após o aparelho ser
// reconhecido. Duas telas internas:
//   1) Explicação — por que desativar o DeX (comparação lado a lado).
//   2) Guia       — como fazer, com passos que variam por versão do One UI.

import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton,
  ToggleButtonGroup, ToggleButton, Divider, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import * as Icons from '@mui/icons-material';
import { DEX_EXPLAIN, DEX_VERSIONS, DEX_NOTE } from '../data/dexGuide';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function Ico({ name, ...props }) {
  const C = Icons[name] || Icons.HelpOutline;
  return <C {...props} />;
}

function Explain({ onNext }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 1 }}>
        DeX ou Experiência de TV?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.55, mb: 2.5 }}>
        {DEX_EXPLAIN.intro}
      </Typography>

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {DEX_EXPLAIN.compare.map((c) => {
          const accent = c.tone === 'accent';
          return (
            <Box key={c.title} sx={{
              display: 'flex', gap: 1.5, p: 1.5, borderRadius: 2,
              bgcolor: accent ? 'rgba(255,185,74,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${accent ? 'rgba(255,185,74,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '11px', flexShrink: 0,
                display: 'grid', placeItems: 'center',
                bgcolor: accent ? 'rgba(255,185,74,0.14)' : 'rgba(255,255,255,0.05)',
              }}>
                <Ico name={c.icon} sx={{ fontSize: 22, color: accent ? 'primary.main' : 'text.secondary' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.88rem', color: accent ? 'primary.main' : 'text.primary' }}>
                  {c.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', lineHeight: 1.45 }}>
                  {c.desc}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.83rem', lineHeight: 1.55, mb: 3 }}>
        {DEX_EXPLAIN.conclusion}
      </Typography>

      <Button variant="contained" color="primary" fullWidth size="large"
        onClick={onNext} sx={{ py: 1.3 }}>
        Como desativar o DeX
      </Button>
    </Box>
  );
}

function Guide({ onBack }) {
  const [ver, setVer] = useState('ui67');
  const version = DEX_VERSIONS.find((v) => v.id === ver);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 0.5 }}>
        Desativar o DeX
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Escolha a versão do seu aparelho.
      </Typography>

      <ToggleButtonGroup
        value={ver} exclusive size="small" fullWidth orientation="vertical"
        onChange={(_e, v) => v && setVer(v)}
        sx={{ mb: 2.5 }}
      >
        {DEX_VERSIONS.map((v) => (
          <ToggleButton key={v.id} value={v.id} sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>{v.label}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{v.hint}</Typography>
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {version.steps.map((s, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{
              width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
              display: 'grid', placeItems: 'center',
              bgcolor: 'rgba(255,185,74,0.12)', border: '1px solid rgba(255,185,74,0.22)',
            }}>
              <Ico name={s.icon} sx={{ fontSize: 17, color: 'primary.main' }} />
            </Box>
            <Box sx={{ flex: 1, pt: 0.2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>{s.title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', lineHeight: 1.45 }}>
                {s.body}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.45, display: 'block', mb: 2.5 }}>
        {DEX_NOTE}
      </Typography>

      <Stack direction="row" spacing={1}>
        <Button variant="text" color="inherit" startIcon={<ArrowBackIcon />}
          onClick={onBack} sx={{ color: 'text.secondary' }}>
          Voltar
        </Button>
      </Stack>
    </Box>
  );
}

export default function DexGuideDialog({ open, onClose }) {
  const [screen, setScreen] = useState('explain'); // 'explain' | 'guide'

  const handleClose = () => { setScreen('explain'); onClose(); };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={SlideUp}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: 'linear-gradient(160deg, #20242E 0%, #16151B 70%)',
          border: '1px solid rgba(255,185,74,0.18)',
        },
      }}
    >
      <IconButton onClick={handleClose} size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        {screen === 'explain'
          ? <Explain onNext={() => setScreen('guide')} />
          : <Guide onBack={() => setScreen('explain')} />}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 3. EDITAR: `src/renderer/App.jsx`

### 3a. Importar o diálogo (após o import de CloseDialog):

ENCONTRAR:
```jsx
import CloseDialog from './components/CloseDialog';
import { TASK_GROUPS } from './data/tasks';
```
SUBSTITUIR POR:
```jsx
import CloseDialog from './components/CloseDialog';
import DexGuideDialog from './components/DexGuideDialog';
import { TASK_GROUPS } from './data/tasks';
```

### 3b. Adicionar o estado (junto aos outros useState, perto de leftView):

ENCONTRAR:
```jsx
  const [leftView, setLeftView] = useState('mods'); // 'mods' | 'accessories'
```
SUBSTITUIR POR:
```jsx
  const [leftView, setLeftView] = useState('mods'); // 'mods' | 'accessories'
  // Diálogo da etapa "DeX vs Experiência de TV".
  const [dexGuide, setDexGuide] = useState(false);
```

### 3c. Passar a prop ao DevicePanel:

ENCONTRAR (a linha que fecha as props do DevicePanel — pode variar um pouco):
```jsx
            showAccessories={leftView === 'accessories'}
          />
```
SUBSTITUIR POR:
```jsx
            showAccessories={leftView === 'accessories'}
            onOpenDexGuide={() => setDexGuide(true)}
          />
```

### 3d. Renderizar o diálogo (após o <CloseDialog ... />):

ENCONTRAR:
```jsx
      <CloseDialog
        open={closePopup}
        onSeeAccessories={handleSeeAccessories}
        onConfirmClose={handleConfirmClose}
      />
```
SUBSTITUIR POR:
```jsx
      <CloseDialog
        open={closePopup}
        onSeeAccessories={handleSeeAccessories}
        onConfirmClose={handleConfirmClose}
      />

      {/* Etapa DeX vs Experiência de TV. */}
      <DexGuideDialog open={dexGuide} onClose={() => setDexGuide(false)} />
```

---

## 4. EDITAR: `src/renderer/components/DevicePanel.jsx`

### 4a. Importar o ícone de TV (após o import de CheckCircleIcon):

ENCONTRAR:
```jsx
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneMock from './PhoneMock';
```
SUBSTITUIR POR:
```jsx
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TvIcon from '@mui/icons-material/Tv';
import PhoneMock from './PhoneMock';
```

### 4b. Adicionar a prop na desestruturação:

ENCONTRAR:
```jsx
export default function DevicePanel({
  device, phase, onRun, running, ready, percent, currentLabel, showAccessories,
}) {
```
SUBSTITUIR POR:
```jsx
export default function DevicePanel({
  device, phase, onRun, running, ready, percent, currentLabel, showAccessories, onOpenDexGuide,
}) {
```

### 4c. Adicionar o botão da etapa (após o aviso "Selecione ao menos uma
modificação", ainda dentro do bloco da ficha técnica):

ENCONTRAR:
```jsx
          {!ready && !running && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Selecione ao menos uma modificação à esquerda.
            </Typography>
          )}
        </Box>
      </Collapse>
```
SUBSTITUIR POR:
```jsx
          {!ready && !running && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Selecione ao menos uma modificação à esquerda.
            </Typography>
          )}

          {/* Etapa opcional: configurar a saída de vídeo (desativar DeX).
              Relevante para aparelhos que têm DeX; inofensivo para os demais. */}
          <Button
            variant="text" color="primary" fullWidth startIcon={<TvIcon />}
            onClick={onOpenDexGuide}
            sx={{ mt: 1.5, fontSize: '0.82rem' }}
          >
            DeX vs Experiência de TV
          </Button>
        </Box>
      </Collapse>
```

---

## Resumo

| Arquivo | Ação |
|---------|------|
| `src/renderer/data/dexGuide.js` | criar (novo) |
| `src/renderer/components/DexGuideDialog.jsx` | criar (novo) |
| `src/renderer/App.jsx` | import + estado + 1 prop + render do diálogo |
| `src/renderer/components/DevicePanel.jsx` | import ícone + 1 prop + botão da etapa |

Depois de aplicar: `npm run dev`. Com o aparelho validado, aparece o botão
"DeX vs Experiência de TV" abaixo do botão de aplicar. Clicando, abre a
explicação e, ao avançar, o guia por versão do One UI.
