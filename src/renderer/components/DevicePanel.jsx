// src/renderer/components/DevicePanel.jsx
// Aba CENTRAL. O celular Samsung (PhoneMock) é a peça central e está sempre
// visível: ele guia o usuário pelo tutorial, mostra o sucesso da conexão e,
// durante o provisionamento, espelha o progresso — como se o usuário visse o
// próprio aparelho no meio do app enquanto as alterações acontecem nele.
//
// Abaixo do celular: ficha técnica (quando validado) e o botão de aplicar.

import React from 'react';
import {
  Box, Typography, Stack, Chip, Button, Divider, Collapse,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WifiIcon from '@mui/icons-material/Wifi';
import TvIcon from '@mui/icons-material/Tv';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhoneMock from './PhoneMock';
import PhoneScreen from './PhoneScreen';
import PhoneAccessories from './PhoneAccessories';
import { useT } from '../i18n';

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

// Chip de ESTADO DO MODO, sempre visível sob o celular: diz em qual modo o
// aparelho está sem o usuário precisar deduzir pelo desenho ou pelo rótulo do
// botão da lateral. A troca incompleta (ficou no meio por cabo/bloqueio/
// "parar por aqui") vira um chip de alerta CLICÁVEL que retoma de onde parou
// — antes, ela só aparecia ao reconectar o aparelho.
function ModeStatusChip({ modeState, onResumePending, disabled }) {
  const { t } = useT();
  if (!modeState) return null;
  if (modeState.kind === 'pending') {
    return (
      <Chip
        icon={<WarningAmberIcon />}
        label={t(modeState.direction === 'phone' ? 'device.pendingPhone' : 'device.pendingTv')}
        color="warning" variant="outlined" size="small"
        onClick={disabled ? undefined : onResumePending}
        sx={{ mt: 2, fontWeight: 600 }}
      />
    );
  }
  return modeState.kind === 'tv' ? (
    <Chip icon={<TvIcon />} label={t('device.tvMode')} color="primary" variant="outlined" size="small"
      sx={{ mt: 2, fontWeight: 600 }} />
  ) : (
    <Chip icon={<PhoneAndroidIcon />} label={t('device.phoneMode')} variant="outlined" size="small"
      sx={{ mt: 2, fontWeight: 600, color: 'text.secondary' }} />
  );
}

export default function DevicePanel({
  device, phase, onRun, onRunRecommended, running, ready, percent, currentLabel,
  showAccessories, devices = [], onPickDevice,
  modeState = null, onResumePending,
}) {
  const { t } = useT();
  const isTv = phase === 'tv';
  const validated = phase === 'success' || phase === 'working' || isTv;
  const searching = phase === 'tutorial' || phase === 'waiting';
  // Conexão atual já é Wi-Fi quando o serial tem formato ip:porta.
  const isWifi = !!device?.serial?.includes(':');

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

      {/* Estado do modo (celular/TV/troca incompleta), visível em qualquer
          fase com aparelho configurado — inclusive no visual de TV. */}
      <ModeStatusChip modeState={modeState} onResumePending={onResumePending} disabled={running} />

      {/* Ficha técnica: aparece quando validado, mas some no modo TV
          (o aparelho girado ocupa o espaço). */}
      <Collapse in={validated && !isTv} sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ mt: 4, width: '100%' }}>
          {/* Mais de um aparelho conectado: seletor para escolher qual focar. */}
          {devices.length > 1 && (
            <FormControl size="small" fullWidth sx={{ mb: 2 }}>
              <InputLabel id="device-pick">{t('device.picker')}</InputLabel>
              <Select
                labelId="device-pick" label={t('device.picker')}
                value={device?.serial || ''}
                onChange={(e) => onPickDevice && onPickDevice(e.target.value)}
              >
                {devices.map((d) => (
                  <MenuItem key={d.serial} value={d.serial}>
                    {(d.model || d.serial)}{d.serial.includes(':') ? ' · Wi-Fi' : ' · USB'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              {device?.model || t('device.unknownDevice')}
            </Typography>
            {device?.dexSupport && (
              // i18n-ok — "DeX" é marca da Samsung, igual em todo idioma.
              <Chip icon={<CheckCircleIcon />} label="DeX" color="success" variant="outlined" size="small" />
            )}
            {isWifi && (
              // i18n-ok — "Wi-Fi" é marca registrada da Wi-Fi Alliance.
              <Chip icon={<WifiIcon />} label="Wi-Fi" color="primary" variant="outlined" size="small" />
            )}
          </Stack>

          <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" useFlexGap>
            {/* i18n-ok — "Android" é marca do Google. */}
            <Spec label="Android" value={device?.android} />
            {/* i18n-ok — "API" é sigla técnica; traduzir atrapalharia quem
                procura o número da versão. */}
            <Spec label="API" value={device?.sdk} />
            <Spec label={t('device.battery')} value={device?.battery != null ? `${device.battery}%` : null} />
          </Stack>

          {/* Descoberta da função "Enviar para o celular" (overlay de arrastar). */}
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 1, opacity: 0.7 }}>
            {t('device.dragHint')}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Caminho de 1 clique: aplica o preset curado (seguro em qualquer
              aparelho). A seleção manual à esquerda continua valendo para o
              botão de baixo — os dois fluxos convivem. */}
          <Button
            variant="contained" color="success" size="large" fullWidth
            startIcon={<AutoAwesomeIcon />}
            onClick={onRunRecommended} disabled={running}
            sx={{ py: 1.5, fontSize: '1rem' }}
          >
            {running ? t('device.applying') : t('device.recommended')}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, mb: 2, display: 'block', textAlign: 'center' }}>
            {t('device.recommendedHelp')}
          </Typography>

          <Button
            variant="outlined" color="primary" size="large" fullWidth
            onClick={onRun} disabled={running || !ready}
            sx={{ py: 1.2, fontSize: '0.95rem' }}
          >
            {running ? t('device.applying') : t('device.applyManual')}
          </Button>
          {!ready && !running && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              {t('device.orSelect')}
            </Typography>
          )}
        </Box>
      </Collapse>

      {/* No modo TV, um botão discreto para aplicar ajustes adicionais. */}
      {isTv && (
        <Button
          variant="outlined" color="primary"
          onClick={onRun} disabled={running || !ready}
          sx={{ mt: 6 }}
        >
          {t('device.applyMore')}
        </Button>
      )}
    </Box>
  );
}
