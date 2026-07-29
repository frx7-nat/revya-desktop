# Roteiro — detecção e recuperação de erros ADB

Último item da Fase 0. Fecha a linha de base do que o app faz **quando dá
errado** — que é onde um usuário leigo decide se confia no programa.

**Data de execução:** _(preencher)_
**Aparelho:** _(preencher)_

---

## Antes de começar

O app conhece **oito** estados de diagnóstico (`src/i18n/*.json` → `diagnostics.*`):

| estado | quando aparece |
| --- | --- |
| `ready` | tudo certo |
| `noDevices` | nenhum aparelho visível |
| `unauthorized` | cabo ligado, autorização não concedida |
| `offline` | aparelho visível mas sem responder |
| `noPermissions` | o computador não tem permissão de acesso (regra de USB) |
| `otherMode` | aparelho em modo especial (recovery, sideload, fastboot) |
| `adbMissing` | o binário do ADB não foi encontrado |
| `unknown` | resposta que o app não soube classificar |

E um fluxo de recuperação automática: `querying → recovering (kill-server +
start-server) → requerying → done`.

> **Regra deste roteiro:** anotar o que apareceu na tela **na sua língua de
> usuário**, não o que o código diz. O critério é "um leigo entenderia o que
> fazer?". Mensagem tecnicamente correta e inútil na prática **reprova**.

**Preparação:**

- [ ] App aberto, aparelho conectado e reconhecido (estado `ready`)
- [ ] Anotar o idioma em que o app está — as mensagens mudam com ele
- [ ] Nenhuma execução de task em andamento

---

## Cenário 1 — Nenhum aparelho (`noDevices`)

O mais comum de todos: a pessoa abre o programa antes de ligar o cabo.

**Provocar:** desconectar o cabo USB e, se houver conexão Wi-Fi ADB ativa,
derrubá-la:

```bash
adb disconnect
```

**Esperado:**

- [ ] A tela "Conecte seu Galaxy" aparece
- [ ] Título e mensagem correspondem a `diagnostics.noDevices`
- [ ] O programa **não** trava nem mostra erro cru
- [ ] Ao reconectar o cabo, o app volta sozinho ao estado `ready`

**Anotar:** quanto tempo levou para perceber a reconexão. _(preencher)_

---

## Cenário 2 — Recuperação automática

> ### ⚠️ Correção de 29/07: `adb kill-server` NÃO serve para este teste
>
> A primeira versão deste roteiro mandava derrubar o servidor com
> `adb kill-server`. **Foi executado e não funciona como teste.** Seis capturas
> da janela do app, em t+0/1/2/3/5/8 s, saíram **byte a byte idênticas** — a
> tela não mudou em instante nenhum.
>
> O motivo está no código, não no app estar quebrado. A recuperação só dispara
> quando o diagnóstico devolve `actionable.autoRecover` não-vazio
> (`adbOrchestrator.js:95`), e isso acontece em **três** dos oito estados:
>
> | estado | `autoRecover` |
> | --- | --- |
> | `ready`, `unauthorized`, `noDevices`, `otherMode` | `null` — não recupera |
> | **`offline`**, **`noPermissions`**, **`unknown`** | `['kill-server', 'start-server']` |
>
> Matar o servidor não produz nenhum dos três: o cliente do `adb` **religa o
> daemon sozinho** na consulta seguinte, o diagnóstico volta `ready`, e não há
> o que recuperar. O comportamento observado estava **certo** — o teste é que
> não alcançava o código que pretendia exercitar.
>
> **Isso é achado por si só:** a queda do servidor ADB é invisível para o
> usuário e se cura sozinha. Bom comportamento — mas significa que a mensagem
> `status.recovered` ("A conexão foi reiniciada automaticamente") **nunca
> aparece nesse caminho**. Conferir na Fase 2 se ela aparece em algum outro, ou
> se é promessa de interface sem uso.

**Provocar de verdade** — é preciso um aparelho conectado que fique
inalcançável, que é o cenário real deste produto (aparelho na TV, por Wi-Fi):

```bash
adb tcpip 5555            # com o cabo ligado
adb connect <ip>:5555     # confirmar que aparece como "device"
# desconectar o cabo USB, deixando só o Wi-Fi
```

Com o app aberto e o aparelho em Wi-Fi, **ligar o modo avião** no aparelho. A
entrada no `adb devices` passa a `offline`.

> Conectar a um IP onde não há nada **não serve**: o `adb connect` falha com
> "Operation timed out" e não cria entrada alguma. Testado em 29/07.

---

### 🔴 EXECUTADO em 29/07 — ACHADO `ALTO`

**A recuperação automática QUEBRA a conexão Wi-Fi em vez de restaurá-la.**

Executado no S23 Ultra (SM-S918B, One UI 8.5) em `192.168.3.3:5555`, com o cabo
desconectado. Cadeia observada:

| passo | o que acontece |
| --- | --- |
| 1 | Modo avião ligado → entrada vira `offline` |
| 2 | Diagnóstico correto: `offline` tem `autoRecover: ['kill-server','start-server']` |
| 3 | A recuperação roda — fases confirmadas: `querying → recovering → requerying → done` |
| 4 | **`kill-server` DESTRÓI o pareamento sem fio**, não o reinicia |
| 5 | Reconsulta não acha entrada nenhuma → estado vira **`no_devices`** |
| 6 | Tela cai em *"Nenhum Galaxy detectado"*, com passos sobre **cabo USB** e **ativar Depuração USB** |

**O que o usuário vê:** um aparelho já configurado, que só perdeu a rede por um
instante, e o app o manda de volta ao **"Passo 1 de 5 — Abra os Ajustes"**,
ensinando a ativar modo desenvolvedor. Levou ~5 s para perceber a queda.

**E não se recupera.** Com o modo avião **desligado** e o aparelho de volta à
rede:

```
ping 192.168.3.3   2 pacotes, 0% de perda   -> acessível o tempo todo
adb devices        vazio                     -> o app nunca reconectou
adb connect ...    "connected" na hora       -> bastava uma chamada
```

Nada no código refaz o `adb connect` depois do `kill-server`. O aparelho fica
disponível na rede e o app segue mostrando instruções de cabo USB —
indefinidamente, até alguém reconectar à mão.

**Por que é `ALTO` e não `MÉDIO`:**

1. É o **cenário primário do produto** — o aparelho mora na TV, por Wi-Fi, e
   rede oscila.
2. A recuperação **piora** a situação. Por cabo, `kill-server` é inofensivo;
   sem fio, apaga o pareamento. O remédio é pior que a doença.
3. A mensagem final é **ativamente enganosa**: manda conferir cabo e ativar
   Depuração USB num aparelho onde as duas coisas já estão certas. Para um
   leigo, isso é indistinguível de "o programa quebrou".

**Direção de correção** (para a Fase 3, não agora): antes de rodar o
`kill-server`, guardar os endpoints sem fio presentes no `adb devices` e
reemitir `adb connect <ip>:5555` depois do `start-server`. Alternativa mais
conservadora: **não aplicar a recuperação por `kill-server` quando o alvo é uma
conexão sem fio** — ali ela nunca ajuda.

---

## Cenário 3 — Autorização revogada (`unauthorized`)

O erro que mais gera abandono na vida real: a pessoa liga o cabo, não vê o
diálogo do Android (ou toca em "Cancelar") e conclui que o programa não
funciona.

**Provocar:** no aparelho, **Opções do desenvolvedor → Revogar autorizações de
depuração USB**. Depois desconectar e reconectar o cabo, **sem** tocar em
"Permitir" no diálogo que aparecer.

**Esperado:**

- [ ] Estado `unauthorized`, não `noDevices` nem `unknown`
- [ ] A mensagem **diz o que fazer**: olhar a tela do celular e tocar em Permitir
- [ ] Ao autorizar (marcando "Sempre permitir"), o app volta a `ready` sozinho

### ✅ EXECUTADO em 29/07 — PASSA

S23 Ultra, autorizações revogadas e cabo reconectado, com o diálogo do Android
em pé e sem tocar em nada.

```
adb          RXCX50450PW  unauthorized
estado       unauthorized          (não caiu em noDevices nem unknown)
severidade   action_needed         (exige ação, não é bloqueio)
autoRecover  null                  (correto — só o usuário pode autorizar)
fases        querying -> done      (nem tentou recuperar, e bem)
título       "Autorize o computador no telefone"
```

A interface **corresponde** ao diagnóstico (confirmado pela usuária na tela).

Os quatro passos cobrem as armadilhas reais, não só o caminho feliz:

1. **Desbloqueie a tela** — o aviso do Android só aparece com a tela desbloqueada
2. Toque em "Permitir"
3. **Marque "Sempre permitir deste computador"** — sem isso o problema volta a
   cada reconexão
4. Se o aviso não aparecer: mudar o modo USB de "Apenas carga" para **MTP**

O 1 e o 4 são os dois motivos mais comuns de o diálogo não surgir. Estarem ali
é a diferença entre o usuário resolver sozinho e desistir.

**Após tocar em Permitir:** volta a `ready` em **1 segundo**, sem nenhum clique
no app.

> **Contraste com o cenário 2.** Aqui o app acerta em tudo: classifica certo,
> **não** tenta recuperação (que seria inútil — só o usuário pode autorizar), e
> diz exatamente onde olhar. É a mesma tela, o mesmo código de diagnóstico. A
> diferença é que o cenário 2 aciona uma recuperação que não serve para
> conexão sem fio. Isso reforça que o achado `ALTO` está na **recuperação**,
> não no diagnóstico.



---

## Cenário 4 — Aparelho some NO MEIO de uma aplicação

O mais importante do roteiro, e o único com risco real: testa se o app mantém
**reversibilidade** quando a operação é interrompida.

> ⚠️ **Este cenário deixa o aparelho em estado parcial de propósito.** Faça-o
> por último, e só com um aparelho de teste. O critério de aprovação é
> justamente conseguir desfazer depois.

**Provocar:** iniciar a **configuração recomendada** e, enquanto a fila estiver
rodando (a partir do segundo ou terceiro item), desconectar o cabo.

**Esperado:**

- [ ] O app reporta falha **do item que estava rodando**, não um erro genérico
- [ ] A fila **para** — não continua tentando aplicar o resto às cegas
- [ ] A mensagem identifica que o aparelho foi perdido
- [ ] Ao reconectar, o app volta a `ready`

**Verificar depois de reconectar** — o que importa de verdade:

```bash
# quantas entradas ficaram registradas
python3 -c "
import json,os
p=os.path.expanduser('~/Library/Application Support/dexarmor/revert/<SERIAL>.json')
d=json.load(open(p))
print(len(d['entries']),'entradas')
for e in d['entries']: print(' ', e['taskId'], '· revert:', bool(e.get('revert')))"
```

- [ ] O que **chegou a ser aplicado** tem entrada de reversão
- [ ] O que **não rodou** não deixou entrada órfã
- [ ] A **Reversão completa** desfaz tudo e devolve o aparelho ao estado inicial
- [ ] O diário registra o evento

**Anotar:** estado do aparelho após a reversão comparado ao retrato inicial.
_(preencher)_

---

## Cenário 5 — ADB ausente (`adbMissing`)

Verifica a mensagem quando o binário empacotado não está no lugar. Raro em
produção (vai dentro do instalável), mas é o estado com maior chance de
mensagem inútil, porque ninguém o vê durante o desenvolvimento.

**Provocar** (reversível — só renomeia):

```bash
cd "/Users/natalierjunior/dexarmor - app - atualizado - cópia 2/platform-tools/mac"
mv adb adb.bak
```

Reiniciar o app.

**Esperado:**

- [ ] Estado `adbMissing`, com título e mensagem próprios
- [ ] A mensagem **não** expõe caminho de arquivo cru nem stack trace
- [ ] O app não fecha sozinho

**Desfazer, obrigatoriamente:**

```bash
mv adb.bak adb
```

- [ ] Confirmado que voltou (`ls -l adb`) e o app opera de novo

### ⚠️ EXECUTADO em 29/07 — PASSA EM PARTE · achado `MÉDIO`

> **Atenção ao caminho certo.** O app EMPACOTADO usa
> `DexArmor.app/Contents/Resources/platform-tools/adb`, não a cópia do projeto
> (`adbPath()` decide pelo `isProd`). Renomear a do projeto com o app
> empacotado rodando daria um falso "passou".

**O que acertou:**

```
título     "ADB não encontrado"  ·  selo "Bloqueado"
mensagem   explica que o ADB é necessário para falar com o Galaxy
```

Sem caminho de arquivo cru, sem stack trace, o app **não fechou sozinho**, e
oferece "Verificar de novo". Ao restaurar o binário, volta a `ready`.

**O que falha — os passos são escritos para DESENVOLVEDOR:**

> 1. Verifique se o **ADB foi empacotado** junto com o aplicativo.
> 2. Se você instalou manualmente, confirme que a pasta **platform-tools está
>    no PATH**.

O usuário-alvo não sabe o que é ADB, o que significa "empacotado", nem o que é
PATH. Ele não instalou nada manualmente — baixou um `.dmg` e arrastou para
Aplicativos. A única ação útil para ele seria **"reinstale o programa"**, que é
exatamente o que os passos não dizem.

`MÉDIO`: estado raro (o ADB vai dentro do instalável), mas quando ocorre o
usuário fica travado, porque a saída oferecida não existe no mundo dele.

> Confirma a suspeita que motivou incluir este cenário: é o estado com maior
> chance de mensagem inútil **porque ninguém o vê durante o desenvolvimento** —
> quem escreveu o texto estava com a cabeça no ambiente de dev, onde as duas
> verificações fazem sentido.

---

## Cenário 6 — Conexão Wi-Fi ADB cai

Cenário real de uso: o aparelho fica na TV, conectado por Wi-Fi, e a rede
oscila.

**Provocar** (com o aparelho em Wi-Fi ADB):

```bash
adb disconnect 192.168.3.9:5555
```

**Esperado:**

- [ ] O app detecta a queda
- [ ] Tenta recuperar ou informa com clareza
- [ ] Se havia uma execução em andamento, ela **para** — não continua no vazio
- [ ] `adb connect <ip>:5555` devolve o app ao normal

---

## Fechamento

- [ ] Todos os cenários executados
- [ ] Achados anotados com severidade sugerida (`CRÍTICO`/`ALTO`/`MÉDIO`/`BAIXO`)
- [ ] `docs/baseline.md` atualizado: promover a linha "Detecção e recuperação de
      erros ADB" para verificado, com as ressalvas que aparecerem
- [ ] Aparelho devolvido ao estado inicial e conferido contra o retrato

### Achados

_(preencher durante a execução — um por linha, com o cenário de origem)_

| # | cenário | achado | severidade sugerida |
| --- | --- | --- | --- |
| | | | |
