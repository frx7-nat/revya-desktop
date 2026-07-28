// src/renderer/components/CloseDialog.jsx
// Pop-up animado que aparece quando o usuário tenta fechar o programa.
// Apresenta a seção de Acessórios com um botão que leva direto para a aba.
// Dois caminhos: "Ver acessórios" (vai para a aba e fecha o pop-up) ou
// "Fechar mesmo assim" (confirma o fechamento da janela).

import React from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TvIcon from '@mui/icons-material/Tv';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CableIcon from '@mui/icons-material/Cable';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useT } from '../i18n';

// Transição de entrada: sobe suavemente.
const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} timeout={{ enter: 420, exit: 220 }} />;
});

export default function CloseDialog({ open, onSeeAccessories, onConfirmClose }) {
  const { t } = useT();
  return (
    <Dialog
      open={open}
      onClose={onConfirmClose}
      TransitionComponent={SlideUp}
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: 'linear-gradient(160deg, #20242E 0%, #16151B 70%)',
          border: '1px solid rgba(255,185,74,0.18)',
          overflow: 'visible',
        },
      }}
    >
      {/* Botão de fechar o pop-up (canto) — equivale a confirmar saída. */}
      <IconButton onClick={onConfirmClose} size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 4, pt: 4.5, pb: 3.5, textAlign: 'center' }}>
        {/* Elemento característico: a TV ladeada pelos acessórios, com brilho. */}
        <Box sx={{ position: 'relative', mb: 3, height: 76 }}>
          <Box sx={{
            position: 'absolute', inset: 0, m: 'auto', width: 140, height: 60,
            background: 'radial-gradient(ellipse, rgba(255,185,74,0.18) 0%, transparent 70%)',
          }} />
          <Stack direction="row" spacing={2.5} justifyContent="center" alignItems="center" sx={{ position: 'relative', height: '100%' }}>
            <IconWell delay={0.05}><SportsEsportsIcon sx={{ fontSize: 22, color: 'primary.main' }} /></IconWell>
            <Box sx={{
              width: 64, height: 64, borderRadius: '18px', display: 'grid', placeItems: 'center',
              bgcolor: 'rgba(255,185,74,0.14)', border: '1px solid rgba(255,185,74,0.3)',
              animation: 'tvpop .5s cubic-bezier(.2,1.3,.4,1)',
              '@keyframes tvpop': { '0%': { transform: 'scale(0.5)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
            }}>
              <TvIcon sx={{ fontSize: 34, color: 'primary.main' }} />
            </Box>
            <IconWell delay={0.12}><CableIcon sx={{ fontSize: 22, color: 'primary.main' }} /></IconWell>
          </Stack>
        </Box>

        <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 2 }}>
          {t('close.title')}
        </Typography>

        {/* Texto solicitado, em três parágrafos curtos. */}
        <Stack spacing={1.5} sx={{ mb: 3.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.86rem', lineHeight: 1.55 }}>
            {t('close.p1')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.86rem', lineHeight: 1.55 }}>
            {t('close.p2')}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.86rem', lineHeight: 1.55, color: 'text.primary' }}>
            {t('close.p3')} <FavoriteIcon sx={{ fontSize: 14, color: 'primary.main', verticalAlign: 'middle', ml: 0.3 }} />
          </Typography>
        </Stack>

        <Stack spacing={1.2}>
          <Button variant="contained" color="primary" size="large" fullWidth
            onClick={onSeeAccessories} sx={{ py: 1.3, fontSize: '0.95rem' }}>
            {t('close.see')}
          </Button>
          <Button variant="text" color="inherit" fullWidth
            onClick={onConfirmClose}
            sx={{ color: 'text.secondary', fontSize: '0.82rem', '&:hover': { color: 'text.primary' } }}>
            {t('close.closeAnyway')}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

// Pequeno "poço" para os ícones laterais, com entrada escalonada.
function IconWell({ children, delay }) {
  return (
    <Box sx={{
      width: 46, height: 46, borderRadius: '14px', display: 'grid', placeItems: 'center',
      bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
      animation: `wellin .5s ease ${delay}s both`,
      '@keyframes wellin': { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
    }}>
      {children}
    </Box>
  );
}
