// src/renderer/components/ResetDialog.jsx
// Diálogo da "Reversão completa" — desfaz TUDO de uma vez (a reversão
// isolada, item a item, fica na barra lateral). Dois momentos:
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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useT } from '../i18n';
import { entryLabel } from '../utils/labels';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { friendlyError } from '../utils/errors';

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

// `onInterfaceReset` (opcional): abre o RESET DE INTERFACE — o caminho NÃO
// destrutivo para quando só a interface do celular ficou torta. Vem nulo
// quando não há entradas de modo no registro.
export default function ResetDialog({ open, serial, onClose, onReverted, onSessionReset, onInterfaceReset }) {
  const { t } = useT();
  const [phase, setPhase] = useState('confirm'); // 'confirm' | 'running' | 'done'
  const [entries, setEntries] = useState([]);
  const [log, setLog] = useState([]);

  // Ao abrir, carrega a lista do que será revertido.
  const reload = () => {
    window.api.revertList(serial).then(setEntries).catch(() => setEntries([]));
  };
  useEffect(() => {
    if (open && serial) {
      setPhase('confirm');
      setLog([]);
      reload();
    }
  }, [open, serial]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exporta/importa o registro de reversão (JSON). O registro mora NESTE
  // computador; exportar permite desfazer as alterações a partir de outro.
  const [transferMsg, setTransferMsg] = useState(null);
  const doExport = async () => {
    setTransferMsg(null);
    try {
      const saved = await window.api.revertExport(serial);
      if (saved) setTransferMsg(t('reset.exported'));
    } catch (e) { setTransferMsg(friendlyError(e)); }
  };
  const doImport = async () => {
    setTransferMsg(null);
    try {
      const count = await window.api.revertImport(serial);
      if (count != null) {
        setTransferMsg(`Importado — ${count} ${count === 1 ? 'item' : 'itens'} no registro.`);
        reload();
        onReverted && onReverted(); // atualiza contagem/travas no App
      }
    } catch (e) { setTransferMsg(friendlyError(e)); }
  };

  const runRevert = async () => {
    setPhase('running');
    // Reverte na ordem INVERSA da aplicação: tasks que mexem no mesmo recurso
    // (ex.: duas resoluções) se desfazem corretamente — a última aplicada é a
    // primeira desfeita, como numa pilha.
    const queue = [...entries].reverse();
    setLog(queue.map((e) => ({ taskId: e.taskId, label: entryLabel(t, e), status: 'pending' })));

    for (const entry of queue) {
      setLog((l) => l.map((x) => x.taskId === entry.taskId ? { ...x, status: 'running' } : x));
      try {
        const detail = await window.api.revertOne(serial, entry.taskId);
        setLog((l) => l.map((x) => x.taskId === entry.taskId ? { ...x, status: 'done', detail } : x));
      } catch (err) {
        // Falha parcial: marca como aviso e segue para o próximo.
        setLog((l) => l.map((x) => x.taskId === entry.taskId
          ? { ...x, status: 'warn', detail: friendlyError(err) } : x));
      }
    }
    // Reversão completa = fim da sessão de configuração: apaga preferências e
    // registros no disco (itens que falharam permanecem, seguem reversíveis)
    // e pede ao App para limpar o histórico da interface — recomeço do zero.
    try { await window.api.sessionReset(serial); } catch { /* não-fatal */ }
    setPhase('done');
    onReverted && onReverted(); // avisa o App para atualizar contagem e travas
    onSessionReset && onSessionReset(); // limpa histórico/seleções/preferências na UI
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
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>{t('reset.title')}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.55, mb: 2 }}>
              {t('reset.intro')}
            </Typography>

            <Stack spacing={0.8} sx={{ mb: 2 }}>
              {entries.length === 0 ? (
                <Typography variant="caption" color="text.secondary">{t('reset.nothing')}</Typography>
              ) : entries.map((e) => (
                <Stack key={e.taskId} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{entryLabel(t, e)}</Typography>
                </Stack>
              ))}
            </Stack>

            {/* Caminho não destrutivo primeiro: se o problema é só a
                interface do celular "torta", não é preciso desfazer tudo —
                o reset de interface devolve o estado original da primeira
                configuração mantendo apps, arquivos e o modo TV salvo. */}
            {onInterfaceReset && (
              <Stack spacing={1} sx={{
                p: 1.5, borderRadius: 2, mb: 1.2,
                bgcolor: 'rgba(255,185,74,0.06)', border: '1px solid rgba(255,185,74,0.3)',
              }}>
                <Typography variant="caption" sx={{ fontSize: '0.74rem', lineHeight: 1.5, color: 'text.primary' }}>
                  {t('reset.interfaceOnly')}
                </Typography>
                <Button variant="outlined" color="primary" size="small" fullWidth
                  startIcon={<SettingsBackupRestoreIcon sx={{ fontSize: 16 }} />}
                  onClick={onInterfaceReset}
                  sx={{ textTransform: 'none', fontSize: '0.78rem' }}>
                  {t('reset.interfaceReset')}
                </Button>
              </Stack>
            )}

            {/* Aviso do DeX: a reversão por software não religa o DeX. */}
            <Stack direction="row" spacing={1.2} sx={{
              p: 1.5, borderRadius: 2, mb: 1.2,
              bgcolor: 'rgba(255,185,74,0.1)', border: '1px solid rgba(255,185,74,0.3)',
            }}>
              <WarningAmberIcon sx={{ fontSize: 19, color: 'primary.main', flexShrink: 0, mt: 0.1 }} />
              <Typography variant="caption" sx={{ fontSize: '0.74rem', lineHeight: 1.5, color: 'text.primary' }}>
                {t('reset.dexWarning')}
              </Typography>
            </Stack>

            {/* Fim de sessão: comunica, em linguagem simples, que o registro
                guardado será apagado e o programa recomeça do zero. */}
            <Stack direction="row" spacing={1.2} sx={{
              p: 1.5, borderRadius: 2, mb: 2.5,
              bgcolor: 'rgba(120,170,255,0.08)', border: '1px solid rgba(120,170,255,0.25)',
            }}>
              <InfoOutlinedIcon sx={{ fontSize: 19, color: 'info.main', flexShrink: 0, mt: 0.1 }} />
              <Typography variant="caption" sx={{ fontSize: '0.74rem', lineHeight: 1.5, color: 'text.primary' }}>
                {t('reset.sessionEnd')}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button variant="text" color="inherit" fullWidth onClick={close}
                sx={{ color: 'text.secondary' }}>
                {t('reset.cancel')}
              </Button>
              <Button variant="contained" color="error" fullWidth onClick={runRevert}
                disabled={entries.length === 0}>
                {t('reset.confirm')}
              </Button>
            </Stack>

            {/* Levar o registro para outro computador (ou trazer de um). */}
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1.5 }}>
              <Button size="small" variant="text" startIcon={<FileDownloadIcon sx={{ fontSize: 14 }} />}
                onClick={doExport} disabled={entries.length === 0}
                sx={{ fontSize: '0.72rem', textTransform: 'none', color: 'text.secondary' }}>
                {t('reset.export')}
              </Button>
              <Button size="small" variant="text" startIcon={<FileUploadIcon sx={{ fontSize: 14 }} />}
                onClick={doImport}
                sx={{ fontSize: '0.72rem', textTransform: 'none', color: 'text.secondary' }}>
                {t('reset.import')}
              </Button>
            </Stack>
            {transferMsg && (
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mt: 0.5, fontSize: '0.72rem' }}>
                {transferMsg}
              </Typography>
            )}
          </Box>
        )}

        {(phase === 'running' || phase === 'done') && (
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 2 }}>
              {phase === 'running' ? t('reset.running') : t('reset.done')}
            </Typography>

            <Stack spacing={1.2} sx={{ mb: 2.5 }}>
              {log.map((x) => (
                <Stack key={x.taskId} direction="row" spacing={1.3} alignItems="flex-start">
                  <Box sx={{ mt: 0.2 }}>{STATUS_ICON[x.status]}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{x.label}</Typography>
                    {x.detail && x.status === 'warn' && (
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'primary.main', lineHeight: 1.3 }}>
                        {t('reset.manualStep', { detail: x.detail })}
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
                  {t('reset.close')}
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
  const { t } = useT();
  const done = log.filter((x) => x.status === 'done').length;
  const warn = log.filter((x) => x.status === 'warn').length;
  return (
    <Box>
      <Typography variant="body2" sx={{ fontSize: '0.86rem' }}>
        {t('reset.summary', { done, total: log.length, unit: t(log.length === 1 ? 'reset.unitOne' : 'reset.unitMany') })}
      </Typography>
      {warn > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', display: 'block', mt: 0.5 }}>
          {t(warn === 1 ? 'reset.warnOne' : 'reset.warnMany', { n: warn })}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', display: 'block', mt: 0.5 }}>
        {t('reset.newSession')}
      </Typography>
    </Box>
  );
}
