// vite.config.mjs
// Build do renderer (React + MUI). O main e o preload do Electron NÃO passam
// pelo Vite — são Node puro e o electron-builder os empacota direto de src/.
//
// Pontos de atenção para Electron:
//   - base: './'  -> caminhos relativos, para o app abrir via file:// em produção.
//   - root aponta para src/renderer, onde está o index.html.
//   - outDir joga o build em dist/renderer (fora de src).

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname não existe em ES modules; derivamos a partir de import.meta.url.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
