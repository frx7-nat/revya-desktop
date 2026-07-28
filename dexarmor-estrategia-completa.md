# DexArmor — Estratégia de Lançamento Completa
### Documento de referência — consultar antes de gravar/publicar cada peça

> Última atualização: julho/2026. Este arquivo junta a pesquisa de mercado, o
> calendário de 3 meses e o SEO já fechado do primeiro vídeo, seus Shorts e o
> artigo do site. Cada seção pode ser lida isolada quando chegar a hora.

---

## Índice

1. [Pesquisa de mercado e concorrência](#1-pesquisa-de-mercado-e-concorrência)
2. [Plano de lançamento em 3 meses](#2-plano-de-lançamento-em-3-meses)
3. [Mapa de funções → ângulo de conteúdo](#3-mapa-de-funções--ângulo-de-conteúdo)
4. [Vídeo 1 — criativo (thumb, título de tela e gancho)](#4-vídeo-1--criativo)
5. [Vídeo 1 — SEO para YouTube](#5-vídeo-1--seo-para-youtube)
6. [Shorts derivados do Vídeo 1 — SEO](#6-shorts-derivados-do-vídeo-1--seo)
7. [Artigo do site — SEO para Google](#7-artigo-do-site--seo-para-google)
8. [Notas de calibração e lembretes fixos](#8-notas-de-calibração-e-lembretes-fixos)

---

## 1. Pesquisa de mercado e concorrência

*Metodologia: sem acesso a ferramenta real de volume de busca (Keyword Planner/Semrush pago) neste ambiente — os números foram substituídos por sinais mais confiáveis: tamanho de comunidade, atividade de desenvolvimento (GitHub) e cobertura editorial recente.*

### Sinal de demanda por tópico

| Tópico | Sinal encontrado | Leitura |
|---|---|---|
| Android TV (geral) | r/AndroidTV: 186 mil membros, alta atividade | Público grande e engajado |
| Samsung DeX | r/SamsungDex: 28 mil membros | Nicho específico e fiel — público-alvo direto do DexArmor |
| Samsung TV / One UI | r/SamsungTV: 55 mil · r/OneUI: 95 mil | "Samsung" como filtro tem público relevante |
| Cord-cutting / TV box | r/cordcutters: ~298 mil membros | Maior comunidade do cluster, mas genérica (não Samsung-específica) |
| "Turn phone into TV box" | Vídeos recorrentes no YouTube (2018–2026) + matéria da How-To Geek (mai/2026) | Tema editorial ativo, não é modismo |
| Projectivy Launcher | Grátis + Premium US$7,49 (pagamento único), comunidade própria | Valida que gente paga por polish em launcher de TV |
| TizenTube | 100% gratuito, ~35 mil commits, ativo | Nicho tem tração, mas esse projeto não monetiza |
| Android mods (geral) | Atividade constante no XDA em torno de ADB/debloat | Comunidade técnica engajada, porém dispersa |

**Achado central:** a combinação "Samsung especificamente + reaproveitar celular como TV box" aparece repetidamente como problema real e mal resolvido — a própria imprensa (How-To Geek) descreve a experiência em Samsung/Tizen como frustrante, com apps de mirroring "cheios de anúncio" que "nem reconhecem a Samsung TV". Validação direta da dor que o DexArmor resolve.

### Dados de mercado (contexto, não número exato)

Relatórios públicos de mercado de Android TV Box são **inconsistentes entre si**
(de US$3,8 bi a US$19 bi só em 2026, dependendo da fonte — típico de
agregadores de baixa qualidade). Tendência unânime: **crescimento de dois
dígitos ao ano**, puxado por cord-cutting. Mais da metade dos domicílios nos
EUA já usa pelo menos um streaming device — o hábito de "ter uma caixinha
ligada na TV" já está consolidado.

### Concorrentes e adjacentes

| Produto | O que faz | Preço | Relação com o DexArmor |
|---|---|---|---|
| Projectivy Launcher | Launcher alternativo Android TV | Grátis + Premium US$7,49 | Adjacente — resolve a interface, não a conversão do aparelho |
| TizenTube | Remove anúncio do YouTube em TV Samsung | Grátis | Adjacente — mesmo público, não monetiza |
| **ADB AppControl / ADB TV** | App desktop que gerencia Android TV boxes via ADB | Licença PRO paga | **Concorrente mais próximo em modelo de negócio** — mas atua em TV boxes prontos, não converte celular |
| Apps de mirroring genéricos | Espelhamento de tela pro TV | Freemium agressivo | Experiência ruim especificamente em Samsung (confirmado pela imprensa) |
| Tutoriais manuais (YouTube/XDA/Quora) | "Como transformar Galaxy em TV box" | Grátis (conteúdo) | Não é concorrente de produto — é a demanda que o DexArmor automatiza |

**Nenhum concorrente direto encontrado** que automatize via ADB a conversão
completa de um Samsung Galaxy específico em TV box, com diagnóstico e
recuperação de erro embutidos.

### Onde buscar tráfego qualificado

r/SamsungDex (28k, público certeiro) · XDA (thread do Projectivy já tem anos de
atividade — bom sinal de conversão nesse fórum) · r/cordcutters (maior
audiência, mas exige ângulo "economize" em vez de "geek tech").

---

## 2. Plano de lançamento em 3 meses
### "Da gaveta pra tela"

**Calibração:** esse ritmo é mais pesado que o padrão de ~5h/mês. Um pico de
esforço se justifica para o lançamento — mas passado os 3 meses, **volta pro
ritmo enxuto** (1 vídeo + shorts + 1 artigo/mês), pra não repetir risco de
esgotamento.

| Mês | Fase | Objetivo | Tom |
|---|---|---|---|
| 1 | Despertar | Plantar a dúvida: "meu celular parado faz isso?" | Curiosidade, zero venda |
| 2 | Prova | Mostrar o processo funcionando | Demonstração, ainda pouca venda |
| 3 | Lançamento | Anunciar, prova social, CTA direto | Honesto sobre pra quem serve e pra quem não |

### Mês 1 — Despertar

- **Vídeo pilar:** "Seu Galaxy velho tem uma saída escondida que vira sua TV" — sem menção a produto
- **Shorts (3):** "Seu celular tem essa saída e ninguém te falou" · "Pra que serve aquele Galaxy parado na gaveta?" · corte da transformação visual sem contexto
- **Artigo:** "Seu Samsung Galaxy tem saída HDMI? Veja como descobrir" (SEO puro, cluster "samsung dex hdmi")
- **Distribuição:** nenhuma ainda — é cedo demais, evita parecer propaganda

### Mês 2 — Prova

- **Vídeo pilar:** "Transformei um Galaxy aposentado numa TV box completa (sem root, e dá pra desfazer tudo)" — convite de beta só no fim
- **Peça técnica (artigo, não vídeo):** "Por dentro do DexArmor: por que não usa root e como garante que dá pra reverter tudo" — mira XDA/Reddit técnico
- **Shorts (4):** PS2 via AetherSX2 · "desfaz tudo com 1 clique" · "sem fio, só Wi-Fi" · "bateria não estraga com 24h ligado"
- **Artigo:** "Como transformar um Samsung Galaxy em TV box (guia completo)" — termina com convite de beta
- **Distribuição:** primeira aparição orgânica em r/SamsungDex e XDA (comentário útil, não propaganda)

### Mês 3 — Lançamento

- **Vídeo pilar:** "Não compre uma TV box: o celular parado na gaveta já é uma" — comparação honesta de custo, com seção explícita "pra quem NÃO vale a pena"
- **Shorts (4):** depoimento de beta tester · time-lapse antes/depois · comparação de custo · ponte pro conteúdo de acessórios
- **Artigo:** "DexArmor está disponível: o que faz, quanto custa e pra quem é" — com seção fixa "isso aqui não faz"
- **Distribuição:** anúncio em r/SamsungDex e r/cordcutters (ângulo "economize"), thread própria no XDA

### Depois dos 3 meses

Volta pro ritmo de 1 vídeo + shorts + 1 artigo/mês, alimentado pelo catálogo
de tasks (1 modificação por vídeo dá pra sustentar meses) e pelo feedback real
dos beta testers.

---

## 3. Mapa de funções → ângulo de conteúdo

| Função (da documentação) | Por que importa | Ângulo de conteúdo |
|---|---|---|
| Saída HDMI via DeX em Galaxy específicos | Maioria não sabe que existe | Vídeo de descoberta (mês 1) |
| Reversão total, registro por serial de fábrica | Medo nº1 do leigo | Conteúdo de confiança — "dá pra desfazer tudo" |
| Sem root (`pm uninstall --user 0`) | Mesmo medo, ângulo técnico | Conteúdo "por dentro" pro público entendido |
| Configuração recomendada (1 clique) | Resolve barreira de entrada do leigo | Demonstração rápida, "não precisa entender nada disso" |
| Catálogo auditável (`tasks.js`) | Transparência técnica | Conteúdo "por dentro" — prova de que não é caixa-preta |
| Escrita verificada (lê de volta) | Evita "falso sucesso" | Credibilidade — "não finge que funcionou" |
| AetherSX2 (emulador PS2) | Empolgação/compartilhamento | Short — retrogaming no celular aposentado |
| Proteção de bateria (85%) | "Posso deixar ligado sempre?" | "Fica ligado 24h sem estragar a bateria" |
| Uso por Wi-Fi | Reduz fricção estética | Short — "sem fio pendurado atrás da TV" |
| Espelhamento (scrcpy) | "Como mexo sem pegar o aparelho" | Demonstração — controle pela tela do PC |
| Transformação visual (celular vira TV) | Momento memorável | Thumbnail e corte de abertura/fechamento |
| Acessórios (hub, controle, caixa de som, joystick) | Já é formato do canal | Ponte pro conteúdo de recomendação existente |
| Limitações honestas | Credibilidade | Seção fixa "isso aqui NÃO faz" em todo material |

---

## 4. Vídeo 1 — criativo

### Thumbnail (3 combinações pra testar)

1. Split-screen: celular largado, tela apagada / TV ligada com interface completa. Texto: **"ISSO É O MESMO CELULAR"**
2. Close no cabo USB-C→HDMI, TV desfocada ao fundo, "?" grande. Texto: **"QUE SAÍDA É ESSA?"**
3. (Se aparecer no vídeo) Reação de surpresa olhando pra TV. Texto: **"NINGUÉM ME AVISOU DISSO"**

Regra: 3-4 palavras no máximo no texto do thumb; contraste alto (sala escura + tela acesa já ajuda).

### Primeiros 8 segundos (3 variações)

**A — reveal invertido (recomendada):**
> [TV já ligada, Netflix/launcher rodando bonito] "Isso não é Chromecast. Não é Fire Stick." [corta pro celular + cabo] "É um Galaxy parado numa gaveta."

**B — pergunta direta + prova instantânea:**
> [segurando o celular] "Seu Samsung tem uma saída que quase ninguém usa." [conecta o cabo na hora] "Deixa eu te mostrar o que ela faz."

**C — expectativa quebrada:**
> [tentativa comum na TV, 1s de "não rolou"] [corte seco pro resultado funcionando]

**Regra do vídeo 1:** sem menção ao DexArmor. 100% "olha que descoberta legal", sem CTA de produto.

---

## 5. Vídeo 1 — SEO para YouTube

**Títulos (A/B no YouTube Studio):**
1. `Samsung Galaxy Tem Saída HDMI Escondida (e Vira TV Box)`
2. `A Saída Escondida do Samsung Galaxy Que Vira TV Box`

*Por quê: no mobile o título corta em ~35-40 caracteres — "Samsung Galaxy" precisa aparecer logo no início.*

**Descrição:**
```
Descobri que meu Samsung Galaxy tem uma saída HDMI escondida que
transforma ele numa TV box completa — e a maioria dos donos de Galaxy
nem sabe que isso existe.

Isso se chama Samsung DeX, e em alguns modelos específicos ele permite
ligar o celular direto na TV via cabo/dock USB-C para HDMI, com uma
interface pensada pra tela grande. Na prática, um aparelho parado na
gaveta pode virar streaming, jogos e muito mais — sem comprar nada novo.

Nesse vídeo eu mostro a descoberta e o resultado. Tem mais coisa vindo
sobre como automatizar essa configuração inteira, então se você tem um
Galaxy parado por aí, fica de olho.

📱 Minhas outras recomendações de tecnologia: [link do site]
🔔 Inscreva-se pra não perder os próximos vídeos dessa série

#SamsungDeX #TVBox #SamsungGalaxy
```

**Tags:**
```
samsung dex, samsung galaxy tv box, saída hdmi samsung galaxy,
transformar celular em tv box, celular vira tv box, hdmi samsung galaxy,
reaproveitar celular antigo, usar celular velho, dex modo tv,
android tv celular, samsung galaxy, tv box, tecnologia, dicas de tecnologia,
smartphone antigo
```

**Lembrete:** o YouTube hoje analisa o próprio áudio/legenda pra confirmar se
bate com título/descrição. Subir legenda revisada (não só automática) com as
mesmas palavras-chave faladas naturalmente reforça tudo sozinho.

---

## 6. Shorts derivados do Vídeo 1 — SEO

*Lembrete geral: em Shorts, SEO pesa menos que no vídeo longo — a distribuição
é decidida quase toda pela taxa de conclusão e se a pessoa passa reto nos
primeiros 1-3 segundos. Metadado é sinal de apoio, não motor principal.*

**Short 1 — "Seu celular tem essa saída e ninguém te falou"**
- Título: `Seu Samsung Tem Essa Saída Escondida`
- Descrição: `Seu Samsung Galaxy pode ter uma saída HDMI escondida — vídeo completo mostrando o resultado no canal. #SamsungDeX #TVBox #SamsungGalaxy`

**Short 2 — "Pra que serve aquele Galaxy parado na gaveta?"**
- Título: `Pra Que Serve o Galaxy Parado na Gaveta?`
- Descrição: `Um Samsung Galaxy aposentado pode virar sua próxima TV box. Vídeo completo no canal. #SamsungDeX #ReaproveitarCelular #TVBox`

**Short 3 — transformação visual, sem contexto**
- Título: `Meu Samsung Galaxy Virou Isso Sozinho`
- Descrição: `Sim, isso é o mesmo celular. Como aconteceu, no vídeo completo do canal. #SamsungGalaxy #TVBox #SamsungDeX`

*(Ajuste feito no título 3: mantém o mistério, mas não fica 100% vago — título vago tipo TikTok performa pior no YouTube porque o algoritmo usa o texto pra categorizar.)*

**3 coisas que valem mais que hashtag:**
1. Ligar o Short ao vídeo longo pela função **"vídeo relacionado"** do Studio (não só link na descrição) — conta como watch time de sessão.
2. Legenda revisada — Shorts legendados rankeiam melhor.
3. `#Shorts` não é mais necessário tecnicamente (identificação é por formato vertical + duração), mas não atrapalha se preferir manter por costume.

---

## 7. Artigo do site — SEO para Google

**Title tag:**
```
Samsung Galaxy Tem Saída HDMI Escondida? (Samsung DeX)
```
~54 caracteres.

**Meta description:**
```
Descubra se seu Samsung Galaxy tem saída HDMI (modo DeX) e o que
dá pra fazer com ela — de espelhar a tela a virar TV box. Veja como testar.
```
~145 caracteres.

**URL** (seguindo o padrão `anotacoes/android/` já usado no site):
```
/anotacoes/android/samsung-dex-saida-hdmi
```

**H1:**
```
Seu Samsung Galaxy tem uma saída HDMI escondida (e é mais fácil
descobrir do que parece)
```

**Estrutura de H2:**
- O que é o Samsung DeX e por que ele tem saída HDMI
- Quais Galaxy têm suporte a essa saída
- Como descobrir se o seu aparelho suporta
- O que dá pra fazer com isso (espelhar, assistir, virar TV box)
- Perguntas frequentes

**Schema:**
- `FAQPage` (JSON-LD) na seção de perguntas frequentes — ajuda tanto rich
  snippet no Google quanto citação em respostas de IA/AI Overviews.
- `Article`/`BlogPosting` (JSON-LD) com headline, data, autor e imagem.

**Open Graph** (importante — esse artigo vai ser postado em r/SamsungDex e no XDA, que leem essas tags pro preview):
```html
<meta property="og:title" content="Samsung Galaxy Tem Saída HDMI Escondida?">
<meta property="og:description" content="Descubra se seu Galaxy tem modo DeX com saída HDMI e o que dá pra fazer com ela.">
<meta property="og:image" content="[imagem 1200x630 — celular ligado na TV]">
<meta property="og:type" content="article">
```

**Atenções específicas do seu site:**
- Se mencionar algum acessório (cabo/dock USB-C→HDMI) dentro do texto, manter
  as classes `.inline-prod` / `.ip-name` que o GA4 já rastreia — não criar
  link solto fora desse padrão.
- **Não linkar para o DexArmor ainda.** Mês 1 é "sem venda" — um link interno
  pro produto quebraria a lógica do próprio plano. Link interno aqui vai só
  pra conteúdo evergreen já existente (ex.: recomendação de hub HDMI).

---

## 8. Notas de calibração e lembretes fixos

- Esse plano todo é **mais pesado que o ritmo normal do canal** — é um pico
  de lançamento, não o novo padrão. Depois dos 3 meses, volta pro enxuto.
- **Regra de ouro do mês 1 e parte do mês 2:** zero menção a produto. A
  confiança se constrói antes da venda, não durante.
- Toda peça de conteúdo (vídeo, short ou artigo) deve ter, em algum momento,
  uma seção honesta de **limitação** — isso é o que já diferencia o canal e
  vale manter mesmo sob pressão de lançamento.
- Conteúdo técnico (arquitetura, sem root, reversão) vai em **peça separada**
  do vídeo principal — não force isso no vídeo de massa, mas não pule essa
  peça: é o que constrói credibilidade no XDA/Reddit técnico.
