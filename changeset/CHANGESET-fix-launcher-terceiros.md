# Changeset — Respeitar launcher de terceiros ao voltar ao modo celular

Corrige o bug encontrado no teste do S23 Ultra (16/07/2026): ao voltar ao modo
celular, o app trocava o launcher do usuário (`com.rama.mako`) pelo One UI Home
da Samsung.

**Causa:** o caso `home` do `runTask` computa `phoneHome` (o launcher a
restaurar no modo celular) **preferindo sempre** o `PHONE_HOME_PKG`
(`com.sec.android.app.launcher`, One UI Home) sempre que ele existe no
aparelho — ignorando o launcher que estava REALMENTE ativo. Em aparelhos com
launcher de terceiro (mako, Nova, Niagara…), isso rouba o launcher do usuário.

**Correção:** preferir o launcher que estava ATIVO antes da troca
(`prevHome`), respeitando launchers de terceiros. O One UI Home fica só como
**âncora de segurança** para quando o `prevHome` não é legível OU é o próprio
launcher de TV (sobra de uma volta que falhou) — que era o cenário que o
mapeamento fixo original protegia. Assim ganhamos o respeito ao launcher de
terceiros SEM reintroduzir o risco de a alternância "grudar" no launcher de TV.

**1 arquivo editado** (`src/main/runner.js`). Nenhum novo.

> Nota de decisão: isto REVISA a regra anterior "modo celular = One UI Home
> fixo". A âncora fixa resolvia o travamento (volta que falhou deixa o launcher
> de TV como "anterior"); a nova lógica mantém essa proteção via a checagem
> `prevHome !== task.pkg`, mas deixa de sobrescrever launchers de terceiros.

---

## `src/main/runner.js` — caso `home` do `runTask`

ENCONTRAR:
```js
      // O modo celular volta SEMPRE ao launcher da Samsung quando ele existe
      // no aparelho — nunca ao launcher "anterior" lido na hora, que pode ser
      // o próprio launcher de TV (sobra de uma volta ao celular que falhou).
      const phoneHome = (await adb.hasPackage(serial, PHONE_HOME_PKG))
        ? PHONE_HOME_PKG
        : (prevHome && prevHome !== task.pkg ? prevHome : null);
```

SUBSTITUIR POR:
```js
      // O modo celular volta ao launcher que ESTAVA ativo antes da troca —
      // respeitando launchers de terceiros (mako, Nova, Niagara, etc.). O One
      // UI Home entra só como ÂNCORA de segurança: quando o "anterior" não é
      // legível, ou é o próprio launcher de TV (sobra de uma volta que falhou),
      // caso em que restaurá-lo grudaria a alternância no launcher de TV.
      const phoneHome = (prevHome && prevHome !== task.pkg)
        ? prevHome
        : ((await adb.hasPackage(serial, PHONE_HOME_PKG)) ? PHONE_HOME_PKG : null);
```

---

## Validação

```bash
cd "dexarmor - app - atualizado - cópia"
node --check src/main/runner.js && echo "OK"
npm run build:renderer
```

Teste no aparelho (ideal: um com launcher de terceiro instalado como padrão):
1. Anote o launcher atual:
   `adb shell cmd shortcut get-default-launcher`
2. Aplique o modo TV (ou a config recomendada, que inclui `tw-home`).
3. Volte ao modo celular.
4. Confira que o launcher voltou a ser o **de terceiro**, não o One UI Home.

Repita num aparelho SEM launcher de terceiro (só One UI Home): o comportamento
deve continuar igual ao de antes (volta ao One UI Home).

---

## Nota honesta

O `getCurrentHome` pode devolver `null` logo após uma troca (o sistema mostra o
seletor em vez de um launcher). Nesses instantes o `prevHome` lido ANTES da
troca é o que vale — e é justamente o que esta correção usa. O caso em que
`prevHome` vem null (aparelho não expõe o launcher atual) cai na âncora One UI
Home, como antes.
