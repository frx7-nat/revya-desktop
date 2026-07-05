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
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
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
  device, phase, onRun, onRunRecommended, running, ready, percent, currentLabel,
  showAccessories, devices = [], onPickDevice, wifiStatus, onEnableWifi,
  mirrorStatus, onStartMirror,
}) {
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

      {/* Ficha técnica: aparece quando validado, mas some no modo TV
          (o aparelho girado ocupa o espaço). */}
      <Collapse in={validated && !isTv} sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ mt: 4, width: '100%' }}>
          {/* Mais de um aparelho conectado: seletor para escolher qual focar. */}
          {devices.length > 1 && (
            <FormControl size="small" fullWidth sx={{ mb: 2 }}>
              <InputLabel id="device-pick">Aparelho</InputLabel>
              <Select
                labelId="device-pick" label="Aparelho"
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
              {device?.model || 'Dispositivo'}
            </Typography>
            {device?.dexSupport && (
              <Chip icon={<CheckCircleIcon />} label="DeX" color="success" variant="outlined" size="small" />
            )}
            {isWifi && (
              <Chip icon={<WifiIcon />} label="Wi-Fi" color="primary" variant="outlined" size="small" />
            )}
          </Stack>

          <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Spec label="Android" value={device?.android} />
            <Spec label="API" value={device?.sdk} />
            <Spec label="Bateria" value={device?.battery != null ? `${device.battery}%` : null} />
          </Stack>

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
            {running ? 'Aplicando…' : 'Configuração recomendada'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, mb: 2, display: 'block', textAlign: 'center' }}>
            Aplica o conjunto ideal para TV em um clique. Resolução, bloqueio de
            tela e apps de streaming você escolhe à esquerda.
          </Typography>

          <Button
            variant="outlined" color="primary" size="large" fullWidth
            onClick={onRun} disabled={running || !ready}
            sx={{ py: 1.2, fontSize: '0.95rem' }}
          >
            {running ? 'Aplicando…' : 'Aplicar seleção manual'}
          </Button>
          {!ready && !running && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Ou selecione modificações à esquerda e aplique por aqui.
            </Typography>
          )}

          {/* Conexão por Wi-Fi: depois de ativada, o cabo pode ser removido —
              útil com o celular já instalado atrás da TV. Só faz sentido
              quando a conexão atual é USB. */}
          {!isWifi && (
            <Button
              variant="text" color="primary" fullWidth startIcon={<WifiIcon />}
              onClick={onEnableWifi} disabled={running || !!wifiStatus?.busy}
              sx={{ mt: 1.5, fontSize: '0.82rem' }}
            >
              {wifiStatus?.busy ? 'Ativando Wi-Fi…' : 'Usar por Wi-Fi (dispensar o cabo)'}
            </Button>
          )}
          {wifiStatus?.ip && !isWifi && (
            <Typography variant="caption" color="success.main" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
              Conectado por Wi-Fi em {wifiStatus.ip} — você já pode desplugar o cabo.
            </Typography>
          )}
          {wifiStatus?.error && !isWifi && (
            <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
              {wifiStatus.error}
            </Typography>
          )}

          {/* Espelhamento (scrcpy): abre a tela do celular numa janela,
              controlável por mouse — dispensa pegar o aparelho na mão nas
              etapas que pedem toques. */}
          <Button
            variant="text" color="primary" fullWidth startIcon={<ScreenShareIcon />}
            onClick={onStartMirror} disabled={!!mirrorStatus?.busy}
            sx={{ mt: 1.5, fontSize: '0.82rem' }}
          >
            {mirrorStatus?.busy ? 'Abrindo a tela…' : 'Ver tela do celular'}
          </Button>
          {mirrorStatus?.error && (
            <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
              {mirrorStatus.error}
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
          Aplicar mais ajustes
        </Button>
      )}
    </Box>
  );
}
