import { SOLID, TILE, cellAt, type Arena } from '@riscote/shared';

// Geometria das células da arena, comum aos temas: retângulos de um tipo, o caminho dos sólidos
// e os topos expostos (onde dá para pisar). Unidades na escala 2: uma célula = 40.

export const U = 2;
export const C = TILE * U;

export interface Rect {
  c0: number;
  c1: number;
  r0: number;
  r1: number;
}

/** Junta as células de um tipo em retângulos: trechos por linha, depois trechos iguais em linhas seguidas. */
export function rects(a: Arena, kind: number): Rect[] {
  const done: Rect[] = [];
  let open: Rect[] = [];
  for (let r = 0; r < a.rows; r++) {
    const runs: Array<[number, number]> = [];
    for (let c = 0; c < a.cols; c++) {
      if (cellAt(a, c, r) !== kind) continue;
      const start = c;
      while (c + 1 < a.cols && cellAt(a, c + 1, r) === kind) c++;
      runs.push([start, c]);
    }
    const next: Rect[] = [];
    for (const [c0, c1] of runs) {
      const prev = open.find((o) => o.c0 === c0 && o.c1 === c1);
      if (prev) {
        prev.r1 = r;
        next.push(prev);
      } else next.push({ c0, c1, r0: r, r1: r });
    }
    done.push(...open.filter((o) => !next.includes(o)));
    open = next;
  }
  return done.concat(open);
}

/** Sólidos como um só caminho: cada célula com os cantos de fora arredondados (sem emendas entre blocos). */
export function solidPath(a: Arena): string {
  const R = 10;
  const solid = (c: number, r: number) => cellAt(a, c, r) === SOLID;
  let d = '';
  for (let r = 0; r < a.rows; r++) {
    for (let c = 0; c < a.cols; c++) {
      if (!solid(c, r)) continue;
      // Na borda da página o bloco passa do quadro, para não deixar fresta.
      const x0 = c === 0 ? -8 : c * C;
      const y0 = r === 0 ? -8 : r * C;
      const x1 = c === a.cols - 1 ? a.cols * C + 8 : (c + 1) * C;
      const y1 = r === a.rows - 1 ? a.rows * C + 8 : (r + 1) * C;
      // Um canto é de fora quando as duas vizinhas daquele lado estão vazias.
      const tl = !solid(c - 1, r) && !solid(c, r - 1) ? R : 0;
      const tr = !solid(c + 1, r) && !solid(c, r - 1) ? R : 0;
      const br = !solid(c + 1, r) && !solid(c, r + 1) ? R : 0;
      const bl = !solid(c - 1, r) && !solid(c, r + 1) ? R : 0;
      d +=
        `M${x0 + tl} ${y0} L${x1 - tr} ${y0}` +
        (tr ? ` Q${x1} ${y0} ${x1} ${y0 + tr}` : '') +
        ` L${x1} ${y1 - br}` +
        (br ? ` Q${x1} ${y1} ${x1 - br} ${y1}` : '') +
        ` L${x0 + bl} ${y1}` +
        (bl ? ` Q${x0} ${y1} ${x0} ${y1 - bl}` : '') +
        ` L${x0} ${y0 + tl}` +
        (tl ? ` Q${x0} ${y0} ${x0 + tl} ${y0}` : '') +
        ' Z ';
    }
  }
  return d;
}

/** Trecho de topo exposto de um sólido: de `x0` a `x1` na altura `y` (unidades do desenho). */
export interface TopRun {
  x0: number;
  x1: number;
  y: number;
}

/** Topos dos sólidos com espaço livre em cima; as pontas recuam 6 onde o bloco termina. */
export function solidTops(a: Arena): TopRun[] {
  const out: TopRun[] = [];
  for (const r of rects(a, SOLID)) {
    if (r.r0 === 0) continue;
    let c = r.c0;
    while (c <= r.c1) {
      if (cellAt(a, c, r.r0 - 1) === SOLID) {
        c++;
        continue;
      }
      const start = c;
      while (c + 1 <= r.c1 && cellAt(a, c + 1, r.r0 - 1) !== SOLID) c++;
      const x0 = start * C + (cellAt(a, start - 1, r.r0) === SOLID && start > r.c0 ? 0 : 6);
      const x1 = (c + 1) * C - (cellAt(a, c + 1, r.r0) === SOLID && c < r.c1 ? 0 : 6);
      out.push({ x0, x1, y: r.r0 * C });
      c++;
    }
  }
  return out;
}

/** Número curto para o SVG (uma casa decimal). */
export const n = (v: number): string => (Math.round(v * 10) / 10).toString();
