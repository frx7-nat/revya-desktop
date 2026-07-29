// src/renderer/components/SquareIcon.jsx
// Tile de ícone QUADRADO — assinatura do design de referência (BMW M):
// "sharp rectangles read as engineered precision". Canto reto (radius 0),
// fundo surface-card sobre o canvas, hairline de 1px. Usado nos cabeçalhos
// de seção das laterais e nos pontos de identidade do app.

import React from 'react';
import { Box } from '@mui/material';
import { TOK } from '../theme/tokens';

export default function SquareIcon({ children, size = 26 }) {
  return (
    <Box sx={{
      width: size, height: size, flexShrink: 0,
      borderRadius: 0,                       // {rounded.none} — o quadrado É a marca
      bgcolor: TOK.surfaceCard,
      border: `1px solid ${TOK.hairline}`,
      display: 'grid', placeItems: 'center',
    }}>
      {children}
    </Box>
  );
}
