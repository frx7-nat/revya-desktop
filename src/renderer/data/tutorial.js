// src/renderer/data/tutorial.js
// Passos para ativar a depuração USB num Galaxy. É uma sequência real —
// a ordem importa — por isso são numerados. Textos curtos, em linguagem
// do usuário (o que ele toca na tela), não do sistema.
//
// O campo `icon` é o nome de um ícone do Material Icons (@mui/icons-material),
// usado como elemento gráfico que ilustra cada etapa.

export const TUTORIAL_STEPS = [
  {
    n: 1,
    icon: 'Settings',
    title: 'Abra os Ajustes',
    body: 'No celular, entre em Ajustes › Sobre o telefone › Informações do software.',
  },
  {
    n: 2,
    icon: 'TouchApp',
    title: 'Ative o modo desenvolvedor',
    body: 'Toque 7 vezes em "Número da versão" até aparecer "Modo desenvolvedor ativado".',
  },
  {
    n: 3,
    icon: 'BugReport',
    title: 'Ligue a depuração USB',
    body: 'Volte aos Ajustes › Opções do desenvolvedor e ative "Depuração USB".',
  },
  {
    n: 4,
    icon: 'Cable',
    title: 'Conecte o cabo',
    body: 'Ligue o celular ao computador com o cabo USB. Uma janela de permissão vai aparecer na tela do aparelho.',
  },
  {
    n: 5,
    icon: 'Lock',
    title: 'Autorize este computador',
    body: 'Marque "Sempre permitir" e toque em Permitir. Pronto — o resto é com a gente.',
  },
];
