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

### 8.3 Em aparelho real — PASSOU

Executado no **Galaxy S23 Ultra (SM-S918B, Android 16, serial RXCX50450PW)**,
ciclo completo, em 06/08/2026.

Pré-condição conferida antes de tocar em qualquer coisa: home era o
`com.rama.mako` (launcher de terceiro, do próprio usuário), sem override de
resolução, e o diário antigo trazia as entradas como `dormant: true` — o
"modo celular" que o plano exige. O `screen_off_timeout` alto **não** era
resíduo: o próprio registro guardava `prev: "2147483647"`.

| passo | resultado |
|---|---|
| 1. `adb uninstall tech.dexarmor.launcher` | ok — não era o home, o aparelho não ficou sem launcher |
| 2. DexArmor antigo na máquina | nunca esteve em `/Applications`; só as builds em `release/` |
| 3. Revya abre e conecta | "Conectado! SM-S918B validado", DeX verde, telemetria ao vivo |
| 4. userData virgem | guia de primeira configuração apareceu, como esperado |
| 5. Configuração recomendada + modo TV | **8/8**, `Modo TV ativo` |
| 6. Voltar ao modo celular | **8/8** — retrato IDÊNTICO ao original, campo por campo |
| 7. Reversão completa | aparelho restaurado; diário com **0 entradas pendentes** |
| 8. Launcher novo como home no modo TV | `tv.revya.launcher/tv.revya.launcher.MainActivity` ✓ |
| 8. Título do espelhamento | **"SM-S918B — Revya"** ✓ |

O que a renomeação poderia ter quebrado em silêncio, e não quebrou:

- a chave `lnch-revya` resolveu o rótulo **"Revya TV (launcher)"** na barra de
  progresso e no diálogo de reversão — se a chave e o id do `tasks.js` tivessem
  ficado dessincronizados, o rótulo sairia vazio com a guarda de i18n verde;
- o APK `{Launcher} Revya TV.apk` instalou como `tv.revya.launcher` versionCode
  **5**, e o `minVersionCode: 5` do catálogo aceitou;
- o modo TV definiu o pacote NOVO como home, e a volta restaurou o
  `com.rama.mako` — não a One UI Home.

Perfil de modo TV aplicado (bate com `docs/baseline.md`): override 2160x3840,
densidade 640, fonte 1.15, `user_rotation` 1, `zen_mode` 1.

**Critério de aceite final do plano: CUMPRIDO** (1 aparelho de 3; S21 FE e S8
não foram testados).
