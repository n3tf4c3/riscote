import { INK, PAPER, shade, stroke, strokeEnd, svgDoc } from './svg';

// Versão do jogo dos riscotes: figuras de pincel seco com o traço engrossado para não sumir
// no tamanho da tela, cabeça com rosto e expressão, tronco com volume, mãos e pés de mancha.

export const RUN_FRAMES = 6;
const RUN = Array.from({ length: RUN_FRAMES }, (_, i) => `corre${i}` as const);
export const POSES = ['parado', 'piscando', ...RUN, 'pulando', 'caindo', 'atirando', 'derrubado'] as const;
export type Pose = (typeof POSES)[number];

export function runPose(frame: number): Pose {
  return RUN[((frame % RUN_FRAMES) + RUN_FRAMES) % RUN_FRAMES] ?? 'corre0';
}

const LEG = 2.9;
const ARM = 2.3;

/** [x, y, rotação, comprimento] e, se dobra, [rotação, comprimento] do segundo trecho (joelho, cotovelo). */
type Limb = [number, number, number, number] | [number, number, number, number, number, number];
type Eyes = 'calmo' | 'firme' | 'susto' | 'piscando';
type Mouth = 'calmo' | 'firme' | 'susto' | 'grito';

interface Skeleton {
  /** De trás e da frente (a da frente ganha um halo de papel para se separar do corpo). */
  legs: [Limb, Limb];
  arms: [Limb, Limb];
  neck: [number, number, number];
  hip: [number, number, number];
  head: [number, number, number];
  face: [Eyes, Mouth];
  /** Quanto o vento do movimento ergue cachecol e antena (graus; negativo derruba). */
  flow: number;
}

const STILL: Skeleton = {
  legs: [[97, 152, 7, 1.32], [103, 152, -7, 1.32]],
  arms: [[93, 82, 12, 0.7], [107, 82, -14, 0.7]],
  neck: [100, 72, 1],
  hip: [100, 150, 1],
  head: [104, 40, -3],
  face: ['calmo', 'calmo'],
  flow: 0,
};

const SKELETONS: Record<'parado' | 'piscando' | 'pulando' | 'caindo' | 'atirando', Skeleton> = {
  parado: STILL,
  piscando: { ...STILL, face: ['piscando', 'calmo'] },
  pulando: {
    legs: [[97, 146, 28, 0.6, -28, 0.5], [103, 146, -38, 0.55, 18, 0.47]],
    arms: [[94, 74, 150, 0.7], [106, 74, -152, 0.72]],
    neck: [100, 64, 0],
    hip: [100, 144, 0],
    head: [103, 30, -4],
    face: ['susto', 'grito'],
    flow: -25,
  },
  caindo: {
    legs: [[97, 160, 22, 1.05], [103, 160, -24, 1.05]],
    arms: [[94, 92, 118, 0.62], [106, 92, -122, 0.62]],
    neck: [100, 82, 0],
    hip: [100, 158, 0],
    head: [102, 48, 0],
    face: ['susto', 'susto'],
    flow: 35,
  },
  atirando: {
    legs: [[96, 152, 15, 1.36], [102, 152, -17, 1.36]],
    arms: [[94, 82, 22, 0.66], [106, 82, -92, 0.72]],
    neck: [99, 72, 2],
    hip: [99, 150, 1],
    head: [103, 40, 0],
    face: ['firme', 'grito'],
    flow: 0,
  },
};

/** Quadro `i` do ciclo de corrida: coxa e braço oscilam em oposição; o quadril desce no apoio. */
function runSkeleton(i: number): Skeleton {
  const lean = 9;
  const leg = (phi: number): Limb => {
    const thigh = 34 * Math.sin(phi);
    const bend = 12 + 62 * Math.max(0, -Math.cos(phi));
    return [0, 0, thigh, 0.66, thigh + bend, 0.64];
  };
  const phi = (i / RUN_FRAMES) * Math.PI * 2 + Math.PI / 6;
  const legs = [leg(phi), leg(phi + Math.PI)] as const;
  // O pé mais baixo encosta no chão (y ≈ 283): define a altura do quadril neste quadro.
  const foot = (l: Limb) => {
    const [kx, ky] = strokeEnd(0, 0, l[2], l[3]);
    return strokeEnd(kx, ky, l[4] ?? l[2], l[5] ?? 0)[1];
  };
  const hy = 283 - Math.max(foot(legs[0]), foot(legs[1]));
  const hx = 102;
  const [nx, ny] = strokeEnd(hx, hy, 180 + lean, 0.79);
  const arm = (phi: number): Limb => {
    const upper = -46 * Math.sin(phi);
    return [0, 0, upper, 0.4, upper - 70, 0.34];
  };
  const place = (l: Limb, x: number, y: number): Limb => [x, y, l[2], l[3], l[4] ?? l[2], l[5] ?? 0];
  const [sx, sy] = strokeEnd(nx, ny, lean, 0.1);
  const [cx, cy] = strokeEnd(nx, ny, 180 + lean, 0.33);
  return {
    legs: [place(legs[0], hx - 2, hy), place(legs[1], hx + 2, hy)],
    arms: [place(arm(phi + Math.PI), sx - 4, sy), place(arm(phi), sx + 4, sy)],
    neck: [nx, ny, lean],
    hip: [hx, hy - 2, lean * 0.7],
    head: [cx + 4, cy, lean],
    face: ['firme', 'firme'],
    flow: 22 + 6 * Math.sin(phi * 2),
  };
}

/** Folga em cima para os acessórios que passam da cabeça. */
export const VIEWBOX = '0 -40 200 340';

const TORSO = 'M-17 4 Q0 -11 18 2 Q22 40 13 80 Q0 88 -13 80 Q-22 40 -17 4 Z';
const BELT = 'M-13 -4 Q1 -9 14 -3 L13 6 Q0 1 -12 6 Z M-9 2 Q-24 11 -35 30 L-29 32 Q-19 15 -5 5 Z M-6 4 Q-13 20 -14 37 L-9 37 Q-8 22 -2 6 Z';
const HEAD = `<ellipse rx="25" ry="28" transform="rotate(-6)" fill="${INK}" filter="url(#tinta)"/>`;
/** Três riscos de brilho no alto da nuca. */
const SHINE = `<path d="M-19 -9 L-14 -17 M-21 0 L-17 -5 M-12 -21 L-6 -24" stroke="${PAPER}" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>`;

const EYES: Record<Eyes, string> = {
  calmo:
    `<ellipse cx="12" cy="-3" rx="7.5" ry="9.5" fill="${PAPER}"/><ellipse cx="-3" cy="-2" rx="6" ry="9" fill="${PAPER}"/>` +
    `<circle cx="14.5" cy="-1" r="4.2" fill="${INK}"/><circle cx="-0.5" cy="0" r="3.8" fill="${INK}"/><circle cx="16" cy="-3" r="1.4" fill="${PAPER}"/>`,
  firme:
    `<path d="M5 -8 L20 -11 L19 2 Q12 5 5 1 Z" fill="${PAPER}"/><path d="M-9 -7 L2 -8 L2 2 Q-3 4 -9 1 Z" fill="${PAPER}"/>` +
    `<circle cx="15" cy="-3" r="4" fill="${INK}"/><circle cx="0" cy="-2" r="3.6" fill="${INK}"/>`,
  susto:
    `<circle cx="12" cy="-4" r="9.5" fill="${PAPER}"/><circle cx="-4" cy="-3" r="8" fill="${PAPER}"/>` +
    `<circle cx="13" cy="-4" r="3" fill="${INK}"/><circle cx="-3" cy="-3" r="2.6" fill="${INK}"/>`,
  piscando: `<path d="M5 -1 Q12 3 20 -1 M-9 0 Q-3 3 2 0" stroke="${PAPER}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
};

const MOUTHS: Record<Mouth, string> = {
  calmo: `<path d="M6 14 Q12 18 18 12" stroke="${PAPER}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  firme: `<path d="M7 15 L17 13" stroke="${PAPER}" stroke-width="2.8" stroke-linecap="round"/>`,
  susto: `<ellipse cx="11" cy="16" rx="4" ry="5" fill="${PAPER}"/>`,
  grito: `<path d="M4 11 Q12 9 20 10 Q17 22 9 21 Q4 18 4 11 Z" fill="${PAPER}"/>`,
};

/** Forma colorida com tecido, hachura na metade de trás e contorno de nanquim. */
function colored(d: string, color: string, outline = 2.2): string {
  return (
    `<path d="${d}" fill="${color}" filter="url(#tecido)"/>` +
    `<path d="${d}" fill="url(#hachura-fina)" opacity="0.4" clip-path="url(#tras)"/>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${outline}" stroke-linejoin="round" filter="url(#tinta)"/>`
  );
}

/**
 * Acessório de cada jogador (na ordem dos slots), em coordenadas da cabeça.
 * `face` desenha o rosto; o capuz o põe menor, dentro da abertura.
 */
function headArt(slot: number, color: string, face: string, flow: number): string {
  const dark = shade(color, 0.6);
  const head = HEAD + SHINE + face;
  switch (slot) {
    case 0:
      return (
        head +
        `<g transform="translate(0 -7) scale(1.25)">${colored('M-17 -11 Q-1 -18 16 -13 L3 -42 Z', color)}` +
        `<path d="M-19 -10 Q-1 -18 18 -12" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>`
      );
    case 1:
      return (
        head +
        `<g transform="scale(1.25)">${colored('M-13 21 Q-1 28 11 20 L13 29 Q-1 37 -14 30 Z', color, 1.8)}` +
        `<g transform="rotate(${flow * 0.8} -11 27)">${colored('M-11 26 Q-37 22 -67 40 Q-47 36 -37 38 Q-55 50 -67 70 Q-41 50 -8 32 Z', color, 1.8)}</g>` +
        `<path d="M-12 30 Q-1 35 12 28" stroke="${dark}" stroke-width="2.4" fill="none"/></g>`
      );
    case 2:
      return (
        head +
        `<g transform="scale(1.25) rotate(${-flow * 0.5} -2 -21)"><path d="M-2 -21 L-2 -25 Q-9 -27 -2 -30 Q5 -33 -2 -36" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` +
        `${colored('M-10 -41 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 Z', color, 2)}<circle cx="0.5" cy="-44" r="2" fill="${PAPER}"/></g>`
      );
    case 3:
      return (
        `<g transform="scale(1.25)">${colored('M-21 4 Q-26 -28 0 -30 Q26 -28 23 4 Q21 24 1 24 Q-16 23 -21 4 Z M-16 -21 L-24 -46 L-5 -28 Z M16 -21 L25 -46 L6 -28 Z', color, 2)}` +
        `<path d="M-19 -36 L-11 -27 M20 -36 L12 -27" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>` +
        `<ellipse cx="5" cy="4" rx="13" ry="16" transform="rotate(-8 5 4)" fill="${INK}" filter="url(#tinta)"/></g>` +
        `<g transform="translate(4 6) scale(0.82)">${face}</g>`
      );
    default:
      return (
        head +
        `<g transform="scale(1.25)"><path d="M-36 -42 L2 -10" stroke="${INK}" stroke-width="3.8" stroke-linecap="round"/>` +
        `<path d="M-38 -44 L-32 -38" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>` +
        `${colored('M-25 -21 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 Z', color, 2)}` +
        `<path d="M-20 -26 Q-14 -30 -8 -26" stroke="${dark}" stroke-width="2" fill="none"/></g>`
      );
  }
}

/** Membro de pincelada única (ou dois trechos), com mancha na ponta; devolve o SVG e a ponta. */
function limb(l: Limb, w: number, halo: boolean): { svg: string; tip: [number, number] } {
  const [x, y, r, len] = l;
  const parts: Array<[number, number, number, number]> = [[x, y, r, len]];
  if (l.length === 6) parts.push([...strokeEnd(x, y, r, len), l[4], l[5]]);
  let svg = '';
  if (halo) for (const [px, py, pr, pl] of parts) svg += stroke(px, py, pr, w + 1.3, pl + 0.04, PAPER);
  for (const [px, py, pr, pl] of parts) svg += stroke(px, py, pr, w, pl);
  const [lx, ly, lr, ll] = parts[parts.length - 1] ?? parts[0]!;
  return { svg, tip: strokeEnd(lx, ly, lr, ll) };
}

const foot = (tip: [number, number], dx: number) =>
  `<ellipse cx="${tip[0] + dx}" cy="${tip[1] + 3}" rx="13" ry="6.5" fill="${INK}" filter="url(#tinta)"/>`;

function figure(slot: number, color: string, s: Skeleton): string {
  const backLeg = limb(s.legs[0], LEG, false);
  const backArm = limb(s.arms[0], ARM, false);
  const frontLeg = limb(s.legs[1], LEG, true);
  const frontArm = limb(s.arms[1], ARM, true);
  const [nx, ny, nr] = s.neck;
  const [bx, by, br] = s.hip;
  const [hx, hy, hr] = s.head;
  const torso =
    `<g transform="translate(${nx} ${ny}) rotate(${nr})"><path d="${TORSO}" fill="${INK}" filter="url(#tinta)"/>` +
    stroke(10, 10, 4, 0.75, 0.55, PAPER, 'seco', 0.5) +
    `<path d="M-14 30 l8 -6 M-15 42 l9 -7 M-15 54 l9 -7 M-13 66 l8 -6" stroke="${PAPER}" stroke-width="2.6" stroke-linecap="round" opacity="0.4"/></g>`;
  const belt =
    `<g transform="translate(${bx} ${by}) rotate(${br}) scale(1.35)"><path d="${BELT}" fill="${color}" filter="url(#tecido)"/>` +
    `<path d="M-12 1 Q0 -3 13 2 L13 6 Q0 1 -12 6 Z" fill="${shade(color, 0.62)}" opacity="0.85"/>` +
    `<path d="M-13 -4 Q1 -9 14 -3" stroke="${INK}" stroke-width="1.6" fill="none"/></g>`;
  const face = EYES[s.face[0]] + MOUTHS[s.face[1]];
  const head =
    `<g transform="translate(${hx} ${hy}) rotate(${hr})"><clipPath id="tras"><rect x="-90" y="-90" width="88" height="200"/></clipPath>` +
    `${headArt(slot, color, face, s.flow)}</g>`;
  return (
    backLeg.svg + foot(backLeg.tip, 5) +
    backArm.svg + `<circle cx="${backArm.tip[0]}" cy="${backArm.tip[1]}" r="7" fill="${INK}" filter="url(#tinta)"/>` +
    torso + belt +
    frontLeg.svg + foot(frontLeg.tip, 6) +
    frontArm.svg +
    `<circle cx="${frontArm.tip[0]}" cy="${frontArm.tip[1]}" r="8.5" fill="${PAPER}"/><circle cx="${frontArm.tip[0]}" cy="${frontArm.tip[1]}" r="7" fill="${INK}" filter="url(#tinta)"/>` +
    head
  );
}

/** Derrubado: poça de nanquim com respingos, olhos em X e a faixa na cor do jogador à vista. */
function knockedDown(color: string): string {
  return (
    `<ellipse cx="100" cy="282" rx="66" ry="12" fill="${INK}" filter="url(#tinta)"/>` +
    stroke(36, 279, -90, 2.2, 1.25) +
    `<path d="M58 283 Q100 273 142 281 L141 289 Q100 282 59 291 Z" fill="${color}" filter="url(#tecido)"/>` +
    `<path d="M58 286 Q100 279 141 285 L141 289 Q100 282 59 291 Z" fill="${shade(color, 0.6)}"/>` +
    `<path d="M76 272 L84 280 M84 272 L76 280 M94 272 L102 280 M102 272 L94 280" stroke="${PAPER}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="28" cy="270" r="4" fill="${INK}"/><circle cx="170" cy="274" r="5" fill="${INK}"/><circle cx="182" cy="284" r="2.6" fill="${INK}"/><circle cx="18" cy="284" r="2" fill="${INK}"/>`
  );
}

/** SVG de um riscote numa pose (viewBox 200 × 340; pés em y ≈ 290; olhando para a direita). */
export function riscoteSvg(slot: number, color: string, pose: Pose, variant = 0): string {
  if (pose === 'derrubado') return svgDoc(VIEWBOX, knockedDown(color), variant);
  const s = pose.startsWith('corre') ? runSkeleton(Number(pose.slice(5))) : SKELETONS[pose as keyof typeof SKELETONS];
  return svgDoc(VIEWBOX, figure(slot, color, s), variant);
}
