// src/renderer/data/tasks.js
// Catálogo de modificações exibidas na aba esquerda.
// Cada item é uma "task" que o orquestrador executa em sequência.
// Mantenha as listas de pacotes auditadas: remover o pacote errado
// pode quebrar o aparelho. Por isso nada de pacotes com prefixo
// com.android.* essenciais (telefonia, systemui, etc).

export const TASK_GROUPS = [
  {
    id: 'debloat',
    tasks: [
      { id: 'rm-bixby', kind: 'remove', pkgs: [
        'com.samsung.android.bixby.agent',
        'com.samsung.android.bixby.wakeup',
        'com.samsung.android.app.spage',
      ]},
      { id: 'rm-store', kind: 'remove', pkgs: [
        'com.sec.android.app.samsungapps',
      ]},
      { id: 'rm-office', kind: 'remove', pkgs: [
        'com.microsoft.skydrive', 'com.microsoft.office.officehubrow',
      ]},
      { id: 'rm-social', kind: 'remove', pkgs: [
        'com.facebook.katana', 'com.facebook.system', 'com.facebook.appmanager',
      ]},
    ],
  },

  // -------------------------------------------------------------------------
  // INSTALAR — só o launcher próprio.
  //
  // Em 27/07/2026 TODO o catálogo de APKs de terceiros saiu do programa
  // (streaming, ferramentas, emuladores) e os arquivos saíram da pasta apks/.
  // Motivo: DISTRIBUIÇÃO. Embutir e redistribuir o APK de outra empresa é
  // problema legal nosso, não do usuário — e o produto é vendido. O DexArmor
  // passa a fazer só a TRANSFORMAÇÃO do celular; os apps que o usuário quiser
  // ele instala a partir dos arquivos dele, pelo "Enviar para o celular"
  // (arrastar e soltar), explicado no guia sideloadGuide.js.
  //
  // O que NÃO fazer ao mexer aqui: repovoar este grupo com APK de terceiro.
  // O único app que pode ir embutido é o que nos pertence.
  //
  // FORMATO DE UM APP (offline, instalado da pasta apks/<categoria>/):
  //   { id: 'lnch-x', kind: 'install',
  //     pkg: 'com.exemplo.app',                        // nome real do pacote
  //     source: { type: 'local', dir: 'launchers', apk: 'arquivo.apk' } }
  //
  // O campo `dir` é a subpasta dentro de apks/ e `apk` é o nome exato do
  // arquivo. O runner também aceita { type: 'url', url: 'https://...apk' }.
  // -------------------------------------------------------------------------
  {
    id: 'install',
    // Aviso que ocupa o lugar do antigo catálogo: explica ao usuário como
    // instalar os apps dele e mandar arquivos (TaskPanel renderiza o texto e
    // o botão, que abre o SideloadGuideDialog).
    tasks: [
      // DexArmor TV é o launcher próprio do produto e o padrão do modo TV
      // (ligado ao tweak tw-home). É o ÚNICO app que nos pertence: por isso
      // vai embutido, sem depender de loja nenhuma.
      // Arquivo em apks/launchers/{Launcher} DexArmor TV.apk (APK simples).
      //
      // `minVersionCode` liga a atualização: o runner compara com o
      // versionCode instalado no aparelho e reinstala com -r quando o
      // embutido for maior. Ao publicar um APK novo, suba os DOIS —
      // o versionCode no build.gradle.kts do launcher e o número aqui.
      { id: 'lnch-dexarmor', kind: 'install',
        pkg: 'tech.dexarmor.launcher',
        // Sobe JUNTO com o `versionCode` do app/build.gradle.kts do launcher.
        // Se ficar para trás, o runner compara o instalado contra este mínimo,
        // conclui "já atualizado" e nunca reinstala — o APK novo fica no
        // catálogo sem nunca chegar ao aparelho.
        //   2 (27/07/2026) — tela "contribua" + categorias com.arvio.tv e
        //                    com.farmerbb.secondscreen.free
        //   3 (28/07/2026) — i18n pt/en do launcher e PayPal por idioma;
        //                    primeiro APK assinado com a chave de RELEASE.
        //                    A v2 era de debug: assinatura diferente NÃO
        //                    atualiza por cima (INSTALL_FAILED_UPDATE_
        //                    INCOMPATIBLE). Aparelho com a v2 instalada
        //                    precisa desinstalar antes — ver ASSINATURA.md
        //                    no changeset do launcher.
        //   4 (28/07/2026) — ícone do tile focado sem tint. Primeira subida
        //                    release→release: aparelho com a v3 deve receber
        //                    a v4 POR CIMA, sem desinstalar. É o teste do
        //                    caminho de atualização (item 1 do PENDENCIAS).
        minVersionCode: 4,
        source: { type: 'local', dir: 'launchers', apk: '{Launcher} DexArmor TV.apk' } },

      // O Projectivy saiu em 25/07/2026, substituído pelo launcher próprio;
      // os demais apps saíram em 27/07/2026 (ver comentário acima).
      //
      // Sair do catálogo NÃO desinstala nada: aparelhos já provisionados
      // seguem com o que foi instalado antes, e quem quiser qualquer um deles
      // de volta usa o "Enviar para o celular" com o APK em mãos.
    ],
  },

  // Personalizações de sistema. Cada task pode ter um campo `info` com uma
  // explicação curta do porquê — exibida num indicador expansível ao lado.
  //
  // `modeScope` classifica a task para a ALTERNÂNCIA DE MODOS (celular ⇄ TV):
  //   'mode'       alterna a cada troca — são ajustes rápidos de settings/wm
  //   'structural' aplica uma vez e vale nos DOIS modos (só sai na reversão
  //                completa) — ex.: apps instalados, bloatware removido,
  //                proteção de bateria.
  // Sem o campo, vale o padrão por kind (ver isModeTask no fim do arquivo).
  //
  // `repeatable: true` marca os ajustes DE INTERFACE que nunca travam depois
  // de aplicados: rotação, resolução e tamanho da interface podem ser
  // reaplicados quantas vezes for preciso, até o usuário chegar na tela que
  // funciona para ele. O registro de reversão preserva o estado ORIGINAL do
  // aparelho mesmo com reaplicações (merge no revertStore).
  {
    id: 'tweaks',
    tasks: [
      { id: 'tw-screen', kind: 'setting',
        ns: 'system', key: 'screen_off_timeout', value: 2147483647, modeScope: 'mode' },

      // Proteção de bateria do One UI: limita a carga a ~85%. Essencial para
      // um aparelho que vive 24h no carregador — evita degradação e calor.
      // OBS: a chave existe no One UI moderno; em aparelhos sem o recurso a
      // escrita pode até passar sem efeito real (limitação do Android).
      // Estrutural: proteger a bateria é desejável nos dois modos.
      { id: 'tw-battery', kind: 'setting',
        ns: 'global', key: 'protect_battery', value: 1, modeScope: 'structural' },

      // Não Perturbe via gerenciador de notificações (cmd notification).
      // Evita notificação de mensagem/ligação aparecendo por cima do filme.
      { id: 'tw-dnd', kind: 'dnd', modeScope: 'mode' },

      { id: 'tw-updates', kind: 'remove',
        pkgs: [
          'com.wssyncmldm',                 // SamsungDM / FOTA agent
          'com.sec.android.soagent',        // Software update agent
          'com.samsung.android.app.updatecenter',
        ] },

      { id: 'tw-anim', kind: 'settings',
        ns: 'global', modeScope: 'mode',
        // São TRÊS escalas separadas; setar só uma não tem efeito visível.
        // 0 = animações desligadas (efeito perceptível e navegação mais rápida).
        keys: [
          { key: 'window_animation_scale', value: 0 },
          { key: 'transition_animation_scale', value: 0 },
          { key: 'animator_duration_scale', value: 0 },
        ] },

      // Tamanho da fonte: três opções mutuamente exclusivas e AJUSTÁVEIS —
      // troque à vontade até a leitura ficar confortável do sofá. O id
      // 'tw-font' original é mantido (registros antigos continuam válidos)
      // e segue sendo a opção do preset recomendado.
      { id: 'tw-font', kind: 'setting',
        ns: 'system', key: 'font_scale', value: 1.15, modeScope: 'mode',
        exclusiveGroup: 'font', repeatable: true },

      { id: 'tw-font-big', kind: 'setting',
        ns: 'system', key: 'font_scale', value: 1.3, modeScope: 'mode',
        exclusiveGroup: 'font', repeatable: true },

      { id: 'tw-font-normal', kind: 'setting',
        ns: 'system', key: 'font_scale', value: 1.0, modeScope: 'mode',
        exclusiveGroup: 'font', repeatable: true },

      // Repetível: em alguns aparelhos o alvo calculado erra o lado e a tela
      // fica em pé — o usuário pode reaplicar (e usar o botão "Girar tela" do
      // controle remoto) quantas vezes for preciso até a posição certa. A
      // posição que funcionou fica salva no perfil TV e é ela que volta nas
      // próximas ativações do modo TV.
      { id: 'tw-rotate', kind: 'rotate', modeScope: 'mode',
        repeatable: true },

      { id: 'tw-gestures', kind: 'setting',
        ns: 'secure', key: 'navigation_mode', value: 2, modeScope: 'mode' },

      { id: 'tw-lock', kind: 'setting',
        // Chave correta é lockscreen_disabled (underscore). Em alguns Galaxy
        // o sistema ignora mesmo assim; a verificação avisa se não pegou.
        ns: 'secure', key: 'lockscreen_disabled', value: 1, modeScope: 'mode' },

      // Define o launcher de TV como tela inicial. O `pkg` precisa estar no
      // catálogo de instalação acima, senão esta opção falha por falta do app.
      // Na alternância de modos, só o launcher PADRÃO troca — o app continua
      // instalado no modo celular. O mapeamento é FIXO: modo TV = este pkg,
      // modo celular = One UI Home (o launcher da Samsung), sempre.
      //
      // Trocar de launcher de TV = trocar o pkg aqui E pôr o app correspondente
      // no catálogo de instalação acima. Os dois têm de andar juntos: o handler
      // recusa definir como padrão um launcher que não está instalado.
      { id: 'tw-home', kind: 'home',
        pkg: 'tech.dexarmor.launcher',  // DexArmor TV — launcher próprio do modo TV
        modeScope: 'mode' },

      // Resolução da TV: três opções mutuamente exclusivas (o usuário escolhe
      // UMA, conforme a resolução da TV dele). O valor DEVE bater com a
      // resolução nativa da TV — forçar um valor maior que o suportado encolhe
      // a imagem para o centro da tela. Todas são 16:9 (o painel do celular é
      // ~20:9; forçar 16:9 faz o espelhamento preencher a TV sem cortes).
      // `density` é o dpi pareado no padrão Android TV (1080p→320, 1440p→480,
      // 4K→640): interface na escala certa para ver do sofá. `exclusiveGroup`
      // faz com que marcar uma desmarque as outras do mesmo grupo.
      { id: 'tw-res-fhd', kind: 'wmsize',
        width: 1920, height: 1080, density: 320, exclusiveGroup: 'resolution',
        modeScope: 'mode', repeatable: true },

      { id: 'tw-res-2k', kind: 'wmsize',
        width: 2560, height: 1440, density: 480, exclusiveGroup: 'resolution',
        modeScope: 'mode', repeatable: true },

      { id: 'tw-res-4k', kind: 'wmsize',
        width: 3840, height: 2160, density: 640, exclusiveGroup: 'resolution',
        modeScope: 'mode', repeatable: true },

      // Tamanho da interface (dpi), pareado com a resolução aplicada acima.
      // O runner lê a resolução atual do aparelho e calcula o dpi na hora:
      // 'default' usa o padrão de TV (1080p→320, 1440p→480, 4K→640); 'small'
      // aplica 20% a menos — dpi menor = elementos menores = mais conteúdo
      // cabendo na tela. Requer uma resolução de TV já aplicada — sem ela,
      // a task orienta o usuário a escolher a resolução primeiro.
      { id: 'tw-dpi-default', kind: 'density',
        mode: 'default', exclusiveGroup: 'density', modeScope: 'mode', repeatable: true },

      { id: 'tw-dpi-small', kind: 'density',
        mode: 'small', exclusiveGroup: 'density', modeScope: 'mode', repeatable: true },

      { id: 'tw-dpi-large', kind: 'density',
        mode: 'large', exclusiveGroup: 'density', modeScope: 'mode', repeatable: true },

      { id: 'tw-sound', kind: 'settings',
        ns: 'system', modeScope: 'mode',
        // Som de toque e som de bloqueio são chaves diferentes no One UI.
        keys: [
          { key: 'sound_effects_enabled', value: 0 },
          { key: 'lockscreen_sounds_enabled', value: 0 },
        ] },

      // NOTA: a antiga opção "Manter Wi-Fi sempre ativo" (wifi_sleep_policy) foi
      // removida — essa chave foi descontinuada no Android moderno e não tem
      // mais efeito. O comportamento hoje é gerenciado pelo próprio sistema.
    ],
  },
];

// ---------------------------------------------------------------------------
// Todas as tasks selecionáveis, achatadas. Fonte única para App, diálogos e
// preset — a ordem daqui é a ordem de execução.
// ---------------------------------------------------------------------------
export const ALL_TASKS = TASK_GROUPS.flatMap((g) => g.tasks || []);

// ---------------------------------------------------------------------------
// Classificação para a ALTERNÂNCIA DE MODOS (celular ⇄ TV).
// 'mode' = alterna a cada troca; 'structural' = vale nos dois modos.
// Quando a task não declara modeScope (registros antigos), decide-se pelo
// kind: settings/resolução/launcher/rotação/dnd alternam; remover e instalar
// apps são estruturais.
// ---------------------------------------------------------------------------
const MODE_KINDS = new Set(['setting', 'settings', 'home', 'rotate', 'dnd', 'wmsize', 'density']);

export function isModeTask(task) {
  if (!task) return false;
  if (task.modeScope) return task.modeScope === 'mode';
  return MODE_KINDS.has(task.kind);
}

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO RECOMENDADA — o conjunto aplicado pelo botão de 1 clique.
// Critério: NÃO DESINSTALA NADA. O preset instala o launcher de TV, o define
// como padrão e aplica só os ajustes de interface/uso — tudo settings
// reversíveis, nenhuma remoção de app. As remoções (Bixby, Galaxy Store,
// escritório, redes sociais e agentes de atualização) continuam disponíveis
// na seleção manual, para quem quiser um aparelho mais enxuto.
// Também ficam de fora decisões que dependem do usuário: resolução (varia
// por TV), remoção do bloqueio de tela (segurança) e gestos (gosto). A ordem
// de execução vem de ALL_TASKS (launcher instala antes de virar padrão).
// ---------------------------------------------------------------------------
export const RECOMMENDED_TASK_IDS = [
  'lnch-dexarmor',
  'tw-screen', 'tw-battery', 'tw-anim', 'tw-font',
  'tw-rotate', 'tw-dnd', 'tw-sound', 'tw-home',
];

// ---------------------------------------------------------------------------
// ACESSÓRIOS RECOMENDADOS — não executa nada no aparelho.
// É uma vitrine de produtos com link externo: cada item abre no navegador
// padrão (não dentro do app).
//
// FONTE ÚNICA: espelha a página /recomendacoes do natalierjunior.tech
// (`landing-page-produtos/src/data/recomendacoes.json`) — mesmas categorias,
// mesma ordem, mesmos textos. Ao mexer numa lista, mexa na outra: são dois
// arquivos contando a mesma história, e a que envelhecer passa a mentir.
//
// Campos do grupo:
//   id       identificador único
//   label    nome da categoria (igual ao `titulo` do site)
//   items    produtos; ausente/vazio quando a categoria é `soon`
//   soon     texto de "em breve" — a categoria aparece, mas sem produtos
//
// Campos do item:
//   id       identificador único
//   label    nome do produto (`nome` no site)
//   note     descrição curta (`nota` no site; opcional)
//   url      link do produto (`href` no site)
//   store    loja de destino (`loja` no site) — o usuário sabe para onde vai
//
// As notas do site que traziam HTML (link para as Anotações, link do canal no
// aviso de "em breve") entram aqui em texto puro: o app não tem essas páginas
// e não renderiza HTML de dados.
// ---------------------------------------------------------------------------

// Aviso de transparência — mesmo compromisso declarado na página do site.
export const ACCESSORY_DISCLOSURE_KEY = 'accessories.disclosure';

// Lojas que ENTREGAM FORA DO BRASIL. O Mercado Livre é regional: oferecer seus
// produtos a quem está com a interface em inglês é mostrar algo que a pessoa
// não consegue comprar — o mesmo problema do QR de Pix no launcher.
//
// A regra vive na LOJA, não no componente: acrescentar uma loja internacional
// (Amazon, por exemplo) passa a valer em todo lugar sem tocar em interface.
const INTERNATIONAL_STORES = new Set(['AliExpress']);

/**
 * Catálogo de acessórios para um idioma.
 *
 * Em português vai tudo. Nos demais, só o que a pessoa consegue comprar — e a
 * categoria que ficar sem nenhum item some junto, em vez de aparecer vazia.
 * As categorias "em breve" ficam nos dois: não dependem de loja.
 */
export function accessoryGroupsFor(language) {
  if (language === 'pt') return ACCESSORY_GROUPS;
  return ACCESSORY_GROUPS
    .map((g) => ({ ...g, items: (g.items || []).filter((i) => INTERNATIONAL_STORES.has(i.store)) }))
    .filter((g) => g.soon || g.items.length > 0);
}

export const ACCESSORY_GROUPS = [
  {
    id: 'ac-caixas',
    items: [
      { id: 'ac-caixas-motion', url: 'https://s.click.aliexpress.com/e/_oFBAuSG', store: 'AliExpress' },
    ],
  },
  {
    id: 'ac-fones',
    items: [
      { id: 'ac-fones-p30i', url: 'https://meli.la/2RpcD5P', store: 'Mercado Livre' },
      { id: 'ac-fones-lib4nc', url: 'https://meli.la/1uw8YD9', store: 'Mercado Livre' },
      { id: 'ac-fones-bp1', url: 'https://meli.la/1FPXjgr', store: 'Mercado Livre' },
      { id: 'ac-fones-wm01', url: 'https://meli.la/1kqYVU5', store: 'Mercado Livre' },
    ],
  },
  {
    id: 'ac-headphone',
    items: [
      { id: 'ac-head-q30', url: 'https://meli.la/28AoFMq', store: 'Mercado Livre' },
      { id: 'ac-head-q20i', url: 'https://meli.la/2cAEFt7', store: 'Mercado Livre' },
    ],
  },
  {
    id: 'ac-smartwatches',
    items: [
      { id: 'ac-watch-bip6', url: 'https://meli.la/32eeWGL', store: 'Mercado Livre' },
      { id: 'ac-watch-bal2', url: 'https://meli.la/1pqJrM7', store: 'Mercado Livre' },
      { id: 'ac-watch-act2', url: 'https://meli.la/1dCTghw', store: 'Mercado Livre' },
    ],
  },
  {
    id: 'ac-carregadores',
    items: [
      { id: 'ac-carr-100w', url: 'https://s.click.aliexpress.com/e/_oF47pqx', store: 'AliExpress' },
      { id: 'ac-carr-30w', url: 'https://s.click.aliexpress.com/e/_opUKnH1', store: 'AliExpress' },
      { id: 'ac-carr-estacao', url: 'https://s.click.aliexpress.com/e/_c4D5nHYH', store: 'AliExpress' },
    ],
  },
  {
    id: 'ac-joysticks',
    soon: true,          // texto em accessories.soon.<id>
    items: [],
  },
  {
    id: 'ac-hub',
    items: [
      { id: 'ac-hub-baseus', url: 'https://s.click.aliexpress.com/e/_c31H3iw5', store: 'AliExpress' },
      { id: 'ac-hub-vention', url: 'https://s.click.aliexpress.com/e/_c4rwQZ2h', store: 'AliExpress' },
    ],
  },
  {
    id: 'ac-osmo360',
    items: [
      { id: 'ac-osmo-cage', url: 'https://s.click.aliexpress.com/e/_c43rvubf', store: 'AliExpress' },
      { id: 'ac-osmo-bastao', url: 'https://s.click.aliexpress.com/e/_c3LHFnyH', store: 'AliExpress' },
      { id: 'ac-osmo-engate', url: 'https://s.click.aliexpress.com/e/_c4om5fa1', store: 'AliExpress' },
      { id: 'ac-osmo-peito', url: 'https://s.click.aliexpress.com/e/_c3WTRfDf', store: 'AliExpress' },
      { id: 'ac-osmo-pelicula', url: 'https://s.click.aliexpress.com/e/_c4om5fa1', store: 'AliExpress' },
    ],
  },
  {
    id: 'ac-notebook',
    items: [
      { id: 'ac-nb-pes', url: 'https://s.click.aliexpress.com/e/_c3N20o25', store: 'AliExpress' },
      { id: 'ac-nb-switch', url: 'https://s.click.aliexpress.com/e/_mMntBrH', store: 'AliExpress' },
    ],
  },
  {
    id: 'ac-controle-tv',
    items: [
      { id: 'ac-ctrl-g60s', url: 'https://s.click.aliexpress.com/e/_c4UWBp5R', store: 'AliExpress' },
      { id: 'ac-ctrl-rii', url: 'https://s.click.aliexpress.com/e/_c4l6zWFX', store: 'AliExpress' },
    ],
  },
  {
    id: 'ac-fotografia',
    items: [
      { id: 'ac-foto-tripe', url: 'https://s.click.aliexpress.com/e/_msw3XZv', store: 'AliExpress' },
      { id: 'ac-foto-bolsa-lentes', url: 'https://s.click.aliexpress.com/e/_opkn6jZ', store: 'AliExpress' },
      { id: 'ac-foto-bolsa-lateral', url: 'https://s.click.aliexpress.com/e/_oERLUg7', store: 'AliExpress' },
      { id: 'ac-foto-gatilho-cinto', url: 'https://s.click.aliexpress.com/e/_oFwPzXV', store: 'AliExpress' },
      { id: 'ac-foto-alca', url: 'https://s.click.aliexpress.com/e/_oCS67DZ', store: 'AliExpress' },
      { id: 'ac-foto-gatilhos', url: 'https://s.click.aliexpress.com/e/_oBHAgC3', store: 'AliExpress' },
      { id: 'ac-foto-cinto', url: 'https://s.click.aliexpress.com/e/_oBRvhLN', store: 'AliExpress' },
    ],
  },
];
