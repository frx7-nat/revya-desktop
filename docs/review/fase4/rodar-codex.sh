#!/usr/bin/env bash
# Fase 4 — submete o diff acumulado ao Codex com papel adversarial.
#
# Uso:
#   ./rodar-codex.sh            revisão não-interativa, salva em arquivo (padrão)
#   ./rodar-codex.sh -i         sessão interativa, para poder perguntar de volta
#
# Sempre em modo SOMENTE LEITURA. É de propósito: o revisor adversarial deve
# APONTAR defeitos, não consertá-los. Um achado consertado sozinho é um achado
# que ninguém leu, e a comparação com o diagnóstico da Fase 2 depende do texto
# do achado.
#
# NOTA (codex-cli 0.146.0): o subcomando `codex review` NÃO serve aqui —
# `--base <BRANCH>` é mutuamente exclusivo com o argumento [PROMPT], ou seja,
# ou se escolhe o intervalo, ou se dão instruções próprias. Como o papel
# adversarial é o ponto todo, usamos `codex exec` e passamos o intervalo dentro
# do próprio prompt.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$AQUI/../../.." && pwd)"
PROMPT="$AQUI/PROMPT-adversarial.md"
BASE="pre-review-v1"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex não encontrado. Instale com:  brew install codex"
  echo "e autentique com:                   codex login"
  exit 1
fi

cd "$REPO"

if ! git rev-parse --verify --quiet "$BASE" >/dev/null; then
  echo "A referência '$BASE' não existe neste repositório."
  echo "Ela marca o estado de antes da revisão — sem ela não há o que comparar."
  exit 1
fi

if [[ "${1:-}" == "-i" ]]; then
  # Interativo: dá para perguntar de volta, mas a resposta não fica em arquivo.
  echo "Sessão interativa, somente leitura. Repositório: $REPO"
  exec codex --sandbox read-only "$(cat "$PROMPT")"
fi

SAIDA="$AQUI/resultado-codex-$(date '+%Y%m%d-%H%M').md"
BRUTO="$AQUI/.log-codex-$(date '+%Y%m%d-%H%M').txt"

echo "Revisando $BASE..HEAD com papel adversarial."
echo "Repositório: $REPO"
echo "Saída:       $SAIDA"
echo
echo "Pode demorar alguns minutos — ele vai abrir arquivos, não só ler o diff."
echo

codex exec \
  --sandbox read-only \
  --cd "$REPO" \
  --output-last-message "$SAIDA" \
  "$(cat "$PROMPT")" 2>&1 | tee "$BRUTO"

echo
if [[ -s "$SAIDA" ]]; then
  echo "Relatório salvo em: $SAIDA"
  echo "  $(wc -l < "$SAIDA" | tr -d ' ') linhas"
else
  echo "O relatório saiu vazio — veja a transcrição completa em: $BRUTO"
fi
