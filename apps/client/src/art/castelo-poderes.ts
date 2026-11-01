import { INK, WHITE, line, outlined, shine, svgDoc } from './svg';

// Perigos dos bichos do Castelo das Nuvens (2026-11-01): a nota musical que a corneta de papel
// sopra, o estilhaço do balão de origami que estoura, a estrela dobrada que o móbile atira e a flecha
// de papel que o bicho da torre deixa cair. O céu é um amanhecer (azul claro só no alto, lilás, rosa,
// pêssego e dourado) e as nuvens jogáveis são brancas, então os perigos são de papel recortado em cor
// de festa saturada (verde-esmeralda, laranja, ouro e vermelho), sempre com contorno marinho firme e
// cara brava, para ler como perigo e não como enfeite. Nada de magenta, violeta saturado, branco,
// azul claro do céu nem o azul da tinta dos jogadores. Quadro de 48 unidades (`-24 -24 48 48`) com o
// desenho centrado em (0, 0), que é onde o jogo o põe.

const VB = '-24 -24 48 48';

/** Espessura de contorno para ~0,9 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.9 / k).toFixed(2);

/** Anel de vento do redemoinho do Dragão-Pipa (o jogo pinta com Graphics): menta com sombra verde. */
export const VENTO = '#5fd3a8';
export const VENTO_SOMBRA = '#2a9677';

const NOTA = '#18a680';
const NOTA_SOMBRA = '#0f7a5e';
const NOTA_LUZ = '#7fe0bf';
const LASCA = '#ff7a2f';
const LASCA_SOMBRA = '#c9521a';
const LASCA_LUZ = '#ffc08a';
const OURO = '#ffc234';
const OURO_SOMBRA = '#d98a1c';
const OURO_LUZ = '#ffe58a';
const FLECHA = '#e23d3a';
const FLECHA_SOMBRA = '#a8262c';
const BAMBU = '#d9b46a';
const BAMBU_SOMBRA = '#a8823e';
const BOCA = '#5a1f2c';

// ---------------------------------------------------------------- nota da corneta

const NOTA_LW = lw(0.36);

/**
 * Colcheia de papel recortado: cabeça oval inclinada (com a cara brava), haste e bandeirola dobrada
 * em verde-esmeralda. Centro em (0, 0); ~40 unidades de altura.
 */
export function notaSvg(variant = 0): string {
  const w = NOTA_LW;
  const haste = 'M5 6 L5 -19 L10 -19 L10 4 Z';
  const bandeira = 'M10 -19 Q20 -15 21 -6 Q22 2 16 8 Q18 0 16 -5 Q14 -10 10 -10 Z';
  const cabeca = 'M-16 9 Q-17 0 -6 -3 Q6 -6 10 2 Q13 11 1 16 Q-14 20 -16 9 Z';
  return svgDoc(
    VB,
    outlined(bandeira, NOTA, w) +
      `<path d="M12 -12 Q17 -9 17 -4" fill="none" stroke="${NOTA_SOMBRA}" stroke-width="2.2" stroke-linecap="round"/>` +
      outlined(haste, NOTA, w) +
      line('M7.5 -16 L7.5 -2', 1.6, NOTA_LUZ) +
      `<clipPath id="cp-nota"><path d="${cabeca}"/></clipPath>` +
      `<path d="${cabeca}" fill="${NOTA}"/>` +
      `<g clip-path="url(#cp-nota)"><path d="M-18 10 Q-2 16 14 6 L14 22 L-18 22 Z" fill="${NOTA_SOMBRA}"/></g>` +
      `<path d="${cabeca}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M-12 3 Q-10 -1 -5 -1.5', 2, 0.9) +
      // Cara brava.
      `<ellipse cx="-6" cy="5" rx="3" ry="3.4" fill="${WHITE}" stroke="${INK}" stroke-width="1.3"/>` +
      `<ellipse cx="2" cy="4" rx="3" ry="3.4" fill="${WHITE}" stroke="${INK}" stroke-width="1.3"/>` +
      `<circle cx="-5.2" cy="5.6" r="1.6" fill="${INK}"/><circle cx="2.8" cy="4.6" r="1.6" fill="${INK}"/>` +
      line('M-10 0.5 L-3.6 2.4 M6 -0.6 L0 1.6', 1.6) +
      line('M-5 11.4 Q-1.5 9.4 2 11', 1.4),
    variant,
  );
}

// ---------------------------------------------------------------- estilhaço do balão

const LASCA_LW = lw(0.3);

/**
 * Estilhaço do balão de origami: lasca de papel laranja, pontuda para a direita (o jogo a gira na
 * direção do voo), com a dobra no meio, a beira rasgada atrás e um olho bravo. Centro em (0, 0).
 */
export function estilhacoSvg(variant = 0): string {
  const w = LASCA_LW;
  const corpo = 'M22 0 L-6 -11 L-10 -7 L-15 -9 L-13 -3 L-19 0 L-13 3 L-16 8 L-9 7 L-5 11 Z';
  return svgDoc(
    VB,
    line('M-22 -4 L-18 -4 M-23 3 L-19 3', 1.6) +
      `<clipPath id="cp-lasca"><path d="${corpo}"/></clipPath>` +
      `<path d="${corpo}" fill="${LASCA}"/>` +
      // Metade de baixo na sombra: a dobra do papel.
      `<g clip-path="url(#cp-lasca)"><path d="M24 0 L-22 1 L-22 14 L24 14 Z" fill="${LASCA_SOMBRA}"/></g>` +
      `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      line('M20 0 L-12 0.6', 1.4) +
      shine('M12 -3 L-3 -7.4', 1.8, 0.9) +
      line('M-2 -3.6 L4 -2.8', 1, LASCA_LUZ) +
      `<ellipse cx="2" cy="4" rx="2.8" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1.2"/>` +
      `<circle cx="2.9" cy="4.4" r="1.5" fill="${INK}"/>` +
      line('M-1.4 0.6 L5 2.4', 1.5),
    variant,
  );
}

// ---------------------------------------------------------------- estrela do móbile

const ESTRELA_LW = lw(0.3);

/**
 * Estrela de papel dobrado do móbile: cinco pontas douradas, cada ponta com a metade de sombra (as
 * dobras), o furinho do barbante e a cara brava no meio, equilibrada para girar. Centro em (0, 0).
 */
export function estrelaSvg(variant = 0): string {
  const w = ESTRELA_LW;
  const R = 20;
  const r = 9;
  const pt = (i: number, rr: number) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * rr, Math.sin(a) * rr] as const;
  };
  const f = (v: number) => v.toFixed(1);
  const pontos = Array.from({ length: 10 }, (_, i) => pt(i, i % 2 === 0 ? R : r));
  const contorno = `M${pontos.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
  // Dobras: em cada ponta, a metade da direita fica na sombra.
  let dobras = '';
  for (let i = 0; i < 10; i += 2) {
    const [px, py] = pontos[i]!;
    const [vx, vy] = pontos[(i + 1) % 10]!;
    dobras += `<path d="M0 0 L${f(px)} ${f(py)} L${f(vx)} ${f(vy)} Z" fill="${OURO_SOMBRA}"/>`;
  }
  let vincos = '';
  for (let i = 0; i < 10; i += 2) {
    const [px, py] = pontos[i]!;
    vincos += `M0 0 L${f(px * 0.9)} ${f(py * 0.9)} `;
  }
  return svgDoc(
    VB,
    `<path d="${contorno}" fill="${OURO}"/>` +
      dobras +
      line(vincos, 1, OURO_LUZ) +
      `<path d="${contorno}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      `<circle cx="0" cy="-15" r="1.4" fill="${INK}"/>` +
      // Cara brava num miolo dourado.
      `<circle cx="0" cy="1" r="7.6" fill="${OURO}" stroke="${INK}" stroke-width="1.3"/>` +
      `<ellipse cx="-2.8" cy="0" rx="2.2" ry="2.6" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<ellipse cx="2.8" cy="0" rx="2.2" ry="2.6" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="-2.4" cy="0.5" r="1.2" fill="${INK}"/><circle cx="3.2" cy="0.5" r="1.2" fill="${INK}"/>` +
      line('M-5.4 -3.6 L-1 -2.2 M5.4 -3.6 L1 -2.2', 1.3) +
      outlined('M-2.6 4.4 Q0 3 2.6 4.4 Q0 6.4 -2.6 4.4 Z', BOCA, 0.8),
    variant,
  );
}

// ---------------------------------------------------------------- flecha da torre

const FLECHA_LW = lw(0.36);

/**
 * Flecha de papel caindo com a ponta para baixo: haste de bambu, ponta de papel vermelho dobrado
 * (com a cara brava) e as penas de papel dourado em cima. Centro em (0, 0); ~44 unidades de altura.
 */
export function flechaSvg(variant = 0): string {
  const w = FLECHA_LW;
  const ponta = 'M0 22 L-9 6 L-4 8 L-4 4 L4 4 L4 8 L9 6 Z';
  return svgDoc(
    VB,
    // Riscos de queda.
    line('M-9 -22 L-9 -15 M9 -22 L9 -16', 1.4) +
      // Penas de papel dobrado.
      outlined('M-2 -22 L-9 -20 L-9 -10 L-2 -12 Z', OURO, w * 0.8) +
      outlined('M2 -22 L9 -20 L9 -10 L2 -12 Z', OURO_SOMBRA, w * 0.8) +
      // Haste de bambu com os nós.
      outlined('M-2.2 -23 L2.2 -23 L2.2 6 L-2.2 6 Z', BAMBU, w * 0.8) +
      line('M-2 -6 L2 -6 M-2 -16 L2 -16', 1.2, BAMBU_SOMBRA) +
      `<clipPath id="cp-flecha"><path d="${ponta}"/></clipPath>` +
      `<path d="${ponta}" fill="${FLECHA}"/>` +
      `<g clip-path="url(#cp-flecha)"><path d="M0 2 L12 2 L12 24 L0 24 Z" fill="${FLECHA_SOMBRA}"/></g>` +
      `<path d="${ponta}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      line('M0 6 L0 20', 1, INK) +
      shine('M-5 8 L-2 14', 1.4, 0.9) +
      `<circle cx="-2.6" cy="10" r="1.7" fill="${WHITE}" stroke="${INK}" stroke-width="0.9"/>` +
      `<circle cx="2.6" cy="10" r="1.7" fill="${WHITE}" stroke="${INK}" stroke-width="0.9"/>` +
      `<circle cx="-2.4" cy="10.6" r="0.9" fill="${INK}"/><circle cx="2.4" cy="10.6" r="0.9" fill="${INK}"/>` +
      line('M-4.6 7.2 L-1.2 8.6 M4.6 7.2 L1.2 8.6', 1),
    variant,
  );
}
