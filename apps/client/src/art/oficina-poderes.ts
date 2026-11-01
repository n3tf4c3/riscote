import { INK, WHITE, line, outlined, shine, svgDoc } from './svg';

// Perigos da Oficina Mágica (2026-11-01): o parafuso que desliza pelo chão e a broca que sobe reto.
// A parede da oficina é papel kraft (bege-castanho), então o metal é aço mais escuro que a parede,
// sempre com contorno marinho firme, cara brava e um detalhe de cor saturada (a haste da broca),
// para ler como perigo e não como enfeite. Nada de magenta, violeta saturado nem o azul da tinta dos
// jogadores. Quadro de 48 unidades (`-24 -24 48 48`) com o desenho centrado em (0, 0), que é onde o
// jogo o põe.

const VB = '-24 -24 48 48';

/** Espessura de contorno para ~0,9 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.9 / k).toFixed(2);

/** Traço de grafite da Lapiseira (o jogo pinta o traçado do chefe com ele): cinza de lápis, mais claro e neutro que o marinho. */
export const GRAFITE = '#565b66';
/** Metal do compasso e das peças (o jogo pinta o braço do compasso com as duas). */
export const METAL = '#c3c9d3';
export const METAL_SOMBRA = '#8a929f';

const ACO = '#9aa4b2';
const ACO_SOMBRA = '#6b7585';
const ACO_LUZ = '#dfe4ec';
/** Haste da broca: laranja saturado, que salta do kraft. */
const HASTE = '#ff7a1f';
const HASTE_SOMBRA = '#c4520f';

// ---------------------------------------------------------------- parafuso deslizando

const PARAFUSO_LW = lw(0.3);

/**
 * Parafuso deitado, com a ponta para a direita (o jogo espelha): cabeça abaulada grande à esquerda,
 * com a fenda e uma cara brava, e a rosca em dentes até a ponta. Centro em (0, 0).
 */
export function parafusoSvg(variant = 0): string {
  const w = PARAFUSO_LW;
  // Haste com os dentes da rosca por cima e por baixo, afinando até a ponta.
  const haste =
    'M-4 -6 L-1.5 -8.4 L1 -5.6 L3.5 -7.8 L6 -5 L8.5 -7 L11 -4.4 L13.5 -6 L16 -3.6 L23 0 ' +
    'L16 3.6 L13.5 6 L11 4.4 L8.5 7 L6 5 L3.5 7.8 L1 5.6 L-1.5 8.4 L-4 6 Z';
  const dentes = 'M-1.5 -7.6 L1 5 M3.5 -7 L6 4.4 M8.5 -6.2 L11 3.8 M13.5 -5.2 L16 3';
  return svgDoc(
    VB,
    // Riscos de velocidade atrás.
    line('M-23 -4 L-20 -4 M-23 4 L-19 4', 1.6) +
      outlined(haste, ACO, w) +
      `<path d="M-4 3 L16 2.4 L22 0.4 L15 4 L-4 6 Z" fill="${ACO_SOMBRA}" opacity="0.8"/>` +
      line(dentes, 1.4, ACO_SOMBRA) +
      outlined(haste, 'none', w) +
      // Cabeça abaulada, vista de lado.
      outlined('M-4 -13 Q-4 -15 -6 -15 Q-19 -14 -19 0 Q-19 14 -6 15 Q-4 15 -4 13 Z', ACO, w) +
      `<path d="M-18 4 Q-16 13 -6 13 L-6 4 Z" fill="${ACO_SOMBRA}"/>` +
      outlined('M-4 -13 Q-4 -15 -6 -15 Q-19 -14 -19 0 Q-19 14 -6 15 Q-4 15 -4 13 Z', 'none', w) +
      // Fenda da cabeça.
      line('M-19 0 L-15 0', 2.4) +
      shine('M-15 -9 Q-12 -12 -8 -12.5', 2, 0.95) +
      // Cara brava na cabeça.
      `<ellipse cx="-12.5" cy="-4" rx="3" ry="3.6" fill="${WHITE}" stroke="${INK}" stroke-width="1.4"/>` +
      `<ellipse cx="-7.5" cy="-4.2" rx="2.6" ry="3.4" fill="${WHITE}" stroke="${INK}" stroke-width="1.4"/>` +
      `<circle cx="-11.6" cy="-3.4" r="1.6" fill="${INK}"/><circle cx="-6.8" cy="-3.6" r="1.5" fill="${INK}"/>` +
      line('M-16 -9.6 L-10.5 -7.4 M-4.6 -9.4 L-9 -7.4', 2) +
      line('M-13.5 6 Q-10 3.6 -6.5 6', 1.8) +
      shine('M2 -6 L12 -4.6', 1.4, 0.8) +
      `<path d="M2 -5.6 L13 -4" stroke="${ACO_LUZ}" stroke-width="0.8" fill="none"/>`,
    variant,
  );
}

// ---------------------------------------------------------------- broca subindo

const BROCA_LW = lw(0.3);

/**
 * Broca subindo reto, com a ponta para cima: corpo de aço com os sulcos em espiral, a haste lisa
 * laranja embaixo, olhos bravos no corpo e riscos de velocidade abaixo. Centro em (0, 0).
 */
export function brocaSvg(variant = 0): string {
  const w = BROCA_LW;
  const corpo = 'M0 -23 L7 -14 L7 6 L-7 6 L-7 -14 Z';
  // Sulcos da espiral: faixas inclinadas de sombra recortadas pelo corpo.
  let sulcos = '';
  for (let y = -16; y <= 4; y += 6.5) sulcos += `<path d="M-9 ${y + 3} L9 ${y - 3} L9 ${y + 0.4} L-9 ${y + 6.4} Z" fill="${ACO_SOMBRA}"/>`;
  return svgDoc(
    VB,
    // Riscos de velocidade embaixo.
    line('M-4 21 L-4 24 M4 20 L4 24', 1.6) +
      // Haste laranja.
      outlined('M-5.5 5 L5.5 5 L5.5 17 Q5.5 19 3.5 19 L-3.5 19 Q-5.5 19 -5.5 17 Z', HASTE, w) +
      `<path d="M1.5 6.5 L4 6.5 L4 17.5 L1.5 17.5 Z" fill="${HASTE_SOMBRA}"/>` +
      outlined('M-5.5 5 L5.5 5 L5.5 17 Q5.5 19 3.5 19 L-3.5 19 Q-5.5 19 -5.5 17 Z', 'none', w) +
      shine('M-3.4 8 L-3.4 16', 1.4, 0.8) +
      // Corpo com a espiral.
      `<clipPath id="op-broca"><path d="${corpo}"/></clipPath>` +
      `<path d="${corpo}" fill="${ACO}"/>` +
      `<g clip-path="url(#op-broca)">${sulcos}` +
      line('M-9 -9 L9 -15 M-9 -2.5 L9 -8.5 M-9 4 L9 -2', 1, ACO_LUZ) +
      `</g>` +
      `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      // Gume da ponta.
      line('M0 -23 L0 -17', 1.2) +
      // Olhos bravos.
      `<ellipse cx="-3" cy="-6" rx="2.8" ry="3.3" fill="${WHITE}" stroke="${INK}" stroke-width="1.3"/>` +
      `<ellipse cx="3" cy="-6" rx="2.8" ry="3.3" fill="${WHITE}" stroke="${INK}" stroke-width="1.3"/>` +
      `<circle cx="-2.6" cy="-6.6" r="1.4" fill="${INK}"/><circle cx="3.4" cy="-6.6" r="1.4" fill="${INK}"/>` +
      line('M-6.4 -11 L-1 -9.2 M6.4 -11 L1 -9.2', 1.8) +
      line('M-2.6 0.4 L2.6 0.4', 1.6),
    variant,
  );
}
