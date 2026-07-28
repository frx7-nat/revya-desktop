// src/renderer/main.jsx
// Ponto de entrada do renderer. O Vite resolve este arquivo (referenciado em
// index.html) e gera o bundle do React.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root';
import { LanguageProvider } from './i18n';

// O provider de idioma envolve TUDO, inclusive a tela-gate "Conecte seu
// Galaxy": ela é a primeira coisa que o usuário vê, e sair traduzida a partir
// da segunda tela seria pior do que não traduzir.
createRoot(document.getElementById('root')).render(
  <LanguageProvider>
    <Root />
  </LanguageProvider>,
);
