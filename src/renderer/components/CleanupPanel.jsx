// src/renderer/components/CleanupPanel.jsx
// Seção PIT STOP da Central de Controle (lateral direita): a limpeza como
// uma parada de box de F1 — cronômetro correndo durante o serviço, lista do
// que está sendo liberado (cache por app, via dumpsys diskstats) e, ao
// final, o tempo da parada + o total recuperado.
//
// Cada limpeza grava um registro .txt em Documentos › DexArmor ›
// registros-limpeza (pasta escolhida pelo projeto), com atalho "abrir pasta".
//
// NÃO destrutivo por natureza: só arquivos temporários (cache) saem; nenhum
// dado, login ou configuração é apagado — os apps recriam o cache. Por isso
// fica FORA do registro de reversão. O "?" explica isso ao usuário leigo.

import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Stack, Button, IconButton, Collapse,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SquareIcon from './SquareIcon';
import { ALL_TASKS } from '../data/tasks';
import { friendlyError } from '../utils/errors';
import { useT } from '../i18n';
import { num } from '../utils/locale';
import { TOK } from '../theme/tokens';


// pacote -> nome amigável: primeiro o catálogo do app, depois apps comuns,
// por fim o último trecho do pacote (melhor que exibir "com.x.y" ao leigo).
//
// O mapa do catálogo guarda o ID da task, não o rótulo: desde que a prosa saiu
// do `tasks.js`, `task.label` é `undefined` — e a versão anterior disto mapeava
// todo pacote para undefined em silêncio, fazendo o app do catálogo aparecer
// pelo sufixo do pacote ("launcher" em vez de "DexArmor TV").
const CATALOG_IDS = Object.fromEntries(ALL_TASKS.filter((x) => x.pkg).map((x) => [x.pkg, x.id]));

// Nomes de MARCA — não se traduzem em idioma nenhum.
const BRAND_LABELS = {
  'com.android.chrome': 'Chrome',
  'com.google.android.youtube': 'YouTube',
  'com.sec.android.app.sbrowser': 'Internet Samsung',
  'com.whatsapp': 'WhatsApp',
  'com.instagram.android': 'Instagram',
  'com.spotify.music': 'Spotify',
  'com.android.vending': 'Google Play',
};

// Pacotes cujo nome é DESCRIÇÃO, não marca — esses sim vão ao catálogo.
const TRANSLATED_LABELS = { 'com.google.android.gms': 'cleanup.app.gms' };

function appLabel(t, pkg) {
  const id = CATALOG_IDS[pkg];
  if (id) return t(`tasks.${id}.label`);
  if (TRANSLATED_LABELS[pkg]) return t(TRANSLATED_LABELS[pkg]);
  return BRAND_LABELS[pkg] || pkg.split('.').filter(Boolean).pop();
}

function mb(bytes, language) {
  if (bytes == null) return '—';
  const g = bytes / 1024 ** 3;
  if (g >= 1) return `${num(g, language)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

export default function CleanupPanel({ serial, disabled, onDone }) {
  const { t, language } = useT();
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);      // cronômetro da parada
  const [preview, setPreview] = useState([]);     // o que está sendo liberado
  const [result, setResult] = useState(null);     // { freedBytes, items, logPath, seconds } | { error }
  const [helpOpen, setHelpOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);
  // Troca de aparelho: o resultado anterior não vale mais.
  useEffect(() => { setResult(null); setPreview([]); }, [serial]);

  const clean = async () => {
    if (!serial) return;
    setBusy(true);
    setResult(null);
    setPreview([]);
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = setInterval(() => setElapsed((Date.now() - t0) / 1000), 100);
    try {
      // Prévia primeiro: mostra AO VIVO o que o box está liberando.
      const prev = await window.api.cleanPreview(serial).catch(() => ({ items: [] }));
      setPreview(prev.items || []);
      const res = await window.api.cleanCaches(serial);
      setResult({ ...res, seconds: (Date.now() - t0) / 1000 });
      onDone && onDone(); // telemetria relê o espaço livre na hora
    } catch (e) {
      setResult({ error: friendlyError(e) });
    } finally {
      clearInterval(timerRef.current);
      setBusy(false);
    }
  };

  const items = result?.items || [];

  return (
    <Box sx={{ px: 2, py: 1.6 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
        <SquareIcon><BuildIcon sx={{ fontSize: 14, color: 'text.primary' }} /></SquareIcon>
        <Typography sx={{
          fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'text.secondary', flex: 1,
        }}>
          {t('cleanup.title')}
        </Typography>
        <IconButton size="small" onClick={() => setHelpOpen((o) => !o)}
          aria-label={t('cleanup.helpAria')}
          sx={{ p: 0.3, color: helpOpen ? 'primary.main' : 'text.secondary' }}>
          <HelpOutlineIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Stack>

      <Collapse in={helpOpen}>
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', pb: 1, fontSize: '0.68rem', lineHeight: 1.45,
            borderLeft: '2px solid rgba(255,185,74,0.3)', pl: 1, ml: 0.4 }}>
          {t('cleanup.help')}
        </Typography>
      </Collapse>

      {/* Botão no estilo do documento: retangular, UPPERCASE espaçado. */}
      <Button
        fullWidth variant="outlined" color="inherit" size="small"
        onClick={clean} disabled={disabled || busy || !serial}
        sx={{
          borderRadius: 0, py: 0.8, fontWeight: 700, fontSize: '0.7rem',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          borderColor: TOK.hairline, color: 'text.primary',
          '&:hover': { borderColor: 'text.primary', bgcolor: 'transparent' },
        }}
      >
        {busy ? (
          <Typography component="span" variant="overline" sx={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: 1 }}>
            {t('cleanup.running', { seconds: num(elapsed, language) })}
          </Typography>
        ) : t('cleanup.action')}
      </Button>

      {/* Durante a parada: o que está sendo liberado, app por app. */}
      {busy && preview.length > 0 && (
        <Box sx={{ mt: 1, p: 1, bgcolor: TOK.surfaceSoft, border: `1px solid ${TOK.hairlineStrong}`, borderRadius: 0 }}>
          <Typography sx={{
            fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'text.secondary', mb: 0.5,
          }}>
            {t('cleanup.freeing')}
          </Typography>
          {preview.slice(0, 4).map((x) => (
            <Stack key={x.pkg} direction="row" justifyContent="space-between">
              <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>{appLabel(t, x.pkg)}</Typography>
              <Typography variant="overline" sx={{ fontSize: '0.6rem', lineHeight: 1.6, color: 'text.secondary' }}>{mb(x.cacheBytes)}</Typography>
            </Stack>
          ))}
        </Box>
      )}

      {/* Resultado: tempo da parada + total + detalhe por app + registro. */}
      {result && !result.error && (
        <Box sx={{ mt: 1 }}>
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.primary' }}>
              {t('cleanup.doneLine', {
                seconds: num(result.seconds, language),
                result: result.freedBytes != null && result.freedBytes > 50 * 1024 * 1024
                  ? t('cleanup.freed', { value: mb(result.freedBytes) })
                  : t('cleanup.alreadyClean'),
              })}
            </Typography>
          </Stack>
          {items.length > 0 && (
            <Box sx={{ p: 1, mb: 0.6, bgcolor: TOK.surfaceSoft, border: `1px solid ${TOK.hairlineStrong}`, borderRadius: 0 }}>
              {items.slice(0, 5).map((x) => (
                <Stack key={x.pkg} direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>{appLabel(t, x.pkg)}</Typography>
                  <Typography variant="overline" sx={{ fontSize: '0.6rem', lineHeight: 1.6, color: 'text.secondary' }}>{mb(x.freedBytes)}</Typography>
                </Stack>
              ))}
            </Box>
          )}
          {result.logPath && (
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', flex: 1, lineHeight: 1.3 }}>
                {t('cleanup.logSaved')}
              </Typography>
              <Button size="small" startIcon={<FolderOpenIcon sx={{ fontSize: 13 }} />}
                onClick={() => window.api.openCleanLogs().catch(() => {})}
                sx={{
                  fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'text.primary',
                  minWidth: 0, p: 0.3, flexShrink: 0,
                }}>
                {t('cleanup.open')}
              </Button>
            </Stack>
          )}
        </Box>
      )}
      {result && result.error && (
        <Typography variant="caption" color="error"
          sx={{ display: 'block', mt: 0.8, fontSize: '0.66rem', lineHeight: 1.35 }}>
          {result.error}
        </Typography>
      )}
    </Box>
  );
}
