# DexArmor — Documentação do Projeto

> Aplicativo desktop que transforma celulares Samsung compatíveis (saída HDMI +
> modo DeX) em dispositivos de mídia para TV, com o mínimo de esforço para quem
> não tem experiência com Android.

---

## 1. Visão geral

O DexArmor é um programa de **provisionamento**: ele conecta-se a um celular
Samsung via ADB e aplica uma série de procedimentos que o preparam para funcionar
como uma "TV box" — remove apps desnecessários, instala aplicativos de TV e
emuladores, e ajusta o sistema para uso na tela grande.

O público-alvo são pessoas **sem conhecimento técnico** que querem reaproveitar
um celular antigo para assistir TV (com controle) e jogar via emuladores. Por
isso, a interface guia o usuário passo a passo, e a complexidade do ADB fica
escondida por trás de botões simples.

### O que o programa faz no celular

- **Remove** aplicativos pré-instalados que não serão usados (Bixby, Galaxy
  Store, apps de escritório, redes sociais).
- **Instala** aplicativos de TV (launchers, players de mídia, navegadores) e
  emuladores de videogame, a partir de APKs offline.
- **Personaliza** o sistema para uso em TV (tela sempre ligada, animações
  reduzidas, orientação travada, launcher de TV como padrão, etc.).

### O que o programa NÃO faz (limites honestos)

- **Não vira Android TV de verdade.** Isso exigiria trocar o firmware (ROM). O
  que se cria é uma *experiência* de TV sobre o Android/DeX, com um launcher
  apropriado.
- **Não usa root.** Tudo é feito via ADB com desinstalação "por usuário"
  (`pm uninstall --user 0`), que é reversível por reset de fábrica — mais seguro,
  porém com algumas limitações (ver seção 6).
- **Não bloqueia atualizações de forma absoluta.** Desativa as automáticas, mas
  uma atualização forçada via cabo (Smart Switch) ainda seria possível.

---

## 2. Arquitetura e composição

O projeto é um app **Electron** (desktop) com interface em **React + Material
UI**. O build do front-end é feito pelo **Vite**.

### Estrutura de pastas

```
dexarmor/
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
│       │   └── dexGuide.js   Conteúdo do guia "Desative o DeX"
│       ├── screens/
│       │   └── ConnectPhoneScreen.jsx  Tela-gate com diagnóstico ao vivo do ADB
│       └── components/
│           ├── TaskPanel.jsx        Aba esquerda — modificações, check-up e reversão
│           ├── DevicePanel.jsx      Aba central — aparelho, preset, Wi-Fi, espelhamento
│           ├── ProgressPanel.jsx    Aba direita — progresso + salvar relatório
│           ├── DeviceStatusCard.jsx Cartão de diagnóstico da tela de conexão
│           ├── TvResolutionDialog.jsx Pergunta da resolução da TV (preset)
│           ├── CheckupDialog.jsx    Verifica se os ajustes continuam valendo
│           ├── ResetDialog.jsx      Reversão (+ exportar/importar registro)
│           ├── DexGuideDialog.jsx   Guia "Desative o DeX"
│           ├── PhoneMock.jsx        Mockup do celular (vira TV ao final)
│           ├── PhoneScreen.jsx      Conteúdo da tela do celular por fase
│           ├── PhoneAccessories.jsx Acessórios flutuantes ao redor do celular
│           └── CloseDialog.jsx      Pop-up de fechamento (apresenta acessórios)
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
├── apks/                     APKs offline por categoria (você adiciona)
│   ├── launchers/            {Launcher} Projectivy Launcher.apkm
│   ├── multimidia/           Netflix, Disney+, Max, Prime Video, etc.
│   ├── navegacao/            Aptoide TV, Downloader, LocalSend, etc.
│   └── emuladores/           AetherSX2, etc.
│
└── .github/workflows/
    ├── build.yml             CI: instaladores das 3 plataformas (baixa ADB + scrcpy)
    └── README.md             Como usar o workflow
```

### As três colunas da interface

1. **Esquerda (TaskPanel)** — seletor entre *Modificações* e *Acessórios*. Em
   Modificações ficam os grupos de tarefas (remover, instalar, personalizar). Em
   Acessórios, uma vitrine de produtos com links externos.
2. **Centro (DevicePanel)** — o celular Samsung como peça central. Guia o
   tutorial, mostra o aparelho reconhecido, e durante a execução espelha o
   progresso. Ao final, o celular **vira TV** (gira e cresce).
3. **Direita (ProgressPanel)** — log passo a passo da execução, com status por
   tarefa (pendente, rodando, concluído, erro).

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
  (`preload.js`) que expõe funções controladas — detecção (`listDevices`,
  `describeDevice`, `checkDevices`), execução (`runTask`, `verifyTask`),
  reversão (`revertCount/List/One/Export/Import`), conveniências
  (`enableWifi`, `startMirror`, `saveReport`) e o pop-up de fechamento.
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
| `rotate`   | Trava a rotação em paisagem e força os apps a respeitarem        |
| `wmsize`   | Força resolução 16:9 (`wm size`) + densidade pareada (`wm density`) |
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

---

## 4. Catálogo atual de modificações

### Remover apps (4)
Bixby · Galaxy Store · Apps de escritório · Redes sociais pré-instaladas

### Instalar apps de TV (por categoria)
- **Multimídia** — Apple TV+, Crunchyroll, Disney+, Globoplay, Max, MUBI,
  Netflix, Paramount+, Pluto TV, Prime Video, Stremio, Tizentube
- **Navegação** — Aptoide TV, Downloader, LocalSend, Telegram, ZArchiver
- **Launchers** — **Projectivy Launcher** (padrão, já configurado)
- **Emuladores** — AetherSX2

Os apps são instalados a partir de **APKs offline** colocados em
`apks/<categoria>/` (formatos `.apk`, `.apkm` e `.xapk` — bundles são extraídos
e instalados via `install-multiple`). Para adicionar um app, coloque o arquivo
na pasta e cadastre a linha correspondente em `tasks.js`.

### Personalizar sistema (13)
Cada opção tem um indicador "?" que expande uma explicação curta do porquê.

| Modificação                          | Efeito                                             |
|--------------------------------------|----------------------------------------------------|
| Manter tela sempre ligada            | A TV não apaga sozinha durante o uso               |
| Proteger a bateria (carga até 85%)   | Aparelho 24h no carregador sem degradar a bateria  |
| Desativar atualizações automáticas   | Evita que uma atualização desfaça a configuração   |
| Reduzir animações                    | Navegação mais rápida (3 escalas → 0)              |
| Aumentar tamanho da fonte            | Leitura confortável à distância                    |
| Forçar tela na horizontal            | TV é sempre paisagem, mesmo em apps teimosos       |
| Não perturbe (modo TV)               | Sem notificações/chamadas por cima do filme        |
| Navegação por gestos                 | Sem botões ocupando a tela                         |
| Remover bloqueio de tela             | Liga direto no conteúdo                            |
| Usar launcher de TV como padrão      | Abre direto na tela de TV (Projectivy)             |
| Resolução Full HD / 2K / 4K          | Força 16:9 + densidade de TV (320/480/640 dpi) — o conteúdo preenche a TV sem cortes |
| Silenciar sons de toque              | Sem clique a cada toque (2 chaves)                 |

### Configuração recomendada (preset de 1 clique)

O botão **"Configuração recomendada"** (painel central) pergunta a resolução da
TV (Full HD / 2K / 4K / "Não sei" → Full HD) e aplica o conjunto curado:
debloat completo, Projectivy instalado e definido como padrão, tela sempre
ligada, proteção de bateria, sem atualizações, animações reduzidas, fonte
maior, paisagem forçada, Não Perturbe, sons silenciados e a resolução
escolhida. Ficam de fora, por serem decisões do usuário: bloqueio de tela e
apps de streaming. A lista vive em `RECOMMENDED_TASK_IDS` (`tasks.js`).

### Acessórios recomendados
Vitrine com três grupos (Controles e joysticks · Vídeo e conexão · Energia e
suporte), prontos para receber links de produtos — abrem no navegador padrão.

---

## 5. Últimas atualizações realizadas

Esta seção registra as mudanças mais recentes do projeto.

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
- **APKs e licenças.** Ao distribuir o programa com APKs embutidos, é preciso
  verificar a licença de redistribuição de cada app e usar apenas fontes
  oficiais (F-Droid, APKMirror) — nunca versões "MOD/Premium". *Isto não é
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
2. APKs em `apks/<categoria>/` + cadastrar os apps em `tasks.js`.
3. O APK do Projectivy em `apks/launchers/{Launcher} Projectivy Launcher.apkm`.
4. (Opcional) Release do scrcpy em `scrcpy/<plataforma>/` para o botão
   "Ver tela do celular" — ver `scrcpy/README.txt`. Sem ele, o app tenta o
   scrcpy do sistema (PATH).

No CI, os passos 1 e 4 são automáticos (o workflow baixa ADB e scrcpy).

---

## 8. Stack técnica

- **Electron** — empacotamento desktop multiplataforma
- **React 18 + Material UI 5** — interface
- **Vite** — build e dev server do renderer
- **electron-builder** — geração dos instaladores
- **ADB (Android Debug Bridge)** — comunicação com o aparelho
- **scrcpy** — espelhamento da tela do aparelho (Apache 2.0)
- **Git + GitHub Actions** — versionamento e integração contínua
