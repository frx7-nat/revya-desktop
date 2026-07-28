// src/renderer/components/ModeSwitchDialog.jsx
// Diálogo da ALTERNÂNCIA DE MODOS (a ponte celular ⇄ TV). Duas direções:
//
//   'phone'  Voltar ao modo celular — adormece as tasks de modo: fotografa o
//            modo TV como está AGORA (perfil vivo), devolve os ajustes
//            originais e marca as entradas como dormentes. Nada é
//            desinstalado: apps, launcher e logins ficam no aparelho.
//   'tv'     Ativar modo TV — reaplica o perfil salvo, exatamente como o
//            usuário o deixou da última vez (inclusive personalizações feitas
//            ao longo dos dias).
//
// A fila vem pronta do App (já filtrada por isModeTask e na ordem certa:
// inversa para adormecer, de aplicação para acordar).
//
// FLUXO ROBUSTO — obstáculos viram perguntas, nunca avisos às cegas:
//   confirm/countdown → pré-checagem → execução item a item → (paused: o
//   processo PARA e pergunta — Tentar de novo / Pular / Reinstalar / Parar)
//   → conferência final (só leitura) → resumo honesto com "Corrigir agora".
//
// `variant` controla a entrada:
//   'manual'  confirmação normal (botão da lateral);
//   'auto'    ponte automática ao conectar — contagem regressiva de 10 s com
//             Cancelar (também faz papel de debounce de cabo mau contato);
//   'resume'  troca anterior ficou no meio (cabo, bloqueio ou "parar por
//             aqui") — oferece CONCLUIR de onde parou.
//   'reset'   RESET DE INTERFACE (direction 'phone', fila com TODAS as
//             entradas de modo, inclusive dormentes): devolve a interface de
//             celular ao estado ORIGINAL da primeira configuração
//             (layer 'original' + force) e apaga o retrato vivo contaminado.
//             Apps e perfil TV ficam intactos. Não grava pendingSwitch — se
//             parar no meio, é só usar o mesmo botão de novo.
//
// A troca em andamento fica marcada nas preferências do aparelho
// (pendingSwitch) e só é limpa quando a fila chega ao fim — se algo
// interromper, a próxima conexão pergunta se o usuário quer concluir.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, IconButton,
  CircularProgress, Divider, Slide, FormControlLabel, Checkbox,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TvIcon from '@mui/icons-material/Tv';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import { friendlyError } from '../utils/errors';
import { useT } from '../i18n';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const STATUS_ICON = {
  pending: <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.4 }} />,
  running: <CircularProgress size={15} color="primary" />,
  done: <CheckCircleIcon fontSize="small" color="success" />,
  warn: <WarningAmberIcon fontSize="small" sx={{ color: 'primary.main' }} />,
  skipped: <WarningAmberIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
  blocked: <ErrorOutlineIcon fontSize="small" color="error" />,
};

// Ícone + PREFIXO da chave, nunca o texto. Esta é constante de módulo,
// avaliada no import: uma frase escrita aqui ficaria congelada no idioma de
// origem, e o botão de troca não a alcançaria. Mesma armadilha do
// OBSTACLE_KEYS no main.js.
const COPY = {
  tv:    { icon: <TvIcon sx={{ color: 'primary.main' }} />, key: 'modeSwitch.tv' },
  phone: { icon: <PhoneAndroidIcon sx={{ color: 'primary.main' }} />, key: 'modeSwitch.phone' },
  reset: { icon: <SettingsBackupRestoreIcon sx={{ color: 'primary.main' }} />, key: 'modeSwitch.reset' },
};

const COUNTDOWN_SECONDS = 10;

export default function ModeSwitchDialog({
  open, serial, direction, queue = [], variant = 'manual',
  autoTvPref = false, onToggleAutoTv, onClose, onDone,
  deviceConnected = true, launcherInstallTask = null,
}) {
  const { t } = useT();
  // 'confirm' | 'countdown' | 'running' | 'paused' | 'verifying' | 'done'
  const [phase, setPhase] = useState('confirm');
  const [log, setLog] = useState([]);
  // Obstáculo aguardando resposta: { fromPreflight, index, obstacle, message, busy }
  const [paused, setPaused] = useState(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [stopped, setStopped] = useState(false);
  const [fixing, setFixing] = useState(false);
  const runningRef = useRef(false);
  // IDs alternados com sucesso — é o que a conferência final verifica.
  const doneIdsRef = useRef(new Set());
  // Espelho do log para leituras dentro de fluxos async (evita closure velha).
  const logRef = useRef([]);
  useEffect(() => { logRef.current = log; }, [log]);
  const copy = variant === 'reset' ? COPY.reset : (COPY[direction] || COPY.tv);
  // Reset de interface: força mesmo entradas dormentes e usa a camada do
  // estado ORIGINAL (a primeira configuração) em vez do perfil celular vivo.
  const switchOpts = variant === 'reset' ? { force: true, layer: 'original' } : undefined;
  const verifyOpts = variant === 'reset' ? { layer: 'original' } : undefined;

  useEffect(() => {
    if (open) {
      setPhase(variant === 'auto' ? 'countdown' : 'confirm');
      setLog(queue.map((e) => ({ taskId: e.taskId, label: e.label, status: 'pending' })));
      setPaused(null);
      setCountdown(COUNTDOWN_SECONDS);
      setStopped(false);
      setFixing(false);
      runningRef.current = false;
      doneIdsRef.current = new Set();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setItem = useCallback((taskId, patch) => {
    setLog((l) => l.map((x) => (x.taskId === taskId ? { ...x, ...patch } : x)));
  }, []);

  // Launcher de TV do catálogo (pacote fixo do modo TV) — a pré-checagem da
  // ida ao TV confirma que ele segue instalado antes de mexer em qualquer coisa.
  const homePkg = useMemo(() => {
    const it = queue.find((e) => e.fallbackTask && e.fallbackTask.kind === 'home');
    return (it && it.fallbackTask && it.fallbackTask.pkg) || null;
  }, [queue]);

  // Conferência final (só leitura): confere item a item se o resultado da
  // troca está de fato valendo no aparelho — a "segunda ponta" da robustez.
  const verifyAll = useCallback(async () => {
    setPhase('verifying');
    // Contadores locais da conferência (o log é estado assíncrono; contar aqui
    // é o que dá o fingerprint exato do que foi conferido AGORA).
    let verified = 0;
    let verifyFail = 0;
    for (const item of queue) {
      if (!doneIdsRef.current.has(item.taskId)) continue;
      const res = await window.api
        .modeVerifyOne(serial, direction, item.taskId, item.fallbackTask, verifyOpts)
        .catch(() => ({ ok: true }));
      if (res.ok) {
        setItem(item.taskId, { verify: 'ok' });
        verified += 1;
      } else {
        setItem(item.taskId, {
          status: 'warn', verify: 'fail',
          detail: t('modeSwitch.notConfirmed', { detail: res.detail || t('modeSwitch.divergentValue') }),
        });
        verifyFail += 1;
      }
    }
    setPhase('done');
    // Diário: anota o resumo da troca no arquivo do aparelho (diagnóstico) e
    // recria o espelhamento se estiver aberto — a mudança de resolução pode
    // deixar o stream do scrcpy degradado até a sessão ser recriada.
    const counts = { done: 0, warn: 0, skipped: 0, blocked: 0 };
    for (const x of logRef.current) {
      if (counts[x.status] !== undefined) counts[x.status] += 1;
    }
    if (window.api.modeJournal) {
      window.api.modeJournal(serial, { type: 'troca', direction, variant, ...counts }).catch(() => {});
      // Fingerprint pós-troca: a conferência completa da troca vira uma linha
      // no diário — o drift é flagrado NA HORA, não só quando o usuário lembra
      // de rodar o Check-up.
      const checked = verified + verifyFail;
      if (checked > 0) {
        window.api.modeJournal(serial, {
          type: 'fingerprint-pos-troca',
          detail: verifyFail === 0
            ? t('modeSwitch.verifiedAll', { verified, checked })
            : t('modeSwitch.verifiedSome', { verified, checked, failed: verifyFail }),
        }).catch(() => {});
      }
    }
    if (window.api.restartMirror) window.api.restartMirror(serial).catch(() => {});
    onDone && onDone();
  }, [queue, serial, direction, variant, setItem, onDone, verifyOpts]);

  // Núcleo da execução: roda a fila a partir de um índice, com pré-checagem.
  // Qualquer obstáculo PAUSA e pergunta — retomar continua deste mesmo ponto.
  const processFrom = useCallback(async (startIndex, { skipPreflight = false } = {}) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPaused(null);
    setPhase('running');
    try {
      if (!skipPreflight) {
        // Fluxos automáticos (ponte automática e retomada) pedem a conferência
        // de identidade no preflight — aplicar sem o usuário pedir exige ter
        // certeza de que é o aparelho certo.
        const confirmIdentity = variant === 'auto' || variant === 'resume';
        const pf = await window.api
          .modePreflight(serial, { direction, launcherPkg: homePkg, confirmIdentity })
          .catch(() => ({ ok: true }));
        if (!pf.ok) {
          setPhase('paused');
          setPaused({ fromPreflight: true, index: startIndex, obstacle: pf.obstacle, message: pf.message });
          return;
        }
      }
      // Marca a troca como EM ANDAMENTO só depois da pré-checagem passar —
      // se ela for interrompida, a próxima conexão oferece concluir. O reset
      // de interface fica de fora: a retomada automática usaria a camada
      // errada (perfil vivo); interrompido, é só usar o mesmo botão de novo.
      if (startIndex === 0 && variant !== 'reset') {
        await window.api.modeSetPrefs(serial, { pendingSwitch: direction }).catch(() => {});
      }
      for (let i = 0; i < startIndex; i++) {
        // Retomada: itens anteriores já alternaram — mantém o visual de feito.
        const prev = queue[i];
        if (doneIdsRef.current.has(prev.taskId)) setItem(prev.taskId, { status: 'done' });
      }
      for (let i = startIndex; i < queue.length; i++) {
        const item = queue[i];
        setItem(item.taskId, { status: 'running' });
        const res = await window.api
          .modeSwitchOne(serial, direction, item.taskId, item.fallbackTask, switchOpts)
          .catch((err) => ({ ok: false, obstacle: 'error', message: friendlyError(err) }));
        if (res.ok) {
          doneIdsRef.current.add(item.taskId);
          setItem(item.taskId, { status: 'done', detail: res.detail });
        } else {
          setItem(item.taskId, { status: 'blocked', detail: res.message });
          setPhase('paused');
          setPaused({ fromPreflight: false, index: i, obstacle: res.obstacle, message: res.message });
          return;
        }
      }
      // Fila completa: a troca deixou de estar pendente; confere o resultado.
      await window.api.modeSetPrefs(serial, { pendingSwitch: null }).catch(() => {});
      await verifyAll();
    } finally {
      runningRef.current = false;
    }
  }, [serial, direction, queue, homePkg, setItem, verifyAll, variant, switchOpts]);

  // Contagem regressiva da ponte automática: dá tempo de cancelar quando o
  // usuário conectou o aparelho para usá-lo como CELULAR.
  useEffect(() => {
    if (!open || phase !== 'countdown') return undefined;
    if (countdown <= 0) { processFrom(0); return undefined; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [open, phase, countdown, processFrom]);

  // Aparelho sumiu antes de começar (cabo mau contato durante a contagem, por
  // exemplo): fecha sem alterar nada. Durante uma pausa o diálogo FICA —
  // é justamente o caso "reconecte e continue".
  useEffect(() => {
    if (open && !deviceConnected && (phase === 'confirm' || phase === 'countdown')) onClose();
  }, [open, deviceConnected, phase, onClose]);

  // ---- Respostas do usuário aos obstáculos --------------------------------
  const retry = useCallback(() => {
    if (paused) processFrom(paused.index);
  }, [paused, processFrom]);

  const skipItem = useCallback(() => {
    if (!paused || paused.fromPreflight) return;
    const item = queue[paused.index];
    setItem(item.taskId, { status: 'skipped', detail: t('modeSwitch.skippedByUser') });
    processFrom(paused.index + 1, { skipPreflight: true });
  }, [paused, queue, setItem, processFrom]);

  const continueAnyway = useCallback(() => {
    if (paused) processFrom(paused.index, { skipPreflight: true });
  }, [paused, processFrom]);

  const stopHere = useCallback(() => {
    // pendingSwitch fica gravado de propósito: a próxima conexão oferece
    // concluir a troca de onde parou.
    setStopped(true);
    setPhase('done');
    if (window.api.modeJournal) {
      window.api.modeJournal(serial, { type: 'troca', direction, variant, stopped: true }).catch(() => {});
    }
    onDone && onDone();
  }, [onDone, serial, direction, variant]);

  const reinstallLauncher = useCallback(async () => {
    if (!paused || !launcherInstallTask) return;
    setPaused((p) => (p ? { ...p, busy: true, message: t('modeSwitch.reinstalling') } : p));
    try {
      await window.api.runTask(serial, launcherInstallTask);
      processFrom(paused.index);
    } catch (err) {
      setPaused((p) => (p ? {
        ...p, busy: false,
        message: t('modeSwitch.reinstallFailed', { error: friendlyError(err) }),
      } : p));
    }
  }, [paused, launcherInstallTask, serial, processFrom]);

  // "Corrigir agora": reexecuta SÓ os itens que a conferência final reprovou
  // (force: reaplica mesmo uma entrada já marcada) e confere de novo.
  const fixNow = useCallback(async () => {
    setFixing(true);
    const bad = queue.filter((q) => {
      const entry = logRef.current.find((x) => x.taskId === q.taskId);
      return entry && entry.verify === 'fail';
    });
    for (const item of bad) {
      setItem(item.taskId, { status: 'running', detail: null });
      const res = await window.api
        .modeSwitchOne(serial, direction, item.taskId, item.fallbackTask, { ...switchOpts, force: true })
        .catch((err) => ({ ok: false, message: friendlyError(err) }));
      if (!res.ok) {
        setItem(item.taskId, { status: 'warn', verify: 'fail', detail: res.message });
        continue;
      }
      const v = await window.api
        .modeVerifyOne(serial, direction, item.taskId, item.fallbackTask, verifyOpts)
        .catch(() => ({ ok: true }));
      setItem(item.taskId, v.ok
        ? { status: 'done', verify: 'ok', detail: res.detail }
        : { status: 'warn', verify: 'fail', detail: t('modeSwitch.stillDivergent', { detail: v.detail || '' }) });
    }
    setFixing(false);
    onDone && onDone();
  }, [queue, serial, direction, setItem, onDone, switchOpts, verifyOpts]);

  const busy = phase === 'running' || phase === 'verifying' || fixing || !!(paused && paused.busy);
  const close = () => { if (!busy) onClose(); };

  // Botões da pergunta, conforme o obstáculo. "Tentar de novo" refaz a
  // pré-checagem (valida a reconexão/o desbloqueio) e segue do mesmo ponto.
  const pausedActions = paused && !paused.busy ? (
    <Stack spacing={1} sx={{ mt: 1.5 }}>
      {paused.obstacle === 'launcher-missing' && launcherInstallTask && (
        <Button variant="contained" color="primary" fullWidth onClick={reinstallLauncher}>
          {t('modeSwitch.reinstallAndContinue')}
        </Button>
      )}
      <Button
        variant={paused.obstacle === 'launcher-missing' && launcherInstallTask ? 'outlined' : 'contained'}
        color="primary" fullWidth onClick={retry}
      >
        {t('modeSwitch.retry')}
      </Button>
      {paused.obstacle === 'locked' && (
        <Button variant="outlined" color="inherit" fullWidth onClick={continueAnyway}
          sx={{ color: 'text.secondary' }}>
          {t('modeSwitch.continueAnyway')}
        </Button>
      )}
      {!paused.fromPreflight && paused.obstacle === 'error' && (
        <Button variant="outlined" color="inherit" fullWidth onClick={skipItem}
          sx={{ color: 'text.secondary' }}>
          {t('modeSwitch.skipItem')}
        </Button>
      )}
      <Button variant="text" color="inherit" fullWidth onClick={stopHere}
        sx={{ color: 'text.secondary' }}>
        {t('modeSwitch.stopHere')}
      </Button>
    </Stack>
  ) : null;

  return (
    <Dialog open={open} onClose={close} TransitionComponent={SlideUp} maxWidth="xs" fullWidth
      PaperProps={{ sx: {
        borderRadius: 4,
        background: 'linear-gradient(160deg, #1E2430 0%, #16151B 70%)',
        border: '1px solid rgba(255,185,74,0.25)',
      } }}>
      <IconButton onClick={close} size="small" disabled={busy}
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        {phase === 'confirm' && (
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              {copy.icon}
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>
                {variant === 'resume' ? t('modeSwitch.resume.title') : t(`${copy.key}.title`)}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.55, mb: 2 }}>
              {variant === 'resume'
                ? t(queue.length === 1 ? 'modeSwitch.resume.bodyOne' : 'modeSwitch.resume.bodyMany', {
                  n: queue.length,
                  mode: t(direction === 'phone' ? 'modeSwitch.modePhone' : 'modeSwitch.modeTv'),
                })
                : t(`${copy.key}.body`)}
            </Typography>

            <Stack spacing={0.8} sx={{ mb: 2, maxHeight: 220, overflowY: 'auto' }}>
              {queue.length === 0 ? (
                <Typography variant="caption" color="text.secondary">{t('modeSwitch.nothingToSwitch')}</Typography>
              ) : queue.map((e) => (
                <Stack key={e.taskId} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{e.label}</Typography>
                </Stack>
              ))}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Button variant="text" color="inherit" fullWidth onClick={close}
                sx={{ color: 'text.secondary' }}>
                {variant === 'resume' ? t('modeSwitch.resume.later') : t('modeSwitch.cancel')}
              </Button>
              <Button variant="contained" color="primary" fullWidth onClick={() => processFrom(0)}
                disabled={queue.length === 0}>
                {variant === 'resume' ? t('modeSwitch.resumeNow') : t(`${copy.key}.action`)}
              </Button>
            </Stack>

            {/* Ponte automática: ao conectar o aparelho (cabo ou Wi-Fi) com o
                modo TV adormecido, o app o reativa sozinho. Não faz sentido
                no reset de interface. */}
            {variant !== 'reset' && <FormControlLabel
              sx={{ ml: 0.2, mt: 0.5 }}
              control={
                <Checkbox size="small" checked={autoTvPref}
                  onChange={(e) => onToggleAutoTv && onToggleAutoTv(e.target.checked)} />
              }
              label={
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem', lineHeight: 1.4 }}>
                  {t('modeSwitch.autoTvLabel')}
                </Typography>
              }
            />}
          </Box>
        )}

        {phase === 'countdown' && (
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              {copy.icon}
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>
                {t('modeSwitch.countdownTitle', { n: countdown })}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.55, mb: 2 }}>
              {t('modeSwitch.countdownBody')}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="text" color="inherit" fullWidth onClick={close}
                sx={{ color: 'text.secondary' }}>
                {t('modeSwitch.cancel')}
              </Button>
              <Button variant="contained" color="primary" fullWidth onClick={() => processFrom(0)}>
                {t('modeSwitch.activateNow')}
              </Button>
            </Stack>
          </Box>
        )}

        {(phase === 'running' || phase === 'paused' || phase === 'verifying' || phase === 'done') && (
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 2 }}>
              {phase === 'running' && t(`${copy.key}.runningTitle`)}
              {phase === 'paused' && t('modeSwitch.pausedTitle')}
              {phase === 'verifying' && 'Conferindo os ajustes…'}
              {phase === 'done' && (stopped ? t('modeSwitch.switchStopped') : t(`${copy.key}.doneTitle`))}
            </Typography>

            <Stack spacing={1.2} sx={{ mb: 2, maxHeight: 260, overflowY: 'auto' }}>
              {log.map((x) => (
                <Stack key={x.taskId} direction="row" spacing={1.3} alignItems="flex-start">
                  <Box sx={{ mt: 0.2 }}>{STATUS_ICON[x.status]}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{x.label}</Typography>
                    {x.detail && (x.status === 'warn' || x.status === 'skipped' || x.status === 'blocked') && (
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: x.status === 'blocked' ? 'error.main' : 'primary.main', lineHeight: 1.3 }}>
                        {x.detail}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ))}
            </Stack>

            {phase === 'paused' && paused && (
              <Box sx={{
                p: 1.8, borderRadius: 2, mb: 1,
                border: '1px solid rgba(255,185,74,0.35)',
                bgcolor: 'rgba(255,185,74,0.06)',
              }}>
                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  {paused.busy
                    ? <CircularProgress size={16} color="primary" sx={{ mt: 0.3 }} />
                    : <WarningAmberIcon fontSize="small" sx={{ color: 'primary.main', mt: 0.2 }} />}
                  <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {paused.message}
                  </Typography>
                </Stack>
                {pausedActions}
              </Box>
            )}

            {phase === 'done' && (
              <>
                <Divider sx={{ mb: 2 }} />
                <ModeSummary log={log} direction={direction} stopped={stopped} variant={variant} />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  {log.some((x) => x.verify === 'fail') && (
                    <Button variant="outlined" color="primary" fullWidth onClick={fixNow} disabled={fixing}>
                      {fixing ? t('modeSwitch.fixing') : t('modeSwitch.fixNow')}
                    </Button>
                  )}
                  <Button variant="contained" color="primary" fullWidth onClick={onClose} disabled={fixing}>
                    {t('modeSwitch.close')}
                  </Button>
                </Stack>
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Resumo honesto: quantos alternaram (e conferiram), quantos precisam de
// atenção, e o que acontece com o que ficou pendente.
function ModeSummary({ log, direction, stopped, variant }) {
  const { t } = useT();
  const done = log.filter((x) => x.status === 'done').length;
  const attention = log.filter((x) => x.status === 'warn' || x.status === 'skipped' || x.status === 'blocked').length;
  const verified = log.filter((x) => x.verify === 'ok').length;
  const verifyFail = log.filter((x) => x.verify === 'fail').length;
  const pending = log.filter((x) => x.status === 'pending').length;
  return (
    <Box>
      <Typography variant="body2" sx={{ fontSize: '0.86rem' }}>
        {t('modeSwitch.summary.line', {
          what: variant === 'reset' ? t('modeSwitch.summary.restored')
            : direction === 'phone' ? t('modeSwitch.summary.backToPhone')
            : t('modeSwitch.summary.tvApplied'),
          done,
          total: log.length,
          unit: t(log.length === 1 ? 'modeSwitch.summary.unitOne' : 'modeSwitch.summary.unitMany'),
        })}
      </Typography>
      {(verified > 0 || verifyFail > 0) && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', display: 'block', mt: 0.5 }}>
          {t('modeSwitch.summary.checkLine', {
            verified,
            unit: t(verified === 1 ? 'modeSwitch.summary.checkUnitOne' : 'modeSwitch.summary.checkUnitMany'),
            tail: verifyFail > 0
              ? t('modeSwitch.summary.checkTailFail', {
                n: verifyFail,
                verb: t(verifyFail === 1 ? 'modeSwitch.summary.checkVerbOne' : 'modeSwitch.summary.checkVerbMany'),
              })
              : t('modeSwitch.summary.checkTailOk'),
          })}
        </Typography>
      )}
      {stopped && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', display: 'block', mt: 0.5 }}>
          {t(pending + attention > 0
            ? 'modeSwitch.summary.pendingStopped'
            : 'modeSwitch.summary.pendingAlready')}
        </Typography>
      )}
      {!stopped && attention > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', display: 'block', mt: 0.5 }}>
          {t(attention === 1 ? 'modeSwitch.summary.attentionOne' : 'modeSwitch.summary.attentionMany', { n: attention })}
        </Typography>
      )}
    </Box>
  );
}
