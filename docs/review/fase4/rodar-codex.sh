#!/usr/bin/env bash
# Fase 4 — abre o Codex dentro do repositório, em modo SOMENTE LEITURA.
#
# Somente leitura é de propósito: o revisor adversarial deve APONTAR defeitos,
# não consertá-los. Um achado consertado sozinho é um achado que ninguém leu, e
# a comparação com o diagnóstico da Fase 2 depende do texto do achado.
#
# Uso:  ./rodar-codex.sh
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex não encontrado. Instale com:  brew install codex"
  echo "e autentique com:                   codex login"
  exit 1
fi

cd "$REPO"

echo "Repositório: $REPO"
echo "Abrindo o Codex em modo somente leitura."
echo
echo "Cole esta instrução quando ele abrir:"
echo
echo "  Leia docs/review/fase4/PROMPT-adversarial.md e execute o que ele pede."
echo "  Você tem o repositório inteiro à disposição — abra os arquivos reais,"
echo "  não só o diff."
echo

exec codex --sandbox read-only
