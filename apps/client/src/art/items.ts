import { INK, PAPER, stroke, svgDoc } from './svg';

// Potes de tinta do quadro "Itens" da prancha, na ordem ITEM_FORCA..ITEM_INVENCIVEL:
// rolha amarrada, líquido com bolhas e um rótulo de papel com o símbolo em nanquim.

const GLASS = '#f3ede1';
const CORK = '#a0764a';
const LIQUID = 'M71 70 Q100 62 129 70 L131 128 Q131 140 118 140 L82 140 Q69 140 69 128 Z';
const JAR = 'M70 62 Q70 50 84 50 L116 50 Q130 50 130 62 L132 128 Q132 142 118 142 L82 142 Q68 142 68 128 Z';
export const ITEM_LIQUIDS = ['#c8402a', '#d99a1e', '#2f6fd6', '#1f9e89', '#e8b400'] as const;

/** Símbolos em nanquim sobre o rótulo, centrados em (100, 107). */
const SYMBOLS = [
  `<path d="M91 107 L109 107 M100 98 L100 116" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
  `<path d="M88 100 L108 100 M92 107 L112 107 M88 114 L106 114" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/>` +
    stroke(54, 86, 90, 0.5, 0.3, INK, 'seco') +
    stroke(50, 106, 90, 0.5, 0.4, INK, 'seco'),
  `<path d="M91 97 Q84 110 91 116 Q98 110 91 97 Z M109 97 Q102 110 109 116 Q116 110 109 97 Z" fill="${INK}"/>`,
  `<path d="M87 107 L113 107 M113 107 L104 98 M113 107 L104 116" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  `<path d="M100 95 L104 103.5 L113 104.5 L106.5 110.5 L108.5 119.5 L100 115 L91.5 119.5 L93.5 110.5 L87 104.5 L96 103.5 Z" fill="${INK}"/>` +
    `<path d="M58 54 L50 46 M142 54 L150 46 M100 18 L100 8 M56 92 L46 92 M144 92 L154 92" stroke="#e8b400" stroke-width="4" stroke-linecap="round"/>`,
];

export function itemSvg(kind: number, variant = 0): string {
  return svgDoc(
    '44 4 112 142',
    `<clipPath id="direita"><rect x="114" y="40" width="30" height="110"/></clipPath>` +
      `<path d="${JAR}" fill="${GLASS}"/>` +
      `<path d="${LIQUID}" fill="${ITEM_LIQUIDS[kind] ?? INK}" filter="url(#tecido)"/>` +
      `<circle cx="80" cy="82" r="3" fill="${PAPER}" opacity="0.7"/><circle cx="121" cy="132" r="2.4" fill="${PAPER}" opacity="0.6"/><circle cx="84" cy="130" r="1.8" fill="${PAPER}" opacity="0.6"/>` +
      `<path d="${JAR}" fill="url(#hachura-fina)" opacity="0.3" clip-path="url(#direita)"/>` +
      `<g transform="rotate(-3 100 107)"><rect x="79" y="91" width="42" height="32" rx="2" fill="${PAPER}"/>` +
      `<rect x="79" y="91" width="42" height="32" rx="2" fill="none" stroke="${INK}" stroke-width="2.2" filter="url(#tinta)"/>${SYMBOLS[kind] ?? ''}</g>` +
      `<path d="${JAR}" fill="none" stroke="${INK}" stroke-width="5" filter="url(#tinta)"/>` +
      `<rect x="84" y="28" width="32" height="24" rx="3" fill="${CORK}" filter="url(#tecido)"/>` +
      `<rect x="84" y="28" width="32" height="24" rx="3" fill="url(#hachura-fina)" opacity="0.35"/>` +
      `<rect x="84" y="28" width="32" height="24" rx="3" fill="none" stroke="${INK}" stroke-width="3.4" filter="url(#tinta)"/>` +
      `<path d="M80 52 Q100 58 120 52 M118 53 Q128 60 124 70" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
      `<path d="M77 66 Q75 76 76 86" stroke="#ffffff" stroke-width="3.4" fill="none" opacity="0.75" stroke-linecap="round"/>`,
    variant,
  );
}
