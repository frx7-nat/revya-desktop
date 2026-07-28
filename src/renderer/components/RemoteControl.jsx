// src/renderer/components/RemoteControl.jsx
// Controle remoto virtual: o computador vira o controle do "TV-celular".
// Cada botão envia uma tecla via ADB (input keyevent) — funciona por USB e
// por Wi-Fi, e dispensa pegar o celular na mão (casa com o espelhamento).
//
// Fica encaixado ("plugado") rente à borda esquerda da Central de Controle,
// alinhado à seção de progresso/log — ao lado dela, nunca por cima, para não
// esconder as configurações em andamento. Grade estilo calculadora. Em
// repouso a caixa quase some (opacidade 35%); quando o mouse passa por cima —
// ou um botão recebe foco pelo teclado — ela aparece por inteiro.
//
// Só aparece com aparelho conectado; durante uma execução os botões
// desabilitam (uma tecla no meio de uma instalação atrapalharia a task).

import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Tooltip, Stack, CircularProgress } from '@mui/material';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ScreenRotationIcon from '@mui/icons-material/ScreenRotation';
import { useT } from '../i18n';

// Um botão da grade. O <span> em volta existe porque Tooltip precisa de um
// filho que aceite eventos mesmo com o Button desabilitado.
function Key({ title, onPress, disabled, wide, primary, children }) {
  return (
    <Tooltip title={title} placement="top" enterDelay={350}>
      <span style={{ gridColumn: wide ? 'span 3' : 'auto', display: 'flex' }}>
        <Button
          variant={primary ? 'contained' : 'outlined'}
          color={primary ? 'primary' : 'inherit'}
          onClick={onPress}
          disabled={disabled}
          sx={{
            // Canto reto: teclas quadradas de calculadora (design BMW M —
            // "sharp rectangles read as engineered precision").
            minWidth: 0, flex: 1, height: 40, p: 0, borderRadius: 0,
            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
            ...(primary ? {} : { borderColor: '#3c3c3c', color: 'text.primary' }),
          }}
        >
          {children}
        </Button>
      </span>
    </Tooltip>
  );
}

// `dockRight` é a largura da lateral direita (Central de Controle): o controle
// se posiciona exatamente à esquerda dela, colado na divisa com a coluna do log.
export default function RemoteControl({ serial, disabled, dockRight, onRotated }) {
  const { t } = useT();
  // Giro em andamento: evita giros sobrepostos (cada um lê a rotação atual
  // antes de escrever — dois ao mesmo tempo poderiam pular uma posição).
  const [rotating, setRotating] = useState(false);

  // Dispara e segue: um erro de tecla não merece pop-up — o próprio resultado
  // (nada aconteceu na TV) já comunica, e o log do aparelho não é afetado.
  const press = (keyName) => () => {
    if (!serial) return;
    window.api.sendRemoteKey(serial, keyName).catch(() => { /* silencioso */ });
  };

  // Girar tela: um quarto de volta por clique, quantas vezes for preciso —
  // é a saída imediata quando a rotação aplicada deixou a tela na posição
  // errada. A posição que funcionar fica salva no perfil TV do aparelho.
  const rotate = async () => {
    if (!serial || rotating) return;
    setRotating(true);
    try {
      await window.api.rotateScreen(serial);
      onRotated && onRotated(); // o App relê o registro (nova entrada/perfil)
    } catch { /* silencioso, como as demais teclas — a tela mostra o resultado */ }
    finally { setRotating(false); }
  };

  if (!serial) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed', right: dockRight ?? 18, bottom: 0, zIndex: 1200,
        width: 168, p: 1.2, borderRadius: 0, // canto reto (design BMW M)
        border: '1px solid #3c3c3c',
        background: 'linear-gradient(160deg, #1a1a1a 0%, #0d0d0d 80%)',
        // O truque do "controle largado no canto": quase invisível em repouso,
        // inteiro ao passar o mouse ou navegar por teclado até ele.
        opacity: 0.35,
        transition: 'opacity 0.25s ease',
        '&:hover, &:focus-within': { opacity: 1 },
      }}
    >
      <Stack direction="row" spacing={0.6} alignItems="center" justifyContent="center" sx={{ mb: 0.8 }}>
        <SettingsRemoteIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.66rem', letterSpacing: '0.04em' }}>
          CONTROLE REMOTO
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.6 }}>
        <Key title={t('remote.back')} onPress={press('back')} disabled={disabled}>
          <ArrowBackIcon sx={{ fontSize: 18 }} />
        </Key>
        <Key title={t('remote.up')} onPress={press('up')} disabled={disabled}>
          <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
        </Key>
        <Key title={t('remote.home')} onPress={press('home')} disabled={disabled}>
          <HomeIcon sx={{ fontSize: 18 }} />
        </Key>

        <Key title={t('remote.left')} onPress={press('left')} disabled={disabled}>
          <KeyboardArrowLeftIcon sx={{ fontSize: 20 }} />
        </Key>
        <Key title={t('remote.ok')} onPress={press('ok')} disabled={disabled} primary>
          OK
        </Key>
        <Key title={t('remote.right')} onPress={press('right')} disabled={disabled}>
          <KeyboardArrowRightIcon sx={{ fontSize: 20 }} />
        </Key>

        <Key title={t('remote.volDown')} onPress={press('vol_down')} disabled={disabled}>
          <VolumeDownIcon sx={{ fontSize: 18 }} />
        </Key>
        <Key title={t('remote.down')} onPress={press('down')} disabled={disabled}>
          <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />
        </Key>
        <Key title={t('remote.volUp')} onPress={press('vol_up')} disabled={disabled}>
          <VolumeUpIcon sx={{ fontSize: 18 }} />
        </Key>

        <Key title={t('remote.playPause')} onPress={press('play_pause')} disabled={disabled} wide>
          <PlayArrowIcon sx={{ fontSize: 18, mr: -0.4 }} />
          <PauseIcon sx={{ fontSize: 16 }} />
        </Key>

        <Key
          title={t('remote.rotateHelp')}
          onPress={rotate} disabled={disabled || rotating} wide
        >
          {rotating
            ? <CircularProgress size={14} color="inherit" />
            : <>
                <ScreenRotationIcon sx={{ fontSize: 15, mr: 0.6 }} />{t('remote.rotate')}</>}
        </Key>
      </Box>
    </Paper>
  );
}
