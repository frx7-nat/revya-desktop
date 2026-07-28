// src/renderer/components/LanguageTab.jsx
// Troca de idioma, fixa no rodapé da coluna esquerda, logo acima do
// ContributeTab e no mesmo tom discreto: texto pequeno, cor secundária em
// repouso, âmbar só no hover.
//
// Por que um botão que ALTERNA, e não um menu: são dois idiomas. Um menu para
// duas opções é uma janela a mais para um usuário leigo fechar. O rótulo mostra
// o idioma PARA O QUAL se vai — "English" quando se está em português — porque
// é isso que a pessoa procura quando não entende a tela.

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useT } from '../i18n';

export default function LanguageTab() {
  const { t, language, setLanguage } = useT();
  const next = language === 'pt' ? 'en' : 'pt';

  return (
    <Box
      component="button"
      type="button"
      onClick={() => setLanguage(next)}
      aria-label={`${t('language.label')}: ${t(`language.${next}`)}`}
      sx={{
        flexShrink: 0, width: '100%', px: 2, py: 1.1,
        border: 'none', borderTop: '1px solid', borderColor: 'divider',
        bgcolor: 'transparent', cursor: 'pointer', textAlign: 'left',
        color: 'text.secondary', transition: 'color .15s ease, background-color .15s ease',
        '&:hover': { color: 'primary.main', bgcolor: 'rgba(255,185,74,0.06)' },
      }}
    >
      <Stack direction="row" spacing={0.9} alignItems="center">
        <TranslateIcon sx={{ fontSize: 15, flexShrink: 0 }} />
        <Typography variant="caption" sx={{
          fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.02em',
          color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {t(`language.${next}`)}
        </Typography>
      </Stack>
    </Box>
  );
}
