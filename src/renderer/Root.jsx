// src/renderer/Root.jsx
// Gate de entrada: mostra a tela "Conecte seu Galaxy" (com detecção e
// recuperação automática do ADB) até que um aparelho fique pronto e o usuário
// confirme. Só então renderiza o App de 3 colunas (provisionamento).
//
// O App traz o próprio ThemeProvider; aqui envolvemos apenas a tela-gate.

import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme/theme';
import ConnectPhoneScreen from './screens/ConnectPhoneScreen';
import App from './App';

export default function Root() {
  const [ready, setReady] = useState(false);

  // Na tela-gate não existe pop-up de fechamento: quando o main intercepta o
  // X e avisa o renderer, confirmamos o fechamento na hora. Sem isto, o clique
  // no X não teria resposta antes da conexão (quem escuta o aviso é o App).
  useEffect(() => {
    if (ready) return undefined;
    if (!window.api || !window.api.onShowClosePopup) return undefined;
    const unsubscribe = window.api.onShowClosePopup(() => {
      window.api.confirmClose();
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [ready]);

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
