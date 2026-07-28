// src/renderer/components/SendOverlay.jsx
// "Enviar para o celular": overlay global de arrastar-e-soltar.
//
// Como funciona: ao arrastar qualquer arquivo para a janela do DexArmor (em
// qualquer aba), a janela inteira vira uma área de destino com alvos claros:
//   - "Instalar no celular"  -> .apk/.apkm/.xapk (instala direto via ADB)
//   - Downloads / Filmes / Músicas / ROMs -> pastas fixas do armazenamento
// O usuário solta o arquivo DIRETO no alvo desejado — o destino é escolhido
// no próprio gesto, sem diálogos depois. Vários arquivos são processados em
// sequência, com progresso em tempo real (adb push emite percentual).
//
// Sem aparelho conectado, o overlay aparece mas explica que é preciso
// conectar primeiro (não aceita solturas).

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, LinearProgress, Button, Stack, Fade } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import DownloadIcon from '@mui/icons-material/Download';
import MovieIcon from '@mui/icons-material/Movie';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BlockIcon from '@mui/icons-material/Block';
import StorageIcon from '@mui/icons-material/Storage';
import { friendlySendError } from '../utils/errors';
import { useT } from '../i18n';
import RichText from '../i18n/RichText';

// Alvos de pastas (as chaves batem com SEND_DESTINATIONS no processo main).
// Só ícone e CHAVE — o texto vem do catálogo na hora de desenhar. O `key`
// bate com SEND_DESTINATIONS no main, e o rótulo da pasta é o mesmo dos dois
// lados (`dest.*`), por isso não está duplicado aqui.
const FOLDER_TARGETS = [
  { key: 'download', icon: DownloadIcon },
  { key: 'movies', icon: MovieIcon },
  { key: 'music', icon: MusicNoteIcon },
  { key: 'roms', icon: SportsEsportsIcon },
];

// Formatos que o alvo de instalação aceita: o .apk simples e os pacotes de
// várias partes (.apkm/.xapk), que o main extrai e instala com install-multiple.
const isApk = (name) => /\.(apk|apkm|xapk)$/i.test(name || '');

// Tamanho legível (para a mensagem de transferência).
const formatBytes = (n) => {
  if (!n || n <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

// Tempo decorrido legível ("12s", "1min 5s").
const formatElapsed = (s) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}min ${r}s` : `${m}min`;
};

export default function SendOverlay({ serial }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [hoverTarget, setHoverTarget] = useState(null);
  // transfer: null | { mode:'busy'|'done', kind:'file'|'apk', items:[{name,status,detail}],
  //                    current, percent, totalBytes, transferredBytes, startedAt }
  const [transfer, setTransfer] = useState(null);
  const [now, setNow] = useState(0); // "relógio" para o tempo decorrido
  const dragDepth = useRef(0);
  // Ref para o laço ler o valor mais atual; estado só para o botão re-renderizar.
  const cancelRef = useRef(false); // usuário pediu para cancelar o envio
  const [cancelling, setCancelling] = useState(false);
  const lastSendRef = useRef(null); // { files, targetKey } do último envio (p/ retry)

  // Cancela o envio em andamento: avisa o main (mata o adb push/install) e
  // sinaliza a fila para não iniciar os próximos arquivos.
  const requestCancel = () => {
    cancelRef.current = true;
    setCancelling(true);
    try { window.api.cancelSend?.(); } catch { /* segue: a fila para mesmo assim */ }
  };

  // Progresso vindo do main. percent -1 (ou sem crescimento) = indeterminado;
  // totalBytes/transferredBytes alimentam a mensagem de "transferindo…".
  useEffect(() => {
    if (window.api?.onSendProgress) {
      window.api.onSendProgress(({ percent, totalBytes, transferredBytes }) => {
        setTransfer((t) => (t && t.mode === 'busy'
          ? { ...t, percent, totalBytes: totalBytes || t.totalBytes, transferredBytes }
          : t));
      });
    }
  }, []);

  // Enquanto transfere, um tick de 1s mantém o tempo decorrido vivo na tela —
  // é o que garante que o usuário nunca ache que o programa travou.
  useEffect(() => {
    if (transfer?.mode !== 'busy') return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [transfer?.mode, transfer?.current]);

  // Listeners GLOBAIS de drag na janela: o overlay abre ao arrastar arquivos
  // para qualquer ponto do app. O contador de profundidade evita fechar o
  // overlay quando o cursor passa sobre elementos filhos.
  useEffect(() => {
    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
    const onEnter = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setOpen(true);
    };
    const onOver = (e) => { if (hasFiles(e)) e.preventDefault(); };
    const onLeave = (e) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setTransfer((t) => (t ? t : (setOpen(false), null)));
    };
    const onDrop = (e) => {
      // Soltar fora de um alvo: cancela (os alvos fazem stopPropagation).
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setTransfer((t) => (t ? t : (setOpen(false), null)));
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // Núcleo do envio: processa uma lista de arquivos para um alvo, com checagem
  // de espaço, progresso, cancelamento e erros amigáveis. Reaproveitado tanto
  // pelo arrastar-e-soltar quanto pelo "Tentar de novo".
  const runSend = useCallback(async (files, targetKey) => {
    if (!serial || !files.length) return;

    cancelRef.current = false;
    setCancelling(false);
    const items = files.map((f) => ({ name: f.name, status: 'pending', detail: '' }));
    const kind = targetKey === 'apk' ? 'apk' : 'file';

    // Enquanto conferimos o espaço, já mostramos a lista (estado "checking").
    setTransfer({
      mode: 'checking', kind, items, current: 0, percent: 0,
      totalBytes: 0, transferredBytes: 0, startedAt: Date.now(),
    });

    // Checa espaço ANTES de começar: se os arquivos não couberem, avisa em vez
    // de falhar no meio com erro cru. Se não der para medir, segue em frente.
    const neededBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    try {
      const info = await window.api.getSendFreeSpace?.(serial);
      const freeBytes = info?.freeBytes;
      if (typeof freeBytes === 'number' && neededBytes > 0 && neededBytes > freeBytes) {
        setTransfer({ mode: 'nospace', kind, neededBytes, freeBytes });
        return;
      }
    } catch { /* sem medição de espaço: segue e deixa o envio decidir */ }

    setTransfer((t) => (t ? { ...t, mode: 'busy' } : t));

    for (let i = 0; i < files.length; i++) {
      if (cancelRef.current) break;
      const file = files[i];
      // Traduz ANTES de entrar nos atualizadores de estado: lá dentro o
      // parâmetro `t` é o objeto de transferência e sombreia o `t` da
      // tradução. Chamar `t('...')` ali dava TypeError em tempo de execução,
      // sem erro nenhum no build.
      const cancelledLabel = t('sendOverlay.cancelled');
      setTransfer((t) => ({
        ...t, current: i, percent: 0, totalBytes: 0, transferredBytes: 0, startedAt: Date.now(),
      }));
      const mark = (status, detail) => setTransfer((t) => ({
        ...t,
        items: t.items.map((it, idx) => (idx === i ? { ...it, status, detail } : it)),
      }));
      try {
        const localPath = window.api.getFilePath(file);
        if (!localPath) throw new Error(t('sendOverlay.noPath'));
        if (targetKey === 'apk') {
          if (!isApk(file.name)) {
            throw new Error(t('sendOverlay.apkOnly'));
          }
          const r = await window.api.sendApk(serial, localPath);
          if (r?.cancelled) { mark('cancelled', cancelledLabel); break; }
          mark('done', t('sendOverlay.installed'));
        } else {
          const r = await window.api.sendFile(serial, localPath, targetKey);
          if (r?.cancelled) { mark('cancelled', cancelledLabel); break; }
          mark('done', t('sendOverlay.sent'));
        }
      } catch (err) {
        // Cancelamento do usuário não é erro: marca como cancelado e para a fila.
        if (cancelRef.current || /CANCELLED/i.test(String(err?.message || err))) {
          mark('cancelled', cancelledLabel);
          break;
        }
        mark('error', friendlySendError(err));
      }
    }

    // Ao cancelar, os arquivos que nem começaram ficam marcados como cancelados.
    if (cancelRef.current) {
      setTransfer((t) => (t ? {
        ...t,
        items: t.items.map((it) => (it.status === 'pending'
          ? { ...it, status: 'cancelled', detail: cancelledLabel } : it)),
      } : t));
    }

    setTransfer((t) => (t ? { ...t, mode: 'done' } : t));
  }, [serial, t]);

  // Processa a fila de arquivos soltos num alvo ('apk' ou chave de pasta).
  // Guarda a lista para permitir "Tentar de novo" sem arrastar outra vez.
  const handleDrop = useCallback(async (e, targetKey) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setHoverTarget(null);
    if (!serial) return; // sem aparelho: overlay é só informativo

    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) { setOpen(false); return; }

    lastSendRef.current = { files, targetKey };
    await runSend(files, targetKey);
  }, [serial, runSend]);

  // Reenvia apenas os itens que não foram concluídos (falha ou cancelados),
  // reaproveitando os mesmos arquivos do último envio (alinhados por índice).
  const retryFailed = useCallback(() => {
    const last = lastSendRef.current;
    if (!last || !transfer?.items) return;
    const pendingFiles = transfer.items
      .map((it, idx) => (it.status === 'error' || it.status === 'cancelled' ? last.files[idx] : null))
      .filter(Boolean);
    if (!pendingFiles.length) return;
    lastSendRef.current = { files: pendingFiles, targetKey: last.targetKey };
    runSend(pendingFiles, last.targetKey);
  }, [transfer, runSend]);

  // Fecha sozinho após sucesso total (com falhas, espera o usuário ler).
  useEffect(() => {
    if (transfer?.mode === 'done' && transfer.items.every((i) => i.status === 'done')) {
      const id = setTimeout(() => { setTransfer(null); setOpen(false); }, 1600);
      return () => clearTimeout(id);
    }
  }, [transfer]);

  const closeAll = () => { setTransfer(null); setOpen(false); };

  if (!open) return null;

  // --- Estado visual da transferência em andamento ---------------------------
  // apkMode: instalação de APK (o adb não dá percentual → sempre indeterminado).
  // hasReal: chegou um percentual real e crescente (barra determinada).
  // Sem percentual real, mostramos barra animada + mensagem com tempo decorrido
  // para o usuário nunca achar que travou, principalmente em arquivos grandes.
  const busy = transfer?.mode === 'busy';
  const apkMode = transfer?.kind === 'apk';
  const hasReal = busy && !apkMode && typeof transfer.percent === 'number' && transfer.percent > 0;
  const indeterminate = apkMode || !hasReal;
  const elapsedSec = busy && transfer.startedAt
    ? Math.max(0, Math.floor((now - transfer.startedAt) / 1000))
    : 0;
  const sizeLabel = formatBytes(transfer?.totalBytes);
  const anyCancelled = !!transfer?.items?.some((i) => i.status === 'cancelled');
  const anyError = !!transfer?.items?.some((i) => i.status === 'error');
  const allDone = !!transfer?.items?.length && transfer.items.every((i) => i.status === 'done');
  // Quantos itens dá para reenviar (falha ou cancelados) — habilita o retry.
  const retryCount = transfer?.items?.filter((i) => i.status === 'error' || i.status === 'cancelled').length || 0;

  const targetSx = (key, accent) => ({
    flex: 1, minWidth: 150, p: 2.2, borderRadius: 3, textAlign: 'center',
    cursor: 'copy', transition: 'all .15s ease',
    bgcolor: hoverTarget === key ? 'rgba(255,185,74,0.14)' : (accent ? 'rgba(255,185,74,0.07)' : 'rgba(255,255,255,0.03)'),
    border: `1.5px dashed ${hoverTarget === key ? '#EF9F27' : (accent ? 'rgba(255,185,74,0.4)' : 'rgba(255,255,255,0.14)')}`,
    transform: hoverTarget === key ? 'scale(1.03)' : 'scale(1)',
  });

  return (
    <Fade in={open}>
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 2000,
        bgcolor: 'rgba(10,10,14,0.93)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4,
      }}>
        {/* Estado 1: sem aparelho conectado */}
        {!serial && !transfer && (
          <Box sx={{ textAlign: 'center', maxWidth: 380 }}>
            <UploadFileIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 1 }}>
              {t('sendOverlay.connectFirst.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {t('sendOverlay.connectFirst.body')}
            </Typography>
          </Box>
        )}

        {/* Estado 2: alvos de soltura */}
        {serial && !transfer && (
          <Box sx={{ width: '100%', maxWidth: 680 }}>
            <Typography variant="h6" sx={{ textAlign: 'center', fontSize: '1.1rem', mb: 0.5 }}>
              {t('sendOverlay.drop.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.82rem', mb: 3 }}>
              {t('sendOverlay.drop.body')}
            </Typography>

            {/* Alvo de APK, em destaque */}
            <Box
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setHoverTarget('apk'); }}
              onDragLeave={() => setHoverTarget((h) => (h === 'apk' ? null : h))}
              onDrop={(e) => handleDrop(e, 'apk')}
              sx={{ ...targetSx('apk', true), mb: 2, py: 2.6 }}
            >
              <AndroidIcon sx={{ fontSize: 34, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'primary.main' }}>
                {t('sendOverlay.drop.apkTitle')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
                {t('sendOverlay.drop.apkBody')}
              </Typography>
            </Box>

            {/* Alvos de pastas */}
            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
              {FOLDER_TARGETS.map(({ key, icon: Icon }) => (
                <Box
                  key={key}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setHoverTarget(key); }}
                  onDragLeave={() => setHoverTarget((h) => (h === key ? null : h))}
                  onDrop={(e) => handleDrop(e, key)}
                  sx={targetSx(key, false)}
                >
                  <Icon sx={{ fontSize: 26, color: 'text.secondary', mb: 0.5 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{t(`dest.${key}`)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{t(`sendOverlay.hint.${key}`)}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Estado 3a: espaço insuficiente no celular (checado antes de enviar) */}
        {transfer && transfer.mode === 'nospace' && (
          <Box sx={{ width: '100%', maxWidth: 420, bgcolor: 'rgba(22,21,27,0.95)', border: '1px solid rgba(255,185,74,0.2)', borderRadius: 3, p: 3, textAlign: 'center' }}>
            <StorageIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {t('sendOverlay.noSpace.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.83rem', mb: 2.5 }}>
              {/* Frase INTEIRA no catálogo; o RichText devolve o negrito nos
                  lugares dos placeholders. Ver src/renderer/i18n/RichText.jsx. */}
              <RichText
                text={t(transfer.kind === 'apk' ? 'sendOverlay.noSpace.apk' : 'sendOverlay.noSpace.files')}
                values={{
                  needed: formatBytes(transfer.neededBytes),
                  free: formatBytes(transfer.freeBytes),
                  cleanup: t('sendOverlay.noSpace.cleanup'),
                }}
              />
            </Typography>
            <Button fullWidth variant="contained" color="primary" onClick={closeAll}>
              {t('sendOverlay.noSpace.ok')}
            </Button>
          </Box>
        )}

        {/* Estado 3b: preparando / transferindo / concluído / cancelado */}
        {transfer && transfer.mode !== 'nospace' && (
          <Box sx={{ width: '100%', maxWidth: 460, bgcolor: 'rgba(22,21,27,0.95)', border: '1px solid rgba(255,185,74,0.2)', borderRadius: 3, p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 2 }}>
              {transfer.mode === 'checking' && t('sendOverlay.preparing')}
              {transfer.mode === 'busy' && t('sendOverlay.sending', { current: transfer.current + 1, total: transfer.items.length })}
              {transfer.mode === 'done' && (
                allDone ? t('sendOverlay.doneAll')
                  : anyError ? t('sendOverlay.doneError')
                    : t('sendOverlay.doneCancelled')
              )}
            </Typography>

            {transfer.mode === 'checking' && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="indeterminate" color="primary" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8, fontSize: '0.72rem' }}>
                  {t('sendOverlay.checkingSpace')}
                </Typography>
              </Box>
            )}

            {transfer.mode === 'busy' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontSize: '0.83rem', mb: 1 }} noWrap>
                  {transfer.items[transfer.current]?.name}
                </Typography>
                <LinearProgress
                  variant={indeterminate ? 'indeterminate' : 'determinate'}
                  value={indeterminate ? undefined : transfer.percent}
                  color="primary"
                />
                {/* Mensagem viva: percentual real quando há; senão, "transferindo…"
                    com o tempo decorrido, para não parecer que travou. */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.8, fontSize: '0.72rem', lineHeight: 1.4 }}
                >
                  {apkMode
                    ? t('sendOverlay.installingApk')
                    : hasReal
                      ? t('sendOverlay.sentPercent', {
                        percent: Math.round(transfer.percent),
                        size: sizeLabel ? t('sendOverlay.sentOf', { size: sizeLabel }) : '',
                      })
                      : t('sendOverlay.transferring', {
                        size: sizeLabel ? ` ${sizeLabel}` : '',
                        elapsed: formatElapsed(elapsedSec),
                      })}
                </Typography>
              </Box>
            )}

            <Stack spacing={0.8} sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {transfer.items.map((it, idx) => (
                <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                  {it.status === 'done' && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mt: 0.2 }} />}
                  {it.status === 'error' && <ErrorOutlineIcon sx={{ fontSize: 16, color: 'error.main', mt: 0.2 }} />}
                  {it.status === 'cancelled' && <BlockIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.2 }} />}
                  {it.status === 'pending' && <Box sx={{ width: 16 }} />}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }} noWrap>{it.name}</Typography>
                    {it.detail && (
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', color: it.status === 'error' ? 'error.main' : 'text.secondary' }}>
                        {it.detail}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ))}
            </Stack>

            {/* Cancelar durante o envio (some assim que o pedido é enviado). */}
            {transfer.mode === 'busy' && (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={requestCancel}
                disabled={cancelling}
                sx={{ mt: 2.5, borderColor: 'rgba(255,255,255,0.2)' }}
              >
                {cancelling ? t('sendOverlay.cancelling') : t('sendOverlay.cancel')}
              </Button>
            )}

            {transfer.mode === 'done' && (retryCount > 0 && serial ? (
              <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
                <Button fullWidth variant="contained" color="primary" onClick={retryFailed}>
                  {retryCount > 1 ? t('sendOverlay.retryN', { n: retryCount }) : t('sendOverlay.retry')}
                </Button>
                <Button variant="text" color="inherit" onClick={closeAll} sx={{ minWidth: 92 }}>
                  {t('sendOverlay.close')}
                </Button>
              </Stack>
            ) : (
              <Button fullWidth variant="contained" color="primary" onClick={closeAll} sx={{ mt: 2.5 }}>
                {t('sendOverlay.close')}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    </Fade>
  );
}
