import { BOSS_RULES, TILE } from '@riscote/shared';
import { BOIL, INK, PAPER, stroke, svgDoc } from './svg';
import { boilKey, type ArtSpec } from './textures';

// O Mata-Borrão: mata-borrão de mesa vivo, com o feltro manchado na base que balança,
// o bloco de madeira com a cara e o puxador no alto (olhando para a direita).
// Quadro de 300 × 225 unidades = a caixa do chefe (4 × 3 células); o puxador passa por cima.

export const BOSS_VB = '-12 -46 324 276';
/** Ponto de apoio: o meio da base, no chão. */
export const BOSS_ANCHOR: [number, number] = [150, 225];
/** Unidades do SVG por largura da caixa. */
export const BOSS_UNITS = 300;

const FELT = '#e6cbbb';
const FELT_DARK = '#b99282';
const WOOD = '#8a5a34';
const WOOD_DARK = '#5a371d';
const KNOB = '#6b4325';
const SOAK = '#2f6fd6';
const MOUTH = '#7d2219';

export const BOSS_POSES = ['parado', 'raiva', 'salto', 'grito', 'pesado', 'golpe', 'derrota'] as const;
export type BossPose = (typeof BOSS_POSES)[number];

const FELT_PATH = 'M10 118 Q16 222 150 223 Q284 222 290 118 Z';
const WOOD_PATH = 'M16 40 Q150 26 284 40 L292 128 Q150 140 8 128 Z';
const EYES: Array<[number, number]> = [
  [168, 84],
  [234, 82],
];

/** Olhos grandes (legíveis no tamanho do jogo): abertos, espremidos, em X ou de pálpebra caída. */
function eyes(pose: BossPose): string {
  if (pose === 'golpe') {
    return EYES.map(([x, y]) => `<path d="M${x - 16} ${y - 12} L${x + 12} ${y} L${x - 16} ${y + 12}" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  }
  if (pose === 'derrota') {
    return EYES.map(([x, y]) => `<path d="M${x - 14} ${y - 13} L${x + 14} ${y + 13} M${x + 14} ${y - 13} L${x - 14} ${y + 13}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`).join('');
  }
  const wide = pose === 'salto' || pose === 'grito';
  const ry = wide ? 25 : 20;
  let out = '';
  for (const [x, y] of EYES) {
    out += `<ellipse cx="${x}" cy="${y}" rx="22" ry="${ry}" fill="${PAPER}" stroke="${INK}" stroke-width="4" filter="url(#tinta)"/>`;
    out += `<circle cx="${x + 7}" cy="${y + (pose === 'pesado' ? 7 : 2)}" r="${wide ? 7 : 10}" fill="${INK}"/>`;
    out += `<circle cx="${x + 10}" cy="${y - 3}" r="3" fill="${PAPER}"/>`;
    // Pálpebra pesada: tinta demais para manter os olhos abertos.
    if (pose === 'pesado') out += `<path d="M${x - 24} ${y + 2} Q${x} ${y - 30} ${x + 24} ${y + 2} Z" fill="${WOOD_DARK}" stroke="${INK}" stroke-width="3.5"/>`;
  }
  return out;
}

/** Sobrancelhas grossas de pincel: franzidas no aviso, erguidas no salto, caídas no peso. */
function brows(pose: BossPose): string {
  if (pose === 'derrota' || pose === 'golpe') return '';
  const tilt = pose === 'raiva' || pose === 'grito' ? 24 : pose === 'salto' ? -10 : pose === 'pesado' ? -16 : 12;
  const lift = pose === 'salto' ? -8 : 0;
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  return stroke(lx - 26, ly - 30 + lift, -90 + tilt, 2.2, 0.5, INK, 'seco') + stroke(rx + 26, ry - 30 + lift, 90 - tilt, 2.2, 0.5, INK, 'seco');
}

/** Boca larga no feltro, logo abaixo da madeira. */
function mouth(pose: BossPose): string {
  switch (pose) {
    case 'grito':
    case 'salto':
      return (
        `<path d="M150 146 Q200 ${pose === 'grito' ? 222 : 200} 258 144 Q204 158 150 146 Z" fill="${MOUTH}" stroke="${INK}" stroke-width="5" filter="url(#tinta)"/>` +
        `<path d="M158 149 L166 162 L176 151 L186 164 L196 153 L206 165 L216 153 L226 164 L236 152 L246 161 L252 148 Z" fill="${PAPER}"/>`
      );
    case 'raiva':
      return (
        `<path d="M150 152 Q202 138 256 150 L253 176 Q202 188 153 178 Z" fill="${PAPER}" stroke="${INK}" stroke-width="5" filter="url(#tinta)"/>` +
        `<path d="M168 148 L168 182 M186 145 L186 185 M204 144 L204 186 M222 145 L222 184 M240 148 L240 180 M151 165 Q202 158 255 163" stroke="${INK}" stroke-width="3" fill="none"/>`
      );
    case 'pesado':
      return `<path d="M156 170 Q168 158 180 170 Q192 182 204 170 Q216 158 228 170 Q240 182 252 168" stroke="${INK}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
    case 'golpe':
      return `<ellipse cx="204" cy="168" rx="20" ry="15" fill="${MOUTH}" stroke="${INK}" stroke-width="4.5"/>`;
    case 'derrota':
      return (
        `<path d="M154 164 Q204 148 254 168" stroke="${INK}" stroke-width="5.5" fill="none" stroke-linecap="round"/>` +
        `<path d="M210 160 Q212 194 228 190 Q242 184 232 162" fill="#d0574a" stroke="${INK}" stroke-width="3.5"/>`
      );
    default:
      return (
        `<path d="M152 172 Q204 146 256 164" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
        `<path d="M232 160 L238 174 L245 162" fill="${PAPER}" stroke="${INK}" stroke-width="2.4"/>`
      );
  }
}

/** Manchas antigas no feltro: tudo o que ele já secou. */
const STAINS =
  `<ellipse cx="62" cy="172" rx="20" ry="11" fill="${INK}" opacity="0.55" filter="url(#borra)"/>` +
  `<ellipse cx="112" cy="204" rx="12" ry="7" fill="${INK}" opacity="0.45" filter="url(#borra)"/>` +
  `<ellipse cx="38" cy="144" rx="9" ry="6" fill="${SOAK}" opacity="0.5" filter="url(#borra)"/>` +
  `<ellipse cx="270" cy="186" rx="10" ry="7" fill="${INK}" opacity="0.4" filter="url(#borra)"/>` +
  `<path d="M150 204 Q170 196 162 214" stroke="${SOAK}" stroke-width="3" fill="none" opacity="0.45"/>`;

/** O chefe numa pose; a linha viva troca só a semente dos filtros. */
export function mataBorraoSvg(pose: BossPose, variant = 0): string {
  const heavy = pose === 'pesado';
  const soakLayer = heavy
    ? `<path d="${FELT_PATH}" fill="${SOAK}" opacity="0.8" filter="url(#tecido)"/>` +
      `<path d="M60 218 Q62 240 67 230 M120 222 Q122 248 128 234 M196 222 Q198 244 203 232 M250 212 Q252 230 257 222" stroke="${SOAK}" stroke-width="6" fill="none" stroke-linecap="round"/>`
    : '';
  return svgDoc(
    BOSS_VB,
    `<clipPath id="feltro-baixo"><path d="M0 170 Q150 200 300 170 L300 232 L0 232 Z"/></clipPath>` +
      // Feltro (papel mata-borrão) na base curva, com as pontas presas na madeira.
      `<path d="${FELT_PATH}" fill="${FELT}" filter="url(#tecido)"/>` +
      STAINS +
      `<path d="${FELT_PATH}" fill="url(#hachura-fina)" opacity="0.3" clip-path="url(#feltro-baixo)"/>` +
      soakLayer +
      `<path d="${FELT_PATH}" fill="none" stroke="${INK}" stroke-width="6" filter="url(#tinta)"/>` +
      `<path d="M26 136 Q32 190 90 212" stroke="${FELT_DARK}" stroke-width="4" fill="none" opacity="0.7"/>` +
      // Bloco de madeira com veios.
      `<path d="${WOOD_PATH}" fill="${WOOD}" filter="url(#tecido)"/>` +
      stroke(24, 58, -90, 0.4, 1.1, WOOD_DARK, 'seco', 0.8) +
      stroke(26, 112, -88, 0.35, 1, WOOD_DARK, 'seco', 0.7) +
      `<path d="${WOOD_PATH}" fill="none" stroke="${INK}" stroke-width="5.5" filter="url(#tinta)"/>` +
      `<path d="M28 48 Q150 36 272 48" stroke="${PAPER}" stroke-width="3" fill="none" opacity="0.45" stroke-linecap="round"/>` +
      // Puxador: haste e botão no alto, como um topete.
      `<path d="M134 34 L137 -4 Q150 -10 163 -4 L166 34 Z" fill="${WOOD_DARK}" stroke="${INK}" stroke-width="4" filter="url(#tinta)"/>` +
      `<ellipse cx="150" cy="-20" rx="36" ry="22" fill="${KNOB}" filter="url(#tecido)"/>` +
      `<ellipse cx="150" cy="-20" rx="36" ry="22" fill="none" stroke="${INK}" stroke-width="5" filter="url(#tinta)"/>` +
      `<path d="M128 -28 Q140 -38 158 -37" stroke="${PAPER}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.7"/>` +
      eyes(pose) +
      brows(pose) +
      mouth(pose) +
      (heavy ? `<circle cx="110" cy="96" r="4" fill="${SOAK}"/><circle cx="274" cy="112" r="3.4" fill="${SOAK}"/>` : ''),
    variant,
  );
}

/** Onda de secagem correndo para a direita: crista de fibras de papel, baixa, com o rastro seco atrás. */
export function ondaSvg(variant = 0): string {
  return svgDoc(
    '-34 -30 46 32',
    `<path d="M-30 0 Q-18 -6 -8 -14 Q0 -26 8 -18 Q12 -12 6 -10 Q0 -10 2 -4 Q4 0 10 0 Z" fill="#d8c39c" filter="url(#tecido)"/>` +
      `<path d="M-30 0 Q-18 -6 -8 -14 Q0 -26 8 -18 Q12 -12 6 -10 Q0 -10 2 -4 Q4 0 10 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" filter="url(#tinta)"/>` +
      stroke(-30, -2, -96, 0.35, 0.16, '#8f8169', 'seco') +
      stroke(-22, -6, -100, 0.3, 0.12, '#8f8169', 'seco') +
      `<path d="M-6 -12 Q0 -18 4 -15" stroke="${PAPER}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    variant,
  );
}

/** Borrão da chuva: gota grande de nanquim caindo, com a ponta para cima. */
export function borraoGotaSvg(variant = 0): string {
  return svgDoc(
    '-14 -26 28 40',
    `<path d="M0 -24 Q4 -10 11 0 A11 11 0 1 1 -11 0 Q-4 -10 0 -24 Z" fill="#0d0c0b" filter="url(#tinta)"/>` +
      `<path d="M-5 -2 Q-6 4 -2 7" stroke="${PAPER}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>`,
    variant,
  );
}

function at(key: string, svg: string, k: number, ax: number, ay: number): ArtSpec {
  const [x, y, w, h] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 1 1').split(' ').map(Number) as [number, number, number, number];
  return { key, svg, k, ox: (ax - x) / w, oy: (ay - y) / h };
}

/** Desenhos do chefe, só carregados na página dele (com as variações da linha viva). */
export function bossSpecs(): ArtSpec[] {
  const specs: ArtSpec[] = [];
  const k = (BOSS_RULES.width * TILE) / BOSS_UNITS;
  for (let v = 0; v < BOIL; v++) {
    for (const pose of BOSS_POSES) specs.push(at(boilKey(`chefe-${pose}`, v), mataBorraoSvg(pose, v), k, ...BOSS_ANCHOR));
    specs.push(at(boilKey('chefe-onda', v), ondaSvg(v), 0.5, 2, 0));
    specs.push(at(boilKey('chefe-borrao', v), borraoGotaSvg(v), (BOSS_RULES.rainSize * TILE) / 22, 0, 0));
  }
  return specs;
}
