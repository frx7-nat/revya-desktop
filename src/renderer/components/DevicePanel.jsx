// src/renderer/components/DevicePanel.jsx
// Aba CENTRAL. O celular Samsung (PhoneMock) é a peça central e está sempre
// visível: ele guia o usuário pelo tutorial, mostra o sucesso da conexão e,
// durante o provisionamento, espelha o progresso — como se o usuário visse o
// próprio aparelho no meio do app enquanto as alterações acontecem nele.
//
// Abaixo do celular: ficha técnica (quando validado) e o botão de aplicar.

import React from 'react';
import { Box, Typography, Stack, Chip, Button, Divider, Collapse } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TvIcon from '@mui/icons-material/Tv';
import PhoneMock from './PhoneMock';
import PhoneScreen from './PhoneScreen';
import PhoneAccessories from './PhoneAccessories';

function Spec({ label, value }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="overline" sx={{ display: 'block', fontSize: '0.85rem', lineHeight: 1.4 }}>
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

export default function DevicePanel({
  device, phase, onRun, running, ready, percent, currentLabel, showAccessories, onOpenDexGuide,
}) {
  const isTv = phase === 'tv';
  const validated = phase === 'success' || phase === 'working' || isTv;
  const searching = phase === 'tutorial' || phase === 'waiting';

  return (
    <Box sx={{
      height: '100%', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      px: 4, py: 4,
    }}>
      {/* Container que emoldura o celular e seus acessórios flutuantes.
          Os acessórios surgem ao redor quando a aba Acessórios está ativa
          (exceto no modo TV, onde o celular girado ocupa o espaço). */}
      <Box sx={{ position: 'relative', width: 440, display: 'flex', justifyContent: 'center' }}>
        <PhoneAccessories show={!!showAccessories && !isTv} />

        {/* Celular no centro. Após a 1ª configuração (isTv), ele gira para
            horizontal e cresce, simulando virar uma TV. */}
        <PhoneMock glow={validated} scanning={searching} tv={isTv}>
          <PhoneScreen
            phase={phase}
            model={device?.model}
            percent={percent}
            currentLabel={currentLabel}
          />
        </PhoneMock>
      </Box>

      {/* Ficha técnica: aparece quando validado, mas some no modo TV
          (o aparelho girado ocupa o espaço). */}
      <Collapse in={validated && !isTv} sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ mt: 4, width: '100%' }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              {device?.model || 'Dispositivo'}
            </Typography>
            {device?.dexSupport && (
              <Chip icon={<CheckCircleIcon />} label="DeX" color="success" variant="outlined" size="small" />
            )}
          </Stack>

          <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Spec label="Android" value={device?.android} />
            <Spec label="API" value={device?.sdk} />
            <Spec label="Bateria" value={device?.battery != null ? `${device.battery}%` : null} />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Button
            variant="contained" color="primary" size="large" fullWidth
            onClick={onRun} disabled={running || !ready}
            sx={{ py: 1.5, fontSize: '1rem' }}
          >
            {running ? 'Aplicando…' : 'Aplicar configuração'}
          </Button>
          {!ready && !running && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Selecione ao menos uma modificação à esquerda.
            </Typography>
          )}

          {/* Etapa opcional: configurar a saída de vídeo (desativar DeX).
              Relevante para aparelhos que têm DeX; inofensivo para os demais. */}
          <Button
            variant="text" color="primary" fullWidth startIcon={<TvIcon />}
            onClick={onOpenDexGuide}
            sx={{ mt: 1.5, fontSize: '0.82rem' }}
          >
            DeX vs Experiência de TV
          </Button>
        </Box>
      </Collapse>

      {/* No modo TV, um botão discreto para aplicar ajustes adicionais. */}
      {isTv && (
        <Button
          variant="outlined" color="primary"
          onClick={onRun} disabled={running || !ready}
          sx={{ mt: 6 }}
        >
          Aplicar mais ajustes
        </Button>
      )}
    </Box>
  );
}
