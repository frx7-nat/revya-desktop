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

## Cenário 2 — Recuperação automática (servidor ADB derrubado)

O caso que o app tenta resolver **sozinho**, sem envolver o usuário. É a
funcionalidade que o `recover` do `checkDevices` existe para cobrir.

**Provocar** (com o aparelho conectado e o app aberto):

```bash
adb kill-server
```

**Esperado:**

- [ ] O app percebe a queda
- [ ] Mostra `status.recovering` ("Reiniciando a conexão…")
- [ ] Reinicia o servidor sozinho e volta a `ready`
- [ ] Ao fim, informa `status.recovered` ("A conexão foi reiniciada automaticamente")
- [ ] **Não** exige nenhuma ação do usuário

**Anotar:** tempo total até voltar ao normal. _(preencher)_

> Se o app **não** se recuperar sozinho aqui, é achado `ALTO`: a recuperação
> automática é a promessa central desta tela.

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

**Anotar:** a mensagem foi suficiente para agir sem ajuda externa? _(preencher)_

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
