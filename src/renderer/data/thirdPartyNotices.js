// src/renderer/data/thirdPartyNotices.js
// Conteúdo do diálogo "Licenças de terceiros" (LicensesDialog).
//
// O Revya embute dois binários externos sem modificar o código-fonte deles:
// o scrcpy (espelhamento de tela) e o ADB do Android platform-tools. Os dois
// são Apache License 2.0 — o texto completo mora em LICENSES/apache-2.0.txt
// (mesmo arquivo pros dois, a licença é a mesma).
//
// Nome do componente, linhas de copyright, nome da licença e URL do projeto
// NÃO se traduzem (são fato/nome próprio) — por isso ficam como dado literal
// aqui, e não como chave de catálogo. Só o texto ao redor (título, intro,
// "licenciado sob") vem do catálogo — ver as chaves abaixo.

export const LICENSES_TITLE_KEY = 'licenses.title';
export const LICENSES_INTRO_KEY = 'licenses.intro';
export const LICENSES_LICENSED_UNDER_KEY = 'licenses.licensedUnder';
export const LICENSES_PROJECT_LABEL_KEY = 'licenses.projectLabel';
export const LICENSES_TRIGGER_KEY = 'licenses.trigger';

export const THIRD_PARTY_COMPONENTS = [
  {
    id: 'scrcpy',
    name: 'scrcpy',
    copyrightLines: [
      'Copyright (C) 2018 Genymobile',
      'Copyright (C) 2018-2026 Romain Vimont',
    ],
    licenseName: 'Apache License, Version 2.0',
    licenseFile: 'LICENSES/apache-2.0.txt',
    projectUrl: 'https://github.com/Genymobile/scrcpy',
  },
  {
    id: 'adb',
    name: 'Android Debug Bridge (platform-tools)',
    copyrightLines: [
      'Copyright (C) The Android Open Source Project',
    ],
    licenseName: 'Apache License, Version 2.0',
    licenseFile: 'LICENSES/apache-2.0.txt',
    projectUrl: 'https://developer.android.com/tools/releases/platform-tools',
  },
];
