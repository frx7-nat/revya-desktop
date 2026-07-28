# Changeset — Build Windows em x64 por padrão + fim da colisão nsis/portable

Data: 22/07/2026

Ao gerar o instalador Windows a partir deste Mac (Apple Silicon / arm64),
descobrimos dois problemas na configuração de build (`package.json` → campo
`build.win`):

**Problema 1 — arquitetura errada por padrão.** O alvo `win` não declarava
arquitetura, então o `electron-builder` usava a arquitetura da máquina que roda
o build. Rodando no Mac arm64, o resultado era um instalador
**Windows-ARM64** (`DexArmor-0.1.0-arm64.exe`), que **não roda** na esmagadora
maioria dos PCs Windows (x64 / Intel-AMD) — só em Windows-on-ARM (Surface Pro X,
notebooks Snapdragon). No CI do GitHub Actions o bug ficava mascarado porque o
runner `windows-latest` é x64.

**Problema 2 — colisão de nome entre `nsis` e `portable`.** Os dois alvos
usavam o mesmo `artifactName` (`${productName}-${version}-${arch}.${ext}`),
gerando o **mesmo arquivo** `DexArmor-<versão>-<arch>.exe`. Como o `portable`
é construído depois do `nsis`, ele **sobrescrevia o instalador** — ou seja,
quem pedisse o `.exe` acabava com a versão *portable* no lugar do instalador.

**Correção:** fixar `arch: ["x64"]` nos dois alvos do `win` (instalador sai
sempre x64, independente da máquina que builda) e dar ao `portable` um
`artifactName` próprio com sufixo `-portable`, eliminando a colisão. Assim um
`npm run dist:win` passa a produzir, sem flags extras:

- `release/DexArmor-<versão>-x64.exe`          → instalador NSIS
- `release/DexArmor-<versão>-x64-portable.exe` → versão portable

**1 arquivo editado** (`package.json`). Nenhum novo arquivo de código.

> Nota de decisão: mantivemos **só x64**. É o que cobre ~99% dos PCs Windows e
> mantém o build rápido/leve. Para gerar também Windows-ARM64 no futuro, basta
> acrescentar `"arm64"` ao array `arch` de cada alvo — ou rodar pontualmente
> `electron-builder --win nsis --arm64`.
>
> Descoberta útil registrada aqui: **não é preciso instalar Wine** para gerar
> o `.exe` no Mac. O próprio `electron-builder` baixa um Wine embutido
> (`wine-4.0.1-mac`) só para o passo do `rcedit`. A tentativa de instalar
> `wine-stable` via Homebrew foi desnecessária (e emperra na senha de `sudo`
> exigida pela dependência `gstreamer-runtime`).
>
> Pré-requisito que continua valendo: os binários do Windows não ficam no Git.
> Antes do build, popular `platform-tools/win/` (adb.exe + DLLs, do
> platform-tools do Google) e `scrcpy/win/` (release win64 do scrcpy), como
> faz o `.github/workflows/build.yml`.

---

## `package.json` — campo `build.win` (+ novo bloco `build.portable`)

ENCONTRAR:
```json
    "win": {
      "target": ["nsis", "portable"],
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "perMachine": false
    },
```

SUBSTITUIR POR:
```json
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "portable", "arch": ["x64"] }
      ],
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "perMachine": false
    },
    "portable": {
      "artifactName": "${productName}-${version}-${arch}-portable.${ext}"
    },
```

**Reversão:** aplicar o caminho inverso (SUBSTITUIR POR → ENCONTRAR) restaura
o comportamento original (alvo sem arch fixa e sem bloco `portable` próprio).

---

## Validação

```bash
cd "dexarmor - app - atualizado - cópia 2"

# 1) JSON continua válido
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('OK')"

# 2) Popular binários Windows (se ainda não estiverem lá) — ver workflow do CI
#    platform-tools/win/  ->  adb.exe + AdbWinApi.dll + AdbWinUsbApi.dll
#    scrcpy/win/          ->  conteúdo do scrcpy-win64-*.zip

# 3) Gerar o instalador
npm run dist:win

# 4) Conferir que saíram os DOIS arquivos x64, sem colisão
ls -lah release/DexArmor-*-x64*.exe
#   DexArmor-0.1.0-x64.exe           (instalador NSIS)
#   DexArmor-0.1.0-x64-portable.exe  (portable)
```

---

## ⚠️ A SAÍDA DO BUILD WINDOWS MUDOU DE PASTA (28/07/2026)

```json
"dist:win": "... --config.directories.output=/private/tmp/dexarmor-build && npm run verify:win"
```

O `npm run dist:win` **não escreve mais em `release/`** — sai em
`/private/tmp/dexarmor-build` e roda um verificador no fim.

> **Primeira tentativa, e por que falhou.** A saída foi movida para
> `~/dexarmor-instaladores/` e o instalador foi apagado **lá também**. O
> Kaspersky varre a **pasta pessoal inteira**; trocar de pasta dentro dela não
> adianta. Só `/private/tmp` escapou em todos os testes. Fica o registro para
> ninguém repetir a tentativa achando que resolve.

**Por quê — medido, não suposto.** O Kaspersky desta máquina **apaga o
instalador NSIS** minutos depois de o `electron-builder` criá-lo em `release/`.
Ficou provado quando o `.exe` sumiu e o `.exe.blockmap` do mesmo build
permaneceu ao lado. O alvo **portable sobrevive**; só o `nsis` é apagado —
instalador NSIS não assinado é vetor clássico de malware e a heurística é
agressiva com ele.

**Por que isso arruinava os testes no Windows.** A usuária copiava o `.exe` de
`release/` para o PC e recebia:

> NSIS Error — Installer integrity check has failed.

Não era download ruim nem mídia danificada: era um arquivo que o antivírus já
havia começado a modificar/apagar na origem. O alvo `nsis` mantém `CRCCheck`
ligado e se autoverifica ao iniciar; o `portable` roda com `CRCCheck off` (ver o
script gerado no `builder-debug.yml`), e por isso não reclamava — o que fazia o
problema parecer intermitente.


**O portátil NUNCA foi apagado** — em nenhuma pasta, em nenhuma rodada. Quando
o instalador sumir antes de você conseguir copiar, ele é o caminho que
funciona: não instala, não desinstala, e não tem checagem de integridade para
falhar.

**`npm run verify:win`** (roda sozinho no fim do `dist:win`) faz o que o
"BUILD SUCCESSFUL" não faz: abre cada `.exe` com `7z t` — que descompacta e
confere entrada por entrada — e imprime o SHA-256. Exige `brew install p7zip`;
sem ele, avisa e segue só com o hash.

**Regra de operação:**

1. Nunca copiar o `.exe` de `release/` — lá o arquivo tem vida de minutos.
2. Conferir o SHA-256 nas DUAS pontas antes de instalar:
   `Get-FileHash arquivo.exe -Algorithm SHA256` no PowerShell.
3. Se o hash não bater, o arquivo se corrompeu. Insistir na instalação só perde
   tempo.

> Isso reclassifica a exclusão no Kaspersky (item 5 do `PENDENCIAS`): deixou de
> ser conveniência de desenvolvimento e virou **impedimento de distribuição** —
> o antivírus corrompe o entregável antes de ele sair da máquina.

---

**Observação para distribuição:** o `.exe` sai **sem assinatura digital**, então
o Windows exibe o alerta SmartScreen ("O Windows protegeu o seu PC" → "Mais
informações" → "Executar assim mesmo"). Para eliminar isso, avaliar um
certificado de code signing.

> **O atrito pesa MAIS num app gratuito** (nota de 28/07/2026, quando ficou
> decidido distribuir de graça). Quem pagou tem investimento e atravessa o
> aviso; quem está baixando um programa gratuito e desconhecido, muitas vezes
> simplesmente desiste. A tensão é honesta: certificado de code signing é caro
> de justificar sem receita direta — mas agora ele compete com a receita dos
> links de afiliado e das doações, não com nada.

---

## ✅ VALIDADO EM WINDOWS REAL — 28/07/2026

Até esta data o `.exe` era um artefato que se **acreditava** correto por
inspeção a partir do Mac: `file` no payload (`PE32+ x86-64`), tamanho do
blockmap, listagem do `win-unpacked`. Nada disso prova que o programa abre e
funciona — só que o arquivo tem a forma certa.

A usuária instalou e usou num PC Windows: **funciona igual ao macOS.**

Isso fecha uma dúvida que estava aberta desde 22/07 e que nenhuma verificação
feita do lado do Mac podia responder. Vale registrar o que a validação cobre e
o que não cobre:

| coberto | não coberto |
| --- | --- |
| Instalação pelo NSIS e abertura do app | o `.exe` **portable** (só o instalador foi testado) |
| Interface completa, nos dois idiomas | Windows-on-ARM (o build é só x64, por decisão) |
| Paridade de comportamento com o macOS | o SmartScreen continua aparecendo — é esperado, não é defeito |

**A build testada** é a de 28/07 14:07, que traz: i18n completo com as ~35
correções da manhã, formatação de número por idioma, e o APK do launcher em
`versionCode 3` assinado com a chave de release (`CN=DexArmor`).

> **O que isso muda no risco do produto.** O DexArmor deixou de ser
> "provavelmente multiplataforma" para ser multiplataforma verificado. O adb, o
> scrcpy e o caminho de instalação do APK são as partes mais dependentes de
> sistema operacional, e são justamente as que o teste exercitou.
