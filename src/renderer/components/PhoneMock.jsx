// src/renderer/components/PhoneMock.jsx
// Mockup de um Galaxy no centro da aba do meio. A "tela" muda conforme o estado
// da conexão — elemento-assinatura do app.
//
// Transformação TV (prop `tv`): após a primeira configuração, o conjunto gira
// 90° e cresce, simulando o celular virando uma TV. A tela interna faz uma
// contra-rotação para o conteúdo permanecer na horizontal e legível.

import React from 'react';
import { Box } from '@mui/material';

export default function PhoneMock({ children, glow, scanning, tv }) {
  return (
    // Wrapper de transformação: rotaciona e escala o aparelho inteiro.
    // O scale aproveita o espaço da tela ao deitar (o lado longo vira largura).
    <Box sx={{
      position: 'relative',
      transformOrigin: 'center center',
      transform: tv ? 'rotate(90deg) scale(1.35)' : 'rotate(0deg) scale(1)',
      transition: 'transform 1.1s cubic-bezier(.65,0,.35,1)',
      my: tv ? 6 : 0,
    }}>
      <Box sx={{ position: 'relative', width: 244, height: 512, flexShrink: 0 }}>
        {/* Anéis de "scan" — só na fase de busca. */}
        {scanning && [0, 1].map((k) => (
          <Box key={k} sx={{
            position: 'absolute', inset: -6, borderRadius: '40px',
            border: '1px solid rgba(255,185,74,0.35)', pointerEvents: 'none',
            animation: `scanring 2.6s ease-out ${k * 1.3}s infinite`,
            '@keyframes scanring': {
              '0%': { transform: 'scale(1)', opacity: 0.5 },
              '100%': { transform: 'scale(1.06)', opacity: 0 },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 },
          }} />
        ))}

        {/* Botões laterais */}
        <Box sx={btn(132, 'right')} />
        <Box sx={btn(180, 'right', 54)} />
        <Box sx={btn(150, 'left', 40)} />

        {/* Chassi */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '34px',
          background: 'linear-gradient(150deg, #2A2A30 0%, #17171B 60%)',
          padding: '7px',
          boxShadow: glow
            ? '0 0 0 1px rgba(255,185,74,0.4), 0 24px 60px -20px rgba(255,185,74,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 24px 50px -24px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)',
          transition: 'box-shadow .5s ease',
        }}>
          {/* Tela */}
          <Box sx={{
            position: 'relative', width: '100%', height: '100%',
            borderRadius: '28px', overflow: 'hidden',
            background: 'radial-gradient(120% 90% at 50% 0%, #1d1c24 0%, #121117 70%)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Câmera punch-hole (some no modo TV, onde não faz sentido) */}
            {!tv && (
              <Box sx={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                width: 9, height: 9, borderRadius: '50%',
                background: '#0a0a0c', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.08)',
                zIndex: 3,
              }} />
            )}
            {/* Conteúdo: contra-rotaciona no modo TV para ficar na horizontal. */}
            <Box sx={{
              position: 'relative', flex: 1,
              pt: tv ? 2 : '34px', px: 2.5, pb: 2.5,
              display: 'flex', flexDirection: 'column',
              transform: tv ? 'rotate(-90deg)' : 'none',
              transition: 'transform 1.1s cubic-bezier(.65,0,.35,1)',
            }}>
              {children}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// Helper para os botões laterais do chassi.
function btn(top, side, height = 30) {
  return {
    position: 'absolute', top, [side]: -2, width: 3, height,
    borderRadius: 2, background: '#0e0e11', zIndex: 0,
  };
}
