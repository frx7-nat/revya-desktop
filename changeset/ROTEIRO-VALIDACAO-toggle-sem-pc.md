# Roteiro de Validação — Toggle "Modo TV / Modo Celular" sem PC

> **Objetivo:** confirmar no Galaxy S21 FE (One UI) que um app com permissões
> concedidas uma única vez via ADB consegue alternar as configurações do modo
> TV — incluindo a resolução — **sem Shizuku, sem root e sem PC** no dia a dia.
>
> Este é o teste decisivo antes de qualquer decisão sobre desenvolver o app
> companion do DexArmor. Ele responde em uma tarde a pergunta mais arriscada
> do projeto.

---

## O que estamos validando (3 hipóteses)

- **H1 — A concessão funciona no One UI.** A permissão `WRITE_SECURE_SETTINGS`
  pode ser concedida a um app via `pm grant` no S21 FE, sem bloqueio da Samsung.
- **H2 — Resolução sem shell.** Um app com essa permissão muda a **resolução**
  do aparelho (a parte que achávamos exigir Shizuku) — usando o mesmo mecanismo
  interno do `wm size`, mas pela API de settings (`display_size_forced`).
- **H3 — Sobrevive ao reboot.** Depois de reiniciar o celular, o app continua
  funcionando **sem reconectar ao PC** — provando que a permissão persiste e o
  toggle diário tem fricção zero.

**App de teste:** SecondScreen (gratuito, open source), que muda resolução e
densidade por perfis — exatamente o mecanismo que o companion usaria.

---

## Antes de começar — preparação (5 min)

**1. Limpe o estado do aparelho.** Se você aplicou a resolução pelo DexArmor e
ainda não reverteu, reverta agora (botão "Reverter alterações"), para o teste
não sofrer interferência. Ou, via terminal:

```bash
ADB="/Users/natalierjunior/Tivi - App/platform-tools/mac/adb"
"$ADB" shell wm size reset
"$ADB" shell wm size
```
A última linha deve mostrar só `Physical size: 1080x2340` (sem "Override").

**2. Confirme a conexão.** Celular no cabo, depuração USB ativa:
```bash
"$ADB" devices
```
Deve listar `RXCW201M3HV    device`.

> As aspas em `"$ADB"` são obrigatórias — o caminho da sua pasta tem espaços
> ("Tivi - App").

---

## Passo 1 — Instalar o SecondScreen (2 min)

No celular, instale o **SecondScreen** (de Braden Farmer / farmerbb):
- Play Store: buscar "SecondScreen", ou
- F-Droid: pacote `com.farmerbb.secondscreen.free`

Abra o app uma vez. Ele vai avisar que precisa de permissões elevadas — é
exatamente o que vamos conceder no próximo passo. Pode fechar o aviso.

---

## Passo 2 — Conceder a permissão (o momento-chave, testa H1)

Com o celular no cabo:

```bash
"$ADB" shell pm grant com.farmerbb.secondscreen.free android.permission.WRITE_SECURE_SETTINGS
```

**Sucesso:** o comando retorna em silêncio (nenhuma mensagem = concedido).

**Verificação** (deve mostrar a permissão como `granted=true`):
```bash
"$ADB" shell dumpsys package com.farmerbb.secondscreen.free | grep -A1 WRITE_SECURE
```

**Se falhar** (mensagem de erro tipo "not allowed to grant"): anote a mensagem
exata e me mande. Em algumas fabricantes é preciso destravar uma opção nas
Opções do desenvolvedor (casos documentados são Xiaomi/OnePlus; em Samsung não
é esperado, mas é exatamente o tipo de coisa que o teste existe para revelar).

---

## Passo 3 — Criar o perfil de teste (3 min)

No SecondScreen, crie um novo perfil:

- **Nome:** `Modo TV teste`
- **Resolution:** `1920x1080` — **comece pelo Full HD**, que é o mais seguro.
  (Depois, se quiser, repita com `2560x1440` para casar com seu monitor 2K.)
- **⚠ NÃO use 4K.** Lição já aprendida: resolução maior que a tela encolhe a
  imagem para o centro.
- **Density:** pode deixar a sugestão automática do app (ele pareia a
  densidade com a resolução — algo que, aliás, o DexArmor hoje não faz e que
  melhora a legibilidade na TV).
- Demais opções do perfil: deixe no padrão nesta primeira rodada (menos
  variáveis = diagnóstico mais claro).

---

## Passo 4 — O teste central (testa H2) — SEM CABO

**Desconecte o cabo USB do Mac.** Isso é essencial: prova que não há shell nem
PC envolvido no que vem agora.

1. No SecondScreen, **ative** o perfil `Modo TV teste`.
   - ✔ Esperado: a tela do celular muda para 1080p (a interface fica visivelmente
     diferente/mais "larga" nos elementos). Pode aparecer uma notificação do
     perfil ativo.
2. Use o celular por um minuto: abra apps, navegue. A interface está utilizável?
3. **Desative** o perfil (pela notificação ou pelo app).
   - ✔ Esperado: volta ao normal (2340x1080 nativo).
4. *(Opcional, mas é o cenário real)*: com o perfil ativo, conecte no HDMI do
   monitor 2K e veja se a imagem preenche melhor que antes.

**Se a resolução NÃO mudar** ao ativar: anote se o app deu alguma mensagem de
erro. Isso significaria que o One UI ignora o `display_size_forced` — a
resolução precisaria de Shizuku, mas o resto do toggle continua viável.

---

## Passo 5 — Teste de persistência (testa H3) — SEM CABO

1. **Reinicie o celular** (reboot completo).
2. Após ligar, **sem conectar o cabo**, abra o SecondScreen.
3. **Ative e desative** o perfil de novo.

- ✔ Se funcionar: **H1 + H3 confirmadas.** A permissão sobreviveu ao reboot e
  o toggle funciona sem PC — que é a essência da sua ideia.
- ✘ Se o app reclamar de permissão após o reboot: anote a mensagem (seria um
  comportamento atípico do One UI — a concessão via `pm grant` normalmente é
  permanente).

---

## Passo 6 (opcional) — Validar as demais chaves via app

As outras configurações do modo (rotação, navegação por gestos, timeout) usam
chaves que o DexArmor já escreve com sucesso via shell; o risco de um app com
permissão não conseguir o mesmo é baixo. Se quiser fechar 100%, o validador é
o **Tasker** (tem trial):

```bash
"$ADB" shell pm grant net.dinglisch.android.taskerm android.permission.WRITE_SECURE_SETTINGS
```

No Tasker, criar uma tarefa com a ação **Custom Setting**:
- `Secure` / `navigation_mode` / valor `2` (gestos) — executar — depois valor
  `0` (botões) — executar. A barra de navegação deve alternar na hora.

Se preferir pular este passo, sem problema — o veredito principal vem dos
passos 2, 4 e 5.

---

## Como desfazer tudo ao final

```bash
# Se algo ficar estranho na tela (com cabo):
"$ADB" shell wm size reset
"$ADB" shell wm density reset

# Revogar as permissões concedidas:
"$ADB" shell pm revoke com.farmerbb.secondscreen.free android.permission.WRITE_SECURE_SETTINGS
"$ADB" shell pm revoke net.dinglisch.android.taskerm android.permission.WRITE_SECURE_SETTINGS
```

E desinstale os apps de teste normalmente. Nada disso deixa resíduo.

> **Emergência:** se em algum momento a tela ficar inutilizável, conecte o
> cabo e rode os dois `reset` acima — resolve na hora, como você já viu.

---

## Tabela de resultados (preencha e me mande)

| # | Teste | Resultado esperado | O que aconteceu |
|---|-------|--------------------|------------------|
| 2 | `pm grant` no One UI | concede sem erro | |
| 4a | Ativar perfil (sem cabo) | tela vira 1080p | |
| 4b | Interface utilizável em 1080p | sim, sem glitches graves | |
| 4c | Desativar perfil | volta ao nativo | |
| 5 | Após reboot, sem cabo | perfil ainda alterna | |
| 6 | (opcional) Tasker muda navigation_mode | barra alterna | |

---

## Interpretação dos resultados

- **Tudo ✔** → O caminho sem-Shizuku está validado no One UI. O companion
  "DexArmor Mobile" é viável com fricção zero; a próxima conversa é o escopo
  dele (quais toggles, visual, como o DexArmor o instala e autoriza).
- **Falha no passo 2** → O One UI bloqueia a concessão. Investigamos a opção
  de desenvolvedor equivalente; se não houver, o caminho vira Shizuku
  (fork com auto-start) — mais fricção de setup, mesmo resultado final.
- **Falha no passo 4** → A resolução via settings não é confiável no One UI.
  O toggle continua viável para todo o resto (rotação, navegação, timeout,
  sons); só a resolução exigiria Shizuku ou ficaria fixa (configurada uma vez
  pelo DexArmor).
- **Falha no passo 5** → Permissão não persistiu (muito improvável). Seria um
  comportamento específico do One UI a investigar antes de qualquer decisão.

Qualquer resultado — inclusive falha — é informação valiosa: define a
arquitetura do companion **antes** de investirmos no desenvolvimento dele.
