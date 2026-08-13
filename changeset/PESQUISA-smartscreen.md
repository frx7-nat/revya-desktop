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

**Aprofundado em 13/08/2026.** Peguei o texto completo das condições em
`signpath.org/terms.html` (não só o resumo) para saber exatamente onde o
Revya se encaixa e onde não.

#### Elegibilidade — item por item, contra o estado real do projeto

| Exigência | Estado do Revya |
| --- | --- |
| Licença aprovada pela OSI, sem dual-licensing comercial | **Não atende ainda** — ver pendência abaixo |
| Nenhum componente proprietário (bibliotecas de sistema tudo bem) | ✅ scrcpy e ADB são Apache 2.0, com aviso em `THIRD-PARTY-NOTICES.md` |
| Repositório público | ✅ desde 13/08/2026 |
| Já existir em forma lançável (não vale projeto sem release) | ✅ `v1.0.0` publicado |
| Mantido ativamente | ✅ |
| Funcionalidade descrita na página de download | ⚠️ parcial — as notas do release descrevem, mas não há uma "página" formal fora do GitHub ainda (depende do 0.3) |
| Só pode assinar o PRÓPRIO código (o time que assina = o time que desenvolve) | ✅ |
| Sem ferramenta de "achar/explorar vulnerabilidade ou burlar segurança" | ✅ o Revya modifica o PRÓPRIO celular do usuário via ADB — não é essa categoria |

#### A pendência real: falta o arquivo `LICENSE`

`package.json` diz `"license": "MIT"`, mas **não existe `LICENSE` nem
`LICENSE.md` na raiz do repositório** — só `LICENSES/apache-2.0.txt`, que é
dos avisos de terceiros (scrcpy/ADB), não da licença do próprio Revya. Sem um
arquivo de licença publicado, a checagem de elegibilidade (automática ou
manual) provavelmente não confirma "OSI-approved" — é o único bloqueio
factual encontrado, e é decisão de produto (publicar como MIT de verdade é
uma escolha, não um erro de configuração) — **não mudei nada, só registrei**.

#### O modelo de receita (Pix/PayPal + afiliados) é um problema?

Não achei NADA nos termos da SignPath proibindo doação ou link de afiliado.
A cláusula é sobre a LICENÇA DO SOFTWARE ("sem dual-licensing comercial" —
ou seja, não pode vender uma versão paga fechada ao lado da versão aberta),
não sobre como o projeto se sustenta financeirmente. Doação e afiliado não
tocam a licença do código. Ainda assim, é uma pergunta que só a própria
SignPath responde com certeza — não há como confirmar sem aplicar.

#### Precedente: quem já usa

A página inicial (`signpath.org`) lista como exemplos **Stellarium, LiteDB,
Flameshot, Git Extensions** — nenhum é Electron, nenhum visivelmente
monetizado por doação/afiliado como o Revya. Não é um "não" — é só que não
achei um caso parecido para comparar. O risco maior não é rejeição por
monetização, é rejeição por "não é bem isto que a SignPath imaginou assinar"
na revisão manual — não tem como saber sem aplicar de verdade.

#### Como a assinatura entraria no CI (technical, se aprovado)

A integração é feita via **GitHub App da SignPath** + uma Trusted Build
System configurada para "GitHub.com", ligada ao projeto. O `build.yml`
precisaria de DOIS passos novos no job `win`, depois de "Gerar instalador":

1. Subir o `.exe` **sem assinar** como artefato do GitHub Actions
   (`actions/upload-artifact`, com `archive: false` para não virar `.zip`).
2. Rodar a action `signpath/github-action-submit-signing-request@v2`,
   passando `SIGNPATH_API_TOKEN` (secret), `organization-id`,
   `project-slug`, `signing-policy-slug` e o ID do artefato do passo 1. Com
   `wait-for-completion: true`, o próprio job espera a assinatura terminar e
   recebe o `.exe` assinado de volta numa pasta de saída.

A SignPath confere que a build veio de verdade de um workflow do GitHub (não
de alguém só de posse do token) — os metadados de origem vêm do próprio
GitHub, o que dificulta forjar uma submissão.

#### Como aplicar

Não achei um formulário de auto-atendimento funcionando nesta pesquisa (o
link de checagem retornou 404 no momento do teste — pode ter mudado de
endereço). O caminho confirmado é `signpath.org` → seção de projetos open
source, ou contato direto em `info@signpath.io`. Prazo relatado: de alguns
dias a algumas semanas depois de aplicar.

#### Ordem prática se decidir seguir esta rota

1. Publicar um `LICENSE` de verdade na raiz do `revya-desktop` (decisão de
   produto: confirmar que MIT é mesmo a intenção).
2. Aplicar via `signpath.org` (ou e-mail direto), citando o repositório
   público e o release `v1.0.0` já existente.
3. Só depois de aprovado, mexer no `build.yml` — não vale a pena montar a
   integração de CI antes de saber se o projeto é aceito.

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
