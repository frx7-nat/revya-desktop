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

**Observação para venda:** o `.exe` sai **sem assinatura digital**, então o
Windows exibe o alerta SmartScreen ("O Windows protegeu o seu PC" → "Mais
informações" → "Executar assim mesmo"). Para eliminar isso nos clientes finais,
avaliar um certificado de code signing.
