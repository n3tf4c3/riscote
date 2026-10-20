import { ONE_WAY, SOLID, TILE, cellAt, type Arena } from '@riscote/shared';
import { INK, PAPER, stroke, svgDoc } from './svg';

// Arena em tinta (quadro "Cenário" da prancha), gerada das células do mapa.
// Unidades na escala 2 da prancha: uma célula = 40.

const U = 2;
const C = TILE * U;

interface Rect {
  c0: number;
  c1: number;
  r0: number;
  r1: number;
}

/** Junta as células de um tipo em retângulos: trechos por linha, depois trechos iguais em linhas seguidas. */
function rects(a: Arena, kind: number): Rect[] {
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

function background(w: number, h: number): string {
  const lines: string[] = [];
  for (let y = C; y < h; y += C) lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  // Rabiscos de lápis bem apagados, nas mesmas proporções da prancha.
  const at = (fx: number, fy: number) => `translate(${Math.round(fx * w)} ${Math.round(fy * h)})`;
  return (
    `<rect width="${w}" height="${h}" fill="${PAPER}"/>` +
    `<rect width="${w}" height="${h}" filter="url(#papel)"/>` +
    `<g stroke="#cfc4ad" stroke-width="1" opacity="0.7">${lines.join('')}</g>` +
    `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#d9a79b" stroke-width="1.5" opacity="0.5"/>` +
    `<g fill="none" stroke="#6d665a" stroke-width="2" opacity="0.13" stroke-linecap="round">` +
    `<path transform="${at(0.234, 0.208)}" d="M0 0 q20 -30 40 0 t40 0 t40 0"/>` +
    `<path transform="${at(0.766, 0.133)}" d="M0 0 a26 26 0 1 1 -1 0 M0 -26 v-14 M26 0 h14 M-26 0 h-14 M0 26 v14 M18 -18 l10 -10 M-18 -18 l-10 -10"/>` +
    `<path transform="${at(0.484, 0.347)}" d="M0 0 c-30 -10 -30 30 0 20 c30 -10 30 30 0 20"/>` +
    `<path transform="${at(0.141, 0.722)}" d="M0 0 l30 -40 l30 40 l26 -30 l30 30"/>` +
    `<path transform="${at(0.852, 0.722)}" d="M0 0 q14 -26 28 0 q14 26 28 0"/>` +
    `</g>` +
    `<circle cx="${Math.round(0.867 * w)}" cy="${Math.round(0.847 * h)}" r="34" fill="none" stroke="#a9845a" stroke-width="7" opacity="0.13" filter="url(#borra)"/>`
  );
}

/** SVG da arena inteira (sem tubos nem surgimentos), em pixels do mundo × 2. */
export function arenaSvg(a: Arena): string {
  const w = a.cols * C;
  const h = a.rows * C;
  const parts = [background(w, h)];

  // Atravessável: aguada cinza embaixo e uma pincelada seca por cima, alternando o sentido.
  const ways = rects(a, ONE_WAY);
  parts.push(`<g fill="#8a8478" opacity="0.42" filter="url(#tecido)">`);
  for (const r of ways) parts.push(`<rect x="${r.c0 * C}" y="${r.r0 * C + 4}" width="${(r.c1 - r.c0 + 1) * C}" height="16"/>`);
  parts.push(`</g>`);
  ways.forEach((r, i) => {
    const len = ((r.c1 - r.c0 + 1) * C + 5) / 100;
    parts.push(i % 2 === 0 ? stroke(r.c0 * C, r.r0 * C + 5, -90, 1.25, len, INK, 'seco') : stroke((r.c1 + 1) * C, r.r0 * C + 5, 90, 1.25, len, INK, 'seco'));
  });

  // Sólido: nanquim pesado, com a borda de cima e a de dentro das paredes em pincel seco.
  for (const r of rects(a, SOLID)) {
    const x = r.c0 * C;
    const y = r.r0 * C;
    const rw = (r.c1 - r.c0 + 1) * C;
    const rh = (r.r1 - r.r0 + 1) * C;
    parts.push(`<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${INK}" filter="url(#tinta)"/>`);
    const tall = rh > rw;
    if (!tall && y > 0) parts.push(stroke(x - 4, y + 2, -90, 1.4, (rw + 8) / 100, INK, 'seco'));
    if (tall && x === 0) parts.push(stroke(x + rw + 2, y - 4, 0, 1.5, (rh + 8) / 100, INK, 'seco'));
    if (tall && x + rw === w) parts.push(stroke(x - 2, y + rh + 4, 180, 1.5, (rh + 8) / 100, INK, 'seco'));
  }
  return svgDoc(`0 0 ${w} ${h}`, parts.join(''));
}

/** Bisnaga de tinta azul (só no modo difícil); base no ponto (0, 80). */
export function tuboSvg(): string {
  return svgDoc(
    '-20 0 40 82',
    `<rect x="-9" y="2" width="18" height="12" rx="2" fill="${INK}" filter="url(#tinta)"/>` +
      `<rect x="-5" y="13" width="10" height="7" fill="${INK}"/>` +
      `<path d="M-15 20 Q0 16 15 20 L13 70 L-13 70 Z" fill="#2f6fd6" filter="url(#tecido)"/>` +
      `<path d="M-15 20 Q0 16 15 20 L13 70 L-13 70 Z" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" filter="url(#tinta)"/>` +
      `<rect x="-15" y="70" width="30" height="9" fill="${INK}" filter="url(#tinta)"/>` +
      `<path d="M-11 72 L-11 78 M-5 72 L-5 78 M1 72 L1 78 M7 72 L7 78" stroke="${PAPER}" stroke-width="1.4"/>` +
      `<path d="M-6 30 Q-8 44 -6 58" stroke="${PAPER}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.7"/>`,
  );
}

export const ARENA_UNITS = U;
