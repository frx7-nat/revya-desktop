// src/renderer/data/firstSetupGuide.js
// Conteúdo do guia de PRIMEIRA CONFIGURAÇÃO — mostrado uma única vez por
// aparelho (preferência introSeen no registro, por serial estável), quando um
// celular sem nenhuma configuração conecta.
//
// A mensagem central é a filosofia do produto: "configure até a interface
// ideal e PERMANEÇA nela" — o Revya estrutura uma experiência de TV; o
// dia a dia depois é alimentá-la de conteúdo, não remexer na interface.

// Só estrutura: ícone e CHAVE. O texto vive em `src/i18n/*.json`, sob
// `firstGuide.*` — este objeto é constante de módulo e uma frase aqui ficaria
// congelada no idioma de origem.
export const FIRST_GUIDE = {
  titleKey: 'firstGuide.title',
  introKey: 'firstGuide.intro',
  steps: [
    { icon: 'Tv', key: 'firstGuide.s1' },
    { icon: 'BookmarkAdded', key: 'firstGuide.s2' },
    { icon: 'Apps', key: 'firstGuide.s3' },
    { icon: 'SettingsBackupRestore', key: 'firstGuide.s4' },
  ],
  actionKey: 'firstGuide.action',
};
