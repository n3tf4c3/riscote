import { INK, WHITE, line, outlined, shine, svgDoc } from './svg';

// Perigos dos bichos do Jardim das Lanternas (2026-11-01): a bolha de sabão que o sapo sopra e que
// persegue devagar, a gota de orvalho que rola pelo chão e a gotinha de chuva que o guarda-chuva
// atira. O céu do jardim é ardósia, malva, rosa antigo e coral, e as lanternas são pálidas, então a
// água é verde-água saturada (o complemento do coral), sempre com contorno marinho firme e cara
// brava, para ler como perigo e não como item. Nada de magenta, violeta saturado nem o azul da tinta
// dos jogadores. Quadro de 48 unidades (`-24 -24 48 48`) com o desenho centrado em (0, 0), que é
// onde o jogo o põe.

const VB = '-24 -24 48 48';

/** Espessura de contorno para ~0,9 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.9 / k).toFixed(2);

/** Água do jardim (o jogo pinta o gêiser e a enxurrada do chefe com as mesmas cores). */
export const AGUA = '#2fbfb2';
export const AGUA_SOMBRA = '#1b8a8c';
export const ESPUMA = '#e8fbf4';
const AGUA_CLARA = '#9fe9df';

// Reflexos da bolha: pêssego, amarelo e menta (sem magenta nem violeta).
const BOLHA = '#d6f6f1';
const BOLHA_PESSEGO = '#ffb59a';
const BOLHA_AMARELO = '#ffd75a';
const BOLHA_MENTA = '#6fdcc4';
const LINGUA = '#ff7b8a';

// ---------------------------------------------------------------- bolha de sabão

const BOLHA_LW = lw(0.36);

/**
 * Bolha de sabão do sapo: esfera clara (r 19) com as faixas de reflexo pêssego, amarelo e menta por
 * dentro da borda, o brilho em janela no alto e uma cara de deboche (um olho piscando e a língua de
 * fora), para ler como perigo. Centro em (0, 0).
 */
export function bolhaSvg(variant = 0): string {
  const w = BOLHA_LW;
  return svgDoc(
    VB,
    `<clipPath id="jp-bolha"><circle cx="0" cy="0" r="19"/></clipPath>` +
      `<circle cx="0" cy="0" r="19" fill="${BOLHA}"/>` +
      `<g clip-path="url(#jp-bolha)">` +
      // Reflexos furta-cor colados na borda.
      `<path d="M-19 4 Q-14 16 0 19 Q14 18 19 8" fill="none" stroke="${BOLHA_PESSEGO}" stroke-width="5"/>` +
      `<path d="M-19 4 Q-14 16 0 19 Q14 18 19 8" fill="none" stroke="${BOLHA_AMARELO}" stroke-width="2.4" transform="translate(0 -4)"/>` +
      `<path d="M8 -19 Q19 -12 19 4" fill="none" stroke="${BOLHA_MENTA}" stroke-width="5"/>` +
      `</g>` +
      `<circle cx="0" cy="0" r="19" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
      // Brilho de janela.
      shine('M-13 -6 Q-12 -13 -5 -15', 3, 0.95) +
      `<circle cx="-14" cy="-1" r="1.6" fill="${WHITE}"/>` +
      // Cara de deboche: olho aberto, olho piscando, sorriso com a língua de fora.
      `<ellipse cx="-4.5" cy="-2" rx="4" ry="4.6" fill="${WHITE}" stroke="${INK}" stroke-width="1.6"/>` +
      `<circle cx="-3.4" cy="-1.4" r="2.2" fill="${INK}"/>` +
      line('M3 -2 Q6.5 -5.5 10 -2', 2.2) +
      line('M-9.5 -8.5 L-1.5 -7.2 M2.5 -7.8 L10 -9.8', 2) +
      `<path d="M-6 5 Q1 10.5 9 4.5" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      outlined('M2 7 Q2.5 12.5 6 12 Q9 11 7.5 5.6 Z', LINGUA, 1.4),
    variant,
  );
}

// ---------------------------------------------------------------- gota de orvalho rolando

const ORVALHO_LW = lw(0.3);

/**
 * Gota de orvalho que rola pelo chão: bola de água verde-água (r 17), quase redonda (o jogo a gira),
 * com a barriga de sombra, o brilho grande e uma cara brava de dentes cerrados. Centro em (0, 0).
 */
export function orvalhoSvg(variant = 0): string {
  const w = ORVALHO_LW;
  const corpo = 'M0 -18 Q10 -17 15 -9 Q18 -3 17 4 A17 17 0 1 1 -17 2 Q-16 -10 0 -18 Z';
  return svgDoc(
    VB,
    `<clipPath id="jp-orvalho"><path d="${corpo}"/></clipPath>` +
      `<path d="${corpo}" fill="${AGUA}"/>` +
      `<g clip-path="url(#jp-orvalho)">` +
      `<path d="M-20 8 Q0 15 20 6 L20 22 L-20 22 Z" fill="${AGUA_SOMBRA}"/>` +
      // Reflexo claro do céu no lado de cima, como numa gota de verdade.
      `<path d="M4 -16 Q14 -12 16 -2" fill="none" stroke="${AGUA_CLARA}" stroke-width="3.5" stroke-linecap="round"/>` +
      `</g>` +
      `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M-12 -7 Q-9 -14 -2 -15', 3.4, 0.95) +
      `<circle cx="-13" cy="-1" r="1.8" fill="${WHITE}"/>` +
      // Cara brava.
      `<ellipse cx="-4.5" cy="-1" rx="4" ry="4.6" fill="${WHITE}" stroke="${INK}" stroke-width="1.6"/>` +
      `<ellipse cx="5.5" cy="-1.2" rx="4" ry="4.6" fill="${WHITE}" stroke="${INK}" stroke-width="1.6"/>` +
      `<circle cx="-3.4" cy="0" r="2.2" fill="${INK}"/><circle cx="6.6" cy="-0.2" r="2.2" fill="${INK}"/>` +
      line('M-10 -8 L-1.5 -4.6 M11 -8.2 L2.5 -4.8', 2.6) +
      outlined('M-5 6 Q1 4.5 7 6 L6.4 10 Q1 11 -4.4 10 Z', WHITE, 1.4) +
      line('M-1.5 5.3 L-1.6 10.4 M2.5 5.2 L2.4 10.4 M-4.8 8 Q1 7.4 6.8 8', 1),
    variant,
  );
}

// ---------------------------------------------------------------- gotinha do guarda-chuva

const GOTINHA_LW = lw(0.3);

/**
 * Gotinha de chuva que o guarda-chuva atira: gota verde-água com a ponta para cima (o jogo pode
 * girá-la), corpo de ~26 unidades, brilho, espuma clara na ponta e dois olhinhos bravos. Centro em (0, 0).
 */
export function gotinhaSvg(variant = 0): string {
  const w = GOTINHA_LW;
  const corpo = 'M0 -19 Q5 -8 11 1 A11.5 11.5 0 1 1 -11 1 Q-5 -8 0 -19 Z';
  return svgDoc(
    VB,
    `<g transform="translate(0 2)">` +
      `<clipPath id="jp-gotinha"><path d="${corpo}"/></clipPath>` +
      `<path d="${corpo}" fill="${AGUA}"/>` +
      `<g clip-path="url(#jp-gotinha)">` +
      `<path d="M-14 7 Q0 13 14 6 L14 16 L-14 16 Z" fill="${AGUA_SOMBRA}"/>` +
      `<path d="M0 -19 Q3 -12 5 -9 Q0 -7 -5 -9 Q-3 -12 0 -19 Z" fill="${ESPUMA}"/>` +
      `</g>` +
      `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M-6.5 -2 Q-7.5 3 -5 7', 2.6, 0.9) +
      `<circle cx="-3" cy="3.4" r="2.4" fill="${WHITE}" stroke="${INK}" stroke-width="1.2"/>` +
      `<circle cx="4" cy="3.2" r="2.4" fill="${WHITE}" stroke="${INK}" stroke-width="1.2"/>` +
      `<circle cx="-2.4" cy="3.9" r="1.2" fill="${INK}"/><circle cx="4.6" cy="3.7" r="1.2" fill="${INK}"/>` +
      line('M-6.4 -0.8 L-0.8 1 M7.6 -1 L2 0.9', 1.8) +
      line('M-1.5 8.6 Q1 7.2 3.5 8.6', 1.4) +
      `</g>`,
    variant,
  );
}
