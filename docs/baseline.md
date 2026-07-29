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

> **A versão do One UI ficou pendente** — `ro.build.version.oneui` não foi lido
> porque os aparelhos estavam fora do ar. Completar na próxima conexão.

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

## 6. NÃO verificado — e é isso que a revisão não pode assumir

| item | situação |
| --- | --- |
| **Conversão completa + reversão em um clique**, ponta a ponta | feito em 21/07 com 3 aparelhos (24 trocas, 0 falhas), mas **não repetido** depois das mudanças de 27–28/07 |
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
- [ ] **Rodar o teste completo de conversão + reversão num aparelho** e promover
      as linhas da seção 6 que passarem
- [ ] Ler `ro.build.version.oneui` dos dois aparelhos

> A Fase 0 fica **incompleta de propósito** enquanto os dois itens acima não
> forem feitos. O congelamento e os binários já existem — o que falta é a parte
> da linha de base que só um aparelho conectado pode dar, e ela é justamente a
> que protege o núcleo do produto (a reversibilidade) durante os refactors.
