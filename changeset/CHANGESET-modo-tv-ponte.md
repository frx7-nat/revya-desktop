# Changeset — Alternância de modos (ponte celular ⇄ TV com perfil vivo)

Transforma o DexArmor de "configurar + desfazer" em **ponte de modos**: um
clique alterna entre o modo TV e o modo celular em segundos, sem desinstalar
nada. Suporta a rotina de várias trocas por dia. Três pilares:

1. **Tasks estruturais vs. de modo** — apps instalados, bloatware removido e
   proteção de bateria valem nos DOIS modos (só saem na Reversão completa).
   Ajustes de settings/resolução/launcher-padrão/rotação/DND alternam a cada
   troca (~12 comandos ADB ≈ poucos segundos).
2. **Perfil TV "vivo" (snapshot na saída)** — ao voltar para o modo celular, o
   app fotografa o modo TV como está AGORA. Personalizações feitas ao longo
   dos dias (outra fonte, outro dpi, outro launcher padrão) viram o novo
   perfil; a próxima ativação volta exatamente para como o usuário deixou.
   Um filtro de plausibilidade impede que resets do sistema (One UI/reinício)
   contaminem o perfil: valor apagado, override limpo ou valor de volta ao
   estado pré-modo-TV **não** são adotados.
3. **Registro robusto** — escrita atômica (tmp + rename) com backup `.bak` e
   fallback na leitura. Antes, um travamento no meio da gravação corrompia o
   JSON e o app "esquecia" silenciosamente tudo que aplicou.

**1 arquivo novo, 8 editados.** Nada de bibliotecas novas.

---

## Modelo de dados (registro de reversão)

Cada entrada ganha campos opcionais, formando TRÊS camadas bem separadas:

- `revert` — estado ORIGINAL, imutável (merge preserva o mais antigo):
  destino da **Reversão completa** (ex.: launcher da Samsung).
- `phoneRevert` — **perfil celular vivo**: o retrato mais recente do modo
  celular, capturado a cada ida ao modo TV (o wake guarda o revert fresco do
  runTask em vez de descartá-lo no merge). É o destino da troca TV → celular:
  último launcher padrão, última rotação/exibição do celular. Só o
  `mode:wakeOne` grava este campo — reaplicações em pleno modo TV não
  contaminam o perfil celular. Fallback: `phoneRevert || revert`.
- `task` — **perfil TV vivo**, atualizado pelo snapshot na saída do modo TV:
  o que a troca celular → TV reaplica.
- `dormant: true` — a task de modo está adormecida (aparelho em modo
  celular). Reaplicar a task (addEntry) limpa o dormant.

No nível do arquivo, além de `prefs`: `sessionStartedAt` marca o recomeço
após uma Reversão completa (`resetSession` apaga as prefs e preserva
entradas de itens que falharam ao reverter — seguem reversíveis).

No nível do arquivo: `data.prefs` guarda preferências por aparelho
(`{ autoTv: bool }` = ativar modo TV automaticamente ao conectar). Como o
arquivo segue o serial ESTÁVEL, a preferência sobrevive à troca USB↔Wi-Fi.

A task `density` aceita agora um campo opcional `dpi` (dpi explícito do
snapshot, com precedência sobre o cálculo por resolução).

---

## Arquivo NOVO

- `src/renderer/components/ModeSwitchDialog.jsx` — diálogo da alternância
  (confirmação → execução item a item → resumo honesto, mesmo padrão do
  ResetDialog). Direções: 'phone' (adormecer) e 'tv' (acordar). Com
  `autoStart` pula a confirmação (usado pela ponte automática). Traz o
  checkbox "Ativar o modo TV automaticamente quando este aparelho conectar".

## Arquivos EDITADOS — resumo

### `src/main/revertStore.js`
- `write()` atômico: grava em `.tmp`, copia o atual para `.bak`, renomeia.
- `read()` tenta o principal e cai no `.bak` se corrompido.
- `addEntry()` limpa `dormant` ao reaplicar (merge continua preservando o
  estado original).
- Novos: `updateEntry(serial, taskId, patch)`, `getPrefs`, `setPrefs`.

### `src/main/runner.js`
- Nova `captureTask(serial, task, originalRevert)` — o snapshot. Cobre
  `setting`, `settings`, `wmsize` (com densidade), `density` e `home`.
  Retorna null quando não há o que adotar (sem mudança, tipo sem captura —
  rotate/dnd são características fixas do modo TV — ou mudança com cara de
  reset). Exportada.
- `runTask`/`verifyTask` de `density`: honram `task.dpi` explícito.

### `src/main/main.js`
- `revert:one` ciente de dormentes: entrada adormecida já está desfeita no
  aparelho — só remove do registro (não reescreve valores, não atropela
  mudanças manuais feitas no modo celular).
- Novos handlers: `mode:sleepOne` (snapshot → revert → dormant),
  `mode:wakeOne` (reaplica `entry.task`; merge preserva o original; trata
  `partialRevert`), `mode:getPrefs`, `mode:setPrefs`.
- O renderer dirige a fila (um IPC por item) para mostrar progresso ao vivo.

### `src/main/preload.js`
- Expostos: `modeSleepOne`, `modeWakeOne`, `modeGetPrefs`, `modeSetPrefs`.

### `src/renderer/data/tasks.js`
- Campo `modeScope: 'mode' | 'structural'` nas tasks de tweaks (tw-battery é
  structural; todo o resto dos tweaks é mode; remove/install são estruturais
  por kind).
- Novo helper exportado `isModeTask(task)` — com fallback por kind para
  registros antigos sem o campo.

### `src/renderer/App.jsx`
- Estado e fiação da alternância: `modeInfo` (ativas/adormecidas),
  `buildModeQueue` (adormecer em ordem INVERSA, acordar em ordem de
  aplicação), `openModeSwitch`, preferência `autoTv`.
- Ao conectar o aparelho: carrega prefs; se `autoTv` e há modo adormecido,
  abre o diálogo já executando (ponte automática).
- O mock do celular só "vira TV" com ajustes de MODO ativos (antes bastava
  qualquer task concluída).

### `src/renderer/components/TaskPanel.jsx`
- Botão de alternância (aparece quando existe perfil de modo): "Voltar ao
  modo celular" / "Ativar modo TV", com explicação expansível.
- Lista de reversão isolada marca entradas adormecidas com "(modo celular)".

### `src/renderer/components/CheckupDialog.jsx`
- Entradas adormecidas ficam FORA do check-up (foram desfeitas de propósito;
  reportá-las como "perdidas" seria alarme falso) — com nota informativa.

---

## Reversão completa = fim de sessão

- O diálogo de confirmação comunica em linguagem simples: o registro guardado
  (modo TV salvo, histórico e preferências) será apagado e o DexArmor começa
  uma nova sessão do zero, como no primeiro uso.
- Ao concluir: `session:reset` apaga as prefs no disco e o App limpa
  histórico de execução, seleções, progresso e a preferência automática
  (`ResetDialog.jsx` → `onSessionReset` → `handleSessionReset`).
- Itens que falharam ao reverter permanecem registrados — continuam
  reversíveis na nova sessão.

## Comportamentos que NÃO mudaram

- Reversão completa continua desfazendo TUDO (inclusive desinstalando apps)
  e restaurando o estado ORIGINAL — ex.: launcher da Samsung — a partir de
  `entry.revert`, intocado pelos ciclos de troca de modo.
  Entradas adormecidas são apenas removidas do registro.
- O merge do estado original (`mergeRevert`) segue intocado: o valor que
  estava no aparelho ANTES da primeira aplicação nunca é sobrescrito, por
  quantos ciclos de troca passarem.
- Exportar/importar registro carrega junto dormant, perfil e prefs (é o
  mesmo JSON).

## Como testar

Teste funcional com aparelho mockado (28 verificações — ciclo completo,
filtro de plausibilidade, escrita atômica, fallback do .bak, prefs, merge):
rodado em 07/07/2026, todos passando. Roteiro manual com aparelho real:

1. Aplicar a Configuração Recomendada → botão "Voltar ao modo celular"
   aparece; clicar → aparelho volta ao normal em segundos, apps continuam
   instalados.
2. Botão vira "Ativar modo TV"; clicar → modo TV volta como estava.
3. Em modo TV, mudar a fonte/dpi manualmente → voltar ao celular → ativar
   modo TV de novo → a personalização voltou junto.
4. Marcar o checkbox do automático, ir para modo celular, desplugar e
   replugar → o modo TV reativa sozinho ao conectar.
