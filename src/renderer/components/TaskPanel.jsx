// src/renderer/components/TaskPanel.jsx
// Aba ESQUERDA: alterna entre "Modificações" e "Acessórios" no topo.
//
// MODIFICAÇÕES: grupos com tasks. O grupo "install" é especial — em vez de
// tasks diretas, traz categorias (multimídia, navegação, launchers,
// emuladores) renderizadas como acordeões, cada uma com seus apps.
//
// ACESSÓRIOS: vitrine de produtos com link externo (não mexe no aparelho).

import React, { useState } from 'react';
import {
  Box, Typography, Checkbox, FormControlLabel, Divider, Stack,
  Accordion, AccordionSummary, AccordionDetails, ToggleButtonGroup, ToggleButton,
  Link, Chip, Collapse, IconButton, Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TvIcon from '@mui/icons-material/Tv';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import { TASK_GROUPS, ACCESSORY_GROUPS } from '../data/tasks';

const KIND_COLOR = { remove: 'error', install: 'primary', setting: 'success', home: 'success', settings: 'success', rotate: 'success', wmsize: 'success', dnd: 'success' };

// Uma linha de task: checkbox + (opcional) indicador "?" que expande a
// explicação curta do porquê daquela personalização.
function TaskCheck({ task, selected, completed, onToggle, disabled }) {
  const [open, setOpen] = useState(false);
  const isDone = !!(completed && completed[task.id]);
  return (
    <Box sx={{ mb: 0.3 }}>
      <Stack direction="row" alignItems="center" sx={{ minHeight: 32 }}>
        <FormControlLabel
          sx={{ flex: 1, ml: 0, mr: 0, cursor: isDone ? 'default' : 'pointer' }}
          control={
            isDone ? (
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
            <Typography variant="body2"
              sx={{ fontSize: '0.85rem',
                // Riscado e esmaecido quando concluído.
                textDecoration: isDone ? 'line-through' : 'none',
                color: isDone ? 'text.secondary' : 'text.primary',
                opacity: isDone ? 0.7 : 1 }}>
              {task.label}
            </Typography>
          }
        />
        {task.info && !isDone && (
          <IconButton size="small" onClick={() => setOpen((o) => !o)}
            aria-label="Por que fazer isso?"
            sx={{ p: 0.4, color: open ? 'primary.main' : 'text.secondary' }}>
            <HelpOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Stack>
      {task.info && !isDone && (
        <Collapse in={open}>
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', pl: 3.8, pr: 1, pb: 0.8, fontSize: '0.72rem', lineHeight: 1.45,
              borderLeft: '2px solid rgba(255,185,74,0.3)', ml: 1.2 }}>
            {task.info}
          </Typography>
        </Collapse>
      )}
    </Box>
  );
}

// Grupo "install": categorias como acordeões.
function InstallGroup({ group, selected, completed, onToggle, disabled }) {
  return (
    <Box>
      {group.categories.map((cat) => {
        const count = cat.apps.filter((a) => selected[a.id]).length;
        return (
          <Accordion key={cat.id} disableGutters square
            sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, boxShadow: 'none', border: 'none' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />} sx={{ px: 0, minHeight: 40 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {cat.label}
              </Typography>
              {count > 0 && (
                <Chip label={count} size="small" color="primary" variant="outlined"
                  sx={{ ml: 1, height: 18, '& .MuiChip-label': { px: 0.8, fontSize: '0.7rem' } }} />
              )}
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              {cat.apps.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Nenhum app nesta categoria ainda.
                </Typography>
              ) : (
                cat.apps.map((app) => (
                  <TaskCheck key={app.id} task={app} selected={selected} completed={completed}
                    onToggle={onToggle} disabled={disabled} />
                ))
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

// Vitrine de acessórios: links externos, sem checkbox.
function AccessoriesView() {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Produtos que expandem o uso do celular como TV. Abrem no navegador.
      </Typography>
      {ACCESSORY_GROUPS.map((group) => (
        <Box key={group.id} sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontSize: '0.95rem', mb: 1 }}>{group.label}</Typography>
          {group.items.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Nenhum acessório cadastrado ainda.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {group.items.map((item) => (
                <Link key={item.id} href={item.url} target="_blank" rel="noopener"
                  underline="none" sx={{ display: 'block' }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2" color="primary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <OpenInNewIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                  </Stack>
                  {item.note && (
                    <Typography variant="caption" color="text.secondary">{item.note}</Typography>
                  )}
                </Link>
              ))}
            </Stack>
          )}
          <Divider sx={{ mt: 1.5 }} />
        </Box>
      ))}
    </Box>
  );
}

export default function TaskPanel({ selected, completed, onToggle, disabled, view: viewProp, onViewChange, onOpenDexGuide, canReset, onOpenReset, onOpenCheckup }) {
  // Estado interno é fallback; se o pai controla (viewProp), usamos o dele.
  const [viewLocal, setViewLocal] = useState('mods'); // 'mods' | 'accessories'
  const view = viewProp ?? viewLocal;
  const setView = (v) => { setViewLocal(v); onViewChange && onViewChange(v); };

  return (
    <Box sx={{ width: 300, p: 2.5, height: '100%', overflowY: 'auto' }}>
      <ToggleButtonGroup
        value={view} exclusive size="small" fullWidth
        onChange={(_e, v) => v && setView(v)}
        sx={{ mb: 2.5 }}
      >
        <ToggleButton value="mods">Modificações</ToggleButton>
        <ToggleButton value="accessories">Acessórios</ToggleButton>
      </ToggleButtonGroup>

      {view === 'accessories' ? (
        <AccessoriesView />
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
            Desative o DeX
          </Button>

          {/* Check-up: verifica se os ajustes aplicados continuam valendo.
              Compartilha o mesmo gatilho do reset (há algo registrado). */}
          <Button
            fullWidth variant="outlined" color="primary" startIcon={<TroubleshootIcon />}
            onClick={onOpenCheckup} disabled={!canReset}
            sx={{ mb: 1.2, py: 1, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em',
              opacity: canReset ? 1 : 0.5 }}
          >
            Check-up do aparelho
          </Button>

          {/* Reverter alterações: só fica clicável quando há algo aplicado
              para desfazer (canReset). Ação destrutiva, em tom de erro. */}
          <Button
            fullWidth variant="outlined" color="error" startIcon={<RestartAltIcon />}
            onClick={onOpenReset} disabled={!canReset}
            sx={{ mb: 2.5, py: 1, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em',
              opacity: canReset ? 1 : 0.5 }}
          >
            Reverter alterações
          </Button>

          {TASK_GROUPS.map((group) => (
          <Box key={group.id} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '0.95rem' }}>{group.title}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {group.subtitle}
            </Typography>

            {group.categories ? (
              <InstallGroup group={group} selected={selected} completed={completed} onToggle={onToggle} disabled={disabled} />
            ) : (
              group.tasks.map((task) => (
                <TaskCheck key={task.id} task={task} selected={selected} completed={completed}
                  onToggle={onToggle} disabled={disabled} />
              ))
            )}
            <Divider sx={{ mt: 1.5 }} />
          </Box>
          ))}
        </>
      )}
    </Box>
  );
}
