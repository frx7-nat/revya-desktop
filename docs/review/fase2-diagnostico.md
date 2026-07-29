# Fase 2 — Diagnóstico

**Data:** 29/07/2026 · **Base:** tag `pre-review-v1` · **Escopo:** ~14.500 linhas
(11.488 desktop + 3.026 launcher)

**Nada foi alterado.** Este documento existe para você triar: marque cada
recomendação como **aprovada / recusada / adiada** e registre o porquê das
recusas — isso vira documentação de decisão do projeto.

---

## Conclusão antes dos detalhes

O plano foi escrito para encontrar "padrões característicos de código gerado por
IA". **A evidência não sustenta essa premissa.** Os marcadores clássicos foram
procurados e não estão aqui:

| marcador que o plano previa | o que se encontrou |
| --- | --- |
| `try/catch` que engole erro sem tratar | **0** — os 29 `catch` silenciosos têm todos justificativa escrita |
| comentários que narram a linha seguinte | não é o padrão; 19% de comentário, e eles explicam **porquê**, com 37 citando data ou medição |
| nomes genéricos (`handleData`, `processResult`) | **0** |
| `utils.js` inchado | 145 linhas em 3 arquivos focados |
| camadas de abstração com um implementador | **1 classe** em todo o projeto |
| validações redundantes do mesmo dado | não observadas |

O que existe é diferente e mais interessante: **um código maduro com dívida
estrutural localizada**. Os achados abaixo são de arquitetura e de comportamento
em falha, não de qualidade de escrita.

> Uma ressalva honesta sobre este documento: eu escrevi boa parte deste código
> nas sessões anteriores. Um diagnóstico do próprio autor tem ponto cego. A
> Fase 4 (revisão adversarial por outro modelo) existe exatamente para isso, e
> **não deve ser pulada** por este relatório parecer favorável.

---

## 1. Mapa de arquitetura

### Desktop (Electron)

```
src/main/          2.684  processo principal — IPC, ponte de modos, persistência
  main.js          1.029  41 handlers IPC + ponte de modos + validação de import
  runner.js        1.003  traduz task do catálogo em chamadas ADB
  revertStore.js     307  registro de reversão (escrita atômica + .bak)
  scrcpy.js               espelhamento
  settingsStore.js        idioma
  preload.js              45 handlers expostos via contextBridge

src/adb/           1.070  camada ADB
  adb.js             714  ~40 funções, uma por comando
  adbDiagnostics.js        8 estados + severidade + passos ao usuário
  adbOrchestrator.js       consulta -> recuperação -> reconsulta

src/renderer/      6.102  React/MUI
  App.jsx            700  orquestra telas, fila de modo, estado global
  components/      5.098  25 componentes (14 deles são diálogos)
  data/tasks.js      420  catálogo de modificações + acessórios

src/i18n/ + renderer/i18n/  336  núcleo sem estado + provider React
scripts/                    642  guarda de i18n (449) + verificações de build
```

**Fluxo do pipeline ADB:** `renderer` → `preload` (contextBridge) → `ipcMain`
→ `runner.runTask()` → `adb.js` → `execFile(adb)`. A reversão percorre o
inverso, com o estado anterior gravado **antes** de cada alteração.

**Ponte de modos** (o núcleo do produto): tasks com `modeScope: 'mode'`
alternam entre celular e TV. `sleepOneImpl` fotografa o perfil TV vivo e
devolve o aparelho ao estado celular; `wakeOneImpl` reaplica. O registro guarda
três camadas por entrada: `revert` (original), `phoneRevert` (celular vivo) e
`task` (perfil TV vivo).

### Launcher (Android/Compose)

```
LauncherViewModel.kt   482  estado, navegação, persistência
ui/SettingsPanel.kt    435  painel CONFIG
ui/ (12 arquivos)           panorama, grade, foco, tema
data/ (8 arquivos)          catálogo, categorias, prefs, intents
```

Módulo único, sem DI, Compose foundation puro. **Zero permissões** no
manifesto, 1 componente exportado (a `MainActivity`, obrigatório para ser home).

---

## 2. Achados por severidade

### `CRÍTICO` — nenhum

Nenhum achado com risco de dano ao aparelho, perda de reversibilidade ou falha
silenciosa em operação ADB.

A reversibilidade foi **exercitada sob falha deliberada** na Fase 0 (cabo
arrancado e rede caída no meio da fila, em dois aparelhos) e o aparelho voltou
ao retrato original campo por campo, com personalizações intactas.

### `ALTO`

**A1 · A recuperação automática destrói a conexão Wi-Fi**
`adbDiagnostics.js:47` + `adbOrchestrator.js:95`

O estado `offline` dispara `autoRecover: ['kill-server','start-server']`. Para
um aparelho por cabo isso é inofensivo; para um **sem fio**, o `kill-server`
apaga o pareamento. A reconsulta então acha `no_devices` e a tela cai em
"Nenhum Galaxy detectado", com passos sobre cabo USB — num aparelho que já
estava configurado e só perdeu a rede. **E nada refaz o `adb connect`**: o
aparelho volta à rede e o app nunca reconecta.

Medido em 29/07 (roteiro de erros ADB, cenário 2). Restrição importante,
medida no cenário 6: **só ocorre com o app ocioso na tela de conexão** — durante
uma troca em andamento o diálogo é dono do fluxo e o pareamento sobrevive.

É o cenário primário do produto: o aparelho mora na TV, por Wi-Fi, e rede
oscila.

### `MÉDIO`

**M1 · Conferência pós-troca acusa divergência falsa**
`runner.js:611` (`confirmStable`)

`confirmStable` tenta 2 vezes com 700 ms — ~1,4 s de paciência. O override de
4K com densidade pareada força um re-layout que passa disso. **Reproduzido 3
vezes** (S21 FE por cabo, S23 por cabo, S23 por Wi-Fi); nas três, a mesma
`verifyTask` minutos depois deu tudo OK. Quando a resolução foi aplicada
isolada, na retomada, a conferência passou 9/9.

O usuário leigo vê "use Corrigir agora" e reexecuta operação que já estava
certa — e passa a desconfiar do diagnóstico do próprio app.

**M2 · Mensagem de `adbMissing` escrita para desenvolvedor**
`adbDiagnostics.js`

Os passos dizem "verifique se o ADB foi empacotado" e "confirme que
platform-tools está no PATH". O usuário-alvo baixou um `.dmg` e arrastou para
Aplicativos; não sabe o que é ADB nem PATH. A ação útil — **"reinstale o
programa"** — não é oferecida.

**M3 · `main.js` concentra responsabilidades demais**
1.029 linhas

Contém: 41 handlers IPC em 13 domínios, criação de janela, **a ponte de modos
inteira** (`preferredTask`, `sleepOneImpl`, `wakeOneImpl`, `withSwitchLock`,
`classifyObstacle` — ~180 linhas de lógica de negócio), validação de
importação, limpeza de log e formatação de bytes.

A ponte de modos é um módulo coeso preso dentro de um arquivo de infraestrutura.
É a lógica mais delicada do produto — e a mais difícil de testar onde está.

**M4 · Tokens de design duplicados em 4 arquivos**

`#0d0d0d`, `#262626`, `#3c3c3c`, `#1c69d4`, `#f4b400`, `#e22718` declarados em
`ControlCenter` (já removido na Fase 1), `HealthPanel`, `ProfilesPanel` e
`CleanupPanel`. Mudar uma cor do design exige achar quatro lugares.

**M5 · Dois esqueletos de diálogo copiados**

`jscpd`: ~87 linhas repetidas entre os diálogos de guia (FirstSetup, Sideload,
DexGuide, Contribute) e ~73 entre os de status (Checkup, Reset, ModeSwitch,
Close, TvResolution). Duas cascas — `GuideDialog` e `StatusDialog` —
eliminariam a maior parte.

### `BAIXO`

**B1 · `tw-rotate` falha no meio de si mesmo**
Altera duas coisas (trava a rotação, depois gira). Interrompido entre as duas,
deixa registro e aparelho em desacordo. Auto-corrige no ciclo seguinte; risco
só se o usuário parar ali e nunca mais alternar. **É a única task de modo com
essa forma** — vale confirmar se alguma outra a tem.

**B2 · `MAX_STR = 20000` declarado e nunca usado**
`main.js:943`. Constante morta ao lado da validação de importação — sugere que
uma verificação de comprimento foi planejada e não implementada, ou removida
sem levar a constante.

**B3 · Autoduplicação em `main.js` (17 linhas) e `runner.js` (15)**

**B4 · Sem formatador automático em nenhum dos dois projetos**
Nem ESLint/Prettier no desktop, nem detekt/ktlint no launcher.

**B5 · R8/minify desativado no launcher**
Decisão em aberto. Ativar sem conferir as regras de ProGuard para Compose
produz falha em tempo de execução que **não aparece no build** — e o APK já vai
para aparelhos reais.

---

## 3. Inventário de padrões de código gerado por IA

Procurados um a um. **O inventário está essencialmente vazio** — ver a tabela
da conclusão, no topo.

O único resíduo do gênero é o **B2** (constante morta) e o `M_TOKENS` que a
Fase 1 já removeu: objetos declarados "por precaução" e nunca consumidos.

Vale registrar o contrário, porque é o que a Fase 3 **não deve destruir**: os
comentários deste código carregam **datas, medições e o relato de defeitos que
custaram tempo** ("aconteceu cinco vezes", "medido numa TV Samsung 4K", "foi
exatamente assim que a `app_order` foi investigada"). São documentação de
decisão, não ruído. Um refactor que os apague empobrece o projeto.

---

## 4. Auditoria de segurança dirigida

### Desktop — **superfície muito estreita**

| verificação | resultado |
| --- | --- |
| `shell: true` em algum `exec`/`spawn` | **nenhum** |
| forma de execução | `execFile`/`spawn` com **argumentos em array** |
| comandos de shell com interpolação | **exatamente 1** (`stat -c %s` no envio de arquivo) — e está citado com `shellQuote` |
| `contextIsolation` | `true` |
| `nodeIntegration` | `false` |
| superfície do renderer | 45 handlers via `contextBridge`, nenhum expondo caminho arbitrário |
| dependências de produção | **nenhuma** (`dependencies` vazio) |

**Validação da importação de registro** (`main.js:944-975`) — robusta:

- limite de tamanho **antes** de ler para a memória
- teto de 500 entradas
- rejeição de byte nulo (`\0`)
- allowlist `REVERT_KINDS` para o `kind`, aplicada também ao `phoneRevert`
- **tudo-ou-nada**: valida o arquivo inteiro antes de aplicar qualquer coisa
- arquivo escolhido por diálogo nativo, não por caminho arbitrário

O comentário *"um arquivo enorme é ruído ou ataque, não um registro do
DexArmor"* mostra modelagem de ameaça deliberada.

**Vulnerabilidades do `npm audit`:** 15, todas em `node-tar` via
`electron-builder`. **Nenhuma chega ao produto** — o `node_modules` não é
empacotado (ver Fase 1).

### Launcher — **zero permissões**

| verificação | resultado |
| --- | --- |
| `uses-permission` no manifesto | **0** (nem `INTERNET`) |
| componentes exportados | 1 — a `MainActivity`, obrigatório para ser home |
| tratamento do intent HOME | `dispatchKeyEvent` consome HOME e nunca deixa o launcher se fechar |
| bibliotecas de rede | nenhuma |

O `RestrictedApi` que o lint acusa em `dispatchKeyEvent` é **falso positivo**:
sobrescrever esse método é como um launcher trata D-pad e HOME.

### Empacotamento (código de 28/07, nunca revisado)

`after-pack.js` assina ad-hoc **e confere o resultado** (identificador correto,
ausência de `linker-signed`) — falha o build se a assinatura não pegar.
`verify-win.js` testa cada `.exe` com `7z t` e publica SHA-256. `installer.nsh`
desliga o `CRCCheck` com a justificativa medida escrita no próprio arquivo.

Nenhum dos três esconde falha: todos verificam o que produzem.

---

## 5. Recomendações

Esforço: **P** ≤ 2h · **M** meio dia · **G** ≥ 1 dia

| # | recomendação | esforço | risco de regressão | triagem |
| --- | --- | --- | --- | --- |
| R1 | **A1** — guardar os endpoints sem fio antes do `kill-server` e reemitir `adb connect` depois; ou não aplicar essa recuperação a conexão sem fio | M | **médio** — mexe no caminho de recuperação | **✅ FEITA** |
| R2 | **M1** — aumentar a paciência do `confirmStable` para as tasks pesadas (resolução/densidade), ou torná-la proporcional ao tipo | P | baixo | **✅ FEITA** |
| R3 | **M2** — reescrever os passos do `adbMissing` para o usuário final ("reinstale o programa") | P | nenhum | **✅ FEITA** |
| R4 | **M3** — extrair a ponte de modos do `main.js` para `src/main/modeBridge.js` | M | **médio** — é a lógica mais delicada; exige o baseline da Fase 0 | adiada |
| R5 | **M4** — unificar os tokens de design num módulo só | P | baixo | **✅ FEITA** |
| R6 | **M5** — extrair `GuideDialog` e `StatusDialog` | M | médio | adiada |
| R7 | **B1** — avaliar tornar o `tw-rotate` atômico, ou registrar o passo parcial | P | baixo | adiada |
| R8 | **B2** — remover `MAX_STR`, ou implementar a verificação que ele sugeria | P | nenhum | **✅ FEITA** |
| R9 | **B4** — adotar formatador; **na Fase 5**, não antes (enterraria o diff que a Fase 4 compara) | P | baixo, mas diff enorme | adiada |
| R10 | **B5** — decidir sobre R8/minify | P | **alto** se ativado sem conferir ProGuard | adiada |
| R11 | `npm audit fix --force` (electron-builder 26.x) — só quando houver outro motivo para mexer no empacotamento | M | **alto** — revalidar as duas plataformas | adiada |

### Triagem — 29/07/2026

**Aprovadas para a Fase 3:** R1, R2, R3, R5, R8.

**Adiadas, com motivo:**

| # | motivo |
| --- | --- |
| R4 · extrair a ponte de modos | maior superfície do lote; melhor sozinha, com o baseline à mão |
| R6 · cascas de diálogo | idem — e o diagnóstico avisa para não fazer junto com R4 |
| R9 · formatador | Fase 5, por decisão do próprio plano: enterraria o diff que a Fase 4 compara |
| R10 · R8/minify | decisão de produto, não correção |
| R11 · electron-builder 26 | ganho zero para o usuário; só quando houver outro motivo para mexer no empacotamento |

O critério do agrupamento: as cinco aprovadas **não se sobrepõem em
superfície**, então uma regressão é atribuível. E o R1 exige aparelho por
Wi-Fi — que está montado.

### Ordem sugerida para a Fase 3

Severidade decrescente, risco crescente — e cada uma em branch próprio:

1. **R3, R8** — texto e código morto, risco nenhum, fecham rápido
2. **R2** — corrige o falso positivo que mina a confiança no app
3. **R5** — tokens; prepara o terreno para R6
4. **R1** — o achado `ALTO`; exige teste em aparelho por Wi-Fi
5. **R4** — extração da ponte de modos; **só com o baseline da Fase 0 à mão**
6. **R6** — cascas de diálogo
7. **R10, R9, R11** — decisões, para o fim

**Não recomendo** fazer R4 e R6 na mesma passagem: são os dois de maior
superfície, e juntos tornam impossível atribuir uma regressão a um deles.

---

## Fase 3 — executada em 29/07/2026

As cinco aprovadas foram feitas, cada uma em branch própria, mergeadas com
`--no-ff` para o histórico preservar o agrupamento.

| # | commit | validação |
| --- | --- | --- |
| R3 | `8d0b4ee` | texto conferido nos dois idiomas |
| R8 | `dae8bad` | verificado que a constante não apontava lacuna real |
| R2 | `9d0d7b4` | **em aparelho** — varredura completa, só o `tw-res-4k` consome a paciência nova (4,7 s) |
| R5 | `55bd2e0` | zero hexadecimais soltos; conferido que nenhum token era `undefined` antes |
| R1 | `fix/recuperacao-wifi` | **em aparelho, o ciclo inteiro** — ver abaixo |

### O R1 cresceu durante a execução, e por bom motivo

A direção registrada no diagnóstico era "guardar os endpoints antes do
`kill-server` e reconectar depois". Ao implementar, apareceu um furo nessa
ideia: se a recuperação roda enquanto o aparelho está inalcançável, o `connect`
falha, a entrada some, e as consultas seguintes não têm o que restaurar. A
correção valeria só numa janela estreita.

A evidência do cenário 6 apontava o melhor caminho: **uma entrada `offline` sem
fio se recupera sozinha**. Então a correção principal virou *não aplicar*
`kill-server` nesse caso — o remédio atrapalhava um caso que já se curava. A
reconexão de endpoints ficou como proteção **colateral**, para quando a
recuperação rodar por causa de outro aparelho.

E isso obrigou a uma terceira mudança não prevista: o texto de `offline`
prometia "o DexArmor vai reiniciar a conexão automaticamente" — promessa que o
app deixou de cumprir nesse caso — e mandava trocar o **cabo** num aparelho sem
cabo. Criada a variante `diagnostics.offlineWireless`.

**Medido no S23 Ultra, só por Wi-Fi:**

| | antes | depois |
| --- | --- | --- |
| modo avião ligado | `no_devices`, pareamento destruído | `offline`, pareamento **sobreviveu**, `recoveryAttempted: false` |
| modo avião desligado | preso em "conecte o cabo" indefinidamente | **`ready` em 1 segundo**, sem intervenção |

### Ferramentas da Fase 1 reexecutadas

Sem ciclos, sem dependência órfã, `knip` não acusa o módulo novo. A duplicação
caiu de 1,72% para 1,70% — pouco, e esperado: o R5 atacava tokens, não os
esqueletos de diálogo, que seguem sendo o R6 adiado.
