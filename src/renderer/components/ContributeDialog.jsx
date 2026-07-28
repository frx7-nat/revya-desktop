// src/renderer/components/ContributeDialog.jsx
// Painel "Contribua com o projeto": abre pela aba discreta do rodapé da
// coluna esquerda (ContributeTab) e fica CENTRALIZADO na tela.
//
// Três espaços de QR code lado a lado. Enquanto a imagem não estiver
// cadastrada em data/contribute.js, cada espaço mostra a moldura tracejada
// com o ícone de QR — o lugar já reservado, sem ocupar o usuário com isso.

import React from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { CONTRIBUTE } from '../data/contribute';
import { useT } from '../i18n';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Um espaço de QR code: imagem quando existe, moldura tracejada quando não.
function QrSlot({ item }) {
  const { t } = useT();
  return (
    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
      <Box sx={{
        aspectRatio: '1 / 1', width: '100%', mb: 1.2,
        display: 'grid', placeItems: 'center', overflow: 'hidden',
        borderRadius: 2,
        bgcolor: item.image ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
        border: item.image
          ? '1px solid rgba(255,255,255,0.12)'
          : '1.5px dashed rgba(255,185,74,0.35)',
      }}>
        {item.image ? (
          <Box component="img" src={item.image} alt={`QR Code — ${t(`${item.key}.label`)}`}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1.2 }} />
        ) : (
          <QrCode2Icon sx={{ fontSize: 34, color: 'rgba(255,185,74,0.45)' }} />
        )}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
        {t(`${item.key}.label`)}
      </Typography>
      <Typography variant="caption" color="text.secondary"
        sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.4 }}>
        {t(`${item.key}.hint`)}
      </Typography>
    </Box>
  );
}

export default function ContributeDialog({ open, onClose }) {
  const { t } = useT();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={SlideUp}
      // "sm" no lugar de "xs": com dois QR, o quadro precisa de largura para
      // cada um ficar grande o bastante para ler de perto sem esforço.
      maxWidth="sm"
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

      <DialogContent sx={{ px: 4.5, py: 4, textAlign: 'center' }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px', mx: 'auto', mb: 1.5,
          display: 'grid', placeItems: 'center',
          bgcolor: 'rgba(255,185,74,0.12)', border: '1px solid rgba(255,185,74,0.22)',
        }}>
          <FavoriteBorderIcon sx={{ fontSize: 22, color: 'primary.main' }} />
        </Box>

        <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 1 }}>
          {t(CONTRIBUTE.titleKey)}
        </Typography>
        <Typography variant="body2" color="text.secondary"
          sx={{ fontSize: '0.85rem', lineHeight: 1.55, mb: 3 }}>
          {t(CONTRIBUTE.messageKey)}
        </Typography>

        <Stack direction="row" spacing={2.5} sx={{ mb: 3, px: 1 }}>
          {CONTRIBUTE.qrcodes.map((item) => <QrSlot key={item.id} item={item} />)}
        </Stack>

        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.45, mb: 2.5, opacity: 0.8 }}>
          {t(CONTRIBUTE.footnoteKey)}
        </Typography>

        <Button variant="contained" color="primary" fullWidth size="large"
          onClick={onClose} sx={{ py: 1.2 }}>
          {t('reset.close')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
