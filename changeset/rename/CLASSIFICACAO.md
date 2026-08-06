# Fase 1 — Auditoria classificada (DexArmor → Revya)

Data: 06/08/2026. Branch `rename-revya`, ponto de retorno `git tag ultimo-dexarmor`.

## Números de referência

| Medida | Valor |
|---|---|
| Ocorrências de `dexarmor` (qualquer caixa) nos fontes, docs e configs | **312** (`rename-matches.txt`) |
| Ocorrências de `\bDeX\b` em `src/` — **PROTEÇÃO, não pode mudar** | **51** (`protecao-dex.txt`) |

A contagem de 51 tem de ser IDÊNTICA ao fim da Fase 8. É o teste de que o DeX
da Samsung não foi atropelado junto com o nome do produto.

Excluídos do grep (artefatos de build, não fonte): `node_modules/`, `release/`,
`dist/`, `index-eVXZitrE.js` (bundle solto na raiz).

## Classificação

### TROCA 1 — `DexArmor` → `Revya` (nome do produto, texto visível e comentários)
- `src/i18n/pt.json`, `src/i18n/en.json` — 33 linhas cada (valores) → Fase 2
- `src/renderer/index.html` `<title>` → Fase 4
- `src/main/main.js` — título da janela, pasta de registros, mensagens → Fases 3/4
- Comentários de cabeçalho em `src/adb/*`, `src/renderer/**`, `src/main/scrcpy.js` → Fase 4
- `package.json` — `productName`, `NSLocalNetworkUsageDescription`, `maintainer` → Fase 3
- README, `docs/`, `apks/README.txt`, `scrcpy/README.txt` → Fase 6

### TROCA 2 — `dexarmor` → `revya` (identificadores)
- `package.json` / `package-lock.json` — `"name": "dexarmor"` (muda o userData) → Fase 3
- `dexarmor-build` (script `dist:win`, `scripts/verify-win.js`) → Fase 3
- `.github/workflows/build.yml` — `name: dexarmor-${{ matrix.platform }}` → Fase 3
- `dexarmor-${Date.now()}.apk` e `mkdtempSync('dexarmor-')` em `src/main/runner.js` → Fase 4
- `dexarmor-relatorio-*`, `dexarmor-reversao-*` em `src/main/main.js` → Fase 4

### CHAVES (o plano manda avaliar caso a caso) — DECISÃO: trocar as duas
Chaves de i18n e ids que contêm o nome. Trocar exige mexer nos pontos de uso;
todos foram localizados e são internos ao projeto. Seguro porque o userData
é do zero (decisão fechada) — nada gravado no disco do usuário depende deles.

| Chave/id | Vira | Pontos de uso |
|---|---|---|
| `main.import.notDexArmor` | `main.import.notRevya` | pt.json:240, en.json:240, main.js:956 |
| `lnch-dexarmor` (id de tarefa) | `lnch-revya` | tasks.js:66, tasks.js:275, pt.json:36, en.json:36 |

### PACKAGE NAME DO LAUNCHER — decisão da usuária (06/08/2026)
`tech.dexarmor.launcher` → **`tv.revya.launcher`**.
Mantém a convenção domínio-invertido que o projeto já usava (`dexarmor.tech`
→ `tech.dexarmor`; agora `revya.tv` → `tv.revya`). Definitivo: package name de
APK publicado não se muda depois. Pontos: `tasks.js:67`, `tasks.js:189` e o
projeto Android em `~/dexarmor-launcher` (Fase 5).

### MANTER — não tocar
- **`DeX`** isolado (51 ocorrências): tecnologia da Samsung. Inclui
  `DexGuideDialog.jsx`, `data/dexGuide.js`, `changeset/GUIA-APLICACAO-dex.md`,
  `changeset/CHANGESET-dex-vs-tv.md` e a linha "Android/DeX" do README.
- **`changeset/`**: histórico datado. Não se reescreve o passado — a Fase 6
  só acrescenta `changeset/RENAME-REVYA.md`.
- `index.cjs` (i18n): não é match do nome, é o padrão de módulo CommonJS.

## Ambiguidades resolvidas nesta fase (nenhuma pendente)

1. **`{Launcher} DexArmor TV.apk`** — o plano sugeriu `Revya TV.apk`, sem o
   prefixo. O prefixo `{Launcher}` é a convenção de categoria documentada em
   `apks/README.txt` e o nome tem de bater EXATAMENTE com `source.apk` do
   catálogo. Decisão: **`{Launcher} Revya TV.apk`**, preservando o padrão.
2. **`Documentos › DexArmor › registros-limpeza`** — pasta de registros no
   disco do usuário. Vira `Documentos › Revya ›`. Coerente com "do zero"; os
   registros antigos continuam na pasta antiga, legíveis, sem serem apagados.
3. **`~/.dexarmor-keys`** (chave de release do launcher, fora do repositório) —
   **não renomear**: é caminho de assinatura em uso e trocá-lo no meio da
   migração arrisca o build da Fase 5 sem ganho nenhum. Anotado como pendência
   pós-migração.

---

## Exceções do gate da Fase 6 (lista FECHADA, conferida em 06/08/2026)

O plano manda `grep -rniE 'dexarmor' README.md docs/ --include='*.md'` vazio.
Ele não fica: sobram 7 linhas, todas deliberadas. A lista abaixo é exaustiva —
qualquer linha ALÉM destas é resíduo de verdade e deve ser tratada.

| arquivo:linha | conteúdo | por que fica |
|---|---|---|
| `docs/exclusoes-kaspersky.md:48` | `/Users/natalierjunior/dexarmor-launcher` | caminho real de exclusão do antivírus; apontar para pasta inexistente não protege nada |
| `docs/exclusoes-kaspersky.md:61` | `dexarmor-launcher` (texto) | idem, explicando a linha acima |
| `docs/exclusoes-kaspersky.md:67` | a nota que explica 48 e 61 | — |
| `docs/baseline.md:12` | a nota que explica 29, 142 e 187 | — |
| `docs/baseline.md:29` | `dexarmor - app - atualizado - cópia 2` | pasta onde a linha de base foi congelada em 29/07; hoje é `~/revya`, e a linha diz as duas coisas |
| `docs/baseline.md:142` | `tech.dexarmor.launcher` | medição em aparelho real, 29/07/2026 |
| `docs/baseline.md:187` | `tech.dexarmor.launcher` | idem |

Eram 9 até 06/08/2026, quando os instaláveis antigos em `~/Desktop/DexArmor-0.1.0/`
foram apagados e as duas linhas que os citavam saíram junto.

Fora do gate por decisão do próprio plano: `changeset/` (histórico datado),
`docs/review/fase4/diff-codigo.patch` (diff literal de commits que existem) e
`docs/retrato-tv.txt` (dumpsys de aparelho, anotado no fim do arquivo).

O gate da **Fase 8.1** — `src/ scripts/ build/ package.json index.html` — esse
sim fica VAZIO, sem exceção nenhuma.
