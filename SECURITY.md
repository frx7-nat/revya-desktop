# Política de segurança

## Reportando uma vulnerabilidade

Se você encontrou uma vulnerabilidade de segurança no Revya, **não abra uma
issue pública**. Use a aba
[**Security → Report a vulnerability**](https://github.com/frx7-nat/revya-desktop/security/advisories/new)
deste repositório — o GitHub cria um espaço privado só entre você e o
mantenedor até o problema ser corrigido.

Inclua, se possível:

- Passos para reproduzir.
- Versão do Revya e sistema operacional.
- Impacto: o que um atacante conseguiria fazer.

## O que está no escopo

O Revya se conecta ao celular via ADB (cabo ou rede local) e não envia dados
para nenhum servidor — não há backend, conta de usuário nem coleta de dados.
O escopo relevante de segurança é, principalmente:

- Execução de comandos ADB a partir de entrada não confiável.
- A cadeia de assinatura dos instaladores (macOS/Windows/Linux).
- Manuseio de arquivos arrastados para a janela (instalação de APK,
  transferência de arquivos).

## Fora do escopo

- Avisos do Gatekeeper (macOS) ou SmartScreen (Windows) por falta de
  assinatura paga — é uma decisão de produto documentada, não uma
  vulnerabilidade. Ver `changeset/PESQUISA-smartscreen.md`.
- Vulnerabilidades em binários de terceiros embutidos sem modificação
  (scrcpy, ADB/platform-tools) — reporte direto ao projeto de origem. Ver
  `THIRD-PARTY-NOTICES.md`.

## Tempo de resposta

Projeto mantido por uma pessoa só, sem SLA formal. Vulnerabilidades de
severidade alta têm prioridade sobre qualquer outro trabalho em andamento.
