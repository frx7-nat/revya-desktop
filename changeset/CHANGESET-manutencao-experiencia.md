# CHANGESET — Manutenção da experiência (ciclo de 21/07/2026)

Pacote de mudanças que encerra o plano de ação de 21/07
(`PLANO-ACAO-21-07-2026.md`), motivado por um caso real: após dias de
alternâncias entre os modos, a interface de celular de um S21 FE "não
encaixava mais" — e nem a Reversão completa resolvia. O diagnóstico
(`TESTES-21-07-2026.md`) revelou uma cadeia de três falhas; este changeset
corrige as três e adiciona as camadas de prevenção, diagnóstico e clareza
que faltavam. Detalhes de implementação por arquivo em
`mudanças-21-07-2026.md`. **Validado em 3 aparelhos reais em 21/07 à noite**
(`TESTES-21-07-2026-validacao-3-aparelhos.md`).

---

## O problema (cadeia confirmada no aparelho real)

1. O retrato "vivo" do modo celular (`phoneRevert`), refotografado a cada ida
   ao modo TV, podia ser capturado **já contaminado com valores de TV**
   (troca anterior interrompida; ajustes sobrepostos — a resolução aplica a
   densidade pareada antes de a task de dpi acordar). Só a rotação tinha
   proteção.
2. "Voltar ao celular" então reescrevia o modo TV achando que era o celular —
   e marcava sucesso (dormant).
3. A Reversão completa **descartava entradas dormentes sem tocar no
   aparelho** ("Já estava desfeito") — apagando o estado original do registro
   com o celular ainda torto. Sem original, sem saída.

## As mudanças

### 1. Reset de interface (a saída que não existia)

Botão **"Restaurar interface do celular"** — na coluna esquerda (seção
Manutenção) e no diálogo da Reversão. Reverte todas as entradas de modo
(inclusive dormentes) para a camada **original** da primeira configuração
(`sleepOneImpl` com `layer: 'original'` + `force`), apaga o `phoneRevert`
contaminado e preserva apps, arquivos, perfis nomeados e o perfil TV
(`entry.task` não é tocado nem refotografado). Fluxo robusto herdado da ponte
(variante `reset` do `ModeSwitchDialog`); não grava `pendingSwitch`.

### 2. Fim do descarte cego de dormentes (o elo que perdia o original)

`revert:one`: uma entrada dormente só é esquecida depois de **conferir no
aparelho** que o estado ORIGINAL vale (`verifyRevert` contra `entry.revert` —
conferir o `phoneRevert` não pegaria a contaminação, pois o aparelho COMBINA
com um retrato torto escrito "com sucesso"). Se não vale, a reversão executa
de verdade. Sem leitura possível, prefere reverter a afirmar que estava bem.

### 3. Vacina na captura (a prevenção na origem)

`captureLooksLikeTv` (runner, 11 testes de mesa): na ida ao TV, um retrato
"de celular" com cara de TV é **descartado** — valor idêntico ao que o modo
TV aplica (`setting`/`settings`/`dnd`), **qualquer** override de resolução
(`wmsize`), dpi da tabela de TV com ±20% (`density`: 256/320/384/480/512/
576/640/768). Fallback: `phoneRevert` anterior (se limpo) ou o original.
Falso positivo aceito e inofensivo: quando o valor de celular do usuário
coincide com o de TV, o fallback carrega o mesmo valor — efeito nulo.

### 4. Diário de trocas (diagnóstico sem memória)

`journal` no arquivo do registro (máx. 80 eventos, entra no export/import):
cada alternância anota um resumo (`troca`: direção, variante, ok/aviso/
pulado/bloqueado/interrompida); a vacina anota `captura-descartada`; o guard
da Reversão anota `dormente-restaurado`. **Visível na UI**: "Diário de
trocas" na seção Manutenção lista os últimos 12 eventos em linguagem simples
com data/hora.

### 5. Chip de estado do modo (fim da dedução)

`ModeStatusChip` sob o celular, em qualquer fase: **"Modo TV ativo"**,
**"Modo celular"** ou **"Troca de modo incompleta — concluir"** (alerta
CLICÁVEL que retoma a troca de onde parou — antes, a pendência só aparecia ao
reconectar o aparelho).

### 6. Seção "Manutenção" (a oficina num lugar só)

Coluna esquerda ganhou o agrupamento: Restaurar interface → Check-up →
Reversão completa → Reverter específica → Diário de trocas. A ponte de modos
fica acima, fora da seção — é uso diário, não manutenção.

### 7. Guia de primeira configuração (expectativa certa desde o início)

`FirstSetupGuideDialog` + `data/firstSetupGuide.js`: ao conectar um aparelho
**sem nenhuma configuração**, um guia único (por aparelho — `prefs.introSeen`,
serial estável) explica a filosofia: monte o setup de TV → ficou ideal? salve
como perfil e permaneça (mudanças repetidas de interface podem sobrepor
configurações e atrapalhar a alternância) → depois só alimente de conteúdo
(apps, arquivos, emuladores, jogos) → se a tela desandar, Restaurar
interface. Reabre pelo botão discreto "Guia de primeiros passos".

### 8. Espelhamento recriado após a troca (backlog de 18/07)

Concluída uma alternância com o scrcpy aberto, a sessão é recriada
automaticamente (`restartIfRunning`) — a troca de resolução podia degradar o
stream até alguém fechar e reabrir na mão.

## Regras preservadas

- Toda alteração no aparelho segue com reversão registrada; nada sai do
  registro no reset de interface (entradas ficam dormentes).
- Launcher com mapeamento fixo por modo; rotação sempre ao original; merge
  preserva o estado mais antigo; `wm size` comparado como par de dimensões.

## Validações

- `node --check` em todos os .js de `src/main/` · build Vite ok · app sobe.
- `captureLooksLikeTv`: 11 casos de mesa (contaminados × limpos) — ok.
- **Aparelhos reais (21/07 à noite)**: S23 Ultra (One UI/A16), S21 FE
  (One UI/A16) e Galaxy S8 (LineageOS 21/A14) — 24 trocas registradas no
  diário, 0 avisos, 0 bloqueios; retomada e ponte automática incluídas.
  Relato completo em `TESTES-21-07-2026-validacao-3-aparelhos.md`.
