// src/renderer/components/PhoneScreen.jsx
// O que aparece DENTRO da tela do PhoneMock, conforme a fase da conexão:
//
//   'tutorial'    -> passo a passo com ícone por etapa + "procurando" fixo
//   'waiting'     -> cabo detectado, aguardando o usuário autorizar
//   'success'     -> aparelho validado, com brilho de confirmação
//   'working'     -> provisionamento em andamento (espelha o progresso)

import React, { useState } from 'react';
import {
  Box, Typography, Stack, Button, CircularProgress, LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UsbIcon from '@mui/icons-material/Usb';
import TvIcon from '@mui/icons-material/Tv';
import * as Icons from '@mui/icons-material';
import { TUTORIAL_STEPS } from '../data/tutorial';

// Resolve o ícone do passo pelo nome salvo em tutorial.js.
function StepIcon({ name, ...props }) {
  const Ico = Icons[name] || Icons.HelpOutline;
  return <Ico {...props} />;
}

// Pílula "procurando dispositivo" com um ponto que pulsa — sinaliza que o app
// está ativamente escutando o ADB, em TODOS os passos (não só no último).
function SearchingPill() {
  return (
    <Stack direction="row" alignItems="center" spacing={0.8} justifyContent="center"
      sx={{ opacity: 0.8 }}>
      <Box sx={{
        width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main',
        animation: 'pulse 1.4s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.35, transform: 'scale(0.8)' },
          '50%': { opacity: 1, transform: 'scale(1.15)', boxShadow: '0 0 8px rgba(255,185,74,0.7)' },
        },
      }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: '0.02em' }}>
        Procurando dispositivo…
      </Typography>
    </Stack>
  );
}

// --- Tela de tutorial: um passo por vez, com ícone, avançar/voltar ---
function Tutorial() {
  const [i, setI] = useState(0);
  const step = TUTORIAL_STEPS[i];
  const last = i === TUTORIAL_STEPS.length - 1;

  return (
    <Stack sx={{ height: '100%' }} justifyContent="space-between">
      <Box>
        {/* Ícone temático da etapa, num círculo com leve halo âmbar */}
        <Box sx={{
          width: 46, height: 46, borderRadius: '14px', mb: 1.5,
          display: 'grid', placeItems: 'center',
          bgcolor: 'rgba(255,185,74,0.12)',
          border: '1px solid rgba(255,185,74,0.25)',
        }}>
          <StepIcon name={step.icon} sx={{ color: 'primary.main', fontSize: 24 }} />
        </Box>

        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.08em' }}>
          PASSO {step.n} DE {TUTORIAL_STEPS.length}
        </Typography>
        <Typography variant="h6" sx={{ fontSize: '1.02rem', mt: 0.5, mb: 1.5, lineHeight: 1.2 }}>
          {step.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
          {step.body}
        </Typography>
      </Box>

      <Box>
        {/* Progresso em pontos: o atual vira uma barrinha */}
        <Stack direction="row" spacing={0.7} justifyContent="center" sx={{ mb: 1.8 }}>
          {TUTORIAL_STEPS.map((_, idx) => (
            <Box key={idx} sx={{
              width: idx === i ? 18 : 6, height: 6, borderRadius: 3,
              bgcolor: idx === i ? 'primary.main' : idx < i ? 'rgba(255,185,74,0.45)' : 'rgba(255,255,255,0.18)',
              transition: 'all .3s ease',
            }} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Button size="small" fullWidth variant="text" color="inherit"
            disabled={i === 0} onClick={() => setI(i - 1)}
            sx={{ opacity: i === 0 ? 0.3 : 0.7 }}>
            Voltar
          </Button>
          {!last && (
            <Button size="small" fullWidth variant="contained" color="primary" onClick={() => setI(i + 1)}>
              Avançar
            </Button>
          )}
        </Stack>
        {/* Indicador persistente — presente em todos os passos */}
        <SearchingPill />
      </Box>
    </Stack>
  );
}

// --- Cabo detectado, mas ainda não autorizado ---
function Waiting() {
  return (
    <Stack sx={{ height: '100%' }} justifyContent="center" alignItems="center" spacing={2.5} textAlign="center">
      <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={64} thickness={2} color="primary" />
        <UsbIcon color="primary" sx={{ position: 'absolute' }} />
      </Box>
      <Typography variant="h6" sx={{ fontSize: '1rem' }}>Quase lá</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
        Cabo conectado. Na tela do celular, toque em "Permitir" para autorizar
        este computador.
      </Typography>
    </Stack>
  );
}

// --- Validado: sucesso, com brilho radial e check que "estoura" ---
function Success({ model }) {
  return (
    <Stack sx={{ height: '100%' }} justifyContent="center" alignItems="center" spacing={2} textAlign="center">
      <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        {/* halo radial de fundo */}
        <Box sx={{
          position: 'absolute', width: 130, height: 130, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(61,220,151,0.25) 0%, transparent 70%)',
          animation: 'halo .6s ease',
          '@keyframes halo': { '0%': { transform: 'scale(0.4)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        }} />
        <Box sx={{
          width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center',
          bgcolor: 'rgba(61,220,151,0.14)',
          animation: 'pop .45s cubic-bezier(.2,1.4,.4,1)',
          '@keyframes pop': { '0%': { transform: 'scale(0.5)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 42 }} />
        </Box>
      </Box>
      <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>Conectado!</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
        {model ? `${model} validado.` : 'Aparelho validado.'} Pode escolher as
        modificações e prosseguir.
      </Typography>
    </Stack>
  );
}

// --- Provisionamento em andamento ---
function Working({ percent, currentLabel }) {
  return (
    <Stack sx={{ height: '100%' }} justifyContent="center" alignItems="center" spacing={2.5} textAlign="center">
      <Box sx={{
        width: 58, height: 58, borderRadius: '50%', display: 'grid', placeItems: 'center',
        bgcolor: 'rgba(255,185,74,0.12)',
        animation: 'breathe 2s ease-in-out infinite',
        '@keyframes breathe': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' } },
      }}>
        <TvIcon color="primary" sx={{ fontSize: 30 }} />
      </Box>
      <Typography variant="h6" sx={{ fontSize: '1rem' }}>Preparando seu TV box</Typography>
      <Box sx={{ width: '100%' }}>
        <LinearProgress variant="determinate" value={percent}
          sx={{ height: 6, borderRadius: 3 }} />
        <Typography variant="caption" color="primary" sx={{ fontWeight: 700, display: 'block', mt: 0.8 }}>
          {Math.round(percent)}%
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ minHeight: 28 }}>
        {currentLabel || 'Aplicando…'}
      </Typography>
    </Stack>
  );
}

// --- Transformado em TV: configuração concluída ---
function TvReady({ model }) {
  return (
    <Stack sx={{ height: '100%' }} justifyContent="center" alignItems="center" spacing={1.5} textAlign="center">
      <TvIcon color="primary" sx={{ fontSize: 34 }} />
      <Typography variant="h6" sx={{ fontSize: '0.95rem' }}>Seu TV box está pronto</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.5, maxWidth: 260 }}>
        {model ? `${model} ` : ''}configurado. Desconecte o cabo e ligue na TV
        pela saída HDMI.
      </Typography>
    </Stack>
  );
}

export default function PhoneScreen({ phase, model, percent, currentLabel }) {
  switch (phase) {
    case 'waiting': return <Waiting />;
    case 'success': return <Success model={model} />;
    case 'working': return <Working percent={percent} currentLabel={currentLabel} />;
    case 'tv': return <TvReady model={model} />;
    case 'tutorial':
    default: return <Tutorial />;
  }
}
