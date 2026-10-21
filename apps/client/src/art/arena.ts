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

type At = (fx: number, fy: number, s?: number) => string;

/** Linhas da página e rabiscos de lápis de cada tema; os rabiscos herdam o traço apagado do grupo. */
interface Tema {
  pauta: (w: number, h: number) => string;
  rabiscos: (at: At, w: number, h: number) => string;
}

function linhas(w: number, h: number, passo: number, verticais = false): string {
  const out: string[] = [];
  for (let y = passo; y < h; y += passo) out.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  if (verticais) for (let x = passo; x < w; x += passo) out.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  return out.join('');
}

/** Caderno pautado (capítulo 1): casinha, sol, ondas, montanhas e anotações. */
const CADERNO: Tema = {
  pauta: (w, h) => `<g stroke="#c9bda4" stroke-width="1.2" opacity="0.75">${linhas(w, h, C)}</g>`,
  rabiscos: (at) =>
    `<path transform="${at(0.18, 0.2, 1.6)}" d="M0 40 L0 0 L30 -20 L60 0 L60 40 Z M20 40 L20 18 L40 18 L40 40 M8 6 L52 6"/>` +
    `<path transform="${at(0.766, 0.133)}" d="M0 0 a26 26 0 1 1 -1 0 M0 -26 v-14 M26 0 h14 M-26 0 h-14 M0 26 v14 M18 -18 l10 -10 M-18 -18 l-10 -10"/>` +
    `<path transform="${at(0.47, 0.32, 1.4)}" d="M0 0 q20 -30 40 0 t40 0 t40 0 M0 14 q20 -30 40 0 t40 0 t40 0"/>` +
    `<path transform="${at(0.1, 0.7, 1.3)}" d="M0 0 l30 -40 l30 40 l26 -30 l30 30 M10 -6 l8 -10 M40 -8 l6 -10 M70 -4 l6 -8"/>` +
    `<path transform="${at(0.84, 0.62, 1.2)}" d="M0 0 q14 -26 28 0 q14 26 28 0 M-6 30 h70 M-6 38 h50"/>` +
    `<path transform="${at(0.6, 0.85, 1.2)}" d="M0 0 c10 -20 30 -20 40 0 c-10 8 -30 8 -40 0 M40 0 l14 -8 l0 16 Z"/>`,
};

/** Papel quadriculado de matemática: gráfico de parábola, triângulo, compasso e uma conta. */
const QUADRICULADA: Tema = {
  pauta: (w, h) =>
    `<g stroke="#c9bda4" stroke-width="0.8" opacity="0.6">${linhas(w, h, C / 2, true)}</g>` +
    `<g stroke="#bfb196" stroke-width="1.3" opacity="0.5">${linhas(w, h, C * 2, true)}</g>`,
  rabiscos: (at) =>
    `<path transform="${at(0.2, 0.3, 1.5)}" d="M0 0 v-80 M0 0 h100 M-4 -74 l4 -6 l4 6 M94 -4 l6 4 l-6 4 M12 -70 Q46 64 80 -70"/>` +
    `<path transform="${at(0.72, 0.2, 1.4)}" d="M0 0 L80 0 L24 -54 Z M24 -54 L24 0 M24 -9 h9 v9 M8 0 a10 10 0 0 0 -2 -8"/>` +
    `<path transform="${at(0.5, 0.56, 1.3)}" d="M-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0 M0 0 L30 -16 M0 0 l-2 -48 l-8 -26 M-2 -48 l8 -26"/>` +
    `<path transform="${at(0.14, 0.82, 1.4)}" d="M0 -20 L6 -26 L6 0 M16 -12 h12 M22 -18 v12 M36 -20 L42 -26 L42 0 M52 -15 h12 M52 -8 h12 M72 -20 q8 -12 16 -2 q0 6 -16 22 h18"/>` +
    `<path transform="${at(0.82, 0.74, 1.3)}" d="M0 0 h60 M0 -14 h44 M8 -30 l10 10 M18 -30 l-10 10 M30 -30 v10 M26 -26 h8"/>`,
};

/** Partitura: pautas de cinco linhas com barras de compasso, clave, notas e uma ligadura. */
const PARTITURA: Tema = {
  pauta: (w, h) => {
    const out: string[] = [];
    for (let y = C * 0.75; y + 48 < h; y += C * 3) {
      for (let i = 0; i < 5; i++) out.push(`<line x1="0" y1="${y + i * 12}" x2="${w}" y2="${y + i * 12}"/>`);
      for (let x = w / 4; x < w; x += w / 4) out.push(`<line x1="${Math.round(x)}" y1="${y}" x2="${Math.round(x)}" y2="${y + 48}"/>`);
    }
    return `<g stroke="#c9bda4" stroke-width="1.2" opacity="0.75">${out.join('')}</g>`;
  },
  rabiscos: (at) =>
    `<path transform="${at(0.09, 0.15, 1.5)}" d="M10 40 q-14 -6 -8 -18 q8 -12 18 -2 q8 12 -6 22 q-18 8 -20 -14 q0 -20 22 -40 q10 -14 2 -22 q-10 0 -10 22 l6 76 q2 12 -8 10 q-6 -2 -4 -8"/>` +
    `<path transform="${at(0.3, 0.4, 1.4)}" d="M0 0 a9 6 -20 1 0 18 -4 a9 6 -20 1 0 -18 4 M18 -4 v-52 M40 -10 a9 6 -20 1 0 18 -4 a9 6 -20 1 0 -18 4 M58 -14 v-50 M18 -56 L58 -64 M18 -48 L58 -56"/>` +
    `<path transform="${at(0.68, 0.18, 1.4)}" d="M0 0 a9 6 -20 1 0 18 -4 a9 6 -20 1 0 -18 4 M18 -4 v-52 q14 10 16 28"/>` +
    `<path transform="${at(0.6, 0.72, 1.3)}" d="M0 0 q50 -40 100 0 M48 -40 a3 3 0 1 0 0.1 0 M10 20 l10 -6 l10 6 l10 -6 l10 6"/>` +
    `<path transform="${at(0.86, 0.5, 1.3)}" d="M0 0 a9 6 -20 1 0 18 -4 a9 6 -20 1 0 -18 4 M0 0 v44 M-14 30 l28 -8 M-14 40 l28 -8"/>`,
};

/** Mapa do tesouro: trilha pontilhada até o X, rosa dos ventos, ilha com coqueiro e um barquinho. */
const MAPA: Tema = {
  pauta: (w, h) => `<g stroke="#c9bda4" stroke-width="1.2" opacity="0.55">${linhas(w, h, C)}</g>`,
  rabiscos: (at, w, h) =>
    `<path stroke-dasharray="7 11" d="M${Math.round(0.06 * w)} ${Math.round(0.9 * h)} C${Math.round(0.3 * w)} ${Math.round(0.95 * h)} ${Math.round(0.2 * w)} ${Math.round(0.55 * h)} ${Math.round(0.4 * w)} ${Math.round(0.6 * h)} S${Math.round(0.7 * w)} ${Math.round(0.4 * h)} ${Math.round(0.56 * w)} ${Math.round(0.3 * h)} S${Math.round(0.42 * w)} ${Math.round(0.12 * h)} ${Math.round(0.5 * w)} ${Math.round(0.08 * h)}"/>` +
    `<path transform="${at(0.5, 0.08, 1.4)}" stroke-width="3.4" d="M-12 -12 L12 12 M12 -12 L-12 12"/>` +
    `<path transform="${at(0.12, 0.2, 1.4)}" d="M0 -40 L8 -8 L40 0 L8 8 L0 40 L-8 8 L-40 0 L-8 -8 Z M0 -40 v-8 M-4 -58 v-10 l8 10 v-10 M-26 -26 l-6 -6 M26 26 l6 6"/>` +
    `<path transform="${at(0.8, 0.22, 1.3)}" d="M-50 10 q10 -24 40 -22 q30 -6 54 10 q10 12 -10 16 q-40 8 -84 -4 M0 -12 q4 -30 -4 -48 M-4 -60 q-20 -4 -26 8 M-4 -60 q14 -10 26 0 M-4 -60 q-8 -14 -22 -14"/>` +
    `<path transform="${at(0.84, 0.66, 1.3)}" d="M-30 0 h60 l-10 14 h-40 Z M0 0 v-46 l26 30 h-26 M-60 26 q10 -8 20 0 t20 0 t20 0 t20 0 t20 0 t20 0"/>`,
};

const TEMAS: Record<string, Tema> = { quadriculada: QUADRICULADA, partitura: PARTITURA, mapa: MAPA };

/** Página de caderno apagada: grão e manchas do papel, pauta ou papel do tema, margem, rabiscos de lápis e uma borda de café. */
export function arenaFundoSvg(a: Arena): string {
  const w = a.cols * C;
  const h = a.rows * C;
  const tema = TEMAS[a.id] ?? CADERNO;
  const at: At = (fx, fy, s = 1) => `translate(${Math.round(fx * w)} ${Math.round(fy * h)}) scale(${s})`;
  return svgDoc(
    `0 0 ${w} ${h}`,
    `<radialGradient id="vinheta" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#7a6040" stop-opacity="0"/><stop offset="100%" stop-color="#7a6040" stop-opacity="0.22"/></radialGradient>` +
      `<rect width="${w}" height="${h}" fill="${PAPER}"/>` +
      `<rect width="${w}" height="${h}" filter="url(#manchas)"/>` +
      `<rect width="${w}" height="${h}" filter="url(#papel)"/>` +
      tema.pauta(w, h) +
      `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#d29a8c" stroke-width="2" opacity="0.55"/>` +
      `<g fill="none" stroke="#6d665a" stroke-width="2.2" opacity="0.15" stroke-linecap="round" stroke-linejoin="round">${tema.rabiscos(at, w, h)}</g>` +
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
