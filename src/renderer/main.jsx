// src/renderer/main.jsx
// Ponto de entrada do renderer. O Vite resolve este arquivo (referenciado em
// index.html) e gera o bundle do React.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root';

createRoot(document.getElementById('root')).render(<Root />);
