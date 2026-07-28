// src/renderer/data/contribute.js
// Conteúdo da aba "Contribua com o projeto" (canto inferior esquerdo).
//
// Regra da casa: é um convite, não um pedágio. O programa é gratuito e
// completo sem nenhuma contribuição — nada aqui bloqueia função, aparece
// sozinho ou volta a perguntar. A aba fica discreta no rodapé da coluna
// esquerda e só abre se o usuário clicar.

import pixQr from '../assets/qr/pix.png';
import paypalQr from '../assets/qr/paypal.png';

export const CONTRIBUTE = {
  // Só CHAVES e dados — o texto vive em `src/i18n/*.json`, sob `contribute.*`.
  // Este objeto é constante de módulo: uma frase escrita aqui ficaria congelada
  // no idioma de origem, fora do alcance do seletor.
  tabLabelKey: 'contribute.tabLabel',
  titleKey: 'contribute.title',
  messageKey: 'contribute.message',
  footnoteKey: 'contribute.footnote',

  // Os dois meios de pagamento, nos DOIS idiomas: o Pix cobre o Brasil e o
  // PayPal o resto do mundo — quem escolhe é o usuário, não o locale. (No
  // launcher a tela mostra um QR só, e ali a escolha É por região.)
  //
  // Aqui a imagem é PNG, não QR gerado como no launcher: no diálogo o quadro é
  // MENOR que o arquivo (754px e 418px de origem), então há redução, não
  // ampliação — e reduzir não borra a borda dos módulos.
  qrcodes: [
    { id: 'pix', key: 'contribute.qr.pix', image: pixQr },
    { id: 'paypal', key: 'contribute.qr.paypal', image: paypalQr },
  ],
};
