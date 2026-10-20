import { INK, PAPER, stroke, svgDoc } from './svg';

// Inimigos do quadro "Inimigos" da prancha: sépia, índigo e o preto do borrão (olhando para a direita).

const SEPIA = '#5b4532';
const SEPIA_DARK = '#3a2c20';
const INDIGO = '#3a3570';
const BORRAO = '#0d0c0b';
const BORRAO_EYES = '#d7261e';
const SOAK = '#2f6fd6';

export function tracaSvg(): string {
  return svgDoc(
    '30 60 200 95',
    stroke(70, 128, 16, 0.4, 0.2, SEPIA_DARK, 'seco') +
      stroke(96, 128, 8, 0.4, 0.2, SEPIA_DARK, 'seco') +
      stroke(122, 126, -6, 0.4, 0.2, SEPIA_DARK, 'seco') +
      stroke(42, 120, 100, 0.22, 0.34, SEPIA_DARK, 'seco') +
      stroke(42, 122, 112, 0.22, 0.38, SEPIA_DARK, 'seco') +
      stroke(43, 124, 124, 0.22, 0.32, SEPIA_DARK, 'seco') +
      // Versão do jogo: o corpo um pouco mais grosso que na prancha.
      stroke(150, 114, 85.8, 4.2, 1.1, SEPIA, 'seco') +
      `<path d="M72 112 L70 128 M92 110 L91 128 M112 109 L112 127 M131 108 L132 124" stroke="#e9dfc9" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>` +
      `<ellipse cx="156" cy="111" rx="16" ry="13" fill="${SEPIA_DARK}" filter="url(#tinta)"/>` +
      `<path d="M158 106 Q164 102 170 106 Q164 109 158 106 Z" fill="${PAPER}"/>` +
      stroke(164, 101, -128, 0.3, 0.5, SEPIA_DARK, 'seco') +
      stroke(167, 104, -112, 0.3, 0.56, SEPIA_DARK, 'seco'),
  );
}

export function saltadorSvg(): string {
  return svgDoc(
    '60 40 84 110',
    stroke(92, 112, 20, 1.3, 0.22, INDIGO, 'seco') +
      stroke(112, 112, -20, 1.3, 0.22, INDIGO, 'seco') +
      `<path d="M104 52 Q132 54 134 84 Q136 112 104 116 Q72 116 72 88 Q72 66 88 58 Q92 46 104 52 Z" fill="${INDIGO}" filter="url(#tinta)"/>` +
      `<path d="M84 72 Q86 62 96 60" stroke="${PAPER}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.75"/>` +
      `<ellipse cx="112" cy="80" rx="7" ry="8" fill="${PAPER}"/><circle cx="114" cy="81" r="3.4" fill="${INK}"/>` +
      `<ellipse cx="96" cy="81" rx="5" ry="6.5" fill="${PAPER}"/><circle cx="98" cy="82" r="2.8" fill="${INK}"/>`,
  );
}

/** Tinta azul subindo no corpo: a opacidade do sprite acompanha o encharcamento. */
export function tracaSoakSvg(): string {
  return svgDoc(
    '30 60 200 95',
    `<path d="M48 120 Q90 108 150 110 Q172 112 168 122 Q100 132 52 128 Z" fill="${SOAK}" opacity="0.85" filter="url(#tecido)"/>` +
      `<circle cx="80" cy="138" r="2.6" fill="${SOAK}"/><circle cx="118" cy="140" r="2" fill="${SOAK}"/>`,
  );
}

export function saltadorSoakSvg(): string {
  return svgDoc(
    '60 40 84 110',
    `<path d="M73 92 Q104 82 135 90 Q136 113 104 116 Q72 116 73 92 Z" fill="${SOAK}" opacity="0.85" filter="url(#tecido)"/>` +
      `<circle cx="86" cy="126" r="2.6" fill="${SOAK}"/><circle cx="116" cy="130" r="2" fill="${SOAK}"/>`,
  );
}

/** Bola de tinta: o inimigo encharcado; rolando, o sprite gira. */
export function bolaSvg(): string {
  return svgDoc(
    '-28 -28 56 56',
    `<circle r="22" fill="${SOAK}" filter="url(#tecido)"/>` +
      `<circle r="22" fill="none" stroke="${INK}" stroke-width="3.4" filter="url(#tinta)"/>` +
      `<path d="M-12 -6 Q-2 -16 10 -10 Q2 -2 -6 8" stroke="${PAPER}" stroke-width="2.8" fill="none" stroke-linecap="round" opacity="0.85"/>`,
  );
}

export function borraoSvg(): string {
  const body = 'M100 22 Q146 20 152 62 Q160 100 120 112 Q100 120 78 110 Q40 100 48 62 Q54 24 100 22 Z';
  return svgDoc(
    '20 0 160 140',
    `<path d="${body}" fill="${INK}" opacity="0.25" filter="url(#borra)" transform="translate(100 70) scale(1.12) translate(-100 -70)"/>` +
      `<path d="${body}" fill="${BORRAO}" filter="url(#borra)"/>` +
      stroke(82, 106, 0, 1.2, 0.3, BORRAO, 'seco') +
      stroke(106, 110, 0, 1, 0.22, BORRAO, 'seco') +
      stroke(126, 102, 0, 0.8, 0.18, BORRAO, 'seco') +
      `<path d="M80 62 Q90 54 100 62 Q90 68 80 62 Z M106 62 Q116 54 126 62 Q116 68 106 62 Z" fill="${BORRAO_EYES}"/>` +
      `<circle cx="40" cy="44" r="3.4" fill="${BORRAO}"/><circle cx="164" cy="40" r="2.6" fill="${BORRAO}"/><circle cx="160" cy="118" r="2" fill="${BORRAO}"/>`,
  );
}
