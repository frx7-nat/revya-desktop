# Fase 1 — Auditoria mecânica

**Data:** 29/07/2026 · **Base:** tag `pre-review-v1`

Ferramentas determinísticas, sem julgamento de IA. O objetivo desta fase é
produzir **evidência objetiva** antes de qualquer opinião sobre o código.

> **Leitura obrigatória antes de agir sobre os números.** Duas das ferramentas
> produziram muito mais ruído do que sinal neste projeto. Os totais brutos
> (79 exports não usados, 15 vulnerabilidades) são **enganosos** e estão
> desmontados abaixo. Relatório mecânico não dispensa verificação.

---

## Resumo

| ferramenta | resultado bruto | após verificação |
| --- | --- | --- |
| `npm audit` | 15 vulnerabilidades (1 crítica, 13 altas) | **0 chegam ao produto** |
| `depcheck` | — | **limpo** |
| `madge --circular` | — | **nenhum ciclo** |
| `jscpd` | 24 clones · 1,72% | **real**, concentrado em diálogos |
| `knip` | 2 arquivos + 79 exports não usados | **1 achado real** |
| `gradlew lint` | 3 erros, 12 avisos | **0 erros reais**, 0 recursos órfãos |

---

## 1.1 Desktop

### `npm audit` — 15 vulnerabilidades, nenhuma no produto

Todas em `node-tar`, por esta cadeia:

```
revya → electron-builder@24.13.3 → app-builder-lib → tar@6.2.1
```

**Por que não chegam ao usuário:**

```
"dependencies"  →  NENHUMA (o app não tem dependência de produção)
"files"         →  src/main, src/adb, src/i18n, dist/renderer
```

O `node_modules` **não é empacotado**. O `tar` roda apenas nesta máquina,
durante o build, processando os zips do Electron baixados de fonte oficial.

**Correção disponível:** `npm audit fix --force` sobe o electron-builder para
26.x — **mudança quebrante**. Dado o custo (revalidar o empacotamento das duas
plataformas, incluindo o `afterPack` e o `installer.nsh` de 28/07) contra o
ganho (zero para o usuário), a recomendação é **adiar** e reavaliar quando
houver outro motivo para mexer no empacotamento.

> Um `npm audit` alarmante que não afeta o produto é o exemplo perfeito de por
> que esta fase precisa de verificação. Agir pelo número teria custado dias e
> arriscado o único caminho de distribuição que funciona.

### `depcheck` — limpo

Nenhuma dependência declarada e não usada, nenhuma usada e não declarada.

### `madge --circular` — nenhum ciclo

26 arquivos processados, nenhuma dependência circular.

### `jscpd` — 24 clones, 1,72% das linhas · ACHADO REAL

Percentual baixo, mas **concentrado** — o que importa mais que o total:

| família | arquivos | linhas repetidas |
| --- | --- | --- |
| **diálogos de guia** | FirstSetupGuide ↔ SideloadGuide ↔ DexGuide ↔ Contribute | ~87 |
| **diálogos de status** | Checkup ↔ Reset ↔ ModeSwitch ↔ Close ↔ TvResolution | ~73 |
| autoduplicação | `main.js` (17) · `runner.js` (15) | 32 |

Duas famílias de diálogo, cada uma com o mesmo esqueleto copiado. Sugere dois
componentes-casca (`GuideDialog`, `StatusDialog`) que eliminariam a maior parte.

**Fase 2 decide** se vale — abstração prematura também é defeito.

### `knip` — 79 "exports não usados" → 1 real

**O tom bruto é inútil neste projeto** e vale entender por quê:

- Módulos **CommonJS** (`adb.js`, `revertStore.js`, `scrcpy.js`,
  `settingsStore.js`, `i18n/*.cjs`) são importados inteiros
  (`const adb = require(...)`) e acessados por propriedade. O `knip` não
  rastreia isso e marcou **todos** os 40+ exports do `adb.js` como mortos.
- `scripts/after-pack.js` é entrypoint declarado em `build.afterPack`.
- `src/main/preload.js` é entrypoint do `webPreferences.preload`.

Verifiquei um a um os símbolos que ele **consegue** rastrear (exports ESM):

```
M_TRICOLOR          1 uso   (local, mas o export é desnecessário)
M_TOKENS            0 usos  <- MORTO
ACCESSORY_GROUPS    2 usos
tList              10 usos
localeFor           3 usos
waitForReadyDevice  2 usos
parseAdbDevices     3 usos
DeviceState        20 usos
Severity           13 usos
```

**Achado real:** `M_TOKENS` em `ControlCenter.jsx` — objeto de tokens de cor
nunca importado nem usado.

### Tokens de design duplicados 4× · ACHADO REAL

O `M_TOKENS` morto revelou algo maior. Os mesmos valores hexadecimais estão
declarados em **quatro** lugares:

| arquivo | constante | estado |
| --- | --- | --- |
| `ControlCenter.jsx` | `M_TOKENS` | **morto** |
| `HealthPanel.jsx` | `TOK` | vivo |
| `ProfilesPanel.jsx` | `TOK` | vivo |
| `CleanupPanel.jsx` | `TOK` | vivo |

`#0d0d0d`, `#262626`, `#3c3c3c`, `#1c69d4`, `#f4b400`, `#e22718` repetidos.
Mudar uma cor do design hoje exige encontrar quatro arquivos — e o quarto é o
morto, que ninguém atualizaria.

Conecta com o resultado do `jscpd`: a duplicação não é só de estrutura, é de
**dados de design**.

### ESLint · Prettier — NÃO CONFIGURADOS

Nenhum dos dois existe no projeto (nem config, nem dependência).

**Não foram adicionados**, e isso é deliberado. Rodar Prettier no repositório
inteiro produziria um diff gigante que **enterraria a revisão**: as Fases 2 a 4
comparam `git diff pre-review-v1..main`, e reformatação em massa tornaria esse
diff ilegível.

Recomendação: decidir na Fase 5, depois que as correções de conteúdo estiverem
integradas.

---

## 1.2 Launcher

### `gradlew lint` — 3 erros, 12 avisos · **0 recursos órfãos**

**Os 3 erros são o mesmo falso positivo.** `RestrictedApi` em
`MainActivity.kt:89` e `:94`, por sobrescrever `ComponentActivity.dispatchKeyEvent`.

É exatamente como um launcher trata D-pad e HOME — o código documenta o porquê
("consumimos DOWN e UP das teclas navegáveis — inclusive VOLTAR, que o launcher
jamais deixa fechar a si mesmo"). O lint desconhece o caso de uso.

**Avisos:**

| tipo | n | leitura |
| --- | --- | --- |
| `GradleDependency` | 5 | dependências desatualizadas |
| `MonochromeLauncherIcon` | 2 | ícone temático do Android 13+ ausente |
| `DiscouragedApi` / `NonResizeableActivity` | 3 | orientação fixa e não-redimensionável — **decisão deliberada** para TV |
| `ObsoleteSdkInt` | 1 | `mipmap-anydpi-v26` desnecessário (`minSdk` já é 26) |
| `TypographyDashes` | 1 | cosmético |

**`UnusedResources` e `UnusedIds`: zero.** O plano pedia atenção especial a
isso — não há recurso órfão no launcher.

### detekt · ktlint — NÃO CONFIGURADOS

Não existem no projeto. Acrescentá-los é **decisão**, não limpeza automática:
o primeiro `detekt` num código nunca analisado costuma apontar centenas de
itens de estilo, e triá-los agora competiria com os achados de conteúdo.

### R8 / minify — DESATIVADO

`isMinifyEnabled = false` no bloco `release`. A pergunta do plano original
("verificar se está ativo") já tem resposta; virou **decisão**:

- **A favor:** APK menor, ofuscação
- **Contra:** R8 com Compose exige regras de ProGuard corretas; um erro ali
  produz falha em tempo de execução que **não aparece no build** — e o APK já é
  distribuído a aparelhos reais

Sem um problema concreto de tamanho, o custo de risco não se justifica agora.

---

## 1.3 O que foi aplicado

Somente o seguro e inequívoco:

- [x] `M_TOKENS` removido (código morto confirmado)
- [x] `export` de `M_TRICOLOR` removido (a constante segue, usada localmente)

**Não aplicado, com motivo:**

| item | por quê |
| --- | --- |
| `npm audit fix --force` | mudança quebrante, ganho zero para o usuário |
| Prettier / ESLint | enterraria o diff da revisão |
| detekt / ktlint | decisão de ferramental, não limpeza |
| Unificar os tokens num só lugar | é refactor — Fase 3, com branch próprio |
| Cascas de diálogo | idem, e a Fase 2 decide se vale |
| `mipmap-anydpi-v26` | mexe em ícone do launcher; conferir em aparelho antes |

---

## Achados para a Fase 2

| # | achado | esforço | risco de regressão |
| --- | --- | --- | --- |
| 1 | Tokens de design duplicados em 4 arquivos | P | baixo |
| 2 | Dois esqueletos de diálogo copiados (~160 linhas) | M | médio |
| 3 | Autoduplicação em `main.js` (17) e `runner.js` (15) | P | baixo |
| 4 | Sem formatador automático nos dois projetos | P | baixo (mas diff enorme) |
| 5 | R8 desativado — decidir | P | **alto** se ativado sem cuidado |
| 6 | 5 dependências Gradle desatualizadas | P | médio |

**Critério de saída da Fase 1:** relatório consolidado ✅ · limpeza segura
aplicada ✅ · build íntegro — a verificar no commit.
