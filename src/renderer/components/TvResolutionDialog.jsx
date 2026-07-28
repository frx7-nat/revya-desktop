// src/renderer/components/TvResolutionDialog.jsx
// Perguntas feitas antes de aplicar a Configuração Recomendada, em 2 etapas:
//
//   1) Resolução da TV — o painel do celular é ~20:9; forçar uma resolução
//      16:9 faz o espelhamento preencher a TV sem cortes. O valor certo
//      depende da TV do usuário, por isso a pergunta. "Não sei" cai em
//      Full HD (o caso mais comum e seguro: um valor acima do suportado
//      encolhe a imagem).
//
//   2) Tamanho da interface — o dpi pareado com a resolução (padrão de TV)
//      ou 20% menor, para quem prefere mais conteúdo na tela (textos, ícones
//      e menus ficam menores e sobra mais espaço). O dpi é recalculado
//      conforme a escolha e pode ser trocado depois na barra lateral
//      esquerda (grupo "Personalizar sistema").
//
// onChoose(taskId | null, density | null): taskId da task de resolução
// escolhida + dpi escolhido, ou (null, null) para aplicar o preset sem mexer
// na resolução.

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TvIcon from '@mui/icons-material/Tv';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useT } from '../i18n';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// `density` é o dpi padrão de TV pareado com cada resolução (1080p→320,
// 1440p→480, 4K→640). A opção "menor" aplica 20% a menos sobre esse valor —
// dpi menor = elementos menores = mais conteúdo cabendo na tela.
const OPTIONS = [
  // O `title` é técnico (não se traduz); a `noteKey` aponta para o catálogo.
  { taskId: 'tw-res-fhd', title: 'Full HD (1080p)', noteKey: 'tvRes.note.fhd', density: 320 },
  { taskId: 'tw-res-2k', title: '2K (1440p)', noteKey: 'tvRes.note.2k', density: 480 },
  { taskId: 'tw-res-4k', title: '4K (2160p)', noteKey: 'tvRes.note.4k', density: 640 },
];

const smallerDensity = (base) => Math.round(base * 0.8);
const largerDensity = (base) => Math.round(base * 1.2);

// Botão de opção com título + descrição, usado nas duas etapas.
function OptionButton({ title, note, onClick, contained = false, startIcon }) {
  return (
    <Button variant={contained ? 'contained' : 'outlined'} color="primary" fullWidth
      startIcon={startIcon}
      onClick={onClick}
      sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.1, px: 2, textTransform: 'none' }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.74rem', color: contained ? 'inherit' : 'text.secondary' }}>
          {note}
        </Typography>
      </Box>
    </Button>
  );
}

export default function TvResolutionDialog({ open, onClose, onChoose }) {
  const { t } = useT();
  // Resolução já escolhida => estamos na etapa 2 (tamanho da interface).
  const [res, setRes] = useState(null);

  // Reabrir o diálogo sempre recomeça da etapa 1.
  useEffect(() => { if (open) setRes(null); }, [open]);

  const close = () => { setRes(null); onClose(); };
  const pickDensity = (density) => {
    const taskId = res.taskId;
    setRes(null);
    onChoose(taskId, density);
  };

  return (
    <Dialog open={open} onClose={close} TransitionComponent={SlideUp} maxWidth="xs" fullWidth
      PaperProps={{ sx: {
        borderRadius: 4,
        background: 'linear-gradient(160deg, #20242E 0%, #16151B 70%)',
        border: '1px solid rgba(255,185,74,0.18)',
      } }}>
      <IconButton onClick={close} size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        {res == null ? (
          /* ---------------- Etapa 1: resolução da TV ---------------- */
          <>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <TvIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>{t('tvRes.title')}</Typography>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.55, mb: 2.5 }}>
              {t('tvRes.intro')}
            </Typography>

            <Stack spacing={1.2} sx={{ mb: 2 }}>
              {OPTIONS.map((opt) => (
                <OptionButton key={opt.taskId} title={opt.title} note={t(opt.noteKey)}
                  onClick={() => setRes(opt)} />
              ))}

              <OptionButton contained startIcon={<HelpOutlineIcon />}
                title={t('tvRes.dontKnow')}
                note={t('tvRes.dontKnowNote')}
                onClick={() => setRes(OPTIONS[0])} />
            </Stack>

            <Button variant="text" color="inherit" fullWidth size="small"
              onClick={() => onChoose(null, null)}
              sx={{ color: 'text.secondary', fontSize: '0.76rem', textTransform: 'none' }}>
              {t('tvRes.skip')}
            </Button>
          </>
        ) : (
          /* ------------- Etapa 2: tamanho da interface (dpi) ------------- */
          <>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <FormatSizeIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>{t('tvRes.densityTitle')}</Typography>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.55, mb: 2.5 }}>
              {t('tvRes.densityIntro', { res: res.title })}
            </Typography>

            <Stack spacing={1.2} sx={{ mb: 2 }}>
              <OptionButton contained
                title={t('tvRes.densityDefault')}
                note={t('tvRes.densityDefaultNote', { dpi: res.density })}
                onClick={() => pickDensity(res.density)} />

              <OptionButton
                title={t('tvRes.densityLarger')}
                note={t('tvRes.densityLargerNote', { dpi: largerDensity(res.density) })}
                onClick={() => pickDensity(largerDensity(res.density))} />

              <OptionButton
                title={t('tvRes.densitySmaller')}
                note={t('tvRes.densitySmallerNote', { dpi: smallerDensity(res.density) })}
                onClick={() => pickDensity(smallerDensity(res.density))} />
            </Stack>

            <Button variant="text" color="inherit" fullWidth size="small"
              startIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
              onClick={() => setRes(null)}
              sx={{ color: 'text.secondary', fontSize: '0.76rem', textTransform: 'none' }}>
              {t('tvRes.backToResolution')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
