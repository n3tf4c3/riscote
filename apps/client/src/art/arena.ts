import { ONE_WAY, SOLID, TILE, cellAt, type Arena } from '@riscote/shared';
import { INK, PAPER, hash, stroke, svgDoc } from './svg';

// Arena em tinta (quadro "Cenário" da prancha), gerada das células do mapa em duas camadas:
// o fundo de caderno e, por cima dos efeitos, as plataformas e paredes.
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

/** Página de caderno apagada: grão e manchas do papel, pauta, margem, rabiscos de lápis e uma borda de café. */
export function arenaFundoSvg(a: Arena): string {
  const w = a.cols * C;
  const h = a.rows * C;
  const lines: string[] = [];
  for (let y = C; y < h; y += C) lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  const at = (fx: number, fy: number, s = 1) => `translate(${Math.round(fx * w)} ${Math.round(fy * h)}) scale(${s})`;
  return svgDoc(
    `0 0 ${w} ${h}`,
    `<radialGradient id="vinheta" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#7a6040" stop-opacity="0"/><stop offset="100%" stop-color="#7a6040" stop-opacity="0.22"/></radialGradient>` +
      `<rect width="${w}" height="${h}" fill="${PAPER}"/>` +
      `<rect width="${w}" height="${h}" filter="url(#manchas)"/>` +
      `<rect width="${w}" height="${h}" filter="url(#papel)"/>` +
      `<g stroke="#c9bda4" stroke-width="1.2" opacity="0.75">${lines.join('')}</g>` +
      `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#d29a8c" stroke-width="2" opacity="0.55"/>` +
      // Rabiscos de lápis bem apagados: casinha, sol, ondas, montanhas e anotações.
      `<g fill="none" stroke="#6d665a" stroke-width="2.2" opacity="0.15" stroke-linecap="round" stroke-linejoin="round">` +
      `<path transform="${at(0.18, 0.2, 1.6)}" d="M0 40 L0 0 L30 -20 L60 0 L60 40 Z M20 40 L20 18 L40 18 L40 40 M8 6 L52 6"/>` +
      `<path transform="${at(0.766, 0.133)}" d="M0 0 a26 26 0 1 1 -1 0 M0 -26 v-14 M26 0 h14 M-26 0 h-14 M0 26 v14 M18 -18 l10 -10 M-18 -18 l-10 -10"/>` +
      `<path transform="${at(0.47, 0.32, 1.4)}" d="M0 0 q20 -30 40 0 t40 0 t40 0 M0 14 q20 -30 40 0 t40 0 t40 0"/>` +
      `<path transform="${at(0.1, 0.7, 1.3)}" d="M0 0 l30 -40 l30 40 l26 -30 l30 30 M10 -6 l8 -10 M40 -8 l6 -10 M70 -4 l6 -8"/>` +
      `<path transform="${at(0.84, 0.62, 1.2)}" d="M0 0 q14 -26 28 0 q14 26 28 0 M-6 30 h70 M-6 38 h50"/>` +
      `<path transform="${at(0.6, 0.85, 1.2)}" d="M0 0 c10 -20 30 -20 40 0 c-10 8 -30 8 -40 0 M40 0 l14 -8 l0 16 Z"/>` +
      `</g>` +
      `<circle cx="${Math.round(0.867 * w)}" cy="${Math.round(0.847 * h)}" r="40" fill="none" stroke="#a9845a" stroke-width="9" opacity="0.16" filter="url(#borra)"/>` +
      `<circle cx="${Math.round(0.3 * w)}" cy="${Math.round(0.08 * h)}" r="5" fill="${INK}" opacity="0.16" filter="url(#borra)"/>` +
      `<circle cx="${Math.round(0.62 * w)}" cy="${Math.round(0.55 * h)}" r="3" fill="${INK}" opacity="0.12" filter="url(#borra)"/>` +
      `<rect width="${w}" height="${h}" fill="url(#vinheta)"/>`,
  );
}

/** Plataformas e paredes (fundo transparente), em pixels do mundo × 2. Sem tubos nem surgimentos. */
export function arenaSvg(a: Arena): string {
  const w = a.cols * C;
  const h = a.rows * C;
  const parts: string[] = [];

  // Atravessável: sombra de aguada no papel, hachura de nanquim e a pincelada grossa com pontas soltas.
  rects(a, ONE_WAY).forEach((r, i) => {
    const x = r.c0 * C;
    const y = r.r0 * C;
    const rw = (r.c1 - r.c0 + 1) * C;
    const len = (rw + 8) / 100;
    parts.push(
      `<rect x="${x + 6}" y="${y + 10}" width="${rw - 6}" height="26" fill="#6d665a" opacity="0.14" filter="url(#borra)"/>` +
        `<path d="M${x + 4} ${y + 9} L${x + rw - 4} ${y + 8} L${x + rw - 10} ${y + 21} Q${x + rw / 2} ${y + 25} ${x + 10} ${y + 21} Z" fill="url(#hachura)" opacity="0.55" filter="url(#tecido)"/>` +
        `<path d="M${x + 2} ${y + 20} Q${x + rw / 2} ${y + 26} ${x + rw - 2} ${y + 19}" stroke="${INK}" stroke-width="2" fill="none" opacity="0.6" filter="url(#tinta)"/>` +
        (i % 2 === 0 ? stroke(x - 4, y + 4, -90, 1.6, len, INK, 'seco') : stroke(x + rw + 4, y + 4, 90, 1.6, len, INK, 'seco')) +
        stroke(x + 3, y + 3, -90, 1.0, len * 0.97),
    );
    // Um pingo pendurado perto de uma das pontas e respingos soltos.
    const dx = hash(i) > 0.5 ? x + 12 + hash(i + 3) * 30 : x + rw - 14 - hash(i + 5) * 30;
    parts.push(
      `<path d="M${dx - 3} ${y + 12} Q${dx - 1} ${y + 26} ${dx} ${y + 28} Q${dx + 1} ${y + 26} ${dx + 3} ${y + 12} Z" fill="${INK}"/><circle cx="${dx}" cy="${y + 28}" r="3.2" fill="${INK}"/>` +
        `<circle cx="${x + rw + 9}" cy="${y + 2}" r="2.2" fill="${INK}"/><circle cx="${x - 8}" cy="${y + 7}" r="1.6" fill="${INK}"/>`,
    );
  });

  // Sólido: nanquim pesado com as fibras do pincel por dentro, uma quina de luz no topo e escorridos embaixo.
  rects(a, SOLID).forEach((r, i) => {
    const x = r.c0 * C;
    const y = r.r0 * C;
    const rw = (r.c1 - r.c0 + 1) * C;
    const rh = (r.r1 - r.r0 + 1) * C;
    const tall = rh > rw;
    // Nas bordas da página o bloco passa um pouco do quadro: o filtro de tinta não puxa papel de fora.
    const bx = x === 0 ? -12 : x;
    const by = y === 0 ? -12 : y;
    const bw = (x + rw === w ? w + 12 : x + rw) - bx;
    const bh = (y + rh === h ? h + 12 : y + rh) - by;
    parts.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${INK}" filter="url(#tinta)"/>`);
    const n = Math.floor((tall ? rw : rh) / 9);
    for (let k = 1; k < n; k++) {
      const o = k * 9 + hash(i * 31 + k) * 4;
      parts.push(tall ? stroke(x + o, y + 4, 0, 0.35, (rh - 8) / 100, '#36332e', 'seco') : stroke(x + 4, y + o, -90, 0.35, (rw - 8) / 100, '#36332e', 'seco'));
    }
    if (!tall && y > 0) {
      parts.push(stroke(x - 4, y + 2, -90, 1.4, (rw + 8) / 100, INK, 'seco'));
      parts.push(stroke(x + 6, y + 7, -90, 0.42, (rw - 14) / 100, PAPER, 'seco', 0.45));
    }
    if (!tall && y + rh < h - 1) {
      for (let k = 0; k < Math.max(1, Math.floor(rw / 90)); k++) {
        const dx = x + 20 + hash(i * 7 + k) * (rw - 40);
        const dl = 10 + hash(i * 13 + k) * 18;
        parts.push(`<path d="M${dx - 5} ${y + rh - 2} Q${dx - 1} ${y + rh + dl - 4} ${dx} ${y + rh + dl} Q${dx + 1} ${y + rh + dl - 4} ${dx + 5} ${y + rh - 2} Z" fill="${INK}" filter="url(#tinta)"/><circle cx="${dx}" cy="${y + rh + dl}" r="4" fill="${INK}"/>`);
      }
    }
    if (tall && x === 0) parts.push(stroke(x + rw + 2, y - 4, 0, 1.5, (rh + 8) / 100, INK, 'seco'));
    if (tall && x + rw === w) parts.push(stroke(x - 2, y + rh + 4, 180, 1.5, (rh + 8) / 100, INK, 'seco'));
  });
  return svgDoc(`0 0 ${w} ${h}`, parts.join(''));
}

/** Bisnaga de tinta azul (só no modo difícil); base no ponto (0, 80). */
export function tuboSvg(): string {
  const body = 'M-15 20 Q0 16 15 20 L13 70 L-13 70 Z';
  return svgDoc(
    '-20 0 40 82',
    `<clipPath id="lado"><rect x="4" y="16" width="14" height="56"/></clipPath>` +
      `<rect x="-9" y="2" width="18" height="12" rx="2" fill="${INK}" filter="url(#tinta)"/>` +
      `<path d="M-6 5 L-6 11 M-2 5 L-2 11 M2 5 L2 11 M6 5 L6 11" stroke="#4a4642" stroke-width="1.2"/>` +
      `<rect x="-5" y="13" width="10" height="7" fill="${INK}"/>` +
      `<path d="${body}" fill="#2f6fd6" filter="url(#tecido)"/>` +
      `<path d="${body}" fill="url(#hachura-fina)" opacity="0.4" clip-path="url(#lado)"/>` +
      `<rect x="-11" y="36" width="22" height="16" fill="${PAPER}" transform="rotate(-4 0 44)"/>` +
      `<path d="M-6 44 Q-9 50 -6 52 Q-3 50 -6 44 Z M4 42 L4 50 M0 46 L8 46" fill="#2f6fd6" stroke="#2f6fd6" stroke-width="2" stroke-linecap="round" transform="rotate(-4 0 44)"/>` +
      `<path d="${body}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" filter="url(#tinta)"/>` +
      `<rect x="-15" y="70" width="30" height="9" fill="${INK}" filter="url(#tinta)"/>` +
      `<path d="M-11 72 L-11 78 M-5 72 L-5 78 M1 72 L1 78 M7 72 L7 78" stroke="${PAPER}" stroke-width="1.4"/>` +
      `<path d="M-8 24 Q-10 30 -9 34" stroke="${PAPER}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.7"/>` +
      `<path d="M10 70 Q11 76 10 80" stroke="#2f6fd6" stroke-width="3" stroke-linecap="round"/>`,
  );
}

export const ARENA_UNITS = U;
