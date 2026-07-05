// src/renderer/Root.jsx
// Gate de entrada: mostra a tela "Conecte seu Galaxy" (com detecção e
// recuperação automática do ADB) até que um aparelho fique pronto e o usuário
// confirme. Só então renderiza o App de 3 colunas (provisionamento).
//
// O App traz o próprio ThemeProvider; aqui envolvemos apenas a tela-gate.

import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme/theme';
import ConnectPhoneScreen from './screens/ConnectPhoneScreen';
import App from './App';

export default function Root() {
  const [ready, setReady] = useState(false);

  if (ready) return <App />;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', bgcolor: 'background.default' }}>
        <ConnectPhoneScreen onReady={() => setReady(true)} />
      </Box>
    </ThemeProvider>
  );
}
