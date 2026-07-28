# Plano de Revisão Formal — DexArmor (Desktop + Launcher)

**Objetivo:** submeter o projeto a uma inspeção equivalente à de um engenheiro sênior, eliminando código morto, inconsistências e padrões característicos de código gerado por IA, sem regressão funcional.

**Princípio central:** diagnóstico e correção são etapas separadas. Nenhuma alteração de código ocorre antes do relatório de diagnóstico estar aprovado.

**Escopo:** app desktop (Electron/macOS, com suporte Windows em teste) e launcher Android (fachada do modo TV).

---

## Fase 0 — Congelamento e linha de base

*Duração estimada: meia diária. Pré-requisito de tudo.*

- [ ] Criar tag no git em ambos os repositórios: `git tag pre-review-v1 && git push --tags`
- [ ] Gerar build de referência de cada aplicação e arquivar os binários (fora do repositório)
- [ ] Documentar em `docs/baseline.md` o comportamento verificado no aparelho real:
  - [ ] Desktop: conversão completa de um Galaxy em TV box, reversão em um clique, detecção e recuperação de erros ADB
  - [ ] Launcher: navegação em loop pelas cinco categorias, botão MODO (Dashboard ↔ TV com escala 0,85), ciclo das três cores de acento, menu CONFIG (Sistema → Reordenar seções → Reordenar apps), troca facilitada para outro launcher preservando o DexArmor
- [ ] Registrar versões de ambiente: Node, Electron, Gradle, SDK Android, modelo e versão do One UI do aparelho de teste

**Critério de saída:** existe um estado recuperável e uma lista verificável do que "funcionar" significa.

---

## Fase 1 — Auditoria mecânica (ferramentas determinísticas, sem IA)

*Duração estimada: 1 diária. Gera evidência objetiva antes de qualquer julgamento.*

### 1.1 Desktop (Electron / JS-JSX)

- [ ] `npx knip` — código morto, exports não usados, arquivos órfãos
- [ ] `npx depcheck` — dependências declaradas e não utilizadas
- [ ] `npx jscpd src/ --min-tokens 50` — blocos duplicados
- [ ] `npx madge --circular src/` — ciclos de importação
- [ ] ESLint em modo estrito + Prettier com configuração única aplicada a todo o repositório
- [ ] `npm audit` — vulnerabilidades de dependências

### 1.2 Launcher (Android)

- [ ] `./gradlew lint` — com atenção a `UnusedResources`, `UnusedIds`, recursos de layout órfãos
- [ ] `detekt` — complexidade ciclomática, funções longas, duplicação
- [ ] `ktlint` (ou o formatador do projeto) aplicado uniformemente
- [ ] Verificar se R8/minify está ativo no build de release e o que ele elimina

### 1.3 Consolidação

- [ ] Reunir a saída de todas as ferramentas em `docs/review/fase1-mecanica.md`
- [ ] Aplicar imediatamente apenas o que é seguro e automático: formatação, remoção de imports não usados, remoção de dependências órfãs
- [ ] Commit único por categoria (`chore: aplicar prettier`, `chore: remover dependências órfãs`), verificando o build após cada um

**Critério de saída:** relatório mecânico consolidado; base de código formatada de maneira uniforme; build íntegro.

---

## Fase 2 — Diagnóstico por IA (somente leitura)

*Duração estimada: 1 diária. O modelo lê, classifica e reporta. Não edita.*

Executar no Claude Code com instrução explícita de não modificar arquivos. Criar como command file (ex.: `.claude/commands/revisao-diagnostico.md`) contendo:

**Papel:** engenheiro sênior conduzindo inspeção formal de código antes de release, com autoridade para reprovar.

**Entregável:** `docs/review/fase2-diagnostico.md` com as seções:

1. **Mapa de arquitetura** — módulos, responsabilidades, fluxo de dados do pipeline ADB (desktop) e do ciclo de navegação/estado (launcher)
2. **Achados por severidade:**
   - `CRÍTICO` — risco de dano ao aparelho do usuário, perda de reversibilidade, falha silenciosa em operação ADB
   - `ALTO` — bug funcional, tratamento de erro incorreto ou inconsistente, condição de corrida
   - `MÉDIO` — duplicação estrutural, abstração desnecessária, acoplamento evitável
   - `BAIXO` — nomenclatura, comentários, organização
3. **Inventário de padrões de código gerado por IA**, com localização exata:
   - `try/catch` defensivo que engole erros sem tratá-los
   - Comentários que narram a linha seguinte em vez de explicar o porquê
   - Helpers e wrappers de uso único
   - Camadas de abstração com um único implementador
   - Validações redundantes do mesmo dado em pontos diferentes
   - Inconsistência de padrão entre arquivos (três formas diferentes de fazer a mesma coisa)
   - Nomes genéricos (`handleData`, `processResult`, `utils.js` inchado)
4. **Auditoria de segurança dirigida** (adaptação do escopo OWASP/STRIDE ao contexto):
   - Desktop: sanitização de comandos ADB, `contextIsolation`/`nodeIntegration` no Electron, validação do JSON remoto do changelog, integridade da verificação de licença/registro de dispositivo
   - Launcher: permissões declaradas vs. usadas, exposição de components (activities/receivers exportados), tratamento do intent de HOME
5. **Recomendações**, cada uma com esforço estimado (P/M/G) e risco de regressão (baixo/médio/alto)

- [ ] Revisar o diagnóstico pessoalmente e marcar cada recomendação como **aprovada / recusada / adiada**
- [ ] Registrar as recusas com uma linha de justificativa (isso vira documentação de decisão do projeto)

**Critério de saída:** diagnóstico completo, revisado e triado por você. Nada foi alterado ainda.

---

## Fase 3 — Correções em branches temáticos

*Duração estimada: 2 a 4 diárias, conforme a triagem. Nunca um branch de "limpeza geral".*

Ordem de execução: severidade decrescente, risco de regressão crescente.

Para **cada tema aprovado** (exemplos: `fix/unificar-erros-adb`, `refactor/remover-helpers-uso-unico`, `refactor/estado-launcher`):

- [ ] Criar branch a partir de `main`
- [ ] Instruir o modelo a corrigir **somente** os achados daquele tema, sem melhorias oportunistas fora de escopo
- [ ] Revisar o diff linha a linha antes do commit — regra prática: se você não consegue explicar uma linha, ela não entra
- [ ] Rodar novamente as ferramentas da Fase 1 no branch (nada novo pode aparecer)
- [ ] Verificar no aparelho real os itens do `baseline.md` afetados pelo tema
- [ ] Merge com mensagem descritiva; deletar o branch

Regras transversais:

- Um tema por branch, um propósito por commit
- Qualquer achado novo descoberto no caminho volta para a lista da Fase 2, não é corrigido "de passagem"
- Se um refactor quebrar o baseline e a causa não for óbvia em 30 minutos, reverter o branch e reavaliar o tema

**Critério de saída:** todos os temas aprovados integrados; baseline integralmente verificado; ferramentas mecânicas limpas.

---

## Fase 4 — Revisão adversarial cruzada

*Duração estimada: meia a 1 diária. Um modelo diferente do que escreveu o código.*

- [ ] Submeter o diff acumulado (`git diff pre-review-v1..main`) a um segundo modelo (Codex CLI, Gemini CLI ou equivalente) com papel adversarial: "tente quebrar este código; aponte o que o autor não viu"
- [ ] Focar a sessão nos pontos de maior consequência: pipeline ADB de conversão/reversão, recuperação de erro, verificação de licença, persistência de estado do launcher
- [ ] Comparar os achados com o diagnóstico da Fase 2 — divergências entre modelos são os pontos que merecem sua atenção manual
- [ ] Triar e, se necessário, abrir um último branch temático (voltando ao processo da Fase 3)

**Critério de saída:** segunda opinião independente processada; nenhum achado crítico ou alto pendente.

---

## Fase 5 — Superfície pública e encerramento

*Duração estimada: meia diária. É a parte mais visível do resultado.*

- [ ] Reescrever `README.md` de ambos os repositórios na sua própria voz — objetivo, sem listas infladas de features, sem tom promocional genérico
- [ ] Revisar `CHANGELOG` e descrições de release: frases curtas, fatos, sem adjetivos vazios
- [ ] Conferir nomes de arquivos, mensagens de commit recentes e strings visíveis ao usuário (PT-BR e EN) quanto a consistência de terminologia
- [ ] Atualizar `docs/baseline.md` para refletir o estado final e arquivar `docs/review/` no repositório
- [ ] Criar tag final: `git tag review-v1-completo && git push --tags`
- [ ] Gerar builds finais e repetir o teste completo do baseline uma última vez

**Critério de saída:** projeto inspecionado, documentado e com histórico rastreável da revisão inteira.

---

## Teste final de honestidade

Abrir três arquivos aleatórios de cada projeto e explicar cada linha em voz alta. Toda linha que não puder ser explicada retorna à Fase 2 como achado — ou é removida.

---

## Resumo executivo

| Fase | Entrega | Quem executa |
|---|---|---|
| 0 | Tag, builds de referência, baseline verificável | Você |
| 1 | Relatório mecânico + limpeza automática segura | Ferramentas |
| 2 | Diagnóstico classificado, sem edições | IA (leitura) + sua triagem |
| 3 | Correções em branches temáticos | IA (edição) + sua revisão |
| 4 | Revisão adversarial por modelo distinto | Segundo modelo + sua triagem |
| 5 | README, changelog, tags e builds finais | Você |

Estimativa total: **5 a 8 diárias de trabalho focado**, compatível com execução em paralelo aos compromissos de fotografia — as Fases 1, 2 e 4 podem rodar de forma assíncrona enquanto você revisa os resultados em blocos.
