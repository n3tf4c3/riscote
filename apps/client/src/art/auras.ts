import { PAPER, gradient, stroke, svgDoc } from './svg';

// Auras do riscote, desenhadas atrás do boneco (o corpo de nanquim fica sempre na frente):
// a invencibilidade do item é um halo dourado de pincel seco; a proteção do modo fácil, uma bolha
// esboçada na cor do jogador. Centro do quadro em (0, 0) = centro do corpo.

const VB = '-62 -82 124 164';
const GOLD = '#f6c23a';
const GOLD_DARK = '#c47a10';

/** Estrela de quatro pontas em (x, y), de raio `r`. */
function star(x: number, y: number, r: number): string {
  const s = r * 0.32;
  return (
    `<path d="M${x} ${y - r} Q${x + s} ${y - s} ${x + r} ${y} Q${x + s} ${y + s} ${x} ${y + r} Q${x - s} ${y + s} ${x - r} ${y} Q${x - s} ${y - s} ${x} ${y - r} Z" ` +
    `fill="#fff4c0" stroke="${GOLD_DARK}" stroke-width="1.6" stroke-linejoin="round" filter="url(#tinta)"/>`
  );
}

/**
 * Invencível: aguada dourada clara, anel de pincel seco em degradê de amarelo a laranja-ouro,
 * um segundo traço tracejado por fora, raios curtos em volta e estrelinhas no anel.
 */
export function auraEstrelaSvg(variant = 0): string {
  let rays = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * 50;
    const y = Math.sin(a) * 70;
    // A pincelada aponta para fora do anel (rotação 0 = para baixo).
    const rot = (Math.atan2(y, x) * 180) / Math.PI - 90;
    rays += stroke(x, y, rot, 0.9, 0.1 + (i % 3) * 0.03, 'url(#ouro)', 'seco');
  }
  return svgDoc(
    VB,
    gradient('ouro', '#fff07a', '#f59a1a', 60) +
      `<ellipse rx="40" ry="60" fill="#ffe58a" opacity="0.32" filter="url(#borra)"/>` +
      `<ellipse rx="44" ry="64" fill="none" stroke="url(#ouro)" stroke-width="8" filter="url(#seco)"/>` +
      `<ellipse rx="44" ry="64" fill="none" stroke="url(#ouro)" stroke-width="3" filter="url(#tinta)" opacity="0.9"/>` +
      `<ellipse rx="49" ry="69" fill="none" stroke="${GOLD}" stroke-width="2" stroke-dasharray="14 9" stroke-linecap="round" filter="url(#tinta)" opacity="0.8"/>` +
      rays +
      `<path d="M-30 -48 Q-40 -30 -41 -8" stroke="${PAPER}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.7"/>` +
      star(-38, -50, 9) +
      star(42, -26, 7) +
      star(36, 52, 8) +
      star(-44, 34, 6),
    variant,
  );
}

/**
 * Proteção do modo fácil: bolha de dois traços esboçados no degradê do jogador (`from` → `to`),
 * com uma aguada leve da mesma cor e o reflexo de papel no alto. Some no primeiro toque.
 */
export function auraProtecaoSvg(from: string, to: string, variant = 0): string {
  return svgDoc(
    VB,
    gradient('cor', from, to, 60) +
      `<ellipse rx="40" ry="60" fill="url(#cor)" opacity="0.16" filter="url(#borra)"/>` +
      `<ellipse rx="42" ry="62" fill="none" stroke="url(#cor)" stroke-width="4.5" filter="url(#tinta)"/>` +
      `<ellipse rx="45" ry="64" fill="none" stroke="url(#cor)" stroke-width="2" filter="url(#seco)" opacity="0.8" transform="rotate(5)"/>` +
      `<path d="M-28 -50 Q-38 -36 -40 -16" stroke="${PAPER}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85"/>` +
      `<path d="M-20 -57 Q-14 -60 -8 -61" stroke="${PAPER}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>`,
    variant,
  );
}
