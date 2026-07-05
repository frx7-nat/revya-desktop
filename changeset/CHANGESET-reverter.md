# Changeset — Reverter alterações (reset com registro de estado)

Para o Claude Code aplicar no projeto DexArmor. Adiciona a capacidade de
**reverter** todas as modificações feitas no aparelho, com um **registro de
estado** capturado no momento de aplicar (para a reversão ser precisa, não
genérica). O botão "Reverter alterações" no painel esquerdo só fica clicável
quando há algo a desfazer.

**3 arquivos novos, 5 editados.** Nada de bibliotecas novas.

> Por ser uma mudança grande e interligada, a forma MAIS SEGURA de aplicar é
> copiar os arquivos correspondentes do projeto completo (zip `dexarmor`) por
> cima dos seus. Este changeset descreve as mudanças para quem prefere aplicar à
> mão ou revisar. A fonte da verdade do conteúdo literal é o projeto completo.

---

## Arquivos NOVOS (copiar do projeto completo)

1. `src/main/revertStore.js` — persistência do registro de reversão em disco
   (pasta userData do Electron), um arquivo JSON por aparelho.
2. `src/renderer/components/ResetDialog.jsx` — diálogo de confirmação e
   execução da reversão (item a item, com resumo honesto).

(Há também um terceiro componente que pode já existir de mudanças anteriores;
confira a lista de "editados" abaixo.)

---

## Arquivos EDITADOS — resumo das mudanças

### `src/adb/adb.js`
Adicionar três funções e exportá-las:
- `getCurrentHome(serial)` — descobre o launcher padrão atual (via
  `cmd package resolve-activity -c android.intent.category.HOME --brief`),
  para registrar antes de trocar.
- `deleteSetting(serial, ns, key)` — `settings delete`, para voltar uma chave
  ao padrão quando ela não existia antes.
- (Confirmar que `restorePackage` e `getSetting` já existem — eles já vinham de
  mudanças anteriores.)

### `src/main/runner.js` (mudança central)
- `runTask` agora **retorna `{ detail, revert }`** em vez de uma string. O
  campo `revert` descreve como desfazer aquela task; é capturado ANTES de
  aplicar (ex.: `settings get` antes do `put`; `getCurrentHome` antes de trocar
  launcher; lista de pacotes realmente removidos).
- Nova função exportada `revertEntry(serial, entry)` — desfaz uma entrada de
  reversão. Trata os tipos: `restore`, `restore-many`, `uninstall`, `setting`,
  `settings`, `home`.
- Helper `normalizePrev(raw)` — converte o `'null'`/vazio do `settings get` em
  `null` real (sinaliza que a chave deve ser APAGADA na reversão).
- Export passa a ser `module.exports = { runTask, revertEntry };`

### `src/main/main.js`
- Importar `revertEntry` do runner e o `revertStore`.
- O handler `adb:runTask` agora, após aplicar, **salva a reversão** no
  revertStore e devolve só o `detail` ao renderer.
- Três novos handlers IPC: `revert:count`, `revert:list`, `revert:one`.

### `src/main/preload.js`
Expor três funções no `window.api`:
```js
  revertCount: (serial) => ipcRenderer.invoke('revert:count', serial),
  revertList: (serial) => ipcRenderer.invoke('revert:list', serial),
  revertOne: (serial, taskId) => ipcRenderer.invoke('revert:one', serial, taskId),
```

### `src/renderer/App.jsx`
- Importar `ResetDialog`.
- Novos estados: `resetOpen` (diálogo) e `revertCount` (habilita o botão).
- `refreshRevertCount()` — lê `window.api.revertCount` para o aparelho atual;
  chamada quando o aparelho muda e após aplicar tasks.
- `handleReverted()` — após reverter, atualiza a contagem e **destrava** as
  tasks revertidas (limpa do `completed` o que não tem mais reversão pendente).
- Passar ao `<TaskPanel>`: `canReset={revertCount > 0}` e
  `onOpenReset={() => setResetOpen(true)}`.
- Renderizar `<ResetDialog open={resetOpen} serial={device?.serial}
  onClose={...} onReverted={handleReverted} />`.

### `src/renderer/components/TaskPanel.jsx`
- Importar `RestartAltIcon`.
- Receber props `canReset` e `onOpenReset`.
- Adicionar o botão "Reverter alterações" logo após o "Desativar DeX", com
  `disabled={!canReset}` e `color="error"`.

---

## Validação (após aplicar)

```bash
# Parse dos módulos do processo main:
for f in src/adb/adb.js src/main/runner.js src/main/revertStore.js \
         src/main/main.js src/main/preload.js; do node --check "$f" && echo "ok: $f"; done

# Os tipos de reversão GERADOS batem com os TRATADOS:
echo "gerados:"; grep -oE "kind: '[a-z-]+'" src/main/runner.js | sort -u
echo "tratados:"; grep -oE "case '[a-z-]+':" src/main/runner.js | sort -u
# Todo 'kind' gerado deve ter um 'case' correspondente no revertEntry.

# Ligações da interface:
grep -c "ResetDialog" src/renderer/App.jsx               # 2
grep -c "canReset" src/renderer/components/TaskPanel.jsx  # >=2
grep -c "revert:" src/main/main.js                        # 3

# Prova final:
npm run build:renderer
```

Depois `npm run dev`:
- O botão "Reverter alterações" aparece no painel esquerdo, **desabilitado**.
- Após aplicar qualquer modificação, o botão **habilita**.
- Clicando, o diálogo lista o que será desfeito + aviso do DeX.
- "Reverter tudo" desfaz item a item; itens que precisam de passo manual
  aparecem em âmbar; o resumo final é honesto.
- Após reverter, as tasks voltam a ficar clicáveis (destravadas).

---

## Notas importantes

- O registro de reversão fica **no computador** (pasta userData do Electron),
  um arquivo por aparelho. A reversão funciona a partir do mesmo computador que
  aplicou as mudanças.
- O **launcher** é o item mais propenso a precisar de passo manual (quirk do
  One UI). O diálogo trata isso como aviso, não como falha.
- O **DeX** nunca entra na reversão automática (é manual); aparece só como
  aviso. O **reset de fábrica** do aparelho é sempre mencionado como garantia
  absoluta, já que nenhuma modificação é destrutiva.
