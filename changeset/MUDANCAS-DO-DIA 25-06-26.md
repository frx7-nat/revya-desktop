# DexArmor — Mudanças do dia

> Acompanhamento simples do que foi alterado hoje no projeto.
> Para a documentação completa, ver `DOCUMENTACAO.md`.

---

## Correções (comandos que não funcionavam no celular)

Quatro personalizações não surtiam efeito porque os comandos **falhavam em
silêncio** (retornavam sem erro, mas nada mudava). Corrigido:

- **Reduzir animações** — agora aplica as 3 escalas de animação (antes só 1).
- **Silenciar sons** — agora aplica som de toque + som de bloqueio (chaves
  separadas no One UI).
- **Remover bloqueio de tela** — chave corrigida: `lockscreen_disabled`
  (era `lockscreen.disabled`, com ponto errado).
- **Manter Wi-Fi sempre ativo** — removido (a chave foi descontinuada no Android
  e não tem mais efeito).

**Melhoria de base:** o app agora confirma cada alteração lendo o valor de volta
no aparelho. Se o sistema rejeitar, mostra erro real em vez de fingir sucesso.

---

## Novidades de comportamento

- **Procedimentos concluídos ficam riscados e travados.** Só são marcados como
  feitos mediante comprovação real no aparelho. Não podem ser clicados de novo.

- **Pop-up ao fechar o programa.** Apresenta a seção de Acessórios com um botão
  que leva direto para a aba. Só fecha de fato após confirmação.

---

## Novidades visuais

- **Celular vira TV.** Após a primeira configuração, o celular no centro gira
  para a horizontal e cresce, simulando uma TV.

- **Acessórios flutuantes.** Ao abrir a aba Acessórios, surgem 4 acessórios
  (hub HDMI, controle remoto, caixa de som, joystick) flutuando suavemente ao
  redor do celular, que fica parado.

---

## Arquivos tocados hoje

| Arquivo | O que mudou |
|---------|-------------|
| `src/adb/adb.js` | Funções de leitura/verificação de configurações |
| `src/main/runner.js` | Verificação de settings; suporte a múltiplas chaves |
| `src/main/main.js` | Interceptação do fechar (pop-up) |
| `src/main/preload.js` | Pontes para o pop-up de fechamento |
| `src/renderer/App.jsx` | Estado de concluídos, aba e pop-up |
| `src/renderer/data/tasks.js` | Correção das chaves; remoção do Wi-Fi |
| `src/renderer/components/TaskPanel.jsx` | Itens riscados/travados |
| `src/renderer/components/DevicePanel.jsx` | Fase TV + acessórios ao redor |
| `src/renderer/components/PhoneMock.jsx` | Rotação/escala (virar TV) |
| `src/renderer/components/PhoneScreen.jsx` | Tela da fase TV |
| `src/renderer/components/PhoneAccessories.jsx` | **Novo** — acessórios flutuantes |
| `src/renderer/components/CloseDialog.jsx` | **Novo** — pop-up de fechamento |

---

## Pendente de teste

As correções de ADB estão certas nas chaves e na lógica, mas alguns ajustes
podem ainda ser rejeitados em certos modelos de Galaxy (o `lockscreen_disabled`
é instável). Agora o app **avisa** quando isso acontece. Só dá para saber quais
funcionam no aparelho real testando com `npm run dev`.
