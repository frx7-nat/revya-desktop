# Roteiro final — Fase 5

Último teste de aparelho antes da tag `review-v1-completo`. Roda contra a
**build final** (`Revya-0.1.0`), não contra `npm run dev`.

Aparelho: S23 Ultra (SM-S918B, One UI 8.5), por Wi-Fi.

---

## Passo 0 — instalar a build final

Montar `~/Desktop/Revya-0.1.0/Revya-0.1.0-arm64.dmg` e arrastar para
Aplicativos, por cima da versão que estiver instalada.

Na primeira abertura o macOS vai avisar que é de desenvolvedor não
identificado. **Esse aviso é o esperado** — tem o botão "Abrir mesmo assim" em
Ajustes → Privacidade e Segurança. O que **não** pode aparecer é "Malware
Bloqueado", que não tem saída nenhuma.

- [x] Abriu; Gatekeeper deu `rejected` (aviso com saída), não `revoked`

---

## Teste 1 — a Depuração sem fio do Android (NUNCA exercitada)

É o caminho do achado 1 da Fase 4. O Revya sempre pareia por
`adb tcpip 5555` + `connect ip:5555`, então o serial que ele vê é `ip:porta`.
A Depuração sem fio do Android 11+ usa mDNS e produz um serial de outro
formato: `adb-R5CT...-XXXXXX._adb-tls-connect._tcp`.

**O app nunca rodou contra esse formato.** Não é um teste de regressão — é a
primeira vez.

No aparelho: Configurações → Opções de desenvolvedor → **Depuração sem fio** →
ligar → "Parear dispositivo com código de pareamento".

- [x] O app enxerga o aparelho e diz "Galaxy pronto"
- [x] O registro de reversão é o mesmo (indexado por `ro.serialno` = `RXCX50450PW`)
- [ ] **FALHOU** — o seletor mostrou o mesmo telefone duas vezes, uma rotulada
      "· USB" sem cabo nenhum ligado. Ver R15 abaixo.

> Se, ao cair a rede, o aparelho **sumir** da lista em vez de ficar `offline`,
> está tudo certo — o mDNS se comporta assim. A mensagem "Sem contato pela
> rede" é para quem fica `offline`, e o caminho `ip:5555` já foi verificado na
> Fase 0.

---

## Teste 2 — ciclo completo celular ⇄ TV

A rede de segurança de sempre, agora sobre a build final.

- [x] Modo TV aplicado, fila até o fim ("Seu TV box está pronto")
- [x] `fingerprint-pos-troca`: **9/9 conferidos no aparelho**, sem divergência
- [x] Modo celular de volta
- [x] **Retrato IDÊNTICO ao de referência, campo por campo** — incluindo
      `Override density: 560` e `font_scale: 0.8`, que são personalizações do
      usuário e não valores de fábrica

---

## Teste 3 — pop-up de acessórios ao fechar

Nunca verificado (seção 6 do baseline): não consegui reproduzi-lo em teste
automatizado. Agora que o programa é gratuito, esse pop-up é a receita.

- [x] Fechar a janela pelo X mostra o pop-up ("Antes de ir…")
- [x] **Os 31 links de afiliado respondem 200** — 9 do Mercado Livre e 22 da
      AliExpress, conferidos um a um por requisição, não por amostragem

---

## Resultado — 29/07/2026

O teste 1 **falhou**, e por isso valeu a pena.

Com a Depuração sem fio do Android pareada de verdade, `adb devices -l` passou a
trazer duas entradas para um telefone, e o seletor rotulou a mDNS como "· USB"
sem cabo nenhum ligado. Escolher aquela entrada reabilitava o botão "Conectar
por Wi-Fi" num aparelho já sem fio.

**R15** (`ad839b8`) consertou, e corrigiu o commit do R12 no caminho: eu havia
afirmado que a checagem de serial sem fio passara a ter "UMA definição", e
havia mais três `serial.includes(':')` no renderer. Não apareceram porque
procurei o regex, não a semântica. Agora os predicados moram em
`src/adb/serial.js` (módulo puro) e o renderer recebe o campo `wireless`
resolvido no main — ele não inspeciona serial nenhum.

Testes 2 e 3 passaram sem ressalva, na build que já contém o R15. Os retratos
estão em `docs/retrato-{referencia,tv,volta}.txt`.

Um limite conhecido fica: o mesmo telefone ainda aparece duas vezes no seletor
quando a Depuração sem fio está ligada além da conexão do app. Ambos os rótulos
agora estão certos e escolher qualquer um funciona. Não deduplicado — o motivo
está nos "Limites conhecidos" do README.

### Critério de saída: ATENDIDO

Os três testes rodaram, o único que falhou foi consertado e reverificado na
build final. Tag `review-v1-completo`.
