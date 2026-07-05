// src/renderer/data/tasks.js
// Catálogo de modificações exibidas na aba esquerda.
// Cada item é uma "task" que o orquestrador executa em sequência.
// Mantenha as listas de pacotes auditadas: remover o pacote errado
// pode quebrar o aparelho. Por isso nada de pacotes com prefixo
// com.android.* essenciais (telefonia, systemui, etc).

export const TASK_GROUPS = [
  {
    id: 'debloat',
    title: 'Remover apps',
    subtitle: 'Desinstala por usuário (reversível em reset)',
    tasks: [
      { id: 'rm-bixby', label: 'Bixby', kind: 'remove', pkgs: [
        'com.samsung.android.bixby.agent',
        'com.samsung.android.bixby.wakeup',
        'com.samsung.android.app.spage',
      ]},
      { id: 'rm-store', label: 'Galaxy Store', kind: 'remove', pkgs: [
        'com.sec.android.app.samsungapps',
      ]},
      { id: 'rm-office', label: 'Apps de escritório', kind: 'remove', pkgs: [
        'com.microsoft.skydrive', 'com.microsoft.office.officehubrow',
      ]},
      { id: 'rm-social', label: 'Redes sociais pré-instaladas', kind: 'remove', pkgs: [
        'com.facebook.katana', 'com.facebook.system', 'com.facebook.appmanager',
      ]},
    ],
  },

  // -------------------------------------------------------------------------
  // INSTALAR APPS DE TV — agora dividido em categorias.
  //
  // Cada app tem:
  //   id      identificador único (use prefixo da categoria, ex.: 'mm-' )
  //   label   nome exibido
  //   kind    'install' (sempre, neste grupo)
  //   source  de onde vem o APK. Dois formatos possíveis:
  //             { type: 'local', apk: 'arquivo.apk' }   -> arquivo em ./apks
  //             { type: 'url',   url: 'https://...apk' } -> baixa do repositório
  //   pkg     (opcional) nome do pacote, para checar se já está instalado
  //
  // Você adicionará os apps e os repositórios depois. Os exemplos abaixo
  // mostram o formato — troque/expanda à vontade.
  // -------------------------------------------------------------------------
  //
  // FORMATO DE CADA APP (todos offline, instalados da pasta apks/<categoria>/):
  //   { id: 'mm-kodi', label: 'Kodi', kind: 'install',
  //     pkg: 'org.xbmc.kodi',                          // nome real do pacote
  //     source: { type: 'local', dir: 'multimidia', apk: 'kodi.apk' } }
  //
  // O campo `dir` é a subpasta da categoria dentro de apks/. O `apk` deve ser
  // o nome exato do arquivo que você colocar lá. Para ativar um app, descomente
  // a linha e coloque o arquivo correspondente na pasta.
  // -------------------------------------------------------------------------
  {
    id: 'install',
    title: 'Instalar apps de TV',
    subtitle: 'Escolha por categoria',
    categories: [
      {
        id: 'multimidia',
        label: 'Multimídia',
        apps: [
          { id: 'mm-appletv', label: 'Apple TV+', kind: 'install',
            pkg: 'com.apple.atve.androidtv.appletv',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Apple TV+.xapk' } },
          { id: 'mm-crunchyroll', label: 'Crunchyroll', kind: 'install',
            pkg: 'com.crunchyroll.crunchyroid',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Crunchyroll.apkm' } },
          { id: 'mm-disneyplus', label: 'Disney+', kind: 'install',
            pkg: 'com.disney.disneyplus',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Disney+.xapk' } },
          { id: 'mm-globoplay', label: 'Globoplay', kind: 'install',
            pkg: 'com.globo.globoplay',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Globoplay.apkm' } },
          { id: 'mm-max', label: 'Max', kind: 'install',
            pkg: 'com.wbd.bond',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Max.xapk' } },
          { id: 'mm-mubi', label: 'MUBI', kind: 'install',
            pkg: 'com.mubi',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} MUBI.apk' } },
          { id: 'mm-netflix', label: 'Netflix', kind: 'install',
            pkg: 'com.netflix.mediaclient',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Netflix.apkm' } },
          { id: 'mm-paramount', label: 'Paramount+', kind: 'install',
            pkg: 'com.paramountplus.ott',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Paramount+.apkm' } },
          { id: 'mm-pluto', label: 'Pluto TV', kind: 'install',
            pkg: 'tv.pluto.android',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Pluto TV.apkm' } },
          { id: 'mm-prime', label: 'Prime Video', kind: 'install',
            pkg: 'com.amazon.avod.thirdpartyclient',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Prime Video.apkm' } },
          { id: 'mm-stremio', label: 'Stremio', kind: 'install',
            pkg: 'com.stremio.one',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Stremio.apk' } },
          { id: 'mm-tizentube', label: 'Tizentube', kind: 'install',
            source: { type: 'local', dir: 'multimidia', apk: '{Multimídia} Tizentube.apk' } },
        ],
      },
      {
        id: 'navegacao',
        label: 'Navegação',
        apps: [
          { id: 'nav-aptoide', label: 'Aptoide TV', kind: 'install',
            pkg: 'cm.aptoide.pt',
            source: { type: 'local', dir: 'navegacao', apk: '{Navegação} Aptoide TV.apk' } },
          { id: 'nav-downloader', label: 'Downloader', kind: 'install',
            pkg: 'com.ilabs.dls',
            source: { type: 'local', dir: 'navegacao', apk: '{Navegação} Downloader.apkm' } },
          { id: 'nav-localsend', label: 'LocalSend', kind: 'install',
            pkg: 'org.localsend.localsend_app',
            source: { type: 'local', dir: 'navegacao', apk: '{Navegação} LocalSend.apk' } },
          { id: 'nav-telegram', label: 'Telegram', kind: 'install',
            pkg: 'org.telegram.messenger',
            source: { type: 'local', dir: 'navegacao', apk: '{Navegação} Telegram.apk' } },
          { id: 'nav-zarchiver', label: 'ZArchiver', kind: 'install',
            pkg: 'ru.zdevs.zarchiver',
            source: { type: 'local', dir: 'navegacao', apk: '{Navegação} ZArchiver.apk' } },
        ],
      },
      {
        id: 'launchers',
        label: 'Launchers',
        apps: [
          // Projectivy é o launcher padrão do sistema (ligado ao tweak tw-home).
          // Arquivo em apks/launchers/{Launcher} Projectivy Launcher.apkm
          // (bundle do APKMirror: base.apk + splits → instalado via install-multiple).
          { id: 'lnch-projectivy', label: 'Projectivy Launcher', kind: 'install',
            pkg: 'com.spocky.projengmenu',
            source: { type: 'local', dir: 'launchers', apk: '{Launcher} Projectivy Launcher.apkm' } },
        ],
      },
      {
        id: 'emuladores',
        label: 'Emuladores',
        apps: [
          { id: 'emu-aethersx2', label: 'AetherSX2', kind: 'install',
            pkg: 'xyz.aethersx2.android',
            source: { type: 'local', dir: 'emuladores', apk: '{Emulador} AetherSX2-V1.5-3668.apk' } },
        ],
      },
    ],
  },

  // Personalizações de sistema. Cada task pode ter um campo `info` com uma
  // explicação curta do porquê — exibida num indicador expansível ao lado.
  {
    id: 'tweaks',
    title: 'Personalizar sistema',
    subtitle: 'Ajustes para uso em TV',
    tasks: [
      { id: 'tw-screen', label: 'Manter tela sempre ligada', kind: 'setting',
        ns: 'system', key: 'screen_off_timeout', value: 2147483647,
        info: 'A TV não deve apagar sozinha durante o uso.' },

      // Proteção de bateria do One UI: limita a carga a ~85%. Essencial para
      // um aparelho que vive 24h no carregador — evita degradação e calor.
      // OBS: a chave existe no One UI moderno; em aparelhos sem o recurso a
      // escrita pode até passar sem efeito real (limitação do Android).
      { id: 'tw-battery', label: 'Proteger a bateria (carga até 85%)', kind: 'setting',
        ns: 'global', key: 'protect_battery', value: 1,
        info: 'Plugado 24h na tomada, o celular degrada a bateria rápido. Este ajuste do One UI limita a carga a 85%, alongando muito a vida útil.' },

      // Não Perturbe via gerenciador de notificações (cmd notification).
      // Evita notificação de mensagem/ligação aparecendo por cima do filme.
      { id: 'tw-dnd', label: 'Não perturbe (modo TV)', kind: 'dnd',
        info: 'Silencia notificações e chamadas que apareceriam na TV, por cima do conteúdo e na frente de todo mundo.' },

      { id: 'tw-updates', label: 'Desativar atualizações automáticas', kind: 'remove',
        pkgs: [
          'com.wssyncmldm',                 // SamsungDM / FOTA agent
          'com.sec.android.soagent',        // Software update agent
          'com.samsung.android.app.updatecenter',
        ],
        info: 'Uma atualização do sistema pode desfazer toda a configuração. Por segurança, mantenha o aparelho como está.' },

      { id: 'tw-anim', label: 'Reduzir animações', kind: 'settings',
        ns: 'global',
        // São TRÊS escalas separadas; setar só uma não tem efeito visível.
        // 0 = animações desligadas (efeito perceptível e navegação mais rápida).
        keys: [
          { key: 'window_animation_scale', value: 0 },
          { key: 'transition_animation_scale', value: 0 },
          { key: 'animator_duration_scale', value: 0 },
        ],
        info: 'Navegação mais rápida e direta na tela grande.' },

      { id: 'tw-font', label: 'Aumentar tamanho da fonte', kind: 'setting',
        ns: 'system', key: 'font_scale', value: 1.15,
        info: 'Texto maior para leitura confortável à distância do sofá.' },

      { id: 'tw-rotate', label: 'Forçar tela na horizontal', kind: 'rotate',
        info: 'Mantém tudo em paisagem na TV, mesmo apps que abririam em pé.' },

      { id: 'tw-gestures', label: 'Navegação por gestos', kind: 'setting',
        ns: 'secure', key: 'navigation_mode', value: 2,
        info: 'Troca os botões por gestos, liberando espaço na tela.' },

      { id: 'tw-lock', label: 'Remover bloqueio de tela', kind: 'setting',
        // Chave correta é lockscreen_disabled (underscore). Em alguns Galaxy
        // o sistema ignora mesmo assim; a verificação avisa se não pegou.
        ns: 'secure', key: 'lockscreen_disabled', value: 1,
        info: 'Liga direto no conteúdo, sem pedir senha pelo controle.' },

      // Define o launcher de TV como tela inicial. Preencha `pkg` com o pacote
      // do launcher que você colocar no catálogo de instalação (ex.: Projectivy
      // = 'com.spocky.projengmenu'). Sem isso, esta opção não tem efeito.
      { id: 'tw-home', label: 'Usar launcher de TV como padrão', kind: 'home',
        pkg: 'com.spocky.projengmenu',  // Projectivy (padrão; usuário pode trocar depois)
        info: 'O celular abre direto na tela de TV, não no sistema do Android.' },

      // Resolução da TV: três opções mutuamente exclusivas (o usuário escolhe
      // UMA, conforme a resolução da TV dele). O valor DEVE bater com a
      // resolução nativa da TV — forçar um valor maior que o suportado encolhe
      // a imagem para o centro da tela. Todas são 16:9 (o painel do celular é
      // ~20:9; forçar 16:9 faz o espelhamento preencher a TV sem cortes).
      // `density` é o dpi pareado no padrão Android TV (1080p→320, 1440p→480,
      // 4K→640): interface na escala certa para ver do sofá. `exclusiveGroup`
      // faz com que marcar uma desmarque as outras do mesmo grupo.
      { id: 'tw-res-fhd', label: 'Resolução Full HD (1080p)', kind: 'wmsize',
        width: 1920, height: 1080, density: 320, exclusiveGroup: 'resolution',
        info: 'Para TVs Full HD (1920x1080). A resolução mais comum.' },

      { id: 'tw-res-2k', label: 'Resolução 2K (1440p)', kind: 'wmsize',
        width: 2560, height: 1440, density: 480, exclusiveGroup: 'resolution',
        info: 'Para monitores e TVs 2K/QHD (2560x1440).' },

      { id: 'tw-res-4k', label: 'Resolução 4K (2160p)', kind: 'wmsize',
        width: 3840, height: 2160, density: 640, exclusiveGroup: 'resolution',
        info: 'Para TVs 4K/UHD (3840x2160). Só use se a TV for realmente 4K.' },

      { id: 'tw-sound', label: 'Silenciar sons de toque', kind: 'settings',
        ns: 'system',
        // Som de toque e som de bloqueio são chaves diferentes no One UI.
        keys: [
          { key: 'sound_effects_enabled', value: 0 },
          { key: 'lockscreen_sounds_enabled', value: 0 },
        ],
        info: 'Sem o clique a cada toque, melhor para a sala.' },

      // NOTA: a antiga opção "Manter Wi-Fi sempre ativo" (wifi_sleep_policy) foi
      // removida — essa chave foi descontinuada no Android moderno e não tem
      // mais efeito. O comportamento hoje é gerenciado pelo próprio sistema.
    ],
  },
];

// ---------------------------------------------------------------------------
// Todas as tasks selecionáveis, achatadas: as diretas dos grupos comuns e os
// apps dentro das categorias do grupo "install". Fonte única para App,
// diálogos e preset — a ordem daqui é a ordem de execução.
// ---------------------------------------------------------------------------
export const ALL_TASKS = TASK_GROUPS.flatMap((g) =>
  g.categories
    ? g.categories.flatMap((c) => c.apps)
    : (g.tasks || [])
);

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO RECOMENDADA — o conjunto aplicado pelo botão de 1 clique.
// Critério: só o que é seguro e desejável em QUALQUER aparelho/TV. Ficam de
// fora decisões que dependem do usuário: resolução (varia por TV), remoção do
// bloqueio de tela (segurança), gestos (gosto) e os apps de streaming (cada
// um assina os seus). A ordem de execução vem de ALL_TASKS (launcher instala
// antes de virar padrão).
// ---------------------------------------------------------------------------
export const RECOMMENDED_TASK_IDS = [
  'rm-bixby', 'rm-store', 'rm-office', 'rm-social',
  'lnch-projectivy',
  'tw-screen', 'tw-battery', 'tw-updates', 'tw-anim', 'tw-font',
  'tw-rotate', 'tw-dnd', 'tw-sound', 'tw-home',
];

// ---------------------------------------------------------------------------
// ACESSÓRIOS RECOMENDADOS — não executa nada no aparelho.
// É uma vitrine de produtos que expandem o uso do celular como TV.
// Cada item abre o link no navegador padrão (não dentro do app).
//
// Campos:
//   id       identificador único
//   label    nome do produto/solução
//   note     descrição curta (para que serve)
//   url      link do produto (loja/afiliado/etc.)
//
// Você preencherá os links depois. Categorias servem de organização.
// ---------------------------------------------------------------------------
export const ACCESSORY_GROUPS = [
  {
    id: 'controles',
    label: 'Controles e joysticks',
    items: [
      // { id: 'ac-remote', label: 'Controle remoto Bluetooth', note: 'Navegação por D-pad', url: 'https://...' },
      // { id: 'ac-gamepad', label: 'Joystick para emuladores', note: 'Compatível com RetroArch', url: 'https://...' },
    ],
  },
  {
    id: 'video',
    label: 'Vídeo e conexão',
    items: [
      // { id: 'ac-hdmi', label: 'Adaptador USB-C para HDMI', note: 'Saída de vídeo para TV', url: 'https://...' },
    ],
  },
  {
    id: 'suporte',
    label: 'Energia e suporte',
    items: [
      // { id: 'ac-dock', label: 'Dock com carregamento', note: 'Mantém o celular ligado', url: 'https://...' },
    ],
  },
];
