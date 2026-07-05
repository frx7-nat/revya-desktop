// src/renderer/theme/theme.js
// Tema MUI customizado. Direção: console de provisionamento técnico
// encontrando interface de TV. Fundo grafite profundo, um único acento
// âmbar-elétrico (evoca o "power on" de aparelhos e o brilho de tela CRT),
// tipografia geométrica para títulos e mono para dados do dispositivo.

import { createTheme } from '@mui/material/styles';

const AMBER = '#FFB94A';   // acento único — usado com parcimônia
const SIGNAL = '#3DDC97';  // verde de status "ok"
const DANGER = '#FF5D5D';  // erros e remoções

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: AMBER, contrastText: '#1A1712' },
    success: { main: SIGNAL },
    error: { main: DANGER },
    background: {
      default: '#141318',  // grafite quase preto
      paper: '#1C1B22',
    },
    divider: 'rgba(255,255,255,0.07)',
    text: { primary: '#ECE9E3', secondary: '#9A968E' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.72rem' },
    // Classe utilitária para dados do aparelho (serial, modelo).
    overline: { fontFamily: '"JetBrains Mono", "Consolas", monospace', letterSpacing: '0.04em' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.06)' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
  },
});
