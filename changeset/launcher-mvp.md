# /launcher-mvp — DexArmor TV Launcher

> Command file do Claude Code. Executar dentro do repositório do launcher
> (projeto novo, separado do desktop `dexarmor/`). Especifica e constrói o MVP
> do launcher Android que substitui o Projectivy como fachada do modo TV.

---

## 1. Contexto e objetivo

O DexArmor (app desktop Electron) provisiona celulares Samsung Galaxy como TV
boxes via ADB. Hoje ele instala o Projectivy Launcher como home. Este projeto o
substitui por um launcher próprio, sob a identidade DexArmor.

**Objetivo do MVP:** ligar a TV → ver o dashboard → abrir um app com o mínimo
de passos possível, operando exclusivamente por D-pad (setas, OK, Voltar), via
controle Bluetooth ou controle remoto virtual do DexArmor (`input keyevent`).

**O que o MVP não é:** não é um concorrente do Projectivy. Sem wallpapers, sem
canais, sem plugins, sem screensaver na v1. Escopo travado no fluxo acima.

---

## 2. Princípios de design — Metro sobre BMW M

A referência de linguagem é o **Windows Phone (Metro / Modern UI)**: conteúdo
antes de cromo, tipografia como interface, tiles planos, panorama horizontal.
O Metro converge naturalmente com a identidade BMW M do DexArmor
(`DESIGN-bmw-m.md`) — plano, reto, de alto contraste — e a paleta permanece a
da marca:

- **Fundo preto puro** (`#000000`). Sem gradientes, sem imagens de fundo, sem
  sombras, sem glow. Superfícies são retângulos chapados.
- **Acento âmbar** (`#f5a623`) no papel do "accent color" do Metro: elemento
  focado e indicadores de estado. Todo o resto em escala de cinza.
- **Zero border-radius** — já é a regra do Metro e da casa.
- **Tipografia como interface.** Cabeçalhos grandes e leves no espírito do
  Segoe UI Light: **Inter Light 56sp** para os títulos do pivot, caixa baixa.
  Texto de tile em Inter Regular 20sp. Dados (relógio, telemetria, versões) em
  **JetBrains Mono**.
- **Alto contraste:** texto primário `#ffffff`, secundário `#8a8a8a`,
  inativo `#5a5a5a`, superfícies `#141414`. Nada abaixo de 4.5:1 para texto
  informativo.
- **Tiles, não listas.** Apps são **tiles retangulares planos** com o nome no
  canto inferior esquerdo — a assinatura visual do Metro. O texto continua
  sendo o protagonista; o ícone é apoio, pequeno, no canto superior esquerdo
  do tile.
- **Foco por inversão.** Tile focado inverte: fundo âmbar, texto e ícone
  pretos. É o indicador de foco de maior contraste possível numa TV a 3
  metros — dispensa borda, escala e brilho.
- **Movimento mínimo.** Duas animações permitidas, e só: transição de foco
  entre tiles (≤120ms, linear) e o deslize horizontal do panorama na troca de
  categoria (≤150ms). Aparelhos antigos são o público — desempenho é design.

### Escala de opacidade do âmbar (regra única)

Um só âmbar, três pesos — nunca outra cor de destaque:

| Peso | Uso |
| --- | --- |
| 100% `#f5a623` | Foco atual e alarme de live tile |
| 35% `#f5a623` (`0x59f5a623`) | Botão `MODO` em repouso — presente, não competindo com o foco |
| — | Todo o resto: escala de cinza |

---

## 3. Anatomia da tela — panorama único

O launcher é **um panorama horizontal contínuo** (padrão Panorama/Pivot do
Windows Phone): as cinco categorias vivem lado a lado num canvas único, e o
D-pad desliza entre elas. Verticalmente, três zonas:

```
┌──────────────────────────────────────────────────────────────────┐
│ CONFIG   MODO · dashboard                     21:47  QUA 23 JUL  │  Zona A
│                                                                  │
│ ▮ BATERIA        ▮ TEMPERATURA     ▮ ARMAZENAMENTO               │
│   84% carreg.      31°C              12,4 GB livres              │  Zona B
│                                                                  │
│ multimídia    navegação    launchers    emuladores    outros     │  Zona C1
│                                                                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│ │▪        │ │▪        │ │▪        │ │▪        │                  │
│ │         │ │         │ │         │ │         │                  │  Zona C2
│ │Netflix  │ │Prime V. │ │Disney+  │ │Max      │                  │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                  │
│ ┌─────────┐ ┌─────────┐ ...                                      │
└──────────────────────────────────────────────────────────────────┘
```

### Zona A — Barra superior
- **Canto superior esquerdo: `CONFIG`** (Inter, caixa alta, 20sp). Único
  ponto de entrada das configurações.
- **Ao lado: `MODO`** — alternador de escala da interface (ver 3.1).
- Direita: relógio + data em JetBrains Mono, atualizados por minuto. Sem
  marca no centro — no Metro, o conteúdo é a marca; o logotipo DexArmor
  aparece apenas no boot (splash de 1 quadro, estático).

### 3.1 Botão `MODO` — dashboard / TV

Botão focável imediatamente à direita de `CONFIG`, na mesma linha de base.

- **Aparência em repouso:** rótulo `MODO` em Inter caixa alta 20sp sobre
  fundo âmbar a **35% de opacidade** (`#f5a623` @ 0.35 → `0x59f5a623`), texto
  `#ffffff`. Retângulo chapado, zero border-radius, padding horizontal 16dp.
  Ao lado, em `#8a8a8a` 16sp caixa baixa, o modo ativo: `dashboard` ou `tv`.
- **Focado:** mesma regra de todo o resto — inverte para âmbar **100%** com
  texto preto. O 35% existe só para o repouso.
- **Ação (`OK`):** alterna entre os dois modos, com aplicação imediata e sem
  recriar a activity. Sem submenu, sem diálogo — um toque, um estado. O modo
  ativo persiste em DataStore.

**Modo `dashboard` (padrão):** a tela exatamente como especificada neste
documento. Escala 1.0.

**Modo `tv`:** a mesma tela, com todas as dimensões **15% menores**
(fator **0,85**) — tipografia, tiles, ícones, espaçamentos e a faixa de
telemetria. Nada é removido nem reposicionado; a interface apenas se
compacta, e a grade acomoda **mais** colunas por linha (4 → 5 na largura
padrão) e mais linhas visíveis. O efeito desejado é densidade: mais apps à
vista, menos rolagem até o alvo.

**Piso de legibilidade.** Com 0,85, o menor texto da interface (rótulos dos
live tiles, 11sp em escala 1.0) cai para ~9sp — abaixo do limite confortável
numa TV. Regra: **nenhum texto pode renderizar abaixo de 12sp efetivos**. Na
prática, defina os tamanhos base do tema de modo que 0,85 os mantenha acima
desse piso (rótulos base 14sp → 12sp em modo tv). Validar com o aparelho
ligado na TV antes de fechar a Fase 1.

**Implementação — escala interna, não DPI do sistema.** Alterar a densidade
real (`wm density`) exige `WRITE_SECURE_SETTINGS`, que o launcher não possui.
A solução é envolver a composição raiz em um `CompositionLocalProvider` com
`LocalDensity` multiplicado:

```kotlin
val factor = if (mode == Mode.TV) 0.85f else 1.0f
CompositionLocalProvider(
    LocalDensity provides Density(
        density = LocalDensity.current.density * factor,
        fontScale = LocalDensity.current.fontScale
    )
) { LauncherScreen() }
```

Isso escala dp **e** sp de uma vez, é instantâneo, reversível e não toca no
sistema — nenhum outro app do aparelho é afetado. Como a grade é responsiva
(`GridCells.Adaptive`), a contagem de colunas se ajusta sozinha; nada de
larguras fixas em px no layout.

### Zona B — Dashboard em live tiles
A "proposta de dashboard na TV" assume a forma de **três live tiles** rasos
(altura reduzida, largura igual), **somente leitura e não focáveis na v1**:
- **Bateria** — nível + estado (carregando / descarregando), via
  `BatteryManager`.
- **Temperatura** — da bateria, via `ACTION_BATTERY_CHANGED`. Acima de 42°C o
  tile inverte para âmbar (comportamento de "tile vivo": o estado muda a
  cara do tile, não só o número).
- **Armazenamento** — espaço livre, via `StatFs`. Abaixo de 2 GB, inverte
  para âmbar.
- Rótulo em Inter caixa alta `#8a8a8a`; valor grande em JetBrains Mono. Fundo
  `#141414`. Atualização por Flow, sem polling agressivo (bateria/temp por
  broadcast; armazenamento a cada 60s).
- Presente nos dois modos (o modo `tv` apenas o compacta). É o espelho, na TV,
  da Telemetria do ControlCenter do desktop. Ações tipo "pit stop" ficam para
  v2.

### Zona C — Panorama de categorias (C1: cabeçalhos · C2: grade de tiles)
- **C1 — cabeçalhos do pivot**, nesta ordem: `multimídia` · `navegação` ·
  `launchers` · `emuladores` · `outros` (Inter Light 56sp, caixa baixa —
  assinatura Metro). As quatro primeiras espelham 1:1 as pastas de `apks/` do
  DexArmor desktop; `outros` é a categoria residual (ver 3.2). Categoria
  ativa em `#ffffff`; as demais em `#5a5a5a`, parcialmente visíveis à
  direita, sugerindo a continuação do panorama.
- **C2 — grade de tiles**: `GridCells.Adaptive` (≈4 colunas em escala 1.0,
  ≈5 em modo tv), tiles na proporção ~16:10, espaçamento de 8dp (o "gutter"
  apertado do Metro). Nome no canto inferior esquerdo, ícone 28dp no canto
  superior esquerdo. Tile normal: fundo `#141414`, texto branco. Tile
  focado: **invertido em âmbar 100%**.
- A grade rola verticalmente mantendo o tile focado visível; os cabeçalhos e
  o dashboard permanecem fixos.

### 3.2 Categoria `outros`

Seção final do panorama, dedicada a **tudo que não pertence às quatro
categorias do provisionamento**: apps que o usuário instalou por conta
própria, apps da Samsung que sobreviveram à limpeza, utilitários avulsos.

- Regra de entrada: app com launcher intent que **não** consta em
  `categories.json` e **não** foi recategorizado manualmente cai aqui.
  Anteriormente o padrão era `navegação` — este documento substitui aquela
  regra.
- Sai de `outros` assim que o usuário o recategoriza nas configurações (a
  escolha do usuário vence sempre) ou assim que passa a constar no
  `categories.json` de uma versão futura.
- É a única categoria que pode ficar vazia. Quando vazia, o cabeçalho
  permanece visível (a estrutura do panorama é fixa) e a grade exibe uma
  linha em `#5a5a5a`: `nenhum app aqui`.
- Ordenação padrão: alfabética. Igual às demais, aceita reordenação manual.

---

## 4. Modelo de navegação — panorama e camadas

Três camadas de foco:

```
Camada 0  Barra superior — CONFIG · MODO
Camada 1  Cabeçalhos do pivot
Camada 2  Grade de tiles (panorama)
```

**Regras:**
1. **Estado inicial (boot / retorno ao home):** foco já na Camada 2, no
   primeiro tile da última categoria usada. Caminho crítico = **1 passo**:
   ligar → OK → app aberto. Persistir última categoria e último tile focado
   em DataStore.
2. **Panorama contínuo na Camada 2:** `←`/`→` movem entre tiles da linha;
   `→` além da última coluna desliza para a **primeira coluna da categoria
   seguinte** (e `←` na primeira coluna, para a última da anterior). As cinco
   grades formam um canvas horizontal único — trocar de categoria não exige
   subir de camada. Nas extremidades do panorama (antes de multimídia, depois
   de outros), o foco para; sem loop circular na v1.
3. `↑` a partir da primeira linha da grade → Camada 1 (cabeçalho ativo).
   Na Camada 1, `←`/`→` trocam de categoria diretamente (a grade desliza
   junto). `↑` a partir dos cabeçalhos → Camada 0, em `CONFIG`. Na Camada 0,
   `←`/`→` alternam entre `CONFIG` e `MODO`. `↓` faz o caminho inverso,
   voltando à camada de baixo.
4. `OK` na Camada 2 → abre o app (`launchIntentForPackage`). `OK` na Camada 1
   → desce ao primeiro tile da categoria. `OK` em `CONFIG` → painel de
   configurações. `OK` em `MODO` → alterna dashboard ⇄ tv na hora, mantendo o
   foco no próprio botão.
5. `VOLTAR`: das configurações → tela principal; da Camada 1 ou 0 → Camada 2;
   na Camada 2 → **nada** (launcher é o fim da pilha; nunca fechar, nunca
   piscar).
6. Foco jamais "se perde": tecla sem alvo válido mantém o foco onde está. Ao
   voltar de um app (`onResume`), restaurar exatamente o foco anterior. A
   troca de modo **não** altera o foco nem a posição de rolagem.

---

## 5. Configurações (painel Metro, vindo da esquerda)

Painel lateral esquerdo (40% da largura, fundo `#0a0a0a`, filete direito de
1px âmbar), título `configurações` em Inter Light 44sp caixa baixa, itens em
lista de texto com foco por inversão (item focado: fundo âmbar, texto preto).
Itens do MVP:

1. **Reordenar apps** — mover tile dentro da categoria (OK entra em modo
   mover, setas movem, OK confirma).
2. **Ocultar / mostrar apps** — checklist por categoria.
3. **Recategorizar app** — mover um app para outra categoria (inclusive tirar
   de `outros` ou mandar para lá).
4. **Formato do relógio** — 24h / 12h.
5. **Sobre** — versão (`versionName` + `versionCode`) em JetBrains Mono, para
   suporte e para o check de atualização do DexArmor.

O modo dashboard/tv **não** aparece aqui — ele tem botão próprio na barra
superior, e duplicá-lo criaria dois caminhos para o mesmo estado. Sem mais
nada na v1. Tudo persiste em DataStore (Preferences).

---

## 6. Catálogo e categorização dos apps

- Fonte da lista: `PackageManager.queryIntentActivities` com
  `ACTION_MAIN` + `CATEGORY_LAUNCHER`.
- **Mapa de categorias embutido:** `assets/categories.json` — dicionário
  `packageName → categoria`, gerado a partir do catálogo `tasks.js` do
  desktop (manter os dois em sincronia é tarefa do repositório do desktop;
  anotar no README). Só as quatro categorias do provisionamento aparecem no
  JSON; `outros` nunca é atribuído explicitamente.
- App instalado que não consta no mapa → **outros**, reclassificável nas
  configurações (a escolha do usuário, em DataStore, sempre vence o JSON).
- Apps de sistema e o próprio launcher: fora da grade por padrão.
- Ícones: `PackageManager.getApplicationIcon`, cacheados em memória. Sem
  busca de banners de TV — os apps instalados são versões mobile. O tile
  Metro depende do nome, não do ícone: apps sem ícone legível continuam
  perfeitamente utilizáveis.

---

## 7. Arquitetura técnica

- **Kotlin + Jetpack Compose** (Compose foundation pura; o design Metro é
  simples demais para justificar `tv-material` — avaliar apenas se
  simplificar o foco).
- **minSdk 26 · targetSdk atual.** Cobre os Galaxy com saída HDMI/DeX (S8+ em
  diante).
- **Módulo único**, sem injeção de dependência, sem multi-module:

```
dexarmor-launcher/
├── app/src/main/
│   ├── AndroidManifest.xml        intent-filter HOME + DEFAULT; landscape fixo;
│   │                              android:stateNotNeeded="true"
│   ├── assets/categories.json
│   └── java/tech/dexarmor/launcher/
│       ├── MainActivity.kt        única activity; captura de teclas; onResume
│       ├── data/
│       │   ├── AppRepository.kt   PackageManager → List<AppEntry>; cache de ícones
│       │   ├── CategoryMap.kt     JSON embutido + overrides do usuário + fallback "outros"
│       │   ├── Prefs.kt           DataStore: última categoria, foco, ordem, ocultos, relógio, modo
│       │   └── Telemetry.kt       bateria, temperatura, armazenamento (Flow)
│       └── ui/
│           ├── theme/Theme.kt     cores (incl. âmbar 35%), tipografia (Inter Light/Regular + JetBrains Mono)
│           ├── ScaleMode.kt       enum Mode + CompositionLocalProvider de LocalDensity (1.0 / 0.85)
│           ├── LauncherScreen.kt  composição das zonas A/B/C
│           ├── TopBar.kt          CONFIG + MODO + relógio
│           ├── LiveTiles.kt       dashboard (3 tiles de telemetria)
│           ├── PivotHeaders.kt    cabeçalhos do panorama (5 categorias)
│           ├── TileGrid.kt        grade adaptativa + rolagem que segue o foco + estado vazio
│           ├── PanoramaState.kt   deslize horizontal entre as 5 categorias
│           ├── SettingsPanel.kt   painel lateral
│           └── FocusModel.kt      máquina de estados das 3 camadas + panorama
├── build.gradle.kts
└── README.md                      build, integração com o desktop, sincronia do categories.json
```

- **Foco:** centralizar a lógica em `FocusModel.kt` (estado explícito: camada
  atual + índice na barra superior + categoria + linha/coluna), tratando
  `KeyEvent` na raiz em vez de depender só do focus traversal do Compose.
  Determinismo acima de conveniência. `PanoramaState` só executa o deslize
  que o `FocusModel` decide — nunca o contrário.
- **Escala:** `ScaleMode.kt` é a única fonte da densidade. Nenhum outro
  arquivo pode usar valores em px nem checar o modo — todos trabalham em dp/sp
  e a escala acontece uma vez, na raiz.
- **Orientação:** `screenOrientation="landscape"` — o DexArmor já força a
  resolução 16:9; o launcher assume esse quadro.
- **Manter-se home:** nada a fazer no app; quem define é o DexArmor via
  `cmd package set-home-activity tech.dexarmor.launcher/.MainActivity`.

---

## 8. Integração com o DexArmor desktop

(Tarefas do repositório do desktop, listadas aqui como contrato.)

1. APK entra em `apks/launchers/{Launcher} DexArmor TV.apk` e no `tasks.js`,
   substituindo o Projectivy no preset recomendado.
2. Após instalar: `cmd package set-home-activity` (elimina o passo manual de
   escolher o home — redução de passos também no provisionamento).
3. **Atualização:** comparar `dumpsys package tech.dexarmor.launcher | grep
   versionCode` com o `versionCode` do APK embutido; reinstalar com `-r` se
   maior.
4. Check-up do desktop passa a verificar: launcher instalado + definido como
   home + versão atual.

---

## 9. Fases de execução (para o Claude Code)

**Fase 1 — Esqueleto navegável (sem dados reais)**
Projeto Gradle, tema (incluindo o âmbar a 35%), zonas A/B/C com dados mock,
`FocusModel` + `PanoramaState` completos e as regras da seção 4 funcionando
com D-pad, incluindo o deslize contínuo entre as 5 categorias e a Camada 0
com `CONFIG`/`MODO`. `ScaleMode` já operante (o botão alterna a escala com
dados mock). *Critério: navegar pelas 3 camadas, atravessar as 5 categorias
e alternar dashboard ⇄ tv apenas com setas + OK + Voltar, sem nunca perder o
foco.*

**Fase 2 — Dados reais**
`AppRepository`, `categories.json`, fallback para `outros`, ícones, abertura
real de apps, live tiles com telemetria ao vivo (incluindo a inversão âmbar
por limiar), relógio. *Critério: os 4 grupos do provisionamento aparecem nas
categorias corretas, e um app instalado à mão pelo usuário aparece em
`outros`.*

**Fase 3 — Persistência e configurações**
DataStore (última categoria/foco, ordem, ocultos, overrides de categoria,
relógio, modo) + `SettingsPanel` com os 5 itens. *Critério: reiniciar o
aparelho e voltar ao mesmo estado, inclusive no modo escolhido; caminho ligar
→ OK → app em 1 passo.*

**Fase 4 — Integração e resistência**
Manifest final (HOME/DEFAULT, `stateNotNeeded`), teste como home real via
`set-home-activity`, comportamento sob memória baixa (morte e recriação do
processo → restaurar estado), README de integração. *Critério: definido como
home, sobrevive a reboot e a kill do processo sem tela branca nem perda de
foco.*

**Regra geral:** encerrar cada fase com o app compilando e navegável. Nenhuma
fase introduz recurso fora deste documento — feature nova exige revisão do
command file antes de código.

---

## 10. Critérios de aceite do MVP

- [ ] Operável 100% por D-pad (BT e `input keyevent`), foco nunca se perde.
- [ ] Ligar → OK → app: 1 passo no caso comum.
- [ ] Panorama contínuo atravessa as 5 categorias sem subir de camada.
- [ ] `outros` recebe todo app não classificado; recategorização funciona nos
      dois sentidos; categoria vazia exibe `nenhum app aqui` sem quebrar o
      panorama.
- [ ] Botão `MODO` ao lado de `CONFIG`, âmbar a 35% em repouso e 100% quando
      focado, alternando dashboard ⇄ tv com um único OK.
- [ ] Modo `tv` reduz toda a interface em 15% (fator 0,85 em dp e sp) sem
      alterar a densidade do sistema, sem exigir permissão especial e sem
      mover o foco; nenhum texto fica abaixo de 12sp efetivos.
- [ ] Cabeçalhos de pivot em Inter Light caixa baixa; tiles com nome no canto
      inferior esquerdo; foco por inversão âmbar.
- [ ] CONFIG no canto superior esquerdo, painel lateral com os 5 itens.
- [ ] Live tiles com bateria, temperatura e armazenamento ao vivo, invertendo
      para âmbar nos limiares definidos.
- [ ] Preto puro, âmbar só em foco/estado/MODO, zero border-radius,
      superfícies chapadas sem sombra.
- [ ] Fluido em um Galaxy S8/S9 nos dois modos (sem jank na rolagem, no
      deslize do panorama nem na troca de escala).
- [ ] Voltar nunca fecha o launcher; retorno de app restaura o foco exato.
