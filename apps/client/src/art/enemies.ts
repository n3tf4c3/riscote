import { INK, PAPER, stroke, svgDoc } from './svg';

// Inimigos do quadro "Inimigos" da prancha: sépia, índigo e o preto do borrão (olhando para a direita).

const SEPIA = '#5b4532';
const SEPIA_DARK = '#3a2c20';
const INDIGO = '#3a3570';
const INDIGO_DARK = '#25214d';
const BORRAO = '#0d0c0b';
const BORRAO_EYES = '#d7261e';
const SOAK = '#2f6fd6';

export const TRACA_FRAMES = 3;

const TRACA_VB = '30 60 200 95';
/** Segmentos do corpo da traça, da cauda para o tórax: [cx, cy, rx, ry]. */
const SEGMENTS: Array<[number, number, number, number]> = [
  [58, 121, 14, 8],
  [80, 118, 16, 10],
  [102, 116, 17, 11],
  [124, 115, 17, 12],
  [142, 114, 13, 11],
];

/** Traça: corpo em segmentos com hachura, seis patas em trípode alternado e antenas que balançam. */
export function tracaSvg(frame: number, variant = 0): string {
  const t = (frame / TRACA_FRAMES) * Math.PI * 2;
  const bob = frame === 1 ? -1.5 : 0;
  let legs = '';
  [66, 92, 118, 70, 96, 122].forEach((x, i) => {
    const swing = 28 * Math.sin(t + (i % 2) * Math.PI) * (i < 3 ? 1 : -1);
    legs += stroke(x, 121, 18 + swing, 0.6, 0.28, i < 3 ? SEPIA_DARK : INK);
  });
  let body = '';
  for (const [cx, cy, rx, ry] of SEGMENTS) {
    const e = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`;
    body +=
      `${e} fill="${SEPIA}" filter="url(#tecido)"/>` +
      `${e} fill="url(#hachura-fina)" opacity="0.45" clip-path="url(#baixo)"/>` +
      `${e} fill="none" stroke="${SEPIA_DARK}" stroke-width="2.2" filter="url(#tinta)"/>`;
  }
  const sway = 6 * Math.sin(t);
  return svgDoc(
    TRACA_VB,
    `<clipPath id="baixo"><rect x="30" y="117" width="200" height="40"/></clipPath>` +
      stroke(46, 120, 100 + sway * 0.4, 0.22, 0.36, SEPIA_DARK, 'seco') +
      stroke(46, 123, 114 + sway * 0.4, 0.22, 0.38, SEPIA_DARK, 'seco') +
      `<g transform="translate(0 ${bob})">${legs}${body}` +
      `<path d="M66 110 Q100 100 140 104" stroke="${PAPER}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55"/>` +
      `<ellipse cx="158" cy="112" rx="16" ry="13" fill="${SEPIA_DARK}" filter="url(#tinta)"/>` +
      `<path d="M168 120 Q176 122 172 128 M162 122 Q166 128 160 130" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="163" cy="107" rx="6.5" ry="5.5" fill="${PAPER}"/><circle cx="165" cy="107.5" r="3" fill="${INK}"/>` +
      `<path d="M155 101 L169 99" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M162 100 Q182 ${80 - sway} 204 ${76 - sway * 1.4} M166 102 Q190 ${88 + sway} 212 ${90 + sway * 1.2}" stroke="${SEPIA_DARK}" stroke-width="2.2" fill="none" stroke-linecap="round" filter="url(#tinta)"/>` +
      `</g>`,
    variant,
  );
}

const SALTADOR_VB = '60 40 84 110';
const BLOB = 'M104 52 Q132 54 134 84 Q136 112 104 116 Q72 116 72 88 Q72 66 88 58 Q92 46 104 52 Z';

/** Saltador: bolota índigo com hachura e olhos grandes; no ar encolhe os pés e abre a boca. */
export function saltadorSvg(air: boolean, variant = 0): string {
  const feet = air
    ? `<ellipse cx="94" cy="117" rx="8" ry="5" fill="${INK}" filter="url(#tinta)"/><ellipse cx="116" cy="117" rx="8" ry="5" fill="${INK}" filter="url(#tinta)"/>`
    : stroke(92, 110, 20, 1.3, 0.2, INDIGO_DARK, 'seco') + stroke(114, 110, -20, 1.3, 0.2, INDIGO_DARK, 'seco') +
      `<ellipse cx="88" cy="131" rx="10" ry="5" fill="${INK}" filter="url(#tinta)"/><ellipse cx="121" cy="131" rx="10" ry="5" fill="${INK}" filter="url(#tinta)"/>`;
  const mouth = air
    ? `<ellipse cx="113" cy="100" rx="5" ry="6" fill="${INK}"/><ellipse cx="113" cy="102" rx="3" ry="2.4" fill="#c8402a"/>`
    : `<path d="M104 99 Q112 104 122 98" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  return svgDoc(
    SALTADOR_VB,
    feet +
      `<path d="${BLOB}" fill="${INDIGO}" filter="url(#tinta)"/>` +
      `<path d="${BLOB}" fill="url(#hachura-fina)" opacity="0.5" clip-path="url(#sombra)"/>` +
      `<clipPath id="sombra"><path d="M60 92 Q100 120 144 80 L144 150 L60 150 Z"/></clipPath>` +
      `<path d="${BLOB}" fill="none" stroke="${INDIGO_DARK}" stroke-width="2.6" filter="url(#tinta)"/>` +
      `<path d="M84 72 Q86 62 96 60" stroke="${PAPER}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.8"/>` +
      `<path d="M80 80 Q81 76 83 74" stroke="${PAPER}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>` +
      `<ellipse cx="114" cy="80" rx="8.5" ry="${air ? 10 : 9}" fill="${PAPER}"/><circle cx="116.5" cy="${air ? 79 : 81}" r="4" fill="${INK}"/><circle cx="118" cy="${air ? 77 : 79}" r="1.3" fill="${PAPER}"/>` +
      `<ellipse cx="96" cy="81" rx="6" ry="${air ? 8.5 : 7.5}" fill="${PAPER}"/><circle cx="98.5" cy="${air ? 80 : 82}" r="3.3" fill="${INK}"/>` +
      `<path d="M${air ? '104 66 L122 63' : '105 70 L123 71'}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` +
      mouth,
    variant,
  );
}

/** Tinta azul subindo no corpo: a opacidade do sprite acompanha o encharcamento. */
export function tracaSoakSvg(variant = 0): string {
  return svgDoc(
    TRACA_VB,
    `<path d="M46 122 Q90 112 150 114 Q172 114 170 124 Q100 132 50 128 Z" fill="${SOAK}" opacity="0.85" filter="url(#tecido)"/>` +
      `<circle cx="80" cy="134" r="2.6" fill="${SOAK}"/><circle cx="118" cy="136" r="2" fill="${SOAK}"/><circle cx="140" cy="132" r="1.6" fill="${SOAK}"/>`,
    variant,
  );
}

export function saltadorSoakSvg(variant = 0): string {
  return svgDoc(
    SALTADOR_VB,
    `<path d="M73 92 Q104 82 135 90 Q136 113 104 116 Q72 116 73 92 Z" fill="${SOAK}" opacity="0.85" filter="url(#tecido)"/>` +
      `<circle cx="86" cy="124" r="2.6" fill="${SOAK}"/><circle cx="116" cy="127" r="2" fill="${SOAK}"/>`,
    variant,
  );
}

/** Bola de tinta: o inimigo encharcado, com os olhos aflitos lá dentro; rolando, o sprite gira. */
export function bolaSvg(variant = 0): string {
  return svgDoc(
    '-28 -28 56 56',
    `<circle r="22" fill="${SOAK}" filter="url(#tecido)"/>` +
      `<circle r="22" fill="url(#hachura-fina)" opacity="0.35" clip-path="url(#lado)"/>` +
      `<clipPath id="lado"><path d="M-30 6 Q0 18 30 -8 L30 30 L-30 30 Z"/></clipPath>` +
      `<circle r="22" fill="none" stroke="${INK}" stroke-width="3.4" filter="url(#tinta)"/>` +
      `<path d="M-14 -6 Q-6 -16 6 -15" stroke="${PAPER}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85"/>` +
      `<circle cx="-12" cy="-10" r="1.8" fill="${PAPER}" opacity="0.85"/>` +
      `<ellipse cx="2" cy="3" rx="4.5" ry="5.5" fill="${PAPER}" opacity="0.9"/><ellipse cx="12" cy="2" rx="4" ry="5" fill="${PAPER}" opacity="0.9"/>` +
      `<circle cx="3" cy="5" r="2.2" fill="${INK}"/><circle cx="12.5" cy="4" r="2" fill="${INK}"/>` +
      `<path d="M-2 -4 L5 -1 M16 -3 L10 -1" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
    variant,
  );
}

/** Borrão: mancha que escorre, com olhos acesos e um sorriso de dentes de papel — perigo que não se derrota. */
export function borraoSvg(variant = 0): string {
  const body = 'M100 22 Q146 20 152 62 Q160 100 120 112 Q100 120 78 110 Q40 100 48 62 Q54 24 100 22 Z';
  return svgDoc(
    '20 0 160 140',
    `<path d="${body}" fill="${INK}" opacity="0.25" filter="url(#borra)" transform="translate(100 70) scale(1.14) translate(-100 -70)"/>` +
      `<path d="${body}" fill="${BORRAO}" filter="url(#borra)"/>` +
      stroke(82, 106, 0, 1.2, 0.32, BORRAO, 'seco') +
      stroke(106, 110, 0, 1, 0.24, BORRAO, 'seco') +
      stroke(126, 102, 0, 0.8, 0.2, BORRAO, 'seco') +
      stroke(64, 96, 10, 0.7, 0.16, BORRAO, 'seco') +
      stroke(118, 36, -70, 0.5, 0.22, '#3a3836', 'seco', 0.7) +
      stroke(72, 50, -130, 0.4, 0.14, '#3a3836', 'seco', 0.6) +
      `<path d="M78 60 Q90 50 101 60 Q90 68 78 60 Z M105 60 Q116 50 128 60 Q116 68 105 60 Z" fill="${BORRAO_EYES}" opacity="0.35" transform="translate(103 59) scale(1.35) translate(-103 -59)"/>` +
      `<path d="M80 62 Q90 54 100 62 Q90 68 80 62 Z M106 62 Q116 54 126 62 Q116 68 106 62 Z" fill="${BORRAO_EYES}"/>` +
      `<circle cx="93" cy="61" r="1.6" fill="#ffd9a0"/><circle cx="119" cy="61" r="1.6" fill="#ffd9a0"/>` +
      `<path d="M78 52 L98 57 M128 52 L108 57" stroke="${BORRAO}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M84 80 L90 86 L95 80 L100 87 L105 80 L110 86 L116 80 Q100 92 84 80 Z" fill="${PAPER}" opacity="0.92"/>` +
      `<circle cx="40" cy="44" r="3.4" fill="${BORRAO}"/><circle cx="164" cy="40" r="2.6" fill="${BORRAO}"/><circle cx="160" cy="118" r="2" fill="${BORRAO}"/><circle cx="34" cy="96" r="2" fill="${BORRAO}"/>`,
    variant,
  );
}

/** Gota de tinta voando para a direita, com o rastro atrás. */
export function gotaSvg(variant = 0): string {
  return svgDoc(
    '-16 -10 30 20',
    `<path d="M-14 0 Q-4 -5 4 -6 A6 6 0 1 1 4 6 Q-4 5 -14 0 Z" fill="${SOAK}" filter="url(#tecido)"/>` +
      `<path d="M-14 0 Q-4 -5 4 -6 A6 6 0 1 1 4 6 Q-4 5 -14 0 Z" fill="none" stroke="${INK}" stroke-width="1.6" filter="url(#tinta)"/>` +
      `<path d="M3 -3 Q6 -4 8 -2" stroke="${PAPER}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    variant,
  );
}

/** Respingo (efeito): mancha com gotas em volta, em azul de tinta ou nanquim. */
export function respingoSvg(color: string, shapeSeed: number): string {
  const lobes = shapeSeed === 0 ? 7 : 9;
  const pt = (a: number, r: number) => `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  let d = '';
  let tips = '';
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + shapeSeed;
    const r = 13 + ((i * 7 + shapeSeed * 3) % 5) * 2;
    d += `${i === 0 ? 'M' : 'L'}${pt(a, r)} L${pt(a + Math.PI / lobes, 8)} `;
    tips += `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="${(3 + (i % 3)).toFixed(1)}"/>`;
  }
  let dots = '';
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + shapeSeed * 0.7;
    dots += `<circle cx="${(Math.cos(a) * (23 + (i % 4) * 1.5)).toFixed(1)}" cy="${(Math.sin(a) * (23 + (i % 4) * 1.5)).toFixed(1)}" r="${(1.4 + (i % 3)).toFixed(1)}"/>`;
  }
  return svgDoc('-30 -30 60 60', `<g fill="${color}"><g filter="url(#tinta)"><circle r="11"/><path d="${d}Z"/>${tips}</g>${dots}</g>`);
}

/** Poeira de aterrissagem: dois arcos de pincel seco em sépia clara. */
export function poeiraSvg(): string {
  return svgDoc(
    '-30 -18 60 22',
    `<path d="M-26 0 Q-20 -12 -8 -8 Q-2 -16 6 -9 Q16 -14 22 -4 Q28 -2 26 2 Z" fill="#b9ab8e" opacity="0.8" filter="url(#borra)"/>` +
      stroke(-24, -2, -110, 0.5, 0.18, '#8f8169', 'seco') +
      stroke(24, -2, 110, 0.5, 0.18, '#8f8169', 'seco'),
  );
}
