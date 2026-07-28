// src/renderer/components/ProfilesPanel.jsx
// Aba PERFIS (coluna esquerda): a interface que FUNCIONOU vira um perfil com
// nome ("Sala 4K", "Quarto Full HD") e volta com um clique — em qualquer
// momento, mesmo depois de trocar de TV ou de experimentar outros ajustes.
//
// A aba guia o usuário leigo no fluxo completo: (1) ajustar a interface até
// ficar boa, (2) salvar com um nome, (3) aplicar quando quiser. Salvar
// fotografa os ajustes de modo ATIVOS direto do aparelho (mesmo snapshot da
// alternância de modos, no main); aplicar roda as tasks do perfil pela mesma
// esteira das execuções (progresso na lateral direita, reversão registrada).
// Regravar com o mesmo nome ATUALIZA o perfil — é o jeito natural de
// "melhorei a interface, guarda essa agora".

import React, { useState } from 'react';
import {
  Box, Typography, Stack, Button, TextField, IconButton, Chip,
  CircularProgress,
} from '@mui/material';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import SquareIcon from './SquareIcon';
import { friendlyError } from '../utils/errors';
import { useT } from '../i18n';
import RichText from '../i18n/RichText';

const TOK = { surfaceSoft: '#0d0d0d', hairlineStrong: '#262626', hairline: '#3c3c3c' };

// Resumo amigável do que um perfil carrega, a partir das tasks salvas.
// Recebe `t` (tradução) e usa `list` para as tasks — antes a variável das
// tasks se chamava `t`, que agora é o nome do tradutor.
function profileChips(t, profile) {
  const list = profile.tasks || [];
  const chips = [];
  const res = list.find((x) => x.kind === 'wmsize');
  if (res) chips.push(`${res.width}x${res.height}`);
  const den = list.find((x) => x.kind === 'density');
  if (den) {
    chips.push(den.dpi ? `${den.dpi} dpi`
      : den.mode === 'small' ? t('profiles.chip.densitySmall')
      : den.mode === 'large' ? t('profiles.chip.densityLarge')
      : t('profiles.chip.densityDefault'));
  }
  const rot = list.find((x) => x.kind === 'rotate');
  if (rot && Number.isInteger(rot.rotation)) chips.push(t('profiles.chip.rotation', { deg: rot.rotation * 90 }));
  const font = list.find((x) => x.kind === 'setting' && x.key === 'font_scale');
  if (font) chips.push(t('profiles.chip.font', { value: String(font.value).replace('.', ',') }));
  const counted = [res, den, rot, font].filter(Boolean).length;
  const rest = list.length - counted;
  if (rest > 0) chips.push(t(rest === 1 ? 'profiles.chip.moreOne' : 'profiles.chip.moreMany', { n: rest }));
  return chips;
}

// Um passo numerado do guia (1-2-3).
function GuideStep({ n, children }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{
        width: 18, height: 18, flexShrink: 0, mt: 0.1,
        display: 'grid', placeItems: 'center',
        border: '1px solid rgba(255,185,74,0.5)', borderRadius: 0,
        fontSize: '0.62rem', fontWeight: 700, color: 'primary.main',
      }}>
        {n}
      </Box>
      <Typography variant="caption" color="text.secondary"
        sx={{ fontSize: '0.72rem', lineHeight: 1.45 }}>
        {children}
      </Typography>
    </Stack>
  );
}

export default function ProfilesPanel({
  profiles = [], canSave, hasDevice, running,
  onSave, onApply, onDelete,
}) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [applyingId, setApplyingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await onSave(name);
      setMsg({ ok: true, text: t('profiles.saved', { name: name.trim() }) });
      setName('');
    } catch (e) {
      setMsg({ ok: false, text: friendlyError(e) });
    } finally {
      setSaving(false);
    }
  };

  const apply = async (p) => {
    setApplyingId(p.id);
    setMsg(null);
    try {
      await onApply(p);
      setMsg({ ok: true, text: t('profiles.applied', { name: p.name }) });
    } catch (e) {
      setMsg({ ok: false, text: friendlyError(e) });
    } finally {
      setApplyingId(null);
    }
  };

  const busy = saving || !!applyingId || running;
  const saveDisabled = !hasDevice || !canSave || busy || !name.trim();

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <SquareIcon><BookmarkAddedIcon sx={{ fontSize: 15, color: 'text.primary' }} /></SquareIcon>
        <Typography sx={{
          fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'text.primary',
        }}>
          {t('profiles.title')}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.45 }}>
        {t('profiles.intro')}
      </Typography>

      {/* O guia do fluxo: é a parte que ensina COMO salvar. */}
      <Stack spacing={0.9} sx={{ mb: 2 }}>
        <GuideStep n="1">
          <RichText text={t('profiles.step1')} values={{
            mods: t('taskPanel.tab.mods'), adjustable: t('taskPanel.adjustable'),
          }} wrap={(v, k) => <strong key={k}>{v}</strong>} />
        </GuideStep>
        <GuideStep n="2">
          <RichText text={t('profiles.step2')} values={{ save: t('profiles.save') }}
            wrap={(v, k) => <strong key={k}>{v}</strong>} />
        </GuideStep>
        <GuideStep n="3">
          {t('profiles.step3')}
        </GuideStep>
      </Stack>

      {/* Salvamento — o destaque da aba. */}
      <Box sx={{
        p: 1.4, mb: 2, borderRadius: 0,
        border: '1px solid rgba(255,185,74,0.4)', bgcolor: 'rgba(255,185,74,0.06)',
      }}>
        <TextField
          fullWidth size="small" value={name}
          onChange={(e) => { setName(e.target.value); setMsg(null); }}
          placeholder={t('profiles.namePlaceholder')}
          disabled={!hasDevice || busy}
          inputProps={{ maxLength: 40 }}
          sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: 0, fontSize: '0.84rem' } }}
        />
        <Button
          fullWidth variant="contained" color="primary"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
          onClick={save} disabled={saveDisabled}
          sx={{ py: 0.9, fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em' }}
        >
          {saving ? t('profiles.saving') : t('profiles.save')}
        </Button>
        {!hasDevice ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8, fontSize: '0.68rem', lineHeight: 1.4 }}>
            {t('profiles.needDevice')}
          </Typography>
        ) : !canSave ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8, fontSize: '0.68rem', lineHeight: 1.4 }}>
            {t('profiles.nothingToSnapshot')}
          </Typography>
        ) : null}
      </Box>

      {msg && (
        <Typography variant="caption"
          sx={{ display: 'block', mb: 1.5, fontSize: '0.7rem', lineHeight: 1.4,
            color: msg.ok ? 'success.main' : 'error.main' }}>
          {msg.text}
        </Typography>
      )}

      {/* Perfis salvos. */}
      <Typography sx={{
        fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'text.secondary', mb: 0.8,
      }}>
        {t('profiles.savedTitle')} {profiles.length > 0 ? `(${profiles.length})` : ''}
      </Typography>

      {profiles.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.72rem' }}>
          {t('profiles.none')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {profiles.map((p) => (
            <Box key={p.id} sx={{
              p: 1.2, borderRadius: 0,
              bgcolor: TOK.surfaceSoft, border: `1px solid ${TOK.hairlineStrong}`,
            }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.84rem', fontWeight: 700, lineHeight: 1.3 }} noWrap>
                    {p.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                    salvo em {new Date(p.updatedAt || p.createdAt).toLocaleDateString('pt-BR')}
                  </Typography>
                </Box>
                {confirmDeleteId === p.id ? (
                  <Button size="small" color="error" variant="outlined"
                    onClick={() => { setConfirmDeleteId(null); onDelete(p.id); }}
                    onBlur={() => setConfirmDeleteId(null)}
                    sx={{ fontSize: '0.64rem', py: 0.2, px: 0.8, minWidth: 0, flexShrink: 0 }}>
                    {t('profiles.deleteConfirm')}
                  </Button>
                ) : (
                  <IconButton size="small" aria-label={t('profiles.deleteAria', { name: p.name })}
                    onClick={() => setConfirmDeleteId(p.id)} disabled={busy}
                    sx={{ p: 0.4, color: 'text.secondary', flexShrink: 0 }}>
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Stack>

              {profileChips(t, p).length > 0 && (
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.7, mb: 0.9 }}>
                  {profileChips(t, p).map((c) => (
                    <Chip key={c} label={c} size="small" variant="outlined"
                      sx={{ height: 18, borderColor: TOK.hairline, color: 'text.secondary',
                        '& .MuiChip-label': { px: 0.7, fontSize: '0.6rem' } }} />
                  ))}
                </Stack>
              )}

              <Button
                fullWidth size="small" variant="outlined" color="primary"
                startIcon={applyingId === p.id
                  ? <CircularProgress size={12} color="inherit" />
                  : <PlayArrowIcon sx={{ fontSize: 15 }} />}
                onClick={() => apply(p)}
                disabled={!hasDevice || busy}
                sx={{ mt: 0.3, py: 0.5, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em' }}
              >
                {applyingId === p.id ? t('profiles.applying') : t('profiles.apply')}
              </Button>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
