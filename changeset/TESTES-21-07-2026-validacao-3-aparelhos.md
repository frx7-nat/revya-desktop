# Testes de validação — 21/07/2026 à noite (S23 Ultra · S21 FE · Galaxy S8)

Sessão de validação em aparelho real de TODO o ciclo "manutenção da
experiência" (`CHANGESET-manutencao-experiencia.md`): reset de interface,
vacina da captura, diário de trocas, chip de estado, guia de primeira
configuração, seção Manutenção e reinício do espelhamento. Testes executados
pela usuária; números extraídos por Claude **do próprio diário de trocas**
gravado nos registros de cada aparelho (o recurso novo documentando o próprio
teste).

**Veredito da usuária: os três funcionaram perfeitamente.**

## Aparelhos

| Aparelho | Modelo | Sistema | Serial |
|---|---|---|---|
| Galaxy S8 | SM-G950F | LineageOS 21 / Android 14 (sem One UI, sem DeX) | ce0917191c1b141e04 |
| Galaxy S21 FE | SM-G990E | One UI / Android 16 | RXCW201M3HV |
| Galaxy S23 Ultra | SM-S918B | One UI / Android 16 | RXCX50450PW |

Total registrado no diário: **24 trocas concluídas, 0 avisos, 0 bloqueios,
0 itens pulados** — em três firmwares diferentes, incluindo ROM custom.

## Galaxy S8 (LineageOS) — o teste de estresse

Maior sequência da noite: **18 trocas em 16 minutos** (22:05–22:21), com
8 ajustes de modo por troca. Tudo 8/8 ok. Fluxos exercitados:

- **Alternância manual** nas duas direções, repetida ~7 ciclos seguidos —
  exatamente o padrão de uso que degradou o S21 FE na semana anterior, agora
  sem qualquer resíduo.
- **Ponte automática** (`variant=auto`, 22:18 e 22:19): modo TV religado
  sozinho ao conectar, com a contagem regressiva — 8/8 ok nas duas.
- **Retomada de troca interrompida** (`variant=resume`, 22:15): uma volta ao
  celular ficou no meio (6 de 8), e a retomada concluiu **só os 2 itens
  pendentes** — o comportamento projetado ("nada é refeito").
- **Vacina em ação**: em TODA ida ao modo TV, as capturas de
  `tw-anim` (animações) e `tw-sound` (sons) foram descartadas
  (`captura-descartada` no diário) — neste aparelho os valores de celular
  desses ajustes coincidem com os de TV (animações já reduzidas, sons já
  mudos), então a captura "tem cara de TV". O fallback carrega os mesmos
  valores: **efeito nulo, como projetado** (falso positivo inofensivo).
- Estado final: todas as entradas de modo dormentes (modo celular),
  `pendingSwitch` limpo, `introSeen` marcado (guia visto).

## Galaxy S21 FE — o paciente do diagnóstico

O aparelho que motivou o ciclo inteiro (de manhã estava preso em modo TV 4K
com o registro destruído; restaurado manualmente via ADB e reconfigurado do
zero pela usuária — ver `TESTES-21-07-2026.md`).

- Ciclo completo às 22:21–22:22: **ativação do modo TV 8/8 ok** e **volta ao
  celular 8/8 ok**. Exibição perfeita nos dois modos (relato da usuária) —
  o cenário que antes "não encaixava" agora alterna limpo.
- **Vacina em ação**: capturas de `tw-screen` (tela sempre ligada) e
  `tw-sound` descartadas — previsto no diagnóstico da manhã: a restauração
  manual não tocou `screen_off_timeout` e sons, então o "original" dessas
  entradas carrega valores de TV e a captura coincide. Efeito nulo
  (fallback idêntico); se a usuária quiser outros valores no modo celular,
  basta ajustá-los no aparelho em modo celular e alternar — o retrato limpo
  se regrava sozinho.
- Estado final: modo celular (dormentes), perfil "s21fe celular" preservado.

## Galaxy S23 Ultra — One UI recente

- **Dois ciclos completos** às 22:24–22:25 (TV → celular → TV → celular),
  8/8 ok nos quatro movimentos.
- **Vacina em ação**: `tw-screen` e `tw-anim` descartados nas idas ao TV —
  mesmo padrão inofensivo de coincidência de valores.
- Guia de primeira configuração visto (`introSeen`), perfil "Sala 4k"
  preservado no registro.
- Estado final: modo celular (dormentes), `pendingSwitch` limpo.

## O que ficou validado

| Recurso | Evidência |
|---|---|
| Alternância manual (2 direções) | 24 trocas, 3 aparelhos, 0 falhas |
| Ponte automática (`autoTv`) | 2 ativações no S8, 8/8 ok |
| Retomada de troca interrompida | 1 resume no S8, concluiu só os 2 pendentes |
| Vacina (`captura-descartada`) | 16 descartes registrados, todos inofensivos |
| Diário de trocas | Este relatório foi extraído dele |
| Guia de primeira configuração | `introSeen` marcado (S8 e S23) |
| Reset de interface + guard de dormentes | Código validado; sem cenário real de contaminação na noite (a vacina impediu) — ver observação abaixo |

## Observações e backlog

1. **Ruído da vacina no diário**: em aparelhos cujos valores de celular
   coincidem com os de TV (S8 com animações/sons; S21 FE com tela/sons pelo
   histórico da restauração), o descarte é registrado a CADA ida ao TV —
   inofensivo, mas polui o diário. Refinamento futuro: só anotar
   `captura-descartada` quando o valor descartado **difere** do fallback
   (aí sim é uma contaminação real evitada).
2. **Reset de interface sem "incêndio" para apagar**: com a vacina ativa, não
   houve contaminação real para o reset curar em teste. O fluxo roda pela
   mesma esteira da ponte (validada 24 vezes) e reverte pela camada original
   (mesma usada pelo guard, validado em código); um teste de fogo real
   exigiria desligar a vacina de propósito — desnecessário para o produto.
3. O registro antigo `RXCN800P1EN` (S23 de testes anteriores, 15/07) não foi
   tocado nesta sessão.
4. Entradas órfãs no S21 FE (Max/Paramount+ apontando apps inexistentes)
   seguem no registro — limpeza de órfãos continua como melhoria futura.
