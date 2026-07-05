# Changeset — Correção do comando de forçar rotação

Corrige o erro `wm set-fix-to-user-rotation` que falhava no S21 FE.

**Causa:** o comando mudou de nome entre versões do Android. O S21 FE usa a
sintaxe nova `wm fixed-to-user-rotation` (sem `set-`), e o app usava a antiga.

**Correção:** a função agora tenta a sintaxe nova primeiro e cai para a antiga
se necessário. E o passo de "forçar" virou tolerante a falha: se nenhuma
sintaxe funcionar, a rotação básica (travar + paisagem) ainda é aplicada, e o
app avisa em vez de falhar tudo.

**2 arquivos editados.** Nenhum novo.

---

## 1. `src/adb/adb.js` — função tolerante a versão

ENCONTRAR:
```js
async function setFixToUserRotation(serial, enabled) {
  return adb(['-s', serial, 'shell', 'wm', 'set-fix-to-user-rotation', enabled ? 'enabled' : 'disabled']);
}
```
SUBSTITUIR POR:
```js
// Força a rotação do display, fazendo TODOS os apps respeitarem a orientação
// do usuário em vez de cada um impor a sua. enabled=true força; false libera.
//
// O nome do comando MUDOU entre versões do Android:
//   - Android 12+ (inclui o One UI do S21 FE): wm fixed-to-user-rotation
//   - Versões mais antigas:                    wm set-fix-to-user-rotation
// Tentamos a forma nova primeiro; se o aparelho não a reconhecer, caímos para
// a antiga. Assim funciona nos dois casos.
async function setFixToUserRotation(serial, enabled) {
  const arg = enabled ? 'enabled' : 'disabled';
  try {
    return await adb(['-s', serial, 'shell', 'wm', 'fixed-to-user-rotation', arg]);
  } catch (e1) {
    try {
      return await adb(['-s', serial, 'shell', 'wm', 'set-fix-to-user-rotation', arg]);
    } catch (e2) {
      throw new Error('forçar-rotação-indisponível');
    }
  }
}
```

---

## 2. `src/main/runner.js` — caso `rotate` tolerante a falha

### 2a. No `runTask`, SUBSTITUIR o caso `rotate` por:
```js
    case 'rotate': {
      // Força paisagem de verdade: trava rotação + define paisagem + obriga
      // todos os apps a respeitarem (fixed-to-user-rotation).
      const prevAccel = (await adb.getSetting(serial, 'system', 'accelerometer_rotation')).trim();
      const prevRot = (await adb.getSetting(serial, 'system', 'user_rotation')).trim();
      await adb.putSetting(serial, 'system', 'accelerometer_rotation', 0);
      await adb.putSetting(serial, 'system', 'user_rotation', 1); // 1 = 90° (paisagem)
      // O comando 'wm' que força apps teimosos é o mais frágil (varia por
      // versão e pode não existir). Se falhar, a rotação básica acima JÁ foi
      // aplicada — então não derrubamos a task, só sinalizamos no detalhe.
      let forced = true;
      try {
        await adb.setFixToUserRotation(serial, true);
      } catch {
        forced = false;
      }
      return {
        detail: forced
          ? 'Paisagem forçada'
          : 'Paisagem aplicada (alguns apps podem ainda abrir em pé neste aparelho)',
        revert: {
          kind: 'rotate',
          accel: normalizePrev(prevAccel),
          rot: normalizePrev(prevRot),
          forced,
        },
      };
    }
```

### 2b. Na função `revertEntry`, SUBSTITUIR o caso `rotate` por:
```js
    case 'rotate': {
      // Libera a rotação forçada (só se foi aplicada) e restaura os valores.
      if (r.forced !== false) {
        try { await adb.setFixToUserRotation(serial, false); } catch { /* ignora */ }
      }
      if (r.accel === null) await adb.deleteSetting(serial, 'system', 'accelerometer_rotation');
      else await adb.putSetting(serial, 'system', 'accelerometer_rotation', r.accel);
      if (r.rot === null) await adb.deleteSetting(serial, 'system', 'user_rotation');
      else await adb.putSetting(serial, 'system', 'user_rotation', r.rot);
      return 'Rotação restaurada';
    }
```

---

## Validação

```bash
node --check src/adb/adb.js && node --check src/main/runner.js && echo "OK"
grep -c "fixed-to-user-rotation" src/adb/adb.js   # deve achar as 2 sintaxes
npm run build:renderer
```

Depois `npm run dev` e teste "Forçar tela na horizontal" no S21 FE. Agora:
- Não dá mais o erro do comando.
- A tela trava em paisagem.
- Se o "forçar apps teimosos" não pegar no aparelho, a task conclui mesmo assim
  com um aviso, em vez de falhar.

---

## Nota honesta

Mesmo com a sintaxe certa, o `fixed-to-user-rotation` pode ter efeito parcial
em alguns apps muito teimosos, e pode não persistir após reiniciar o aparelho.
A parte que SEMPRE funciona é travar + definir paisagem (`user_rotation=1`).
O comando `wm` é um reforço para os apps que ignoram isso — agora aplicado da
forma certa para o Android do S21 FE, e sem derrubar a operação se falhar.
