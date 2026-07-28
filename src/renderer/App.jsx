// src/renderer/App.jsx
// Layout de três colunas: TaskPanel | DevicePanel | ProgressPanel.
// Toda chamada ADB real acontece no processo main; aqui falamos com ele
// via window.api (exposto pelo preload). Veja src/main/preload.js.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box, Paper } from '@mui/material';
import { theme } from './theme/theme';
import TaskPanel from './components/TaskPanel';
import DevicePanel from './components/DevicePanel';
import CloseDialog from './components/CloseDialog';
import DexGuideDialog from './components/DexGuideDialog';
import FirstSetupGuideDialog from './components/FirstSetupGuideDialog';
import ResetDialog from './components/ResetDialog';
import CheckupDialog from './components/CheckupDialog';
import TvResolutionDialog from './components/TvResolutionDialog';
import ModeSwitchDialog from './components/ModeSwitchDialog';
import ControlCenter from './components/ControlCenter';
import RemoteControl from './components/RemoteControl';
import SendOverlay from './components/SendOverlay';
import SideloadGuideDialog from './components/SideloadGuideDialog';
import ContributeTab from './components/ContributeTab';
import ContributeDialog from './components/ContributeDialog';
import LanguageTab from './components/LanguageTab';
import { ALL_TASKS, RECOMMENDED_TASK_IDS, isModeTask } from './data/tasks';
import { friendlyError } from './utils/errors';
import { useT } from './i18n';
import { entryLabel } from './utils/labels';

// Largura ÚNICA das duas laterais (esquerda e direita): adaptável à janela,
// entre 230 e 300px. Laterais iguais mantêm o conteúdo central sempre
// centralizado, em qualquer largura de janela.
const SIDE_W = 'clamp(230px, 21vw, 300px)';

export default function App() {
  const { t, language } = useT();
  const [device, setDevice] = useState(null);
  const [cablePresent, setCablePresent] = useState(false); // cabo ligado mas não autorizado
  const [scanning, setScanning] = useState(false);
  // Todos os aparelhos online (para o seletor quando há mais de um) e qual
  // serial o usuário escolheu focar.
  const [onlineDevices, setOnlineDevices] = useState([]);
  const [preferredSerial, setPreferredSerial] = useState(null);
  // Conexão Wi-Fi: null | { busy } | { ip } | { error }.
  const [wifiStatus, setWifiStatus] = useState(null);
  // Espelhamento da tela (scrcpy): null | { busy } | { error }.
  const [mirrorStatus, setMirrorStatus] = useState(null);
  // Diálogo de check-up (verificação dos ajustes aplicados).
  const [checkupOpen, setCheckupOpen] = useState(false);
  // Pergunta da resolução da TV, feita antes da Configuração Recomendada.
  const [tvResOpen, setTvResOpen] = useState(false);
  const [selected, setSelected] = useState({});
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [percent, setPercent] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');
  // IDs de tasks comprovadamente concluídas (ficam riscadas e travadas).
  const [completed, setCompleted] = useState({});
  // Pop-up de fechamento e qual aba está ativa na coluna esquerda.
  const [closePopup, setClosePopup] = useState(false);
  const [leftView, setLeftView] = useState('mods'); // 'mods' | 'profiles' | 'accessories'
  // Diálogo da etapa "DeX vs Experiência de TV".
  const [dexGuide, setDexGuide] = useState(false);
  // Guia de primeira configuração (uma vez por aparelho; introSeen nas prefs).
  const [firstGuideOpen, setFirstGuideOpen] = useState(false);
  // Aviso "Como instalar apps e enviar arquivos" (o que ficou no lugar do
  // antigo catálogo de APKs) e o painel "Contribua com o projeto" — os dois
  // só abrem por clique do usuário.
  const [sideloadGuideOpen, setSideloadGuideOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  // Reversão: diálogo de reset, contagem e lista de entradas do aparelho
  // atual (a lista alimenta a reversão isolada na barra lateral).
  const [resetOpen, setResetOpen] = useState(false);
  const [revertCount, setRevertCount] = useState(0);
  const [revertEntries, setRevertEntries] = useState([]);
  // Alternância de modos (celular ⇄ TV): diálogo com a fila da direção
  // escolhida, e a preferência "modo TV automático ao conectar" do aparelho.
  // `variant`: 'manual' (botão) | 'auto' (ponte automática, com contagem
  // regressiva) | 'resume' (concluir uma troca que ficou no meio).
  // O serial fica congelado no diálogo: se o cabo cair no meio da troca, o
  // device do App some, mas a pausa "reconecte e continue" precisa dele.
  const [modeDialog, setModeDialog] = useState(null); // null | { direction, variant, queue, serial }
  const [autoTvPref, setAutoTvPref] = useState(false);
  // Troca de modo que ficou no meio (pendingSwitch das prefs do aparelho) —
  // alimenta o chip "Troca incompleta" no painel central.
  const [pendingSwitchPref, setPendingSwitchPref] = useState(null);
  // Painel de saúde: incrementar força uma releitura imediata (ex.: logo
  // após a limpeza liberar espaço, sem esperar o ciclo de 30 s).
  const [healthTick, setHealthTick] = useState(0);
  // Perfis nomeados de interface do aparelho atual ("Sala 4K", ...).
  const [profiles, setProfiles] = useState([]);

  // Índice do catálogo por id: fonte da classificação de modo (o catálogo
  // atual manda; entry.task é o fallback para registros antigos).
  const catalogById = useMemo(() => new Map(ALL_TASKS.map((t) => [t.id, t])), []);

  // Contagem das entradas de modo, ativas e adormecidas — decide o rótulo e a
  // direção do botão de alternância (e o visual do mock do celular).
  const modeInfo = useMemo(() => {
    let active = 0;
    let dormant = 0;
    for (const e of revertEntries) {
      if (!isModeTask(catalogById.get(e.taskId) || e.task)) continue;
      if (e.dormant) dormant += 1; else active += 1;
    }
    return { active, dormant };
  }, [revertEntries, catalogById]);

  // Monta a fila da troca de modo. Adormecer segue a ordem INVERSA da
  // aplicação (pilha, como a reversão completa); acordar segue a ordem de
  // aplicação (launcher instala antes de virar padrão, resolução antes do dpi).
  const buildModeQueue = useCallback((direction, entries) => {
    const isMode = (e) => isModeTask(catalogById.get(e.taskId) || e.task);
    const source = direction === 'phone'
      ? entries.filter((e) => isMode(e) && !e.dormant).reverse()
      : entries.filter((e) => isMode(e) && e.dormant);
    return source.map((e) => ({
      taskId: e.taskId,
      label: entryLabel(t, e),
      fallbackTask: catalogById.get(e.taskId) || null,
    }));
  }, [catalogById, t]);

  const openModeSwitch = useCallback((direction, variant = 'manual', entriesArg = null) => {
    if (!device) return;
    const queue = buildModeQueue(direction, entriesArg || revertEntries);
    if (queue.length === 0) return;
    // Nunca atropela um diálogo já aberto: se o cabo caiu e voltou no meio de
    // uma troca PAUSADA, o efeito de conexão tentaria abrir a retomada por
    // cima — e a fila pausada, que espera o "Tentar de novo", se perderia.
    setModeDialog((cur) => cur || { direction, variant, queue, serial: device.serial });
  }, [buildModeQueue, revertEntries, device]);

  // Reset de interface: devolve a interface de celular ao estado ORIGINAL da
  // primeira configuração. A fila leva TODAS as entradas de modo — inclusive
  // as dormentes: uma volta ao celular que gravou um retrato contaminado
  // deixa a entrada dormente COM o aparelho torto, e é exatamente esse caso
  // que o reset existe para curar. Ordem inversa da aplicação (pilha), e o
  // diálogo da ponte executa na variante 'reset' (camada original + force).
  const openInterfaceReset = useCallback(() => {
    if (!device) return;
    const queue = revertEntries
      .filter((e) => isModeTask(catalogById.get(e.taskId) || e.task))
      .slice()
      .reverse()
      .map((e) => ({
        taskId: e.taskId,
        label: e.label,
        fallbackTask: catalogById.get(e.taskId) || null,
      }));
    if (queue.length === 0) return;
    setResetOpen(false);
    setModeDialog((cur) => cur || { direction: 'phone', variant: 'reset', queue, serial: device.serial });
  }, [device, revertEntries, catalogById]);

  // Task de instalação do launcher de TV (do catálogo): é o que o diálogo de
  // alternância oferece reinstalar quando o launcher sumiu do aparelho.
  const launcherInstallTask = useMemo(() => {
    const home = ALL_TASKS.find((t) => t.kind === 'home');
    if (!home || !home.pkg) return null;
    return ALL_TASKS.find((t) => t.kind === 'install' && t.pkg === home.pkg) || null;
  }, []);

  // Liga/desliga a ponte automática (persistida no registro do aparelho, no
  // main — sobrevive à troca USB↔Wi-Fi porque segue o serial estável).
  const toggleAutoTv = useCallback(async (value) => {
    setAutoTvPref(value);
    if (!device) return;
    try { await window.api.modeSetPrefs(device.serial, { autoTv: value }); } catch { /* melhor-esforço */ }
  }, [device]);

  const toggle = useCallback((id) => {
    const task = ALL_TASKS.find((t) => t.id === id);
    // Não permite remarcar algo já concluído — exceto os ajustes de
    // interface repetíveis (rotação, resolução, dpi), que podem ser
    // reaplicados quantas vezes for preciso até a tela ficar certa.
    if (completed[id] && !task?.repeatable) return;
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
      const online = devices.filter((d) => d.state === 'device');
      // 'unauthorized' = cabo conectado, faltou o usuário tocar em "Permitir".
      const pending = devices.find((d) => d.state === 'unauthorized');
      setOnlineDevices(online);
      // Respeita a escolha do usuário quando há mais de um aparelho; senão,
      // fica com o primeiro da lista.
      const target = online.find((d) => d.serial === preferredSerial) || online[0];
      if (target) {
        setCablePresent(true);
        // Mesmo aparelho de antes: não reconsulta as propriedades a cada
        // ciclo de polling (o describeDevice faz várias chamadas ADB).
        if (!device || device.serial !== target.serial) {
          const info = await window.api.describeDevice(target.serial);
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
  }, [device, preferredSerial]);

  // Atualiza a lista e a contagem de reversões disponíveis para o aparelho.
  const refreshRevertState = useCallback(async () => {
    if (!device) { setRevertCount(0); setRevertEntries([]); return; }
    try {
      const entries = await window.api.revertList(device.serial);
      setRevertEntries(entries);
      setRevertCount(entries.length);
    } catch { setRevertCount(0); setRevertEntries([]); }
  }, [device]);

  // Ao (re)conectar um aparelho, restaura o ponto onde o usuário parou: tudo
  // que está no registro de reversão foi aplicado por nós, então volta marcado
  // como concluído — dá para continuar de onde estava sem refazer nada.
  // Também carrega as preferências do aparelho e, se a ponte automática está
  // ligada e o modo TV ficou adormecido, reativa-o sozinho (o diálogo abre já
  // executando, para o usuário ver o que acontece).
  useEffect(() => {
    if (!device?.serial) { setRevertCount(0); setRevertEntries([]); setProfiles([]); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const entries = await window.api.revertList(device.serial);
        if (cancelled) return;
        setRevertEntries(entries);
        setRevertCount(entries.length);
        setCompleted(Object.fromEntries(entries.map((e) => [e.taskId, true])));
        const profs = await window.api.profilesList(device.serial).catch(() => []);
        if (cancelled) return;
        setProfiles(profs);
        const prefs = await window.api.modeGetPrefs(device.serial).catch(() => ({}));
        if (cancelled) return;
        setAutoTvPref(!!(prefs && prefs.autoTv));
        // Guia de primeira configuração: aparelho SEM nada aplicado e que
        // nunca viu o guia. Aparece uma única vez por aparelho — fechar
        // grava introSeen; o botão discreto da lateral reabre quando quiser.
        // Sem registro também não há retomada nem ponte automática, então o
        // guia nunca disputa a tela com os outros diálogos.
        if (entries.length === 0 && !(prefs && prefs.introSeen)) {
          setFirstGuideOpen(true);
        }
        // Troca que ficou no meio (cabo, bloqueio ou "parar por aqui"):
        // PERGUNTA se o usuário quer concluir — antes de qualquer automação.
        const pending = prefs && prefs.pendingSwitch;
        if (pending && buildModeQueue(pending, entries).length > 0) {
          setPendingSwitchPref(pending);
          openModeSwitch(pending, 'resume', entries);
        } else {
          setPendingSwitchPref(null);
          // Marca pendente sem fila = a troca terminou por outro caminho
          // (ex.: itens desfeitos um a um). Limpa para não perguntar à toa.
          if (pending) window.api.modeSetPrefs(device.serial, { pendingSwitch: null }).catch(() => {});
          // Ponte automática com contagem regressiva (10 s para cancelar) —
          // que também absorve reconexões rápidas de cabo com mau contato.
          if (prefs && prefs.autoTv) openModeSwitch('tv', 'auto', entries);
        }
      } catch { /* sem registro: começa do zero */ }
    })();
    return () => { cancelled = true; };
  }, [device?.serial]); // eslint-disable-line react-hooks/exhaustive-deps

  // Após reverter: atualiza a lista e destrava as tasks (voltam a poder
  // ser marcadas, pois foram desfeitas). Limpamos os 'completed' cujos itens
  // já não têm reversão pendente.
  const handleReverted = useCallback(async () => {
    try {
      const remaining = await window.api.revertList(device.serial);
      setRevertEntries(remaining);
      setRevertCount(remaining.length);
      const stillDone = new Set(remaining.map((e) => e.taskId));
      setCompleted((c) => {
        const next = {};
        for (const id of Object.keys(c)) if (stillDone.has(id)) next[id] = true;
        return next;
      });
      // Reflete no chip a troca pendente (gravada/limpa pelo diálogo da ponte).
      const prefs = await window.api.modeGetPrefs(device.serial).catch(() => ({}));
      setPendingSwitchPref((prefs && prefs.pendingSwitch) || null);
    } catch { /* mantém estado atual em caso de erro */ }
  }, [device]);

  // Reversão completa concluída = fim da sessão na interface: limpa o
  // histórico de execução, seleções e preferências — o programa volta ao
  // estado de primeiro uso. As travas (completed) são recalculadas pelo
  // handleReverted: itens que falharam ao reverter permanecem registrados
  // e seguem reversíveis na nova sessão.
  const handleSessionReset = useCallback(() => {
    setLog([]);
    setPercent(0);
    setCurrentLabel('');
    setSelected({});
    setAutoTvPref(false);
  }, []);

  // Reversão isolada de UMA alteração (lista na barra lateral esquerda).
  // Erros sobem para o TaskPanel exibir junto ao item.
  const revertOne = useCallback(async (taskId) => {
    if (!device) return;
    try {
      await window.api.revertOne(device.serial, taskId);
    } finally {
      await handleReverted();
    }
  }, [device, handleReverted]);

  // Itens com reversão registrada e ATIVA — são os que ganham o "Desfazer"
  // no resultado da execução (entradas dormentes já estão desfeitas).
  const undoableIds = useMemo(
    () => new Set(revertEntries.filter((e) => !e.dormant).map((e) => e.taskId)),
    [revertEntries]
  );

  // Desfazer direto do resultado (medida de segurança logo após aplicar):
  // reverte a peça, marca no log e destrava a task para remarcar.
  const undoLogItem = useCallback(async (taskId) => {
    if (!device) return;
    setLog((l) => l.map((e) => (e.id === taskId ? { ...e, status: 'undoing', detail: null } : e)));
    try {
      await window.api.revertOne(device.serial, taskId);
      setLog((l) => l.map((e) => (e.id === taskId
        ? { ...e, status: 'undone', detail: t('app.undone') } : e)));
    } catch (err) {
      setLog((l) => l.map((e) => (e.id === taskId
        ? { ...e, status: 'done', detail: t('app.undoFailed', { error: friendlyError(err) }) } : e)));
    } finally {
      await handleReverted();
    }
  }, [device, handleReverted]);

  // Quando o usuário tenta fechar a janela, o main avisa e mostramos o pop-up.
  // O ack diz ao main que o pop-up está visível — sem ele, o main fecharia
  // direto por segurança (rede contra renderer sem resposta).
  useEffect(() => {
    if (!window.api || !window.api.onShowClosePopup) return undefined;
    const unsubscribe = window.api.onShowClosePopup(() => {
      if (window.api.ackClosePopup) window.api.ackClosePopup();
      setClosePopup(true);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  // Fechar o guia de primeira configuração marca introSeen no aparelho: ele
  // só aparece sozinho na primeira configuração de cada celular.
  const closeFirstGuide = useCallback(() => {
    setFirstGuideOpen(false);
    if (device) window.api.modeSetPrefs(device.serial, { introSeen: true }).catch(() => {});
  }, [device]);

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

  // Núcleo da execução: recebe a fila explicitamente, para servir tanto ao
  // fluxo manual (checkboxes) quanto à configuração recomendada (1 clique).
  const runQueue = useCallback(async (queue) => {
    if (!device || queue.length === 0) return;
    setRunning(true);
    setPercent(0);
    setLog(queue.map((q) => ({ id: q.id, label: t(`tasks.${q.id}.label`), status: 'pending' })));

    for (let i = 0; i < queue.length; i++) {
      const task = queue[i];
      setCurrentLabel(t(`tasks.${task.id}.label`));
      setLog((l) => l.map((e) => e.id === task.id ? { ...e, status: 'running' } : e));
      try {
        const detail = await window.api.runTask(device.serial, task);
        setLog((l) => l.map((e) => e.id === task.id ? { ...e, status: 'done', detail } : e));
        setCompleted((c) => ({ ...c, [task.id]: true }));
      } catch (err) {
        const msg = friendlyError(err);
        let status = 'error';
        let detail = msg;
        if (msg.startsWith('VERIFICATION_FAILURE:')) {
          status = 'guide';
          detail = t('app.playProtectBlocked');
        } else if (msg.startsWith('ALREADY_INSTALLED:')) {
          status = 'warning';
          detail = t('app.signatureMismatch');
        }
        setLog((l) => l.map((e) => e.id === task.id ? { ...e, status, detail } : e));
      }
      setPercent(Math.round(((i + 1) / queue.length) * 100));
    }
    setRunning(false);
    setSelected({});
    refreshRevertState(); // novas reversões podem ter sido registradas
  }, [device, refreshRevertState]);

  // Fluxo manual: aplica o que está marcado nos checkboxes.
  const run = useCallback(() => {
    return runQueue(ALL_TASKS.filter((t) => selected[t.id]));
  }, [runQueue, selected]);

  // Configuração recomendada: o botão abre o diálogo da resolução da TV (que
  // também pergunta o tamanho da interface); com as respostas, monta o preset
  // curado + a resolução escolhida (pulando o que já foi concluído), reflete
  // nos checkboxes e executa direto. `density` substitui o dpi padrão da task
  // de resolução quando o usuário prefere a interface maior.
  const runRecommended = useCallback((resolutionTaskId, density) => {
    setTvResOpen(false);
    const ids = new Set(RECOMMENDED_TASK_IDS);
    if (resolutionTaskId) ids.add(resolutionTaskId);
    const queue = ALL_TASKS
      .filter((t) => ids.has(t.id) && !completed[t.id])
      .map((t) => (t.id === resolutionTaskId && density ? { ...t, density } : t));
    setSelected(Object.fromEntries(queue.map((t) => [t.id, true])));
    return runQueue(queue);
  }, [runQueue, completed]);

  // ---- Perfis nomeados de interface ----------------------------------------
  // Salva a interface ATUAL como um perfil: o main fotografa cada ajuste de
  // modo ativo direto do aparelho (mesmo snapshot da alternância de modos).
  // Quem decide o que é "de modo" é o catálogo, aqui — como na ponte.
  const saveProfile = useCallback(async (name) => {
    if (!device) throw new Error(t('app.needDeviceForProfile'));
    const items = revertEntries
      .filter((e) => !e.dormant && isModeTask(catalogById.get(e.taskId) || e.task))
      .map((e) => ({ taskId: e.taskId, fallbackTask: catalogById.get(e.taskId) || null }));
    const list = await window.api.profilesSave(device.serial, name, items);
    setProfiles(list);
    refreshRevertState(); // o snapshot pode ter atualizado o perfil vivo
  }, [device, revertEntries, catalogById, refreshRevertState]);

  // Aplica um perfil salvo pela MESMA esteira das execuções: progresso na
  // lateral direita, reversão registrada com merge (o estado original do
  // aparelho segue intacto) e entradas dormentes reativadas pelo addEntry.
  const applyProfile = useCallback(async (profile) => {
    if (!device || running) return;
    await runQueue(profile.tasks || []);
  }, [device, running, runQueue]);

  const deleteProfile = useCallback(async (profileId) => {
    if (!device) return;
    try { setProfiles(await window.api.profilesDelete(device.serial, profileId)); }
    catch { /* mantém a lista atual */ }
  }, [device]);

  // Ativa a conexão por Wi-Fi para o aparelho atual. Em sucesso, o usuário
  // pode desplugar o cabo — o polling continua encontrando o aparelho pelo
  // serial "ip:5555" e o registro de reversão não muda (serial estável).
  const enableWifi = useCallback(async () => {
    if (!device) return;
    setWifiStatus({ busy: true });
    try {
      const res = await window.api.enableWifi(device.serial);
      setWifiStatus({ ip: res.ip });
    } catch (e) {
      setWifiStatus({ error: friendlyError(e) });
    }
  }, [device]);

  // Abre a janela de espelhamento (scrcpy) do aparelho atual.
  const startMirror = useCallback(async () => {
    if (!device) return;
    setMirrorStatus({ busy: true });
    try {
      const res = await window.api.startMirror(
        device.serial,
        `${device.model || 'Celular'} — DexArmor`
      );
      setMirrorStatus(res.ok ? null : { error: res.error });
    } catch (e) {
      setMirrorStatus({ error: friendlyError(e) });
    }
  }, [device]);

  // Monta e salva o relatório de configuração (texto) da última execução.
  const saveReport = useCallback(async () => {
    const statusLabel = {
      done: t('app.reportDone'), error: t('app.reportError'),
      warning: t('app.reportWarning'), guide: t('app.reportWarning'),
      pending: t('app.reportPending'), running: t('app.reportRunning'),
    };
    const lines = [
      t('app.reportTitle'),
      t('app.reportDevice', { model: device?.model || t('app.unknownModel'), serial: device?.serial || '-' }),
      t('app.reportAndroidDate', {
        android: device?.android || '-',
        date: new Date().toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US'),
      }),
      '',
      ...log.map((e) => `[${statusLabel[e.status] || e.status}] ${e.label}${e.detail ? ` — ${e.detail}` : ''}`),
    ];
    try { await window.api.saveReport(lines.join('\n')); } catch { /* usuário cancelou */ }
  }, [device, log, t, language]);

  const ready = Object.values(selected).some(Boolean);

  // Estado do modo para o chip do painel central: troca incompleta tem
  // prioridade (é a situação que pede ação); depois, TV ativo ou celular.
  const modeState = useMemo(() => {
    if (!device) return null;
    if (pendingSwitchPref && buildModeQueue(pendingSwitchPref, revertEntries).length > 0) {
      return { kind: 'pending', direction: pendingSwitchPref };
    }
    if (modeInfo.active > 0) return { kind: 'tv' };
    if (modeInfo.dormant > 0) return { kind: 'phone' };
    return null;
  }, [device, pendingSwitchPref, revertEntries, modeInfo, buildModeQueue]);

  const resumePending = useCallback(() => {
    if (modeState?.kind === 'pending') openModeSwitch(modeState.direction, 'resume');
  }, [modeState, openModeSwitch]);

  // Diário de trocas do aparelho atual (a seção Manutenção lista ao expandir).
  const loadJournal = useCallback(
    () => (device ? window.api.modeJournalList(device.serial) : Promise.resolve([])),
    [device]
  );

  // Decide o que a tela do celular mostra.
  // Com ajustes de MODO ativos (e fora de execução), o aparelho "vira TV":
  // gira para horizontal e cresce. No modo celular (tudo adormecido) ou com
  // só mudanças estruturais, volta ao visual de celular. Rodando: 'working'.
  const phase = running ? 'working'
    : modeInfo.active > 0 && device ? 'tv'
    : device ? 'success'
    : cablePresent ? 'waiting'
    : 'tutorial';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
        {/* Coluna esquerda: o painel rola dentro do espaço que sobra e a aba
            "Contribua com o projeto" fica ancorada no rodapé — o canto
            inferior esquerdo da janela, sempre visível, sem cobrir nada. */}
        <Paper square sx={{
          borderRight: '1px solid', borderColor: 'divider', borderRadius: 0,
          width: SIDE_W, flexShrink: 0, minHeight: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <TaskPanel
              selected={selected} completed={completed} onToggle={toggle} disabled={running}
              view={leftView} onViewChange={setLeftView}
              onOpenDexGuide={() => setDexGuide(true)}
              onOpenFirstGuide={() => setFirstGuideOpen(true)}
              onOpenSideloadGuide={() => setSideloadGuideOpen(true)}
              canReset={revertCount > 0} onOpenReset={() => setResetOpen(true)}
              onOpenCheckup={() => setCheckupOpen(true)}
              modeInfo={modeInfo} onOpenModeSwitch={openModeSwitch}
              onOpenInterfaceReset={openInterfaceReset}
              hasDevice={!!device} running={running}
              mirrorStatus={mirrorStatus} onStartMirror={startMirror}
              wifiStatus={wifiStatus} onEnableWifi={enableWifi}
              isWifi={!!device?.serial?.includes(':')}
              revertEntries={revertEntries} onRevertOne={revertOne}
              onLoadJournal={loadJournal}
              profiles={profiles} canSaveProfile={modeInfo.active > 0}
              onSaveProfile={saveProfile} onApplyProfile={applyProfile}
              onDeleteProfile={deleteProfile}
            />
          </Box>
          <LanguageTab />
          <ContributeTab onClick={() => setContributeOpen(true)} />
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <DevicePanel
            device={device} phase={phase} scanning={scanning} onRefresh={scan}
            onRun={run} onRunRecommended={() => setTvResOpen(true)} running={running} ready={ready}
            percent={percent} currentLabel={currentLabel}
            showAccessories={leftView === 'accessories'}
            devices={onlineDevices} onPickDevice={setPreferredSerial}
            modeState={modeState} onResumePending={resumePending}
          />
        </Box>

        {/* Lateral direita: a Central de Controle (pit wall) — telemetria,
            pit stop de limpeza e progresso em três seções uniformes. Mesma
            largura da lateral esquerda: o centro fica sempre centrado. */}
        <Paper square sx={{
          borderLeft: '1px solid', borderColor: 'divider', borderRadius: 0,
          width: SIDE_W, flexShrink: 0, minHeight: 0,
        }}>
          <ControlCenter
            serial={device?.serial}
            healthActive={!!device && !running}
            refreshKey={healthTick}
            cleanDisabled={!device || running}
            onCleaned={() => setHealthTick((t) => t + 1)}
            log={log} percent={percent}
            progressActive={running || log.length > 0}
            onSaveReport={!running && log.length > 0 ? saveReport : null}
            progressFinished={!running && log.length > 0}
            undoableIds={undoableIds}
            onUndoItem={!running && device ? undoLogItem : null}
          />
        </Paper>
      </Box>

      {/* Controle remoto virtual: encaixado rente à borda esquerda da Central
          de Controle, alinhado à seção de progresso/log — nunca por cima dela,
          para não esconder as configurações em andamento. O "Girar tela"
          registra reversão/perfil no main; o App relê o registro ao girar. */}
      <RemoteControl serial={device?.serial} disabled={running} dockRight={SIDE_W}
        onRotated={refreshRevertState} />

      {/* Pop-up de fechamento que apresenta os acessórios. */}
      <CloseDialog
        open={closePopup}
        onSeeAccessories={handleSeeAccessories}
        onConfirmClose={handleConfirmClose}
      />

      {/* Etapa DeX vs Experiência de TV. */}
      <DexGuideDialog open={dexGuide} onClose={() => setDexGuide(false)} />

      {/* Guia de primeira configuração (uma vez por aparelho). */}
      <FirstSetupGuideDialog open={firstGuideOpen} onClose={closeFirstGuide} />

      {/* Como instalar apps e enviar arquivos — o aviso que ocupa o lugar do
          antigo catálogo de APKs. */}
      <SideloadGuideDialog open={sideloadGuideOpen} onClose={() => setSideloadGuideOpen(false)} />

      {/* Contribua com o projeto: QR codes e o convite, centralizado. */}
      <ContributeDialog open={contributeOpen} onClose={() => setContributeOpen(false)} />

      {/* Reversão de alterações. Ao concluir, encerra a sessão (histórico e
          preferências limpos — recomeço do zero). */}
      <ResetDialog
        open={resetOpen} serial={device?.serial}
        onClose={() => setResetOpen(false)}
        onReverted={handleReverted}
        onSessionReset={handleSessionReset}
        onInterfaceReset={modeInfo.active + modeInfo.dormant > 0 ? openInterfaceReset : null}
      />

      {/* Check-up: verifica se os ajustes aplicados continuam valendo. */}
      <CheckupDialog
        open={checkupOpen} serial={device?.serial}
        onClose={() => { setCheckupOpen(false); refreshRevertState(); }}
      />

      {/* Alternância de modos: a ponte celular ⇄ TV, em segundos — com
          pré-checagem, pausa-e-pergunta em obstáculos e conferência final. */}
      <ModeSwitchDialog
        open={!!modeDialog}
        serial={modeDialog?.serial}
        direction={modeDialog?.direction}
        queue={modeDialog?.queue || []}
        variant={modeDialog?.variant || 'manual'}
        deviceConnected={!!device}
        launcherInstallTask={launcherInstallTask}
        autoTvPref={autoTvPref}
        onToggleAutoTv={toggleAutoTv}
        onClose={() => setModeDialog(null)}
        onDone={handleReverted}
      />

      {/* Resolução da TV — etapa da Configuração Recomendada. */}
      <TvResolutionDialog
        open={tvResOpen}
        onClose={() => setTvResOpen(false)}
        onChoose={runRecommended}
      />

      {/* Enviar para o celular: overlay global de arrastar-e-soltar. */}
      <SendOverlay serial={device?.serial} />
    </ThemeProvider>
  );
}
