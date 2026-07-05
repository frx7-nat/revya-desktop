// src/renderer/components/ProgressPanel.jsx
// Aba DIREITA: progresso da execução, passo a passo, com status por task.

import React, { useState } from 'react';
import {
  Box, Typography, Stack, LinearProgress, CircularProgress,
  Collapse, Button,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const VERIFICATION_STEPS = [
  'No celular, abra o app Google Play',
  'Toque no ícone de perfil (canto superior direito)',
  'Acesse Play Protect → ⚙️ Configurações',
  'Desative "Verificar apps com o Play Protect"',
  'Volte aqui e clique em Aplicar mudanças novamente',
];

function GuideEntry({ entry }) {
  const [open, setOpen] = useState(false);
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ mt: 0.3 }}>
          <HelpOutlineIcon fontSize="small" sx={{ color: 'warning.main' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{entry.label}</Typography>
          <Typography variant="overline" color="warning.main"
            sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
            {entry.detail}
          </Typography>
          <Button size="small" onClick={() => setOpen((o) => !o)}
            sx={{
              p: 0, minWidth: 0, fontSize: '0.72rem', textTransform: 'none',
              color: 'warning.main', mt: 0.3,
              '&:hover': { background: 'none', textDecoration: 'underline' },
            }}>
            {open ? 'Ocultar guia' : 'Como liberar no celular →'}
          </Button>
        </Box>
      </Stack>
      <Collapse in={open}>
        <Box sx={{
          ml: 3.5, mt: 0.5, mb: 0.5, p: 1.2,
          borderRadius: 1,
          bgcolor: 'rgba(255,185,74,0.07)',
          borderLeft: '3px solid',
          borderColor: 'warning.main',
        }}>
          {VERIFICATION_STEPS.map((step, i) => (
            <Stack key={i} direction="row" spacing={1} sx={{ mb: i < VERIFICATION_STEPS.length - 1 ? 0.8 : 0 }}>
              <Typography variant="caption"
                sx={{ color: 'warning.main', fontWeight: 700, minWidth: 16, fontSize: '0.72rem' }}>
                {i + 1}.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.45 }}>
                {step}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Collapse>
    </Stack>
  );
}

const ICON = {
  pending: <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.5 }} />,
  running: <CircularProgress size={16} color="primary" />,
  done: <CheckCircleIcon fontSize="small" color="success" />,
  error: <ErrorIcon fontSize="small" color="error" />,
  warning: <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />,
};

export default function ProgressPanel({ log, percent, active }) {
  return (
    <Box sx={{ width: 320, p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        Progresso
      </Typography>

      {active && (
        <LinearProgress variant="determinate" value={percent} sx={{ mb: 2, height: 6, borderRadius: 3 }} />
      )}

      <Stack spacing={1.5} sx={{ overflowY: 'auto', flex: 1 }}>
        {log.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nenhuma operação ainda. As etapas aparecem aqui durante a execução.
          </Typography>
        )}
        {log.map((entry, i) => {
          if (entry.status === 'guide') return <GuideEntry key={i} entry={entry} />;
          return (
            <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ mt: 0.3 }}>{ICON[entry.status]}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{entry.label}</Typography>
                {entry.detail && (
                  <Typography variant="overline"
                    color={entry.status === 'error' ? 'error' : entry.status === 'warning' ? 'warning.main' : 'text.secondary'}
                    sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.3 }}>
                    {entry.detail}
                  </Typography>
                )}
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
