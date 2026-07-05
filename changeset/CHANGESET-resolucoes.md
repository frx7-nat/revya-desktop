# Changeset — Três opções de resolução (Full HD, 2K, 4K)

Substitui a opção única de resolução por **três opções mutuamente exclusivas**,
para o usuário escolher a que casa com a TV/monitor dele. Isso corrige o
problema de forçar uma resolução maior que a suportada (ex.: 4K num monitor 2K),
que encolhe a imagem para o centro da tela.

**2 arquivos editados.** Nenhum novo.

---

## 1. `src/renderer/data/tasks.js` — trocar a task única por três

ENCONTRAR (a opção única de resolução, que pode variar levemente conforme sua
versão atual — pode estar com width 3840 ou 2560):
```js
      { id: 'tw-resolution', label: 'Ajustar resolução para TV (16:9)', kind: 'wmsize',
```
...até o fim desse objeto (a linha do `info:` e o `},` que fecha).

SUBSTITUIR o objeto inteiro POR:
```js
      // Resolução da TV: três opções mutuamente exclusivas (o usuário escolhe
      // UMA, conforme a resolução da TV dele). O valor DEVE bater com a
      // resolução nativa da TV — forçar um valor maior que o suportado encolhe
      // a imagem para o centro da tela. Todas são 16:9. `exclusiveGroup` faz
      // com que marcar uma desmarque as outras do mesmo grupo.
      { id: 'tw-res-fhd', label: 'Resolução Full HD (1080p)', kind: 'wmsize',
        width: 1920, height: 1080, exclusiveGroup: 'resolution',
        info: 'Para TVs Full HD (1920x1080). A resolução mais comum.' },

      { id: 'tw-res-2k', label: 'Resolução 2K (1440p)', kind: 'wmsize',
        width: 2560, height: 1440, exclusiveGroup: 'resolution',
        info: 'Para monitores e TVs 2K/QHD (2560x1440).' },

      { id: 'tw-res-4k', label: 'Resolução 4K (2160p)', kind: 'wmsize',
        width: 3840, height: 2160, exclusiveGroup: 'resolution',
        info: 'Para TVs 4K/UHD (3840x2160). Só use se a TV for realmente 4K.' },
```

---

## 2. `src/renderer/App.jsx` — lógica de exclusividade

Faz com que marcar uma resolução desmarque as outras (senão o app tentaria
aplicar as três em sequência).

ENCONTRAR:
```jsx
  const toggle = useCallback((id) => {
    // Não permite remarcar algo já concluído.
    if (completed[id]) return;
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }, [completed]);
```
SUBSTITUIR POR:
```jsx
  const toggle = useCallback((id) => {
    // Não permite remarcar algo já concluído.
    if (completed[id]) return;
    const task = ALL_TASKS.find((t) => t.id === id);
    const group = task?.exclusiveGroup;
    setSelected((s) => {
      const turningOn = !s[id];
      const next = { ...s, [id]: turningOn };
      // Se esta task pertence a um grupo exclusivo e está sendo LIGADA,
      // desliga as outras do mesmo grupo (ex.: só uma resolução por vez).
      if (group && turningOn) {
        for (const t of ALL_TASKS) {
          if (t.id !== id && t.exclusiveGroup === group) next[t.id] = false;
        }
      }
      return next;
    });
  }, [completed]);
```

> `ALL_TASKS` já existe no topo do App.jsx (a lista achatada de todas as
> tasks). Se por algum motivo não existir, adicione perto dos imports:
> ```jsx
> const ALL_TASKS = TASK_GROUPS.flatMap((g) =>
>   g.categories ? g.categories.flatMap((c) => c.apps) : (g.tasks || [])
> );
> ```

---

## Validação

```bash
# As três opções existem e são 16:9:
node --input-type=module -e "import('./src/renderer/data/tasks.js').then(m=>{
  const r=m.TASK_GROUPS.find(g=>g.id==='tweaks').tasks.filter(t=>t.exclusiveGroup==='resolution');
  console.log('resoluções:', r.length);
  r.forEach(t=>console.log(t.id, t.width+'x'+t.height, (t.width/t.height).toFixed(3)));
})"
# Esperado: 3 opções, todas com proporção 1.778.

npm run build:renderer
```

Depois `npm run dev`:
- Aparecem três opções: Full HD, 2K, 4K.
- Marcar uma desmarca as outras automaticamente.
- Ao aplicar, só a escolhida é usada.

---

## Nota importante

O usuário deve escolher a resolução **igual à da TV/monitor dele**. Forçar um
valor MAIOR que o suportado (ex.: 4K numa tela 2K) faz a imagem encolher para o
centro, cercada de preto — foi o que aconteceu no teste. Os textos de cada
opção deixam isso claro ("Só use se a TV for realmente 4K").

Se o usuário errar e a tela ficar pequena, o botão "Reverter alterações"
desfaz, ou o comando direto `adb shell wm size reset` reseta na hora.
