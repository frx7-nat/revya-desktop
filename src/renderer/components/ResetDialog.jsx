// src/renderer/components/ResetDialog.jsx
// Diálogo de reversão ("Reverter alterações"). Dois momentos:
//   1) Confirmação — lista o que será desfeito + aviso do DeX.
//   2) Execução — reverte item a item, mostrando o status de cada um, sem
//      travar se um falhar. Ao final, um resumo honesto.

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton,
  CircularProgress, Divider, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const STATUS_ICON = {
  pending: <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.4 }} />,
  running: <CircularProgress size={15} color="primary" />,
  done: <CheckCircleIcon fontSize="small" color="success" />,
  warn: <WarningAmberIcon fontSize="small" sx={{ color: 'primary.main' }} />,
  error: <ErrorIcon fontSize="small" color="error" />,
};

export default function ResetDialog({ open, serial, onClose, onReverted }) {
  const [phase, setPhase] = useState('confirm'); // 'confirm' | 'running' | 'done'
  const [entries, setEntries] = useState([]);
  const [log, setLog] = useState([]);

  // Ao abrir, carrega a lista do que será revertido.
  useEffect(() => {
    if (open && serial) {
      setPhase('confirm');
      setLog([]);
      window.api.revertList(serial).then(setEntries).catch(() => setEntries([]));
    }
  }, [open, serial]);

  const runRevert = async () => {
    setPhase('running');
    // Reverte na ordem INVERSA da aplicação: tasks que mexem no mesmo recurso
    // (ex.: duas resoluções) se desfazem corretamente — a última aplicada é a
    // primeira desfeita, como numa pilha.
    const queue = [...entries].reverse();
    setLog(queue.map((e) => ({ taskId: e.taskId, label: e.label, status: 'pending' })));

    for (const entry of queue) {
      setLog((l) => l.map((x) => x.taskId === entry.taskId ? { ...x, status: 'running' } : x));
      try {
        const detail = await window.api.revertOne(serial, entry.taskId);
        setLog((l) => l.map((x) => x.taskId === entry.taskId ? { ...x, status: 'done', detail } : x));
      } catch (err) {
        // Falha parcial: marca como aviso e segue para o próximo.
        setLog((l) => l.map((x) => x.taskId === entry.taskId
          ? { ...x, status: 'warn', detail: String(err.message || err) } : x));
      }
    }
    setPhase('done');
    onReverted && onReverted(); // avisa o App para atualizar contagem e travas
  };

  const close = () => { setPhase('confirm'); onClose(); };

  return (
    <Dialog open={open} onClose={close} TransitionComponent={SlideUp} maxWidth="xs" fullWidth
      PaperProps={{ sx: {
        borderRadius: 4,
        background: 'linear-gradient(160deg, #2A2026 0%, #16151B 70%)',
        border: '1px solid rgba(255,93,93,0.2)',
      } }}>
      <IconButton onClick={close} size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        {phase === 'confirm' && (
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <RestartAltIcon sx={{ color: 'error.main' }} />
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>Reverter alterações?</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.55, mb: 2 }}>
              Isto vai desfazer o que foi aplicado neste aparelho, devolvendo-o ao
              estado anterior:
            </Typography>

            <Stack spacing={0.8} sx={{ mb: 2 }}>
              {entries.length === 0 ? (
                <Typography variant="caption" color="text.secondary">Nada a reverter.</Typography>
              ) : entries.map((e) => (
                <Stack key={e.taskId} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{e.label}</Typography>
                </Stack>
              ))}
            </Stack>

            {/* Aviso do DeX: a reversão por software não religa o DeX. */}
            <Stack direction="row" spacing={1.2} sx={{
              p: 1.5, borderRadius: 2, mb: 2.5,
              bgcolor: 'rgba(255,185,74,0.1)', border: '1px solid rgba(255,185,74,0.3)',
            }}>
              <WarningAmberIcon sx={{ fontSize: 19, color: 'primary.main', flexShrink: 0, mt: 0.1 }} />
              <Typography variant="caption" sx={{ fontSize: '0.74rem', lineHeight: 1.5, color: 'text.primary' }}>
                O modo DeX, se você o desativou, precisa ser religado manualmente
                nas configurações do aparelho. Em último caso, o reset de fábrica
                do celular reverte tudo com segurança.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button variant="text" color="inherit" fullWidth onClick={close}
                sx={{ color: 'text.secondary' }}>
                Cancelar
              </Button>
              <Button variant="contained" color="error" fullWidth onClick={runRevert}
                disabled={entries.length === 0}>
                Reverter tudo
              </Button>
            </Stack>
          </Box>
        )}

        {(phase === 'running' || phase === 'done') && (
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 2 }}>
              {phase === 'running' ? 'Revertendo…' : 'Reversão concluída'}
            </Typography>

            <Stack spacing={1.2} sx={{ mb: 2.5 }}>
              {log.map((x) => (
                <Stack key={x.taskId} direction="row" spacing={1.3} alignItems="flex-start">
                  <Box sx={{ mt: 0.2 }}>{STATUS_ICON[x.status]}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{x.label}</Typography>
                    {x.detail && x.status === 'warn' && (
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'primary.main', lineHeight: 1.3 }}>
                        Precisa de um passo manual — {x.detail}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ))}
            </Stack>

            {phase === 'done' && (
              <>
                <Divider sx={{ mb: 2 }} />
                <ResetSummary log={log} />
                <Button variant="contained" color="primary" fullWidth onClick={close} sx={{ mt: 2 }}>
                  Fechar
                </Button>
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Resumo honesto: quantos voltaram, quantos precisam de atenção.
function ResetSummary({ log }) {
  const done = log.filter((x) => x.status === 'done').length;
  const warn = log.filter((x) => x.status === 'warn').length;
  return (
    <Box>
      <Typography variant="body2" sx={{ fontSize: '0.86rem' }}>
        Revertido: {done} de {log.length} {log.length === 1 ? 'item' : 'itens'}.
      </Typography>
      {warn > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', display: 'block', mt: 0.5 }}>
          {warn} {warn === 1 ? 'item precisa' : 'itens precisam'} de um passo seu — veja os avisos acima.
          Se preferir reverter tudo de uma vez, o reset de fábrica do aparelho é a garantia.
        </Typography>
      )}
    </Box>
  );
}
