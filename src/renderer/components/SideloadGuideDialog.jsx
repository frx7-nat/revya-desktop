// src/renderer/components/SideloadGuideDialog.jsx
// Aviso "Como instalar apps e enviar arquivos" — o que ficou no lugar do
// antigo catálogo de APKs (o DexArmor não distribui apps de terceiros).
// Abre pelo botão do grupo "Instalar o launcher de TV", na coluna esquerda.
//
// Mesmo padrão visual do FirstSetupGuideDialog e do DexGuideDialog: passos
// com ícone em caixa âmbar, texto curto, um botão de fechar.

import React from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton, Slide, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import * as Icons from '@mui/icons-material';
import { SIDELOAD_GUIDE } from '../data/sideloadGuide';
import { useT } from '../i18n';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function Ico({ name, ...props }) {
  const C = Icons[name] || Icons.HelpOutline;
  return <C {...props} />;
}

export default function SideloadGuideDialog({ open, onClose }) {
  const { t, tList } = useT();
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
          {t(SIDELOAD_GUIDE.titleKey)}
        </Typography>
        <Typography variant="body2" color="text.secondary"
          sx={{ fontSize: '0.85rem', lineHeight: 1.55, mb: 2.5 }}>
          {t(SIDELOAD_GUIDE.introKey)}
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          {SIDELOAD_GUIDE.steps.map((s) => (
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

        <Divider sx={{ mb: 2 }} />

        {/* Observações: as dúvidas mais comuns de quem nunca instalou um app
            fora da loja, no mesmo tom de aviso do guia do DeX. */}
        <Stack spacing={1} sx={{ mb: 3 }}>
          {tList(SIDELOAD_GUIDE.notesKey).map((note, i) => (
            <Stack key={i} direction="row" spacing={1.2} alignItems="flex-start">
              <InfoOutlinedIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0, mt: 0.2 }} />
              <Typography variant="caption" color="text.secondary"
                sx={{ fontSize: '0.74rem', lineHeight: 1.45 }}>
                {note}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Button variant="contained" color="primary" fullWidth size="large"
          onClick={onClose} sx={{ py: 1.3 }}>
          {t(SIDELOAD_GUIDE.actionKey)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
