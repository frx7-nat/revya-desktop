// src/renderer/i18n/index.jsx
// Lado do renderer: contexto do React sobre o núcleo compartilhado
// (`src/i18n/index.cjs`). Duas formas de traduzir, de propósito:
//
//   useT()  para COMPONENTES. Devolve um `t` ligado ao contexto, então trocar
//           o idioma redesenha a árvore inteira — é o que faz a interface
//           mudar na hora, sem reabrir o programa.
//
//   t()     para código FORA de componente (`utils/errors.js`, catálogos de
//           dados). Hook não pode ser chamado ali. Esta versão lê um idioma de
//           escopo de módulo que o provider mantém em dia.
//
// O `t` de módulo é uma concessão consciente: ele não provoca redesenho por si
// só. Na prática não precisa — quem o usa produz string sob demanda (a
// mensagem de erro é montada no momento de exibir), e o redesenho vem do
// componente que a exibe.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import core from '../../i18n/index.cjs';

const { LANGUAGES, SOURCE_LANGUAGE, coerceLanguage, translate, translateList, has } = core;

export { LANGUAGES, has };

// Idioma corrente em escopo de módulo. Começa no de origem e é corrigido assim
// que o provider lê a preferência do main.
let currentLanguage = SOURCE_LANGUAGE;

/** Tradução para uso fora de componente. Ver a nota no topo do arquivo. */
export function t(key, vars) {
  return translate(currentLanguage, key, vars);
}

/** Versão de LISTA — ver `translateList` no núcleo. */
export function tList(key, vars) {
  return translateList(currentLanguage, key, vars);
}

const LanguageContext = createContext({
  language: SOURCE_LANGUAGE,
  setLanguage: () => {},
  ready: false,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(SOURCE_LANGUAGE);
  // `ready` distingue "ainda não perguntei ao main" de "o idioma é o de
  // origem". Sem isso, a primeira pintura sairia em português para um usuário
  // em inglês e piscaria logo depois.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await window.api.getLanguage();
        if (alive) applyLanguage(coerceLanguage(saved));
      } catch {
        // Sem preferência legível, segue no idioma de origem — a interface
        // abre de qualquer jeito.
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  function applyLanguage(lang) {
    currentLanguage = lang;   // mantém o `t` de módulo em dia
    setLanguageState(lang);
  }

  const value = useMemo(() => ({
    language,
    ready,
    setLanguage: (lang) => {
      const safe = coerceLanguage(lang);
      applyLanguage(safe);
      // Persiste sem bloquear a troca: a interface já mudou; se a gravação
      // falhar, o usuário só perde a preferência no próximo boot.
      Promise.resolve(window.api.setLanguage(safe)).catch(() => {});
    },
  }), [language, ready]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/** @returns {{t: Function, tList: Function, language: string, setLanguage: Function, ready: boolean}} */
export function useT() {
  const ctx = useContext(LanguageContext);
  const bound = useMemo(
    () => (key, vars) => translate(ctx.language, key, vars),
    [ctx.language],
  );
  const boundList = useMemo(
    () => (key, vars) => translateList(ctx.language, key, vars),
    [ctx.language],
  );
  return { t: bound, tList: boundList, ...ctx };
}
