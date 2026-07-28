// src/renderer/data/dexGuide.js
// Conteúdo da etapa "DeX vs Experiência de TV".
//
// Duas partes:
//   1) EXPLAIN  — por que essa etapa existe (a diferença entre DeX e TV).
//   2) STEPS    — como desligar o DeX, com variação por versão do One UI,
//                 porque a Samsung mudou o caminho no One UI 8 (Android 16).

// Só estrutura: ícone, tom e CHAVE — o texto vive no catálogo (`dex.*`).
export const DEX_EXPLAIN = {
  introKey: 'dex.intro',
  compare: [
    { icon: 'DesktopWindows', key: 'dex.dexMode', tone: 'muted' },
    { icon: 'Tv', key: 'dex.tvMode', tone: 'accent' },
  ],
  conclusionKey: 'dex.conclusion',
};

export const DEX_VERSIONS = [
  {
    id: 'ui67',
    key: 'dex.ui67',
    steps: [
      { icon: 'Settings', key: 'dex.ui67.s1' },
      { icon: 'DesktopWindows', key: 'dex.ui67.s2' },
      { icon: 'ToggleOff', key: 'dex.ui67.s3' },
      { icon: 'CheckCircle', key: 'dex.ui67.s4' },
    ],
  },
  {
    id: 'ui8',
    key: 'dex.ui8',
    steps: [
      { icon: 'Settings', key: 'dex.ui8.s1' },
      { icon: 'Monitor', key: 'dex.ui8.s2' },
      { icon: 'ScreenShare', key: 'dex.ui8.s3' },
      { icon: 'CheckCircle', key: 'dex.ui8.s4' },
    ],
  },
  {
    id: 'nodex',
    key: 'dex.nodex',
    steps: [
      { icon: 'CheckCircle', key: 'dex.nodex.s1' },
    ],
  },
];

export const DEX_NOTE_KEY = 'dex.note';

// Aviso importante: em muitos aparelhos (ex.: S21 FE), o menu do Samsung DeX
// só aparece nas configurações DEPOIS que o HDMI está conectado. Sem o cabo
// ligado, a opção fica indisponível. Por isso esta etapa costuma ser feita ao
// final, com o aparelho já na TV — não na primeira conexão ao computador.
export const DEX_HDMI_WARNING_KEY = 'dex.hdmiWarning';
