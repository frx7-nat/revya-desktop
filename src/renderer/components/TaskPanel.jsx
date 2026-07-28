// src/renderer/components/TaskPanel.jsx
// Aba ESQUERDA: alterna entre "Modificações", "Perfis" e "Acessórios" no topo.
//
// MODIFICAÇÕES: grupos RECOLHIDOS em acordeões (um clique expande) para a
// interface ficar limpa. Dentro deles, hierarquia visual: ajustes fixos
// (aplica uma vez — silenciar, atualizações…) recuam em tom secundário;
// ajustes AJUSTÁVEIS (fonte, dpi, resolução, rotação) ficam no tom cheio com
// o selo "ajustável" — são os que o usuário alterna até a interface ideal.
// O grupo "install" tem só o launcher próprio — o catálogo de apps de
// terceiros saiu do programa em 27/07/2026 (ver tasks.js). No lugar dele, o
// grupo mostra um aviso com o botão que abre o guia de instalar apps e enviar
// arquivos (SideloadGuideDialog).
//
// PERFIS: a interface que funcionou vira um perfil nomeado (ProfilesPanel).
//
// ACESSÓRIOS: vitrine de produtos com link externo (não mexe no aparelho).

import React, { useState } from 'react';
import {
  Box, Typography, Checkbox, FormControlLabel, Divider, Stack,
  Accordion, AccordionSummary, AccordionDetails, ToggleButtonGroup, ToggleButton,
  Link, Chip, Collapse, IconButton, Button, CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TvIcon from '@mui/icons-material/Tv';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import WifiIcon from '@mui/icons-material/Wifi';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AppsIcon from '@mui/icons-material/Apps';
import TuneIcon from '@mui/icons-material/Tune';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SpeakerIcon from '@mui/icons-material/Speaker';
import EarbudsIcon from '@mui/icons-material/Earbuds';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import WatchIcon from '@mui/icons-material/Watch';
import BoltIcon from '@mui/icons-material/Bolt';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import UsbIcon from '@mui/icons-material/Usb';
import ThreeSixtyIcon from '@mui/icons-material/ThreeSixty';
import LaptopIcon from '@mui/icons-material/Laptop';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SquareIcon from './SquareIcon';
import ProfilesPanel from './ProfilesPanel';
import { TASK_GROUPS, accessoryGroupsFor, ACCESSORY_DISCLOSURE_KEY } from '../data/tasks';
import { friendlyError } from '../utils/errors';
import { useT, has } from '../i18n';

const KIND_COLOR = { remove: 'error', install: 'primary', setting: 'success', home: 'success', settings: 'success', rotate: 'success', wmsize: 'success', density: 'success', dnd: 'success' };

// Ícone quadrado de cada grupo de modificações (design de referência BMW M).
const GROUP_ICONS = {
  debloat: <DeleteOutlineIcon sx={{ fontSize: 15, color: 'text.primary' }} />,
  install: <AppsIcon sx={{ fontSize: 15, color: 'text.primary' }} />,
  tweaks: <TuneIcon sx={{ fontSize: 15, color: 'text.primary' }} />,
};

// Ícone por categoria de acessório — mesmo tile quadrado dos grupos de
// Modificações, para as duas abas falarem a mesma língua.
const ACC_ICON_SX = { fontSize: 15, color: 'text.primary' };
const ACCESSORY_ICONS = {
  'ac-caixas': <SpeakerIcon sx={ACC_ICON_SX} />,
  'ac-fones': <EarbudsIcon sx={ACC_ICON_SX} />,
  'ac-headphone': <HeadphonesIcon sx={ACC_ICON_SX} />,
  'ac-smartwatches': <WatchIcon sx={ACC_ICON_SX} />,
  'ac-carregadores': <BoltIcon sx={ACC_ICON_SX} />,
  'ac-joysticks': <SportsEsportsIcon sx={ACC_ICON_SX} />,
  'ac-hub': <UsbIcon sx={ACC_ICON_SX} />,
  'ac-osmo360': <ThreeSixtyIcon sx={ACC_ICON_SX} />,
  'ac-notebook': <LaptopIcon sx={ACC_ICON_SX} />,
  'ac-controle-tv': <SettingsRemoteIcon sx={ACC_ICON_SX} />,
  'ac-fotografia': <PhotoCameraIcon sx={ACC_ICON_SX} />,
};

// Uma linha de task: checkbox + (opcional) indicador "?" que expande a
// explicação curta do porquê daquela personalização.
// Tasks `repeatable` (ajustes de interface: rotação, resolução, dpi) nunca
// travam: depois de aplicadas ganham um check discreto ao lado do nome, mas
// o checkbox continua clicável — a interface vai sendo construída até o
// usuário chegar na que funciona para ele.
function TaskCheck({ task, selected, completed, onToggle, disabled }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const isDone = !!(completed && completed[task.id]);
  const locked = isDone && !task.repeatable;
  // A explicação do "?" é opcional. Quem sabe se ela existe é o catálogo de
  // textos, não o de dados — por isso `has`, e não um campo booleano que
  // precisaria ser mantido em dia junto com a tradução.
  const hasInfo = has(`tasks.${task.id}.info`);
  return (
    <Box sx={{ mb: 0.3 }}>
      <Stack direction="row" alignItems="center" sx={{ minHeight: 32 }}>
        <FormControlLabel
          sx={{ flex: 1, ml: 0, mr: 0, cursor: locked ? 'default' : 'pointer' }}
          control={
            locked ? (
              // Concluído: vira um check verde fixo, não mais um checkbox clicável.
              <Box sx={{ width: 38, display: 'grid', placeItems: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              </Box>
            ) : (
              <Checkbox
                size="small"
                disabled={disabled}
                checked={!!selected[task.id]}
                onChange={() => onToggle(task.id)}
                color={KIND_COLOR[task.kind] || 'primary'}
              />
            )
          }
          label={
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography variant="body2"
                sx={{ fontSize: '0.85rem',
                  // Riscado e esmaecido quando concluído E travado.
                  textDecoration: locked ? 'line-through' : 'none',
                  // Hierarquia: ajustes fixos (aplica uma vez) recuam em tom
                  // secundário; os AJUSTÁVEIS ficam no tom cheio + selo.
                  color: locked || !task.repeatable ? 'text.secondary' : 'text.primary',
                  opacity: locked ? 0.7 : 1 }}>
                {t(`tasks.${task.id}.label`)}
              </Typography>
              {task.repeatable && !locked && (
                <Chip label={t('taskPanel.adjustable')} size="small" variant="outlined" color="primary"
                  sx={{ height: 16, flexShrink: 0,
                    '& .MuiChip-label': { px: 0.6, fontSize: '0.56rem', fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase' } }} />
              )}
              {isDone && !locked && (
                // Aplicado, mas ajustável: check discreto, checkbox segue vivo.
                <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main', opacity: 0.85, flexShrink: 0 }} />
              )}
            </Stack>
          }
        />
        {hasInfo && !locked && (
          <IconButton size="small" onClick={() => setOpen((o) => !o)}
            aria-label={t('taskPanel.whyDoThis')}
            sx={{ p: 0.4, color: open ? 'primary.main' : 'text.secondary' }}>
            <HelpOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Stack>
      {hasInfo && !locked && (
        <Collapse in={open}>
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', pl: 3.8, pr: 1, pb: 0.8, fontSize: '0.72rem', lineHeight: 1.45,
              borderLeft: '2px solid rgba(255,185,74,0.3)', ml: 1.2 }}>
            {t(`tasks.${task.id}.info`)}
          </Typography>
        </Collapse>
      )}
    </Box>
  );
}

// Aviso de um grupo (campo `notice` no catálogo): o texto que explica o que
// NÃO está ali e o botão que abre o guia correspondente. Hoje é o que ocupa o
// lugar do antigo catálogo de apps de terceiros.
function GroupNotice({ text, action, onOpen }) {
  return (
    <Box sx={{
      mt: 1.2, p: 1.2, borderRadius: 0,
      border: '1px solid rgba(255,185,74,0.35)', bgcolor: 'rgba(255,185,74,0.06)',
    }}>
      <Typography variant="caption" color="text.secondary"
        sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4, mb: 0.8 }}>
        {text}
      </Typography>
      <Button
        fullWidth size="small" variant="outlined" color="primary"
        startIcon={<HelpOutlineIcon sx={{ fontSize: 15 }} />}
        onClick={onOpen}
        sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em' }}
      >
        {action}
      </Button>
    </Box>
  );
}

// Botão de ação da barra lateral com um "?" ao lado que expande uma
// explicação curta — mesmo padrão do indicador das tasks.
function SideHelpButton({ icon, label, onClick, disabled, help, color = 'primary' }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ mb: 1.2 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Button
          fullWidth variant="outlined" color={color} startIcon={icon}
          onClick={onClick} disabled={disabled}
          sx={{ py: 1, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em' }}
        >
          {label}
        </Button>
        <IconButton size="small" onClick={() => setOpen((o) => !o)}
          aria-label={t('taskPanel.whatIsThis')}
          sx={{ p: 0.4, color: open ? 'primary.main' : 'text.secondary' }}>
          <HelpOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
      <Collapse in={open}>
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', pl: 1, pr: 1, pt: 0.6, fontSize: '0.72rem', lineHeight: 1.45,
            borderLeft: '2px solid rgba(255,185,74,0.3)', ml: 1.2 }}>
          {help}
        </Typography>
      </Collapse>
    </Box>
  );
}

// Reversão isolada: lista o que pode ser desfeito individualmente, com um
// botão "Desfazer" por alteração. A reversão de tudo de uma vez continua no
// botão "Reversão completa", logo acima.
function RevertOneList({ entries, onRevertOne, disabled }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState({});

  const undo = async (taskId) => {
    setBusyId(taskId);
    setErrors((e) => ({ ...e, [taskId]: null }));
    try {
      await onRevertOne(taskId);
    } catch (err) {
      setErrors((e) => ({ ...e, [taskId]: friendlyError(err) }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ mb: 2.5 }}>
      <Button fullWidth size="small" variant="text" color="inherit"
        onClick={() => setOpen((o) => !o)}
        endIcon={<ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
        sx={{ color: 'text.secondary', fontSize: '0.74rem', textTransform: 'none', justifyContent: 'space-between' }}>
        {t('taskPanel.revertOne')}
      </Button>
      <Collapse in={open}>
        <Stack spacing={0.7} sx={{ mt: 0.5, pl: 0.5 }}>
          {entries.map((e) => (
            <Box key={e.taskId}>
              <Stack direction="row" alignItems="center" spacing={1}>
                {/* Entrada adormecida (aparelho em modo celular): o "Desfazer"
                    dela só esquece o perfil TV — o ajuste já está desfeito. */}
                <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem', opacity: e.dormant ? 0.55 : 1 }}>
                  {e.label}{e.dormant ? t('taskPanel.phoneModeSuffix') : ''}
                </Typography>
                {busyId === e.taskId ? (
                  <CircularProgress size={14} sx={{ flexShrink: 0, mr: 1 }} />
                ) : (
                  <Button size="small" variant="outlined" color="error"
                    onClick={() => undo(e.taskId)} disabled={disabled || busyId != null}
                    sx={{ fontSize: '0.68rem', py: 0.1, px: 1, minWidth: 0, flexShrink: 0 }}>
                    {t('taskPanel.undo')}
                  </Button>
                )}
              </Stack>
              {errors[e.taskId] && (
                <Typography variant="caption" color="error" sx={{ fontSize: '0.68rem', lineHeight: 1.3, display: 'block' }}>
                  {errors[e.taskId]}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

// Tradução dos eventos do diário para uma frase legível.
// Recebe `t` em vez de importá-lo: é função pura chamada de dentro do render,
// e passar o `t` do contexto é o que faz o diário se redesenhar ao trocar o
// idioma. Os `ev.type` são identificadores gravados no registro — não se
// traduzem, e por isso `ev.type` continua sendo o retorno de último caso.
function journalLabel(t, ev) {
  if (ev.type === 'troca') {
    const dir = ev.variant === 'reset' ? t('taskPanel.journal.switchReset')
      : ev.direction === 'phone' ? t('taskPanel.journal.switchToPhone')
      : t('taskPanel.journal.switchToTv');
    if (ev.stopped) return t('taskPanel.journal.stopped', { dir });
    const parts = [];
    if (ev.done) parts.push(t('taskPanel.journal.done', { n: ev.done }));
    if (ev.warn) parts.push(t('taskPanel.journal.warn', { n: ev.warn }));
    if (ev.skipped) parts.push(t('taskPanel.journal.skipped', { n: ev.skipped }));
    if (ev.blocked) parts.push(t('taskPanel.journal.blocked', { n: ev.blocked }));
    return t('taskPanel.journal.summary', {
      dir,
      parts: parts.join(', ') || t('taskPanel.journal.noItems'),
    });
  }
  if (ev.type === 'captura-descartada') return t('taskPanel.journal.captureDiscarded');
  if (ev.type === 'dormente-restaurado') return t('taskPanel.journal.dormantRestored');
  if (ev.type === 'fingerprint-pos-troca') {
    return t('taskPanel.journal.fingerprintCheck', {
      detail: ev.detail || t('taskPanel.journal.checkDone'),
    });
  }
  if (ev.type === 'retry-transitorio') {
    return t('taskPanel.journal.retry', { detail: ev.detail ? ` (${ev.detail})` : '' });
  }
  if (ev.type === 'registro-recuperado-do-backup') return t('taskPanel.journal.journalRecovered');
  if (ev.type === 'invariante-violada') {
    return t('taskPanel.journal.invariant', { detail: ev.detail ? ` (${ev.detail})` : '' });
  }
  return ev.type;
}

// Diário de trocas: histórico curto do aparelho (alternâncias, proteções,
// restaurações), recarregado a cada expansão. Diagnóstico em linguagem
// simples — QUANDO cada troca rodou e o que falhou, sem depender de memória.
function JournalList({ onLoad }) {
  const { t, language } = useT();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && onLoad) {
      try { setEvents(await onLoad()); } catch { setEvents([]); }
    }
  };

  const recent = (events || []).slice(-12).reverse();
  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  };

  return (
    <Box sx={{ mb: 2.5 }}>
      <Button fullWidth size="small" variant="text" color="inherit"
        onClick={toggle}
        endIcon={<ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
        sx={{ color: 'text.secondary', fontSize: '0.74rem', textTransform: 'none', justifyContent: 'space-between' }}>
        {t('taskPanel.journal.title')}
      </Button>
      <Collapse in={open}>
        <Stack spacing={0.8} sx={{ mt: 0.5, pl: 0.5 }}>
          {events === null ? (
            <Typography variant="caption" color="text.secondary">{t('taskPanel.journal.loading')}</Typography>
          ) : recent.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t('taskPanel.journal.empty')}
            </Typography>
          ) : recent.map((ev, i) => (
            <Box key={`${ev.at}-${i}`}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem', display: 'block' }}>
                {fmt(ev.at)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.76rem', lineHeight: 1.35 }}>
                {journalLabel(t, ev)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

// Vitrine de acessórios: links externos, sem checkbox.
//
// Mesmo acordeão das Modificações — categorias RECOLHIDAS, um clique expande.
// A discrição é o ponto: são recomendações, não parte do trabalho do app, e
// quem veio configurar o celular não deve tropeçar numa vitrine aberta. Fechada,
// a aba mostra só a lista de categorias; nada de preço, banner ou "compre".
//
// Divergência proposital do menu inicial: lá o número ao lado do grupo é um Chip
// primário porque conta um ESTADO (itens marcados). Aqui só conta quantos
// produtos existem — informação fria, então é texto secundário, sem cor de
// destaque.
function AccessoriesView() {
  const { t, language } = useT();
  // A lista depende do IDIOMA, não só da tradução: lojas regionais saem quando
  // a interface não está em português. Ver `accessoryGroupsFor` em tasks.js.
  const groups = accessoryGroupsFor(language);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {t('accessories.intro')}
      </Typography>

      {groups.map((group) => {
        const items = group.items || [];
        return (
          <Accordion key={group.id} disableGutters square
            sx={{ bgcolor: 'transparent', '&:before': { display: 'none' },
              boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}
              sx={{ px: 0, minHeight: 48 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                <SquareIcon>{ACCESSORY_ICONS[group.id] || <SpeakerIcon sx={{ fontSize: 15, color: 'text.primary' }} />}</SquareIcon>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{
                    fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'text.primary',
                  }}>
                    {t(`accessories.cat.${group.id}`)}
                  </Typography>
                  {group.soon && (
                    <Typography variant="caption" color="text.secondary"
                      sx={{ display: 'block', fontSize: '0.66rem', lineHeight: 1.2 }}>
                      {t('taskPanel.accessories.soon')}
                    </Typography>
                  )}
                </Box>
                {items.length > 0 && (
                  <Typography variant="caption" color="text.secondary"
                    sx={{ ml: 'auto', flexShrink: 0, fontSize: '0.68rem' }}>
                    {items.length}
                  </Typography>
                )}
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ px: 0, pt: 0.5, pb: 1.5 }}>
              {items.length === 0 ? (
                <Typography variant="caption" color="text.secondary"
                  sx={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                  {group.soon ? t(`accessories.soon.${group.id}`) : t('taskPanel.accessories.empty')}
                </Typography>
              ) : (
                <Stack spacing={1.4}>
                  {items.map((item) => (
                    <Link key={item.id} href={item.url} target="_blank" rel="noopener"
                      underline="none" sx={{ display: 'block' }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" color="primary"
                          sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {t(`accessories.label.${item.id}`)}
                        </Typography>
                        <OpenInNewIcon sx={{ fontSize: 13, color: 'primary.main', flexShrink: 0 }} />
                      </Stack>
                      {has(`accessories.note.${item.id}`) && (
                        <Typography variant="caption" color="text.secondary"
                          sx={{ display: 'block', lineHeight: 1.35 }}>
                          {t(`accessories.note.${item.id}`)}
                        </Typography>
                      )}
                      {/* A loja de destino fica visível antes do clique: o link
                          sai do app, e o usuário merece saber para onde. */}
                      {item.store && (
                        <Typography variant="caption" color="text.secondary"
                          sx={{ display: 'block', fontSize: '0.64rem', opacity: 0.75 }}>
                          {item.store}
                        </Typography>
                      )}
                    </Link>
                  ))}
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Typography variant="caption" color="text.secondary"
        sx={{ display: 'block', mt: 2, fontSize: '0.64rem', lineHeight: 1.4, opacity: 0.8 }}>
        {t(ACCESSORY_DISCLOSURE_KEY)}
      </Typography>
    </Box>
  );
}

export default function TaskPanel({
  selected, completed, onToggle, disabled, view: viewProp, onViewChange,
  onOpenDexGuide, onOpenFirstGuide, onOpenSideloadGuide,
  canReset, onOpenReset, onOpenCheckup,
  modeInfo, onOpenModeSwitch, onOpenInterfaceReset,
  hasDevice, running,
  mirrorStatus, onStartMirror,
  wifiStatus, onEnableWifi, isWifi,
  revertEntries = [], onRevertOne, onLoadJournal,
  profiles = [], canSaveProfile = false,
  onSaveProfile, onApplyProfile, onDeleteProfile,
}) {
  const { t } = useT();
  // Estado interno é fallback; se o pai controla (viewProp), usamos o dele.
  const [viewLocal, setViewLocal] = useState('mods'); // 'mods' | 'profiles' | 'accessories'
  const view = viewProp ?? viewLocal;
  const setView = (v) => { setViewLocal(v); onViewChange && onViewChange(v); };

  return (
    <Box sx={{ width: '100%', p: 2, height: '100%', overflowY: 'auto' }}>
      <ToggleButtonGroup
        value={view} exclusive size="small" fullWidth
        onChange={(_e, v) => v && setView(v)}
        // Três abas na lateral estreita: fonte compacta para caber sem quebrar.
        sx={{ mb: 2.5, '& .MuiToggleButton-root': { px: 0.4, fontSize: '0.68rem', whiteSpace: 'nowrap' } }}
      >
        <ToggleButton value="mods">{t('taskPanel.tab.mods')}</ToggleButton>
        {/* Perfis em destaque: é a aba que guarda "a interface que deu certo". */}
        <ToggleButton value="profiles" sx={{ gap: 0.4 }}>
          <BookmarkAddedIcon sx={{ fontSize: 13 }} />
          {t('taskPanel.tab.profiles')}{profiles.length > 0 ? ` (${profiles.length})` : ''}
        </ToggleButton>
        <ToggleButton value="accessories">{t('taskPanel.tab.accessories')}</ToggleButton>
      </ToggleButtonGroup>

      {view === 'accessories' ? (
        <AccessoriesView />
      ) : view === 'profiles' ? (
        <ProfilesPanel
          profiles={profiles}
          canSave={canSaveProfile}
          hasDevice={hasDevice}
          running={running}
          onSave={onSaveProfile}
          onApply={onApplyProfile}
          onDelete={onDeleteProfile}
        />
      ) : (
        <>
          {/* Atalho fixo no topo: abre o tutorial de desativar o DeX.
              Fica antes das modificações por ser um passo à parte (guiado,
              não aplicado via ADB). */}
          <Button
            fullWidth variant="outlined" color="primary" startIcon={<TvIcon />}
            onClick={onOpenDexGuide}
            sx={{ mb: 1.2, py: 1, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em' }}
          >
            {t('taskPanel.disableDex')}
          </Button>

          {/* Reabre o guia de primeira configuração (mostrado sozinho só na
              primeira vez de cada aparelho). Discreto de propósito. */}
          {onOpenFirstGuide && (
            <Button
              fullWidth size="small" variant="text" color="inherit"
              startIcon={<MenuBookIcon sx={{ fontSize: 15 }} />}
              onClick={onOpenFirstGuide}
              sx={{ mb: 1.2, mt: -0.6, py: 0.4, fontSize: '0.72rem', textTransform: 'none',
                color: 'text.secondary' }}
            >
              {t('taskPanel.firstGuideBtn')}
            </Button>
          )}

          {/* Espelhamento da tela (scrcpy): abre a tela do celular numa
              janela controlável por mouse — dispensa pegar o aparelho na mão
              nas etapas que pedem toques. */}
          <SideHelpButton
            icon={<ScreenShareIcon />}
            label={mirrorStatus?.busy ? t('taskPanel.mirror.opening') : t('taskPanel.mirror.label')}
            onClick={onStartMirror}
            disabled={!hasDevice || !!mirrorStatus?.busy}
            help={t('taskPanel.mirror.help')}
          />
          {mirrorStatus?.error && (
            <Typography variant="caption" color="error"
              sx={{ display: 'block', mt: -0.6, mb: 1.2, fontSize: '0.72rem', lineHeight: 1.35 }}>
              {mirrorStatus.error}
            </Typography>
          )}

          {/* Conexão por Wi-Fi: depois de ativada, o cabo pode ser removido —
              útil com o celular já instalado atrás da TV. */}
          <SideHelpButton
            icon={<WifiIcon />}
            label={isWifi ? t('taskPanel.wifi.connected')
              : wifiStatus?.busy ? t('taskPanel.wifi.enabling')
              : t('taskPanel.wifi.label')}
            onClick={onEnableWifi}
            disabled={!hasDevice || running || isWifi || !!wifiStatus?.busy}
            help={t('taskPanel.wifi.help')}
          />
          {wifiStatus?.ip && !isWifi && (
            <Typography variant="caption" color="success.main"
              sx={{ display: 'block', mt: -0.6, mb: 1.2, fontSize: '0.72rem', lineHeight: 1.35 }}>
              {t('taskPanel.wifi.connectedAt', { ip: wifiStatus.ip })}
            </Typography>
          )}
          {wifiStatus?.error && !isWifi && (
            <Typography variant="caption" color="error"
              sx={{ display: 'block', mt: -0.6, mb: 1.2, fontSize: '0.72rem', lineHeight: 1.35 }}>
              {wifiStatus.error}
            </Typography>
          )}

          {/* Alternância de modos (celular ⇄ TV): aparece quando existe um
              perfil de modo (ativo ou adormecido). Um clique alterna em
              segundos, sem desinstalar nada — a "ponte" do dia a dia. */}
          {modeInfo && (modeInfo.active > 0 || modeInfo.dormant > 0) && (
            <SideHelpButton
              icon={<SwapHorizIcon />}
              label={modeInfo.active > 0 ? t('taskPanel.mode.toPhone') : t('taskPanel.mode.toTv')}
              onClick={() => onOpenModeSwitch && onOpenModeSwitch(modeInfo.active > 0 ? 'phone' : 'tv')}
              disabled={!hasDevice || running}
              help={t('taskPanel.mode.help')}
            />
          )}

          {/* Check-up: verifica se os ajustes aplicados continuam valendo.
              Compartilha o mesmo gatilho do reset (há algo registrado). */}
          <Button
            fullWidth variant="outlined" color="primary" startIcon={<TroubleshootIcon />}
            onClick={onOpenCheckup} disabled={!canReset}
            sx={{ mb: 1.2, py: 1, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em',
              opacity: canReset ? 1 : 0.5 }}
          >
            {t('taskPanel.checkup')}
          </Button>

          {/* ---- Manutenção -----------------------------------------------
              A "oficina" do aparelho, agrupada: restaurar interface,
              check-up, reversões e o diário de trocas. */}
          <Divider sx={{ mb: 1.2 }} />
          <Typography variant="overline" sx={{
            display: 'block', fontSize: '0.64rem', letterSpacing: '0.14em',
            color: 'text.secondary', mb: 0.8, lineHeight: 1.4,
          }}>
            {t('taskPanel.maintenance')}
          </Typography>

          {/* Reset de interface: o degrau ANTES da Reversão completa — para
              quando só a interface do celular ficou torta. Aparece junto com
              a ponte de modos (há ajustes de modo registrados). */}
          {onOpenInterfaceReset && modeInfo && (modeInfo.active > 0 || modeInfo.dormant > 0) && (
            <SideHelpButton
              icon={<SettingsBackupRestoreIcon />}
              label={t('taskPanel.interfaceReset.label')}
              onClick={onOpenInterfaceReset}
              disabled={!hasDevice || running}
              help={t('taskPanel.interfaceReset.help')}
            />
          )}

          {/* Reversão completa: desfaz TUDO de uma vez. Só fica clicável
              quando há algo aplicado para desfazer (canReset). Ação
              destrutiva, em tom de erro. */}
          <Button
            fullWidth variant="outlined" color="error" startIcon={<RestartAltIcon />}
            onClick={onOpenReset} disabled={!canReset}
            sx={{ mb: revertEntries.length > 0 ? 0.5 : 2.5, py: 1, fontSize: '0.8rem',
              fontWeight: 700, letterSpacing: '0.02em', opacity: canReset ? 1 : 0.5 }}
          >
            {t('taskPanel.fullReset')}
          </Button>

          {/* Reversão isolada, item a item, logo abaixo da completa. */}
          {revertEntries.length > 0 && (
            <RevertOneList entries={revertEntries} onRevertOne={onRevertOne}
              disabled={disabled || !hasDevice} />
          )}

          {/* Diário de trocas: o histórico do aparelho, em linguagem simples. */}
          {hasDevice && onLoadJournal && <JournalList onLoad={onLoadJournal} />}

          {/* Convite para salvar a interface como perfil: aparece quando há
              ajustes de modo ativos — o momento em que "a tela ficou boa". */}
          {canSaveProfile && (
            <Box sx={{
              p: 1.2, mb: 2, borderRadius: 0,
              border: '1px solid rgba(255,185,74,0.35)', bgcolor: 'rgba(255,185,74,0.06)',
            }}>
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4, mb: 0.8 }}>
                {t('taskPanel.profileHint')}
              </Typography>
              <Button
                fullWidth size="small" variant="outlined" color="primary"
                startIcon={<BookmarkAddedIcon sx={{ fontSize: 15 }} />}
                onClick={() => setView('profiles')}
                sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em' }}
              >
                {t('taskPanel.saveAsProfile')}
              </Button>
            </Box>
          )}

          {/* Grupos RECOLHIDOS por padrão: um clique expande. A contagem no
              título mostra quantos itens do grupo estão marcados, mesmo com
              o grupo fechado — a interface fica limpa sem esconder estado. */}
          {TASK_GROUPS.map((group) => {
            const groupTasks = group.tasks || [];
            const count = groupTasks.filter((t) => selected[t.id]).length;
            return (
              <Accordion key={group.id} disableGutters square
                sx={{ bgcolor: 'transparent', '&:before': { display: 'none' },
                  boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}
                  sx={{ px: 0, minHeight: 48 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                    {/* Título do grupo com ícone QUADRADO e rótulo uppercase
                        espaçado — a voz "usinada" do design de referência. */}
                    <SquareIcon>{GROUP_ICONS[group.id] || <TuneIcon sx={{ fontSize: 15, color: 'text.primary' }} />}</SquareIcon>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{
                        fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: 'text.primary',
                      }}>
                        {t(`taskGroups.${group.id}.title`)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary"
                        sx={{ display: 'block', fontSize: '0.66rem', lineHeight: 1.2 }}>
                        {t(`taskGroups.${group.id}.subtitle`)}
                      </Typography>
                    </Box>
                    {count > 0 && (
                      <Chip label={count} size="small" color="primary" variant="outlined"
                        sx={{ ml: 'auto', height: 18, flexShrink: 0,
                          '& .MuiChip-label': { px: 0.8, fontSize: '0.7rem' } }} />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0.5, pb: 1.5 }}>
                  {groupTasks.map((task) => (
                    <TaskCheck key={task.id} task={task} selected={selected} completed={completed}
                      onToggle={onToggle} disabled={disabled} />
                  ))}
                  {has(`taskGroups.${group.id}.notice`) && (
                    <GroupNotice
                      text={t(`taskGroups.${group.id}.notice`)}
                      action={t(`taskGroups.${group.id}.noticeAction`)}
                      onOpen={onOpenSideloadGuide} />
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </>
      )}
    </Box>
  );
}
