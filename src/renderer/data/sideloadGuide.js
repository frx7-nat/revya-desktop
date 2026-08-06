// src/renderer/data/sideloadGuide.js
// Conteúdo do aviso "Como instalar apps e enviar arquivos".
//
// Ocupa o lugar do antigo catálogo de APKs: desde 27/07/2026 o Revya não
// distribui aplicativos de terceiros (ver o comentário do grupo `install` em
// tasks.js). O programa faz a transformação do celular; os apps e os arquivos
// são do usuário e entram pelo arrastar-e-soltar (SendOverlay).
//
// Mesmo formato dos outros guias (firstSetupGuide.js / dexGuide.js): passos
// com ícone do Material Icons, texto curto e em linguagem do usuário.

// Só estrutura: ícone e CHAVE — o texto vive no catálogo (`sideload.*`).
// As `notes` são LISTA no catálogo: a tradução pode ter mais ou menos
// observações que o original sem mexer em código.
export const SIDELOAD_GUIDE = {
  titleKey: 'sideload.title',
  introKey: 'sideload.intro',
  steps: [
    { icon: 'FolderOpen', key: 'sideload.s1' },
    { icon: 'DragIndicator', key: 'sideload.s2' },
    { icon: 'Android', key: 'sideload.s3' },
    { icon: 'DriveFolderUpload', key: 'sideload.s4' },
  ],
  notesKey: 'sideload.notes',
  actionKey: 'sideload.action',
};
