/**
 * DeviceStatusCard.jsx
 * -----------------------------------------------------------------------------
 * Renderiza o diagnóstico do ADB produzido por adbOrchestrator.checkDevices().
 *
 * É um componente PRESENTACIONAL: não chama o ADB (isso roda no processo main
 * do Electron). Ele recebe os dados por props e dispara callbacks. A ligação
 * com o main é feita por IPC (window.api.checkDevices / window.api.onPhase).
 *
 * Construído com Material UI para encaixar no design já existente do DexArmor.
 *
 * Props:
 *   diagnosis         objeto `actionable`/`overall` do checkDevices, ou null.
 *   phase             fase atual do orquestrador (opcional), para o spinner:
 *                     'querying' | 'recovering' | 'requerying' | 'done'.
 *   recoveryAttempted boolean — mostra nota discreta de que houve reinício.
 *   busy              força o estado de carregamento (opcional).
 *   onRetry           callback do botão "Verificar de novo".
 *   onStart           callback do botão "Iniciar configuração" (quando pronto).
 * -----------------------------------------------------------------------------
 */

import {
  Card,
  CardContent,
  CardActions,
  Box,
  Stack,
  Typography,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { useT } from '../i18n';

// Mapeia a severidade do diagnóstico para cor + ícone + rótulo do MUI.
const SEVERITY = {
  // `labelKey`: constante de módulo, o texto vem do catálogo na hora de desenhar.
  ok: { color: 'success', Icon: CheckCircleRoundedIcon, labelKey: 'status.ready' },
  action_needed: { color: 'warning', Icon: SmartphoneRoundedIcon, labelKey: 'status.actionNeeded' },
  blocked: { color: 'error', Icon: ErrorRoundedIcon, labelKey: 'status.blocked' },
};

// Mensagem mostrada durante cada fase do orquestrador.
const PHASE_LABEL = {
  querying: 'status.querying',
  recovering: 'status.recovering',
  requerying: 'status.requerying',
};

export default function DeviceStatusCard({
  diagnosis = null,
  phase = null,
  recoveryAttempted = false,
  busy = false,
  onRetry,
  onStart,
}) {
  const { t } = useT();
  const isBusy = busy || (phase != null && phase !== 'done');

  // --- Estado de carregamento ------------------------------------------------
  if (isBusy || diagnosis == null) {
    return (
      <Card variant="outlined" sx={{ maxWidth: 460 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={28} />
            <Typography variant="body1" color="text.secondary">
              {t(PHASE_LABEL[phase] ?? 'status.querying')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // --- Estado resolvido ------------------------------------------------------
  const cfg = SEVERITY[diagnosis.severity] ?? SEVERITY.blocked;
  const { Icon } = cfg;
  const hasSteps = Array.isArray(diagnosis.steps) && diagnosis.steps.length > 0;

  return (
    <Card variant="outlined" sx={{ maxWidth: 460 }}>
      <CardContent>
        {/* Cabeçalho: ícone + título + chip de severidade */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Icon sx={{ color: `${cfg.color}.main`, fontSize: 32, mt: 0.25 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h6" component="h2" sx={{ lineHeight: 1.2 }}>
                {diagnosis.title}
              </Typography>
              <Chip size="small" color={cfg.color} label={t(cfg.labelKey)} variant="outlined" />
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {diagnosis.message}
            </Typography>

            {diagnosis.serial && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                Dispositivo: {diagnosis.serial}
              </Typography>
            )}
          </Box>
        </Stack>

        {/* Passos numerados (é uma sequência real de ações) */}
        {hasSteps && (
          <Box
            component="ol"
            sx={{
              listStyle: 'none',
              counterReset: 'passo',
              m: 0,
              mt: 2,
              p: 0,
            }}
          >
            {diagnosis.steps.map((step, i) => (
              <Box
                component="li"
                key={i}
                sx={{
                  counterIncrement: 'passo',
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'flex-start',
                  mb: i === diagnosis.steps.length - 1 ? 0 : 1.25,
                  '&::before': {
                    content: 'counter(passo)',
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: `${cfg.color}.main`,
                    color: `${cfg.color}.contrastText`,
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  },
                }}
              >
                <Typography variant="body2" sx={{ pt: 0.25 }}>
                  {step}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {recoveryAttempted && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
            {t('status.recovered')}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        {diagnosis.isReady && onStart ? (
          <Button variant="contained" color="success" startIcon={<PlayArrowRoundedIcon />} onClick={onStart}>
            {t('status.start')}
          </Button>
        ) : (
          <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={onRetry}>
            Verificar de novo
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
