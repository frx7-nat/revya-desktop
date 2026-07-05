# Guia de Aplicação — Etapa "DeX vs Experiência de TV"

> Documento para o **Claude Code** aplicar a funcionalidade da etapa DeX no
> projeto DexArmor existente, de forma segura, na ordem correta, sem quebrar
> nada que já funciona.
>
> Leia este guia inteiro antes de começar. Ele descreve **o que** muda, **em
> que ordem**, **como verificar** antes de cada passo, e **como validar** ao
> final.

---

## 0. Visão geral da mudança

Esta funcionalidade adiciona uma etapa que ensina o usuário a desativar o
**Samsung DeX** em aparelhos que o possuem (como o Galaxy S21 FE), para que ao
conectar no HDMI o celular abra direto na interface de TV em vez do DeX.

A etapa é um **diálogo reutilizável** com duas telas (explicação + guia passo a
passo por versão do One UI) e um **aviso destacado** de que o menu do DeX só
aparece nas configurações com o HDMI já conectado. O diálogo é acessível por
dois botões: um no topo do painel esquerdo ("Desativar DeX") e outro no painel
central (visível quando o aparelho está validado).

**Nada nesta mudança mexe em ADB ou no provisionamento.** É só interface e
conteúdo. Portanto não há risco para a lógica que conversa com o aparelho.

### Arquivos afetados

| Arquivo | Tipo |
|---------|------|
| `src/renderer/data/dexGuide.js` | **novo** |
| `src/renderer/components/DexGuideDialog.jsx` | **novo** |
| `src/renderer/App.jsx` | editado |
| `src/renderer/components/DevicePanel.jsx` | editado |
| `src/renderer/components/TaskPanel.jsx` | editado |

---

## 1. Pré-condições (verificar ANTES de começar)

Confirme que o projeto está no estado esperado. Rode estas checagens; se alguma
falhar, **pare e avalie** antes de prosseguir.

```bash
# Estar na raiz do projeto (deve listar package.json e a pasta src/)
ls package.json src/renderer/App.jsx

# Estes DOIS arquivos NÃO devem existir ainda (serão criados):
ls src/renderer/data/dexGuide.js 2>/dev/null && echo "JÁ EXISTE (revisar)" || echo "ok: ausente"
ls src/renderer/components/DexGuideDialog.jsx 2>/dev/null && echo "JÁ EXISTE (revisar)" || echo "ok: ausente"

# Estes componentes-âncora DEVEM existir (a edição depende deles):
grep -q "export default function DevicePanel" src/renderer/components/DevicePanel.jsx && echo "ok: DevicePanel"
grep -q "export default function TaskPanel" src/renderer/components/TaskPanel.jsx && echo "ok: TaskPanel"
grep -q "showAccessories={leftView === 'accessories'}" src/renderer/App.jsx && echo "ok: App tem leftView/showAccessories"
```

> Se `dexGuide.js` ou `DexGuideDialog.jsx` já existirem, significa que parte
> desta mudança já foi aplicada antes. Nesse caso, faça um diff com o conteúdo
> da seção 3 em vez de sobrescrever cegamente.

### Salvaguarda recomendada

Antes de editar, garanta que dá para reverter. Se o projeto usa git:

```bash
git status                 # confira que está limpo ou que sabe o que há pendente
git add -A && git commit -m "checkpoint antes da etapa DeX"  # opcional, recomendado
```

Sem git, faça uma cópia da pasta `src/renderer` antes de começar.

---

## 2. Ordem de aplicação

Aplique nesta ordem exata. A ordem importa porque os arquivos editados
**importam** os arquivos novos — criar os novos primeiro evita um estado
intermediário em que o app referencia algo inexistente.

1. **Criar** `src/renderer/data/dexGuide.js` (dados — não depende de nada).
2. **Criar** `src/renderer/components/DexGuideDialog.jsx` (importa o dexGuide).
3. **Editar** `src/renderer/App.jsx` (importa o diálogo, adiciona estado e props).
4. **Editar** `src/renderer/components/DevicePanel.jsx` (botão central).
5. **Editar** `src/renderer/components/TaskPanel.jsx` (botão no painel esquerdo).

Entre o passo 2 e os demais o app não roda (referência pendente), então faça os
cinco passos numa única sessão antes de testar.

---

## 3. Conteúdo dos arquivos novos

> Os changesets `CHANGESET-dex-vs-tv.md` e `CHANGESET-dex-botao-aviso.md` contêm
> o conteúdo completo, já consolidado, dos dois arquivos novos e de todas as
> edições. **Use-os como fonte da verdade para o texto exato.** Esta seção
> resume o papel de cada um; não reproduz o código para evitar divergência.

- **`dexGuide.js`** — exporta quatro constantes: `DEX_EXPLAIN` (texto da
  explicação e a comparação DeX vs TV), `DEX_VERSIONS` (os passos por versão:
  One UI 6/7, One UI 8, e "sem DeX"), `DEX_NOTE` (observação sobre variação de
  nomes) e `DEX_HDMI_WARNING` (o aviso de que o menu só aparece com HDMI
  conectado). É um arquivo de dados puro, sem JSX.

- **`DexGuideDialog.jsx`** — o componente do diálogo. Recebe `open` e `onClose`.
  Tem duas telas internas (`Explain` e `Guide`) e o componente `HdmiWarning`,
  exibido nas duas. Importa as constantes do `dexGuide.js`.

Aplique o conteúdo **literal** desses dois arquivos a partir dos changesets.

---

## 4. Edições nos arquivos existentes

Cada edição abaixo é "encontrar e substituir". O texto a encontrar deve existir
**exatamente** no arquivo. Se não existir (porque você editou manualmente
antes), localize o trecho equivalente e aplique a mesma mudança conceitual.

### 4.1 `src/renderer/App.jsx` — 4 pequenas mudanças

1. **Import** do diálogo, ao lado do import de `CloseDialog`.
2. **Estado** `const [dexGuide, setDexGuide] = useState(false);`, junto aos
   outros `useState` (perto de `leftView`).
3. **Prop** `onOpenDexGuide={() => setDexGuide(true)}` no `<DevicePanel>` **e**
   no `<TaskPanel>`.
4. **Render** do `<DexGuideDialog open={dexGuide} onClose={() => setDexGuide(false)} />`
   logo após o `<CloseDialog ... />`.

O texto exato de cada find/replace está em `CHANGESET-dex-vs-tv.md` (itens 3a–3d)
e `CHANGESET-dex-botao-aviso.md` (item 4).

### 4.2 `src/renderer/components/DevicePanel.jsx` — 3 mudanças

1. **Import** `import TvIcon from '@mui/icons-material/Tv';`.
2. **Prop** `onOpenDexGuide` na desestruturação das props do componente.
3. **Botão** "DeX vs Experiência de TV" logo após o aviso "Selecione ao menos
   uma modificação", dentro do bloco da ficha técnica.

Texto exato em `CHANGESET-dex-vs-tv.md` (item 4).

### 4.3 `src/renderer/components/TaskPanel.jsx` — mudança que exige atenção

Esta é a edição mais delicada porque envolve **abrir e fechar um fragmento JSX
`<>...</>`**. Faça com cuidado:

1. **Imports**: adicionar `Button` à lista do `@mui/material` e
   `import TvIcon from '@mui/icons-material/Tv';`.
2. **Prop** `onOpenDexGuide` na assinatura do `TaskPanel`.
3. **Abrir fragmento + botão**: o trecho que hoje é
   ```jsx
   ) : (
     TASK_GROUPS.map((group) => (
   ```
   passa a abrir um fragmento `<>`, inserir o `<Button>Desativar DeX</Button>`, e
   então iniciar `{TASK_GROUPS.map((group) => (`.
4. **Fechar fragmento**: no final, onde hoje é
   ```jsx
       ))
     )}
   ```
   passa a ser
   ```jsx
       ))}
     </>
   )}
   ```

> **Ponto crítico de não-quebra:** o número de `(` e `)` muda nesta edição
> porque o `.map(...)` deixa de estar solto e passa a ser `{...map(...)}` dentro
> do fragmento. Confira que, após a edição, todo `<>` tem seu `</>` e que o
> `.map` está envolto em `{ }`. A validação da seção 5 detecta esse tipo de erro.

Texto exato em `CHANGESET-dex-botao-aviso.md` (itens 3a–3c).

---

## 5. Validação (rodar DEPOIS de aplicar tudo)

Execute em sequência. Todos devem passar.

### 5.1 Os arquivos novos existem e parseiam

```bash
ls -la src/renderer/data/dexGuide.js src/renderer/components/DexGuideDialog.jsx

# O módulo de dados deve carregar e expor as 4 constantes:
node --input-type=module -e "import('./src/renderer/data/dexGuide.js').then(m=>{
  const need=['DEX_EXPLAIN','DEX_VERSIONS','DEX_NOTE','DEX_HDMI_WARNING'];
  const miss=need.filter(k=>!(k in m));
  console.log(miss.length? 'FALTAM: '+miss : 'ok: 4 constantes presentes');
})"
```

### 5.2 As ligações entre arquivos estão completas

```bash
# App importa e usa o diálogo, o estado e passa a prop aos dois painéis:
grep -c "DexGuideDialog" src/renderer/App.jsx          # esperado: 2
grep -c "setDexGuide" src/renderer/App.jsx             # esperado: >=3
grep -c "onOpenDexGuide" src/renderer/App.jsx          # esperado: 2 (DevicePanel + TaskPanel)

# Os painéis recebem e usam a prop:
grep -c "onOpenDexGuide" src/renderer/components/DevicePanel.jsx   # esperado: 2
grep -c "onOpenDexGuide" src/renderer/components/TaskPanel.jsx     # esperado: 2

# Botão no painel esquerdo e aviso no diálogo:
grep -c "Desativar DeX" src/renderer/components/TaskPanel.jsx      # esperado: 1
grep -c "HdmiWarning" src/renderer/components/DexGuideDialog.jsx   # esperado: >=3
```

### 5.3 Fragmento JSX do TaskPanel balanceado

```bash
echo "abre <>: $(grep -o '<>' src/renderer/components/TaskPanel.jsx | wc -l)"
echo "fecha </>: $(grep -o '</>' src/renderer/components/TaskPanel.jsx | wc -l)"
# Os dois números devem ser IGUAIS (1 e 1).
```

### 5.4 Build de verdade (a prova final)

```bash
npm run build:renderer
```

Se o Vite buildar sem erro, a integração está correta (imports resolvidos,
JSX válido, sem referência pendente). Se acusar erro, ele aponta o arquivo e a
linha — corrija e rode de novo.

### 5.5 Teste visual

```bash
npm run dev
```

Confirme:
- Na aba **Modificações** (painel esquerdo), o botão **"DESATIVAR DEX"** aparece
  no topo, antes das modificações.
- Clicando nele, abre o diálogo na tela de explicação, com o **aviso âmbar**
  sobre o HDMI.
- O botão **"Como desativar o DeX"** leva ao guia, com o seletor de versão
  (One UI 6/7, One UI 8, sem DeX) e os passos correspondentes.
- Com um aparelho validado, o botão **"DeX vs Experiência de TV"** também
  aparece no painel central e abre o mesmo diálogo.
- Fechar e reabrir o diálogo volta sempre à tela de explicação.

---

## 6. Reversão (se algo der errado)

```bash
# Com git:
git checkout -- src/renderer/App.jsx src/renderer/components/DevicePanel.jsx src/renderer/components/TaskPanel.jsx
rm -f src/renderer/data/dexGuide.js src/renderer/components/DexGuideDialog.jsx

# Ou volte ao checkpoint inteiro:
git reset --hard HEAD~1   # se você commitou o checkpoint da seção 1
```

Sem git: restaure a cópia de `src/renderer` feita na seção 1 e apague os dois
arquivos novos.

---

## 7. Checklist final

- [ ] `dexGuide.js` criado e carrega as 4 constantes (5.1)
- [ ] `DexGuideDialog.jsx` criado
- [ ] `App.jsx`: import + estado + prop nos 2 painéis + render do diálogo (5.2)
- [ ] `DevicePanel.jsx`: import TvIcon + prop + botão central
- [ ] `TaskPanel.jsx`: imports + prop + botão + fragmento balanceado (5.3)
- [ ] `npm run build:renderer` passa sem erro (5.4)
- [ ] Teste visual confere os botões e o diálogo (5.5)

Concluído o checklist, a etapa DeX está integrada e o projeto permanece
funcional, sem quebras.
