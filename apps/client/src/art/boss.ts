import { BOSS_RULES, TILE } from '@riscote/shared';
import { BOIL, INK, PALETTE, WHITE, blush, eye, line, openMouth, outlined, oval, shine, svgDoc } from './svg';
import type { PeleChefe } from './pele';
import { GIZ_CHEFE } from './giz';
import { boilKey, vestir, type ArtSpec } from './textures';

// O Mata-Borrão em cartum: mata-borrão de mesa vivo, com o feltro verde na base que balança,
// o bloco de madeira cereja com a cara e o puxador laranja no alto (olhando para a direita).
// Quadro de 300 × 225 unidades = a caixa do chefe (4 × 3 células); o puxador passa por cima.
// Cor chapada com um tom de sombra; o azul do encharcado aparece só quando ele fica pesado.

export const BOSS_VB = '-12 -46 324 276';
/** Ponto de apoio: o meio da base, no chão. */
export const BOSS_ANCHOR: [number, number] = [150, 225];
/** Unidades do SVG por largura da caixa. */
export const BOSS_UNITS = 300;

const LW = 7;
const FELT = '#4fae3a';
const FELT_SHADE = '#3a8a2a';
const FELT_LIGHT = '#c8e85a';
const WOOD = '#d8323f';
const WOOD_SHADE = '#a01f30';
const WOOD_LIGHT = '#f2752c';
const KNOB = '#f2752c';
const KNOB_SHADE = '#c4521c';
const SOAK = PALETTE.azul;

export const BOSS_POSES = ['parado', 'raiva', 'salto', 'grito', 'pesado', 'golpe', 'derrota'] as const;
export type BossPose = (typeof BOSS_POSES)[number];

const FELT_PATH = 'M10 118 Q16 222 150 223 Q284 222 290 118 Z';
const WOOD_PATH = 'M16 40 Q150 26 284 40 L292 128 Q150 140 8 128 Z';
const EYES: Array<[number, number]> = [
  [168, 84],
  [236, 82],
];

/** Olhos grandes (legíveis no tamanho do jogo), um jeito por pose. */
function eyes(pose: BossPose): string {
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  switch (pose) {
    case 'golpe':
      // Olhos espremidos de dor: > <.
      return line(`M${lx - 16} ${ly - 13} L${lx + 10} ${ly} L${lx - 16} ${ly + 13} M${rx + 16} ${ry - 13} L${rx - 10} ${ry} L${rx + 16} ${ry + 13}`, 8);
    case 'derrota':
      return EYES.map(([x, y]) => spiral(x, y)).join('');
    case 'raiva':
      return eye(lx, ly + 2, 20, 16, [0.6, 0.3], 0.5, 5) + eye(rx, ry + 2, 20, 16, [0.6, 0.3], 0.5, 5);
    case 'salto':
      return eye(lx, ly - 2, 22, 25, [0.5, -0.5], 0.48, 5) + eye(rx, ry - 2, 22, 25, [0.5, -0.5], 0.48, 5);
    case 'grito':
      return eye(lx, ly - 2, 23, 25, [0.2, 0], 0.32, 5) + eye(rx, ry - 2, 23, 25, [0.2, 0], 0.32, 5);
    case 'pesado':
      // Pálpebra caída: tinta demais para manter os olhos abertos.
      return EYES.map(
        ([x, y]) =>
          eye(x, y, 21, 20, [0.2, 0.7], 0.5, 5) +
          outlined(`M${x - 23} ${y + 4} Q${x - 22} ${y - 22} ${x} ${y - 22} Q${x + 22} ${y - 22} ${x + 23} ${y + 4} Q${x} ${y - 2} ${x - 23} ${y + 4} Z`, WOOD_SHADE, 5),
      ).join('');
    default:
      return eye(lx, ly, 21, 20, [0.6, 0.15], 0.52, 5) + eye(rx, ry, 21, 20, [0.6, 0.15], 0.52, 5);
  }
}

/** Olho em espiral (derrotado). */
function spiral(x: number, y: number): string {
  return (
    oval(x, y, 20, 20, WHITE, 5) +
    line(`M${x} ${y} Q${x + 6} ${y - 2} ${x + 5} ${y + 5} Q${x} ${y + 12} ${x - 8} ${y + 4} Q${x - 12} ${y - 8} ${x} ${y - 11} Q${x + 13} ${y - 10} ${x + 13} ${y + 2}`, 4)
  );
}

/** Sobrancelhas grossas: franzidas na raiva, erguidas no salto e no grito, caídas no peso. */
function brows(pose: BossPose): string {
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  switch (pose) {
    case 'raiva':
      return line(`M${lx - 26} ${ly - 34} L${lx + 20} ${ly - 14} M${rx + 26} ${ry - 34} L${rx - 20} ${ry - 14}`, 11);
    case 'salto':
    case 'grito':
      return line(`M${lx - 24} ${ly - 38} Q${lx} ${ly - 52} ${lx + 22} ${ly - 40} M${rx - 22} ${ry - 40} Q${rx} ${ry - 52} ${rx + 24} ${ry - 38}`, 10);
    case 'pesado':
      return line(`M${lx - 24} ${ly - 26} L${lx + 20} ${ly - 34} M${rx - 20} ${ry - 34} L${rx + 24} ${ry - 26}`, 9);
    case 'golpe':
      return line(`M${lx - 24} ${ly - 30} L${lx + 14} ${ly - 22} M${rx - 14} ${ry - 22} L${rx + 24} ${ry - 30}`, 9);
    case 'derrota':
      return line(`M${lx - 22} ${ly - 30} L${lx + 18} ${ly - 36} M${rx - 18} ${ry - 36} L${rx + 22} ${ry - 30}`, 8);
    default:
      // Um sorriso de quem manda: uma sobrancelha erguida.
      return line(`M${lx - 22} ${ly - 30} L${lx + 18} ${ly - 26} M${rx - 20} ${ry - 32} Q${rx} ${ry - 44} ${rx + 24} ${ry - 36}`, 9);
  }
}

/** Boca larga no feltro, logo abaixo da madeira. */
function mouth(pose: BossPose): string {
  switch (pose) {
    case 'grito':
      return (
        openMouth('M146 146 Q204 134 262 144 Q258 222 204 222 Q150 220 146 146 Z', [204, 214, 30], 6) +
        outlined('M152 147 L162 164 L174 150 L186 166 L198 150 L210 166 L222 150 L234 166 L246 150 L256 148 Q204 136 152 147 Z', WHITE, 4)
      );
    case 'salto':
      return (
        openMouth('M152 148 Q204 138 258 146 Q252 200 204 200 Q158 198 152 148 Z', [206, 192, 22], 6) +
        outlined('M160 149 L250 147 L248 160 Q204 166 162 162 Z', WHITE, 4)
      );
    case 'raiva':
      // Dentes cerrados.
      return (
        outlined('M150 150 Q204 138 258 148 L254 180 Q204 192 154 182 Z', WHITE, 6) +
        line('M172 146 L172 186 M190 143 L190 189 M208 142 L208 190 M226 143 L226 188 M244 146 L244 184 M152 166 Q204 158 256 164', 4)
      );
    case 'pesado':
      return line('M156 170 Q168 158 180 170 Q192 182 204 170 Q216 158 228 170 Q240 182 252 168', 7);
    case 'golpe':
      return openMouth('M186 158 Q204 148 222 158 Q226 184 204 186 Q182 184 186 158 Z', [204, 184, 12], 6);
    case 'derrota':
      return line('M154 170 Q204 150 254 172', 7) + outlined('M212 166 Q212 198 228 196 Q242 192 234 164 Z', PALETTE.lingua, 5);
    default:
      // Sorrisão confiante com um dente para fora.
      return outlined('M150 160 Q204 194 260 156 Q240 182 204 184 Q166 184 150 160 Z', PALETTE.vermelhoBoca, 6) + outlined('M226 170 L232 186 L240 168 Z', WHITE, 4);
  }
}

/** Extras de emoção: veia de raiva, gotas de suor, estrelinhas e a tinta escorrendo. */
function extras(pose: BossPose): string {
  switch (pose) {
    case 'raiva':
      return (
        // Veia de raiva na testa de madeira.
        line('M92 56 Q102 56 102 46 M112 46 Q112 56 122 56 M122 66 Q112 66 112 76 M102 76 Q102 66 92 66', 6, '#ffd2c2') +
        blush(140, 118, 16, 0.7) +
        blush(272, 114, 12, 0.7)
      );
    case 'grito':
    case 'salto':
      return line('M296 60 L312 52 M298 84 L316 84 M296 108 L312 116', 6);
    case 'pesado':
      return (
        outlined('M120 64 Q128 78 128 84 A8 8 0 1 1 112 84 Q112 78 120 64 Z', '#bfe3ff', 4) +
        outlined('M282 70 Q288 80 288 84 A6 6 0 1 1 276 84 Q276 80 282 70 Z', '#bfe3ff', 3.5)
      );
    case 'golpe':
      return star(126, 30, 14) + star(276, 24, 11) + star(300, 66, 9);
    case 'derrota':
      return star(110, 20, 12) + star(150, -8, 9) + star(190, 14, 11);
    default:
      return blush(140, 118, 14) + blush(274, 114, 11);
  }
}

function star(x: number, y: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
  });
  return outlined(`M${pts.join(' L')} Z`, PALETTE.amarelo, 4);
}

/** Manchas antigas no feltro: tudo o que ele já secou. */
const STAINS =
  `<ellipse cx="62" cy="176" rx="20" ry="11" fill="${FELT_SHADE}"/>` +
  `<ellipse cx="108" cy="204" rx="12" ry="7" fill="${FELT_SHADE}"/>` +
  `<ellipse cx="40" cy="146" rx="9" ry="6" fill="${INK}" opacity="0.35"/>` +
  `<ellipse cx="272" cy="186" rx="10" ry="7" fill="${FELT_SHADE}"/>`;

/** O chefe numa pose. */
export function mataBorraoSvg(pose: BossPose, variant = 0): string {
  const heavy = pose === 'pesado';
  const felt = heavy ? SOAK : FELT;
  const feltShade = heavy ? '#2456ad' : FELT_SHADE;
  // Pesado: a tinta pinga do feltro em gotas (desenhadas na frente da base).
  const drop = (x: number, y: number, r: number) => outlined(`M${x} ${y - r * 2.2} Q${x + r} ${y - r * 0.6} ${x + r} ${y} A${r} ${r} 0 1 1 ${x - r} ${y} Q${x - r} ${y - r * 0.6} ${x} ${y - r * 2.2} Z`, SOAK, 4);
  const drips = heavy ? drop(70, 230, 7) + drop(128, 240, 8) + drop(206, 238, 7) + drop(256, 226, 6) : '';
  return svgDoc(
    BOSS_VB,
    `<ellipse cx="150" cy="226" rx="140" ry="10" fill="${INK}" opacity="0.18"/>` +
      // Feltro (papel mata-borrão) na base curva, com a sombra embaixo e o brilho lima no alto.
      outlined(FELT_PATH, felt, LW) +
      `<path d="M22 168 Q60 214 150 216 Q240 214 278 168 Q262 206 150 214 Q38 206 22 168 Z" fill="${feltShade}"/>` +
      (heavy ? '' : STAINS) +
      line('M30 140 Q38 176 70 196', 6, heavy ? '#8fc0ff' : FELT_LIGHT) +
      `<path d="${FELT_PATH}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      drips +
      // Bloco de madeira com veios.
      outlined(WOOD_PATH, WOOD, LW) +
      `<path d="M12 108 Q150 120 290 108 L292 128 Q150 140 8 128 Z" fill="${WOOD_SHADE}"/>` +
      line('M30 70 Q60 66 82 72 M40 100 Q66 96 96 102 M250 112 Q266 108 282 112', 4, WOOD_SHADE) +
      `<path d="${WOOD_PATH}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      line('M30 48 Q150 36 270 48', 6, WOOD_LIGHT) +
      // Puxador: haste e botão no alto, como um topete.
      outlined('M134 36 L137 -4 Q150 -10 163 -4 L166 36 Z', WOOD_SHADE, 6) +
      oval(150, -20, 36, 22, KNOB, LW) +
      `<path d="M118 -14 Q150 6 182 -14 Q176 0 150 1 Q124 0 118 -14 Z" fill="${KNOB_SHADE}"/>` +
      `<ellipse cx="150" cy="-20" rx="36" ry="22" fill="none" stroke="${INK}" stroke-width="${LW}"/>` +
      shine('M128 -28 Q140 -38 158 -37', 5, 0.8) +
      eyes(pose) +
      brows(pose) +
      mouth(pose) +
      extras(pose),
    variant,
  );
}

/** Onda de secagem correndo para a direita: crista de papel com espuma, riscos de velocidade atrás. */
export function ondaSvg(variant = 0): string {
  return svgDoc(
    '-34 -30 46 32',
    line('M-32 -12 L-24 -12 M-33 -5 L-22 -5', 1.8) +
      outlined('M-28 0 Q-16 -4 -8 -13 Q0 -26 9 -19 Q13 -13 7 -10 Q1 -10 3 -4 Q5 0 10 0 Z', '#f1dfb4', 2.2) +
      `<path d="M-24 -1 Q-14 -4 -8 -9 Q-4 -4 -2 -1 Z" fill="#d9bf86"/>` +
      outlined('M-28 0 Q-16 -4 -8 -13 Q0 -26 9 -19 Q13 -13 7 -10 Q1 -10 3 -4 Q5 0 10 0 Z', 'none', 2.2) +
      `<circle cx="2" cy="-15" r="1.6" fill="${INK}"/><circle cx="6.5" cy="-15.5" r="1.4" fill="${INK}"/>` +
      line('M0 -19 L4 -17.5 M5.5 -17.5 L9 -19.5', 1.1) +
      shine('M-6 -13 Q0 -20 4 -17', 1.4),
    variant,
  );
}

/** Borrão da chuva: gota grande de nanquim caindo, com a ponta para cima e cara de travessa. */
export function borraoGotaSvg(variant = 0): string {
  return svgDoc(
    '-14 -26 28 40',
    outlined('M0 -24 Q4 -10 11 0 A11 11 0 1 1 -11 0 Q-4 -10 0 -24 Z', '#2b2050', 2.4) +
      `<path d="M4 -6 Q11 0 10 6 Q8 10 3 10 Q9 4 4 -6 Z" fill="#4a3a8a"/>` +
      shine('M-6 -4 Q-7 2 -4 5', 1.8) +
      `<ellipse cx="-3" cy="3" rx="2.6" ry="3" fill="${WHITE}"/><ellipse cx="4" cy="3" rx="2.6" ry="3" fill="${WHITE}"/>` +
      `<circle cx="-2.4" cy="3.6" r="1.4" fill="#d7261e"/><circle cx="4.6" cy="3.6" r="1.4" fill="#d7261e"/>` +
      line('M-6 -1 L-1 1 M7 -1 L2 1', 1.3, WHITE) +
      line('M-2 8 Q1 10 4 8', 1.2, WHITE),
    variant,
  );
}

function at(key: string, svg: string, k: number, ax: number, ay: number): ArtSpec {
  const [x, y, w, h] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 1 1').split(' ').map(Number) as [number, number, number, number];
  return { key, svg, k, ox: (ax - x) / w, oy: (ay - y) / h };
}

/** Desenhos do chefe do capítulo, só carregados na página dele. */
export function bossSpecs(chefe: PeleChefe): ArtSpec[] {
  const specs: ArtSpec[] = [];
  const k = (BOSS_RULES.width * TILE) / BOSS_UNITS;
  for (let v = 0; v < BOIL; v++) {
    // O corpo leva o giz (GIZ_CHEFE); onda, chuva e golpe ficam limpos, para o aviso ler bem.
    for (const pose of BOSS_POSES) specs.push({ ...at(boilKey(`chefe-${pose}`, v), chefe.chefe(pose, v), k, ...BOSS_ANCHOR), giz: GIZ_CHEFE });
    specs.push(at(boilKey('chefe-onda', v), chefe.onda(v), 0.5, 2, 0));
    specs.push(at(boilKey('chefe-borrao', v), chefe.chuva(v), (BOSS_RULES.rainSize * TILE) / 22, 0, 0));
    // A apara (quadro de 48 unidades) com a largura da caixa dela.
    if (chefe.golpe) specs.push(at(boilKey('chefe-apara', v), chefe.golpe(v), (BOSS_RULES.shavingWidth * TILE) / 44, 0, 0));
  }
  return vestir(specs, chefe.id);
}
