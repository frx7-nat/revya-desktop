# Fase 4 — revisão adversarial

**Como usar:** abra este arquivo num modelo **diferente** do que escreveu o
código (Codex CLI, Gemini CLI, ou outro). Cole o conteúdo abaixo como
instrução, junto com o `diff-codigo.patch` desta mesma pasta.

---

## Escopo, e onde achar o material

Você está na raiz de um repositório git. O que está em revisão é o intervalo
entre a referência `pre-review-v1` (antes) e `HEAD` (agora).

Comece por:

```bash
git diff pre-review-v1..HEAD -- src/ scripts/ build/ package.json
```

O mesmo diff está gravado em `docs/review/fase4/diff-codigo.patch` (573 linhas)
caso prefira lê-lo de arquivo.

Revise **apenas código**: `src/`, `scripts/`, `build/`, `package.json`. O
intervalo completo também traz ~2000 linhas de `docs/` e `changeset/` — é a
papelada desta mesma revisão (relatórios, roteiros, este arquivo). Contra 237
linhas de código. **Não comente essas linhas**; use-as como referência quando
precisar, nunca como alvo.

E não pare no diff: o repositório inteiro está à sua disposição, em modo
somente leitura. Abra os arquivos vizinhos — várias das perguntas abaixo só têm
resposta fora das linhas que mudaram.

---

## Papel

Você é um engenheiro sênior contratado para **quebrar** este código antes que
ele chegue ao usuário. Não é uma revisão de cortesia. Seu trabalho é encontrar o
que o autor não viu.

Aponte defeitos com **cenário concreto de falha**: entrada específica, estado
específico, saída errada. "Poderia ser melhor" não é achado. "Se o array vier
vazio na linha X, o índice Y estoura" é achado.

Se você não encontrar nada relevante em alguma área, diga isso — é informação.
Não invente achado para parecer útil.

---

## Ponto cego declarado

**O diagnóstico que originou estas mudanças foi escrito pelo mesmo modelo que
escreveu o código.** Ele concluiu que a base é sólida e que os marcadores de
"código gerado por IA" não estão presentes. Essa conclusão pode ser correta ou
pode ser autocomplacência — é você quem decide.

Desconfie especialmente das justificativas escritas nos comentários. Elas são
detalhadas e citam medições, o que é bom sinal, mas também é exatamente o que um
autor faria para tornar uma decisão errada convincente.

---

## O que o programa faz, e o que está em jogo

**Revya** é um app Electron (macOS/Windows) que transforma celulares Samsung
Galaxy em dispositivos de TV via ADB: muda resolução, densidade, fonte, rotação,
launcher padrão, e instala um launcher próprio.

**O usuário final é leigo.** Ele não sabe o que é ADB. O app é distribuído
gratuitamente e mexe no aparelho pessoal de quem o usa.

**A propriedade mais crítica é a REVERSIBILIDADE.** Antes de qualquer alteração,
o app grava como o aparelho estava, num registro em disco (`revertStore`). Se
essa cadeia quebrar, o usuário fica com um celular alterado e sem caminho de
volta — o pior desfecho possível para este produto.

O registro guarda três camadas por entrada:

- `revert` — o estado ORIGINAL, de antes da primeira aplicação
- `phoneRevert` — o retrato VIVO do modo celular (recapturado a cada ida ao TV)
- `task` — o perfil TV vivo (personalizações do usuário viram o novo perfil)

---

## As cinco mudanças em revisão

| # | o que mudou | arquivos |
| --- | --- | --- |
| R1 | recuperação automática de ADB deixou de aplicar `kill-server` quando o aparelho em foco é sem fio e está `offline`; e passou a reconectar endpoints sem fio quando a recuperação roda por outro motivo | `adbOrchestrator.js`, `adbDiagnostics.js` |
| R2 | `confirmStable` teve a paciência ampliada de ~1,4 s para ~4,5 s | `runner.js` |
| R3 | novo estado `adbMissing` ("faltou um componente"), antes silencioso | `pt.json`, `en.json` |
| R5 | tokens de cor unificados num módulo | 6 componentes + `theme/tokens.js` |
| R8 | constante `MAX_STR` removida | `main.js` |

**Aviso sobre o diff dos JSON de idioma:** os dois arquivos aparecem com ~77
linhas alteradas cada, mas a maior parte é **reordenação alfabética** das
chaves. O conteúdo realmente novo é `diagnostics.adbMissing` (R3) e
`diagnostics.offlineWireless` (R1). Não gaste tempo diffando prosa que só
mudou de lugar — mas **confira que pt e en têm exatamente o mesmo conjunto de
chaves**, porque uma reordenação é justamente onde uma chave some sem ninguém
notar.

---

## Onde focar, em ordem de consequência

### 1. `adbOrchestrator.js` — a mudança de maior risco

O código agora **decide não recuperar** em certos casos. Perguntas que quero
respondidas:

- O regex `/^[^\s:]+:\d+$/` identifica endpoint sem fio pelo formato
  `host:porta`. **Que serial real de USB poderia casar com isso?** E que
  endpoint sem fio poderia NÃO casar? (o formato mDNS
  `adb-XYZ._adb-tls-connect._tcp` foi considerado — há outros?)
- Se `result.actionable` for `null`, o que acontece? E se `serial` for
  `undefined`?
- A decisão usa `foco.state === 'offline'` comparando com uma string literal.
  Onde essa string é definida, e o que quebra se ela mudar?
- O laço de reconexão roda dentro do mesmo `try` que os subcomandos de
  recuperação. Um erro no meio dele pula quais passos?
- `RECONNECT_TIMEOUT_MS = 4000` com N endpoints: qual o pior caso de tempo
  total, e a interface fica travada durante ele?

### 2. `runner.js` — `confirmStable`

- `retries = 4, settleMs = 900`. **Qual o novo pior caso** numa verificação
  completa, e ele é aceitável numa fila de 9 tasks?
- Há algum chamador que passe opções próprias e fique com comportamento
  inconsistente?
- A espera é paga só quando a leitura diverge — isso é verdade em todos os
  caminhos?

### 3. `adbDiagnostics.js` — a variante de mensagem

- `describeDevice` agora escolhe a chave de catálogo por condição. Se a chave
  `diagnostics.offlineWireless` faltar num idioma, o que o usuário vê?
- `severity` e `autoRecover` continuam vindo do `MESSAGES[state]` original,
  mesmo quando a mensagem vem da variante. **Isso é coerente ou é bug?**

### 4. `theme/tokens.js` — o refactor

- Algum componente passou a receber um token que antes era `undefined`? (o
  autor afirma ter verificado — confira)
- O módulo exporta `TOK` e `M_TRICOLOR` juntos; algum consumidor importa o que
  não usa?

---

## Contexto adicional disponível

Na mesma pasta do repositório:

- `docs/baseline.md` — o que "funcionar" significa, com o que foi verificado em
  aparelho real e o que **não** foi
- `docs/review/fase2-diagnostico.md` — o diagnóstico do autor (leia com
  desconfiança)
- `docs/roteiro-erros-adb.md` — os seis cenários de falha executados, com os
  resultados medidos

---

## Formato da resposta

Para cada achado:

```
SEVERIDADE: CRÍTICO | ALTO | MÉDIO | BAIXO
ARQUIVO:LINHA
CENÁRIO DE FALHA: <entrada/estado concreto> -> <resultado errado>
POR QUE O AUTOR NÃO VIU: <hipótese>
```

E ao final, uma seção **"o que eu NÃO consegui quebrar"** — as áreas que você
sondou e considerou sólidas. Isso vale tanto quanto os achados: diz onde não
gastar tempo depois.
