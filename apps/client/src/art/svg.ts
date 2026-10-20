// Peças comuns da arte de pincel (prancha "Riscote — personagens" no Claude Design).
// Tudo vira SVG em texto e é rasterizado uma vez em textura (art/textures.ts).

export const INK = '#141414';
export const PAPER = '#efe8d8';

/** Filtros de tinta e o traço-base: uma pincelada vertical de 100 unidades que afina na ponta. */
export const DEFS = `<defs>
<filter id="tinta" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="3" result="ruido"/><feDisplacementMap in="SourceGraphic" in2="ruido" scale="3"/></filter>
<filter id="seco" x="-60%" y="-8%" width="220%" height="116%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.75 0.016" numOctaves="2" seed="5" result="fibras"/><feColorMatrix in="fibras" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  4 0 0 0 -0.95" result="mascara"/><feComposite in="SourceGraphic" in2="mascara" operator="in" result="riscado"/><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="9" result="borda"/><feDisplacementMap in="riscado" in2="borda" scale="3"/></filter>
<filter id="tecido" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.55 0.04" numOctaves="2" seed="8" result="fibras"/><feColorMatrix in="fibras" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.35" result="mascara"/><feComposite in="SourceGraphic" in2="mascara" operator="in" result="riscado"/><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="2" result="borda"/><feDisplacementMap in="riscado" in2="borda" scale="3"/></filter>
<filter id="borra" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="17" result="ruido"/><feDisplacementMap in="SourceGraphic" in2="ruido" scale="16"/></filter>
<filter id="papel" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="12" result="grao"/><feColorMatrix in="grao" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.09 0"/></filter>
<path id="traco" d="M-4.5 1 Q0 -2.5 4.5 1 Q4 50 2.6 96 Q0.4 103 -1.6 97 Q-4 50 -4.5 1 Z"/>
</defs>`;

export function svgDoc(viewBox: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${DEFS}${body}</svg>`;
}

/**
 * Uma pincelada: parte de (x, y), gira `rot` graus (0 = para baixo), largura `w` (× 9 unidades)
 * e comprimento `len` (× 100 unidades).
 */
export function stroke(x: number, y: number, rot: number, w: number, len: number, fill = INK, filter = 'tinta'): string {
  return `<use href="#traco" transform="translate(${x} ${y}) rotate(${rot}) scale(${w} ${len})" fill="${fill}" filter="url(#${filter})"/>`;
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
