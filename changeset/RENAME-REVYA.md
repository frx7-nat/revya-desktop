# RENAME — DexArmor → Revya

**Data:** 06/08/2026
**Branch:** `rename-revya` · **Ponto de retorno:** tag `ultimo-dexarmor`
**Plano executado:** `MIGRACAO-REVYA-plano-executavel.md` (8 fases, um commit
por fase, gate verde antes de cada avanço)

O nome foi verificado antes da decisão: INPI livre, USPTO livre, sem apps
homônimos na Play Store, domínios disponíveis. A decisão é definitiva — os
identificadores abaixo são de mão única.

## O que passou a valer

| onde | valor |
| --- | --- |
| Produto | **Revya** |
| `package.json` → `build.appId` | `com.revya.tv` |
| `package.json` → `name` | `revya` — muda o userData para `~/Library/Application Support/revya` |
| Launcher: `applicationId` e `namespace` | `tv.revya.launcher` |
| Launcher: `versionCode` | **5** (era 4, sob o pacote antigo) |
| `tasks.js` → `minVersionCode` | **5** — em lockstep com o de cima |
| APK no catálogo | `apks/launchers/{Launcher} Revya TV.apk` |
| Id da tarefa do launcher | `lnch-revya` (era `lnch-dexarmor`) |
| Chave de i18n | `main.import.notRevya` (era `notDexArmor`) |
| Saída de build Windows | `/private/tmp/revya-build` |
| Pasta de registros de limpeza | `Documentos › Revya › registros-limpeza` |
| Pasta do projeto | `~/revya` |

### Por que `tv.revya.launcher` e não `com.revya.launcher`

O plano trazia `com.revya.launcher` como sugestão. A convenção que o projeto já
usava era domínio invertido (`dexarmor.tech` → `tech.dexarmor.launcher`), e o
domínio novo é `revya.tv` — logo, `tv.revya.launcher`. Decisão da usuária em
06/08/2026, tomada antes de qualquer troca porque package name de APK publicado
não se muda depois.

## Dados do usuário: do zero, sem código de migração

Trocar o `name` do `package.json` faz o Electron passar a usar uma pasta de
userData nova e vazia. Foi decisão fechada não escrever migração: o app trata
qualquer aparelho como novo, e a primeira configuração aparece de novo.

O userData antigo foi copiado antes de tudo para `~/backup-registros-dexarmor`
(Fase 0). Se um aparelho aparecer com algo aplicado e esquecido, o registro de
reversão de lá pode ser importado pelo ResetDialog — o app tem importar/exportar.

## O que NÃO mudou, e por quê

| item | motivo |
| --- | --- |
| `~/.dexarmor-keys/` e `CN=DexArmor` | A CN está gravada dentro da própria chave e não se muda: chave diferente não atualiza aparelho já instalado. Renomear só a pasta seria cosmético e arriscaria o único caminho que assina o release. |
| `changeset/` e `docs/review/` | Histórico datado. Reescrever o passado apaga a rastreabilidade que a revisão inteira produziu. |
| `docs/baseline.md`, `docs/retrato-tv.txt` | Registros de medição em aparelho real. Trocar `tech.dexarmor.launcher` ali transformaria observação em suposição. Ambos ficaram anotados no próprio arquivo. |
| `docs/review/fase4/diff-codigo.patch` | É um diff literal de commits que existem. Reescrevê-lo faria o arquivo deixar de corresponder ao que descreve. |
| `~/dexarmor-launcher` (pasta do repo Android) | Fora do escopo desta migração — só a pasta do desktop foi renomeada. Pendência anotada abaixo. |
| Ícone / identidade visual | O ícone atual é símbolo, sem o nome desenhado. Arte nova é trabalho de design, não deste plano. |
| **DeX** (51 ocorrências em `src/`) | Tecnologia da Samsung. Contagem conferida antes e depois: idêntica. |

## Nos aparelhos de teste

O launcher antigo continua instalado como **app independente** — package novo
não substitui package velho. Para removê-lo:

```bash
adb uninstall tech.dexarmor.launcher
```

Isso apaga o DataStore dele (acento, ordem das seções, categorias). O Revya
instala `tv.revya.launcher` do zero na primeira configuração.

Na máquina, o DexArmor antigo também convive com o Revya: `appId` diferente =
aplicativos distintos para o macOS.

## Pendências deixadas para depois

1. **Gênero em português.** As ~30 frases do `pt.json` mantiveram o artigo
   masculino da troca mecânica ("**o** Revya", "**do** Revya"). Lê-se bem, mas
   se a preferência for feminino ("a Revya"), é revisão editorial com concordância
   (gratuito→gratuita etc.), não busca-e-substitui.
2. `~/dexarmor-launcher` pode ser renomeada para `~/revya-launcher`. Se for,
   corrija `docs/exclusoes-kaspersky.md` **e** refaça a exclusão no antivírus.
3. Depósito da marca REVYA no INPI (classes 9 e 42); handles de redes; site e
   domínio (itens 5 e 6 do `PROXIMOS-PASSOS-LANCAMENTO.md`).

---

## Fase 8 — o que foi validado em 06/08/2026

### 8.1 Estática — verde

| checagem | resultado |
|---|---|
| resíduo de `dexarmor` em `src/ scripts/ build/ package.json` | **vazio** |
| proteção `\bDeX\b` em `src/` | **51** — idêntico à contagem da Fase 1 |
| `node --check` em `src/main/*.js` e `src/adb/*.js` | ok |
| `npm run check:i18n` | 698 chaves, 2 idiomas, 0 pendentes |
| `npm run build:renderer` | ok |

### 8.2 Instaladores — gerados e conferidos

| artefato | tamanho | verificação |
|---|---|---|
| `release/Revya-0.1.0.dmg` (x64) | 117 MB | `Identifier=com.revya.tv`, assinatura ad-hoc |
| `release/Revya-0.1.0-arm64.dmg` | 109 MB | idem |
| `/private/tmp/revya-build/Revya-0.1.0-x64.exe` | 89,6 MB | integridade ok (`7z t`) |
| `/private/tmp/revya-build/Revya-0.1.0-x64-portable.exe` | 89,4 MB | integridade ok (`7z t`) |

`spctl` = `rejected` no `.app` — **esperado**, é o mesmo comportamento da
`docs/baseline.md` para assinatura ad-hoc, não uma regressão da renomeação.

Os DMG antigos (`DexArmor-0.1.0*.dmg`) continuam em `release/` e **não devem ser
distribuídos**.

### 8.3 Em aparelho real — PENDENTE

Não executado: nenhum aparelho conectado (`adb devices` vazio). É a única parte
do plano que depende de hardware, e é o critério de aceite final. O roteiro está
na Fase 8.3 do `MIGRACAO-REVYA-plano-executavel.md`.

**Enquanto não passar, a branch `rename-revya` não deve ser mesclada na `main`
nem receber a tag `revya-1.0`** — o plano gate a fusão nesse teste.

Antes de rodar, no aparelho:

```bash
adb uninstall tech.dexarmor.launcher   # o launcher antigo, que sobrevive à troca
```

E na máquina, desinstalar o DexArmor antigo: `appId` diferente = apps distintos,
os dois convivem.
