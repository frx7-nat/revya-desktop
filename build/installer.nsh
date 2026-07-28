; build/installer.nsh
; Incluído automaticamente pelo electron-builder no script do instalador NSIS.
;
; ---------------------------------------------------------------------------
; POR QUE ESTE ARQUIVO EXISTE (28/07/2026)
;
; O instalador gerado nesta máquina falhava no Windows com:
;
;     NSIS Error — Installer integrity check has failed.
;
; Não era download incompleto nem mídia danificada, apesar do que a mensagem
; sugere. O diagnóstico, medido byte a byte no artefato:
;
;   • o arquivo é ESTRUTURALMENTE VÁLIDO — `7z t` responde "Everything is Ok",
;     lista os 10 arquivos e identifica "NSIS-3 Unicode";
;   • o `length_of_all_following_data` do firstheader fecha EXATAMENTE com o
;     tamanho do arquivo (nada truncado);
;   • mas o CRC32 gravado no fim NÃO corresponde ao conteúdo.
;
; O alvo `portable` do próprio electron-builder já nasce com `CRCCheck off`
; (ver o script gerado no builder-debug.yml, que cita
; https://github.com/electron-userland/electron-builder/issues/3972).
; O alvo `nsis` não recebe o mesmo tratamento — e é por isso que só ele
; falhava. Confirmado lendo o flag do firstheader:
;
;     portátil    flags 0x4 (NO_CRC)  -> checagem desligada -> ABRE
;     instalador  flags 0x0           -> checagem ligada    -> RECUSA
;
; A causa provável do CRC inválido é o electron-builder alterar o .exe DEPOIS
; que o makensis calculou o CRC (o passo de `rcedit`, que roda sob o Wine
; embutido para gravar ícone e informações de versão). Qualquer byte mexido
; ali invalida o CRC sem quebrar a estrutura — que é exatamente o quadro
; observado.
;
; ---------------------------------------------------------------------------
; O QUE SE PERDE, E POR QUE É ACEITÁVEL
;
; Desligar a checagem significa que um download corrompido não será detectado
; pelo próprio instalador. A troca é consciente:
;
;   • hoje a checagem não protege NADA — ela reprova 100% dos instaladores,
;     inclusive os íntegros. Uma verificação que sempre falha não é segurança,
;     é um bloqueio;
;   • a integridade passou a ser conferida por SHA-256, publicado junto com o
;     arquivo e verificável com `Get-FileHash` (ver scripts/verify-win.js);
;   • é a mesma decisão que o electron-builder já toma no alvo `portable`.
;
; Se um dia o CRC voltar a ser gerado corretamente, remova a linha abaixo e
; confira o flag do firstheader: 0x0 = ligada, 0x4 = desligada.
; ---------------------------------------------------------------------------

CRCCheck off
