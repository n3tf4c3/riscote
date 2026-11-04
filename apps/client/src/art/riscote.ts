import { INK, PALETTE, WHITE, blush, capsule, eye, line, openMouth, outlined, oval, shade, shine, svgDoc } from './svg';

// Riscotes em cartum (direção de 2026-10-31): crianças de cabeção, traço marinho grosso e cor chapada,
// moletom na cor do jogador, calça cinza, tênis branco e crachá no peito. Cada vaga tem tom de pele,
// cabelo e acessório próprios (silhuetas diferentes: chapéu de festa, cachecol, antena, capuz de gato,
// boina), e cada pose tem uma expressão. Gente, e não bicho: nunca se confunde com um monstro.

/** Tom claro da cor de cada jogador (brilho do acessório e da faixa da proteção). */
export const PLAYER_GLOWS = ['#ffb08f', '#a6e6fa', '#ffe08a', '#7fdccb', '#cdb0f5'] as const;

/** Nome de cada personagem (um por vaga), pelo acessório: aparece na escolha da capa. */
export const CHARACTER_NAMES = ['Chapéu de festa', 'Cachecol', 'Antena', 'Capuz de gato', 'Boina'] as const;

export const RUN_FRAMES = 6;
const RUN = Array.from({ length: RUN_FRAMES }, (_, i) => `corre${i}` as const);
/**
 * Poses do boneco. Desde 2026-11-04 (pedido do usuário: "muito robótico"), além das de sempre: carga e
 * chute da bola, o tiro com o braço voltando, freada, pouso agachado, topo do pulo, um segundo quadro da
 * queda, comemoração e a espera (parado há muito tempo).
 */
export const POSES = [
  'parado', 'piscando', ...RUN, 'pulando', 'caindo', 'atirando', 'derrubado',
  'chute-carga', 'chute', 'atirou', 'freando', 'pouso', 'topo', 'caindo1', 'comemora0', 'comemora1', 'espera',
] as const;
export type Pose = (typeof POSES)[number];

export function runPose(frame: number): Pose {
  return RUN[((frame % RUN_FRAMES) + RUN_FRAMES) % RUN_FRAMES] ?? 'corre0';
}

/** Folga em cima para os acessórios que passam da cabeça. */
export const VIEWBOX = '0 -40 200 340';

const LW = 6.5;
const PANTS = '#7e8597';
const SHOE = WHITE;
const THIGH = 38;
const SHIN = 37;
const UPPER = 30;
const FORE = 27;

interface Look {
  skin: string;
  hair: string;
}
const LOOKS: readonly Look[] = [
  { skin: '#f6cfa8', hair: '#2b2230' },
  { skin: '#8a5a3c', hair: '#1f1a22' },
  { skin: '#e9b48a', hair: '#5a3a28' },
  { skin: '#c88b5e', hair: '#2b2230' },
  { skin: '#f8dcc6', hair: '#c45a2a' },
];

type Face = 'feliz' | 'piscando' | 'garra' | 'uau' | 'susto' | 'grito' | 'tonto';

/**
 * Ângulos em graus a partir da vertical para baixo; positivo gira para a frente (+x).
 * Perna: [coxa, canela]; braço: [braço, antebraço].
 */
interface Skeleton {
  hip: [number, number];
  /** Inclinação do tronco (positivo = para a frente). */
  lean: number;
  legs: [[number, number], [number, number]];
  arms: [[number, number], [number, number]];
  /** Inclinação extra da cabeça. */
  tilt: number;
  face: Face;
  /** Quanto o vento ergue cachecol e antena (graus; negativo derruba). */
  flow: number;
}

const STILL: Skeleton = {
  hip: [100, 210],
  lean: 0,
  legs: [[-5, -3], [6, 4]],
  arms: [[-10, -4], [14, 30]],
  tilt: 0,
  face: 'feliz',
  flow: 0,
};

const SKELETONS: Record<Exclude<Pose, 'derrubado' | `corre${number}`>, Skeleton> = {
  parado: STILL,
  piscando: { ...STILL, face: 'piscando' },
  pulando: {
    hip: [100, 196],
    lean: 4,
    legs: [[-30, 20], [62, -18]],
    arms: [[208, 196], [152, 162]],
    tilt: -6,
    face: 'uau',
    flow: -25,
  },
  caindo: {
    hip: [100, 206],
    lean: -4,
    legs: [[-14, 2], [18, -6]],
    arms: [[235, 200], [125, 165]],
    tilt: 4,
    face: 'susto',
    flow: 35,
  },
  atirando: {
    hip: [98, 210],
    lean: 6,
    legs: [[-16, -8], [18, 10]],
    arms: [[-28, 20], [88, 92]],
    tilt: 2,
    face: 'grito',
    flow: 0,
  },
  // Depois do tiro: o braço ainda à frente, descendo, e o corpo voltando do coice.
  atirou: {
    hip: [99, 210],
    lean: 2,
    legs: [[-12, -6], [14, 8]],
    arms: [[-18, 4], [66, 54]],
    tilt: 0,
    face: 'garra',
    flow: 0,
  },
  // Chute: a perna da frente recua dobrada, o corpo vai para trás e os braços se abrem para o equilíbrio.
  'chute-carga': {
    hip: [96, 210],
    lean: -10,
    legs: [[4, 2], [-40, -92]],
    arms: [[42, 74], [-46, -20]],
    tilt: -6,
    face: 'garra',
    flow: 12,
  },
  // ... e varre para a frente, alta, com o braço da frente indo para trás.
  chute: {
    hip: [92, 210],
    lean: -14,
    legs: [[-4, -2], [58, 72]],
    arms: [[-34, 10], [-72, -50]],
    tilt: -4,
    face: 'grito',
    flow: 28,
  },
  // Freada: a perna da frente fincada à frente, o corpo jogado para trás, os braços para trás.
  freando: {
    hip: [96, 218],
    lean: -16,
    legs: [[-22, -44], [34, 22]],
    arms: [[-62, -34], [-36, 8]],
    tilt: -6,
    face: 'susto',
    flow: 30,
  },
  // Pouso: agachado, joelhos dobrados e mãos à frente.
  pouso: {
    hip: [100, 226],
    lean: 10,
    legs: [[-34, 20], [38, -16]],
    arms: [[22, 46], [36, 64]],
    tilt: 4,
    face: 'feliz',
    flow: 8,
  },
  // Topo do pulo: pernas encolhidas e braços abertos.
  topo: {
    hip: [100, 198],
    lean: 2,
    legs: [[-22, 34], [46, -12]],
    arms: [[-118, -142], [116, 138]],
    tilt: -4,
    face: 'uau',
    flow: -8,
  },
  // Segundo quadro da queda: os braços trocam, como quem se debate.
  caindo1: {
    hip: [100, 206],
    lean: -2,
    legs: [[12, -4], [-10, 6]],
    arms: [[205, 232], [150, 128]],
    tilt: -3,
    face: 'susto',
    flow: 40,
  },
  // Comemoração: braços abertos em V, para fora da cabeça (curtos, não passam dela por cima), um
  // pulinho e os olhos fechados de alegria; depois o "uau".
  comemora0: {
    hip: [100, 208],
    lean: 0,
    legs: [[-6, -3], [7, 4]],
    arms: [[-112, -148], [112, 148]],
    tilt: -5,
    face: 'piscando',
    flow: 0,
  },
  comemora1: {
    hip: [100, 202],
    lean: 2,
    legs: [[-14, 6], [16, -4]],
    arms: [[-96, -126], [96, 126]],
    tilt: 5,
    face: 'uau',
    flow: -10,
  },
  // Espera: parado há muito tempo, bate o pé e olha para cima.
  espera: {
    hip: [100, 210],
    lean: -2,
    legs: [[-5, -3], [14, -18]],
    arms: [[-16, 30], [10, 40]],
    tilt: -10,
    face: 'feliz',
    flow: 0,
  },
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const along = ([x, y]: readonly [number, number], deg: number, len: number): [number, number] => [x + len * Math.sin(rad(deg)), y + len * Math.cos(rad(deg))];
/** Gira um deslocamento (dx, dy) em `deg` graus no sentido horário da tela e soma a (x, y). */
const offset = ([x, y]: readonly [number, number], deg: number, dx: number, dy: number): [number, number] => {
  const a = rad(deg);
  return [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)];
};

/** Quadro `i` da corrida: coxas e braços em oposição; o quadril desce no apoio. */
function runSkeleton(i: number): Skeleton {
  const phi = (i / RUN_FRAMES) * Math.PI * 2 + Math.PI / 6;
  const leg = (p: number): [number, number] => {
    const thigh = 36 * Math.sin(p);
    return [thigh, thigh - (8 + 70 * Math.max(0, -Math.cos(p)))];
  };
  const legs: [[number, number], [number, number]] = [leg(phi + Math.PI), leg(phi)];
  const footY = ([a, b]: [number, number]) => THIGH * Math.cos(rad(a)) + SHIN * Math.cos(rad(b));
  const hy = 284 - Math.max(footY(legs[0]), footY(legs[1]));
  const arm = (p: number): [number, number] => {
    const upper = -42 * Math.sin(p);
    return [upper, upper + 80];
  };
  return {
    hip: [102, hy],
    lean: 10,
    legs,
    arms: [arm(phi + Math.PI), arm(phi)],
    tilt: 2,
    face: 'garra',
    flow: 22 + 6 * Math.sin(phi * 2),
  };
}

/** Olhos, sobrancelhas, boca e bochechas, em coordenadas da cabeça (olhando para a direita). */
function faceArt(face: Face, small = false): string {
  const [ex1, ex2, ey] = [6, 27, 0];
  let eyes: string;
  let brows: string;
  let mouth: string;
  switch (face) {
    case 'piscando':
      eyes = line(`M${ex1 - 8} ${ey + 2} Q${ex1} ${ey - 7} ${ex1 + 8} ${ey + 2} M${ex2 - 7} ${ey + 1} Q${ex2} ${ey - 7} ${ex2 + 7} ${ey + 1}`, 4.5);
      brows = line(`M${ex1 - 7} -17 Q${ex1} -21 ${ex1 + 7} -18 M${ex2 - 6} -18 Q${ex2} -21 ${ex2 + 6} -18`, 4);
      mouth = line('M12 18 Q22 27 33 17', 4.5);
      break;
    case 'garra':
      eyes = eye(ex1, ey, 8.5, 10, [0.6, 0.1]) + eye(ex2, ey - 1, 7.5, 9.5, [0.6, 0.1]);
      brows = line(`M${ex1 - 9} -16 L${ex1 + 7} -11 M${ex2 - 6} -12 L${ex2 + 8} -17`, 5);
      mouth = outlined('M11 16 Q23 15 35 13 Q33 27 22 27 Q13 26 11 16 Z', WHITE, 3.5) + line('M12 20 Q23 19 34 17', 2);
      break;
    case 'uau':
      eyes = eye(ex1, ey - 1, 9.5, 12, [0.4, -0.4]) + eye(ex2, ey - 2, 8.5, 11.5, [0.4, -0.4]);
      brows = line(`M${ex1 - 8} -22 Q${ex1} -27 ${ex1 + 8} -23 M${ex2 - 6} -23 Q${ex2} -28 ${ex2 + 7} -24`, 4.5);
      mouth = openMouth('M12 15 Q24 13 35 14 Q33 32 23 32 Q13 31 12 15 Z', [24, 30, 8]);
      break;
    case 'susto':
      eyes = eye(ex1, ey - 1, 9.5, 12, [0.1, 0], 0.36) + eye(ex2, ey - 2, 8.5, 11.5, [0.1, 0], 0.36);
      brows = line(`M${ex1 - 8} -21 Q${ex1 + 2} -26 ${ex1 + 8} -20 M${ex2 - 6} -20 Q${ex2 - 1} -27 ${ex2 + 7} -22`, 4.5);
      mouth = openMouth('M18 18 Q24 13 30 18 Q31 28 24 29 Q17 28 18 18 Z', [24, 29, 5]);
      break;
    case 'grito':
      eyes = eye(ex1, ey + 1, 8.5, 8, [0.7, 0.2]) + eye(ex2, ey, 7.5, 7.5, [0.7, 0.2]);
      brows = line(`M${ex1 - 9} -14 L${ex1 + 8} -8 M${ex2 - 6} -9 L${ex2 + 9} -14`, 5.5);
      mouth = openMouth('M12 14 Q26 10 38 13 Q36 31 24 30 Q14 28 12 14 Z', [26, 29, 8]);
      break;
    case 'tonto':
      eyes =
        line(`M${ex1 - 7} -6 L${ex1 + 7} 6 M${ex1 + 7} -6 L${ex1 - 7} 6`, 4.5) +
        line(`M${ex2 - 6} -6 L${ex2 + 6} 6 M${ex2 + 6} -6 L${ex2 - 6} 6`, 4.5);
      brows = '';
      mouth = line('M10 20 Q16 15 22 20 Q28 25 34 19', 4) + outlined('M24 22 Q25 32 30 31 Q34 29 31 21 Z', PALETTE.lingua, 3);
      break;
    default:
      eyes = eye(ex1, ey, 8.5, 10.5) + eye(ex2, ey - 1, 7.5, 10);
      brows = line(`M${ex1 - 7} -17 Q${ex1} -21 ${ex1 + 7} -18 M${ex2 - 6} -18 Q${ex2} -21 ${ex2 + 6} -18`, 4);
      mouth = line('M13 17 Q23 26 33 16', 4.5);
  }
  const cheeks = blush(-6, 14, 7) + blush(38, 12, 5);
  return small ? `<g transform="translate(6 2) scale(0.88)">${cheeks + eyes + brows + mouth}</g>` : cheeks + eyes + brows + mouth;
}

const HEAD_RX = 40;
const HEAD_RY = 38;

/** Cabeça, cabelo e acessório de cada vaga, em coordenadas da cabeça (centro em 0, 0). */
function headArt(slot: number, color: string, glow: string, face: Face, flow: number): string {
  const { skin, hair } = LOOKS[slot] ?? LOOKS[0]!;
  const dark = shade(color, 0.75);
  const ear = oval(-22, 6, 8, 10, skin, 5) + line('M-24 2 Q-20 6 -23 10', 3, shade(skin, 0.7));
  const head = oval(0, 0, HEAD_RX, HEAD_RY, skin, LW);
  const faceSvg = faceArt(face);
  switch (slot) {
    case 0: {
      // Topete curto e chapéu de festa com listras e pompom.
      const hairSvg = outlined('M-38 -6 Q-42 -36 -8 -40 Q22 -42 34 -22 Q18 -28 2 -22 Q-14 -24 -22 -10 Q-30 -12 -38 -6 Z', hair, 5);
      const hat =
        `<g transform="rotate(${12 - flow * 0.15} 0 -34)">` +
        outlined('M-24 -30 L2 -98 L26 -30 Q1 -22 -24 -30 Z', color, LW) +
        line('M-14 -56 L16 -50 M-6 -78 L10 -74', 5, glow) +
        oval(2, -102, 10, 10, PALETTE.amarelo, 5) +
        '</g>';
      return head + ear + hairSvg + faceSvg + hat;
    }
    case 1: {
      // Cabelo cacheado volumoso e cachecol que voa com o vento.
      const curls = [[-30, -22, 15], [-12, -34, 16], [8, -36, 15], [26, -26, 13], [-38, -4, 12]] as const;
      const hairSvg = curls.map(([x, y, r]) => oval(x, y, r, r, hair, 5)).join('');
      const tail =
        `<g transform="rotate(${-flow * 0.9} -20 40)">` +
        outlined('M-18 36 Q-46 34 -78 48 L-74 58 Q-60 52 -50 54 L-70 72 Q-40 64 -16 48 Z', color, 5) +
        line('M-40 44 L-44 58 M-56 48 L-60 60', 3, dark) +
        '</g>';
      const wrap = outlined('M-26 30 Q2 44 30 30 L32 42 Q2 58 -28 42 Z', color, 5) + line('M-22 38 Q2 48 26 38', 3, glow);
      return tail + head + hairSvg + ear + faceSvg + wrap;
    }
    case 2: {
      // Rabo de cavalo e tiara com antena de bolinha (balança no vento).
      const tail = outlined('M-34 -16 Q-66 -12 -62 26 Q-56 10 -40 4 Z', hair, 5);
      const hairSvg = outlined('M-38 -2 Q-40 -38 0 -40 Q32 -40 38 -14 Q20 -26 -2 -26 Q-24 -24 -30 0 Z', hair, 5);
      const band = line('M-36 -16 Q0 -44 34 -18', 9, INK) + line('M-36 -16 Q0 -44 34 -18', 4.5, color);
      const antenna =
        `<g transform="rotate(${-flow * 0.6} 0 -36)">` +
        line('M0 -36 Q-6 -56 4 -74', 5) +
        oval(5, -80, 11, 11, color, 5) +
        shine('M0 -84 Q3 -88 8 -88', 3) +
        '</g>';
      return tail + head + hairSvg + ear + band + antenna + faceSvg;
    }
    case 3: {
      // Capuz de gato na cor do jogador, com o rosto na abertura.
      const hood =
        outlined('M-30 -24 L-38 -66 L-6 -40 Z', color, LW) +
        outlined('M14 -40 L38 -66 L36 -22 Z', color, LW) +
        line('M-31 -34 L-33 -52 L-17 -40 M22 -38 L33 -52 L32 -36', 4, glow) +
        outlined('M-44 4 Q-46 -42 0 -44 Q44 -44 44 2 Q44 40 2 42 Q-42 42 -44 4 Z', color, LW);
      const opening = oval(8, 4, 32, 30, skin, 5);
      return hood + opening + faceArt(face, true) + line('M-30 34 Q-22 40 -14 38', 4, dark);
    }
    default: {
      // Cabelo ruivo com franja e boina de pintor.
      const hairSvg =
        outlined('M-40 4 Q-46 -30 -10 -38 Q24 -42 38 -16 Q24 -22 10 -18 Q2 -8 -8 -18 Q-20 -10 -26 4 Q-34 14 -40 4 Z', hair, 5);
      const beret =
        `<g transform="rotate(${-8 - flow * 0.1} 0 -36)">` +
        outlined('M-44 -30 Q-46 -58 -2 -60 Q42 -60 44 -34 Q20 -24 -44 -30 Z', color, LW) +
        line('M-2 -60 L2 -72', 6) +
        shine('M-30 -46 Q-18 -54 -4 -54', 4, 0.6) +
        '</g>';
      return head + hairSvg + ear + faceSvg + beret;
    }
  }
}

/** Tênis em `foot`, apontando para a frente, inclinado com a canela. */
function shoe([x, y]: readonly [number, number], shin: number): string {
  return (
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(-shin * 0.5).toFixed(1)})">` +
    outlined('M-11 -6 Q-13 9 -3 9 L18 9 Q25 8 23 1 Q20 -6 8 -6 Z', SHOE, 5) +
    line('M-10 5 L22 5', 3, PALETTE.cinzaClaro) +
    '</g>'
  );
}

function leg(hip: readonly [number, number], [a, b]: readonly [number, number], dark: boolean): string {
  const knee = along(hip, a, THIGH);
  const foot = along(knee, b, SHIN);
  return capsule([hip, knee, foot], 19, dark ? shade(PANTS, 0.82) : PANTS, LW) + shoe(foot, b);
}

function arm(shoulder: readonly [number, number], [a, b]: readonly [number, number], color: string, skin: string): string {
  const elbow = along(shoulder, a, UPPER);
  const hand = along(elbow, b, FORE);
  return capsule([shoulder, elbow, hand], 16, color, LW) + oval(hand[0], hand[1], 9, 9, skin, 5);
}

/** Moletom com bolso, punho e crachá, em coordenadas do quadril (centro do quadril em 0, 0). */
function torsoArt(color: string, glow: string): string {
  const dark = shade(color, 0.75);
  return (
    outlined('M-27 -70 Q0 -82 27 -70 L34 -6 Q2 6 -32 -6 Z', color, LW) +
    line('M-30 -14 Q2 -4 33 -14', 4, dark) +
    line('M-10 -34 Q4 -28 18 -34', 3.5, dark) +
    // Cordão do crachá e o crachá branco.
    line('M-12 -72 L4 -48 L16 -72', 3, glow) +
    outlined('M-3 -50 L13 -50 L13 -34 L-3 -34 Z', WHITE, 3.5) +
    line('M0 -42 L10 -42', 2.4, PALETTE.laranja) +
    shine('M-18 -66 Q-22 -48 -22 -30', 4, 0.35)
  );
}

function figure(slot: number, color: string, s: Skeleton, ground = true): string {
  const glow = PLAYER_GLOWS[slot] ?? color;
  const { skin } = LOOKS[slot] ?? LOOKS[0]!;
  const back = shade(color, 0.82);
  const hip = s.hip;
  const shoulderBack = offset(hip, s.lean, -20, -64);
  const shoulderFront = offset(hip, s.lean, 20, -64);
  const head = offset(hip, s.lean, 4, -120);
  const shadow = ground ? `<ellipse cx="100" cy="292" rx="40" ry="7" fill="${INK}" opacity="0.16"/>` : '';
  return (
    shadow +
    arm(shoulderBack, s.arms[0], back, shade(skin, 0.9)) +
    leg(offset(hip, s.lean, -9, -2), s.legs[0], true) +
    leg(offset(hip, s.lean, 9, -2), s.legs[1], false) +
    `<g transform="translate(${hip[0]} ${hip[1]}) rotate(${s.lean})">${torsoArt(color, glow)}</g>` +
    arm(shoulderFront, s.arms[1], color, skin) +
    `<g transform="translate(${head[0].toFixed(1)} ${head[1].toFixed(1)}) rotate(${s.lean + s.tilt}) scale(1.1)">${headArt(slot, color, glow, s.face, s.flow)}</g>`
  );
}

/** Estrelinha amarela de tontura. */
function star(x: number, y: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
  });
  return outlined(`M${pts.join(' L')} Z`, PALETTE.amarelo, 3.5);
}

/** Derrubado: deitado de costas, olhos em X, língua de fora e estrelinhas girando. */
function knockedDown(slot: number, color: string): string {
  const lying: Skeleton = { hip: [100, 210], lean: 0, legs: [[-8, 4], [12, 24]], arms: [[-40, -10], [50, 80]], tilt: -10, face: 'tonto', flow: 0 };
  return (
    `<ellipse cx="100" cy="292" rx="86" ry="8" fill="${INK}" opacity="0.16"/>` +
    `<g transform="translate(196 262) rotate(-90) scale(0.56) translate(-100 -290)">${figure(slot, color, lying, false)}</g>` +
    star(36, 196, 11) +
    star(64, 182, 8) +
    star(14, 214, 7)
  );
}

/** SVG de um riscote numa pose (viewBox 200 × 340; pés em y ≈ 290; olhando para a direita). */
export function riscoteSvg(slot: number, color: string, pose: Pose, variant = 0): string {
  if (pose === 'derrubado') return svgDoc(VIEWBOX, knockedDown(slot, color), variant);
  const s = pose.startsWith('corre') ? runSkeleton(Number(pose.slice(5))) : SKELETONS[pose as keyof typeof SKELETONS];
  const air = pose === 'pulando' || pose === 'caindo' || pose === 'caindo1' || pose === 'topo';
  return svgDoc(VIEWBOX, figure(slot, color, s, !air), variant);
}
