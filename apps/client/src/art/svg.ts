// Peças comuns da arte de pincel (prancha "Riscote — personagens" no Claude Design).
// Tudo vira SVG em texto e é rasterizado uma vez em textura (art/textures.ts).

export const INK = '#141414';
export const PAPER = '#efe8d8';

/**
 * Linha viva: cada desenho é rasterizado em `BOIL` variações que só trocam a semente do ruído
 * dos filtros; o jogo alterna entre elas a ~9 quadros por segundo (plano, seção 3).
 */
export const BOIL = 3;

/** Filtros de tinta, hachuras e o traço-base: uma pincelada vertical de 100 unidades que afina na ponta. */
function defs(variant: number): string {
  const s = (seed: number) => seed + variant * 31;
  return `<defs>
<filter id="tinta" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="${s(3)}" result="ruido"/><feDisplacementMap in="SourceGraphic" in2="ruido" scale="3"/></filter>
<filter id="seco" x="-60%" y="-8%" width="220%" height="116%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.75 0.016" numOctaves="2" seed="${s(5)}" result="fibras"/><feColorMatrix in="fibras" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  4 0 0 0 -0.95" result="mascara"/><feComposite in="SourceGraphic" in2="mascara" operator="in" result="riscado"/><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="${s(9)}" result="borda"/><feDisplacementMap in="riscado" in2="borda" scale="3"/></filter>
<filter id="tecido" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.55 0.04" numOctaves="2" seed="${s(8)}" result="fibras"/><feColorMatrix in="fibras" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.35" result="mascara"/><feComposite in="SourceGraphic" in2="mascara" operator="in" result="riscado"/><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="${s(2)}" result="borda"/><feDisplacementMap in="riscado" in2="borda" scale="3"/></filter>
<filter id="borra" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="${s(17)}" result="ruido"/><feDisplacementMap in="SourceGraphic" in2="ruido" scale="16"/></filter>
<filter id="papel" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="12" result="grao"/><feColorMatrix in="grao" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.09 0"/></filter>
<filter id="manchas" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="3" seed="21"/><feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0.35 -0.08"/></filter>
<pattern id="hachura" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="3" height="10" fill="${INK}"/></pattern>
<pattern id="hachura-fina" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)"><rect width="2.2" height="7" fill="${INK}"/></pattern>
<path id="traco" d="M-4.5 1 Q0 -2.5 4.5 1 Q4 50 2.6 96 Q0.4 103 -1.6 97 Q-4 50 -4.5 1 Z"/>
</defs>`;
}

export function svgDoc(viewBox: string, body: string, variant = 0): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${defs(variant)}${body}</svg>`;
}

/**
 * Uma pincelada: parte de (x, y), gira `rot` graus (0 = para baixo), largura `w` (× 9 unidades)
 * e comprimento `len` (× 100 unidades).
 */
export function stroke(x: number, y: number, rot: number, w: number, len: number, fill = INK, filter = 'tinta', opacity = 1): string {
  const op = opacity < 1 ? ` opacity="${opacity}"` : '';
  return `<use href="#traco" transform="translate(${x} ${y}) rotate(${rot}) scale(${w} ${len})" fill="${fill}" filter="url(#${filter})"${op}/>`;
}

/** Ponta de uma pincelada de `stroke` (mesma convenção de rotação). */
export function strokeEnd(x: number, y: number, rot: number, len: number): [number, number] {
  const a = (rot * Math.PI) / 180;
  return [x - len * 100 * Math.sin(a), y + len * 100 * Math.cos(a)];
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Escurece uma cor `#rrggbb` (k < 1) para sombras de cor. */
export function shade(color: string, k: number): string {
  const n = parseInt(color.slice(1), 16);
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('')}`;
}

/** Sorteio fixo a partir de um número (desenho determinístico, sem Math.random). */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
