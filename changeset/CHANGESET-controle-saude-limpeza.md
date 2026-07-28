# Changeset — Controle remoto virtual, painel de saúde e limpeza com um clique

Três funções de uso diário que reforçam o DexArmor como "central de controle
do dispositivo de TV". Nenhuma delas altera configurações do aparelho de
forma persistente — por isso NENHUMA entra no registro de reversão:

1. **Controle remoto virtual** — o computador vira o controle do TV-celular.
   Teclas via `adb shell input keyevent`, por USB ou Wi-Fi. Elimina pegar o
   celular na mão; casa com o espelhamento (scrcpy) já existente.
2. **Painel de saúde** — bateria (nível, carga, temperatura) e armazenamento
   livre com alertas em linguagem simples. Só leitura (`dumpsys battery` +
   `df /data`). Essencial para um aparelho 24h na tomada; complementa a
   proteção de carga a 85%.
3. **Limpeza com um clique** — `pm trim-caches` libera os arquivos
   temporários de todos os apps (streamings incham com o tempo). Não
   destrutivo por natureza: nenhum dado/login é apagado, os apps recriam o
   cache. Reporta quanto foi liberado (mede o espaço antes/depois).

**3 arquivos novos, 4 editados.** Nada de bibliotecas novas.

---

## Interface (princípios: usuário leigo + continuidade)

- **Lateral direita** ganhou as caixas de acompanhamento, acima do progresso:
  "Saúde do aparelho" (atualiza sozinha a cada 30 s; pausa durante execuções)
  e "Liberar espaço" (botão com "?" explicando que só cache é removido).
  Alertas curtos e acionáveis: muito quente → ventilação; fora da tomada →
  ligue o carregador; armazenamento cheio → aponta para a limpeza logo
  abaixo.
- **Controle remoto** flutua no canto inferior direito, em grade estilo
  calculadora (3 colunas): Voltar/▲/Início, ◀/OK/▶, Vol−/▼/Vol+, e
  Play-Pausa em botão largo. Em repouso fica com **opacidade 35%**; ao passar
  o mouse (ou focar por teclado, `:focus-within`) aparece por inteiro — um
  controle de console largado no canto da ferramenta. Tooltips em todos os
  botões. Só aparece com aparelho conectado; desabilita durante execuções
  (uma tecla no meio de uma instalação atrapalharia a task).

## Arquivos NOVOS

- `src/renderer/components/RemoteControl.jsx`
- `src/renderer/components/HealthPanel.jsx`
- `src/renderer/components/CleanupPanel.jsx`

## Arquivos EDITADOS — resumo

### `src/adb/adb.js`
- `sendKeyEvent(serial, keycode)` — `input keyevent`.
- `getBatteryHealth(serial)` + parser puro `parseBatteryDump(out)` exportado
  para testes (temperatura vem em décimos de °C; status 2 = carregando,
  5 = cheia; "plugged" = qualquer fonte AC/USB/Wireless).
- `getStorageInfo(serial)` + parser puro `parseDf(out)` (df /data, blocos de
  1K; saídas inválidas viram nulls sem exceção).
- `trimCaches(serial, desired='512G')` — valor alto = "limpe o máximo".

### `src/main/main.js`
- `remote:key` com **allowlist** nome→keycode (back 4, home 3, dpad 19-23,
  vol 24/25, mute 164, play_pause 85): o renderer nunca envia códigos
  arbitrários ao shell.
- `health:get` — bateria + armazenamento em paralelo.
- `clean:caches` — mede antes/depois e devolve `freedBytes`.

### `src/main/preload.js`
- Expostos: `sendRemoteKey`, `getHealth`, `cleanCaches`.

### `src/renderer/App.jsx`
- Lateral direita virou coluna flexível: HealthPanel + CleanupPanel +
  ProgressPanel (progresso ocupa o restante e rola internamente).
- `healthTick`: a limpeza força a releitura imediata do painel de saúde.
- `<RemoteControl>` renderizado fora das colunas (position: fixed).

## Como testar

- Parsers: teste com saídas reais de `dumpsys battery` e `df` (13
  verificações, rodado em 07/07/2026 — todos passando; inclui saídas
  inválidas/aparelhos estranhos sem quebrar).
- Manual: conectar o Galaxy → painel de saúde preenche em segundos e
  reatualiza a cada 30 s; "Liberar espaço" reporta o resultado; controle
  remoto navega o launcher de TV (setas/OK/voltar), volume muda na hora e
  play/pausa funciona num streaming aberto. Testar também por Wi-Fi.
