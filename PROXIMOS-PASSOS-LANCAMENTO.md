# O que falta para lançar

Escrito em 29/07/2026, ao fim da revisão de código (tag `review-v1-completo`
nos dois repositórios). Ordenado por importância **e por dependência**: cada
item pressupõe os anteriores. A ordem é o que evita retrabalho — fazer o 4
antes do 2 obriga a refazer o 4.

> **Atualizado em 30/07/2026**, na sessão que adiantou o que não depende do
> nome. Mexeu em três itens: **0** (pacote de backup montado e a chave
> verificada contra o APK — falta você levar para fora do disco), **3** (backup
> provisório em `git bundle`, e a descoberta de que o repositório sozinho não
> reconstrói o produto) e **4** (guia escrito em `docs/exclusoes-kaspersky.md`).
> O item 1 continua sendo o único bloqueio, e continua sendo decisão sua.

---

## Onde o projeto está hoje

Tudo abaixo está **feito e verificado em aparelho**. Não refaça nada disto.

| | estado |
| --- | --- |
| Revisão de código | Fases 0 a 5 concluídas · 17 arquivos, +352 −101 · `docs/review/` |
| Ciclo celular ⇄ TV | verificado nos dois aparelhos; retrato da volta **idêntico** à referência |
| Erros de ADB | seis cenários executados · `docs/roteiro-erros-adb.md` |
| Assinatura do launcher | chave de release desde 28/07 · APK distribuído é release |
| Instaláveis | mac (x64 + arm64) e Windows (NSIS + portátil), aferidos |
| Links de afiliado | 31 de 31 respondendo 200 |
| i18n | 698 chaves, pt e en, três guardas verdes |

Os instaláveis antigos **morreram no item 2** e foram **apagados** em
06/08/2026: tinham o nome e o `appId` velhos, e arquivo que não se deve
distribuir guardado ao lado do que se deve é acidente esperando acontecer.
Se algum dia forem necessários, a tag `ultimo-dexarmor` reconstrói.

Os válidos são os da Fase 8 da migração: `release/Revya-0.1.0.dmg` e
`-arm64.dmg`, e os dois `.exe` em `/private/tmp/revya-build`.

---

## 0. Backup da chave de assinatura — FAÇA PRIMEIRO

**Tempo: 5 minutos. É o único risco irreversível do projeto.**

```
~/.dexarmor-keys/dexarmor-release.jks
~/.dexarmor-keys/keystore.properties   (contém a senha)
```

Copie os dois para fora desta máquina — pendrive, cofre de senhas, o que for,
desde que não seja só este disco.

Sem essa chave, nenhuma atualização futura do launcher instala por cima:
obriga desinstalar, e desinstalar apaga o DataStore de todo usuário (acento,
ordem das seções, categorias que ele escolheu). Perder a chave depois do
lançamento é o pior desfecho técnico possível, e não tem conserto.

É independente do nome novo. Não espere pelo item 2.

> **Não renomeie a pasta `.dexarmor-keys` nem o `.jks`**, e **não gere chave
> nova** no item 2. O caminho está codificado em
> `dexarmor-launcher/app/build.gradle.kts:36`, é local e invisível ao usuário —
> renomear não compra nada e quebra o build. O `CN=DexArmor` do certificado
> também fica: ele não aparece em lugar nenhum que o usuário veja.

### Estado em 30/07/2026 — pacote montado, falta levar

`~/Desktop/BACKUP-CHAVE-ASSINATURA-ANDROID/` tem o `.jks`, o
`keystore.properties`, o keystore em base64 (para colar numa nota de
gerenciador de senhas), `SHA256.txt` e as instruções de restauração.

Duas coisas foram **verificadas**, não presumidas:

- o keystore **abre** com a senha que está no `keystore.properties` — alias
  `dexarmor`, `PrivateKeyEntry`, `CN=DexArmor, O=DexArmor, C=BR`, válido até
  04/07/2126. O alias e a CN guardam o nome antigo e **assim ficam**: estão
  gravados dentro da chave, e chave diferente não atualiza aparelho já
  instalado (ver o aviso do item 0)
- o certificado é **o mesmo** que assina o APK distribuído hoje: SHA-256
  `3c0bbc45f2ae…` no keystore e no
  `apks/launchers/{Launcher} Revya TV.apk`

**O que falta é físico e é seu:** arrastar a pasta para um pendrive e/ou colar o
base64 num cofre de senhas. Enquanto os dois backups estiverem só neste disco, o
risco irreversível continua exatamente onde estava — um pacote pronto no Desktop
não é um backup.

---

## 1. Decidir o nome — ✅ FEITO em 06/08/2026

O nome é **Revya**. Verificado antes de decidir: INPI livre, USPTO livre, sem
apps na Play Store, domínios disponíveis.

O custo que este item pesava — perder o SEO de `dexarmor.tech` (samsung dex,
hdmi) — foi aceito conscientemente. O posicionamento de busca recomeça do zero
sob o nome novo.

---

## 2. Aplicar o nome novo — ✅ FEITO em 06/08/2026

Executado pelo plano `MIGRACAO-REVYA-plano-executavel.md`, em 8 fases com um
commit por fase, na branch `rename-revya`. O registro completo (decisões,
valores novos e o que deliberadamente NÃO mudou) está em
[`changeset/RENAME-REVYA.md`](changeset/RENAME-REVYA.md).

O que ficou valendo:

| onde | valor |
| --- | --- |
| produto | **Revya** |
| `package.json` → `build.appId` | `com.revya.tv` |
| `package.json` → `name` (userData) | `revya` — pasta virgem, sem migração de dados |
| launcher: `applicationId` e `namespace` | `tv.revya.launcher` (era `tech.dexarmor.launcher`) |
| launcher: `versionCode` / `tasks.js` `minVersionCode` | **5** — em lockstep, como sempre |
| APK no catálogo | `apks/launchers/{Launcher} Revya TV.apk` |
| saída de build Windows | `/private/tmp/revya-build` |

**Não mudaram, de propósito:** a chave de assinatura (`~/.dexarmor-keys`,
`CN=DexArmor`) — ver o aviso do item 0 —, o `changeset/`, o `docs/review/` e os
registros de medição em aparelho (`docs/baseline.md`, `docs/retrato-tv.txt`),
que são evidência datada e não se reescrevem.

**O que este item deixou pendente para os outros:** o item 5 refaz os
instaláveis e o teste em aparelho sob o nome novo; o item 6 refaz o site e o
domínio. Os aparelhos de teste ainda têm o launcher antigo instalado como app
independente — o comando para removê-lo está no `RENAME-REVYA.md`.

---

## 3. Tirar o código desta máquina

Nenhum dos dois repositórios tem remote (`git remote -v` vazio nos dois). As
tags `pre-review-v1`, `fase4-completa` e `review-v1-completo` existem **só
aqui**.

Depois do item 2, para o repositório já nascer com o nome final:

```bash
gh repo create <nome> --private --source=. --push
git push --tags
```

Dois repositórios, dois remotes. Privado por padrão — abrir depois é um clique;
fechar depois de indexado, não.

> Fica aqui e não no item 0 porque um repositório com o nome errado é
> retrabalho; a chave, não.

### Backup provisório feito em 30/07/2026

`~/Desktop/BACKUP-CODIGO-30-07-2026/` — `git bundle --all` dos dois
repositórios, 1,9 MB no total, `git bundle verify` dizendo *"records a complete
history"* nos dois. As cinco tags estão dentro (conferido com `git ls-remote` no
próprio arquivo, não presumido). Isto tira a revisão de código desta máquina
sem criar nada no GitHub com nome provisório — **não substitui o item 3**, que
continua esperando o nome final.

Uma coisa que só apareceu ao montar o pacote, e que muda o item 6:

> **O repositório sozinho não reconstrói o produto.** O APK do launcher está
> ignorado por `apks/**/*.apk`, e os binários de `adb` e `scrcpy` também. Um
> clone limpo não tem com o que instalar o launcher: falta baixar adb/scrcpy e
> buildar o APK, o que exige a chave do item 0. Se o canal de download do item 6
> for GitHub Releases, o APK tem de ser anexado ao release — o código-fonte
> publicado não o contém.

Também não está versionado o resultado bruto da revisão adversarial
(`docs/review/fase4/resultado-codex-*.md` e o `.log-*`, ignorados por um
`.gitignore` local sem motivo escrito). A `triagem.md` que os interpreta está no
git; o material bruto, não. Os dois foram para `nao-versionados/` no pacote —
outro modelo rodando de novo não produz o mesmo texto.

---

## 4. Exclusão do Kaspersky

Precisa da interface gráfica — não dá por linha de comando, e é por isso que
ainda não foi feito.

**O passo-a-passo está em [`docs/exclusoes-kaspersky.md`](./docs/exclusoes-kaspersky.md)**,
escrito em 30/07/2026: os caminhos exatos a excluir, o caminho na interface do
Kaspersky **para Mac** (Preferências → Ameaças → Zona confiável — a
documentação de Windows manda em outro menu), o reparo do Electron e as três
checagens que provam que pegou.

O que o antivírus faz nesta máquina, medido:

- apaga instaladores NSIS em **qualquer lugar** da pasta pessoal, inclusive numa
  pasta criada só para eles (tentado, não funcionou — a saída de Windows vai
  para `/private/tmp/revya-build`)
- mata binários do Electron recém-construídos com SIGKILL (exit 137), o que
  impede `electron .`; a build **x64 empacotada** sobrevive
- **nunca** toca em `.dmg` nem em `.zip`

Dois achados de 30/07 que estão no guia e mudam o que fazer:

- o `Electron.app` **já foi apagado** de `node_modules/electron/dist/` (sobraram
  `LICENSE` e `version`). Excluir a pasta não o traz de volta: é preciso
  `rm -rf node_modules/electron/dist && node node_modules/electron/install.js`,
  e o zip está no cache local, então funciona sem internet
- excluir a **pasta** e marcar o **aplicativo** confiável são coisas diferentes.
  A pasta impede o scan em disco; o exit 137 vem da vigilância de
  comportamento. Só o segundo faz `electron .` parar de morrer

Sem isso o trabalho continua possível, só mais desconfortável.

> As exclusões são por caminho absoluto. Se o item 2 renomear pastas, elas
> apontam para o vazio **sem aviso** e o antivírus volta a comer o Electron.

---

## 5. Instaláveis finais e reteste em aparelho

**Depende do item 2.** Os instaláveis de hoje têm o nome antigo em tudo — nome
do arquivo, `.app`, identificador da assinatura, instalador NSIS.

```bash
npm run dist:mac     # x64 + arm64
npm run dist:win     # NSIS + portátil, com verify:win
```

Reaferir, porque cada um destes já quebrou uma vez:

| aferição | comando | o que aceitar |
| --- | --- | --- |
| Gatekeeper | `spctl -a -vvv release/mac*/​*.app` | `rejected` (aviso com saída). **`revoked` = bloqueio de malware sem contorno** |
| CRC do NSIS | ver abaixo | `flags=0x4` (NO_CRC). `0x0` = "integrity check failed" |
| integridade | `npm run verify:win` | `integridade ok` nos dois `.exe` |

Depois, rodar `docs/roteiro-final-fase5.md` outra vez, os três testes. **Não
adianta rodá-lo antes do item 2** — trocar o `applicationId` invalida qualquer
verificação de aparelho feita antes.

O CRC não tem script — é uma leitura de dois campos do cabeçalho NSIS, e o
`firstheader` começa **4 bytes antes** da assinatura (errar isso foi o que me
fez diagnosticar errado duas vezes):

```bash
python3 -c "
import struct, glob
for p in [x for x in glob.glob('/private/tmp/revya-build/*.exe') if 'portable' not in x.lower()]:
    d=open(p,'rb').read(); i=d.find(bytes.fromhex('efbeadde')+b'NullsoftInst')
    flags=struct.unpack('<I', d[i-4:i])[0]
    print(f'flags=0x{flags:x}  NO_CRC={\"SIM\" if flags & 4 else \"NAO\"}')
"
```

A causa e a medição estão em `changeset/CHANGESET-build-win-x64-e-colisao-nsis-portable.md`.

No teste 1, o aparelho vai exigir desinstalar o launcher antigo (2a). Conte com
reconfigurar o acento e a ordem das seções nos dois aparelhos.

---

## 6. Site e canal de download

**Depende do item 2**, e é aqui que o rename cobra o preço real.

- domínio novo (o `dexarmor.tech` deixa de servir)
- os 3 HTML do `dexarmor - site` — projeto Vercel `tivi-site`, deploy por
  `vercel deploy --prod` copiando `index - beta.html` → `index.html`
- SEO: o trabalho feito em cima de "samsung dex" e "hdmi" recomeça
- **onde ficam os instaláveis para baixar.** Isto não existe ainda e o
  lançamento não acontece sem: se você usar GitHub Releases, o repositório do
  item 3 tem de ser público
- o plano de migração para Astro (`PLANO-MIGRACAO-ASTRO.md`) é 1:1, sem
  redesign — decidido antes. Migrar **junto** com o rename dobra a superfície de
  erro; prefira uma coisa depois da outra

---

## 7. Lançar

Com 0 a 6 fechados: instaláveis assinados e aferidos, site no ar com link de
download, código e chave fora desta máquina.

Duas coisas para deixar prontas antes de anunciar, não depois:

- **como você vai medir adoção.** Já foi decidido: contagem por downloads, sem
  coletar nada do usuário. Precisa da contagem ligada em algum lugar antes do
  primeiro download.
- **onde a pessoa reclama.** Um leigo que trave no meio da conversão precisa de
  um caminho. Sem isso, o defeito volta como avaliação ruim em vez de relato.

---

## 8. Depois do lançamento

Nada aqui bloqueia. Todos com motivo já escrito.

| | o quê | onde está o motivo |
| --- | --- | --- |
| R9 | adotar formatador — commit isolado, sem concorrer com nada | `docs/review/README.md` |
| R4 | extrair a ponte de modos do `main.js` | `docs/review/fase2-diagnostico.md` |
| R6 | extrair as cascas de diálogo | idem |
| R10 | decidir sobre minify/ProGuard | idem |
| R11 | electron-builder 26 (`npm audit fix --force`) | idem — exige revalidar as duas plataformas |
| — | dedupe do seletor de aparelho (mesmo telefone duas vezes) | "Limites conhecidos" do `README.md` |
| — | `LEANBACK_LAUNCHER` no launcher | `README.md` do launcher |
| — | fluidez em S8/S9, rolagem com tecla segurada | `PENDENCIAS.md` do **launcher**, itens 2 e 3 |

---

## O que NÃO refazer

Escrito de propósito, porque cada linha aqui custou uma sessão.

- **A revisão de código.** Fases 0 a 5, tag `review-v1-completo`. As cinco
  recomendações adiadas têm motivo escrito — adiar com motivo vale mais que
  aplicar por completude.
- **Os seis cenários de erro de ADB.** `docs/roteiro-erros-adb.md`. O cenário 2
  já esteve **errado** uma vez (não alcançava o código que pretendia testar);
  a versão que está lá é a corrigida.
- **A investigação do instalador Windows.** A causa é um bit de flag do NSIS, e
  isso está medido. Mover a saída para outra pasta da `$HOME` **não** resolve —
  foi tentado.
- **O veredito do Gatekeeper.** `revoked` ≠ `rejected`. A assinatura ad-hoc do
  `after-pack.js` é o que muda um no outro.
- **A decisão sobre o produto ser gratuito.** Receita = doação + afiliado. Toda
  a documentação já foi corrigida; não há premissa de venda sobrando.

E a lição que se repetiu em todas as fases, que vale mais que qualquer achado:

> **Guarda verde não é interface verificada, e build verde não é artefato bom.**
>
> Os três defeitos de i18n passaram por guardas verdes. Os três de distribuição
> passaram por builds sem erro. O R15 passou pela revisão adversarial inteira.
> Todos apareceram do mesmo jeito: rodando a coisa de verdade.

Vale para o item 2 mais que para qualquer outro. Um rename que compila não é um
rename que funciona — só o aparelho responde isso.
