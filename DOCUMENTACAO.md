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
│   │   └── adb.js            Wrapper de baixo nível em torno do adb.exe
│   ├── main/
│   │   ├── main.js           Processo principal Electron + handlers IPC
│   │   ├── preload.js        Ponte segura (contextBridge) main <-> renderer
│   │   └── runner.js         Orquestrador: traduz uma "task" em comandos ADB
│   └── renderer/
│       ├── index.html        Entrada HTML (Vite)
│       ├── main.jsx          Bootstrap do React
│       ├── App.jsx           Layout de 3 colunas e todo o estado da aplicação
│       ├── theme/
│       │   └── theme.js      Tema MUI customizado (escuro, acento âmbar)
│       ├── data/
│       │   ├── tasks.js      Catálogo de modificações e acessórios (editável)
│       │   └── tutorial.js   Passos do tutorial de ativação do ADB
│       └── components/
│           ├── TaskPanel.jsx     Aba esquerda — seleção de modificações
│           ├── DevicePanel.jsx   Aba central — celular e reconhecimento
│           ├── ProgressPanel.jsx Aba direita — progresso da execução
│           ├── PhoneMock.jsx     Mockup do celular (vira TV ao final)
│           ├── PhoneScreen.jsx   Conteúdo da tela do celular por fase
│           ├── PhoneAccessories.jsx  Acessórios flutuantes ao redor do celular
│           └── CloseDialog.jsx   Pop-up de fechamento (apresenta acessórios)
│
├── platform-tools/           Binários ADB por plataforma (você adiciona)
│   ├── win/                  adb.exe + DLLs
│   ├── mac/                  adb (sem extensão)
│   └── linux/                adb (sem extensão)
│
├── apks/                     APKs offline por categoria (você adiciona)
│   ├── launchers/            {Launcher} Projectivy Launcher.apkm
│   ├── multimidia/
│   ├── navegacao/
│   └── emuladores/
│
└── .github/workflows/
    ├── build.yml             CI que gera instaladores das 3 plataformas
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

1. O usuário abre o programa. O celular ainda não está conectado → o centro
   mostra um **tutorial** de como ativar a depuração USB.
2. O app fica **procurando o aparelho** continuamente (indicador pulsante).
3. Cabo conectado mas sem autorização → tela de **"aguardando autorização"**.
4. Aparelho validado → tela de **sucesso**, com a ficha técnica e o botão de
   aplicar.
5. O usuário marca as modificações desejadas na esquerda e clica em **Aplicar**.
6. Cada tarefa é executada e **verificada** no aparelho. As que dão certo ficam
   **riscadas e travadas** (não podem ser refeitas).
7. Concluída a primeira configuração, o celular **se transforma em TV**
   (horizontal, maior).

### Separação de responsabilidades (decisão de segurança)

- **Toda a lógica ADB roda no processo `main`**, nunca no renderer.
- `contextIsolation` ligado e `nodeIntegration` desligado: o renderer (a UI) não
  tem acesso direto ao Node. Ele só conversa com o main por uma ponte
  (`preload.js`) que expõe três funções controladas: `listDevices`,
  `describeDevice` e `runTask`.

### Catálogo separado da execução

- `data/tasks.js` descreve **o quê** fazer (lista de pacotes, chaves de
  configuração, APKs). É um arquivo de dados, fácil de auditar e editar sem
  mexer em lógica.
- `runner.js` decide **como** executar cada tipo de tarefa.

Isso permite revisar a lista de pacotes a remover — onde um erro poderia
deixar o aparelho instável — sem ler código de execução.

### Tipos de tarefa (`kind`)

| kind       | o que faz                                          |
|------------|----------------------------------------------------|
| `remove`   | Desinstala pacotes por usuário (`pm uninstall`)    |
| `install`  | Instala um APK (local ou baixado de URL)           |
| `setting`  | Aplica uma configuração de sistema, com verificação|
| `settings` | Aplica várias configurações relacionadas de uma vez|
| `home`     | Define o launcher de TV como tela inicial          |

---

## 4. Catálogo atual de modificações

### Remover apps (4)
Bixby · Galaxy Store · Apps de escritório · Redes sociais pré-instaladas

### Instalar apps de TV (por categoria)
- **Multimídia** — (espaços prontos: Kodi, Jellyfin, VLC)
- **Navegação** — (espaço pronto: TV Bro)
- **Launchers** — **Projectivy Launcher** (padrão, já configurado)
- **Emuladores** — (espaço pronto: RetroArch)

Os apps são instalados a partir de **APKs offline** colocados em
`apks/<categoria>/`. Para ativar um app, basta colocar o arquivo na pasta e
descomentar a linha correspondente em `tasks.js`.

### Personalizar sistema (8)
Cada opção tem um indicador "?" que expande uma explicação curta do porquê.

| Modificação                          | Efeito                                         |
|--------------------------------------|------------------------------------------------|
| Manter tela sempre ligada            | A TV não apaga sozinha durante o uso           |
| Desativar atualizações automáticas   | Evita que uma atualização desfaça a configuração |
| Reduzir animações                    | Navegação mais rápida (3 escalas → 0)          |
| Aumentar tamanho da fonte            | Leitura confortável à distância                |
| Travar orientação na horizontal      | TV é sempre paisagem                           |
| Remover bloqueio de tela             | Liga direto no conteúdo                         |
| Usar launcher de TV como padrão      | Abre direto na tela de TV (Projectivy)         |
| Silenciar sons de toque              | Sem clique a cada toque (2 chaves)             |

### Acessórios recomendados
Vitrine com três grupos (Controles e joysticks · Vídeo e conexão · Energia e
suporte), prontos para receber links de produtos.

---

## 5. Últimas atualizações realizadas

Esta seção registra as mudanças mais recentes do projeto.

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
2. APKs em `apks/<categoria>/` + descomentar os apps em `tasks.js`.
3. O APK do Projectivy em `apks/launchers/{Launcher} Projectivy Launcher.apkm`.

---

## 8. Stack técnica

- **Electron** — empacotamento desktop multiplataforma
- **React 18 + Material UI 5** — interface
- **Vite** — build e dev server do renderer
- **electron-builder** — geração dos instaladores
- **ADB (Android Debug Bridge)** — comunicação com o aparelho
- **GitHub Actions** — integração contínua (build automático)
