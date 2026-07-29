// src/renderer/components/HealthPanel.jsx
// Seção TELEMETRIA da Central de Controle (lateral direita), em estilo
// pit wall / BMW M: células de spec com valor grande + rótulo UPPERCASE
// (componente spec-cell do documento de referência), gráfico de linha da
// temperatura (série única — azul heritage #1c69d4, sem legenda, valor
// atual como rótulo direto na célula) e alertas em linguagem simples.
//
// Só LEITURA: nada é alterado no aparelho. Atualiza a cada 30 s enquanto
// houver aparelho conectado; pausa durante execuções. `refreshKey` força
// releitura imediata (ex.: após a limpeza liberar espaço).

import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SquareIcon from './SquareIcon';
import { useT } from '../i18n';
import { num } from '../utils/locale';
import { TOK } from '../theme/tokens';


// Separador decimal segue o IDIOMA — ver src/renderer/utils/locale.js.
function gb(bytes, language) {
  if (bytes == null) return '—';
  return `${num(bytes / 1024 ** 3, language)} GB`;
}

function tempColor(t) {
  if (t == null) return 'text.secondary';
  if (t >= 42) return TOK.red;
  if (t >= 38) return TOK.warning;
  return 'success.main';
}

// Célula de spec (documento: valor 700 em cima, rótulo uppercase embaixo).
function SpecCell({ value, label, sub, valueColor }) {
  return (
    <Box sx={{
      flex: 1, p: 1, borderRadius: 0,
      bgcolor: TOK.surfaceSoft, border: `1px solid ${TOK.hairlineStrong}`,
    }}>
      <Typography sx={{ fontWeight: 700, fontSize: '1.02rem', lineHeight: 1.15, color: valueColor || 'text.primary' }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block', lineHeight: 1.3 }}>
          {sub}
        </Typography>
      )}
      <Typography sx={{
        fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'text.secondary', mt: 0.3,
      }}>
        {label}
      </Typography>
    </Box>
  );
}

// Gráfico de linha da temperatura: série única (um tom, sem legenda — o
// rótulo da seção nomeia a série), traço de 2px, linha-base recessiva.
function TempSparkline({ history }) {
  const { t, language } = useT();
  if (history.length < 2) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
        {t('health.collecting')}
      </Typography>
    );
  }
  const temps = history.map((h) => h.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(max - min, 1); // evita linha “grudada” quando estável
  const W = 100;
  const H = 30;
  const pts = history.map((h, i) => {
    const x = (i / (history.length - 1)) * W;
    const y = H - 3 - ((h.temp - min) / span) * (H - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const minutes = Math.max(1, Math.round(((history[history.length - 1].t - history[0].t) / 60000)));
  return (
    <Box>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        role="img" aria-label={t('health.chartAria', { minutes, min, max })}>
        <title>{t('health.chartTitle', { minutes, min: num(min, language), max: num(max, language) })}</title>
        {/* linha-base recessiva (hairline), não um eixo chamativo */}
        <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke={TOK.hairlineStrong} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <polyline points={pts} fill="none" stroke={TOK.dataBlue} strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <Typography sx={{
        fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'text.secondary',
      }}>
        {t('health.chartLabel', { minutes })}
      </Typography>
    </Box>
  );
}

// Recebe `t`: é função pura, não componente — hook aqui violaria as regras do
// React e quebraria em tempo de execução, não no build.
function buildAlerts(t, battery, storage) {
  const alerts = [];
  if (battery) {
    if (battery.tempC != null && battery.tempC >= 42) {
      alerts.push({ sev: 'error', text: t('health.tooHot') });
    } else if (battery.tempC != null && battery.tempC >= 38) {
      alerts.push({ sev: 'warn', text: t('health.warm') });
    }
    if (!battery.plugged) {
      alerts.push({ sev: 'warn', text: t('health.unplugged') });
    } else if (battery.level != null && battery.level < 20 && !battery.charging) {
      alerts.push({ sev: 'warn', text: t('health.notCharging') });
    }
  }
  if (storage && storage.totalBytes) {
    const freePct = (storage.freeBytes / storage.totalBytes) * 100;
    if (freePct < 10 || storage.freeBytes < 2 * 1024 ** 3) {
      alerts.push({ sev: 'warn', text: t('health.storageFull') });
    }
  }
  return alerts;
}

const SEV_ICON = {
  warn: <WarningAmberIcon sx={{ fontSize: 14, color: TOK.warning }} />,
  error: <ErrorIcon sx={{ fontSize: 14, color: TOK.red }} />,
};

export default function HealthPanel({ serial, active, refreshKey = 0 }) {
  const { t, language } = useT();
  const [health, setHealth] = useState(null);
  const [failed, setFailed] = useState(false);
  // Histórico de temperatura para o gráfico (uma amostra por leitura; ~12
  // minutos de janela com o ciclo de 30 s). Zera ao trocar de aparelho.
  const [history, setHistory] = useState([]);

  useEffect(() => { setHistory([]); setHealth(null); }, [serial]);

  useEffect(() => {
    if (!serial || !active) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const h = await window.api.getHealth(serial);
        if (cancelled) return;
        setHealth(h);
        setFailed(false);
        if (h?.battery?.tempC != null) {
          setHistory((old) => [...old.slice(-23), { t: Date.now(), temp: h.battery.tempC }]);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [serial, active, refreshKey]);

  const battery = health?.battery;
  const storage = health?.storage;
  const usedPct = storage && storage.totalBytes
    ? Math.round((storage.usedBytes / storage.totalBytes) * 100)
    : null;
  const alerts = health ? buildAlerts(t, battery, storage) : [];

  return (
    <Box sx={{ px: 2, py: 1.6 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
        <SquareIcon><SpeedIcon sx={{ fontSize: 15, color: 'text.primary' }} /></SquareIcon>
        <Typography sx={{
          fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'text.secondary',
        }}>
          {t('health.title')}
        </Typography>
      </Stack>

      {!serial ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          {t('health.needDevice')}
        </Typography>
      ) : !health ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          {failed ? t('health.readFailed') : t('health.reading')}
        </Typography>
      ) : (
        <>
          {/* Células de spec: bateria e temperatura. */}
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <SpecCell
              value={battery?.level != null ? `${battery.level}%` : '—'}
              sub={battery?.full ? t('health.subFull')
                : battery?.charging ? t('health.subCharging')
                : battery?.plugged ? t('health.subPlugged')
                : t('health.subOnBattery')}
              label={t('health.battery')}
            />
            <SpecCell
              value={battery?.tempC != null ? `${num(battery.tempC, language)}°C` : '—'}
              sub={battery?.tempC != null ? (battery.tempC >= 42 ? t('health.subHot') : battery.tempC >= 38 ? t('health.subWarm') : t('health.subNormal')) : null}
              label={t('health.temperature')}
              valueColor={tempColor(battery?.tempC)}
            />
          </Stack>

          {/* Armazenamento: barra reta (canto zero) + valores em texto. */}
          <Box sx={{ mb: 1 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
              <Typography sx={{
                fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'text.secondary',
              }}>
                {t('health.storage')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
                {t('health.storageFree', { free: gb(storage?.freeBytes, language), total: gb(storage?.totalBytes, language) })}
              </Typography>
            </Stack>
            {usedPct != null && (
              <Box sx={{ height: 6, bgcolor: TOK.hairlineStrong, borderRadius: 0 }}
                role="img" aria-label={t('health.storageAria', { pct: usedPct })}>
                <Box sx={{
                  height: '100%', width: `${usedPct}%`, borderRadius: 0,
                  bgcolor: usedPct >= 90 ? TOK.warning : TOK.dataBlue,
                }} />
              </Box>
            )}
          </Box>

          {/* Gráfico da temperatura ao longo da sessão. */}
          <Box sx={{ mb: 1 }}>
            <TempSparkline history={history} />
          </Box>

          {alerts.length > 0 ? (
            <Stack spacing={0.5}>
              {alerts.map((a, i) => (
                <Stack key={i} direction="row" spacing={0.8} alignItems="flex-start">
                  <Box sx={{ mt: 0.1 }}>{SEV_ICON[a.sev]}</Box>
                  <Typography variant="caption" sx={{ fontSize: '0.66rem', lineHeight: 1.4, color: 'text.secondary' }}>
                    {a.text}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Stack direction="row" spacing={0.8} alignItems="center">
              <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem' }}>
                {t('health.allGood')}
              </Typography>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
