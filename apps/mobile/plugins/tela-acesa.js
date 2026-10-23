// Tela acesa enquanto o jogo está na frente: a flag vai na janela da Activity, no onCreate, antes de o
// JavaScript subir. O useKeepAwake ligava a mesma flag pelo JS uma vez só, e uma falha nessa chamada
// era engolida em silêncio (no aparelho, a tela desligava no meio da partida).
const { withMainActivity } = require('expo/config-plugins');

const MARK = '// riscote: tela acesa';
const SUPER = 'super.onCreate(null)';

module.exports = function withTelaAcesa(config) {
  return withMainActivity(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;
    if (!src.includes(SUPER)) throw new Error(`tela-acesa: MainActivity sem "${SUPER}"`);
    cfg.modResults.contents = src.replace(
      SUPER,
      `${SUPER}\n    ${MARK}\n    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)`,
    );
    return cfg;
  });
};
