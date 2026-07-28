// src/renderer/components/CheckupDialog.jsx
// Check-up do aparelho: exibe o que foi modificado e confere, item a item,
// se cada ajuste continua valendo (atualizações do One UI e reinícios às
// vezes desfazem configurações). É apenas informativo — não aplica nem
// reverte nada por aqui: para desfazer, use a Reversão completa ou a
// reversão isolada na barra lateral; para reaplicar, desfaça o item e
// marque-o de novo na lista.
//
// O universo verificado são as tasks com entrada no registro de reversão —
// ou seja, tudo que o app realmente alterou neste aparelho. Cada entrada
// carrega a task como foi APLICADA (ex.: dpi escolhido no diálogo); o
// catálogo é só o fallback para registros antigos.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton,
  CircularProgress, Divider, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { ALL_TASKS } from '../data/tasks';
import { friendlyError } from '../utils/errors';
import { useT } from '../i18n';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const STATUS_ICON = {
  pending: <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.4 }} />,
  checking: <CircularProgress size={15} color="primary" />,
  ok: <CheckCircleIcon fontSize="small" color="success" />,
  drift: <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />,
  error: <ErrorIcon fontSize="small" color="error" />,
};

export default function CheckupDialog({ open, serial, onClose }) {
  const { t } = useT();
  // items: [{ taskId, label, task|null, status, detail }]
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  // Quantos ajustes de modo estão adormecidos (aparelho em modo celular) —
  // esses ficam FORA do check-up: foram desfeitos de propósito na troca de
  // modo, então reportá-los como "perdidos" seria alarme falso.
  const [dormantCount, setDormantCount] = useState(0);

  const setItem = (taskId, patch) => {
    setItems((list) => list.map((x) => (x.taskId === taskId ? { ...x, ...patch } : x)));
  };

  // Roda a verificação de todos os itens, em sequência.
  const verifyAll = useCallback(async (list) => {
    setBusy(true);
    for (const item of list) {
      if (!item.task) {
        // A task saiu do catálogo (versão antiga do app); não dá para conferir.
        setItem(item.taskId, { status: 'error', detail: t('checkup.fromOldCatalog') });
        continue;
      }
      setItem(item.taskId, { status: 'checking' });
      try {
        const res = await window.api.verifyTask(serial, item.task);
        setItem(item.taskId, res.ok
          ? { status: 'ok', detail: res.detail || null }
          : { status: 'drift', detail: res.detail || t('checkup.notActive') });
      } catch (err) {
        setItem(item.taskId, { status: 'error', detail: friendlyError(err) });
      }
    }
    setBusy(false);
  }, [serial]);

  // Ao abrir: carrega o registro de reversão e verifica tudo.
  useEffect(() => {
    if (!open || !serial) return;
    let cancelled = false;
    (async () => {
      let entries = [];
      try { entries = await window.api.revertList(serial); } catch { /* lista vazia */ }
      if (cancelled) return;
      setDormantCount(entries.filter((e) => e.dormant).length);
      const list = entries.filter((e) => !e.dormant).map((e) => ({
        taskId: e.taskId,
        label: e.label,
        // Preferimos a task como foi aplicada (gravada na entrada); registros
        // antigos não a têm e caem no catálogo.
        task: e.task || ALL_TASKS.find((t) => t.id === e.taskId) || null,
        status: 'pending',
        detail: null,
      }));
      setItems(list);
      await verifyAll(list);
    })();
    return () => { cancelled = true; };
  }, [open, serial, verifyAll]);

  const drifted = items.filter((x) => x.status === 'drift');
  const okCount = items.filter((x) => x.status === 'ok').length;
  const finished = !busy && items.length > 0 && items.every((x) => x.status !== 'pending' && x.status !== 'checking');

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} TransitionComponent={SlideUp} maxWidth="xs" fullWidth
      PaperProps={{ sx: {
        borderRadius: 4,
        background: 'linear-gradient(160deg, #1E2430 0%, #16151B 70%)',
        border: '1px solid rgba(255,185,74,0.2)',
      } }}>
      <IconButton onClick={onClose} size="small" disabled={busy}
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <TroubleshootIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>{t('checkup.title')}</Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.55, mb: 2 }}>
          {t('checkup.intro')}
        </Typography>

        <Stack spacing={1.2} sx={{ mb: 2.5, maxHeight: 320, overflowY: 'auto' }}>
          {items.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              {dormantCount > 0
                ? t('checkup.emptyDormant')
                : t('checkup.emptyNone')}
            </Typography>
          )}
          {items.map((x) => (
            <Stack key={x.taskId} direction="row" spacing={1.3} alignItems="flex-start">
              <Box sx={{ mt: 0.2 }}>{STATUS_ICON[x.status]}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{x.label}</Typography>
                {x.detail && (
                  <Typography variant="caption" sx={{
                    fontSize: '0.7rem', lineHeight: 1.3, display: 'block',
                    color: x.status === 'drift' ? 'warning.main'
                      : x.status === 'error' ? 'error.main' : 'text.secondary',
                  }}>
                    {x.detail}
                  </Typography>
                )}
              </Box>
            </Stack>
          ))}
        </Stack>

        {finished && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" sx={{ fontSize: '0.86rem', mb: 1 }}>
              {drifted.length === 0
                ? t('checkup.allOk', { ok: okCount, total: items.length })
                : t(drifted.length === 1 ? 'checkup.driftOne' : 'checkup.driftMany', { n: drifted.length })}
            </Typography>
            {dormantCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem', display: 'block', mb: 1, lineHeight: 1.5 }}>
                {t(dormantCount === 1 ? 'checkup.dormantOne' : 'checkup.dormantMany', { n: dormantCount })}
              </Typography>
            )}
            {drifted.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem', display: 'block', mb: 2, lineHeight: 1.5 }}>
                {t('checkup.howToFix')}
              </Typography>
            )}
            <Button variant="contained" color="primary" fullWidth onClick={onClose}>
              {t('checkup.close')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
