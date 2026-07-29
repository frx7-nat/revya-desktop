# Fase 4 — triagem dos achados do revisor externo

Revisor: **Codex CLI 0.146.0**, somente leitura, 29/07/2026 15:58–16:01.
Relatório cru: `resultado-codex-20260729-1558.md`.

Ele fez trabalho de verdade — a transcrição mostra que abriu `adb.js`,
`main.js` e o `package.json`, e chegou a **rodar** `scripts/check-i18n.js`. Não
foi uma leitura de diff.

---

## Placar

| # | severidade dele | severidade após aferição | procede? |
| --- | --- | --- | --- |
| 1 | ALTO | **MÉDIO** | sim, com a causa do dano corrigida |
| 2 | MÉDIO | **MÉDIO** | sim, e há prova viva na máquina |
| 3 | MÉDIO | **BAIXO** | mecanismo sim, cenário não |

Os três merecem conserto. Nenhum é caro.

**O diagnóstico da Fase 2 — que eu escrevi — não levantou nenhum dos três.**
É o resultado que justifica a fase existir.

---

## 1. Serial mDNS não é reconhecido como sem fio

`adbDiagnostics.js:104` · `adbOrchestrator.js:123` · `adbOrchestrator.js:148`

**Procede.** O regex `/^[^\s:]+:\d+$/` só reconhece `host:porta`. A Depuração
sem fio do Android (11+) expõe o aparelho por mDNS com serial no formato
`adb-R5CT21XXXXX-QXjCrW._adb-tls-connect._tcp`, que não casa.

**Onde ele exagerou:** o relatório diz que o `kill-server` "apaga o pareamento"
também nesse caso. Não apaga. O pareamento mDNS vive no aparelho e o servidor
do adb redescobre e reconecta sozinho os serviços `_adb-tls-connect._tcp` já
pareados — é por isso que ninguém repareia depois de reiniciar o adb. O
`connect ip:5555`, esse sim, morre de vez, porque nada o refaz.

**O dano real é outro, e continua sendo dano:** a mensagem. Um aparelho mDNS
`offline` cai em `diagnostics.offline`, que promete *"aguarde — o DexArmor vai
reiniciar a conexão automaticamente"* e manda **trocar o cabo USB** — para
alguém que não tem cabo nenhum ligado. É exatamente o defeito que a variante
`offlineWireless` foi criada para eliminar, escapando pela porta dos fundos.

**Alcance:** o fluxo do próprio DexArmor nunca produz esse formato — ele usa
`tcpip 5555` + `connect ip:5555` (`main.js:807-814`). Só chega lá quem já
pareou pela Depuração sem fio do Android por conta própria. Estreito, não
impossível.

**O que ele NÃO viu, e é o que torna isto perigoso de consertar:** o mesmo
regex está escrito **três vezes**, em dois arquivos. Corrigir em dois lugares e
esquecer o terceiro deixaria o app decidindo uma coisa no diagnóstico e outra
no orquestrador — pior que o defeito atual. O conserto tem de começar por
unificar.

**Erro meu, que vale registrar:** o prompt que escrevi afirmava que o formato
mDNS *"foi considerado"*. Não foi — não há uma linha sobre ele no código.
Plantei no revisor uma garantia falsa que poderia ter enterrado justamente este
achado. Ele conferiu assim mesmo.

---

## 2. Laço de reconexão serial: N × 4 s

`adbOrchestrator.js:160`

**Procede, e não é hipótese.** O `adb devices` desta máquina, agora:

```
192.168.3.3:5555   offline   product:dm3qxxx model:SM_S918B
```

Sobra do teste de ontem. Endpoints TCP mortos **ficam** na lista — é assim que
se acumulam os 9 do cenário dele. Com o laço serial e 4 s de teto por endpoint,
a recuperação leva 4 × N segundos, e a tela fica em "recuperando" até o último.

Eu dimensionei o timeout **por endpoint** e não somei o conjunto. O comentário
que escrevi ao lado do `RECONNECT_TIMEOUT_MS` até explica por que 4 s é curto —
e é justamente essa explicação convincente que fez o total passar batido.

**Conserto:** disparar os `connect` em paralelo (`Promise.allSettled`). O total
vira ~4 s independente de N, e o servidor do adb atende clientes concorrentes
sem problema.

---

## 3. `start-server` falhando pula a reconexão

`adbOrchestrator.js:149-170`

**O mecanismo procede; o cenário dele é impossível.**

Mecanismo: o laço de `connect` está dentro do mesmo `try` dos subcomandos. Se o
`start-server` estourar, o `catch` engole e a reconexão nunca roda — depois de
o `kill-server` já ter derrubado os transportes. Real.

Cenário dele: *"um Galaxy por Wi-Fi legado **pronto** e um USB offline"*. Esse
estado não dispara recuperação nenhuma. `actionable` ordena por severidade e
`OK` vem primeiro (`adbDiagnostics.js:159-167`), e `READY` tem
`autoRecover: null` (linha 45). **Havendo qualquer aparelho pronto, a
recuperação não roda.** Ele descreveu o mecanismo certo com um exemplo que não
alcança o código.

O cenário que alcança é mais estreito: USB `offline` como foco **e** um
endpoint sem fio também não-pronto na mesma lista.

**Conserto:** tirar o laço de reconexão do `try` dos subcomandos e dar a ele o
seu próprio — é reparo colateral, tem de rodar mesmo quando a recuperação
falhou pela metade. Justamente aí é que mais importa.

---

## O que ele sondou e considerou sólido

Confirmei os quatro:

- `result.actionable` nunca vem `null` de `diagnose` — o caso de lista vazia
  devolve `empty`, não `null` (`adbDiagnostics.js:148-156`)
- `confirmStable` só paga a espera após leitura divergente; nenhum chamador
  passa opções próprias; 4 × 900 ms = 3,6 s de teto
- tokens centralizados preservam todos os valores; nenhum `undefined`, nenhuma
  importação inútil
- `check-i18n` passa: 698 chaves nos dois idiomas

Sobre `severity`/`autoRecover` continuarem vindo do `MESSAGES[state]` original
na variante sem fio, ele respondeu que é coerente. Concordo, com uma ressalva
que ele não fez: é coerente **hoje** porque quem decide pular a recuperação é o
orquestrador, não o diagnóstico. São duas decisões sobre o mesmo fato em
arquivos diferentes — e o achado 1 é a primeira consequência disso.

---

## Encaminhamento — FEITO em 29/07/2026

Os três consertados, em dois branches temáticos, com o ciclo da Fase 3.

### R12 · `f695553` — serial sem fio numa definição só, mDNS reconhecido

Uma definição exportada no lugar de três cópias, e **dois** predicados onde o
revisor propunha um:

| predicado | formatos | decide |
| --- | --- | --- |
| `ehSemFio` | `host:porta` **e** mDNS | a MENSAGEM |
| `killServerDestroi` | só `host:porta` | PULAR a recuperação, e o que reconectar |

A separação é minha, não dele, e vem de ele ter errado o dano: como o
`kill-server` **não** destrói o pareamento mDNS, pular a recuperação ali seria
abrir mão de um conserto de graça — reiniciar o servidor é justamente o que
refaz a descoberta.

Aferido: 9 formatos de serial (`host:porta`, mDNS com e sem ponto final, USB
Samsung real, `emulator-5554`, vazio/`null`/`undefined`) e a mensagem ponta a
ponta — o mDNS `offline` agora lê *"Sem contato pela rede"*.

### R13 + R14 · `ffc9a36` — reconexão paralela e fora do `try`

Medido com um adb falso (9 endpoints sem fio, foco USB `offline`,
`start-server` travado):

| | antes | depois |
| --- | --- | --- |
| reconexões disparadas | **0 de 9** | **9 de 9** |
| tempo | 1,1 s | 6,0 s |
| espalhamento dos disparos | — | 0,01 s (paralelo) |

Os 5 s a mais são o preço do reparo e só ocorrem no caminho de falha. Os 0 de 9
são a prova de que o achado 3 era regressão real, não hipótese.

Conferido também com o adb real (0,2 s, sem regressão), `check-i18n` (698
chaves) e `build:renderer`.

### O que ainda não foi verificado

Nada disto passou por **aparelho real** ainda. O caminho do mDNS, em especial,
depende de parear um Galaxy pela Depuração sem fio do Android — o DexArmor
nunca produz esse formato sozinho. Fica para o ciclo de aparelho da Fase 5.
