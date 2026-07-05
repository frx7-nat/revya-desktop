# Changeset — Gestos, paisagem forçada, resolução 16:9 e correção do launcher

Para o Claude Code aplicar no projeto DexArmor. Quatro mudanças, todas em
arquivos existentes. **Nenhum arquivo novo.**

1. Nova opção: **Navegação por gestos** (troca botões por deslizamento).
2. **Forçar tela na horizontal** agora força de verdade (antes só travava).
3. Nova opção: **Ajustar resolução para TV (16:9)** — elimina barras pretas.
4. **Correção do launcher padrão** — agora verifica se realmente virou padrão.

Todas as novas opções têm reversão registrada (funcionam com o botão "Reverter
alterações" já existente).

---

## 1. `src/adb/adb.js` — novas funções ADB

Adicionar (logo após `deleteSetting`) e exportar:

```js
// Força a rotação do display, fazendo TODOS os apps respeitarem a orientação
// do usuário em vez de cada um impor a sua. enabled=true força; false libera.
async function setFixToUserRotation(serial, enabled) {
  return adb(['-s', serial, 'shell', 'wm', 'set-fix-to-user-rotation', enabled ? 'enabled' : 'disabled']);
}

// Define o tamanho/resolução do display. Sem args reseta para o padrão.
async function setDisplaySize(serial, width, height) {
  if (width == null || height == null) {
    return adb(['-s', serial, 'shell', 'wm', 'size', 'reset']);
  }
  return adb(['-s', serial, 'shell', 'wm', 'size', `${width}x${height}`]);
}

// Lê o tamanho atual do display (para registrar antes de mudar, e reverter).
async function getDisplaySize(serial) {
  const out = await adb(['-s', serial, 'shell', 'wm', 'size']);
  const phys = /Physical size:\s*(\d+x\d+)/.exec(out);
  const over = /Override size:\s*(\d+x\d+)/.exec(out);
  return { physical: phys ? phys[1] : null, override: over ? over[1] : null };
}
```

No `module.exports`, acrescentar: `setFixToUserRotation, setDisplaySize, getDisplaySize`.

---

## 2. `src/renderer/data/tasks.js` — substituir/adicionar opções

ENCONTRAR o bloco da rotação e do bloqueio/launcher:
```js
      { id: 'tw-rotate', label: 'Travar orientação na horizontal', kind: 'setting',
        ns: 'system', key: 'accelerometer_rotation', value: 0,
        info: 'A TV é sempre paisagem; evita girar a tela sem querer.' },

      { id: 'tw-lock', label: 'Remover bloqueio de tela', kind: 'setting',
```
SUBSTITUIR POR (troca a rotação + adiciona gestos antes do bloqueio):
```js
      { id: 'tw-rotate', label: 'Forçar tela na horizontal', kind: 'rotate',
        info: 'Mantém tudo em paisagem na TV, mesmo apps que abririam em pé.' },

      { id: 'tw-gestures', label: 'Navegação por gestos', kind: 'setting',
        ns: 'secure', key: 'navigation_mode', value: 2,
        info: 'Troca os botões por gestos, liberando espaço na tela.' },

      { id: 'tw-lock', label: 'Remover bloqueio de tela', kind: 'setting',
```

E, logo APÓS o bloco do `tw-home` (launcher), ADICIONAR a opção de resolução:
```js
      { id: 'tw-resolution', label: 'Ajustar resolução para TV (16:9)', kind: 'wmsize',
        width: 3840, height: 2160,
        info: 'Preenche a TV 16:9, removendo as barras pretas. Pode deixar barras no próprio celular.' },
```

> NOTA sobre o valor: 3840x2160 é o 4K UHD real (proporção 16:9 = 1.778).
> O valor 3480x2160 mencionado por engano dá 1.611, que NÃO é 16:9 e deixaria
> a tela distorcida. Por isso o código usa 3840x2160. Se a TV for 1080p,
> 1920x1080 também é 16:9 e mais leve.

---

## 3. `src/main/runner.js` — novos casos + correção do launcher

### 3a. No `runTask`, SUBSTITUIR o caso `home` inteiro por (adiciona verificação):
```js
    case 'home': {
      if (!task.pkg) {
        throw new Error('Launcher padrão não configurado (defina o pacote)');
      }
      if (!(await adb.hasPackage(serial, task.pkg))) {
        throw new Error('Launcher não está instalado — marque para instalar primeiro');
      }
      const prevHome = await adb.getCurrentHome(serial);
      await adb.setHomeActivity(serial, task.pkg);
      // VERIFICA se realmente virou padrão (em alguns Galaxy não pega de 1ª).
      const nowHome = await adb.getCurrentHome(serial);
      if (nowHome && !nowHome.includes(task.pkg)) {
        throw new Error('O sistema manteve o launcher antigo. No celular, toque no botão Início e escolha o launcher de TV como padrão.');
      }
      return {
        detail: 'Definido como tela inicial',
        revert: prevHome ? { kind: 'home', prev: prevHome } : null,
      };
    }
```

### 3b. ADICIONAR dois casos novos antes do `default:` do switch:
```js
    case 'rotate': {
      const prevAccel = (await adb.getSetting(serial, 'system', 'accelerometer_rotation')).trim();
      const prevRot = (await adb.getSetting(serial, 'system', 'user_rotation')).trim();
      await adb.putSetting(serial, 'system', 'accelerometer_rotation', 0);
      await adb.putSetting(serial, 'system', 'user_rotation', 1); // 1 = 90° (paisagem)
      await adb.setFixToUserRotation(serial, true);
      return {
        detail: 'Paisagem forçada',
        revert: { kind: 'rotate', accel: normalizePrev(prevAccel), rot: normalizePrev(prevRot) },
      };
    }
    case 'wmsize': {
      const before = await adb.getDisplaySize(serial);
      await adb.setDisplaySize(serial, task.width, task.height);
      return {
        detail: `Resolução ${task.width}x${task.height}`,
        revert: { kind: 'wmsize', hadOverride: !!before.override, override: before.override },
      };
    }
```

### 3c. Na função `revertEntry`, ADICIONAR antes do `default:`:
```js
    case 'rotate': {
      await adb.setFixToUserRotation(serial, false);
      if (r.accel === null) await adb.deleteSetting(serial, 'system', 'accelerometer_rotation');
      else await adb.putSetting(serial, 'system', 'accelerometer_rotation', r.accel);
      if (r.rot === null) await adb.deleteSetting(serial, 'system', 'user_rotation');
      else await adb.putSetting(serial, 'system', 'user_rotation', r.rot);
      return 'Rotação restaurada';
    }
    case 'wmsize': {
      if (r.hadOverride && r.override) {
        const [w, h] = r.override.split('x');
        await adb.setDisplaySize(serial, Number(w), Number(h));
      } else {
        await adb.setDisplaySize(serial, null, null);
      }
      return 'Resolução restaurada';
    }
```

---

## 4. `src/renderer/components/TaskPanel.jsx` — cores dos novos tipos

ENCONTRAR:
```js
const KIND_COLOR = { remove: 'error', install: 'primary', setting: 'success', home: 'success' };
```
SUBSTITUIR POR:
```js
const KIND_COLOR = { remove: 'error', install: 'primary', setting: 'success', home: 'success', settings: 'success', rotate: 'success', wmsize: 'success' };
```

---

## Validação

```bash
node --check src/adb/adb.js && node --check src/main/runner.js && echo "sintaxe OK"

# Todo 'kind' gerado deve ter 'case' na reversão:
echo "gerados:"; grep -oE "kind: '[a-z-]+'" src/main/runner.js | sort -u
echo "tratados:"; grep -oE "case '[a-z-]+':" src/main/runner.js | sort -u

npm run build:renderer
```

Depois `npm run dev` e teste no aparelho:
- **Navegação por gestos** — a barra de botões some, vira deslizamento.
- **Forçar tela na horizontal** — apps que abriam em pé agora ficam em paisagem.
- **Resolução 16:9** — a TV preenche; o celular pode ganhar barras (normal).
- **Launcher** — se não virar padrão, o app agora AVISA com o passo manual,
  em vez de fingir sucesso.

---

## Observações importantes (testar no aparelho real)

- **`navigation_mode`** funciona na maioria dos One UI recentes; em alguns, o
  Samsung usa chave própria. Se não pegar, o app avisa (verificação de leitura).
- **`wm set-fix-to-user-rotation`** e **`wm size`** às vezes NÃO persistem após
  reiniciar o aparelho — podem precisar ser reaplicados. É limitação do Android.
- **Resolução:** se a TV tiver opção "Screen Fit"/"Just Scan", ela é preferível
  ao `wm size` (não mexe no celular). O `wm size` é o plano B quando a TV não
  oferece o ajuste — que foi o seu caso.
- **Launcher:** mesmo com a verificação, alguns Galaxy exigem o passo manual de
  escolher o launcher pelo botão Início. A correção garante que o app DIGA isso
  quando acontecer, em vez de marcar como concluído indevidamente.
