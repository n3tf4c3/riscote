import { INK, PAPER, gradient, stroke, svgDoc } from './svg';

// Inimigos do quadro "Inimigos" da prancha (olhando para a direita). Cada um tem a sua dupla de tintas
// em degradê, como as pinceladas de docs/texturas, com contorno escuro do mesmo tom. O azul da tinta
// dos jogadores (SOAK) fica só para o encharcado e a bola; o borrão segue de nanquim.

/** Corpo com o degradê do próprio desenho (definido como `corpo`). */
const BODY = 'url(#corpo)';
// Traça: magenta → amarelo, contorno vinho.
const SEPIA = BODY;
const SEPIA_DARK = '#6e1036';
const TRACA_GRADIENT = gradient('corpo', '#e8247c', '#f6b83a', 0, [44, 0, 164, 0]);
// Saltador: índigo → violeta, contorno anil.
const INDIGO = BODY;
const INDIGO_DARK = '#1e1252';
const SALTADOR_GRADIENT = gradient('corpo', '#3d2bb0', '#c23ad6', 0, [74, 116, 134, 54]);
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

/**
 * Traça: corpo em segmentos com hachura, seis patas em trípode alternado e antenas que balançam.
 * `alert` é o aviso do bote: antenas em pé, sobrancelha franzida e boca aberta.
 */
export function tracaSvg(frame: number, variant = 0, alert = false): string {
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
  const antennae = alert
    ? `<path d="M162 100 Q166 76 176 56 M166 102 Q178 80 194 66" stroke="${SEPIA_DARK}" stroke-width="2.6" fill="none" stroke-linecap="round" filter="url(#tinta)"/>` +
      `<circle cx="176" cy="56" r="3" fill="${SEPIA_DARK}"/><circle cx="194" cy="66" r="3" fill="${SEPIA_DARK}"/>`
    : `<path d="M162 100 Q182 ${80 - sway} 204 ${76 - sway * 1.4} M166 102 Q190 ${88 + sway} 212 ${90 + sway * 1.2}" stroke="${SEPIA_DARK}" stroke-width="2.2" fill="none" stroke-linecap="round" filter="url(#tinta)"/>`;
  const face = alert
    ? `<ellipse cx="163" cy="107" rx="7" ry="6.5" fill="${PAPER}"/><circle cx="166" cy="107.5" r="2.4" fill="#c8402a"/>` +
      `<path d="M153 98 L171 104" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M166 119 Q174 117 175 126 Q168 128 164 123 Z" fill="${INK}"/>`
    : `<path d="M168 120 Q176 122 172 128 M162 122 Q166 128 160 130" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="163" cy="107" rx="6.5" ry="5.5" fill="${PAPER}"/><circle cx="165" cy="107.5" r="3" fill="${INK}"/>` +
      `<path d="M155 101 L169 99" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  return svgDoc(
    TRACA_VB,
    TRACA_GRADIENT +
      `<clipPath id="baixo"><rect x="30" y="117" width="200" height="40"/></clipPath>` +
      stroke(46, 120, 100 + sway * 0.4, 0.22, 0.36, SEPIA_DARK, 'seco') +
      stroke(46, 123, 114 + sway * 0.4, 0.22, 0.38, SEPIA_DARK, 'seco') +
      `<g transform="translate(0 ${bob})">${legs}${body}` +
      `<path d="M66 110 Q100 100 140 104" stroke="${PAPER}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55"/>` +
      `<ellipse cx="158" cy="112" rx="16" ry="13" fill="${SEPIA_DARK}" filter="url(#tinta)"/>` +
      face +
      antennae +
      `</g>`,
    variant,
  );
}

const SALTADOR_VB = '60 40 84 110';
const BLOB = 'M104 52 Q132 54 134 84 Q136 112 104 116 Q72 116 72 88 Q72 66 88 58 Q92 46 104 52 Z';

/**
 * Saltador: bolota de índigo a violeta, com hachura e olhos grandes; no ar encolhe os pés e abre a boca.
 * `charge` é o aviso da pancada: olhos apertados, sobrancelhas baixas e dentes cerrados.
 */
export function saltadorSvg(air: boolean, variant = 0, charge = false): string {
  const feet = air
    ? `<ellipse cx="94" cy="117" rx="8" ry="5" fill="${INK}" filter="url(#tinta)"/><ellipse cx="116" cy="117" rx="8" ry="5" fill="${INK}" filter="url(#tinta)"/>`
    : stroke(92, 110, 20, 1.3, 0.2, INDIGO_DARK, 'seco') + stroke(114, 110, -20, 1.3, 0.2, INDIGO_DARK, 'seco') +
      `<ellipse cx="88" cy="131" rx="10" ry="5" fill="${INK}" filter="url(#tinta)"/><ellipse cx="121" cy="131" rx="10" ry="5" fill="${INK}" filter="url(#tinta)"/>`;
  const mouth = air
    ? `<ellipse cx="113" cy="100" rx="5" ry="6" fill="${INK}"/><ellipse cx="113" cy="102" rx="3" ry="2.4" fill="#c8402a"/>`
    : `<path d="M104 99 Q112 104 122 98" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const face = charge
    ? `<path d="M106 82 Q114 77 123 82 Q114 85 106 82 Z" fill="${PAPER}"/><circle cx="116" cy="82" r="2.6" fill="${INK}"/>` +
      `<path d="M89 83 Q96 78 103 83 Q96 86 89 83 Z" fill="${PAPER}"/><circle cx="97" cy="82.5" r="2.3" fill="${INK}"/>` +
      `<path d="M104 70 L123 78 M86 74 L102 78" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
      `<rect x="102" y="95" width="21" height="8" rx="2" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M109 95 V103 M116 95 V103" stroke="${INK}" stroke-width="1.6"/>`
    : `<ellipse cx="114" cy="80" rx="8.5" ry="${air ? 10 : 9}" fill="${PAPER}"/><circle cx="116.5" cy="${air ? 79 : 81}" r="4" fill="${INK}"/><circle cx="118" cy="${air ? 77 : 79}" r="1.3" fill="${PAPER}"/>` +
      `<ellipse cx="96" cy="81" rx="6" ry="${air ? 8.5 : 7.5}" fill="${PAPER}"/><circle cx="98.5" cy="${air ? 80 : 82}" r="3.3" fill="${INK}"/>` +
      `<path d="M${air ? '104 66 L122 63' : '105 70 L123 71'}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` +
      mouth;
  return svgDoc(
    SALTADOR_VB,
    SALTADOR_GRADIENT +
      feet +
      `<path d="${BLOB}" fill="${INDIGO}" filter="url(#tinta)"/>` +
      `<path d="${BLOB}" fill="url(#hachura-fina)" opacity="0.5" clip-path="url(#sombra)"/>` +
      `<clipPath id="sombra"><path d="M60 92 Q100 120 144 80 L144 150 L60 150 Z"/></clipPath>` +
      `<path d="${BLOB}" fill="none" stroke="${INDIGO_DARK}" stroke-width="2.6" filter="url(#tinta)"/>` +
      `<path d="M84 72 Q86 62 96 60" stroke="${PAPER}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.8"/>` +
      `<path d="M80 80 Q81 76 83 74" stroke="${PAPER}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>` +
      face,
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
    // Nanquim com um brilho de óleo roxo: o único inimigo quase preto, para ler como ameaça.
    gradient('corpo', '#2e1048', BORRAO, 0, [40, 20, 150, 110]) +
      `<path d="${body}" fill="${INK}" opacity="0.25" filter="url(#borra)" transform="translate(100 70) scale(1.14) translate(-100 -70)"/>` +
      `<path d="${body}" fill="${BODY}" filter="url(#borra)"/>` +
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

/** Mancha do borrão: poça de nanquim que escorre, com dois olhinhos acesos — encostar derruba. */
export function manchaSvg(variant = 0): string {
  const blob = 'M0 -24 Q16 -26 22 -12 Q30 -2 22 10 Q18 24 2 22 Q-12 28 -20 16 Q-30 4 -22 -10 Q-16 -24 0 -24 Z';
  return svgDoc(
    '-34 -34 68 68',
    gradient('corpo', '#2e1048', BORRAO, 0, [-24, -24, 22, 22]) +
      `<path d="${blob}" fill="${INK}" opacity="0.22" filter="url(#borra)" transform="scale(1.18)"/>` +
      `<path d="${blob}" fill="${BODY}" filter="url(#borra)"/>` +
      `<circle cx="-27" cy="-14" r="2.6" fill="${BORRAO}"/><circle cx="26" cy="18" r="2.2" fill="${BORRAO}"/><circle cx="-4" cy="29" r="1.8" fill="${BORRAO}"/>` +
      stroke(-8, 14, 0, 0.6, 0.14, BORRAO, 'seco') +
      stroke(8, 16, 0, 0.5, 0.1, BORRAO, 'seco') +
      `<path d="M-11 -3 Q-6 -8 -1 -3 Q-6 0 -11 -3 Z M3 -3 Q8 -8 13 -3 Q8 0 3 -3 Z" fill="${BORRAO_EYES}"/>` +
      `<path d="M-12 -9 L-2 -6 M14 -9 L4 -6" stroke="${BORRAO}" stroke-width="2.4" stroke-linecap="round"/>`,
    variant,
  );
}

// Inimigos da progressão de fases, cada um com a sua dupla: grampo verde → azul-petróleo, fiandeira
// vermelho → bordô, tinteiro de vidro âmbar e a borracha rosa-choque na frente e lima atrás.

const GRAFITE = BODY;
const GRAFITE_DARK = '#0f3a2a';
const GRAMPO_GRADIENT = gradient('corpo', '#2fb64a', '#16577e', 0, [20, 86, 80, 22]);
const ARANHA = BODY;
const ARANHA_PATAS = '#3a0a1c';
const FIANDEIRA_GRADIENT = gradient('corpo', '#f0402a', '#6a0f34', 0, [50, 30, 50, 78]);
const VIDRO = BODY;
const VIDRO_DARK = '#5a2208';
const TINTEIRO_GRADIENT = gradient('corpo', '#f8bf45', '#b04a16', 0, [52, 28, 52, 88]);
const BORRACHA_ROSA = 'url(#tinta-frente)';
const BORRACHA_ROSA_DARK = '#b0285c';
const BORRACHA_AZUL = 'url(#tinta-tras)';
const BORRACHA_LIMA = '#6fbf3a';
const BORRACHA_GRADIENTS = gradient('tinta-frente', '#ff4f8b', '#ffa6c8', -60) + gradient('tinta-tras', '#c8ea52', '#4fae3a', -60);

export const GRAMPO_FRAMES = 3;

const GRAMPO_VB = '4 6 92 86';
/** Olhos de papel com a pupila olhando para a direita; `angry` franze as sobrancelhas. */
function eyes(cx: number, cy: number, gap: number, r: number, angry = false): string {
  const [l, rr] = [cx - gap / 2, cx + gap / 2];
  return (
    `<ellipse cx="${l}" cy="${cy}" rx="${r}" ry="${r * 1.1}" fill="${PAPER}"/><circle cx="${l + r * 0.35}" cy="${cy + 0.5}" r="${r * 0.5}" fill="${INK}"/>` +
    `<ellipse cx="${rr}" cy="${cy}" rx="${r}" ry="${r * 1.1}" fill="${PAPER}"/><circle cx="${rr + r * 0.35}" cy="${cy + 0.5}" r="${r * 0.5}" fill="${INK}"/>` +
    (angry
      ? `<path d="M${l - r} ${cy - r * 1.6} L${l + r} ${cy - r * 0.9} M${rr + r} ${cy - r * 1.6} L${rr - r} ${cy - r * 0.9}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
      : `<path d="M${l - r} ${cy - r * 1.5} L${rr + r} ${cy - r * 1.7}" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>`)
  );
}

/**
 * Grampo: um grampo de papel dobrado em arco, de arame pintado de verde a azul-petróleo, correndo
 * nas duas pontas. `frame` troca as pernas de lugar (corrida de 3 quadros).
 */
export function grampoSvg(frame: number, variant = 0): string {
  const swing = [-9, 0, 9][frame % GRAMPO_FRAMES]!;
  const wire = `M${24 + swing} 86 L26 40 Q26 22 42 22 L58 22 Q74 22 74 40 L${76 - swing} 86`;
  return svgDoc(
    GRAMPO_VB,
    GRAMPO_GRADIENT +
      stroke(18, 88, -90, 0.24, 0.64, GRAFITE_DARK, 'seco', 0.6) +
      // Por dentro do arco, o papel preso no grampo: é ali que fica o rosto.
      `<path d="M30 74 L30 42 Q30 28 44 28 L56 28 Q70 28 70 42 L70 74 Q50 80 30 74 Z" fill="#d6f0cf" filter="url(#tecido)"/>` +
      `<path d="M30 74 Q50 80 70 74" stroke="${GRAFITE_DARK}" stroke-width="2" fill="none" opacity="0.6"/>` +
      `<path d="${wire}" fill="none" stroke="${GRAFITE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" filter="url(#tinta)"/>` +
      `<path d="${wire}" fill="none" stroke="${GRAFITE_DARK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.5 2)" opacity="0.6"/>` +
      `<path d="M31 42 Q31 28 44 27 L56 27" fill="none" stroke="${PAPER}" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>` +
      `<circle cx="${24 + swing}" cy="86" r="4" fill="${INK}"/><circle cx="${76 - swing}" cy="86" r="4" fill="${INK}"/>` +
      eyes(52, 38, 16, 5.2, true) +
      `<path d="M47 51 Q53 54 60 50" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    variant,
  );
}

export function grampoSoakSvg(variant = 0): string {
  return svgDoc(
    GRAMPO_VB,
    `<path d="M20 62 L32 60 L32 88 L18 88 Z M68 60 L80 62 L82 88 L68 88 Z" fill="${SOAK}" opacity="0.85" filter="url(#tecido)"/>` +
      `<circle cx="26" cy="91" r="2.4" fill="${SOAK}"/><circle cx="74" cy="91" r="2" fill="${SOAK}"/>`,
    variant,
  );
}

const FIANDEIRA_VB = '-6 0 112 104';
/**
 * Fiandeira: aranha de traço fino, corpo de vermelho a bordô e oito patas finas em pincel seco.
 * `frame` alterna as patas (balanço no fio ou passo no chão). Centro do corpo em (50, 52).
 */
export function fiandeiraSvg(frame: number, variant = 0): string {
  const k = frame % 2 === 0 ? 1 : -1;
  let legs = '';
  [[-1, 0], [-1, 1], [-1, 2], [-1, 3], [1, 0], [1, 1], [1, 2], [1, 3]].forEach(([side, i]) => {
    const a = (side as number) * (55 + (i as number) * 24 + k * (i as number % 2 === 0 ? 7 : -7));
    legs += stroke(50 + (side as number) * 8, 50 + (i as number) * 4, a, 0.42, 0.5, ARANHA_PATAS, 'seco');
  });
  return svgDoc(
    FIANDEIRA_VB,
    FIANDEIRA_GRADIENT +
      legs +
      `<ellipse cx="50" cy="62" rx="17" ry="15" fill="${ARANHA}" filter="url(#tinta)"/>` +
      `<ellipse cx="50" cy="62" rx="17" ry="15" fill="url(#hachura-fina)" opacity="0.4" clip-path="url(#ventre)"/>` +
      `<clipPath id="ventre"><rect x="30" y="64" width="40" height="20"/></clipPath>` +
      `<ellipse cx="50" cy="62" rx="17" ry="15" fill="none" stroke="${ARANHA_PATAS}" stroke-width="2" filter="url(#tinta)"/>` +
      `<path d="M44 58 Q50 54 56 58 Q50 68 44 58 Z" fill="#ffd23a" opacity="0.9"/>` +
      `<ellipse cx="50" cy="42" rx="13" ry="11" fill="${ARANHA}" filter="url(#tinta)"/>` +
      `<ellipse cx="50" cy="42" rx="13" ry="11" fill="none" stroke="${ARANHA_PATAS}" stroke-width="2" filter="url(#tinta)"/>` +
      eyes(51, 41, 11, 3.6) +
      `<circle cx="44" cy="34" r="1.6" fill="${PAPER}"/><circle cx="58" cy="34" r="1.6" fill="${PAPER}"/>` +
      `<path d="M47 49 Q51 51 55 49" stroke="${PAPER}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.8"/>`,
    variant,
  );
}

export function fiandeiraSoakSvg(variant = 0): string {
  return svgDoc(
    FIANDEIRA_VB,
    `<path d="M34 64 Q50 56 66 64 Q66 78 50 78 Q34 78 34 64 Z" fill="${SOAK}" opacity="0.85" filter="url(#tecido)"/>` +
      `<circle cx="44" cy="82" r="2.2" fill="${SOAK}"/><circle cx="57" cy="84" r="1.8" fill="${SOAK}"/>`,
    variant,
  );
}

const TINTEIRO_VB = '6 10 92 88';
const POTE = 'M24 88 Q18 88 18 80 L20 50 Q22 40 34 38 L40 37 L40 28 L62 28 L62 37 L70 38 Q82 40 84 50 L86 80 Q86 88 78 88 Z';
/**
 * Tinteiro: pote baixo de vidro âmbar, cheio de nanquim até a metade, com bico aberto e perninhas.
 * `charge` é o aviso do cuspe: bochechas cheias, olhos apertados e uma gota se formando no bico.
 */
export function tinteiroSvg(frame: number, variant = 0, charge = false): string {
  const step = frame % 2 === 0 ? 0 : 3;
  return svgDoc(
    TINTEIRO_VB,
    TINTEIRO_GRADIENT +
      `<ellipse cx="${36 - step}" cy="92" rx="8" ry="4.5" fill="${INK}" filter="url(#tinta)"/><ellipse cx="${68 + step}" cy="92" rx="8" ry="4.5" fill="${INK}" filter="url(#tinta)"/>` +
      `<path d="${POTE}" fill="${VIDRO}" filter="url(#tecido)"/>` +
      `<path d="M21 62 Q52 56 85 62 L86 80 Q86 88 78 88 L24 88 Q18 88 18 80 Z" fill="${INK}" opacity="0.85"/>` +
      `<path d="${POTE}" fill="none" stroke="${VIDRO_DARK}" stroke-width="3" stroke-linejoin="round" filter="url(#tinta)"/>` +
      `<rect x="38" y="24" width="26" height="6" rx="2" fill="${VIDRO_DARK}"/>` +
      `<path d="M26 50 Q28 44 34 43" stroke="${PAPER}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.7"/>` +
      (charge
        ? `<path d="M37 52 Q43 48 49 52 Q43 54 37 52 Z M55 52 Q61 48 67 52 Q61 54 55 52 Z" fill="${PAPER}"/><circle cx="45" cy="51.6" r="1.8" fill="${INK}"/><circle cx="63" cy="51.6" r="1.8" fill="${INK}"/>` +
          `<path d="M35 45 L49 49 M69 45 L55 49" stroke="${PAPER}" stroke-width="2.4" stroke-linecap="round"/>` +
          `<ellipse cx="34" cy="66" rx="6" ry="4" fill="#c8402a" opacity="0.45"/><ellipse cx="72" cy="66" rx="6" ry="4" fill="#c8402a" opacity="0.45"/>` +
          `<circle cx="51" cy="21" r="5" fill="${INK}" filter="url(#tinta)"/>`
        : eyes(52, 51, 17, 5) + `<path d="M46 66 Q53 70 60 66" stroke="${PAPER}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.85"/>`) +
      stroke(14, 95, -90, 0.2, 0.76, VIDRO_DARK, 'seco', 0.5),
    variant,
  );
}

export function tinteiroSoakSvg(variant = 0): string {
  return svgDoc(
    TINTEIRO_VB,
    `<path d="M20 58 Q52 50 85 58 L86 80 Q86 88 78 88 L24 88 Q18 88 18 80 Z" fill="${SOAK}" opacity="0.85" filter="url(#tecido)"/>`,
    variant,
  );
}

const BORRACHA_VB = '2 14 106 80';
/**
 * Borracha de apagar: bloco gasto, metade rosa-choque na frente (a que apaga) e metade lima atrás,
 * com farelos embaixo. Olha para a direita; a frente é o lado direito.
 */
export function borrachaSvg(variant = 0): string {
  const block = 'M14 40 Q14 30 24 30 L86 28 Q98 28 98 40 L98 80 Q98 88 90 88 L20 88 Q12 88 12 80 Z';
  return svgDoc(
    BORRACHA_VB,
    BORRACHA_GRADIENTS +
      `<clipPath id="frente"><rect x="55" y="20" width="50" height="76"/></clipPath>` +
      `<clipPath id="tras"><rect x="4" y="20" width="51" height="76"/></clipPath>` +
      `<path d="${block}" fill="${BORRACHA_AZUL}" clip-path="url(#tras)" filter="url(#tecido)"/>` +
      `<path d="${block}" fill="${BORRACHA_ROSA}" clip-path="url(#frente)" filter="url(#tecido)"/>` +
      `<path d="${block}" fill="url(#hachura-fina)" opacity="0.25" clip-path="url(#tras)"/>` +
      `<path d="${block}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" filter="url(#tinta)"/>` +
      `<path d="M55 30 L55 88" stroke="${INK}" stroke-width="2" opacity="0.5"/>` +
      `<path d="M92 34 Q97 46 96 60" stroke="${BORRACHA_ROSA_DARK}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.7"/>` +
      `<path d="M20 36 Q30 33 44 33" stroke="${PAPER}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.6"/>` +
      eyes(78, 50, 14, 5, true) +
      `<path d="M70 70 Q78 66 88 70" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
      `<circle cx="102" cy="86" r="2" fill="${BORRACHA_ROSA_DARK}"/><circle cx="106" cy="82" r="1.4" fill="${BORRACHA_ROSA_DARK}"/><circle cx="8" cy="86" r="1.6" fill="${BORRACHA_LIMA}"/>`,
    variant,
  );
}

export function borrachaSoakSvg(variant = 0): string {
  return svgDoc(
    BORRACHA_VB,
    `<path d="M12 64 Q55 56 98 64 L98 80 Q98 88 90 88 L20 88 Q12 88 12 80 Z" fill="${SOAK}" opacity="0.85" filter="url(#tecido)"/>`,
    variant,
  );
}

/** Cuspe do tinteiro: gota de nanquim baixa e comprida, correndo para a direita. */
export function cuspeSvg(variant = 0): string {
  return svgDoc(
    '-20 -14 40 28',
    `<path d="M-18 4 Q-8 -4 4 -7 Q14 -8 15 2 Q15 10 4 10 Q-8 10 -18 4 Z" fill="${BORRAO}" filter="url(#borra)"/>` +
      `<circle cx="-14" cy="-2" r="1.8" fill="${BORRAO}"/><circle cx="-19" cy="1" r="1.2" fill="${BORRAO}"/>` +
      `<path d="M4 -3 Q8 -4 10 -1" stroke="${PAPER}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.8"/>`,
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
