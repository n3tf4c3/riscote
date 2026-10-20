import { INK, PAPER, stroke, svgDoc } from './svg';

// Versão do jogo dos riscotes: as mesmas poses da prancha com o traço engrossado,
// para não sumir no tamanho da tela (quadro "Leitura no tamanho do jogo").

export const POSES = ['parado', 'correA', 'correB', 'pulando', 'caindo', 'atirando', 'derrubado'] as const;
export type Pose = (typeof POSES)[number];

/** Largura de cada tipo de pincelada na versão do jogo. */
const WIDTH = { perna: 2.9, braco: 2.35, tronco: 3.4, pe: 1.5 } as const;
type Kind = keyof typeof WIDTH;

interface Skeleton {
  /** [x, y, rotação, tipo, comprimento] na ordem de desenho (de trás para a frente). */
  limbs: Array<[number, number, number, Kind, number]>;
  head: [number, number, number];
  hip: [number, number, number];
  dy?: number;
}

// Poses do quadro "Poses e animações" (viewBox 200 × 300, pés em y ≈ 290).
const SKELETONS: Record<Exclude<Pose, 'derrubado'>, Skeleton> = {
  parado: {
    limbs: [
      [98, 166, 7.6, 'perna', 1.21], [80, 288, -95, 'pe', 0.17], [100, 78, 11, 'braco', 0.83], [100, 58, 1, 'tronco', 1.12],
      [98, 166, -7.6, 'perna', 1.21], [112, 288, -95, 'pe', 0.17], [101, 78, -11.3, 'braco', 0.82],
    ],
    head: [100, 42, 0],
    hip: [99, 157, 1],
  },
  correA: {
    limbs: [
      [100, 168, 26.1, 'perna', 1.18], [46, 276, -100, 'pe', 0.16], [110, 80, 50.4, 'braco', 0.75], [112, 62, 6.3, 'tronco', 1.09],
      [100, 168, -32, 'perna', 0.94], [150, 250, -60, 'pe', 0.16], [111, 80, -75, 'braco', 0.62],
    ],
    head: [117, 44, 8],
    hip: [103, 156, 6],
  },
  correB: {
    limbs: [
      [100, 166, 12.1, 'perna', 0.86], [82, 250, -140, 'pe', 0.15], [106, 76, 12.2, 'braco', 0.76], [108, 58, 4.2, 'tronco', 1.08],
      [100, 166, -1.9, 'perna', 1.26], [98, 292, -95, 'pe', 0.17], [107, 76, -19, 'braco', 0.68],
    ],
    head: [112, 40, 5],
    hip: [101, 154, 4],
    dy: -4,
  },
  pulando: {
    limbs: [
      [98, 158, 22.6, 'perna', 0.52], [78, 206, -25, 'perna', 0.33], [99, 70, 153.4, 'braco', 0.67], [100, 52, 1, 'tronco', 1.08],
      [98, 158, -31.8, 'perna', 0.49], [124, 200, 20.6, 'perna', 0.34], [101, 70, -149.9, 'braco', 0.72],
    ],
    head: [100, 36, 0],
    hip: [99, 148, 1],
    dy: 10,
  },
  caindo: {
    limbs: [
      [98, 174, 21.1, 'perna', 0.94], [64, 262, -110, 'pe', 0.15], [99, 88, 119.2, 'braco', 0.57], [100, 70, 1.1, 'tronco', 1.06],
      [98, 174, -22.2, 'perna', 0.95], [134, 262, -70, 'pe', 0.15], [101, 88, -120, 'braco', 0.6],
    ],
    head: [100, 52, 0],
    hip: [99, 162, 1],
    dy: 18,
  },
  atirando: {
    limbs: [
      [96, 166, 15.6, 'perna', 1.27], [62, 288, -95, 'pe', 0.17], [98, 80, 22.6, 'braco', 0.65], [98, 60, 1.06, 'tronco', 1.08],
      [96, 166, -17.3, 'perna', 1.28], [132, 288, -95, 'pe', 0.17], [100, 80, -95.1, 'braco', 0.67],
    ],
    head: [98, 42, 0],
    hip: [97, 155, 1],
  },
};

/** Folga em cima para os acessórios que passam da cabeça. */
export const VIEWBOX = '0 -20 200 320';

const BELT = 'M-13 -4 Q1 -9 14 -3 L13 6 Q0 1 -12 6 Z M-9 2 Q-24 11 -35 30 L-29 32 Q-19 15 -5 5 Z M-6 4 Q-13 20 -14 37 L-9 37 Q-8 22 -2 6 Z';

/** Cabeça da versão do jogo: oval maior, dois riscos de brilho. Coordenadas relativas ao centro. */
const HEAD = `<ellipse rx="19" ry="22" transform="rotate(-8)" fill="${INK}" filter="url(#tinta)"/><path d="M8 -14 L16 -16 M11 -5 L18 -5.5" stroke="${PAPER}" stroke-width="3.2" stroke-linecap="round"/>`;

/** Acessório de cada jogador (na ordem dos slots), relativo ao centro da cabeça; `face` substitui a cabeça. */
function accessory(slot: number, color: string): { before?: string; after: string; replacesHead?: boolean } {
  switch (slot) {
    case 0:
      return { after: `<path d="M-18 -13 Q-1 -21 17 -16 L3 -44 Z" fill="${color}" filter="url(#tecido)"/><path d="M-17 -14 Q-1 -20 16 -16" stroke="${INK}" stroke-width="2.6" fill="none"/>` };
    case 1:
      return { after: `<path d="M-13 21 Q-1 28 11 20 L13 29 Q-1 37 -14 30 Z M-11 26 Q-37 22 -67 40 Q-47 36 -37 38 Q-55 50 -67 70 Q-41 50 -8 32 Z" fill="${color}" filter="url(#tecido)"/>` };
    case 2:
      return { after: `<path d="M-2 -21 L-2 -25 Q-9 -27 -2 -30 Q5 -33 -2 -36" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="-2" cy="-41" r="8" fill="${color}" filter="url(#tecido)"/><circle cx="-2" cy="-41" r="8" fill="none" stroke="${INK}" stroke-width="2"/>` };
    case 3:
      return {
        replacesHead: true,
        after: `<path d="M-21 4 Q-26 -28 0 -30 Q26 -28 23 4 Q21 24 1 24 Q-16 23 -21 4 Z M-16 -21 L-24 -46 L-5 -28 Z M16 -21 L25 -46 L6 -28 Z" fill="${color}" filter="url(#tecido)"/><ellipse cx="5" cy="4" rx="12" ry="15" transform="rotate(-8 5 4)" fill="${INK}" filter="url(#tinta)"/><path d="M10 -4 L16 -5" stroke="${PAPER}" stroke-width="2.8" stroke-linecap="round"/>`,
      };
    default:
      return { after: `<circle cx="-14" cy="-21" r="11" fill="${color}" filter="url(#tecido)"/><circle cx="-14" cy="-21" r="11" fill="none" stroke="${INK}" stroke-width="2"/><path d="M-34 -40 L2 -10" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` };
  }
}

/** SVG de um riscote numa pose (viewBox 200 × 300; pés em y ≈ 290; olhando para a direita). */
export function riscoteSvg(slot: number, color: string, pose: Pose): string {
  if (pose === 'derrubado') {
    // Poça de nanquim com a faixa na cor do jogador à vista.
    return svgDoc(
      VIEWBOX,
      `<ellipse cx="100" cy="282" rx="66" ry="12" fill="${INK}" filter="url(#tinta)"/>` +
        stroke(36, 279, -90, 2.2, 1.25) +
        `<path d="M58 283 Q100 273 142 281 L141 289 Q100 282 59 291 Z" fill="${color}" filter="url(#tecido)"/>` +
        `<path d="M78 276 L84 282 M84 276 L78 282 M94 276 L100 282 M100 276 L94 282" stroke="${PAPER}" stroke-width="2.6" stroke-linecap="round"/>`,
    );
  }
  const s = SKELETONS[pose];
  const acc = accessory(slot, color);
  const limbs = s.limbs.map(([x, y, rot, kind, len]) => stroke(x, y, rot, WIDTH[kind], len)).join('');
  const [hx, hy, hr] = s.head;
  const [bx, by, br] = s.hip;
  const head = `<g transform="translate(${hx} ${hy}) rotate(${hr})">${acc.replacesHead ? '' : HEAD}${acc.after}</g>`;
  const belt = `<path d="${BELT}" transform="translate(${bx} ${by}) rotate(${br}) scale(1.35)" fill="${color}" filter="url(#tecido)"/>`;
  return svgDoc(VIEWBOX, `<g transform="translate(0 ${s.dy ?? 0})">${limbs}${belt}${head}</g>`);
}
