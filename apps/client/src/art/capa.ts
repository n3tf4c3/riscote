import { INK, PALETTE, WHITE, eye, line, outlined, oval, shadowFilter, shine, svgDoc } from './svg';

// Arte da capa (tela de entrada) em cartum: logotipo num chip marinho com sombra dura, palco com
// plataformas de cor chapada e contorno marinho, e o fundo liso dos botões. Mesma linguagem da arena.

const AZUL = PALETTE.azul;
/** Pilha de fontes pesadas e arredondadas, só do sistema (nada de fonte remota). */
export const ROUNDED = "ui-rounded, 'Arial Rounded MT Bold', 'Nunito', 'Segoe UI Black', 'Segoe UI', system-ui, sans-serif";

/** Gotinha de tinta azul com carinha marota, espiando por cima do logotipo. */
function inkBuddy(x: number, y: number, s: number): string {
  return (
    `<g transform="translate(${x} ${y}) scale(${s}) rotate(14)">` +
    outlined('M0 -46 Q20 -18 28 2 A28 28 0 1 1 -28 2 Q-20 -18 0 -46 Z', AZUL, 6) +
    shine('M-16 -2 Q-16 -14 -8 -22', 5, 0.7) +
    eye(-8, 6, 7, 9, [0.5, 0.1]) +
    eye(10, 6, 7, 9, [0.5, 0.1]) +
    line('M-6 20 Q2 28 12 19', 4.5) +
    `<ellipse cx="-17" cy="18" rx="5" ry="3" fill="${PALETTE.rosa}" opacity="0.7"/><ellipse cx="20" cy="17" rx="5" ry="3" fill="${PALETTE.rosa}" opacity="0.7"/>` +
    '</g>'
  );
}

/** Logotipo: RISCOTE em amarelo pesado num chip marinho inclinado, com sombra dura e respingos de tinta. Fica no DOM. */
export function logoSvg(): string {
  const word = `<text x="500" y="196" text-anchor="middle" font-family="${ROUNDED.replace(/'/g, '&apos;')}" font-weight="900" font-size="150" letter-spacing="6" textLength="660" lengthAdjust="spacingAndGlyphs">RISCOTE</text>`;
  return svgDoc(
    '0 0 1000 300',
    shadowFilter('chip', 12, 14, 0.28) +
      `<g filter="url(#chip)" transform="rotate(-2 500 150)">` +
      outlined('M150 62 Q150 44 168 44 L832 40 Q852 40 852 60 L856 230 Q856 250 836 250 L170 254 Q150 254 150 234 Z', INK, 6) +
      '</g>' +
      // Faixa azul de tinta passando por baixo do chip, com um pingo.
      outlined('M96 236 Q300 214 520 232 Q700 246 900 228 L904 258 Q700 276 520 262 Q300 246 100 266 Z', AZUL, 6) +
      outlined('M612 262 Q614 286 620 290 Q626 286 628 262 Z', AZUL, 4) +
      `<g transform="rotate(-2 500 150)">` +
      `<g fill="${PALETTE.amarelo}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" paint-order="stroke">${word}</g>` +
      line('M190 72 Q260 64 330 66', 8, '#3a4258') +
      '</g>' +
      inkBuddy(878, 104, 1.55) +
      oval(110, 70, 12, 12, PALETTE.laranja, 5) +
      oval(84, 104, 6, 6, PALETTE.amarelo, 4) +
      oval(944, 206, 8, 8, PALETTE.verdeAgua, 4) +
      oval(72, 214, 7, 7, AZUL, 4),
  );
}

/** Largura e altura do palco, em unidades do SVG (as posições da cena usam as mesmas). */
export const STAGE_W = 1000;
export const STAGE_H = 420;
export const GROUND = 372;

const LEDGE_COLORS = [AZUL, PALETTE.laranja, PALETTE.verdeAgua] as const;

/** Plataforma atravessável: barra arredondada de cor chapada, contorno marinho, brilho e sombra dura. */
function ledge(x0: number, x1: number, y: number, i: number): string {
  const color = LEDGE_COLORS[i % LEDGE_COLORS.length] ?? AZUL;
  const h = 30;
  return (
    `<g filter="url(#sombra-palco)">` +
    `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" rx="${h / 2}" fill="${color}" stroke="${INK}" stroke-width="6"/>` +
    '</g>' +
    shine(`M${x0 + 16} ${y + 7} L${x0 + Math.min(120, (x1 - x0) * 0.4)} ${y + 7}`, 4.5, 0.6) +
    line(`M${x1 - 36} ${y + 7} L${x1 - 22} ${y + 7}`, 4.5, WHITE)
  );
}

/** Plataformas do palco, em unidades do palco; os bonecos se apoiam no `y` de cada uma. */
export const LEDGES = {
  esquerda: { x0: 50, x1: 330, y: 236 },
  meio: { x0: 400, x1: 570, y: 126 },
  direita: { x0: 680, x1: 960, y: 236 },
} as const;

/** Palco da capa: chão marinho e três plataformas, fundo transparente (o papel é da página). */
export function palcoSvg(): string {
  const ground =
    `<g filter="url(#sombra-palco)">` +
    `<rect x="-20" y="${GROUND + 2}" width="${STAGE_W + 40}" height="44" rx="14" fill="${INK}"/>` +
    '</g>' +
    line(`M-20 ${GROUND + 12} L${STAGE_W + 20} ${GROUND + 12}`, 3, '#3a4258') +
    // Tufos de grama de papel: tracinhos em cima do chão.
    [70, 260, 540, 820, 940]
      .map((x) => line(`M${x} ${GROUND + 2} L${x - 6} ${GROUND - 10} M${x + 8} ${GROUND + 2} L${x + 9} ${GROUND - 13} M${x + 16} ${GROUND + 2} L${x + 22} ${GROUND - 9}`, 4, PALETTE.verdeAgua))
      .join('');
  const ledges = Object.values(LEDGES)
    .map((l, i) => ledge(l.x0, l.x1, l.y, i))
    .join('');
  return svgDoc(`0 0 ${STAGE_W} ${STAGE_H}`, shadowFilter('sombra-palco', 7, 9, 0.22) + ground + ledges);
}

/** Fundo chapado arredondado para botões cheios (esticado pelo CSS). */
export function pincelSvg(color: string): string {
  return svgDoc('0 0 300 64', `<rect x="3" y="3" width="294" height="58" rx="14" fill="${color}" stroke="${INK}" stroke-width="4"/>`);
}
