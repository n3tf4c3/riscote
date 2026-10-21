import { INK, PAPER, hash, stroke, svgDoc } from './svg';

// Arte da capa (tela de entrada): logotipo, palco com plataformas e o pincel dos botões.
// Mesma linguagem da arena: pincelada seca, hachura e pingos de nanquim.

const AZUL = '#2f6fd6';

/** Logotipo: a palavra em nanquim com falhas de pincel seco, sobre um risco azul de tinta. Fica no DOM (usa a fonte da página). */
export function logoSvg(): string {
  const word = `<text x="500" y="236" text-anchor="middle" font-family="'Bebas Neue', Impact, 'Arial Narrow', sans-serif" font-size="250" textLength="720" lengthAdjust="spacingAndGlyphs">RISCOTE</text>`;
  return svgDoc(
    '0 0 1000 300',
    `<filter id="logo-tinta" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="r"/><feDisplacementMap in="SourceGraphic" in2="r" scale="8"/></filter>` +
      `<filter id="logo-falhas" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.005 0.22" numOctaves="2" seed="11" result="f"/><feColorMatrix in="f" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  10 0 0 0 -6.3" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>` +
      stroke(118, 222, -91.5, 7, 7.7, AZUL, 'seco', 0.92) +
      stroke(150, 262, -89, 1.6, 6.6, AZUL, 'seco', 0.6) +
      `<g fill="${INK}" filter="url(#logo-tinta)">${word}</g>` +
      `<g fill="${PAPER}" filter="url(#logo-falhas)" opacity="0.85">${word}</g>` +
      // Pingo escorrendo do pé do E e respingos em volta.
      `<path d="M836 228 Q840 262 842 270 Q845 262 848 228 Z" fill="${INK}" filter="url(#tinta)"/><circle cx="842" cy="272" r="7" fill="${INK}" filter="url(#tinta)"/>` +
      `<g fill="${INK}"><circle cx="122" cy="52" r="9"/><circle cx="102" cy="74" r="4"/><circle cx="146" cy="36" r="3"/><circle cx="884" cy="70" r="6"/><circle cx="902" cy="92" r="3"/><circle cx="870" cy="46" r="2.5"/></g>` +
      `<g fill="${AZUL}"><circle cx="90" cy="250" r="5"/><circle cx="72" cy="238" r="2.6"/><circle cx="930" cy="260" r="4"/></g>`,
  );
}

/** Largura e altura do palco, em unidades do SVG (as posições da cena usam as mesmas). */
export const STAGE_W = 1000;
export const STAGE_H = 420;
export const GROUND = 372;

/** Plataforma atravessável no estilo da arena: aguada, hachura, pincelada seca e um pingo. */
function ledge(x0: number, x1: number, y: number, i: number): string {
  const w = x1 - x0;
  const len = (w + 12) / 100;
  const drip = x0 + 24 + hash(i + 2) * (w - 48);
  return (
    `<rect x="${x0 + 8}" y="${y + 14}" width="${w - 8}" height="36" fill="#6d665a" opacity="0.14" filter="url(#borra)"/>` +
    `<path d="M${x0 + 6} ${y + 13} L${x1 - 6} ${y + 12} L${x1 - 14} ${y + 31} Q${x0 + w / 2} ${y + 37} ${x0 + 14} ${y + 31} Z" fill="url(#hachura)" opacity="0.55" filter="url(#tecido)"/>` +
    `<path d="M${x0 + 3} ${y + 29} Q${x0 + w / 2} ${y + 38} ${x1 - 3} ${y + 28}" stroke="${INK}" stroke-width="2.6" fill="none" opacity="0.6" filter="url(#tinta)"/>` +
    (i % 2 === 0 ? stroke(x0 - 6, y + 5, -90, 2.4, len, INK, 'seco') : stroke(x1 + 6, y + 5, 90, 2.4, len, INK, 'seco')) +
    stroke(x0 + 4, y + 4, -90, 1.5, len * 0.97) +
    `<path d="M${drip - 4} ${y + 16} Q${drip - 1} ${y + 36} ${drip} ${y + 40} Q${drip + 1} ${y + 36} ${drip + 4} ${y + 16} Z" fill="${INK}"/><circle cx="${drip}" cy="${y + 41}" r="4.5" fill="${INK}"/>` +
    `<circle cx="${x1 + 14}" cy="${y + 2}" r="3" fill="${INK}"/><circle cx="${x0 - 12}" cy="${y + 10}" r="2.2" fill="${INK}"/>`
  );
}

/** Plataformas do palco, em unidades do palco; os bonecos se apoiam no `y` de cada uma. */
export const LEDGES = {
  esquerda: { x0: 50, x1: 330, y: 236 },
  meio: { x0: 400, x1: 570, y: 126 },
  direita: { x0: 680, x1: 960, y: 236 },
} as const;

/** Palco da capa: chão de nanquim e três plataformas, fundo transparente (o papel é da página). */
export function palcoSvg(): string {
  const ground =
    `<rect x="-20" y="${GROUND + 8}" width="${STAGE_W + 40}" height="40" fill="url(#hachura)" opacity="0.3" filter="url(#tecido)"/>` +
    stroke(-20, GROUND + 6, -90, 2.6, (STAGE_W + 40) / 100, INK, 'seco') +
    stroke(-20, GROUND + 4, -90, 1.4, (STAGE_W + 40) / 100) +
    stroke(40, GROUND + 22, -90, 0.5, 3.2, '#6d665a', 'seco', 0.6) +
    stroke(560, GROUND + 26, -90, 0.5, 2.6, '#6d665a', 'seco', 0.6);
  const ledges = Object.values(LEDGES)
    .map((l, i) => ledge(l.x0, l.x1, l.y, i))
    .join('');
  return svgDoc(`0 0 ${STAGE_W} ${STAGE_H}`, ground + ledges);
}

/** Mancha de pincel para o fundo dos botões cheios (esticada pelo CSS). */
export function pincelSvg(color: string): string {
  return svgDoc(
    '0 0 300 64',
    `<path d="M8 12 Q90 4 292 9 Q297 30 293 52 Q150 61 6 55 Q2 32 8 12 Z" fill="${color}" filter="url(#tinta)"/>` +
      stroke(14, 20, -90, 0.5, 2.6, PAPER, 'seco', 0.18) +
      stroke(20, 46, -90, 0.4, 2.2, PAPER, 'seco', 0.14),
  );
}
