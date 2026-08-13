# Como contornar o Microsoft Defender SmartScreen — pesquisa (13/08/2026)

> Contexto: o item 0.2 do PENDENCIAS já decidiu "aceitar a fricção e
> documentar" (botão direito → Abrir / Mais informações → Executar assim
> mesmo). Esta pesquisa é sobre se dá para **eliminar** o aviso, não só
> explicar. Nada aqui foi executado ainda — é levantamento, para decidir.

## O que NÃO funciona mais (armadilha comum)

**Certificado EV não dá reputação instantânea.** Isso era verdade até uns anos
atrás — hoje (confirmado na documentação oficial da Microsoft, atualizada em
julho/2026) certificados EV e OV constroem reputação da MESMA forma:
organicamente, por volume de download. Pagar mais caro num EV não compra o
selo verde de cara. Fonte: [SmartScreen reputation for Windows app
developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).

**Não existe canal de "isenção" para desenvolvedor pequeno.** A Microsoft não
aceita pedido de "coloca meu app na lista de confiança". O único canal formal
é submeter o arquivo pelo [Microsoft Security
Intelligence](https://www.microsoft.com/en-us/wdsi/filesubmission) para
análise — serve para contestar um FALSO POSITIVO (antivírus acusando malware
por engano), não para evitar o aviso de reputação desconhecida, que é
diferente e não tem contestação.

## Como a reputação se constrói de verdade

Um arquivo **sem assinatura** constrói reputação por hash — cada atualização
zera e começa do zero. Um arquivo **assinado** constrói reputação pelo
CERTIFICADO, e essa reputação se acumula entre versões (mesmo certificado =
histórico continua). É a diferença real entre assinar ou não: não é sobre
"sumir o aviso na hora", é sobre "os avisos pararem de aparecer depois de
algumas semanas/centenas de downloads limpos" — e sem assinatura isso nunca
acontece, porque cada build é um hash novo.

Não há número oficial de threshold, mas os relatos giram em torno de
**algumas semanas com centenas de instalações limpas** vindas de rede/IPs
variados.

## As três rotas possíveis, com custo real

### 1. Comprar um certificado OV (o caminho "padrão")
Mais barato encontrado: **Sectigo/Comodo OV, ~US$ 219/ano** (SSL.com e outros
chegam a listar algo perto de US$ 65-80/ano em revendedores, vale cotar antes
de comprar). Desde 01/03/2026 a validade máxima caiu para 460 dias (~15
meses) por regra do CA/Browser Forum — não dá mais pra comprar um cert de
vários anos de uma vez.
Constrói reputação assim que a reputação por certificado começa a acumular —
mas ainda assim não é instantâneo (ver acima).

### 2. SignPath Foundation — assinatura GRÁTIS para projeto open source
**Achado que pode valer a pena aqui, especialmente porque `revya-desktop` já
é um repositório público.** A SignPath Foundation assina de graça builds de
projetos open source elegíveis. Requisitos (resumo):
- Licença aprovada pela OSI, sem componente proprietário
- Repositório público (✅ já é, desde 13/08)
- **Já ter um release publicado** (✅ já temos o v1.0.0)
- O time que assina = o time que desenvolve (✅)

**Pendência achada nesta pesquisa, não relacionada a nada anterior:** o
`package.json` declara `"license": "MIT"`, mas **não existe nenhum arquivo
`LICENSE`/`LICENSE.md` na raiz do repositório** — só o
`LICENSES/apache-2.0.txt` dos avisos de terceiros (scrcpy/ADB). Sem um
arquivo de licença de verdade, o projeto provavelmente nem passa na triagem
automática de elegibilidade da SignPath. Isso é uma decisão de produto (qual
licença usar de fato?), não uma correção técnica — não mudei nada.
Formulário de elegibilidade: https://www.ossperks.com/programs/signpath/check
Processo leva de alguns dias a algumas semanas depois de aplicar.

### 3. Microsoft Store — a Microsoft assina por você
**A rota que mais me chamou atenção.** Publicar pela Microsoft Store (via
Partner Center, empacotando como MSIX) faz a PRÓPRIA Microsoft assinar o
pacote como parte da certificação — elimina o SmartScreen inteiramente, sem
comprar certificado nenhum.
- Cadastro de desenvolvedor **individual** ficou **gratuito** em 2026 (antes
  tinha taxa única). Conta de empresa ainda cobra ~US$ 99 (taxa única).
- Passa por revisão de política da Store antes de publicar.
- **Não confirmei** se apps que embutem binários de terceiros executáveis
  (ADB, scrcpy) — o caso do Revya — passam sem problema na revisão de
  política. A documentação não foi clara nisso nas buscas feitas; precisaria
  testar submetendo ou ler a política completa
  (https://learn.microsoft.com/en-us/windows/apps/publish/store-policies)
  antes de investir tempo empacotando em MSIX.
- Empacotar como MSIX é trabalho técnico à parte (o `electron-builder` tem
  suporte, mas não é o `--win` atual do projeto).

## Comparação rápida

| Rota | Custo | Elimina o aviso? | Esforço |
|---|---|---|---|
| Aceitar a fricção (decisão atual) | R$ 0 | Não — só explica | Já feito |
| Comprar OV | ~US$ 219/ano, renovando a cada 15 meses | Reduz com o tempo, não elimina na hora | Comprar + configurar assinatura no CI |
| SignPath (open source, grátis) | R$ 0 | Reduz com o tempo (mesma mecânica do OV, mas sem custo) | Precisa de LICENSE de verdade + aplicar + esperar aprovação |
| Microsoft Store | R$ 0 (individual) | **Sim, elimina** | Empacotar MSIX + passar na revisão de política (não confirmado se libera binários embutidos) |

## Não pesquisado ainda / próximo passo se quiser aprofundar

- Ler a política completa da Store sobre apps com binário de terceiros
  embutido, para saber se a rota 3 é viável de verdade antes de investir
  tempo em MSIX.
- Decidir a licença real do projeto (a pendência do `LICENSE` ausente) —
  isso desbloqueia ou não a rota 2.
