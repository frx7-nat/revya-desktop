# DexArmor — Mudanças do dia

> Acompanhamento simples do que foi alterado no projeto.
> Continuação a partir de `MUDANCAS-DO-DIA 25.06.26.md`.
> Para a documentação completa, ver `DOCUMENTACAO.md`.

---

## Etapa "DeX vs Experiência de TV"

Nova etapa que ensina o usuário a desativar o **Samsung DeX** em aparelhos que
o possuem (como o Galaxy S21 FE), para que ao conectar no HDMI o celular abra
direto na interface de TV em vez do DeX.

- **Diálogo com duas telas:** primeiro a explicação (comparação visual entre
  Modo DeX e Experiência de TV, para o usuário entender o porquê), depois o guia
  passo a passo de como desativar.
- **Guia por versão do One UI.** O caminho muda entre versões, então o usuário
  escolhe a dele: One UI 6/7, One UI 8, ou "sem DeX". Cada uma mostra os passos
  certos.
- **Acessível por dois botões:** um fixo no topo do painel esquerdo
  ("Desativar DeX") e outro no painel central (quando o aparelho está validado).
  O diálogo pode ser reaberto quantas vezes quiser.

### Aviso importante sobre o HDMI

Descoberto em teste no S21 FE: o menu do DeX **só aparece nas configurações
depois que o HDMI está conectado**. Sem o cabo, a opção fica indisponível. Por
isso o diálogo exibe um aviso destacado explicando que este passo deve ser feito
ao final, já com o celular na TV — não na primeira conexão ao computador.

> Nota: este ajuste **não é feito via ADB** (o DeX é uma camada proprietária
> sem chave pública confiável). É um tutorial guiado, igual ao de ativar a
> depuração USB. O programa ensina; o usuário faz no aparelho.

---

## Reverter alterações (reset com registro de estado)

Funcionalidade que permite **desfazer todas as modificações** feitas no
aparelho, devolvendo-o ao estado anterior. Dá segurança para testar à vontade.

- **Registro de estado.** Ao aplicar cada modificação, o app agora captura
  *como estava antes* (ex.: lê o valor anterior de um ajuste antes de mudá-lo;
  descobre o launcher atual antes de trocar). Isso torna a reversão **precisa**
  — volta ao seu valor real, não a um padrão genérico.
- **Botão "Reverter alterações"** no painel esquerdo. Só fica **clicável depois
  que há algo aplicado** para desfazer (antes disso, aparece desabilitado).
- **Diálogo honesto.** Antes de agir, lista o que será desfeito e avisa o que
  não consegue (o DeX, que é manual). Reverte item a item, e se um falhar
  (o launcher é o candidato), marca como "precisa de passo manual" e **continua
  os outros** — nunca trava no primeiro erro. No final, um resumo real
  ("Revertido: 3 de 4 itens").
- **Destrava as tarefas.** O que é revertido volta a ficar clicável no painel,
  fechando o ciclo do riscar/travar.
- **Garantia sempre presente.** O diálogo menciona o reset de fábrica do
  aparelho como rede de segurança, já que nenhuma modificação é destrutiva.

---

## Arquivos tocados

| Arquivo | O que mudou |
|---------|-------------|
| `src/adb/adb.js` | + `getCurrentHome`, `deleteSetting` (apoio à reversão) |
| `src/main/runner.js` | `runTask` retorna estado de reversão; novo `revertEntry` |
| `src/main/main.js` | Salva reversão ao aplicar; handlers `revert:count/list/one` |
| `src/main/preload.js` | Pontes de reversão (`revertCount/List/One`) |
| `src/renderer/App.jsx` | Estado de reversão, etapa DeX e diálogos |
| `src/renderer/components/TaskPanel.jsx` | Botões "Desativar DeX" e "Reverter" |
| `src/renderer/components/DevicePanel.jsx` | Botão da etapa DeX no painel central |
| `src/renderer/data/dexGuide.js` | **Novo** — textos e passos da etapa DeX |
| `src/renderer/components/DexGuideDialog.jsx` | **Novo** — diálogo DeX vs TV |
| `src/main/revertStore.js` | **Novo** — persistência do registro de reversão |
| `src/renderer/components/ResetDialog.jsx` | **Novo** — diálogo de reversão |

---

## Pendente de teste

- **Etapa DeX:** os nomes exatos das opções (ex.: "Iniciar automaticamente
  quando o HDMI for conectado") foram escritos com base no relato do S21 FE e em
  pesquisa. Confirmar a redação literal no aparelho real — se diferir, é só
  ajustar em `dexGuide.js` (arquivo de dados isolado).
- **Reversão:** o **launcher** é o item mais propenso a precisar de um passo
  manual (quirk do One UI). Testar como ele se comporta no S21 FE.
- **Limitação conhecida:** o registro de reversão fica no computador que aplicou
  as mudanças. Reverter funciona a partir do mesmo computador.
- Build em **Windows e Linux** ainda não testado (até aqui, validado no macOS).
  Atenção provável ao driver ADB no Windows.
