// src/renderer/data/dexGuide.js
// Conteúdo da etapa "DeX vs Experiência de TV".
//
// Duas partes:
//   1) EXPLAIN  — por que essa etapa existe (a diferença entre DeX e TV).
//   2) STEPS    — como desligar o DeX, com variação por versão do One UI,
//                 porque a Samsung mudou o caminho no One UI 8 (Android 16).

export const DEX_EXPLAIN = {
  intro: 'Alguns aparelhos Samsung têm o modo DeX. Ao conectar no HDMI, o DeX abre sozinho e assume a tela — e isso atrapalha a experiência de TV que acabamos de montar.',
  compare: [
    {
      icon: 'DesktopWindows',
      title: 'Modo DeX',
      desc: 'Abre uma área de trabalho parecida com um computador. Pensado para produtividade, com janelas e mouse — não para assistir TV no sofá.',
      tone: 'muted',
    },
    {
      icon: 'Tv',
      title: 'Experiência de TV',
      desc: 'Abre direto no launcher de TV, com navegação simples pelo controle. É o que queremos para usar o aparelho como uma TV box.',
      tone: 'accent',
    },
  ],
  conclusion: 'Por isso, em aparelhos com DeX, é preciso desativar a abertura automática dele. Sem DeX no caminho, o celular abre direto na interface de TV ao ligar no HDMI.',
};

export const DEX_VERSIONS = [
  {
    id: 'ui67',
    label: 'One UI 6 / 7',
    hint: 'Android 14 / 15 — a maioria dos aparelhos hoje',
    steps: [
      { icon: 'Settings', title: 'Abra os Ajustes', body: 'No celular, vá em Ajustes › Dispositivos conectados.' },
      { icon: 'DesktopWindows', title: 'Entre no Samsung DeX', body: 'Toque em "Samsung DeX".' },
      { icon: 'ToggleOff', title: 'Desligue a abertura automática', body: 'Desative "Iniciar automaticamente quando o HDMI for conectado".' },
      { icon: 'CheckCircle', title: 'Pronto', body: 'Agora, ao conectar no HDMI, o aparelho abre na interface de TV em vez do DeX.' },
    ],
  },
  {
    id: 'ui8',
    label: 'One UI 8',
    hint: 'Android 16 — aparelhos mais recentes',
    steps: [
      { icon: 'Settings', title: 'Abra os Ajustes', body: 'No celular, vá em Ajustes › Dispositivos conectados › Samsung DeX.' },
      { icon: 'Monitor', title: 'Entre em "Tela conectada"', body: 'Toque em "Tela conectada" (Connected display).' },
      { icon: 'ScreenShare', title: 'Escolha "Espelhar"', body: 'Selecione "Espelhar" em vez de "Estender". Espelhar abre a interface de TV; estender abre o DeX.' },
      { icon: 'CheckCircle', title: 'Pronto', body: 'O aparelho passa a espelhar a tela ao conectar no HDMI, abrindo direto no launcher de TV.' },
    ],
  },
  {
    id: 'nodex',
    label: 'Meu aparelho não tem DeX',
    hint: 'Ex.: Galaxy Z Flip e modelos de entrada',
    steps: [
      { icon: 'CheckCircle', title: 'Nada a fazer', body: 'Sem DeX, o aparelho já abre direto na interface de TV ao conectar no HDMI. Pode pular esta etapa.' },
    ],
  },
];

export const DEX_NOTE = 'Os nomes das opções podem variar um pouco conforme o modelo e a versão. Se não encontrar pelo caminho acima, busque por "DeX" na busca dos Ajustes.';

// Aviso importante: em muitos aparelhos (ex.: S21 FE), o menu do Samsung DeX
// só aparece nas configurações DEPOIS que o HDMI está conectado. Sem o cabo
// ligado, a opção fica indisponível. Por isso esta etapa costuma ser feita ao
// final, com o aparelho já na TV — não na primeira conexão ao computador.
export const DEX_HDMI_WARNING = 'O menu do DeX só aparece nas configurações com o aparelho já conectado à TV pelo HDMI. Sem o cabo ligado, a opção fica indisponível — por isso o ideal é fazer este passo ao final, já com o celular na TV.';
