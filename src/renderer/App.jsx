// src/renderer/App.jsx
// Layout de três colunas: TaskPanel | DevicePanel | ProgressPanel.
// Toda chamada ADB real acontece no processo main; aqui falamos com ele
// via window.api (exposto pelo preload). Veja src/main/preload.js.

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box, Paper } from '@mui/material';
import { theme } from './theme/theme';
import TaskPanel from './components/TaskPanel';
import DevicePanel from './components/DevicePanel';
import ProgressPanel from './components/ProgressPanel';
import CloseDialog from './components/CloseDialog';
import DexGuideDialog from './components/DexGuideDialog';
import ResetDialog from './components/ResetDialog';
import { TASK_GROUPS } from './data/tasks';

// Achata todas as tasks selecionáveis: as diretas dos grupos comuns e os
// apps dentro das categorias do grupo "install".
const ALL_TASKS = TASK_GROUPS.flatMap((g) =>
  g.categories
    ? g.categories.flatMap((c) => c.apps)
    : (g.tasks || [])
);

export default function App() {
  const [device, setDevice] = useState(null);
  const [cablePresent, setCablePresent] = useState(false); // cabo ligado mas não autorizado
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState({});
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [percent, setPercent] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');
  // IDs de tasks comprovadamente concluídas (ficam riscadas e travadas).
  const [completed, setCompleted] = useState({});
  // Pop-up de fechamento e qual aba está ativa na coluna esquerda.
  const [closePopup, setClosePopup] = useState(false);
  const [leftView, setLeftView] = useState('mods'); // 'mods' | 'accessories'
  // Diálogo da etapa "DeX vs Experiência de TV".
  const [dexGuide, setDexGuide] = useState(false);
  // Reversão: diálogo de reset e quantas reversões há para o aparelho atual.
  const [resetOpen, setResetOpen] = useState(false);
  const [revertCount, setRevertCount] = useState(0);

  const toggle = useCallback((id) => {
    // Não permite remarcar algo já concluído.
    if (completed[id]) return;
    const task = ALL_TASKS.find((t) => t.id === id);
    const group = task?.exclusiveGroup;
    setSelected((s) => {
      const turningOn = !s[id];
      const next = { ...s, [id]: turningOn };
      // Se esta task pertence a um grupo exclusivo e está sendo LIGADA,
      // desliga as outras do mesmo grupo (ex.: só uma resolução por vez).
      if (group && turningOn) {
        for (const t of ALL_TASKS) {
          if (t.id !== id && t.exclusiveGroup === group) next[t.id] = false;
        }
      }
      return next;
    });
  }, [completed]);

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const devices = await window.api.listDevices();
      const online = devices.find((d) => d.state === 'device');
      // 'unauthorized' = cabo conectado, faltou o usuário tocar em "Permitir".
      const pending = devices.find((d) => d.state === 'unauthorized');
      if (online) {
        setCablePresent(true);
        // Mesmo aparelho de antes: não reconsulta as propriedades a cada
        // ciclo de polling (o describeDevice faz várias chamadas ADB).
        if (!device || device.serial !== online.serial) {
          const info = await window.api.describeDevice(online.serial);
          setDevice(info);
        }
      } else {
        setDevice(null);
        setCablePresent(!!pending);
      }
    } catch (e) {
      setDevice(null);
      setCablePresent(false);
    } finally {
      setScanning(false);
    }
  }, [device]);

  // Atualiza a contagem de reversões disponíveis para o aparelho atual.
  const refreshRevertCount = useCallback(async () => {
    if (!device) { setRevertCount(0); return; }
    try { setRevertCount(await window.api.revertCount(device.serial)); }
    catch { setRevertCount(0); }
  }, [device]);

  // Recarrega a contagem quando o aparelho muda.
  useEffect(() => { refreshRevertCount(); }, [refreshRevertCount]);

  // Após reverter: atualiza a contagem e destrava as tasks (voltam a poder
  // ser marcadas, pois foram desfeitas). Limpamos os 'completed' cujos itens
  // já não têm reversão pendente.
  const handleReverted = useCallback(async () => {
    await refreshRevertCount();
    try {
      const remaining = await window.api.revertList(device.serial);
      const stillDone = new Set(remaining.map((e) => e.taskId));
      setCompleted((c) => {
        const next = {};
        for (const id of Object.keys(c)) if (stillDone.has(id)) next[id] = true;
        return next;
      });
    } catch { /* mantém estado atual em caso de erro */ }
  }, [device, refreshRevertCount]);

  // Quando o usuário tenta fechar a janela, o main avisa e mostramos o pop-up.
  useEffect(() => {
    if (!window.api || !window.api.onShowClosePopup) return undefined;
    const unsubscribe = window.api.onShowClosePopup(() => setClosePopup(true));
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  // Ações do pop-up de fechamento.
  const handleSeeAccessories = useCallback(() => {
    setLeftView('accessories'); // troca a coluna esquerda para Acessórios
    setClosePopup(false);       // fecha o pop-up, mantém o app aberto
  }, []);
  const handleConfirmClose = useCallback(() => {
    setClosePopup(false);
    if (window.api && window.api.confirmClose) window.api.confirmClose();
  }, []);

  // Polling contínuo (pausado durante a execução): detecta tanto o plug
  // quanto o DESplug do aparelho — sem isso, um cabo removido deixaria a UI
  // mostrando um dispositivo que não existe mais.
  useEffect(() => {
    scan();
    const t = setInterval(() => { if (!running) scan(); }, 3000);
    return () => clearInterval(t);
  }, [running, scan]);

  const run = useCallback(async () => {
    if (!device) return;
    const queue = ALL_TASKS.filter((t) => selected[t.id]);
    setRunning(true);
    setPercent(0);
    setLog(queue.map((t) => ({ id: t.id, label: t.label, status: 'pending' })));

    for (let i = 0; i < queue.length; i++) {
      const task = queue[i];
      setCurrentLabel(task.label);
      setLog((l) => l.map((e) => e.id === task.id ? { ...e, status: 'running' } : e));
      try {
        const detail = await window.api.runTask(device.serial, task);
        setLog((l) => l.map((e) => e.id === task.id ? { ...e, status: 'done', detail } : e));
        setCompleted((c) => ({ ...c, [task.id]: true }));
      } catch (err) {
        const msg = String(err.message || err);
        let status = 'error';
        let detail = msg;
        if (msg.startsWith('VERIFICATION_FAILURE:')) {
          status = 'guide';
          detail = 'Android bloqueou por segurança. Veja o guia →';
        } else if (msg.startsWith('ALREADY_INSTALLED:')) {
          status = 'warning';
          detail = 'Já existe uma versão instalada com assinatura diferente.';
        }
        setLog((l) => l.map((e) => e.id === task.id ? { ...e, status, detail } : e));
      }
      setPercent(Math.round(((i + 1) / queue.length) * 100));
    }
    setRunning(false);
    setSelected({});
    refreshRevertCount(); // novas reversões podem ter sido registradas
  }, [device, selected, refreshRevertCount]);

  const ready = Object.values(selected).some(Boolean);
  const hasCompleted = Object.values(completed).some(Boolean);

  // Decide o que a tela do celular mostra.
  // Após a primeira configuração concluída (e fora de execução), o aparelho
  // "vira TV": gira para horizontal e cresce. Enquanto roda, mostra 'working'.
  const phase = running ? 'working'
    : hasCompleted && device ? 'tv'
    : device ? 'success'
    : cablePresent ? 'waiting'
    : 'tutorial';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
        <Paper square sx={{ borderRight: '1px solid', borderColor: 'divider', borderRadius: 0 }}>
          <TaskPanel
            selected={selected} completed={completed} onToggle={toggle} disabled={running}
            view={leftView} onViewChange={setLeftView}
            onOpenDexGuide={() => setDexGuide(true)}
            canReset={revertCount > 0} onOpenReset={() => setResetOpen(true)}
          />
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <DevicePanel
            device={device} phase={phase} scanning={scanning} onRefresh={scan}
            onRun={run} running={running} ready={ready}
            percent={percent} currentLabel={currentLabel}
            showAccessories={leftView === 'accessories'}
            onOpenDexGuide={() => setDexGuide(true)}
          />
        </Box>

        <Paper square sx={{ borderLeft: '1px solid', borderColor: 'divider', borderRadius: 0 }}>
          <ProgressPanel log={log} percent={percent} active={running || log.length > 0} />
        </Paper>
      </Box>

      {/* Pop-up de fechamento que apresenta os acessórios. */}
      <CloseDialog
        open={closePopup}
        onSeeAccessories={handleSeeAccessories}
        onConfirmClose={handleConfirmClose}
      />

      {/* Etapa DeX vs Experiência de TV. */}
      <DexGuideDialog open={dexGuide} onClose={() => setDexGuide(false)} />

      {/* Reversão de alterações. */}
      <ResetDialog
        open={resetOpen} serial={device?.serial}
        onClose={() => setResetOpen(false)}
        onReverted={handleReverted}
      />
    </ThemeProvider>
  );
}
