# Invariantes da ponte de modos

As leis que o DexArmor **nunca** pode violar. Cada uma tem um **guardião** no
código — o mecanismo que a mantém. Violá-las é a raiz dos bugs "torto para
sempre" (o caso S21 FE de 21/07/2026 foi uma violação da lei 2). Toda mudança
na ponte deve preservar estas leis.

| # | Lei | Guardião no código |
|---|-----|--------------------|
| 1 | `entry.revert` (o estado ORIGINAL do aparelho) é **imutável** após a primeira captura. O merge só pode ser **aditivo** — nunca sobrescreve um valor já capturado. | `mergeRevert` (`revertStore.js`) + checagem viva `revertDropped` em `addEntry` (anota `invariante-violada: revert-mutado` no diário se algo sumir) |
| 2 | `phoneRevert` (perfil celular vivo) **jamais** contém valores iguais aos do perfil TV da mesma entrada. | Vacina `captureLooksLikeTv` (`runner.js`): captura com "cara de TV" é descartada, cai para o `phoneRevert` anterior ou o estado original |
| 3 | Toda entrada ativa tem caminho de volta executável: `revert.kind` está na allowlist do `revertEntry`. | `REVERT_KINDS` (`runner.js`) — fonte única da allowlist; o import valida contra ela |
| 4 | **Uma** troca por aparelho por vez. | Lock `activeSwitches` (`main.js`): `switchOne` e `screen:rotate` sob `withSwitchLock`; concorrente vira obstáculo `busy` |
| 5 | Argumento de comando ADB é **sempre array**; nunca string interpolada em shell do host. | `execFile`/`spawn` sempre com array (`adb.js`); shell do aparelho usa `shellQuote`. Auditoria A12: sem montagem por string no host |
| 6 | Escrita do registro é **sempre atômica** e o backup bom nunca é perdido. | `write` (`revertStore.js`): `.tmp` → `rename`; só faz `.bak` do principal se ele estiver íntegro; `read` recupera do `.bak` e anota no diário |

## Como uma violação se denuncia

As checagens vivas **nunca dão crash** — anotam no diário (`appendJournal`) e
seguem. Procure no diário do aparelho (seção Manutenção) por:

- `invariante-violada: revert-mutado` — o merge perdeu um valor original (lei 1).
- `captura-descartada` — a vacina barrou uma captura com cara de TV (lei 2).
- `registro-recuperado-do-backup` — o arquivo principal corrompeu e o `.bak`
  salvou (lei 6).
- `retry-transitorio` — o canal ADB oscilou e uma tentativa foi refeita (sinal
  de cabo degradando).
- `fingerprint-pos-troca` — a conferência completa de cada troca.
</content>
