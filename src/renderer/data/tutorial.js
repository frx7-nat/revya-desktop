// src/renderer/data/tutorial.js
// Passos para ativar a depuração USB num Galaxy. É uma sequência real —
// a ordem importa — por isso são numerados. Textos curtos, em linguagem
// do usuário (o que ele toca na tela), não do sistema. O TEXTO vive no
// catálogo (`tutorial.*`); aqui ficam só a ordem, o ícone e a chave.
//
// O campo `icon` é o nome de um ícone do Material Icons (@mui/icons-material),
// usado como elemento gráfico que ilustra cada etapa.

export const TUTORIAL_STEPS = [
  { n: 1, key: 'tutorial.s1', icon: 'Settings' },
  { n: 2, key: 'tutorial.s2', icon: 'TouchApp' },
  { n: 3, key: 'tutorial.s3', icon: 'BugReport' },
  { n: 4, key: 'tutorial.s4', icon: 'Cable' },
  { n: 5, key: 'tutorial.s5', icon: 'Lock' },
];
