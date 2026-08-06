# Sugestões de funções para o Revya — central de controle da sua TV

Propostas para refinar o produto antes da venda, pensadas para o usuário leigo
e para diferenciar o Revya como "central de controle do dispositivo de TV".
Ordenadas por relação impacto ÷ esforço (estimativa).

## 1. Controle remoto virtual
Botões de volume, play/pause, voltar, home e setas de navegação direto no app,
via `adb shell input keyevent` — funciona por USB e Wi-Fi. Elimina a
necessidade de pegar o celular na mão e combina com o espelhamento já
existente. **Esforço: baixo** (os keyevents são comandos ADB simples).
Diferencial de venda forte: o computador vira o controle remoto.

## 2. Painel de saúde do aparelho
Temperatura e nível da bateria, armazenamento livre e alertas — essencial para
um celular que vive 24h na tomada (complementa a proteção de carga a 85% que o
app já aplica). Dados via `dumpsys battery` e `df`. **Esforço: baixo/médio.**
Gera confiança de produto "profissional".

## 3. Limpeza com um clique
Limpar cache dos apps de streaming (`pm trim-caches` / limpeza por app), que
incham com o tempo e enchem o armazenamento. **Esforço: baixo.** Função de
manutenção que dá motivo para o cliente reabrir o app periodicamente.

## 4. Atualizador de apps embutido
Como o Revya desativa as atualizações automáticas do sistema (de propósito),
oferecer um botão "Atualizar meus apps de TV" que instala versões novas dos
APKs curados por você. **Esforço: médio.** É o caminho natural para receita
recorrente (assinatura de catálogo atualizado).

## 5. Sleep timer e rotinas
Desligar a tela em horário programado ("timer de cinema"), religar de manhã,
agendar o Não Perturbe. Exige o app aberto no computador ou um agente leve.
**Esforço: médio.**

## 6. Modo quiosque / perfil crianças
Travar o aparelho em apps escolhidos (ex.: só Netflix e YouTube Kids), com
desbloqueio pelo computador. Via `pm disable-user` seletivo ou launcher com
lista de permissões. **Esforço: médio/alto.** Forte apelo para famílias.

## 7. Perfis de configuração exportáveis
Evoluir o export/import do registro de reversão (já existente) para "perfis
completos" aplicáveis em vários aparelhos de uma vez. Público: quem monta e
revende celulares configurados como TV — um mercado B2B pequeno mas fiel.
**Esforço: médio.**

## 8. Auto-update do próprio Revya
`electron-updater` + um servidor de releases (o `publish` está `null` no
`package.json` hoje). Essencial para produto comercial: correções e catálogo
novo chegam sem o cliente baixar instalador de novo. **Esforço: médio.**
Pré-requisito prático para vender com suporte.

---

### Observações técnicas ligadas à venda
- **macOS**: a permissão de "Rede local" já foi declarada no build
  (`NSLocalNetworkUsageDescription`); no primeiro uso do modo sem fio o
  sistema pedirá autorização com o nome do Revya.
- **Windows**: vale testar o firewall do Windows no primeiro `adb connect`
  (pode pedir liberação de rede — cenário análogo ao do macOS).
- **Assinatura de código** (macOS notarization / Windows code signing) será
  necessária para o instalador não disparar avisos de segurança que assustam
  o público leigo.
