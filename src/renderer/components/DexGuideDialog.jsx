// src/renderer/components/DexGuideDialog.jsx
// Etapa "DeX vs Experiência de TV", exibida num diálogo após o aparelho ser
// reconhecido. Duas telas internas:
//   1) Explicação — por que desativar o DeX (comparação lado a lado).
//   2) Guia       — como fazer, com passos que variam por versão do One UI.

import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton,
  ToggleButtonGroup, ToggleButton, Divider, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import * as Icons from '@mui/icons-material';
import { DEX_EXPLAIN, DEX_VERSIONS, DEX_NOTE_KEY, DEX_HDMI_WARNING_KEY } from '../data/dexGuide';
import { useT } from '../i18n';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function Ico({ name, ...props }) {
  const C = Icons[name] || Icons.HelpOutline;
  return <C {...props} />;
}

// Aviso destacado: o DeX só aparece nas configurações com o HDMI conectado.
function HdmiWarning() {
  const { t } = useT();
  return (
    <Stack direction="row" spacing={1.2} sx={{
      p: 1.5, borderRadius: 2, mb: 2.5,
      bgcolor: 'rgba(255,185,74,0.1)', border: '1px solid rgba(255,185,74,0.3)',
    }}>
      <InfoOutlinedIcon sx={{ fontSize: 20, color: 'primary.main', flexShrink: 0, mt: 0.1 }} />
      <Typography variant="caption" sx={{ fontSize: '0.76rem', lineHeight: 1.5, color: 'text.primary' }}>
        {t(DEX_HDMI_WARNING_KEY)}
      </Typography>
    </Stack>
  );
}

function Explain({ onNext }) {
  const { t } = useT();
  return (
    <Box>
      <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 1 }}>
        {t('dexGuide.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.55, mb: 2.5 }}>
        {t(DEX_EXPLAIN.introKey)}
      </Typography>

      <HdmiWarning />

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {DEX_EXPLAIN.compare.map((c) => {
          const accent = c.tone === 'accent';
          return (
            <Box key={c.key} sx={{
              display: 'flex', gap: 1.5, p: 1.5, borderRadius: 2,
              bgcolor: accent ? 'rgba(255,185,74,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${accent ? 'rgba(255,185,74,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '11px', flexShrink: 0,
                display: 'grid', placeItems: 'center',
                bgcolor: accent ? 'rgba(255,185,74,0.14)' : 'rgba(255,255,255,0.05)',
              }}>
                <Ico name={c.icon} sx={{ fontSize: 22, color: accent ? 'primary.main' : 'text.secondary' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.88rem', color: accent ? 'primary.main' : 'text.primary' }}>
                  {t(`${c.key}.title`)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', lineHeight: 1.45 }}>
                  {t(`${c.key}.desc`)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.83rem', lineHeight: 1.55, mb: 3 }}>
        {t(DEX_EXPLAIN.conclusionKey)}
      </Typography>

      <Button variant="contained" color="primary" fullWidth size="large"
        onClick={onNext} sx={{ py: 1.3 }}>
        {t('dexGuide.how')}
      </Button>
    </Box>
  );
}

function Guide({ onBack }) {
  const { t } = useT();
  const [ver, setVer] = useState('ui67');
  const version = DEX_VERSIONS.find((v) => v.id === ver);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 0.5 }}>
        {t('dexGuide.disable')}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {t('dexGuide.pickVersion')}
      </Typography>

      <ToggleButtonGroup
        value={ver} exclusive size="small" fullWidth orientation="vertical"
        onChange={(_e, v) => v && setVer(v)}
        sx={{ mb: 2.5 }}
      >
        {DEX_VERSIONS.map((v) => (
          <ToggleButton key={v.id} value={v.id} sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>{t(`${v.key}.label`)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{t(`${v.key}.hint`)}</Typography>
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Aviso só para quem tem DeX (não faz sentido para 'nodex'). */}
      {ver !== 'nodex' && <HdmiWarning />}

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {version.steps.map((s, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{
              width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
              display: 'grid', placeItems: 'center',
              bgcolor: 'rgba(255,185,74,0.12)', border: '1px solid rgba(255,185,74,0.22)',
            }}>
              <Ico name={s.icon} sx={{ fontSize: 17, color: 'primary.main' }} />
            </Box>
            <Box sx={{ flex: 1, pt: 0.2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>{t(`${s.key}.title`)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', lineHeight: 1.45 }}>
                {t(`${s.key}.body`)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.45, display: 'block', mb: 2.5 }}>
        {t(DEX_NOTE_KEY)}
      </Typography>

      <Stack direction="row" spacing={1}>
        <Button variant="text" color="inherit" startIcon={<ArrowBackIcon />}
          onClick={onBack} sx={{ color: 'text.secondary' }}>
          {t('dexGuide.back')}
        </Button>
      </Stack>
    </Box>
  );
}

export default function DexGuideDialog({ open, onClose }) {
  const { t } = useT();
  const [screen, setScreen] = useState('explain'); // 'explain' | 'guide'

  const handleClose = () => { setScreen('explain'); onClose(); };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
      <IconButton onClick={handleClose} size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        {screen === 'explain'
          ? <Explain onNext={() => setScreen('guide')} />
          : <Guide onBack={() => setScreen('explain')} />}
      </DialogContent>
    </Dialog>
  );
}
