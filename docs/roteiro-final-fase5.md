# Roteiro final — Fase 5

Último teste de aparelho antes da tag `review-v1-completo`. Roda contra a
**build final** (`DexArmor-0.1.0`), não contra `npm run dev`.

Aparelho: S23 Ultra (SM-S918B, One UI 8.5), por Wi-Fi.

---

## Passo 0 — instalar a build final

Montar `~/Desktop/DexArmor-0.1.0/DexArmor-0.1.0-arm64.dmg` e arrastar para
Aplicativos, por cima da versão que estiver instalada.

Na primeira abertura o macOS vai avisar que é de desenvolvedor não
identificado. **Esse aviso é o esperado** — tem o botão "Abrir mesmo assim" em
Ajustes → Privacidade e Segurança. O que **não** pode aparecer é "Malware
Bloqueado", que não tem saída nenhuma.

- [ ] Abriu, e o aviso tinha saída

---

## Teste 1 — a Depuração sem fio do Android (NUNCA exercitada)

É o caminho do achado 1 da Fase 4. O DexArmor sempre pareia por
`adb tcpip 5555` + `connect ip:5555`, então o serial que ele vê é `ip:porta`.
A Depuração sem fio do Android 11+ usa mDNS e produz um serial de outro
formato: `adb-R5CT...-XXXXXX._adb-tls-connect._tcp`.

**O app nunca rodou contra esse formato.** Não é um teste de regressão — é a
primeira vez.

No aparelho: Configurações → Opções de desenvolvedor → **Depuração sem fio** →
ligar → "Parear dispositivo com código de pareamento".

- [ ] O app enxerga o aparelho e diz "Galaxy pronto"
- [ ] O nome do aparelho e o modelo aparecem certos
- [ ] O registro de reversão é o MESMO de antes (o índice é o serial de
      fábrica, não o de conexão) — a tela não deve tratá-lo como aparelho novo

> Se, ao cair a rede, o aparelho **sumir** da lista em vez de ficar `offline`,
> está tudo certo — o mDNS se comporta assim. A mensagem "Sem contato pela
> rede" é para quem fica `offline`, e o caminho `ip:5555` já foi verificado na
> Fase 0.

---

## Teste 2 — ciclo completo celular ⇄ TV

A rede de segurança de sempre, agora sobre a build final.

- [ ] Modo TV aplicado, fila até o fim
- [ ] `fingerprint-pos-troca` sem divergência
- [ ] Modo celular de volta
- [ ] Retrato idêntico ao de referência, com as personalizações preservadas

---

## Teste 3 — pop-up de acessórios ao fechar

Nunca verificado (seção 6 do baseline): não consegui reproduzi-lo em teste
automatizado. Agora que o programa é gratuito, esse pop-up é a receita.

- [ ] Fechar a janela pelo X mostra o pop-up
- [ ] Os links de afiliado abrem no navegador
- [ ] Fechar de novo, depois do pop-up, encerra o programa

---

## Critério de saída

Os três passam → tag `review-v1-completo`.

Qualquer um falha → o defeito volta para a Fase 3 num branch próprio, e a tag
espera. Uma tag que diz "revisão completa" sobre um teste que não passou vale
menos que nenhuma tag.
