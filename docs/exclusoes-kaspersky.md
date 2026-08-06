# Item 4 — exclusões do Kaspersky

Escrito em 30/07/2026. É o item 4 de `PROXIMOS-PASSOS-LANCAMENTO.md`: o único
que não dá por linha de comando, porque exige a interface gráfica do antivírus.

Nada aqui bloqueia o lançamento. Sem isso o trabalho continua possível, só mais
desconfortável — e o desconforto já cobrou duas sessões de diagnóstico errado.

**Instalado nesta máquina:** Kaspersky Anti-Virus For Mac **26.0.0.150**
(a extensão de sistema `com.kaspersky.kav.sysext` é o que age).

---

## O que ele faz aqui, medido

| comportamento | efeito |
| --- | --- |
| apaga o `Electron.app` recém-baixado dentro de `node_modules` | `electron .` não roda |
| mata binário do Electron recém-construído com SIGKILL (exit 137) | idem |
| apaga instaladores NSIS em **qualquer lugar** da pasta pessoal | por isso a saída de Windows vai para `/private/tmp/revya-build` |
| **nunca** toca em `.dmg` nem em `.zip` | os DMG e ZIP em `~/Desktop/DexArmor-0.1.0/` estão intactos |

Criar uma pasta só para os instaladores **não** resolve — foi tentado.

### O dano que existe agora (conferido em 30/07/2026)

```
node_modules/electron/dist/     → existe, mas SEM o Electron.app dentro
                                  (sobraram LICENSE, LICENSES.chromium.html, version)
/private/tmp/revya-build/    → os quatro .exe/.zip intactos
```

Confirma as duas metades da medição: o que está na pasta pessoal foi comido, o
que está em `/private/tmp` sobreviveu.

---

## Passo 1 — adicionar as exclusões (é aqui que você precisa da GUI)

Ícone do Kaspersky na **barra de menus** → **Preferências** → aba **Ameaças**
(*Threats*) → seção **Exclusões** → botão **Zona confiável** (*Trusted Zone*).

Na aba **Arquivos e pastas confiáveis** (*Trusted files and folders*), clique no
**+** e adicione, um por um:

```
/Users/natalierjunior/revya
/Users/natalierjunior/dexarmor-launcher
/private/tmp/revya-build
```

Confirme com **OK** ao fim — sem isso a lista não é gravada.

> **Para chegar em `/private/tmp`:** o diálogo do macOS não mostra pastas
> ocultas. Com o diálogo aberto, aperte **⌘ + ⇧ + G**, cole o caminho e dê
> Enter.

A pasta do projeto cobre de uma vez o `node_modules/electron/`, o `release*/` e
o `dist/`. Não precisa listá-los.

O `dexarmor-launcher` é **prevenção, não medição**: nunca vi o antivírus tocar
num APK, mas o Gradle escreve binário novo em `app/build/` a cada release, que é
o mesmo padrão que ele mata no Electron.

> **Sobre os nomes (06/08/2026).** O produto virou **Revya**, mas os caminhos
> desta lista são caminhos REAIS no disco e valem como estão: a pasta do
> desktop virou `~/revya`, enquanto `~/dexarmor-launcher` e
> `~/Desktop/DexArmor-0.1.0/` continuam com o nome antigo porque não foram
> renomeadas. Exclusão de antivírus que aponta para caminho inexistente não
> protege nada — se um dia renomear alguma delas, corrija aqui **e** refaça a
> exclusão na interface do Kaspersky.

---

## Passo 2 — reparar o Electron (linha de comando, depois do passo 1)

O zip está no cache local, então isto funciona sem internet:

```bash
cd "/Users/natalierjunior/revya"
rm -rf node_modules/electron/dist
node node_modules/electron/install.js
ls -d node_modules/electron/dist/Electron.app    # tem de existir agora
```

O `rm -rf` do `dist` é necessário: com a pasta lá e o `version` dentro, o
instalador conclui que já está instalado e não reextrai nada — foi exatamente
esse estado que o antivírus deixou.

Cache conferido em 30/07: `~/Library/Caches/electron/electron-v31.7.7-darwin-arm64.zip`
(96 MB). Se ele também tiver sido apagado, `npm install` baixa de novo.

---

## Passo 3 — adicionar o Electron como aplicativo confiável

**Só depois do passo 2**, porque o arquivo precisa existir para ser escolhido.

Mesma janela → **Zona confiável** → aba **Aplicativos confiáveis** (*Trusted
applications*) → **+** →

```
.../node_modules/electron/dist/Electron.app
```

Isto é uma coisa diferente do passo 1, e a distinção é o que faz o passo 1
sozinho não bastar: excluir a **pasta** impede o scan do arquivo em disco;
o SIGKILL no processo em execução vem da vigilância de **comportamento**. Para
o `electron .` parar de morrer com exit 137, é a lista de aplicativos que
importa.

---

## Passo 4 — verificar que funcionou

Três checagens, nesta ordem. A terceira é a que vale.

```bash
# 1. o binário sobrevive em disco
ls -d node_modules/electron/dist/Electron.app

# 2. ele executa (sem morrer com 137)
node_modules/electron/dist/Electron.app/Contents/MacOS/Electron --version

# 3. o app abre de verdade
npm run build:renderer && npx electron .
```

Se o 3 abrir a janela, a exclusão pegou e o caminho normal de desenvolvimento
voltou — sem precisar da build x64 empacotada só para ver a interface. Mate com
`kill -9` depois.

Para os instaladores Windows, o teste é gerar um e ver se ele continua lá um
minuto depois:

```bash
npm run dist:win && ls -lh /private/tmp/revya-build/*.exe
```

---

## Se o item 2 (rename) acontecer depois disto

As exclusões são por **caminho absoluto**. Renomear a pasta do projeto ou trocar
`/private/tmp/revya-build` faz cada uma delas apontar para o vazio, sem aviso
nenhum — e o antivírus volta a comer o Electron como se nada tivesse sido
configurado.

Se o rename mexer em nome de pasta, **volte aqui e refaça o passo 1** com os
caminhos novos. É a mesma armadilha do resto do projeto: configuração verde não
é configuração em vigor.

---

Fontes do caminho de UI (a documentação da Kaspersky para Mac, não a de
Windows, que tem outro menu):
[Edit the list of trusted files, folders, and websites](https://support.kaspersky.com/us/kis21mac/166599) ·
[Application preferences window](https://support.kaspersky.com/us/kis21mac/58163)
