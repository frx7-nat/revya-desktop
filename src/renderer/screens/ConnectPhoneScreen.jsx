/**
 * ConnectPhoneScreen.jsx
 * -----------------------------------------------------------------------------
 * Tela "Conecte seu Galaxy" do DexArmor.
 *
 * Faz polling DO LADO DO RENDERER chamando window.api.checkDevices() em ciclos.
 * A cada ciclo, o cartão de diagnóstico é atualizado AO VIVO — então se o
 * telefone estiver `unauthorized`, o usuário já vê os passos para autorizar, em
 * vez de esperar um spinner até o fim. Quando um Galaxy fica pronto, o polling
 * para e a tela avança (botão "Iniciar configuração" ou, opcionalmente, auto).
 *
 * A recuperação automática (reinício do servidor ADB) roda só na PRIMEIRA
 * passada de cada rodada, para não reiniciar o ADB a cada ciclo de polling.
 *
 * Props:
 *   onReady            callback(resultado) quando o usuário confirma / avança.
 *   pollIntervalMs     intervalo entre ciclos (padrão 2000).
 *   autoAdvance        se true, chama onReady automaticamente ao ficar pronto
 *                      (padrão false — provisionar é melhor com confirmação).
 *
 * Depende de DeviceStatusCard.jsx e da ponte IPC (window.api, ver preload.js).
 * -----------------------------------------------------------------------------
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import DeviceStatusCard from '../components/DeviceStatusCard.jsx';
import { useT } from '../i18n';

export default function ConnectPhoneScreen({
  onReady,
  pollIntervalMs = 2000,
  autoAdvance = false,
}) {
  const { t } = useT();
  const [diagnosis, setDiagnosis] = useState(null);
  const [phase, setPhase] = useState('querying');
  const [polling, setPolling] = useState(true);

  const firstPassRef = useRef(true); // controla recuperação só no 1º ciclo da rodada
  const mountedRef = useRef(true);

  // Recebe as fases do orquestrador (spinner ao vivo durante cada ciclo).
  useEffect(() => {
    const unsubscribe = window.api.onPhase((f) => {
      if (mountedRef.current) setPhase(f);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Um ciclo de verificação.
  const pollOnce = useCallback(async () => {
    const recover = firstPassRef.current;
    firstPassRef.current = false;

    const result = await window.api.checkDevices({ recover });
    if (!mountedRef.current) return null;

    setPhase('done');
    setDiagnosis(result.actionable);

    if (result.hasReadyDevice) {
      setPolling(false);
      if (autoAdvance && typeof onReady === 'function') onReady(result);
    }
    return result;
  }, [autoAdvance, onReady]);

  // Loop de polling: roda enquanto `polling` for true.
  useEffect(() => {
    if (!polling) return undefined;

    let cancelled = false;
    let timer = null;

    const loop = async () => {
      if (cancelled) return;
      await pollOnce();
      if (cancelled) return;
      timer = setTimeout(loop, pollIntervalMs);
    };

    loop();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [polling, pollOnce, pollIntervalMs]);

  // "Verificar de novo": reabilita a recuperação e reinicia o polling.
  const handleRetry = useCallback(() => {
    firstPassRef.current = true;
    setDiagnosis((d) => d); // mantém o cartão atual enquanto reconsulta
    setPolling(true);
  }, []);

  const handleStart = useCallback(() => {
    if (typeof onReady === 'function') onReady({ actionable: diagnosis });
  }, [onReady, diagnosis]);

  // Mostra o spinner do cartão só na carga inicial ou durante a recuperação;
  // nos ciclos de polling em segundo plano, mantém o diagnóstico visível.
  const cardPhase =
    diagnosis == null ? phase : phase === 'recovering' ? 'recovering' : 'done';

  return (
    <Box
      sx={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: 3,
      }}
    >
      <Stack spacing={0.5} alignItems="center" sx={{ textAlign: 'center', maxWidth: 460 }}>
        <Typography variant="h5" component="h1">
          {t('connect.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('connect.body')}
        </Typography>
      </Stack>

      <DeviceStatusCard
        diagnosis={diagnosis}
        phase={cardPhase}
        onRetry={handleRetry}
        onStart={handleStart}
      />
    </Box>
  );
}
