# Revisão de código — 28 a 29 de julho de 2026

Execução do `plano-revisao-revya.md` (na raiz), fase a fase. Esta pasta é o
registro do que foi medido, não um relatório de conclusões.

## Onde está cada fase

| fase | o que foi | onde ler |
| --- | --- | --- |
| **0** — congelamento e linha de base | tag `pre-review-v1`, ciclo verificado em dois aparelhos, seis cenários de erro de ADB | [`../baseline.md`](../baseline.md) · [`../roteiro-erros-adb.md`](../roteiro-erros-adb.md) |
| **1** — auditoria mecânica | ferramentas determinísticas, código morto removido | [`fase1-mecanica.md`](./fase1-mecanica.md) |
| **2** — diagnóstico | leitura sem escrever nada; 11 recomendações, 5 aprovadas | [`fase2-diagnostico.md`](./fase2-diagnostico.md) |
| **3** — correções | R1, R2, R3, R5, R8, cada uma em branch temático | [`fase2-diagnostico.md`](./fase2-diagnostico.md), a partir de "## Fase 3" |
| **4** — revisão adversarial | outro modelo tentando quebrar o código; R12, R13, R14 | [`fase4/`](./fase4/) |

> A Fase 3 ficou **anexada ao arquivo da Fase 2**, por ela ser a execução do que
> aquele documento propôs. Está a partir do cabeçalho `## Fase 3 — executada em
> 29/07/2026`. Não foi renomeada para não quebrar as referências já escritas.

## Como ler isto se você for retomar o projeto

Comece pelo [`../baseline.md`](../baseline.md), seção 6: **o que NÃO foi
verificado**. É a única parte que muda o que você deve fazer a seguir.

Depois, a seção 8 do mesmo arquivo, que registra a lição que se repetiu em
todas as fases — guarda verde não é interface verificada, build verde não é
artefato bom — e o que a Fase 4 provou sobre autorrevisão.

## O que a revisão mudou no código

13 arquivos, +314 −96, todos em `src/`. Oito recomendações aplicadas:

| | o quê |
| --- | --- |
| R1 | recuperação de ADB deixou de destruir a conexão Wi-Fi |
| R2 | `confirmStable` mais paciente (~1,4 s → ~4,5 s) |
| R3 | estado "ADB não encontrado", antes silencioso |
| R5 | tokens de cor num módulo só |
| R8 | constante morta removida |
| R12 | serial sem fio numa definição só; mDNS reconhecido |
| R13 | reconexão em paralelo, não em fila |
| R14 | reconexão fora do `try` da recuperação |

Cinco recomendações foram **adiadas com motivo registrado** — R4 (extrair a
ponte de modos), R6 (cascas de diálogo), R9 (formatador), R10 (R8/minify) e R11
(electron-builder 26). O motivo de cada uma está na triagem da Fase 2, e adiar
com motivo escrito vale mais que aplicar por completude.

### R9 — decidido na Fase 5: continua adiada

O plano marcava a adoção de um formatador para esta fase, porque antes ela
enterraria o diff que a Fase 4 compara. Com a Fase 4 encerrada, o impedimento
caiu — mas a decisão é **não adotar agora**.

Reformatar toda a base é uma mudança mecânica de milhares de linhas, sem
nenhum efeito para quem usa o programa, aplicada exatamente sobre o código que
acabou de ser verificado em aparelho. Ela invalidaria a leitura do diff da
revisão inteira em troca de nada que o usuário perceba. O momento certo é
depois do lançamento, num commit isolado que não concorra com nenhum outro.
