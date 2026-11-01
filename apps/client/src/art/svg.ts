// Peças comuns da arte de cartum (direção de 2026-10-31): traço grosso azul-marinho de espessura
// constante, cores chapadas, sombra dura deslocada e rostos expressivos sobre papel pautado.
// Tudo vira SVG em texto e é rasterizado uma vez em textura (art/textures.ts).

/** Traço de contorno, olhos, bocas e blocos sólidos: azul-marinho quase preto. */
export const INK = '#1f2433';
/** Papel do caderno. */
export const PAPER = '#f6f1e7';
/** Linhas da pauta. */
export const PAPER_LINE = '#e3dbca';
export const WHITE = '#ffffff';

/** Paleta de apoio (cartões, plataformas, efeitos e interface). */
export const PALETTE = {
  azul: '#2f6fd6',
  laranja: '#ff6b3d',
  amarelo: '#ffc234',
  verdeAgua: '#15a08c',
  pessego: '#ffd2c2',
  rosa: '#ff8fa3',
  cinza: '#8a90a0',
  cinzaClaro: '#c9cdd6',
  vermelhoBoca: '#c8344a',
  lingua: '#ff7b8a',
} as const;

/**
 * Linha viva: na arte de pincel cada desenho tinha 3 variações de filtro alternadas a ~9 qps.
 * O cartum é de traço limpo, então há uma só (as chaves e a troca continuam, para não mexer no resto).
 */
export const BOIL = 1;

/**
 * Sombra dura deslocada (como os cartões das referências), em unidades do próprio desenho.
 * Use com `filter="url(#sombra)"` num grupo; `shadowFilter` cria outra com deslocamento próprio.
 */
export function shadowFilter(id: string, dx: number, dy: number, opacity = 0.22): string {
  return (
    `<filter id="${id}" x="-20%" y="-20%" width="150%" height="150%">` +
    `<feOffset in="SourceAlpha" dx="${dx}" dy="${dy}" result="d"/>` +
    `<feFlood flood-color="${INK}" flood-opacity="${opacity}"/><feComposite in2="d" operator="in" result="s"/>` +
    `<feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
  );
}

export function svgDoc(viewBox: string, body: string, _variant = 0): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><defs>${shadowFilter('sombra', 4, 5)}</defs>${body}</svg>`;
}

/** Forma chapada com contorno de traço constante (o padrão de tudo). */
export function outlined(d: string, fill: string, w = 6, extra = ''): string {
  return `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
}

/** Elipse chapada com contorno. */
export function oval(cx: number, cy: number, rx: number, ry: number, fill: string, w = 6, extra = ''): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${INK}" stroke-width="${w}"${extra}/>`;
}

/**
 * Membro em cápsula (braço, perna, pata) passando pelos pontos: o contorno é a mesma linha mais
 * grossa por baixo. `width` é a grossura do miolo; `w` a do contorno de cada lado.
 */
export function capsule(points: ReadonlyArray<readonly [number, number]>, width: number, fill: string, w = 6): string {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const line = (color: string, sw: number) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return line(INK, width + w * 2) + line(fill, width);
}

/** Risco de brilho branco (reflexo no alto das formas). */
export function shine(d: string, w = 4, opacity = 0.85): string {
  return `<path d="${d}" fill="none" stroke="${WHITE}" stroke-width="${w}" stroke-linecap="round" opacity="${opacity}"/>`;
}

/** Bochecha corada. */
export function blush(cx: number, cy: number, r: number, opacity = 0.55): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.62}" fill="${PALETTE.rosa}" opacity="${opacity}"/>`;
}

/**
 * Olho de cartum: branco com contorno, pupila marinho e brilho. `look` desloca a pupila
 * (fração do raio; positivo = para a direita/baixo); `pupil` é a fração do raio da pupila.
 */
export function eye(cx: number, cy: number, rx: number, ry: number, look: readonly [number, number] = [0.3, 0.05], pupil = 0.55, w = 3.5): string {
  const pr = Math.min(rx, ry) * pupil;
  const px = cx + look[0] * (rx - pr);
  const py = cy + look[1] * (ry - pr);
  return (
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${WHITE}" stroke="${INK}" stroke-width="${w}"/>` +
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${INK}"/>` +
    `<circle cx="${(px + pr * 0.35).toFixed(1)}" cy="${(py - pr * 0.4).toFixed(1)}" r="${(pr * 0.32).toFixed(1)}" fill="${WHITE}"/>`
  );
}

/** Traço solto de marinho (sobrancelha, boca fechada, risco de movimento). */
export function line(d: string, w = 4.5, color = INK): string {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Boca aberta: miolo vermelho com língua, contorno marinho. `d` é o contorno da boca. */
export function openMouth(d: string, tongue: readonly [number, number, number], w = 3.5): string {
  const [tx, ty, tr] = tongue;
  const id = `boca${Math.round(tx * 7 + ty * 13)}`;
  return (
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${PALETTE.vermelhoBoca}"/>` +
    `<ellipse cx="${tx}" cy="${ty}" rx="${tr}" ry="${tr * 0.7}" fill="${PALETTE.lingua}" clip-path="url(#${id})"/>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`
  );
}

/** Degradê linear (usado com parcimônia: o cartum é de cor chapada). Use com `url(#id)`. */
export function gradient(id: string, from: string, to: string, angle = 25, lineXY?: readonly [number, number, number, number]): string {
  const stops = `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
  if (lineXY) return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${lineXY[0]}" y1="${lineXY[1]}" x2="${lineXY[2]}" y2="${lineXY[3]}">${stops}`;
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a) / 2;
  const dy = Math.sin(a) / 2;
  const p = (v: number) => (0.5 + v).toFixed(3);
  return `<linearGradient id="${id}" x1="${p(-dx)}" y1="${p(-dy)}" x2="${p(dx)}" y2="${p(dy)}">${stops}`;
}

/** Ponto a `len` unidades de (x, y), na direção `rot` graus (0 = para baixo, 90 = para a esquerda). */
export function strokeEnd(x: number, y: number, rot: number, len: number): [number, number] {
  const a = (rot * Math.PI) / 180;
  return [x - len * Math.sin(a), y + len * Math.cos(a)];
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Escurece (k < 1) ou clareia em direção ao branco (k > 1) uma cor `#rrggbb`. */
export function shade(color: string, k: number): string {
  const n = parseInt(color.slice(1), 16);
  const f = (v: number) => (k <= 1 ? v * k : v + (255 - v) * (k - 1));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, Math.max(0, f(v)))).toString(16).padStart(2, '0')).join('')}`;
}

/** Sorteio fixo a partir de um número (desenho determinístico, sem Math.random). */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
