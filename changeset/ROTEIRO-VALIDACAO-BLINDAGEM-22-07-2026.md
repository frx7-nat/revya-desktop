# Roteiro de validação — Blindagem da ponte (com aparelho conectado)

> Testes em Samsung real do que a blindagem adicionou (ver `AUDITORIA-BLINDAGEM.md`).
> Gates de código (sintaxe/build) já passaram; isto cobre o comportamento em hardware.
> Marque ✅/❌ e anote o aparelho/Android ao lado.

## Preparação

- [ ] Rodar o app: `npm run build:renderer && electron .` (ou `npm start`). Matar com `kill -9` se travar.
- [ ] Conectar 1 Samsung por USB, autorizar a depuração.
- [ ] **Onde fica o diário:** painel esquerdo → seção **Manutenção** → expandir a lista de eventos. É a caixa-preta; muitos testes conferem aqui.
- [ ] **Onde fica o registro no disco:** `~/Library/Application Support/<app>/revert/<serial>.json` (+ `.json.bak`). `<app>` = `dexarmor` rodando via `electron .`, ou `DexArmor` no app instalado. O `<serial>` é o `ro.serialno` com caracteres não‑alfanuméricos virando `_`.

---

## Bloco 0 — Não‑regressão (nada quebrou)

- [ ] **0.1** Ativar modo TV (botão de alternância) e voltar ao modo celular — **2 direções**. Esperado: tudo alterna, tempos aceitáveis, resumo final "**N/N conferidos**".
- [ ] **0.2** Configuração recomendada (1 clique) num aparelho zerado: resolução + dpi + launcher aplicam; tela "vira TV".
- [ ] **0.3** Reversão completa (Reversão) devolve o aparelho ao estado original; check‑up depois mostra tudo desfeito.
- [ ] **0.4** Girar tela (controle remoto → **Girar tela**) fora de uma troca: gira 90° por clique, registra/atualiza o perfil.

---

## Bloco 1 — Registro (Fase 1)

### 1.1 Corromper o registro → recuperação do backup
- [ ] Aplicar pelo menos 1 ajuste (para existir registro **e** `.bak`).
- [ ] **Fechar o app.** No `<serial>.json`, apagar metade do conteúdo / colar lixo (deixar o `.json.bak` **intacto**).
- [ ] Reabrir o app. **Esperado:** o app "lembra" das alterações (não zerou); no **diário** aparece *"Proteção: o registro corrompeu e foi recuperado do backup"*.

### 1.3 Import de JSON inválido → rejeição tudo‑ou‑nada
- [ ] Abrir **Reversão** → **Exportar registro** (gera um JSON válido).
- [ ] Fazer 3 cópias adulteradas e tentar **Importar registro** em cada uma:
  - [ ] (a) trocar um `"kind":"setting"` por `"kind":"xpto"` → **rejeita** com "tipo de reversão desconhecido"; **nada** importado.
  - [ ] (b) remover o `taskId` de uma entrada → **rejeita** "sem identificador (taskId) válido".
  - [ ] (c) arquivo gigante (>2 MB, colar lixo) → **rejeita** "grande demais".
- [ ] Importar o **válido** original → importa e conta as entradas.

---

## Bloco 2 — Canal ADB (Fase 2)

### 2.1 Envio travado (watchdog de inatividade)
- [ ] Arrastar um arquivo **grande** para enviar; no meio, **remover o cabo** (sem clicar Cancelar).
- [ ] **Esperado:** após ~60 s sem progresso, o envio falha com *"O envio travou (sem progresso…)"*.
- [ ] Repetir um envio **normal** até o fim → completa sem falso alarme. Testar **Cancelar** manual → cancela na hora.

### 2.2 Soluço no canal → retry transitório + diário
- [ ] Iniciar uma troca de modo e dar um **soluço** no cabo (mexer/reconectar rápido) durante a fila.
- [ ] **Esperado:** a troca tenta de novo sozinha; se o soluço passou, conclui. No **diário**: *"Canal instável: uma tentativa foi refeita (…)"*.
- [ ] Se o cabo cair de vez → vira obstáculo "desconectou" com **Tentar de novo** (não trava).

---

## Bloco 3 — Ciclo da ponte (Fase 3)

### 3.1 Troca concorrente → lock (busy)
- [ ] Iniciar uma troca de modo e, **enquanto ela roda**, clicar em **Girar tela** (controle remoto).
- [ ] **Esperado:** recusa amigável *"Já existe uma troca em andamento neste aparelho"*; a troca em curso conclui normal. (O duplo clique no mesmo botão já é barrado pela tela — este teste exercita o lock do processo principal.)

### 3.2 Identidade no fluxo automático
- [ ] Ligar a **ponte automática** (caixa "Ativar o modo TV automaticamente…") num aparelho.
- [ ] Desconectar e **reconectar o mesmo aparelho** → conta regressiva de 10 s → ativa o modo TV (fluxo automático intacto).
- [ ] (Opcional/2 aparelhos) Trocar por **outro** aparelho no mesmo ponto de conexão → se o app detectar identidade diferente, recusa com *"O aparelho conectado mudou"* em vez de aplicar às cegas.

### 3.3 Cabo removido no meio → retomada confere e conclui
- [ ] Iniciar uma troca; **remover o cabo** no meio da fila.
- [ ] **Esperado:** a troca **pausa** ("reconecte e continue"); itens pendentes não sumiram.
- [ ] Reconectar → o app oferece **Concluir a troca**; conclui **só o que faltou**, sem refazer o que já estava feito.

### 3.4 Matar o app no meio → registro íntegro, sem reaplicar às cegas
- [ ] Iniciar uma troca; **forçar o encerramento** do app no meio (`kill -9`).
- [ ] Reabrir → o app oferece **Concluir a troca** (pendingSwitch).
- [ ] **Esperado:** os itens já feitos **não** são refeitos (a esteira lê antes de agir); o registro está **íntegro**; a interface fica consistente ao concluir.

### 3.3/3.5 Assentamento + fingerprint no diário
- [ ] Aplicar/alternar **resolução + dpi** algumas vezes.
- [ ] **Esperado:** a conferência final **não** acusa falso "não confirmou" para resolução/dpi.
- [ ] No **diário** após cada troca: *"Conferência da troca: N/N conferidos no aparelho"*.

---

## Bloco 4 — Invariantes (Fase 4)

- [ ] **4.2** Reaplicar o mesmo ajuste várias vezes (girar tela 4×, reaplicar dpi): o diário **NÃO** deve mostrar *"Alerta interno: invariante violada"* — se aparecer, é bug de merge a investigar (ver `INVARIANTES.md`).

---

## Referência — eventos novos no diário

| No diário aparece | Significa |
|-------------------|-----------|
| Conferência da troca: N/N conferidos | fingerprint pós‑troca (3.5) |
| Canal instável: uma tentativa foi refeita | retry transitório (2.2) — cabo oscilando |
| Proteção: o registro … recuperado do backup | recuperação do `.bak` (1.1) |
| Alerta interno: invariante violada | guardião da lei 1 disparou (4.2) — só em bug |

**Critério de aceite:** Bloco 0 sem regressão + os cenários 1.1, 1.3, 2.1, 2.2, 3.1, 3.3, 3.4 passam; diário com fingerprint a cada troca e sem "invariante violada".
</content>
