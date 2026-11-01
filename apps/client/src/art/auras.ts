import { INK, PALETTE, WHITE, svgDoc } from './svg';

// Auras do riscote em cartum, desenhadas atrás do boneco: a invencibilidade do item é um halo dourado
// chapado com contorno, raios e estrelinhas; a proteção do modo fácil, uma bolha na cor do jogador
// com reflexo branco. Centro do quadro em (0, 0) = centro do corpo.

const VB = '-62 -82 124 164';
const GOLD = PALETTE.amarelo;
const GOLD_LIGHT = '#fff1b8';
const LW = 2.6;

/** Estrela de quatro pontas em (x, y), de raio `r`, com contorno. */
function star(x: number, y: number, r: number): string {
  const s = r * 0.3;
  return (
    `<path d="M${x} ${y - r} Q${x + s} ${y - s} ${x + r} ${y} Q${x + s} ${y + s} ${x} ${y + r} Q${x - s} ${y + s} ${x - r} ${y} Q${x - s} ${y - s} ${x} ${y - r} Z" ` +
    `fill="${GOLD_LIGHT}" stroke="${INK}" stroke-width="${LW * 0.8}" stroke-linejoin="round"/>`
  );
}

/** Anel de elipse com contorno dos dois lados: marinho por baixo, cor por cima. */
function ring(rx: number, ry: number, color: string, width: number, extra = ''): string {
  return (
    `<ellipse rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="${width + LW * 2}"${extra}/>` +
    `<ellipse rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="${width}"${extra}/>`
  );
}

/** Invencível: brilho dourado claro, anel amarelo grosso com contorno, raios curtos e estrelinhas. */
export function auraEstrelaSvg(variant = 0): string {
  let rays = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const r0 = 1.08;
    const r1 = 1.2 + (i % 2) * 0.08;
    const d = `M${(c * 46 * r0).toFixed(1)} ${(s * 66 * r0).toFixed(1)} L${(c * 46 * r1).toFixed(1)} ${(s * 66 * r1).toFixed(1)}`;
    rays += `<path d="${d}" stroke="${INK}" stroke-width="${5 + LW * 2}" stroke-linecap="round"/><path d="${d}" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>`;
  }
  return svgDoc(
    VB,
    `<ellipse rx="44" ry="64" fill="${GOLD_LIGHT}" opacity="0.4"/>` +
      rays +
      ring(44, 64, GOLD, 6) +
      `<path d="M-30 -46 Q-40 -30 -41 -10" stroke="${WHITE}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.9"/>` +
      star(-38, -50, 10) +
      star(42, -24, 8) +
      star(36, 54, 9) +
      star(-44, 34, 7),
    variant,
  );
}

/** Proteção do modo fácil: bolha na cor do jogador (`from`), com miolo claro (`to`) e reflexo branco. */
export function auraProtecaoSvg(from: string, to: string, variant = 0): string {
  return svgDoc(
    VB,
    `<ellipse rx="44" ry="64" fill="${to}" opacity="0.3"/>` +
      ring(44, 64, from, 4, ' opacity="0.95"') +
      `<path d="M-28 -50 Q-38 -36 -40 -16" stroke="${WHITE}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.95"/>` +
      `<circle cx="-24" cy="-58" r="3" fill="${WHITE}" opacity="0.9"/>`,
    variant,
  );
}
