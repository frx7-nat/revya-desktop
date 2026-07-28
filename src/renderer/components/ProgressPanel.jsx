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
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import ChecklistIcon from '@mui/icons-material/Checklist';
import UndoIcon from '@mui/icons-material/Undo';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SquareIcon from './SquareIcon';
import { useT } from '../i18n';
import RichText from '../i18n/RichText';

// Os passos vêm do catálogo (`progress.playProtect.steps`) — lista, não chaves
// numeradas, para a tradução poder ter mais ou menos passos que o original.

function GuideEntry({ entry }) {
  const { t, tList } = useT();
  const [open, setOpen] = useState(false);
  const steps = tList('progress.playProtect.steps');
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
            {open ? t('progress.playProtect.hide') : t('progress.playProtect.show')}
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
          {steps.map((step, i) => (
            <Stack key={i} direction="row" spacing={1} sx={{ mb: i < steps.length - 1 ? 0.8 : 0 }}>
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
  undoing: <CircularProgress size={16} sx={{ color: 'text.secondary' }} />,
  undone: <UndoIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
};

// `finished`: uma execução terminou e o resultado está na tela — é quando o
// painel comunica a filosofia da carapaça e oferece o Desfazer por item.
// `undoableIds`: ids com reversão registrada (só esses ganham o botão).
export default function ProgressPanel({ log, percent, active, onSaveReport, finished = false, undoableIds = null, onUndoItem = null }) {
  const { t } = useT();
  return (
    <Box sx={{ width: '100%', px: 2, py: 1.6, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.2 }}>
        <SquareIcon><ChecklistIcon sx={{ fontSize: 15, color: 'text.primary' }} /></SquareIcon>
        <Typography sx={{
          fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'text.secondary', flex: 1,
        }}>
          {t('progress.title')}
        </Typography>
        {/* Ao fim de uma execução, permite salvar o relatório em .txt. */}
        {onSaveReport && (
          <Button size="small" startIcon={<SaveAltIcon sx={{ fontSize: 14 }} />}
            onClick={onSaveReport}
            sx={{ fontSize: '0.66rem', textTransform: 'none', py: 0, minWidth: 0, flexShrink: 0 }}>
            {t('progress.save')}
          </Button>
        )}
      </Stack>

      {active && (
        <LinearProgress variant="determinate" value={percent} sx={{ mb: 2, height: 6, borderRadius: 3 }} />
      )}

      {/* A carapaça é do usuário: resultado apresentado = cada peça pode ser
          desfeita na hora, sem desmontar o resto. Segurança que também é o
          jeito DexArmor de montar uma configuração personalizada. */}
      {finished && (
        <Box sx={{
          mb: 1.4, p: 1.2, borderRadius: 1,
          bgcolor: 'rgba(255,185,74,0.06)',
          border: '1px solid rgba(255,185,74,0.22)',
        }}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <ShieldOutlinedIcon sx={{ fontSize: 15, color: 'warning.main', mt: 0.2 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.5 }}>
              <Box component="b" sx={{ color: 'warning.main', fontWeight: 700 }}>{t('progress.shellTitle')}</Box>{' '}
              <RichText
                text={t('progress.shellBody')}
                values={{ undo: t('taskPanel.undo') }}
                wrap={(v, k) => <Box component="b" key={k} sx={{ color: 'text.primary' }}>{v}</Box>}
              />
            </Typography>
          </Stack>
        </Box>
      )}

      <Stack spacing={1.5} sx={{ overflowY: 'auto', flex: 1 }}>
        {log.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('progress.empty')}
          </Typography>
        )}
        {log.map((entry, i) => {
          if (entry.status === 'guide') return <GuideEntry key={i} entry={entry} />;
          const undoable = finished && onUndoItem && entry.status === 'done'
            && undoableIds && undoableIds.has(entry.id);
          return (
            <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ mt: 0.3 }}>{ICON[entry.status]}</Box>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', flex: 1 }}>{entry.label}</Typography>
                  {undoable && (
                    <Button size="small" onClick={() => onUndoItem(entry.id)}
                      sx={{
                        p: 0, minWidth: 0, fontSize: '0.68rem', textTransform: 'none',
                        color: 'text.secondary', flexShrink: 0, lineHeight: 1.2,
                        '&:hover': { background: 'none', textDecoration: 'underline', color: 'warning.main' },
                      }}>
                      {t('progress.undo')}
                    </Button>
                  )}
                </Stack>
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
