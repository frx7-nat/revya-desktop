# Linha de base — pré-revisão v1

**Data:** 29/07/2026
**Propósito:** definir o que "funcionar" significa, de forma verificável, antes
que a revisão formal encoste no código.

Este documento é o critério de regressão das Fases 3 e 5 do
[`plano-revisao-dexarmor.md`](../plano-revisao-dexarmor.md). Se um refactor
quebrar qualquer item marcado como **verificado** aqui, é regressão.

> **Regra deste arquivo:** só entra como *verificado* o que foi observado
> funcionando, com a evidência dita. O que é suposição vai para "não
> verificado" — uma linha de base que afirma demais é pior que nenhuma, porque
> dá confiança onde não há.

---

## 1. Ponto de congelamento

| repositório | tag | commit |
| --- | --- | --- |
| desktop (`dexarmor - app - atualizado - cópia 2`) | `pre-review-v1` | `91d2333` |
| launcher (`dexarmor-launcher`) | `pre-review-v1` | `31d8fb6` |

**Nenhum dos dois tem remote**, então não há `git push --tags`. As tags existem
só nesta máquina — o que também significa que o congelamento **não sobrevive à
perda do disco**. Ver item 1 do `PENDENCIAS.md` do launcher.

O site (`landing-page-produtos`) tem um commit local não empurrado (`0aab5c9`,
correção do link de afiliado). Está fora do escopo da revisão, mas registrado
para não se perder.

---

## 2. Binários de referência

Arquivados **fora dos repositórios**, em `~/dexarmor-baseline-v1/`:

```
android/DexArmor-TV-v4-release.apk            51354eeb5e26149d0ef958860b28aeda81f97150d8103d027b1405b463fcc354
macos/DexArmor-0.1.0-arm64.dmg                00dd7f2d8c9ff6c2776ad3a5776db20b9ecd13d1ea7b7a77bd9874a8e8a3fab5
macos/DexArmor-0.1.0.dmg                      21459cdf38d202596adc05a9922d12d78f505746d1374d010f86e42139a95c16
windows/DexArmor-0.1.0-x64-portable.zip       e0665539cc384bb6d4caa0e47e0800f537206fbc10e2b6df603177bdbcfb7d2e
windows/DexArmor-0.1.0-x64.zip                d4019ccdc079324a90819a423a00f5892b143d4f07487ad4652e183e05fbc034
```

Também em `SHA256SUMS.txt`, na mesma pasta.

**Os `.exe` estão em ZIP de propósito.** O Kaspersky desta máquina apaga
instalador NSIS solto em qualquer pasta do diretório pessoal; o ZIP sobrevive.
Ver [`dexarmor-distribuicao`] nas notas do projeto.

**Assinaturas:**

- APK: `CN=DexArmor, O=DexArmor, C=BR`, SHA-256
  `3c0bbc45f2aefcea961dfa45ddaa3b7a58281caebd3c23e50adc72d307861790`
- macOS: ad-hoc, `Identifier=com.dexarmor.app`, `spctl` = `rejected`
  (**não** `revoked` — a diferença entre "aviso normal" e "malware")
- Windows: **sem assinatura** — SmartScreen esperado

---

## 3. Ambiente

| | |
| --- | --- |
| macOS | 26.5.2 (arm64) |
| Node | v24.14.0 · npm 11.9.0 |
| Electron | 31.7.7 |
| electron-builder | 24.13.3 |
| Vite | 5.4.21 |
| JDK | 17.0.20 (`/opt/homebrew/opt/openjdk@17`) |
| Gradle | 8.9 · AGP 8.6.1 · Kotlin 2.0.20 |
| SDK Android | platform 34 · build-tools 34.0.0 |

**Aparelhos de teste** (desconectados no momento deste registro; dados das
sessões de 27–28/07):

| aparelho | modelo | Android |
| --- | --- | --- |
| S21 FE | SM-G990E | 16 (SDK 36) |
| S23 Ultra | SM-S918B | 16 |
| S8 | LineageOS | (usado em 21/07, não nas sessões recentes) |

**One UI:** S21 FE = **80000** (8.0) · S23 Ultra = **80500** (8.5). Lidos em
29/07. Os dois em Android 16 / SDK 36.

---

## 4. Comportamento VERIFICADO — desktop

| item | evidência |
| --- | --- |
| Abre e opera no **macOS** | visto na tela em 28/07, em português e em inglês |
| Abre e opera no **Windows** | instalado e usado em PC real pela usuária em 28/07 |
| **Troca de idioma** pt/en | conferida na tela; 695 chaves, guarda em zero |
| Telemetria (bateria, temperatura, armazenamento) | lida de aparelho real, com formatação por idioma (`212,1 GB` em pt, `212.1 GB` em en) |
| Detecção de aparelho e tela "Conectado!" | vista com o S21 FE conectado |
| **Instalação/atualização do launcher pela ponte** | v3 → v4 aplicada nos dois aparelhos pelo `runTask` real, sem desinstalar |
| Runner recusa reinstalar quando já está em dia | responde "Já atualizado (versão 4)" |
| Instalador Windows instala e desinstala | verificado após as correções de CRC de 28/07 |

---

## 5. Comportamento VERIFICADO — launcher

| item | evidência |
| --- | --- |
| Roda como **home** num Galaxy real | S21 FE, sessões de 24–27/07 |
| Validado em **TV 4K por HDMI** | 27/07; o HDMI é espelhamento, exige `wm size 1080x1920` |
| Roteiro `TESTE-launcher-adb.md` | **20 de 20** |
| Tela **contribua** | QR lido de volta a partir de capturas, nos dois idiomas |
| **Atualização release→release** | v3 → v4 por cima; `firstInstallTime` preservado (o DataStore do usuário sobrevive) |
| APK de release não é `debuggable` | `flags=0x0`; `run-as` responde `package not debuggable` |
| Seis categorias | `Category.kt`: multimídia, navegação, launchers, emuladores, ferramentas, outros |
| Modo TV é o padrão | decidido em 25/07 comparando os dois numa TV 4K real |

---

## 5b. Ciclo celular ⇄ TV — VERIFICADO em 29/07 (S21 FE)

Executado pela **interface real do app** (build de referência), com medição por
ADB antes e depois. É o item central do baseline: reversibilidade.

**Ida (celular → TV):** todos os alvos aplicados.

| | antes | depois |
| --- | --- | --- |
| resolução | sem override | `2160x3840` (4K, lido em retrato — normalização documentada) |
| densidade | 480 | `640` (pareada) |
| fonte | 1.0 | 1.15 |
| rotação | 0 | 1 |
| não perturbe | 0 | 1 |
| animações | 1.0 ×3 | 0 ×3 |
| **home** | One UI Home | **`tech.dexarmor.launcher`** |

O launcher aplicado é o **próprio**, não o Projectivy — o cenário que o
`preferredTask` (28/07) passou a garantir.

**Volta (TV → celular): retrato IDÊNTICO ao original**, campo por campo. As 8
tasks de modo voltaram a dormentes; `lnch-dexarmor` e `tw-battery` seguiram
ativas (corretas, são estruturais); o `phoneRevert` foi recapturado.

### Achado: a conferência pós-troca acusa divergência FALSA

O diário registrou, na ida:

```
fingerprint-pos-troca   7/8 ok · 1 differing — use "Fix now"
```

Rodando a **mesma** `verifyTask` do app minutos depois, contra o mesmo
aparelho: **9 de 9 OK**. Ninguém tocou em nada entre as duas medições.

Causa provável: `confirmStable` tenta 2 vezes com 700 ms — cerca de **1,4 s de
paciência**. O override de 4K com densidade pareada força o sistema a refazer o
layout inteiro e pode passar disso. A volta, que não tem essa operação pesada,
conferiu 8/8.

**Por que importa:** o usuário leigo vê "use Corrigir agora" e reexecuta
operações que já estavam certas. Vai para a Fase 2 como achado — provável
`MÉDIO` (não corrompe estado, mas induz ação desnecessária e mina a confiança
no diagnóstico do próprio app).

---

## 5c. Ciclo celular ⇄ TV — VERIFICADO em 29/07 (S23 Ultra)

Segunda evidência, e mais exigente que a do S21 FE: One UI **8.5**, uma task a
mais (`tw-gestures`) e — o que importa — **personalizações no modo celular**
que a volta precisava preservar.

| item | antes (celular) | em modo TV | após a volta |
| --- | --- | --- | --- |
| densidade | Override **560** | 640 | Override **560** ✓ |
| fonte | **0,8** | 1,15 | **0,8** ✓ |
| resolução | sem override | `2160x3840` | sem override ✓ |
| gestos (`navigation_mode`) | 0 | **2** | 0 ✓ |
| não perturbe | 0 | 1 | 0 ✓ |
| **home** | **`com.rama.mako`** | `tech.dexarmor.launcher` | **`com.rama.mako`** ✓ |

O `com.rama.mako` é launcher de **terceiro**. A volta o restaurou — é a
correção R1 de 16/07 confirmada em aparelho: o app não impõe a One UI Home nem
engole o launcher que o usuário escolheu.

Fonte 0,8 e densidade 560 também voltaram: o app devolve o valor **do usuário**,
não o padrão do sistema.

### O achado da conferência impaciente se REPRODUZ

```
S21 FE      7/8 ok · 1 differing
S23 Ultra   8/9 ok · 1 divergente(s)
```

Nos dois casos, rodando a mesma `verifyTask` minutos depois: **tudo OK** (9/9 e
10/10). Dois aparelhos, dois One UI diferentes, mesmo comportamento — o defeito
é do **código**, não do aparelho. Sobe de "provável" para **reproduzível**.

### Diferença encontrada na volta: rotação automática

`accelerometer_rotation` era **0** antes do teste e voltou **1**.

**Não é regressão** — é comportamento projetado, documentado em dois pontos do
`main.js`. A rotação é a única task de modo **sem `phoneRevert`** (o campo está
`null` de propósito): se uma volta falhasse no meio, os valores de TV (tela
girada e travada) seriam capturados como "estado do celular" e o aparelho
alternaria torto para sempre. Então ela volta **sempre ao `entry.revert`
original**, que aqui gravou `accel: "1"`.

**A consequência, porém, é real:** qualquer alteração que o usuário faça na
rotação automática em modo celular é **perdida em silêncio** no ciclo seguinte.

Vale triar na Fase 2 — não para reverter a proteção, que tem motivo sólido, mas
para avaliar um meio-termo: capturar a rotação do celular **quando ela não
tiver cara de TV**, que é exatamente o que a vacina `captureLooksLikeTv` já faz
para os outros tipos.

---

## 6. NÃO verificado — e é isso que a revisão não pode assumir

| item | situação |
| --- | --- |
| **Detecção e recuperação de erros ADB** | não exercitada nesta rodada |
| **Pop-up de acessórios ao fechar** | não consegui reproduzi-lo em teste automatizado; a rede de 800 ms fecha direto quando a tela não confirma. **Conferir manualmente** — virou receita agora que o app é gratuito |
| Navegação em loop, ciclo de acento, menu CONFIG | validados até 26/07; não reconferidos depois do i18n |
| Fluidez em S8/S9 | nunca medida (item 2 do `PENDENCIAS`) |
| Rolagem com tecla segurada, 120+ apps | nunca medida (item 3) |
| `.exe` **portable** no Windows | só o instalador foi usado pela usuária |
| Windows-on-ARM | fora de escopo (build é x64) |

---

## 7. Critério de saída da Fase 0

- [x] Tags `pre-review-v1` nos dois repositórios
- [x] Binários de referência arquivados fora do repositório, com SHA-256
- [x] Versões de ambiente registradas
- [x] Este documento
- [x] **Ciclo conversão + reversão** verificado em **dois** aparelhos (§5b, §5c)
- [x] `ro.build.version.oneui` dos dois aparelhos
- [ ] Detecção e recuperação de erros ADB — único item do plano ainda não
      exercitado

> **A reversibilidade — núcleo do produto — está verificada em dois aparelhos,
> com One UI diferentes e com personalizações preservadas.** É a rede que a
> Fase 3 vai usar.
>
> Resta a recuperação de erros ADB. Ela exige provocar falha de propósito
> (desconectar no meio, negar autorização), e é melhor fazê-la como roteiro
> próprio do que improvisar agora.
