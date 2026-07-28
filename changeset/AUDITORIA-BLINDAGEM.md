# Auditoria — Blindagem da ponte de modos

> Fase 0 do `PLANO-BLINDAGEM-PONTE.md`. Rodada em 2026-07-22 sobre o projeto
> local (fonte da verdade). Legenda: ✓ existe · ~ parcial · ✗ falta.
>
> **Achado geral:** o código está **mais maduro que o plano assumia**. Os
> três pontos mais críticos — escrita atômica do registro (A1), timeout no
> canal ADB (A4) e argumentos ADB sempre como array (A12) — **já estavam
> implementados e passam**. As fases implementam o que de fato faltava, sem
> reescrever o que já funciona (regra 1 do plano).

| # | Princípio | Status | Evidência | Ação |
|---|-----------|--------|-----------|------|
| A1 | Escrita atômica + backup | ✓ | `revertStore.js:40-48` `write()` grava `.tmp` → `copyFileSync` `.bak` → `renameSync`; `read()` (`:26-35`) já **recupera do `.bak`** de forma transparente | 1.1 (só o que falta: proteger o `.bak` de um main corrompido + anotar a recuperação no diário) |
| A2 | Versionamento de schema | ✗ | `grep version revertStore.js` vazio | **1.2** |
| A3 | Validação de schema no import | ~ | `main.js:762-778` valida `Array.isArray(entries)` e por-entrada `taskId` + `revert`, mas **sem allowlist de kinds**, **sem limites** (tamanho/nº) e **sem tudo-ou-nada** | **1.3** |
| A4 | Timeout em comando ADB | ✓ | `adb.js:40` padrão 20 s; longos com timeout próprio (install 180 s `:113`, etc.); orquestrador 15 s | 2.1 (só o que falta: timeout de **inatividade** no `push`, que é `spawn` sem timeout) |
| A5 | Retry transitório/definitivo | ~ | `main.js:361-381` `switchOne` faz 1 retry só para erro **não** classificado; transitórios (offline/reset) viram obstáculo e voltam à UI para "Tentar de novo" manual (filosofia "obstáculo → pergunta") | **2.2** (fechar a janela silenciosa: read-back de `putSettingVerified` que falha por soluço vira "sistema rejeitou" falso) |
| A6 | Lock de troca única por serial | ✗ | nenhum `activeSwitches`/lock no main; só `currentSendAbort` para envios | **3.1** |
| A7 | Pré-condição de identidade no auto/resume | ~ | `preflight` (`main.js:336`) checa vivo/tela/launcher, mas **não** confere `ro.serialno`; `stableSerial` resolve o serial, mas o auto/resume não confere identidade explícita antes de aplicar | **3.2** |
| A8 | Leitura com assentamento | ✗ | nenhum `readStable`/settle; a conferência lê uma vez | **3.3** (só nos kinds que re-layoutam: `density`/`wmsize`/`home`) |
| A9 | Intenção gravada por item (write-ahead) | ✗ mecanismo / ✓ objetivo | `pendingSwitch` grava só a direção (`ModeSwitchDialog.jsx:208`). O **objetivo** de 3.4 (crash no meio de um item não corrompe nem reaplica às cegas) já é atingido por: idempotência check-então-age (`runTask` lê antes de agir), vacina + `mergeRevert` (preservam o original numa reaplicação parcial) e escrita atômica (Fase 1). | **Coberto** — write-ahead explícito adiado (redundante e mais arriscado que o valor; ver nota) |
| A10 | Fingerprint pós-troca | ~ | `verifyAll` (`ModeSwitchDialog.jsx:154`) já confere item a item os itens da fila e anota resumo no diário (`troca: done/warn/...`); falta o resumo em forma de **fingerprint** explícito no diário | **3.5** |
| A11 | INVARIANTES.md | ✗ | não existe | **4.1** |
| A12 | Args ADB sempre array | ✓ | `execFile`/`spawn` sempre com array; shell do aparelho usa `shellQuote` (`adb.js:486,560`); **nenhuma** montagem de comando por string no host (os `grep exec(` do check são todos `regex.exec()`) | Nenhuma — **crítico, passa** |

## Já existentes confirmados (não retrabalhar)

Conforme a nota do plano, confirmados no código e **preservados**:
read-after-write (`putSettingVerified` `adb.js:141`), retomada
(`pendingSwitch`/resume `App.jsx:254-257`), compensação parcial em pilha
(`partialRevert` `runner.js:204,309`), guard de dormentes (`revert:one`
`main.js:155-167`), vacina (`captureLooksLikeTv` `runner.js:766`), diário
(`appendJournal` `revertStore.js:167`), allowlist no IPC do diário
(`main.js:419`), fail-safe "sem leitura prefira reverter" (`main.js:157-159`),
serial estável (`stableSerial` `main.js:20`) e camada original imutável
(`mergeRevert` `revertStore.js:55`).

## Resumo

Já prontos (não retrabalhados): **A1, A4, A12** (3 de 3 críticos).
Parciais fechados: **A3** (import validado), **A5** (retry transitório + diário),
**A7** (identidade no auto/resume), **A10** (fingerprint no diário).
Faltantes implementados: **A2** (schema+migrate), **A6** (lock), **A8**
(assentamento em density/wmsize), **A11** (INVARIANTES.md + checagem viva).
**A9** (write-ahead por item): objetivo já coberto por idempotência + vacina +
escrita atômica; o mecanismo explícito foi adiado por ser redundante e de risco
maior que o ganho num sistema já validado (regra 1 do plano — não retrabalhar o
que o princípio já garante por outro caminho).
</content>
