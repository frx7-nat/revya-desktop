// src/renderer/components/ContributeTab.jsx
// Aba discreta no CANTO INFERIOR ESQUERDO da janela: fica fixa no rodapé da
// coluna esquerda (fora da área que rola), abre o ContributeDialog ao clique.
//
// Deliberadamente pouco chamativa: texto pequeno em tom secundário, sem cor
// de destaque em repouso — o âmbar só aparece no hover. É um convite, não uma
// cobrança; nunca abre sozinha.

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { CONTRIBUTE } from '../data/contribute';
import { useT } from '../i18n';

export default function ContributeTab({ onClick }) {
  const { t } = useT();
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={t(CONTRIBUTE.tabLabelKey)}
      sx={{
        flexShrink: 0, width: '100%', px: 2, py: 1.1,
        border: 'none', borderTop: '1px solid', borderColor: 'divider',
        bgcolor: 'transparent', cursor: 'pointer', textAlign: 'left',
        color: 'text.secondary', transition: 'color .15s ease, background-color .15s ease',
        '&:hover': { color: 'primary.main', bgcolor: 'rgba(255,185,74,0.06)' },
      }}
    >
      <Stack direction="row" spacing={0.9} alignItems="center">
        <FavoriteBorderIcon sx={{ fontSize: 15, flexShrink: 0 }} />
        <Typography variant="caption" sx={{
          fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.02em',
          color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {t(CONTRIBUTE.tabLabelKey)}
        </Typography>
      </Stack>
    </Box>
  );
}
