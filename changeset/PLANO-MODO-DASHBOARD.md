# Plano — Modo Dashboard (dispositivo de mesa multimídia)

Ideia registrada em 21/07/2026 (só planejamento — nada implementado): além do
modo TV, um **modo dashboard** — o celular na horizontal num suporte de mesa,
como dispositivo de multimídia (relógio, música, fotos, widgets), sempre
ligado.

## Viabilidade

**Sem bloqueio técnico.** Os ajustes necessários já existem como tipos de
task no catálogo: rotação com posição explícita (`rotate`), tela sempre
ligada, proteção de bateria a 85% (essencial para aparelho 24h na tomada),
Não Perturbe, fonte/dpi e launcher padrão (`home`).

**Vantagem-chave sobre o modo TV**: dashboard usa o painel nativo do celular
— **não precisa de override de resolução** (`wm size`/`wm density`). Isso
elimina justamente a família de ajustes mais frágil (a que causou a saga do
S21 FE) e significa que o **companion mobile conseguiria alternar para o
dashboard ao vivo até no Android 16** (a limitação descoberta em 16/07 vale
só para resolução/densidade).

## As dificuldades, por peso

1. **O modelo de dados é binário (a grande).** `dormant: true/false` =
   celular/TV; a ponte tem duas direções; e o **perfil vivo tem identidade
   única**: voltar ao celular estando em dashboard fotografaria o dashboard
   como "perfil TV", e a próxima "Ativar modo TV" devolveria o dashboard.
2. **Launcher fixo por modo.** A regra que estabilizou a ponte (celular =
   One UI Home, TV = Projectivy, sem captura viva) precisa de um terceiro
   mapeamento — e da escolha de um app de dashboard bom para leigo, com
   licença de redistribuição ok e proteção contra burn-in.
3. **A UI presume dois modos.** Toggle da ponte ("Voltar ao celular"/"Ativar
   modo TV"), chip de estado, ponte automática (`autoTv`), `pendingSwitch` e
   os textos do guia — nada difícil isoladamente, mas é uma passada em tudo.
4. **Operacional de mesa.** Trocar de modo longe do PC (o Wi-Fi ADB já
   resolve; o companion cobre o resto). AMOLED 24h ligado pede app com
   deslocamento de pixels/descanso e uma task nova de brilho (fácil via
   `settings`).

## Etapa 1 — dashboard como perfil nomeado (barata, dá para fazer já)

A aba **Perfis** já aplica fotografias de ajustes de modo pela esteira normal
(progresso, reversão com merge). Um perfil "Dashboard" funciona hoje com duas
adições ao catálogo:

- **Task de brilho** (`settings` em `system`: `screen_brightness` +
  `screen_brightness_mode 0`) — nível confortável de mesa, ajustável.
- **Launcher de mesa** (`install` + entrada `home` própria, ex.:
  `home-dashboard`) — APK em `apks/launchers/`, escolha do app pela usuária
  (critérios: uso leigo, proteção de burn-in, licença de redistribuição).

Fluxo do usuário: montar a interface de mesa (rotação horizontal pelo "Girar
tela", brilho, always-on, DND, launcher de mesa) → salvar como perfil
"Dashboard" → alternar TV ⇄ dashboard **aplicando o outro perfil**; a volta
ao celular segue pela ponte normal, intacta.

**Limitação documentada** (herdada do item 1): estando em dashboard, "Voltar
ao celular" fotografa o dashboard como perfil vivo do lado ativo — a próxima
"Ativar modo TV" devolve o dashboard; contorno simples: aplicar o perfil da
TV ("Sala 4K") em um clique.

Arquivos: `data/tasks.js` (+ APK). Mais nada.

## Etapa 2 — promoção a modo de verdade (o "sabor" do lado ativo)

Só se o uso real da Etapa 1 justificar. Princípio: **a ponte continua
binária** (celular ⇄ ativo — nada muda no que foi validado em 21/07); o lado
ativo ganha um **sabor**:

- `prefs.activeMode: 'tv' | 'dashboard'` por aparelho.
- Perfil vivo **por sabor** (ex.: `entry.taskByMode = { tv, dashboard }`,
  com fallback para o `entry.task` legado na migração); o snapshot da volta
  ao celular grava no sabor ativo — resolve a identidade única.
- "Acordar" aplica o sabor escolhido; launcher com mapa de três (celular =
  One UI Home, tv = Projectivy, dashboard = app de mesa).
- UI: seletor de modo no lugar do toggle; chip "Modo Dashboard ativo";
  `autoTv` vira `autoMode` (qual modo religar ao conectar); `pendingSwitch`
  ganha o alvo; guia atualizado ("ambientes", não só TV).
- A vacina (`captureLooksLikeTv`) **generaliza sem mudança de regra** — já
  compara contra a task sendo aplicada; e a regra "qualquer override de
  resolução = resíduo" continua valendo (dashboard não usa override).
- `dormant`, `phoneRevert`, guard de dormentes e reset de interface ficam
  intactos.

Arquivos: `revertStore.js`, `main.js` (sleep/wake), `ModeSwitchDialog.jsx`,
`App.jsx`, `TaskPanel.jsx`, `DevicePanel.jsx` (chip), `DOCUMENTACAO.md`.

## Ordem e validação

1. Etapa 1 primeiro, validada num aparelho real (sugestão: S8/LineageOS, o
   cavalo de testes) — mede se o modo mesa tem uso de verdade.
2. Etapa 2 depois, com changeset próprio e a mesma bateria de validação da
   ponte (trocas repetidas + diário + auditoria do JSON).
3. Regras do projeto valem sempre: toda alteração com reversão registrada,
   textos pt-BR para leigo, `build:renderer` + `node --check`, changeset e
   `DOCUMENTACAO.md` atualizados.
