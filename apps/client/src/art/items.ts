import { INK, PALETTE, WHITE, line, outlined, shine, svgDoc } from './svg';

// Potes de tinta dos itens em cartum, na ordem ITEM_FORCA..ITEM_INVENCIVEL: rolha, líquido chapado
// com bolhas, rótulo branco com o símbolo em marinho e contorno grosso (~0,8 px no mundo).

const GLASS = '#eef3f6';
const CORK = '#c98a52';
const CORK_DARK = '#9a6236';
const LIQUID = 'M66 78 Q100 70 134 78 L134 128 Q134 142 120 142 L80 142 Q66 142 66 128 Z';
const JAR = 'M70 62 Q70 50 84 50 L116 50 Q130 50 130 62 L134 128 Q134 144 118 144 L82 144 Q66 144 66 128 Z';
export const ITEM_LIQUIDS = ['#c8402a', '#d99a1e', '#2f6fd6', '#1f9e89', '#e8b400'] as const;
const LW = 4;

/** Símbolos em marinho sobre o rótulo, centrados em (100, 108). */
const SYMBOLS = [
  // Força: haltere.
  line('M90 108 L110 108', 4.5) +
    `<rect x="84" y="99" width="7" height="18" rx="2" fill="${INK}"/><rect x="109" y="99" width="7" height="18" rx="2" fill="${INK}"/>`,
  // Agilidade: raio.
  outlined('M103 96 L91 110 L99 110 L95 121 L109 105 L101 105 Z', INK, 1.5),
  // Tiro ágil: duas gotas.
  `<path d="M92 98 Q85 110 92 117 Q99 110 92 98 Z M108 98 Q101 110 108 117 Q115 110 108 98 Z" fill="${INK}"/>`,
  // Alcance: seta longa.
  line('M86 108 L114 108 M114 108 L105 99 M114 108 L105 117', 5),
  // Invencível: estrela.
  `<path d="M100 95 L104 103.5 L113 104.5 L106.5 110.5 L108.5 119.5 L100 115 L91.5 119.5 L93.5 110.5 L87 104.5 L96 103.5 Z" fill="${INK}"/>`,
];

/** Raios de brilho em volta do pote do invencível. */
const SPARKS = line('M56 56 L48 48 M144 56 L152 48 M100 20 L100 10 M54 94 L44 94 M146 94 L156 94', 5, PALETTE.amarelo);

export function itemSvg(kind: number, variant = 0): string {
  const liquid = ITEM_LIQUIDS[kind] ?? INK;
  return svgDoc(
    '44 4 112 142',
    `<clipPath id="pote"><path d="${JAR}"/></clipPath>` +
      `<path d="${JAR}" fill="${GLASS}"/>` +
      `<path d="${LIQUID}" fill="${liquid}" clip-path="url(#pote)"/>` +
      `<path d="M120 76 L140 76 L140 146 L120 146 Z" fill="${INK}" opacity="0.14" clip-path="url(#pote)"/>` +
      `<circle cx="80" cy="88" r="3.4" fill="${WHITE}" opacity="0.8"/><circle cx="122" cy="132" r="2.6" fill="${WHITE}" opacity="0.7"/><circle cx="84" cy="134" r="2" fill="${WHITE}" opacity="0.7"/>` +
      `<path d="${JAR}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      `<g transform="rotate(-3 100 108)">${outlined('M78 92 L122 92 L122 124 L78 124 Z', WHITE, 3)}${SYMBOLS[kind] ?? ''}</g>` +
      outlined('M84 30 Q84 26 88 26 L112 26 Q116 26 116 30 L116 52 L84 52 Z', CORK, LW) +
      line('M88 38 L112 38', 2.4, CORK_DARK) +
      shine('M76 66 Q74 76 75 84', 4, 0.9) +
      (kind === 4 ? SPARKS : ''),
    variant,
  );
}
