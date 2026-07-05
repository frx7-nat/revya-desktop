// src/renderer/components/TvResolutionDialog.jsx
// Pergunta a resolução da TV antes de aplicar a Configuração Recomendada.
// O painel do celular é ~20:9; forçar uma resolução 16:9 faz o espelhamento
// preencher a TV sem cortes — mas o valor certo depende da TV do usuário,
// por isso a pergunta. "Não sei" cai em Full HD (o caso mais comum e seguro:
// um valor acima do suportado encolhe a imagem).
//
// onChoose(taskId | null): taskId da task de resolução escolhida, ou null
// para aplicar o preset sem mexer na resolução.

import React from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TvIcon from '@mui/icons-material/Tv';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const OPTIONS = [
  { taskId: 'tw-res-fhd', title: 'Full HD (1080p)', note: 'A mais comum — maioria das TVs.' },
  { taskId: 'tw-res-2k', title: '2K (1440p)', note: 'Monitores e TVs QHD.' },
  { taskId: 'tw-res-4k', title: '4K (2160p)', note: 'Só se a TV for realmente 4K.' },
];

export default function TvResolutionDialog({ open, onClose, onChoose }) {
  return (
    <Dialog open={open} onClose={onClose} TransitionComponent={SlideUp} maxWidth="xs" fullWidth
      PaperProps={{ sx: {
        borderRadius: 4,
        background: 'linear-gradient(160deg, #20242E 0%, #16151B 70%)',
        border: '1px solid rgba(255,185,74,0.18)',
      } }}>
      <IconButton onClick={onClose} size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <TvIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>Qual é a resolução da sua TV?</Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.55, mb: 2.5 }}>
          A tela do celular é mais alargada que a da TV. Ajustando a resolução
          para o formato 16:9 da sua TV, o conteúdo preenche a tela sem cortes
          nem faixas pretas.
        </Typography>

        <Stack spacing={1.2} sx={{ mb: 2 }}>
          {OPTIONS.map((opt) => (
            <Button key={opt.taskId} variant="outlined" color="primary" fullWidth
              onClick={() => onChoose(opt.taskId)}
              sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.1, px: 2, textTransform: 'none' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {opt.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
                  {opt.note}
                </Typography>
              </Box>
            </Button>
          ))}

          <Button variant="contained" color="primary" fullWidth
            startIcon={<HelpOutlineIcon />}
            onClick={() => onChoose('tw-res-fhd')}
            sx={{ py: 1.1, textTransform: 'none', fontWeight: 700 }}>
            Não sei — usar Full HD
          </Button>
        </Stack>

        <Button variant="text" color="inherit" fullWidth size="small"
          onClick={() => onChoose(null)}
          sx={{ color: 'text.secondary', fontSize: '0.76rem', textTransform: 'none' }}>
          Continuar sem ajustar a resolução
        </Button>
      </DialogContent>
    </Dialog>
  );
}
