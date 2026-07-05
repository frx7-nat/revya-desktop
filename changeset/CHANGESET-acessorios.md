# Changeset — Acessórios flutuantes ao redor do celular

Instruções para o Claude Code aplicar no projeto DexArmor existente.
São **1 arquivo novo** e **2 arquivos editados**. Nada mais muda.

---

## 1. ARQUIVO NOVO: `src/renderer/components/PhoneAccessories.jsx`

Criar este arquivo com o conteúdo completo abaixo:

```jsx
// src/renderer/components/PhoneAccessories.jsx
// Acessórios que surgem ao redor do celular quando a aba "Acessórios" está
// ativa. O celular permanece fixo; os acessórios apenas aparecem (fade + leve
// escala) e flutuam de forma contínua e sutil, cada um no seu ritmo.
//
// Desenhados em CSS no mesmo padrão do PhoneMock (chassi escuro, acento âmbar),
// com base nas referências reais: hub UGREEN, controle SKY-9346, caixa Anker e
// joystick DualSense. Sem texto e sem fios de conexão — só o visual.

import React from 'react';
import { Box } from '@mui/material';

const ACC_BG = 'linear-gradient(155deg, #33333a, #1c1c22)';
const ACC_BORDER = '1px solid rgba(255,255,255,0.08)';

const floatKeyframes = {
  '@keyframes accFloatA': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
  '@keyframes accFloatB': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
  '@keyframes accFloatC': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
  '@keyframes accFloatD': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
  '@keyframes accFade': { '0%': { opacity: 0, transform: 'scale(0.82)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
};

function Acc({ show, pos, fadeDelay, floatName, floatDur, children }) {
  return (
    <Box sx={{
      position: 'absolute', ...pos, zIndex: 2,
      opacity: show ? 1 : 0,
      transform: show ? 'scale(1)' : 'scale(0.82)',
      transition: 'opacity .45s ease, transform .45s ease',
      transitionDelay: show ? `${fadeDelay}s` : '0s',
      pointerEvents: 'none',
    }}>
      <Box sx={{
        animation: show ? `${floatName} ${floatDur}s ease-in-out infinite` : 'none',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        ...floatKeyframes,
      }}>
        {children}
      </Box>
    </Box>
  );
}

export default function PhoneAccessories({ show }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* HUB HDMI (UGREEN) — topo esquerda */}
      <Acc show={show} pos={{ left: 8, top: 70 }} fadeDelay={0.15} floatName="accFloatA" floatDur={4.5}>
        <Box sx={{ width: 104, height: 42, borderRadius: '9px', p: '7px 9px', display: 'flex', alignItems: 'center', gap: '6px', background: ACC_BG, border: ACC_BORDER }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
            <Box sx={{ height: 5, borderRadius: '2px', bgcolor: '#3a3a42' }} />
            <Box sx={{ display: 'flex', gap: '3px' }}>
              {[0, 1, 2].map((i) => <Box key={i} sx={{ width: 9, height: 7, borderRadius: '1px', bgcolor: '#46464e' }} />)}
            </Box>
          </Box>
          <Box sx={{ width: 14, height: 2, bgcolor: '#EF9F27', opacity: 0.5, borderRadius: '1px' }} />
        </Box>
      </Acc>

      {/* CONTROLE REMOTO (SKY-9346) — topo direita, próximo do celular */}
      <Acc show={show} pos={{ right: 52, top: 46 }} fadeDelay={0.3} floatName="accFloatB" floatDur={5.2}>
        <Box sx={{ width: 46, height: 104, borderRadius: '11px', p: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: ACC_BG, border: ACC_BORDER }}>
          <Box sx={{ display: 'flex', gap: '5px', width: '100%', justifyContent: 'center' }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#E24B4A' }} />
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#3a3a42' }} />
          </Box>
          <Box sx={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #3a3a42', display: 'grid', placeItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#46464e' }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
            <Box sx={{ width: 18, height: 4, borderRadius: '2px', bgcolor: '#3a3a42' }} />
            <Box sx={{ width: 18, height: 4, borderRadius: '2px', bgcolor: '#3a3a42' }} />
          </Box>
        </Box>
      </Acc>

      {/* CAIXA DE SOM (Anker) — base esquerda */}
      <Acc show={show} pos={{ left: 0, top: 296 }} fadeDelay={0.45} floatName="accFloatC" floatDur={4.8}>
        <Box sx={{ width: 114, height: 46, borderRadius: '10px', p: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', background: ACC_BG, border: ACC_BORDER }}>
          <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'center', opacity: 0.5 }}>
            <PlayerIcon />
          </Box>
          <Box sx={{ height: 18, borderRadius: '4px', background: 'repeating-linear-gradient(90deg, #2a2a30, #2a2a30 1px, #1c1c22 1px, #1c1c22 3px)' }} />
        </Box>
      </Acc>

      {/* JOYSTICK (DualSense) — base direita */}
      <Acc show={show} pos={{ right: 4, top: 294 }} fadeDelay={0.6} floatName="accFloatD" floatDur={5.5}>
        <Box sx={{ width: 88, height: 56, borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: '11px', position: 'relative', background: ACC_BG, border: ACC_BORDER }}>
          <Box sx={{ position: 'relative', width: 16, height: 16 }}>
            <Box sx={{ position: 'absolute', left: 5, top: 0, width: 6, height: 16, borderRadius: '2px', bgcolor: '#3a3a42' }} />
            <Box sx={{ position: 'absolute', left: 0, top: 5, width: 16, height: 6, borderRadius: '2px', bgcolor: '#3a3a42' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: '5px' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3a3a42' }} />
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', border: '1px solid #46464e' }} />
          </Box>
          <Box sx={{ position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)', width: 14, height: 3, borderRadius: '2px', bgcolor: '#185FA5', opacity: 0.6 }} />
        </Box>
      </Acc>
    </Box>
  );
}

function PlayerIcon() {
  return (
    <Box component="svg" viewBox="0 0 30 20" sx={{ width: 30, height: 10 }}>
      <path d="M3 4 L9 10 L3 16 Z" fill="#9A968E" />
      <path d="M13 4 L13 16 M13 10 L20 5 L20 15 Z" fill="none" stroke="#9A968E" strokeWidth="1.2" />
      <path d="M24 4 L24 16 M24 10 L29 6 L29 14 Z" fill="#9A968E" />
    </Box>
  );
}
```

---

## 2. EDITAR: `src/renderer/App.jsx`

Na renderização do `<DevicePanel ... />`, adicionar a prop `showAccessories`.

ENCONTRAR:
```jsx
          <DevicePanel
            device={device} phase={phase} scanning={scanning} onRefresh={scan}
            onRun={run} running={running} ready={ready}
            percent={percent} currentLabel={currentLabel}
          />
```

SUBSTITUIR POR:
```jsx
          <DevicePanel
            device={device} phase={phase} scanning={scanning} onRefresh={scan}
            onRun={run} running={running} ready={ready}
            percent={percent} currentLabel={currentLabel}
            showAccessories={leftView === 'accessories'}
          />
```

(O estado `leftView` já existe no App, vindo da feature do pop-up de fechamento.
Se por algum motivo não existir, adicionar junto aos outros useState:
`const [leftView, setLeftView] = useState('mods');` e passar
`view={leftView} onViewChange={setLeftView}` ao `<TaskPanel>`.)

---

## 3. EDITAR: `src/renderer/components/DevicePanel.jsx`

### 3a. Adicionar o import (logo após o import de PhoneScreen):

ENCONTRAR:
```jsx
import PhoneMock from './PhoneMock';
import PhoneScreen from './PhoneScreen';
```

SUBSTITUIR POR:
```jsx
import PhoneMock from './PhoneMock';
import PhoneScreen from './PhoneScreen';
import PhoneAccessories from './PhoneAccessories';
```

### 3b. Adicionar `showAccessories` na desestruturação das props:

ENCONTRAR:
```jsx
export default function DevicePanel({
  device, phase, onRun, running, ready, percent, currentLabel,
}) {
```

SUBSTITUIR POR:
```jsx
export default function DevicePanel({
  device, phase, onRun, running, ready, percent, currentLabel, showAccessories,
}) {
```

### 3c. Envolver o `<PhoneMock>` num container com os acessórios:

ENCONTRAR:
```jsx
      {/* Celular no centro. Após a 1ª configuração (isTv), ele gira para
          horizontal e cresce, simulando virar uma TV. */}
      <PhoneMock glow={validated} scanning={searching} tv={isTv}>
        <PhoneScreen
          phase={phase}
          model={device?.model}
          percent={percent}
          currentLabel={currentLabel}
        />
      </PhoneMock>
```

SUBSTITUIR POR:
```jsx
      {/* Container que emoldura o celular e seus acessórios flutuantes.
          Os acessórios surgem ao redor quando a aba Acessórios está ativa
          (exceto no modo TV, onde o celular girado ocupa o espaço). */}
      <Box sx={{ position: 'relative', width: 440, display: 'flex', justifyContent: 'center' }}>
        <PhoneAccessories show={!!showAccessories && !isTv} />

        {/* Celular no centro. Após a 1ª configuração (isTv), ele gira para
            horizontal e cresce, simulando virar uma TV. */}
        <PhoneMock glow={validated} scanning={searching} tv={isTv}>
          <PhoneScreen
            phase={phase}
            model={device?.model}
            percent={percent}
            currentLabel={currentLabel}
          />
        </PhoneMock>
      </Box>
```

---

## Resumo

| Arquivo | Ação |
|---------|------|
| `src/renderer/components/PhoneAccessories.jsx` | criar (novo) |
| `src/renderer/App.jsx` | +1 prop em `<DevicePanel>` |
| `src/renderer/components/DevicePanel.jsx` | +1 import, +1 prop, envolver `<PhoneMock>` |

Depois de aplicar: `npm run dev`. Ao clicar na aba "Acessórios" (coluna
esquerda), os quatro acessórios surgem flutuando ao redor do celular. Ao voltar
para "Modificações", recolhem suavemente.
```
