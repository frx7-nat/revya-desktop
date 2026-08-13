# Contribuindo

O Revya é mantido por uma pessoa só, então a forma mais útil de ajudar
costuma ser reportar o que não funcionou, não necessariamente mandar código.

## Reportar um problema

Abra uma [issue](https://github.com/frx7-nat/revya-desktop/issues) descrevendo:

- O que você esperava que acontecesse, e o que aconteceu de fato.
- Sistema operacional e versão do Revya (`sobre`, na tela do programa).
- Modelo do Galaxy e versão do Android, se o problema envolver o aparelho.
- Se der, o que apareceu no "Diário de trocas" perto do momento do erro.

## Traduções

O catálogo de textos vive em `src/i18n/pt.json` e `src/i18n/en.json`. As duas
chaves têm que existir nos dois arquivos — o `check-i18n.js` quebra o build se
uma faltar. Se for corrigir um texto, corrija nos dois idiomas.

## Rodando localmente

Setup completo no [`README.md`](./README.md#setup). Resumo:

```bash
npm install
npm run dev     # com hot reload do renderer
npm run check:i18n
```

## O que não entra

- **Apps de terceiros embutidos.** O catálogo de instalação inclui só o
  launcher próprio (Revya TV) — ver `apks/README.txt` para o porquê. Um PR
  reintroduzindo um catálogo de apps de terceiros não vai ser aceito.
- **Telemetria ou coleta de dados.** É uma decisão de produto documentada no
  `changeset/` do projeto irmão (`revya-launcher`), e vale dos dois lados.

## Antes de abrir um PR

- Rode `npm run check:i18n` — se o build quebrar por tradução faltando, o CI
  também vai quebrar.
- Descreva o que mudou e por quê, não só o quê. Ajuda a revisar mais rápido.
