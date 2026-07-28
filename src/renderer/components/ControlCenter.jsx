// src/renderer/components/ControlCenter.jsx
// Lateral DIREITA = CENTRAL DE CONTROLE, em estilo "pit wall" de F1 sobre o
// design de referência BMW M: faixa tricolor no topo (assinatura de marca,
// nunca fundo), rótulos UPPERCASE espaçados, cantos retos e hairlines.
//
// Três seções distribuídas UNIFORMEMENTE (grid 1fr/1fr/1fr), cada uma com
// rolagem própria — a interface continua utilizável em qualquer altura de
// janela:
//   1. TELEMETRIA — saúde do aparelho (bateria, temperatura, armazenamento)
//   2. PIT STOP   — limpeza com cronômetro, detalhe do que foi liberado
//   3. PROGRESSO  — execução das modificações (o painel original)

import React from 'react';
import { Box, Typography } from '@mui/material';
import HealthPanel from './HealthPanel';
import CleanupPanel from './CleanupPanel';
import ProgressPanel from './ProgressPanel';
import { useT } from '../i18n';

// Cores do documento de referência (DESIGN-bmw-m.md).
export const M_TRICOLOR = ['#0066b1', '#1c69d4', '#e22718'];
export const M_TOKENS = {
  surfaceSoft: '#0d0d0d',
  surfaceCard: '#1a1a1a',
  hairline: '#3c3c3c',
  hairlineStrong: '#262626',
  dataBlue: '#1c69d4',   // marca de dados (série única) — o azul heritage
  warning: '#f4b400',
  red: '#e22718',
};

export default function ControlCenter({
  serial, healthActive, refreshKey,
  cleanDisabled, onCleaned,
  log, percent, progressActive, onSaveReport,
  progressFinished, undoableIds, onUndoItem,
}) {
  const { t } = useT();
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Faixa tricolor M: 4px, só identidade — nunca fundo nem botão. */}
      <Box sx={{ height: 4, flexShrink: 0, display: 'flex' }}>
        {M_TRICOLOR.map((c) => <Box key={c} sx={{ flex: 1, bgcolor: c }} />)}
      </Box>

      <Box sx={{ px: 2, pt: 1.4, pb: 1.1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Typography sx={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'text.primary', lineHeight: 1.3,
        }}>
          {t('controlCenter.title')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
          {t('controlCenter.subtitle')}
        </Typography>
      </Box>

      {/* Três seções em terços iguais; cada uma rola por dentro. */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: '1fr 1fr 1fr' }}>
        <Box sx={{ minHeight: 0, overflowY: 'auto', borderBottom: '1px solid', borderColor: 'divider' }}>
          <HealthPanel serial={serial} active={healthActive} refreshKey={refreshKey} />
        </Box>
        <Box sx={{ minHeight: 0, overflowY: 'auto', borderBottom: '1px solid', borderColor: 'divider' }}>
          <CleanupPanel serial={serial} disabled={cleanDisabled} onDone={onCleaned} />
        </Box>
        <Box sx={{ minHeight: 0, overflowY: 'auto' }}>
          <ProgressPanel log={log} percent={percent} active={progressActive} onSaveReport={onSaveReport}
            finished={progressFinished} undoableIds={undoableIds} onUndoItem={onUndoItem} />
        </Box>
      </Box>
    </Box>
  );
}
