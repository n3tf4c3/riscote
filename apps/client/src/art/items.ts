import { INK, stroke, svgDoc } from './svg';

// Potes de tinta do quadro "Itens" da prancha, na ordem ITEM_FORCA..ITEM_INVENCIVEL.

const GLASS = '#f3ede1';
const LIQUID = 'M71 78 Q100 70 129 78 L131 128 Q131 140 118 140 L82 140 Q69 140 69 128 Z';
const JAR = 'M70 62 Q70 50 84 50 L116 50 Q130 50 130 62 L132 128 Q132 142 118 142 L82 142 Q68 142 68 128 Z';
export const ITEM_LIQUIDS = ['#c8402a', '#d99a1e', '#2f6fd6', '#1f9e89', '#e8b400'] as const;

const SYMBOLS = [
  `<path d="M92 100 L108 100 M100 92 L100 108" stroke="${GLASS}" stroke-width="8" stroke-linecap="round"/>`,
  `<path d="M88 92 L110 92 M92 102 L114 102 M88 112 L108 112" stroke="${GLASS}" stroke-width="6" stroke-linecap="round"/>` +
    stroke(54, 84, 90, 0.5, 0.3, INK, 'seco') +
    stroke(50, 104, 90, 0.5, 0.4, INK, 'seco'),
  `<path d="M90 90 Q83 104 90 111 Q97 104 90 90 Z M110 90 Q103 104 110 111 Q117 104 110 90 Z" fill="${GLASS}"/>`,
  `<path d="M86 102 L114 102 M114 102 L104 92 M114 102 L104 112" stroke="${GLASS}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  `<path d="M100 84 L105.5 96.5 L119 98 L109 107 L112 120 L100 113 L88 120 L91 107 L81 98 L94.5 96.5 Z" fill="${INK}"/>` +
    `<path d="M58 54 L50 46 M142 54 L150 46 M100 18 L100 8" stroke="#e8b400" stroke-width="4" stroke-linecap="round"/>`,
];

export function itemSvg(kind: number): string {
  return svgDoc(
    '44 4 112 142',
    `<rect x="84" y="34" width="32" height="18" rx="3" fill="${INK}" filter="url(#tinta)"/>` +
      `<path d="${JAR}" fill="${GLASS}"/>` +
      `<path d="${LIQUID}" fill="${ITEM_LIQUIDS[kind] ?? INK}" filter="url(#tecido)"/>` +
      `<path d="${JAR}" fill="none" stroke="${INK}" stroke-width="5" filter="url(#tinta)"/>` +
      (SYMBOLS[kind] ?? '') +
      `<path d="M78 64 Q76 90 78 118" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.6" stroke-linecap="round"/>`,
  );
}
