# Plano de ação — 21/07/2026

Contexto: após dias de idas e voltas entre modo TV e modo celular no **S21 FE**,
a interface do celular deixou de "encaixar" — mesmo voltando ao modo inicial e
resetando a interface. O programa tem servido mais para **estruturar uma
interface e permanecer nela**; as trocas às vezes confundem. Pedidos:

1. **Reset de interface** — voltar à interface de celular original (a da
   primeira conexão), com os apps intocados.
2. **Guia de primeira configuração** — mostrado só na primeira configuração de
   cada aparelho: muitas mudanças de interface sobrepõem configurações e podem
   quebrar a alternância; o caminho é configurar o setup de TV e depois
   alimentá-lo com apps, arquivos, emuladores e jogos.
3. **Organização da ponte e das configurações** com foco em manutenção da
   experiência.

---

## Fase 0 — Diagnóstico do S21 FE (antes de codar)

O registro de reversão tem **três camadas por entrada** (`revert` = estado
original da primeira aplicação, preservado pelo `mergeRevert`; `phoneRevert` =
"perfil celular vivo", recapturado a cada ida ao modo TV; `task` = perfil TV).
A volta ao celular usa o `phoneRevert` (`main.js`, `sleepOneImpl`) — se ele foi
capturado num momento em que o aparelho ainda carregava valores de TV (troca
interrompida, entradas sobrepostas), o "modo celular" passa a devolver uma
interface torta **para sempre**. Hoje só a rotação tem defesa contra isso
(exceções em `sleepOneImpl` e `wakeOneImpl`).

Suspeita concreta de sobreposição: a resolução (`wmsize`) aplica **também a
densidade pareada**; a task de dpi (`density`) e a fonte tocam estado vizinho.
Na ida ao TV a fila segue a ordem de aplicação — quando a task de dpi acorda, a
resolução **já colocou o dpi de TV**, e o retrato "de celular" dela pode nascer
contaminado.

Passos:
- Conectar o S21 FE e coletar snapshot ADB: `wm size`, `wm density`,
  `font_scale`, `user_rotation`/`accelerometer_rotation`, launcher atual.
  Comparar com o baseline de fábrica (formato do painel ~20:9, dpi nativo).
- Abrir o JSON do aparelho em `userData/revert/<serial>.json` e auditar as três
  camadas: procurar `phoneRevert` com "cara de TV" (dimensões 16:9, dpi
  320/480/640, fonte 1.15, rotação travada).
- Registrar o achado em `changeset/TESTES-<data>.md` (padrão das sessões
  anteriores).

Saída: causa confirmada + o aparelho da usuária é curado pela Fase 1.

## Fase 1 — Reset de interface (a cura)

Novo caminho **"Restaurar interface original do celular"**:

- **Escopo**: só entradas de modo (`isModeTask` — settings, resolução, dpi,
  fonte, rotação, launcher padrão, DND). Apps instalados/removidos ficam
  intactos; perfis nomeados ficam intactos.
- **Ação por entrada**: reverter usando **`entry.revert`** (o estado ORIGINAL,
  gravado na primeira aplicação naquele aparelho — exatamente "a interface da
  primeira conexão") em vez do `phoneRevert`; em seguida marcar `dormant: true`
  e **apagar o `phoneRevert`** (é a camada possivelmente contaminada). O
  `entry.task` (perfil TV) é preservado → "Ativar modo TV" continua funcionando
  normalmente depois do reset.
- **Implementação enxuta**: é quase o `sleepOneImpl` com `force` — acrescentar
  uma opção `layer: 'original'` que escolhe `entry.revert` e limpa o
  `phoneRevert` no patch. Ordem inversa da aplicação (pilha), como a Reversão
  completa. Conferência final com `verifyRevert` contra `entry.revert`.
- **UI**: o `ResetDialog` ganha dois caminhos claros — "Restaurar interface do
  celular" (novo, não destrutivo) e "Reverter tudo" (o atual) — ou o novo botão
  entra na área de Manutenção da Fase 4. Fluxo robusto igual ao da ponte:
  pré-checagem → obstáculo vira pergunta → conferência → resumo honesto.
- **Regra do projeto mantida**: nada sai do registro; as entradas permanecem
  (dormentes) e continuam reversíveis/reativáveis.

Arquivos: `src/main/main.js` (novo handler ou opção no `mode:switchOne`),
`src/main/preload.js`, `src/renderer/components/ResetDialog.jsx` e/ou
`TaskPanel.jsx`, `DOCUMENTACAO.md`, changeset do dia.

## Fase 2 — Blindagem do perfil celular (a vacina)

- **Sanidade na captura do `phoneRevert`** (`wakeOneImpl`): antes de gravar,
  comparar o retrato capturado com o perfil TV (`entry.task`) — se o "estado de
  celular" tem os MESMOS valores do modo TV (dimensões do perfil, dpi da tabela
  de TV, fonte igual à do perfil), descartar a captura e manter o `phoneRevert`
  anterior (ou cair para `entry.revert`). É o espelho do detector de reset que
  o `captureTask` já usa na direção oposta (`originalRevert`).
- **Generalizar a exceção da rotação**: a regra "volta sempre ao original" pode
  valer também quando o `phoneRevert` reprova na sanidade acima.
- **Diário de trocas**: gravar no arquivo do aparelho um histórico curto de cada
  alternância (direção, data, itens ok/falha/pulados). Barato, e transforma o
  próximo "ficou torto" em diagnóstico de minutos.
- **Check-up de coerência das camadas**: auditoria opcional no Check-up
  existente — aponta `phoneRevert` suspeito e oferece o Reset de interface.
- **Backlog relacionado (18/07)**: reiniciar o espelhamento após alternância
  (o scrcpy degrada o stream e não volta sozinho).

## Fase 3 — Guia de primeira configuração

- **Conteúdo** (novo `data/firstSetupGuide.js`, diálogo no padrão do
  `DexGuideDialog`):
  1. O DexArmor estrutura uma experiência de TV — configure o setup primeiro.
  2. Depois, alimente-o: apps, arquivos, emuladores e jogos (envio por
     arrastar-e-soltar, perfis, limpeza).
  3. Aviso honesto: muitas mudanças de interface, repetidas, podem sobrepor
     configurações e prejudicar a alternância de modos — ajuste até a
     interface ideal, salve como perfil e permaneça nela.
  4. Se a interface do celular desandar: "Restaurar interface original".
- **Gatilho**: primeira configuração do aparelho — aparelho conectado sem
  registro e sem a preferência marcada. **Persistência por aparelho** via
  `prefs` do registro (`setPrefs { introSeen: true }`), como o `autoTv` — segue
  o serial estável (USB↔Wi-Fi) e é por aparelho, não por instalação.
- Botão discreto "ver o guia de novo" na área de Manutenção.

## Fase 4 — Organização da ponte e manutenção (a dúvida)

1. **Estado do modo sempre visível**: um chip/banner com três estados — "Modo
   TV ativo", "Modo celular", "Troca incompleta — concluir" — hoje o estado
   mora no desenho do celular e no rótulo do botão, e a troca incompleta
   (`pendingSwitch`) só aparece ao reconectar.
2. **Manutenção num lugar só**: agrupar Check-up, Restaurar interface,
   Reverter tudo, Reiniciar espelhamento e "ver guia" numa seção "Manutenção" —
   hoje estão espalhados entre TaskPanel, DevicePanel e Central.
3. **Ponte mais legível**: o diálogo mostrar "de onde → para onde" e o que será
   tocado (N ajustes) antes de começar; manter as variantes
   manual/auto/resume.
4. **Perfis como caminho canônico**: o guia orienta a salvar um perfil quando a
   interface estiver ideal; diante de problema, Reset de interface + aplicar
   perfil = recomeço limpo em dois cliques.

## Ordem e validação

Ordem: **0 → 1 → 2 → 3 → 4** (a Fase 1 destrava o aparelho da usuária; a 2
impede a reincidência; 3 e 4 são experiência).

Validação (S21 FE):
- Reset de interface → interface original de celular confirmada no aparelho.
- "Ativar modo TV" depois do reset → perfil TV volta exatamente como estava.
- Alternar 5–10 vezes seguidas → auditar o JSON: `phoneRevert` permanece com
  valores de celular.
- Rotina do projeto: `node --check` nos .js do main, `npm run build:renderer`,
  `electron .`, changeset do dia e `DOCUMENTACAO.md` atualizados.
