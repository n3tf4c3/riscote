import { INK, PALETTE, WHITE, blush, eye, line, openMouth, outlined, oval, shine, svgDoc } from './svg';

// Inimigos em cartum (direção de 2026-10-31), olhando para a direita: cor chapada com uma segunda tinta
// de barriga ou sombra, contorno marinho de traço constante (~0,8 px no mundo, por isso a espessura
// muda com a escala de cada desenho) e uma emoção clara em cada um. O azul da tinta dos jogadores
// (SOAK) fica só para o encharcado, a bola, a gota e o respingo azul; o borrão segue quase preto.

const SOAK = PALETTE.azul;
const SOAK_LIGHT = '#8fb4f0';
const BORRAO = '#1a1424';
const BORRAO_SHEEN = '#6a3a9e';
const BORRAO_EYES = '#ff3b30';

/** Espessura de contorno para ~0,8 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.8 / k).toFixed(2);

/** Gotinhas de tinta azul pingando (camada do encharcado). */
function drips(points: ReadonlyArray<readonly [number, number, number]>): string {
  return points.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SOAK}"/>`).join('');
}

/** Camada do encharcado: a forma em azul com a borda de cima ondulada e um brilho. */
function soakLayer(d: string, glint: string, w: number): string {
  return `<path d="${d}" fill="${SOAK}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" opacity="0.92"/>` + shine(glint, w * 0.9, 0.7);
}

// ---------------------------------------------------------------- traça

export const TRACA_FRAMES = 3;
const TRACA_VB = '30 60 200 95';
const TRACA = '#e8247c';
const TRACA_BELLY = '#ffc23a';
const TRACA_LW = lw(0.19);
/** Segmentos do corpo, da cauda para o tórax: [cx, cy, rx, ry]. */
const SEGMENTS: Array<[number, number, number, number]> = [
  [62, 124, 12, 9],
  [82, 121, 14, 11],
  [104, 119, 15, 12.5],
  [126, 118, 15, 13],
];

/**
 * Traça: lagartinha de segmentos magenta com barriga amarela, seis patinhas em trípode alternado e
 * antenas de bolinha. Cara de travessa (sobrancelha erguida, sorriso torto com um dentinho);
 * `alert` é o aviso do bote: antenas em pé, sobrancelhas franzidas e boca aberta.
 */
export function tracaSvg(frame: number, variant = 0, alert = false): string {
  const t = (frame / TRACA_FRAMES) * Math.PI * 2;
  const bob = frame === 1 ? -2 : 0;
  const w = TRACA_LW;
  let legs = '';
  [66, 90, 114, 74, 98, 122].forEach((x, i) => {
    const swing = 9 * Math.sin(t + (i % 2) * Math.PI) * (i < 3 ? 1 : -1);
    legs += line(`M${x} 124 L${x + swing} 136 L${x + swing + 4} 146`, 5.5, i < 3 ? '#8e1650' : INK);
  });
  let body = '';
  for (const [cx, cy, rx, ry] of SEGMENTS) {
    body +=
      oval(cx, cy, rx, ry, TRACA, w) +
      `<ellipse cx="${cx}" cy="${cy + ry * 0.5}" rx="${rx * 0.7}" ry="${ry * 0.38}" fill="${TRACA_BELLY}"/>`;
  }
  const sway = 5 * Math.sin(t);
  const antennae = alert
    ? line('M154 90 Q156 76 164 62 M168 91 Q178 78 192 68', 4.5) + oval(164, 60, 6, 6, TRACA_BELLY, 3) + oval(193, 66, 6, 6, TRACA_BELLY, 3)
    : line(`M152 92 Q164 ${76 - sway} 180 ${70 - sway} M166 92 Q182 ${82 + sway} 200 ${78 + sway}`, 4.5) +
      oval(181, 70 - sway, 6, 6, TRACA_BELLY, 3) +
      oval(201, 78 + sway, 6, 6, TRACA_BELLY, 3);
  const face = alert
    ? eye(155, 108, 8.5, 8, [0.6, 0.2], 0.6, 3.2) +
      eye(174, 107, 7.5, 7.5, [0.6, 0.2], 0.6, 3.2) +
      line('M144 97 L162 103 M166 102 L182 95', 5) +
      openMouth('M157 120 Q172 116 184 118 Q182 134 171 134 Q160 133 157 120 Z', [171, 133, 7], 3.2)
    : eye(155, 106, 8.5, 10, [0.5, 0], 0.55, 3.2) +
      eye(174, 105, 7.5, 9.5, [0.5, 0], 0.55, 3.2) +
      line('M145 93 Q153 87 162 93 M167 95 L181 94', 4.5) +
      line('M156 121 Q170 128 183 116', 4.5) +
      outlined('M167 124 L167 130 L173 129 L173 123 Z', WHITE, 2.2);
  return svgDoc(
    TRACA_VB,
    `<ellipse cx="104" cy="149" rx="60" ry="5" fill="${INK}" opacity="0.14"/>` +
      `<g transform="translate(0 ${bob})">` +
      line(`M52 122 Q42 ${116 + sway} 36 ${108 + sway} M52 126 Q42 ${126 + sway} 34 ${122 + sway}`, 3.5) +
      legs +
      body +
      shine('M76 112 Q100 104 128 108', 3.5, 0.6) +
      oval(164, 110, 25, 22, TRACA, w) +
      shine('M146 98 Q150 92 157 90', 3.2, 0.75) +
      blush(146, 120, 5.5, 0.55) +
      face +
      antennae +
      `</g>`,
    variant,
  );
}

export function tracaSoakSvg(variant = 0): string {
  return svgDoc(
    TRACA_VB,
    soakLayer('M48 124 Q60 116 74 122 Q92 114 108 120 Q126 112 142 118 Q158 112 182 118 Q184 132 162 132 L60 132 Q48 132 48 124 Z', 'M64 124 Q80 120 96 122', TRACA_LW) +
      drips([[82, 138, 3], [118, 140, 2.4], [150, 137, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- saltador

const SALTADOR_VB = '60 40 84 110';
const BLOB = 'M104 54 Q132 56 133 86 Q134 114 104 116 Q74 116 73 88 Q72 66 88 59 Q93 49 104 54 Z';
const INDIGO = '#4b38c8';
const VIOLETA = '#c23ad6';
const SALT_LW = lw(0.3);

/**
 * Saltador: bolota índigo com barriga violeta, olhões bobos e sorriso de língua de fora; no ar encolhe
 * os pés e grita de alegria. `charge` é o aviso da pancada: sobrancelhas baixas e dentes cerrados.
 */
export function saltadorSvg(air: boolean, variant = 0, charge = false): string {
  const w = SALT_LW;
  const feet = air
    ? oval(90, 121, 7, 4.5, INDIGO, w) + oval(118, 121, 7, 4.5, INDIGO, w)
    : line('M92 112 L90 128 M116 112 L119 128', 6, INK) +
      line('M92 112 L90 128 M116 112 L119 128', 2.6, INDIGO) +
      oval(88, 131, 9, 4.5, INDIGO, w) +
      oval(121, 131, 9, 4.5, INDIGO, w);
  let face: string;
  if (charge) {
    face =
      eye(97, 82, 6, 4.8, [0.6, 0.3], 0.62, 2) +
      eye(115, 81, 7, 5.2, [0.6, 0.3], 0.62, 2) +
      line('M88 72 L103 79 M108 78 L124 70', 3.6) +
      outlined('M101 94 L125 92 L124 103 L102 104 Z', WHITE, 2) +
      line('M106 93.5 L106 104 M112 93 L112 104 M118 92.6 L118 103.5 M101.5 99 L124.5 97.5', 1.3);
  } else if (air) {
    face =
      eye(97, 79, 6.5, 8.5, [0.4, -0.4], 0.5, 2) +
      eye(115, 78, 7.5, 9.5, [0.4, -0.4], 0.5, 2) +
      line('M90 66 Q97 62 103 66 M109 64 Q116 59 123 63', 2.6) +
      openMouth('M102 93 Q114 90 124 92 Q122 106 113 106 Q104 105 102 93 Z', [113, 105, 6], 2);
  } else {
    face =
      eye(97, 81, 6.5, 8, [0.2, 0.1], 0.5, 2) +
      eye(115, 80, 7.5, 9, [-0.1, 0.2], 0.5, 2) +
      line('M91 69 Q97 66 103 69 M109 67 Q116 63 123 67', 2.4) +
      outlined('M101 94 Q113 104 126 92 Q122 101 113 103 Q104 103 101 94 Z', PALETTE.vermelhoBoca, 2) +
      outlined('M110 100 Q113 108 118 106 Q121 103 118 99 Z', PALETTE.lingua, 1.6);
  }
  return svgDoc(
    SALTADOR_VB,
    (air ? '' : `<ellipse cx="104" cy="135" rx="28" ry="3.5" fill="${INK}" opacity="0.14"/>`) +
      feet +
      `<clipPath id="barriga"><path d="${BLOB}"/></clipPath>` +
      `<path d="${BLOB}" fill="${INDIGO}"/>` +
      `<ellipse cx="108" cy="110" rx="24" ry="16" fill="${VIOLETA}" clip-path="url(#barriga)"/>` +
      `<path d="${BLOB}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M82 74 Q84 64 94 61', 3, 0.75) +
      `<circle cx="80" cy="82" r="1.6" fill="${WHITE}" opacity="0.7"/>` +
      blush(88, 92, 4.5, 0.6) +
      face,
    variant,
  );
}

export function saltadorSoakSvg(variant = 0): string {
  return svgDoc(
    SALTADOR_VB,
    soakLayer('M73 92 Q86 86 98 90 Q112 84 124 89 Q130 86 134 90 Q134 114 104 116 Q74 116 73 92 Z', 'M80 96 Q86 94 92 95', SALT_LW) +
      drips([[86, 123, 2.4], [116, 126, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- bola

/** Bola de tinta: o inimigo encharcado preso lá dentro, em pânico; rolando, o sprite gira. */
export function bolaSvg(variant = 0): string {
  const w = 2.1;
  return svgDoc(
    '-28 -28 56 56',
    `<clipPath id="lado"><circle r="22"/></clipPath>` +
      `<circle r="22" fill="${SOAK}"/>` +
      `<ellipse cx="6" cy="14" rx="24" ry="12" fill="#2257b0" clip-path="url(#lado)"/>` +
      `<circle r="22" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
      shine('M-15 -6 Q-9 -16 2 -17', 2.6, 0.9) +
      `<circle cx="-15" cy="1" r="1.4" fill="${WHITE}" opacity="0.85"/>` +
      eye(0, -1, 4.6, 5.6, [0, 0], 0.32, 1.3) +
      eye(11, -2, 4.2, 5.4, [0, 0], 0.32, 1.3) +
      line('M-5 -9 Q0 -11 4 -8 M8 -9 Q12 -12 16 -9', 1.4) +
      outlined('M1 7 Q4 4 7 6 Q10 4 13 7 Q12 12 7 12 Q2 12 1 7 Z', PALETTE.vermelhoBoca, 1.2) +
      `<path d="M-9 -12 Q-11 -8 -9 -6 Q-7 -8 -9 -12 Z" fill="${WHITE}" stroke="${INK}" stroke-width="0.9"/>`,
    variant,
  );
}

// ---------------------------------------------------------------- borrão e mancha

/** Borrão: mancha de nanquim que escorre, olhos vermelhos acesos e sorriso cheio de dentes — perigo que não se derrota. */
export function borraoSvg(variant = 0): string {
  const body =
    'M100 22 Q146 20 152 60 Q160 96 136 108 Q132 124 126 108 Q112 116 104 112 Q100 128 94 112 Q80 116 72 108 Q66 122 62 104 Q40 96 48 62 Q54 24 100 22 Z';
  const w = lw(0.3);
  return svgDoc(
    '20 0 160 140',
    `<path d="${body}" fill="${BORRAO_SHEEN}" opacity="0.35" transform="translate(100 66) scale(1.12) translate(-100 -66)"/>` +
      `<path d="${body}" fill="${BORRAO}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M66 50 Q74 34 94 30', 4, 0.5).replace(WHITE, BORRAO_SHEEN) +
      shine('M140 58 Q144 70 142 82', 3, 0.6).replace(WHITE, BORRAO_SHEEN) +
      `<ellipse cx="88" cy="60" rx="15" ry="10" fill="${BORRAO_EYES}" opacity="0.3"/><ellipse cx="117" cy="60" rx="15" ry="10" fill="${BORRAO_EYES}" opacity="0.3"/>` +
      `<path d="M78 58 Q88 50 99 60 Q88 66 78 58 Z M106 60 Q117 50 127 58 Q117 66 106 60 Z" fill="${BORRAO_EYES}" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="92" cy="59" r="2.4" fill="#ffe08a"/><circle cx="114" cy="59" r="2.4" fill="#ffe08a"/>` +
      line('M74 48 L98 56 M131 48 L107 56', 4.5, '#000000') +
      `<path d="M76 78 Q102 74 130 78 Q122 98 103 98 Q84 98 76 78 Z" fill="#3b0d1a" stroke="${INK}" stroke-width="1.5"/>` +
      `<path d="M78 79 L84 88 L90 78 L96 89 L102 77 L108 89 L114 78 L120 88 L127 79 Z" fill="${WHITE}"/>` +
      `<path d="M86 96 L91 89 L96 97 Z M104 98 L109 90 L114 97 Z" fill="${WHITE}"/>` +
      `<circle cx="40" cy="44" r="3.4" fill="${BORRAO}"/><circle cx="164" cy="40" r="2.6" fill="${BORRAO}"/><circle cx="34" cy="96" r="2" fill="${BORRAO}"/>`,
    variant,
  );
}

/** Mancha do borrão: poça de nanquim no chão, com olhinhos vermelhos meio fechados e um sorriso sorrateiro — encostar derruba. */
export function manchaSvg(variant = 0): string {
  const blob = 'M0 -20 Q16 -24 22 -10 Q30 0 22 10 Q18 22 2 20 Q-12 26 -20 14 Q-30 2 -22 -10 Q-16 -22 0 -20 Z';
  return svgDoc(
    '-34 -34 68 68',
    `<path d="${blob}" fill="${BORRAO_SHEEN}" opacity="0.35" transform="scale(1.16)"/>` +
      `<path d="${blob}" fill="${BORRAO}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<path d="M-14 -10 Q-8 -17 2 -16" fill="none" stroke="${BORRAO_SHEEN}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<circle cx="-27" cy="-14" r="2.4" fill="${BORRAO}"/><circle cx="26" cy="18" r="2" fill="${BORRAO}"/><circle cx="-4" cy="28" r="1.6" fill="${BORRAO}"/>` +
      `<path d="M-12 -2 Q-6 -6 0 -2 Q-6 1 -12 -2 Z M4 -2 Q10 -6 16 -2 Q10 1 4 -2 Z" fill="${BORRAO_EYES}"/>` +
      line('M-13 -6 L-1 -4 M3 -4 L16 -7', 2, '#000000') +
      line('M-6 8 Q2 12 12 6', 1.8, BORRAO_SHEEN),
    variant,
  );
}

// ---------------------------------------------------------------- grampo

export const GRAMPO_FRAMES = 3;
const GRAMPO_VB = '4 6 92 86';
const GRAMPO_VERDE = '#2fb64a';
const GRAMPO_PETROLEO = '#16577e';
const GRAMPO_LW = lw(0.24);

/**
 * Grampo: um grampo de papel dobrado em arco, de arame verde com sombra azul-petróleo, correndo nas
 * duas pontas. Ranzinza: pálpebra caída, sobrancelha franzida e boca torta. `frame` troca as pernas.
 */
export function grampoSvg(frame: number, variant = 0): string {
  const swing = [-8, 0, 8][frame % GRAMPO_FRAMES]!;
  const wire = `M${24 + swing} 84 L27 42 Q27 22 44 22 L56 22 Q73 22 73 42 L${76 - swing} 84`;
  const w = GRAMPO_LW;
  return svgDoc(
    GRAMPO_VB,
    `<ellipse cx="50" cy="89" rx="34" ry="3" fill="${INK}" opacity="0.14"/>` +
      // Papel preso no grampo: é ali que fica o rosto.
      outlined('M31 74 L31 42 Q31 30 44 30 L56 30 Q69 30 69 42 L69 74 Q50 79 31 74 Z', '#eaf7e4', w * 0.8) +
      line('M35 46 L65 46 M35 58 L65 58', 1.4, '#b8dcae') +
      `<path d="${wire}" fill="none" stroke="${INK}" stroke-width="${11 + w * 2}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${wire}" fill="none" stroke="${GRAMPO_VERDE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${wire}" fill="none" stroke="${GRAMPO_PETROLEO}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(2 2.5)"/>` +
      shine('M27 44 Q27 27 42 25', 2.6, 0.8) +
      oval(21 + swing, 86, 7, 3.5, INK, 0) +
      oval(79 - swing, 86, 7, 3.5, INK, 0) +
      // Olhos de pálpebra caída.
      eye(44, 42, 5, 5.5, [0.4, 0.3], 0.55, 1.6) +
      eye(58, 42, 5, 5.5, [0.4, 0.3], 0.55, 1.6) +
      `<path d="M38.5 41 Q44 35 49.5 41 Z M52.5 41 Q58 35 63.5 41 Z" fill="${GRAMPO_VERDE}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
      line('M38 35 L49 38 M64 34 L53 38', 2.6) +
      line('M44 56 Q51 52 59 56 L61 55', 2.4),
    variant,
  );
}

export function grampoSoakSvg(variant = 0): string {
  return svgDoc(
    GRAMPO_VB,
    soakLayer('M18 64 Q25 60 33 64 L33 82 Q33 90 25 90 Q17 90 17 82 Z', 'M21 68 L21 76', GRAMPO_LW) +
      soakLayer('M67 64 Q75 60 83 64 L83 82 Q83 90 75 90 Q67 90 67 82 Z', 'M71 68 L71 76', GRAMPO_LW),
    variant,
  );
}

// ---------------------------------------------------------------- fiandeira

const FIANDEIRA_VB = '-6 0 112 104';
const ARANHA = '#f0402a';
const ARANHA_ESCURA = '#8a1838';
const ARANHA_LW = lw(0.42);

/**
 * Fiandeira: aranha de cabeça vermelha e abdômen bordô com a marca amarela, oito patas finas de joelho
 * alto. Matreira: olhos meio fechados olhando de lado, cílios e um sorriso de canto.
 * `frame` alterna as patas (balanço no fio ou passo no chão). Centro do corpo em (50, 52).
 */
export function fiandeiraSvg(frame: number, variant = 0): string {
  const k = frame % 2 === 0 ? 1 : -1;
  const w = ARANHA_LW;
  let legs = '';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const wob = k * (i % 2 === 0 ? 4 : -4);
      const hx = 50 + side * 9;
      const hy = 50 + i * 5;
      const kx = 50 + side * (24 + i * 3);
      const ky = 34 + i * 9 + wob;
      const fx = 50 + side * (32 + i * 6);
      const fy = 58 + i * 11 + wob;
      const d = `M${hx} ${hy} L${kx} ${ky} L${fx} ${fy}`;
      legs += line(d, 3 + w * 2, INK) + line(d, 3, ARANHA_ESCURA);
    }
  }
  return svgDoc(
    FIANDEIRA_VB,
    legs +
      oval(50, 64, 17, 15, ARANHA_ESCURA, w) +
      outlined('M44 60 L50 54 L56 60 L50 70 Z', PALETTE.amarelo, 1.2) +
      shine('M38 58 Q40 52 45 51', 2, 0.6) +
      oval(50, 41, 15, 13, ARANHA, w) +
      shine('M39 36 Q42 31 48 30', 2, 0.75) +
      eye(45, 40, 4.6, 4.8, [0.7, 0.2], 0.6, 1.3) +
      eye(56, 40, 4.6, 4.8, [0.7, 0.2], 0.6, 1.3) +
      `<path d="M40.2 39 Q45 33 49.8 39 Z M51.2 39 Q56 33 60.8 39 Z" fill="${ARANHA}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
      line('M40 37.5 L37.5 35.5 M60.8 37.5 L63.5 35', 1.2) +
      blush(41, 47, 2.6, 0.6) +
      line('M46 48 Q52 51 57 46', 1.6) +
      `<circle cx="44" cy="31" r="1.4" fill="${INK}"/><circle cx="56" cy="31" r="1.4" fill="${INK}"/>`,
    variant,
  );
}

export function fiandeiraSoakSvg(variant = 0): string {
  return svgDoc(
    FIANDEIRA_VB,
    soakLayer('M33 64 Q41 59 50 62 Q59 58 67 64 Q67 79 50 79 Q33 79 33 64 Z', 'M38 68 Q40 66 43 66', ARANHA_LW) + drips([[44, 84, 2], [57, 86, 1.6]]),
    variant,
  );
}

// ---------------------------------------------------------------- tinteiro

const TINTEIRO_VB = '6 10 92 88';
const POTE = 'M26 88 Q18 88 18 80 L20 50 Q22 40 34 38 L40 37 L40 28 L62 28 L62 37 L70 38 Q82 40 84 50 L86 80 Q86 88 78 88 Z';
const AMBAR = '#f8b545';
const AMBAR_ESCURO = '#c8641c';
const NANQUIM = '#1b1830';
const TINTEIRO_LW = lw(0.25);

/**
 * Tinteiro: pote baixo de vidro âmbar, nanquim até a metade, gargalo e perninhas. Atrevido: uma
 * sobrancelha erguida e a língua de fora. `charge` é o aviso do cuspe: bochechas estufadas, olhos
 * apertados e uma gota se formando no gargalo.
 */
export function tinteiroSvg(frame: number, variant = 0, charge = false): string {
  const step = frame % 2 === 0 ? 0 : 3;
  const w = TINTEIRO_LW;
  const face = charge
    ? line('M34 48 L42 52 L34 56 M70 48 L62 52 L70 56', 2.8) +
      oval(29, 64, 9, 8, '#ffb07a', w * 0.8) +
      oval(75, 64, 9, 8, '#ffb07a', w * 0.8) +
      outlined('M46 63 Q52 59 58 63 Q52 66 46 63 Z', PALETTE.vermelhoBoca, 1.6) +
      oval(51, 20, 5.5, 5.5, NANQUIM, 1.8)
    : eye(42, 51, 5.5, 6.5, [0.5, 0.1], 0.55, 1.8) +
      eye(60, 50, 5.5, 7, [0.5, 0.1], 0.55, 1.8) +
      line('M36 42 L48 44 M54 39 Q60 35 66 39', 2.4) +
      blush(33, 59, 4, 0.6) +
      line('M45 60 Q54 65 64 58', 2.4) +
      outlined('M54 62 Q55 70 59 69 Q62 67 60 61 Z', PALETTE.lingua, 1.5);
  return svgDoc(
    TINTEIRO_VB,
    `<ellipse cx="52" cy="95" rx="34" ry="3" fill="${INK}" opacity="0.14"/>` +
      oval(36 - step, 92, 8, 4.5, INK, 0) +
      oval(68 + step, 92, 8, 4.5, INK, 0) +
      `<clipPath id="pote"><path d="${POTE}"/></clipPath>` +
      `<path d="${POTE}" fill="${AMBAR}"/>` +
      `<path d="M14 72 Q34 66 52 70 Q70 74 90 68 L90 96 L14 96 Z" fill="${NANQUIM}" clip-path="url(#pote)"/>` +
      `<path d="M14 72 Q34 66 52 70 Q70 74 90 68" fill="none" stroke="${AMBAR_ESCURO}" stroke-width="1.6" clip-path="url(#pote)"/>` +
      `<path d="${POTE}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      outlined('M37 24 L65 24 L65 30 L37 30 Z', AMBAR_ESCURO, w * 0.8) +
      shine('M25 54 Q26 46 32 43', 2.6, 0.85) +
      shine('M79 76 L79 82', 2, 0.5) +
      face,
    variant,
  );
}

export function tinteiroSoakSvg(variant = 0): string {
  return svgDoc(
    TINTEIRO_VB,
    soakLayer('M20 58 Q30 53 42 57 Q54 52 66 57 Q76 53 85 58 L86 80 Q86 88 78 88 L26 88 Q18 88 18 80 Z', 'M24 64 L24 74', TINTEIRO_LW),
    variant,
  );
}

// ---------------------------------------------------------------- borracha

const BORRACHA_VB = '2 14 106 80';
const BORRACHA_ROSA = '#ff4f8b';
const BORRACHA_ROSA_ESCURA = '#d02a66';
const BORRACHA_LIMA = '#9ad34a';
const BORRACHA_LIMA_ESCURA = '#5f9e2a';
const BORRACHA_LW = lw(0.23);

/**
 * Borracha de apagar: bloco gasto, metade rosa-choque na frente (a que apaga) e metade lima atrás,
 * com farelos embaixo. Zangada: sobrancelhas em V e dentes cerrados. Olha para a direita.
 */
export function borrachaSvg(variant = 0): string {
  const block = 'M14 40 Q14 30 24 30 L86 28 Q98 28 98 40 L98 80 Q98 88 90 88 L20 88 Q12 88 12 80 Z';
  const w = BORRACHA_LW;
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="55" cy="90" rx="44" ry="3" fill="${INK}" opacity="0.14"/>` +
      `<clipPath id="bloco"><path d="${block}"/></clipPath>` +
      `<path d="${block}" fill="${BORRACHA_LIMA}"/>` +
      `<rect x="55" y="20" width="50" height="76" fill="${BORRACHA_ROSA}" clip-path="url(#bloco)"/>` +
      `<rect x="10" y="76" width="45" height="16" fill="${BORRACHA_LIMA_ESCURA}" clip-path="url(#bloco)"/>` +
      `<rect x="55" y="76" width="50" height="16" fill="${BORRACHA_ROSA_ESCURA}" clip-path="url(#bloco)"/>` +
      `<path d="${block}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      line('M55 29 L55 88', w * 0.8) +
      shine('M20 38 Q30 35 44 35', 2.8, 0.75) +
      shine('M62 36 Q72 34 84 34', 2.8, 0.6) +
      eye(70, 52, 6, 6.5, [0.5, 0.2], 0.58, 2) +
      eye(87, 51, 5.5, 6.5, [0.5, 0.2], 0.58, 2) +
      line('M61 41 L76 47 M95 40 L82 46', 3.6) +
      outlined('M66 64 L93 62 L92 72 L67 73 Z', WHITE, 2) +
      line('M73 63.5 L73 73 M80 63 L80 72.6 M87 62.5 L87 72.2 M66.5 68.5 L92.5 67', 1.4) +
      `<circle cx="102" cy="88" r="2" fill="${BORRACHA_ROSA}" stroke="${INK}" stroke-width="1"/><circle cx="106" cy="83" r="1.4" fill="${BORRACHA_ROSA}"/><circle cx="7" cy="87" r="1.6" fill="${BORRACHA_LIMA}" stroke="${INK}" stroke-width="1"/>`,
    variant,
  );
}

export function borrachaSoakSvg(variant = 0): string {
  return svgDoc(
    BORRACHA_VB,
    soakLayer('M12 64 Q24 58 36 62 Q50 56 64 62 Q78 56 98 62 L98 80 Q98 88 90 88 L20 88 Q12 88 12 80 Z', 'M18 70 L18 80', BORRACHA_LW),
    variant,
  );
}

// ---------------------------------------------------------------- tiros e efeitos

/** Cuspe do tinteiro: gota de nanquim baixa e comprida, correndo para a direita, com brilho roxo. */
export function cuspeSvg(variant = 0): string {
  return svgDoc(
    '-20 -14 40 28',
    line('M-19 -2 L-12 -2 M-18 4 L-10 4', 1.6, BORRAO_SHEEN) +
      `<path d="M-14 4 Q-6 -4 4 -7 Q14 -8 15 2 Q15 10 4 10 Q-6 10 -14 4 Z" fill="${BORRAO}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M3 -3 Q8 -4 10 -1" fill="none" stroke="${BORRAO_SHEEN}" stroke-width="1.8" stroke-linecap="round"/>`,
    variant,
  );
}

/** Gota de tinta voando para a direita, com o rastro de velocidade atrás. */
export function gotaSvg(variant = 0): string {
  return svgDoc(
    '-16 -10 30 20',
    line('M-15 -3 L-10 -3 M-15 3 L-9 3', 1.3, SOAK_LIGHT) +
      `<path d="M-10 0 Q-3 -5 4 -6 A6 6 0 1 1 4 6 Q-3 5 -10 0 Z" fill="${SOAK}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
      shine('M3 -3 Q6 -4 8 -2', 1.3, 0.95),
    variant,
  );
}

/** Respingo (efeito): mancha de lóbulos com gotas em volta, em azul de tinta ou nanquim. */
export function respingoSvg(color: string, shapeSeed: number): string {
  const lobes = shapeSeed === 0 ? 7 : 9;
  const pt = (a: number, r: number) => `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  const lobe = (i: number) => ({ a: (i / lobes) * Math.PI * 2 + shapeSeed, r: 13 + ((i * 7 + shapeSeed * 3) % 5) * 1.6 });
  const first = lobe(0);
  let d = `M${pt(first.a - 0.2, first.r)}`;
  for (let i = 0; i < lobes; i++) {
    const { a, r } = lobe(i);
    const next = lobe(i + 1);
    // Ponta arredondada do lóbulo e a volta para dentro até o próximo.
    d += ` Q${pt(a, r + 6)} ${pt(a + 0.2, r)} Q${pt(a + Math.PI / lobes, 6)} ${pt(next.a - 0.2, next.r)}`;
  }
  d += ' Z';
  let dots = '';
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + shapeSeed * 0.7;
    const r = 22 + (i % 4) * 1.6;
    dots += `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="${(1.6 + (i % 3) * 0.8).toFixed(1)}"/>`;
  }
  const glint = color === INK ? BORRAO_SHEEN : WHITE;
  return svgDoc(
    '-30 -30 60 60',
    `<g fill="${color}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"><path d="${d}"/>${dots}</g>` +
      `<path d="M-7 -4 Q-4 -9 2 -9" fill="none" stroke="${glint}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`,
  );
}

/** Poeira de aterrissagem: três nuvenzinhas de cartum com contorno. */
export function poeiraSvg(): string {
  const puff = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  return svgDoc(
    '-30 -18 60 22',
    `<g fill="#f3ede0" stroke="${INK}" stroke-width="1.8" opacity="0.9">${puff(-18, -4, 6)}${puff(-8, -8, 7.5)}${puff(6, -7, 7)}${puff(18, -3, 5.5)}</g>` +
      `<g fill="#f3ede0">${puff(-18, -4, 4.8)}${puff(-8, -8, 6.3)}${puff(6, -7, 5.8)}${puff(18, -3, 4.3)}</g>` +
      line('M-26 2 L26 2', 1.8, '#d8cfbd'),
  );
}
