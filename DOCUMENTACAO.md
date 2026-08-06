# Revya — Documentação do Projeto

> Aplicativo desktop que transforma celulares Samsung compatíveis (saída HDMI +
> modo DeX) em dispositivos de mídia para TV, com o mínimo de esforço para quem
> não tem experiência com Android.

---

## 1. Visão geral

O Revya é um programa de **provisionamento**: ele conecta-se a um celular
Samsung via ADB e aplica uma série de procedimentos que o preparam para funcionar
como uma "TV box" — remove apps desnecessários, instala o launcher de TV próprio
e ajusta o sistema para uso na tela grande.

O público-alvo são pessoas **sem conhecimento técnico** que querem reaproveitar
um celular antigo para assistir TV (com controle) e jogar. Por isso, a interface
guia o usuário passo a passo, e a complexidade do ADB fica escondida por trás de
botões simples.

### O que o programa faz no celular

- **Remove** aplicativos pré-instalados que não serão usados (Bixby, Galaxy
  Store, apps de escritório, redes sociais).
- **Instala** o **Revya TV**, o launcher próprio — o único APK embutido.
- **Personaliza** o sistema para uso em TV (tela sempre ligada, animações
  reduzidas, orientação travada, launcher de TV como padrão, etc.).
- **Recebe** os aplicativos e arquivos do usuário por arrastar-e-soltar
  ("Enviar para o celular"): `.apk`/`.apkm`/`.xapk` instalam direto, e filmes,
  músicas e ROMs vão para as pastas do armazenamento.

### O que o programa NÃO faz (limites honestos)

- **Não vira Android TV de verdade.** Isso exigiria trocar o firmware (ROM). O
  que se cria é uma *experiência* de TV sobre o Android/DeX, com um launcher
  apropriado.
- **Não usa root.** Tudo é feito via ADB com desinstalação "por usuário"
  (`pm uninstall --user 0`), que é reversível por reset de fábrica — mais seguro,
  porém com algumas limitações (ver seção 6).
- **Não bloqueia atualizações de forma absoluta.** Desativa as automáticas, mas
  uma atualização forçada via cabo (Smart Switch) ainda seria possível.
- **Não distribui aplicativos de terceiros.** Desde 27/07/2026 o programa faz
  apenas a *transformação* do celular; streaming, navegadores, emuladores e
  jogos são instalados pelo próprio usuário, a partir dos arquivos dele
  (decisão de licenciamento — ver seção 6).

---

## 2. Arquitetura e composição

O projeto é um app **Electron** (desktop) com interface em **React + Material
UI**. O build do front-end é feito pelo **Vite**.

### Estrutura de pastas

```
revya/
├── package.json              Dependências, scripts e config do empacotador
├── vite.config.mjs           Build do renderer (React)
├── .gitignore                Ignora binários, APKs e saídas de build
│
├── src/
│   ├── adb/
│   │   ├── adb.js            Wrapper de baixo nível em torno do adb (uma função por comando)
│   │   ├── adbDiagnostics.js Diagnóstico de estados do ADB em linguagem simples
│   │   └── adbOrchestrator.js Detecção + recuperação automática do servidor ADB
│   ├── main/
│   │   ├── main.js           Processo principal Electron + handlers IPC
│   │   ├── preload.js        Ponte segura (contextBridge) main <-> renderer
│   │   ├── runner.js         Orquestrador: task -> comandos ADB (+ verificação e check-up)
│   │   ├── revertStore.js    Registro de reversão em disco, por serial de fábrica
│   │   └── scrcpy.js         Espelhamento da tela do aparelho (scrcpy)
│   └── renderer/
│       ├── index.html        Entrada HTML (Vite)
│       ├── main.jsx          Bootstrap do React
│       ├── Root.jsx          Gate: tela "Conecte seu Galaxy" antes do App
│       ├── App.jsx           Layout de 3 colunas e todo o estado da aplicação
│       ├── theme/
│       │   └── theme.js      Tema MUI customizado (escuro, acento âmbar)
│       ├── data/
│       │   ├── tasks.js      Catálogo de modificações, preset recomendado e acessórios
│       │   ├── tutorial.js   Passos do tutorial de ativação do ADB
│       │   ├── dexGuide.js   Conteúdo do guia "Desative o DeX"
│       │   └── firstSetupGuide.js Conteúdo do guia de primeira configuração
│       ├── screens/
│       │   └── ConnectPhoneScreen.jsx  Tela-gate com diagnóstico ao vivo do ADB
│       └── components/
│           ├── TaskPanel.jsx        Aba esquerda — modificações, perfis, check-up e reversão
│           ├── ProfilesPanel.jsx    Aba Perfis — salvar/aplicar a interface com nome
│           ├── DevicePanel.jsx      Aba central — aparelho, preset, Wi-Fi, espelhamento, alternar modo
│           ├── ControlCenter.jsx    Coluna direita — "Central de Controle" (telemetria + limpeza + progresso)
│           ├── HealthPanel.jsx      Telemetria (só leitura): bateria, temperatura, armazenamento
│           ├── CleanupPanel.jsx     "Pit stop": limpeza de cache com cronômetro + relatório
│           ├── ProgressPanel.jsx    Log passo a passo da execução (dentro da Central)
│           ├── RemoteControl.jsx    Controle remoto virtual (teclas via ADB + Girar tela), encaixado à direita
│           ├── SendOverlay.jsx      "Enviar para o celular" — arrastar e soltar arquivos/APKs
│           ├── ModeSwitchDialog.jsx Ponte de modos celular ⇄ TV (adormece/acorda o perfil)
│           ├── DeviceStatusCard.jsx Cartão de diagnóstico da tela de conexão
│           ├── TvResolutionDialog.jsx Pergunta da resolução da TV (preset)
│           ├── CheckupDialog.jsx    Verifica se os ajustes continuam valendo
│           ├── ResetDialog.jsx      Reversão (+ reset de interface + exportar/importar registro)
│           ├── DexGuideDialog.jsx   Guia "Desative o DeX"
│           ├── FirstSetupGuideDialog.jsx Guia de primeira configuração (1x por aparelho)
│           ├── PhoneMock.jsx        Mockup do celular (vira TV ao final)
│           ├── PhoneScreen.jsx      Conteúdo da tela do celular por fase
│           ├── PhoneAccessories.jsx Acessórios flutuantes ao redor do celular
│           ├── CloseDialog.jsx      Pop-up de fechamento (apresenta acessórios)
│           └── SquareIcon.jsx       Indicador quadrado reutilizado nas células de telemetria
│
├── platform-tools/           Binários ADB por plataforma (você adiciona)
│   ├── win/                  adb.exe + DLLs
│   ├── mac/                  adb (sem extensão)
│   └── linux/                adb (sem extensão)
│
├── scrcpy/                   Release oficial do scrcpy por plataforma (você
│   ├── win|mac|linux/        adiciona; o CI baixa sozinho) — espelhamento
│   └── README.txt            Instruções de download
│
├── apks/                     Só APK PRÓPRIO (ver apks/README.txt)
│   └── launchers/            {Launcher} Revya TV.apk
│
└── .github/workflows/
    ├── build.yml             CI: instaladores das 3 plataformas (baixa ADB + scrcpy)
    └── README.md             Como usar o workflow
```

### As três colunas da interface

1. **Esquerda (TaskPanel)** — seletor entre *Modificações*, *Perfis* e
   *Acessórios*. Em Modificações ficam os grupos de tarefas (remover, instalar,
   personalizar), recolhidos em acordeões — um clique expande — e, ao final, a
   seção **Manutenção**: Restaurar interface, Check-up, Reversão completa,
   reversão item a item e o **Diário de trocas** (histórico do aparelho em
   linguagem simples). Em Perfis, a interface que funcionou é salva com um
   nome ("Sala 4K") e reaplicada com um clique. Em Acessórios, uma vitrine de
   produtos com links externos.
2. **Centro (DevicePanel)** — o celular Samsung como peça central. Guia o
   tutorial, mostra o aparelho reconhecido, e durante a execução espelha o
   progresso. Ao final, o celular **vira TV** (gira e cresce). Sob o celular,
   um **chip de estado do modo** sempre visível: "Modo TV ativo", "Modo
   celular" ou "Troca de modo incompleta" (clicável — retoma de onde parou).
   É daqui que se dispara a alternância de modos (celular ⇄ TV) e o
   espelhamento.
3. **Direita (ControlCenter — "Central de Controle")** — em três seções de
   altura igual, cada uma com rolagem própria: **Telemetria** (bateria,
   temperatura e armazenamento, só leitura — `HealthPanel`), **Pit Stop**
   (limpeza de cache com cronômetro e relatório — `CleanupPanel`) e
   **Progresso** (o log passo a passo da execução, com status por tarefa —
   `ProgressPanel`). O visual segue uma referência de "pit wall" BMW M
   (`DESIGN-bmw-m.md`).

Além das três colunas, dois elementos aparecem sobre a tela quando fazem
sentido:

- **Controle remoto virtual (`RemoteControl`)** — encaixado rente à borda
  direita, ao lado do log. Cada botão manda uma tecla via ADB (`input
  keyevent`) — setas, OK, Voltar, Início, volume, play/pause e **Girar tela**.
  Funciona por USB e Wi-Fi; some quase por completo em repouso e reaparece no
  hover; desabilita durante execuções.
- **Enviar para o celular (`SendOverlay`)** — arrastar qualquer arquivo para a
  janela transforma o app inteiro em área de destino: solte um `.apk` em
  "Instalar no celular" ou um arquivo comum em Downloads / Filmes / Músicas /
  ROMs (ver seção 5).

---

## 3. Como funciona por dentro

### Fluxo de uso

1. O usuário abre o programa na tela-gate **"Conecte seu Galaxy"**, com
   diagnóstico ao vivo do ADB (detecção, recuperação automática do servidor e
   passos em linguagem simples para cada estado).
2. Aparelho pronto → o app de 3 colunas abre, com a ficha técnica no centro.
3. Caminho rápido: **"Configuração recomendada"** pergunta a resolução da TV
   num diálogo e aplica o preset curado em um clique. Caminho detalhado: marcar
   modificações à esquerda e usar **"Aplicar seleção manual"**.
4. Cada tarefa é executada e **verificada** no aparelho. As que dão certo ficam
   **riscadas e travadas**, e o estado anterior é registrado para reversão.
5. Concluída a primeira configuração, o celular **se transforma em TV**
   (horizontal, maior). O relatório da execução pode ser salvo em `.txt`.
6. A qualquer momento: **"Ver tela do celular"** espelha o aparelho numa janela
   controlável por mouse (scrcpy); **"Usar por Wi-Fi"** dispensa o cabo;
   **"Check-up do aparelho"** confere se os ajustes continuam valendo; e
   **"Reverter alterações"** desfaz tudo na ordem inversa da aplicação.

### Separação de responsabilidades (decisão de segurança)

- **Toda a lógica ADB roda no processo `main`**, nunca no renderer.
- `contextIsolation` ligado e `nodeIntegration` desligado: o renderer (a UI) não
  tem acesso direto ao Node. Ele só conversa com o main por uma ponte
  (`preload.js`) que expõe funções controladas, entre elas: detecção
  (`listDevices`, `describeDevice`, `checkDevices`), execução (`runTask`,
  `verifyTask`), reversão (`revertCount/List/One/Export/Import`), alternância de
  modos (`modeSwitchOne`, `modePreflight`, `modeGetPrefs/SetPrefs`), perfis
  nomeados (`profilesList/Save/Delete`), Central de Controle (`getHealth`,
  `cleanPreview`, `cleanCaches`, `openCleanLogs`), controle remoto
  (`sendRemoteKey`, `rotateScreen`), envio de arquivos (`getFilePath`,
  `sendFile`, `sendApk`, `cancelSend`, `getSendFreeSpace`, `onSendProgress`),
  conveniências (`enableWifi`, `startMirror`, `saveReport`) e o pop-up de
  fechamento. **Toda a lógica ADB roda no main**; o renderer nunca monta
  caminhos nem comandos.
- Links externos (`target="_blank"`) abrem no **navegador padrão** do sistema
  (`shell.openExternal`), nunca numa janela do Electron.

### Catálogo separado da execução

- `data/tasks.js` descreve **o quê** fazer (lista de pacotes, chaves de
  configuração, APKs). É um arquivo de dados, fácil de auditar e editar sem
  mexer em lógica.
- `runner.js` decide **como** executar cada tipo de tarefa.

Isso permite revisar a lista de pacotes a remover — onde um erro poderia
deixar o aparelho instável — sem ler código de execução.

### Tipos de tarefa (`kind`)

| kind       | o que faz                                                        |
|------------|------------------------------------------------------------------|
| `remove`   | Desinstala pacotes por usuário (`pm uninstall --user 0`)         |
| `install`  | Instala um APK (local ou por URL com checksum SHA-256 opcional; suporta `.apkm`/`.xapk`) |
| `setting`  | Aplica uma configuração de sistema, com verificação              |
| `settings` | Aplica várias configurações relacionadas de uma vez              |
| `home`     | Define o launcher de TV como tela inicial                        |
| `rotate`   | Trava a rotação em paisagem e força os apps a respeitarem (aceita posição explícita 0–3) |
| `wmsize`   | Força resolução 16:9 (`wm size`) + densidade pareada (`wm density`) |
| `density`  | Ajusta só a densidade da interface (dpi): padrão / menor / maior  |
| `dnd`      | Ativa o Não Perturbe (modo TV) via gerenciador de notificações   |

Todo tipo tem três operações no `runner.js`: **aplicar** (capturando o estado
anterior), **reverter** (restaurar o estado capturado) e **verificar**
(check-up: o efeito continua valendo?).

### Registro de reversão

Antes de alterar qualquer coisa, o app grava como o aparelho estava
(`revertStore.js`, na pasta `userData` do Electron — um arquivo por aparelho).
Regras importantes:

- O registro é indexado pelo **serial de fábrica** (`ro.serialno`), estável
  entre conexões USB e Wi-Fi.
- **Falha no meio de uma task** (ex.: 3 de 5 pacotes removidos) ainda registra
  a reversão do que foi aplicado (`partialRevert`).
- **Reaplicar uma task não sobrescreve o estado original** — as entradas
  passam por um merge que preserva o valor mais antigo (o do usuário).
- A reversão executa na **ordem inversa** da aplicação (como uma pilha), para
  tasks sobrepostas (ex.: duas resoluções) restaurarem o estado correto.
- O registro pode ser **exportado/importado** (JSON) para reverter a partir de
  outro computador.

### Ponte de modos (celular ⇄ TV)

Depois de configurado, o aparelho pode **alternar** entre o modo TV e o uso
normal como celular, sem desinstalar nada (apps, launcher e logins permanecem):

- **Voltar ao celular** (`'phone'`) — *adormece* as tarefas de modo: fotografa o
  modo TV como está **agora** (perfil vivo, preservando personalizações feitas
  ao longo dos dias), devolve os ajustes originais e marca as entradas como
  dormentes.
- **Ativar modo TV** (`'tv'`) — reaplica o perfil salvo, exatamente como o
  usuário o deixou da última vez.

O diálogo (`ModeSwitchDialog`) segue um **fluxo robusto**: confirmação/contagem
→ pré-checagem (aparelho vivo, tela pronta, launcher presente) → execução item a
item onde um obstáculo vira **pergunta** (Tentar de novo / Pular / Reinstalar /
Parar), nunca um aviso às cegas → conferência final (só leitura) → resumo
honesto com "Corrigir agora". Há quatro variantes: `manual` (botão da lateral),
`auto` (ponte automática ao conectar, com contagem de 10 s e Cancelar — regida
pela preferência `autoTv` por aparelho), `resume` (uma troca anterior ficou no
meio — por cabo, bloqueio ou "parar por aqui" — e o app oferece **concluir de
onde parou**, marcado em `pendingSwitch`) e `reset` (o **reset de interface**,
abaixo).

### Reset de interface (restaurar a interface original do celular)

O registro guarda **três camadas por ajuste**: `revert` (o estado ORIGINAL da
primeira aplicação, que o merge preserva para sempre), `phoneRevert` (o
retrato "vivo" do modo celular, refotografado a cada ida ao TV) e `task` (o
perfil TV). Se o `phoneRevert` for capturado num momento em que o aparelho
ainda carregava valores de TV (troca interrompida, ajustes sobrepostos), toda
volta ao celular passa a devolver uma interface torta.

Para esse caso existe o botão **"Restaurar interface do celular"** (na
lateral esquerda, entre o Check-up e a Reversão completa — e também dentro do
diálogo da Reversão): reverte todas as entradas de modo — inclusive dormentes
— para a camada **original** (`layer: 'original'` + `force` no
`sleepOneImpl`), apaga o `phoneRevert` contaminado e marca tudo dormente.
Apps, arquivos, perfis nomeados e o perfil TV ficam intactos — "Ativar modo
TV" continua funcionando depois. Não grava `pendingSwitch` (interrompido, é
só usar o botão de novo).

Proteção relacionada no `revert:one`: uma entrada **dormente** só é descartada
("Já estava desfeito") depois de **conferir no aparelho** que o estado
original vale; se não vale, a reversão executa de verdade — sem isso, uma
Reversão completa podia apagar o estado original do registro com o aparelho
ainda em modo TV (caso real do S21 FE em 21/07/2026).

Três blindagens completam a ponte:

- **Vacina na captura** (`captureLooksLikeTv`, no runner): na ida ao modo TV,
  um retrato "de celular" com cara de TV (o valor que o próprio modo TV
  aplica; qualquer override de resolução; dpi da tabela de TV; DND já em
  prioridade) é **descartado** — cai para o `phoneRevert` anterior ou o
  original. É o que impede a contaminação de nascer.
- **Diário de trocas** (`journal` no arquivo do aparelho, máx. 80 eventos):
  cada alternância anota um resumo (direção, variante, ok/aviso/pulado/
  bloqueado), e a vacina/o guard anotam `captura-descartada` e
  `dormente-restaurado` — diagnóstico sem depender de memória.
- **Espelhamento recriado após a troca**: mudança de resolução pode degradar o
  stream do scrcpy até a sessão ser recriada; ao concluir uma alternância com
  o espelhamento aberto, o app o reinicia sozinho.

---

## 4. Catálogo atual de modificações

### Remover apps (4)
Bixby · Galaxy Store · Apps de escritório · Redes sociais pré-instaladas

### Instalar o launcher de TV (1)
**Revya TV** — o launcher próprio, padrão do modo TV (ligado ao tweak
`tw-home`). É o **único** APK embutido no programa.

O catálogo de apps de terceiros (streaming, ferramentas, emuladores e o
Projectivy) foi removido em **27/07/2026**: redistribuir o APK de outra empresa
dentro de um produto vendido é risco legal do projeto. No lugar dele, o grupo
mostra um aviso com o guia **"Como instalar apps e enviar arquivos"**
(`data/sideloadGuide.js` + `SideloadGuideDialog.jsx`), que ensina o
arrastar-e-soltar. Os arquivos saíram de `apks/` para
`~/revya-apks-removidos/`.

O launcher é instalado a partir do APK offline em `apks/launchers/` pelo
caminho único `installApkFile()` do runner — que aceita `.apk`, `.apkm` e
`.xapk` (bundles são extraídos e instalados via `install-multiple`) e é o mesmo
usado pelo envio por arrastar-e-soltar.

### Personalizar sistema (19)
Cada opção tem um indicador "?" que expande uma explicação curta do porquê.
Os ajustes **de interface** (fonte, resolução, tamanho da interface, rotação)
levam o selo *ajustável*: podem ser trocados quantas vezes for preciso, até a
interface ideal; os demais aplicam uma vez e ficam riscados/travados.

| Modificação                          | Efeito                                             |
|--------------------------------------|----------------------------------------------------|
| Manter tela sempre ligada            | A TV não apaga sozinha durante o uso               |
| Proteger a bateria (carga até 85%)   | Aparelho 24h no carregador sem degradar a bateria  |
| Desativar atualizações automáticas   | Evita que uma atualização desfaça a configuração   |
| Reduzir animações                    | Navegação mais rápida (3 escalas → 0)              |
| Tamanho da fonte (3 opções)          | Normal / maior (padrão TV) / bem maior — ajustável |
| Forçar tela na horizontal            | TV é sempre paisagem, mesmo em apps teimosos       |
| Não perturbe (modo TV)               | Sem notificações/chamadas por cima do filme        |
| Navegação por gestos                 | Sem botões ocupando a tela                         |
| Remover bloqueio de tela             | Liga direto no conteúdo                            |
| Usar launcher de TV como padrão      | Abre direto na tela de TV (Projectivy)             |
| Resolução Full HD / 2K / 4K          | Força 16:9 + densidade de TV (320/480/640 dpi) — o conteúdo preenche a TV sem cortes; ajustável |
| Interface padrão / menor / maior     | dpi pareado com a resolução, −20% ou +20% — ajustável |
| Silenciar sons de toque              | Sem clique a cada toque (2 chaves)                 |

### Configuração recomendada (preset de 1 clique)

O botão **"Configuração recomendada"** (painel central) pergunta a resolução da
TV (Full HD / 2K / 4K / "Não sei" → Full HD) e aplica o conjunto curado —
**sem desinstalar nada**: Projectivy instalado e definido como padrão, tela
sempre ligada, proteção de bateria, animações reduzidas, fonte maior,
paisagem forçada, Não Perturbe, sons silenciados e a resolução escolhida.
Ficam de fora, por serem decisões do usuário: as remoções de apps (Bixby,
Galaxy Store, escritório, redes sociais, agentes de atualização — disponíveis
na seleção manual), bloqueio de tela e apps de streaming. A lista vive em
`RECOMMENDED_TASK_IDS` (`tasks.js`).

### Acessórios recomendados
Vitrine com três grupos (Controles e joysticks · Vídeo e conexão · Energia e
suporte), prontos para receber links de produtos — abrem no navegador padrão.

---

## 5. Últimas atualizações realizadas

Esta seção registra as mudanças mais recentes do projeto.

### 21/07/2026 — Reset de interface + fim do descarte cego de dormentes

Caso real: após dias de alternâncias, a interface de celular de um S21 FE
"não encaixava mais" — o retrato vivo do modo celular (`phoneRevert`) havia
sido capturado com valores de TV, e a Reversão completa descartou as entradas
dormentes sem tocar no aparelho, perdendo o estado original (diagnóstico em
`changeset/TESTES-21-07-2026.md`). Respostas (ver
`changeset/mudanças-21-07-2026.md` e o plano em
`changeset/PLANO-ACAO-21-07-2026.md`):

- **Reset de interface** — botão "Restaurar interface do celular" na lateral
  esquerda (e no diálogo da Reversão): devolve a interface ao estado original
  da primeira configuração mantendo apps e o perfil TV (ver seção 3).
- **`revert:one` confere antes de descartar** uma entrada dormente; se o
  estado original não vale no aparelho, reverte de verdade.
- **Vacina na captura do perfil celular** — retrato com "cara de TV" não vira
  `phoneRevert` (ver seção 3); descarte anotado no diário.
- **Diário de trocas** no arquivo do aparelho e **espelhamento recriado**
  automaticamente após cada alternância.
- **Guia de primeira configuração** — ao conectar um aparelho sem nenhuma
  configuração, um guia único explica a filosofia de uso: monte o setup de TV
  primeiro, salve como perfil quando ficar ideal e depois só alimente de
  conteúdo (mudanças repetidas de interface podem atrapalhar a alternância);
  se a tela do celular desandar, use o Reset de interface. Aparece uma vez
  por aparelho (`prefs.introSeen`, serial estável) e pode ser reaberto pelo
  botão discreto "Guia de primeiros passos" na coluna esquerda.
- **Chip de estado do modo** sob o celular (TV ativo / celular / troca
  incompleta clicável) e **seção "Manutenção"** na coluna esquerda, com o
  diário de trocas visível — encerrando as 4 fases do plano de 21/07.

O ciclo inteiro foi **validado em 3 aparelhos reais** na noite de 21/07 —
S23 Ultra (One UI/A16), S21 FE (One UI/A16) e Galaxy S8 (LineageOS 21/A14):
24 trocas registradas no diário, 0 avisos, 0 bloqueios, incluindo ponte
automática e retomada de troca interrompida. Relato em
`changeset/TESTES-21-07-2026-validacao-3-aparelhos.md`; resumo temático em
`changeset/CHANGESET-manutencao-experiencia.md`.

### 20/07/2026 — "Enviar para o celular" (arrastar e soltar)

Arrastar qualquer arquivo para a janela do Revya abre um destino em tela
cheia: solte um `.apk` em **"Instalar no celular"** (instala direto via ADB) ou
um arquivo comum em **Downloads / Filmes / Músicas / ROMs** (pastas fixas em
`/sdcard`). Vários arquivos são processados em fila. Detalhes desta rodada (ver
`changeset/mudanças-20-07-2026.md`):

- **Barra de progresso que cresce de verdade** — o `adb push` só imprime o
  percentual (`[ 42%]`) quando a saída é um terminal (TTY); no app empacotado a
  saída é redirecionada e o adb não emite nada até o fim. A barra ficava em 0% e
  pulava para 100%. Agora o progresso real vem de **sondar o tamanho já gravado
  no aparelho** (`stat -c %s` a cada ~900 ms); quando não dá para medir, a barra
  fica **animada** com uma mensagem viva (tamanho + tempo decorrido) para nunca
  parecer travada.
- **Botão "Cancelar"** — encerra o `adb push`/instalação em andamento
  (`AbortSignal`) e para a fila; os itens que não começaram ficam "Cancelado".
- **Checagem de espaço antes de enviar** — se os arquivos não couberem no
  `/sdcard`, avisa **"Espaço insuficiente"** (com quanto ocupam × quanto há
  livre) e sugere a Limpeza, em vez de falhar no meio.
- **Erros traduzidos** — mensagens do adb viram frases claras (sem espaço,
  desconectado, permissão negada, APK inválido, **transferência interrompida**).
- **Botão "Tentar de novo"** — ao terminar com falhas/cancelamentos, reenvia só
  os itens que não foram, sem arrastar de novo.
- Envio de arquivo é transferência de conteúdo, **não** altera configuração do
  aparelho — não entra no registro de reversão.

### 16/07/2026 — personalização contínua, giro de tela e telemetria

Tema: **"configure até chegar na interface ideal"** — em vez de uma
transformação de um clique que trava, os ajustes de interface podem ser
refeitos até funcionarem, e a combinação que funcionou fica salva no perfil
TV (ver `mudanças-16-07-2026.md` para os detalhes).

- **Configuração recomendada não desinstala mais nada** — o preset instala o
  launcher e aplica só ajustes reversíveis de settings; as remoções seguem
  na seleção manual.
- **Ajustes de interface repetíveis** — rotação, resolução e tamanho da
  interface (`repeatable: true` em `tasks.js`) não travam depois de
  aplicados: ganham um check discreto e continuam clicáveis.
- **Botão "Girar tela" no controle remoto** — a rotação era o único erro sem
  saída imediata (tela em pé na TV trava 100% do uso e a única opção era
  reverter tudo). Agora cada clique gira um quarto de volta (0→90→180→270°),
  quantas vezes for preciso; a posição certa é gravada no perfil TV
  (`task.rotation`) com reversão registrada, e é ela que volta em toda
  ativação do modo TV — a heurística só decide quando não há posição salva.
- **Rotação entra no snapshot do perfil vivo** — `captureTask` agora fotografa
  a rotação na ida ao modo celular (antes era "característica fixa" e a
  posição que funcionou se perdia).
- **Telemetria: espaço livre/ocupado corretos em qualquer aparelho** — o
  parser do `df /data` lia colunas por posição fixa; em aparelhos com outra
  ordem de colunas (ou nome de dispositivo longo que quebra a linha), o
  espaço OCUPADO aparecia como "livre". Agora as colunas são localizadas pelo
  nome no cabeçalho, a linha é ancorada no ponto de montagem `/data`, linhas
  quebradas são realinhadas e há checagem final de coerência (livre nunca
  excede o total).
- **Perfis de interface nomeados (aba Perfis)** — a interface que funcionou
  vira um perfil com nome ("Sala 4K", "Quarto Full HD"): salvar fotografa os
  ajustes de modo ativos direto do aparelho (mesmo snapshot da ponte de
  modos), e aplicar reexecuta as tasks pela esteira normal (progresso na
  lateral, reversão com merge). Nome repetido regrava por cima; os perfis
  moram no arquivo do registro (serial estável) e sobrevivem à Reversão
  completa. A aba guia o leigo em 3 passos: ajustar → nomear e salvar →
  aplicar quando quiser.
- **Interface mais limpa na coluna esquerda** — os grupos de Modificações
  ficam recolhidos em acordeões (um clique expande; contagem de marcados
  visível com o grupo fechado). Hierarquia visual: ajustes fixos em tom
  secundário; os ajustáveis (fonte, dpi, resolução, rotação) em tom cheio com
  o selo "ajustável".
- **Fonte em 3 tamanhos e interface maior** — o tamanho da fonte virou grupo
  exclusivo ajustável (normal 1.0 / maior 1.15 / bem maior 1.3) e o dpi
  ganhou a opção "Interface maior" (+20%), também no diálogo da Configuração
  Recomendada.

### Julho/2026 — revisão geral, robustez da reversão e novas funções

O projeto passou por uma revisão completa de código seguida de uma leva grande
de correções e funcionalidades. Agora está sob **controle de versão (git)** —
o histórico detalhado de cada mudança vive nos commits.

**Correções de confiabilidade (reversão):**

- Falha no meio de uma task (`remove`/`settings`) agora registra a reversão do
  que já havia sido aplicado — nada fica "meio modificado" sem registro.
- Reaplicar uma task **preserva o estado original do usuário** (merge por tipo
  de reversão), em vez de sobrescrever com o valor que o próprio app colocou.
- "Reverter tudo" executa na **ordem inversa** da aplicação — tasks sobrepostas
  (ex.: duas resoluções) restauram o estado correto.
- Reverter um app **instalado pelo app** usa a desinstalação completa
  (`adb uninstall`); o `pm uninstall -k` anterior era recusado pelo Android.
- O Play Protect para ADB (`verifier_verify_adb_installs`) é **restaurado ao
  valor original** após cada instalação — antes ficava desativado para sempre.
- Registro de reversão indexado pelo **serial de fábrica**: continua válido
  alternando entre USB e Wi-Fi, e pode ser **exportado/importado** (JSON).

**Novas funções:**

- **Configuração recomendada (1 clique)** — pergunta a resolução da TV num
  diálogo e aplica o preset curado; a seleção manual continua disponível.
- **Resoluções com densidade pareada** — além do `wm size` 16:9 (conteúdo
  preenche a TV sem cortes), cada resolução aplica o `wm density` no padrão
  Android TV (1080p→320, 1440p→480, 4K→640): interface na escala de sofá.
- **Proteger a bateria** — limita a carga a 85% (One UI), essencial para
  aparelho que vive no carregador.
- **Não perturbe (modo TV)** — silencia notificações/chamadas que apareceriam
  por cima do conteúdo na TV.
- **Conexão por Wi-Fi** — ativa `adb tcpip` e conecta pelo IP; o cabo pode ser
  removido com o celular já instalado atrás da TV.
- **Espelhamento da tela (scrcpy)** — botão "Ver tela do celular" abre o
  aparelho numa janela controlável por mouse/teclado; dispensa pegar o telefone
  nas etapas que pedem toques. Binários em `scrcpy/` (o CI baixa sozinho).
- **Check-up do aparelho** — verifica, sem alterar nada, se cada ajuste
  aplicado continua valendo (updates/reboots desfazem coisas) e reaplica o que
  se perdeu.
- **Seletor de aparelhos** — quando há mais de um conectado (USB/Wi-Fi).
- **Relatório de configuração** — exportável em `.txt` ao fim da execução.
- **Checksum SHA-256** — instalações por URL podem declarar o hash esperado;
  download que não confere é descartado.
- **Detecção de desconexão** — o polling continua com o aparelho conectado;
  desplugar o cabo volta a UI ao estado de busca em segundos.

**Segurança e empacotamento:**

- Links externos abrem no navegador padrão (`shell.openExternal`), nunca numa
  janela do Electron.
- Dependências de UI movidas para `devDependencies` e `node_modules` fora do
  instalador (o bundle do Vite já embute tudo) — instalador drasticamente menor.
- `.gitignore` cobre `.apkm`/`.xapk` e binários do scrcpy.

**Ajustes de interface:** botão "Desative o DeX" (novo nome) na coluna
esquerda; removido o botão duplicado "DeX vs Experiência de TV" do painel
central.

### Correção de comandos que não surtiam efeito no aparelho

Quatro personalizações pareciam não funcionar. A investigação revelou que a
maioria dos comandos de configuração **falhava silenciosamente** — o comando
retornava sem erro, mas o sistema não aplicava a mudança. Correções:

- **Reduzir animações** — o sistema tem **três** escalas de animação separadas
  (janela, transição, animador); o app setava apenas uma. Agora aplica as três,
  com valor `0` (efeito perceptível).
- **Silenciar sons** — som de toque e som de bloqueio são chaves distintas no
  One UI. Agora ambas são aplicadas.
- **Remover bloqueio de tela** — a chave estava grafada com ponto
  (`lockscreen.disabled`); o correto é com underscore (`lockscreen_disabled`).
- **Manter Wi-Fi sempre ativo** — a chave usada foi **descontinuada** no Android
  moderno e não tem mais efeito. A opção foi **removida** em vez de manter algo
  que não funciona.

**Correção estrutural (a mais importante):** o app agora **escreve a
configuração e lê o valor de volta** para confirmar que foi aplicada. Se o
sistema rejeitou, mostra um erro real em vez de marcar como sucesso. Isso resolve
a categoria inteira de "falhas silenciosas".

### Procedimentos concluídos: riscados e travados

A pedido, procedimentos que já foram realizados agora ficam **riscados** e
**não podem ser clicados novamente** — mas apenas mediante **comprovação** de
que a alteração de fato ocorreu no aparelho (via a leitura de volta descrita
acima). Quando uma tarefa é comprovadamente concluída:
- o texto fica riscado e esmaecido;
- o checkbox vira um check verde fixo (não clicável);
- a tarefa sai da seleção.

Nada é marcado como concluído sem confirmação real no aparelho.

### Transformação visual: o celular vira TV

Após a primeira configuração concluída, o celular no centro da tela **gira 90°
para a horizontal e cresce**, simulando a transformação em uma TV. A tela interna
faz uma contra-rotação para o conteúdo permanecer legível, a câmera frontal
desaparece, e a transição é suave (~1,1 s). A tela passa a exibir "Seu TV box
está pronto" com a instrução de ligar na TV via HDMI.

### Pop-up de fechamento que apresenta os acessórios

Ao clicar em fechar, o programa intercepta a saída e mostra um pop-up animado
apresentando a seção de Acessórios. Ele tem dois caminhos: **"Ver acessórios"**
(leva direto para a aba de acessórios e mantém o app aberto) ou **"Fechar mesmo
assim"** (confirma a saída). A interceptação acontece no processo main (evento
`close`), que só fecha de fato após a confirmação do usuário.

### Acessórios flutuantes ao redor do celular

Ao clicar na aba **Acessórios** (coluna esquerda), quatro acessórios surgem
flutuando ao redor do celular, que permanece fixo no centro. Cada um aparece com
um fade suave e flutua de forma contínua e sutil, no seu próprio ritmo, sem
movimentos bruscos e sem fios de conexão. São desenhados em CSS no mesmo padrão
visual do aparelho, com base em referências reais: hub HDMI (UGREEN), controle
remoto (SKY-9346), caixa de som (Anker) e joystick (DualSense). Ao voltar para
Modificações, recolhem suavemente. No modo TV (celular girado) não aparecem.

### Outras melhorias recentes

- **Tutorial visual** com ícone por etapa, indicador "Procurando dispositivo…"
  persistente em todos os passos, anéis de busca ao redor do celular, e
  animação de sucesso.
- **Build multiplataforma** configurado (Windows, macOS, Linux) com Vite +
  electron-builder.
- **CI no GitHub Actions** pronto para gerar os três instaladores
  automaticamente.

---

## 6. Limitações conhecidas e pontos de atenção

- **Depuração USB é manual.** O usuário precisa ativá-la nas Opções do
  desenvolvedor — não há como automatizar esse primeiro passo.
- **Alguns ajustes podem ser rejeitados em certos modelos.** Mesmo com a chave
  correta, configurações como remover o bloqueio de tela são notoriamente
  instáveis em alguns Galaxy. A diferença é que agora o app **avisa** quando
  isso acontece, em vez de fingir sucesso. Para esses casos, o caminho costuma
  ser conceder a permissão `WRITE_SECURE_SETTINGS` a um app auxiliar.
- **Remoção por usuário não é permanente.** Apps de sistema voltam num reset de
  fábrica — aceitável para uso contínuo.
- **APKs e licenças.** Resolvido por remoção em 27/07/2026: o programa só
  embute o APK que nos pertence (o launcher Revya TV). Nenhum aplicativo de
  terceiro é redistribuído — o usuário instala os dele pelo arrastar-e-soltar.
  Se um dia voltar a existir APK de terceiro embutido, é preciso verificar a
  licença de redistribuição de cada app e usar apenas fontes oficiais
  (F-Droid, APKMirror), nunca versões "MOD/Premium". *Isto não é
  aconselhamento jurídico; verifique os termos de cada aplicativo.*
- **Build de macOS exige macOS.** É uma limitação da Apple. O ideal é gerar cada
  plataforma no seu próprio sistema, ou usar o CI.
- **Com a resolução 16:9 forçada, o painel do celular mostra a interface como
  uma faixa** com barras pretas em cima e embaixo (o painel é ~20:9). É o
  comportamento esperado — a imagem espelhada via HDMI é o quadro 16:9, que
  preenche a TV sem cortes.
- **"Proteger a bateria" depende do One UI.** A chave `protect_battery` existe
  nos Galaxy modernos; em aparelhos sem o recurso, a escrita pode passar sem
  efeito real. O check-up ajuda a conferir.
- **"Não perturbe" requer Android relativamente recente** (`cmd notification
  set_dnd`). Em versões antigas a task falha com mensagem clara, sem derrubar
  o resto da fila.
- **Envio de arquivos grandes por cabo pode ser interrompido.** Transferências
  longas (`.img`, vídeos) via USB às vezes falham com "write failed" — cabo/porta
  com mau contato ou o celular entrando em suspensão no meio. Não é falha do
  Revya: o app mostra uma mensagem clara e um botão "Tentar de novo"; se
  persistir, troque o cabo/porta USB ou use a conexão por Wi-Fi. A barra que
  cresce depende do comando `stat` do aparelho (presente nos Samsung modernos);
  onde não houver, o envio cai no modo animado com tempo decorrido.

---

## 7. Como rodar

```bash
npm install        # instala dependências

npm run dev        # desenvolvimento, com hot reload (Vite + Electron)
npm start          # testa o build de produção localmente

npm run dist:win   # gera instalador Windows (NSIS + portable)
npm run dist:mac   # gera .dmg (Intel + Apple Silicon)
npm run dist:linux # gera AppImage + .deb
```

### Antes de rodar, adicionar:
1. Binários ADB em `platform-tools/<plataforma>/` (baixados do Google).
2. O APK do launcher próprio em `apks/launchers/{Launcher} Revya TV.apk`
   (nenhum APK de terceiro entra aqui — ver `apks/README.txt`).
3. (Opcional) Release do scrcpy em `scrcpy/<plataforma>/` para o botão
   "Ver tela do celular" — ver `scrcpy/README.txt`. Sem ele, o app tenta o
   scrcpy do sistema (PATH).

No CI, os passos 1 e 3 são automáticos (o workflow baixa ADB e scrcpy).

---

## 8. Stack técnica

- **Electron** — empacotamento desktop multiplataforma
- **React 18 + Material UI 5** — interface
- **Vite** — build e dev server do renderer
- **electron-builder** — geração dos instaladores
- **ADB (Android Debug Bridge)** — comunicação com o aparelho
- **scrcpy** — espelhamento da tela do aparelho (Apache 2.0)
- **Git + GitHub Actions** — versionamento e integração contínua
