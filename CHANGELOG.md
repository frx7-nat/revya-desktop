# Changelog

Formato: o que mudou para quem **usa** o programa.

## 1.0.0 — Revya

O programa passa a se chamar **Revya** (era DexArmor). Sem mudança de
comportamento — é o nome que aparece na janela, no instalador e nos arquivos
que o programa gera. O launcher de TV embutido também está sincronizado nesta
versão: v11/1.0, pacote `tv.revya.launcher`.

Avisos de licença de terceiros (scrcpy, ADB) adicionados — ver
`THIRD-PARTY-NOTICES.md` e "Licenças de terceiros" dentro do programa.

## 0.1.0 — primeira versão pública

Converte um Galaxy em dispositivo de TV e traz de volta, quantas vezes o
usuário quiser. O que ele personalizar de cada lado é preservado na alternância.

Instaladores para Windows (instalador e portátil) e macOS (Intel e Apple
Silicon). Português e inglês. Gratuito, sem versão paga e sem coleta de dados.

### Corrigido nas builds anteriores de teste

Quem instalou uma build antes de 28/07/2026 esbarrou nestes três — todos
resolvidos:

- **Windows: não dava para atualizar nem desinstalar.** O programa recusava o
  pedido de fechamento que vem do instalador, e o Windows travava a operação
  inteira. Agora só o fechamento pedido pelo usuário é interceptado.
- **Windows: "integrity check failed" ao abrir o instalador.** O portátil
  funcionava e o instalador não. A diferença estava num campo do cabeçalho
  NSIS; o CRC do instalador foi desligado.
- **macOS: "Malware Bloqueado", sem opção de abrir mesmo assim.** Sem nenhuma
  assinatura, o Gatekeeper emite um veredito que não tem contorno. O `.app`
  passou a ser assinado em modo ad-hoc antes de virar DMG.

### Estabilidade da conexão ADB

Seis cenários de falha foram executados em aparelho real, e duas correções
saíram deles:

- Conexão por Wi-Fi que ficava `offline` por oscilação da rede **sumia de vez**:
  a recuperação automática reiniciava o servidor ADB e derrubava o pareamento
  em vez de restaurá-lo. Agora ela é pulada nesse caso — a conexão volta
  sozinha — e, quando roda por outro motivo, os endpoints sem fio são
  reconectados depois.
- Aparelho pareado pela **Depuração sem fio** do Android (11+) recebia
  instruções para trocar o cabo USB, sem ter cabo nenhum ligado.

### Conhecido e não resolvido

Ver "Limites conhecidos" no `README.md`. O mais relevante: a Depuração USB
precisa ser ligada à mão pelo usuário, uma vez, e não há como automatizar isso.
