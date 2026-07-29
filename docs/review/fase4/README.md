# Fase 4 — pacote para revisão adversarial

Pronto para entregar a **outro modelo**. Nada aqui precisa ser preparado além do
que já está.

## Arquivos

| arquivo | o que é |
| --- | --- |
| `PROMPT-adversarial.md` | a instrução — cole no outro modelo |
| `diff-codigo.patch` | 573 linhas · o diff `pre-review-v1..main` só de código |
| `diff-resumo.txt` | 13 arquivos, 237 inserções, 95 remoções |
| `rodar-codex.sh` | atalho para abrir o Codex no repositório, somente leitura |

Os documentos da revisão ficaram **fora** do diff de propósito: o outro modelo
deve julgar o código, não a papelada sobre ele.

## Como rodar — Codex CLI (recomendado)

```bash
brew install codex     # ou: npm i -g @openai/codex
codex login            # abre o navegador
```

Depois:

```bash
"/Users/natalierjunior/dexarmor - app - atualizado - cópia 2/docs/review/fase4/rodar-codex.sh"
```

E cole, quando ele abrir:

> Leia `docs/review/fase4/PROMPT-adversarial.md` e execute o que ele pede.
> Você tem o repositório inteiro à disposição — abra os arquivos reais, não só
> o diff.

**Por que dentro do repositório, e não colando o patch:** um diff mostra as
linhas que mudaram, não o que as cerca. Metade das perguntas do prompt —
"onde essa string é definida?", "algum chamador passa opções próprias?" — só
tem resposta abrindo os arquivos vizinhos, que não estão no patch.

**Por que somente leitura:** o revisor deve APONTAR defeitos, não consertá-los.
Um achado consertado sozinho é um achado que ninguém leu, e a comparação com o
diagnóstico da Fase 2 depende do texto do achado.

## Sem instalar nada

Abra `PROMPT-adversarial.md` e `diff-codigo.patch`, cole os dois no chat do
modelo escolhido (ChatGPT, Gemini, o que for). Funciona, mas o revisor fica
limitado ao que está no patch — vale para uma segunda opinião rápida, não para
a passada completa.

## Por que não pular esta fase

O diagnóstico da Fase 2 foi escrito **pelo mesmo modelo que escreveu o código**,
e concluiu que a base é sólida. Pode ser verdade — os marcadores de código
gerado por IA foram procurados um a um e não estavam lá. Mas é exatamente o tipo
de conclusão que um autor tem interesse em alcançar.

O prompt declara esse ponto cego logo no início e instrui o revisor a
desconfiar das justificativas escritas nos comentários — que são detalhadas e
citam medições, o que é bom sinal, mas também é o que alguém faria para tornar
uma decisão errada convincente.

## Quando o resultado chegar

O plano pede comparar os achados com o diagnóstico da Fase 2. **As divergências
entre os dois modelos são o que merece sua atenção manual** — onde ambos
concordam, provavelmente está certo; onde discordam, alguém errou e vale olhar
com os próprios olhos.

Achado novo de severidade `CRÍTICO` ou `ALTO` reabre a Fase 3 com um branch
temático próprio.

## O que já foi verificado, para o revisor não repetir trabalho

Está em `docs/baseline.md`, mas em resumo — verificado **em aparelho real**:

- ciclo celular ⇄ TV em dois aparelhos (One UI 8.0 e 8.5), com retrato idêntico
  ao original e personalizações preservadas
- reversibilidade sob falha deliberada: cabo arrancado e rede caída no meio da
  fila
- seis cenários de erro ADB, incluindo autorização revogada e ADB ausente
- atualização release → release do launcher, sem desinstalar

O que **não** foi verificado está na seção 6 do baseline — e é ali que um
revisor externo tende a encontrar mais.
