// src/renderer/components/FirstSetupGuideDialog.jsx
// Guia de PRIMEIRA CONFIGURAÇÃO: aparece uma única vez por aparelho, quando
// um celular sem nenhuma configuração conecta (o App marca introSeen nas
// preferências do aparelho ao fechar). Pode ser reaberto pelo botão discreto
// "Guia de primeiros passos" na coluna esquerda.
//
// Mesmo padrão visual do DexGuideDialog: passos com ícone, tom âmbar.

import React from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as Icons from '@mui/icons-material';
import { FIRST_GUIDE } from '../data/firstSetupGuide';
import { useT } from '../i18n';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function Ico({ name, ...props }) {
  const C = Icons[name] || Icons.HelpOutline;
  return <C {...props} />;
}

export default function FirstSetupGuideDialog({ open, onClose }) {
  const { t } = useT();
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <IconButton onClick={onClose} size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 1 }}>
          {t(FIRST_GUIDE.titleKey)}
        </Typography>
        <Typography variant="body2" color="text.secondary"
          sx={{ fontSize: '0.85rem', lineHeight: 1.55, mb: 2.5 }}>
          {t(FIRST_GUIDE.introKey)}
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {FIRST_GUIDE.steps.map((s) => (
            <Stack key={s.key} direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                display: 'grid', placeItems: 'center',
                bgcolor: 'rgba(255,185,74,0.12)', border: '1px solid rgba(255,185,74,0.22)',
              }}>
                <Ico name={s.icon} sx={{ fontSize: 19, color: 'primary.main' }} />
              </Box>
              <Box sx={{ flex: 1, pt: 0.1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.86rem' }}>
                  {t(`${s.key}.title`)}
                </Typography>
                <Typography variant="caption" color="text.secondary"
                  sx={{ fontSize: '0.76rem', lineHeight: 1.45 }}>
                  {t(`${s.key}.body`)}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Button variant="contained" color="primary" fullWidth size="large"
          onClick={onClose} sx={{ py: 1.3 }}>
          {t(FIRST_GUIDE.actionKey)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
