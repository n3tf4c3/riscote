import { SOLID, cellAt, type Arena } from '@riscote/shared';
import type { Cenario, Tema } from './arena';
import { C, n, solidPath, solidTops, type Rect } from './celulas';
import { INK, WHITE, hash, line, outlined } from './svg';

// Floresta Encantada, "O Bosque das Aparas" (conceito de 2026-11-01, protótipo): troncos que são
// aparas de lápis gigantes, copas fofas, raios de sol de manhã e, ao fundo, uma apara colossal
// com uma janelinha acesa. A referência é a composição de cenário dos jogos de plataforma de
// fantasia de 16 bits (céu em faixas, camadas com perspectiva atmosférica), sem copiar nada deles:
// nem árvore com rosto, nem cogumelo-trampolim, nem aranha.
// Leitura: o fundo é claro, pouco saturado e sem o contorno marinho; os sólidos são escuros com
// tampa de musgo; os galhos (atravessáveis) são cor de mel com contorno marinho e sombra dura.


/** Faixas do céu de cima para baixo (início de cada uma, em fração da altura). */
const CEU: ReadonlyArray<readonly [number, string]> = [
  [0, '#d5e9cd'],
  [0.24, '#dfeed3'],
  [0.44, '#e9f1d7'],
  [0.6, '#f3f0da'],
];

/** Madeira, espiral, traço e a pintura de lápis da borda de uma apara. */
interface Apara {
  madeira: string;
  espiral: string;
  traco: string;
  borda: string;
}
const MEIO: Omit<Apara, 'borda'> = { madeira: '#e6cba4', espiral: '#d6b78c', traco: '#ab8e68' };
/** Pintura de lápis na borda de cada apara do meio: coral, mostarda e sálvia, apagadas. */
const BORDAS = ['#edbca8', '#e6d398', '#b3d2aa'] as const;
/** A apara colossal fica longe: mais clara e mais perto da cor do céu (perspectiva atmosférica). */
const LONGE: Apara = { madeira: '#efe2c8', espiral: '#e4d3b4', traco: '#cdb99a', borda: '#f3d3c4' };
const COPA = '#acd291';
const COPA_SOMBRA = '#96c47c';
const COPA_TRACO = '#80aa6b';
const LUZ = '#fff4b8';

const SOLIDO = '#263530';
const RAIZ = '#33493f';
const MUSGO = '#73b262';
const GALHO = '#f0a848';
const GALHO_SOMBRA = '#c98536';
const FOLHA = '#82c46c';
const FRENTE = '#355f43';
const FRENTE_VEIO = '#4d7d58';

/**
 * Borda de apara: de (x, y0) a (x, y1) em ondinhas que estufam para `lado` (−1 esquerda, 1 direita).
 * `largura(y)` dá o deslocamento da borda em relação a `x` (o tronco afina para cima).
 */
function bordaOndulada(x: number, y0: number, y1: number, lado: number, largura: (y: number) => number, passo: number): string {
  const out: string[] = [];
  const steps = Math.max(1, Math.round(Math.abs(y1 - y0) / passo));
  const dy = (y1 - y0) / steps;
  for (let i = 0; i < steps; i++) {
    const ya = y0 + dy * i;
    const yb = ya + dy;
    const ym = (ya + yb) / 2;
    const xb = x + lado * largura(yb);
    const xm = x + lado * (largura(ym) + 9);
    out.push(`Q${n(xm)} ${n(ym)} ${n(xb)} ${n(yb)}`);
  }
  return out.join(' ');
}

/** Tronco-apara: madeira clara, espirais e a borda pintada; do alto `yt` (meia largura `ht`) à base `yb` (`hb`). */
function apara(cx: number, yt: number, yb: number, ht: number, hb: number, cor: Apara, passo: number, espiral: number): string {
  const largura = (y: number) => ht + ((hb - ht) * (y - yt)) / (yb - yt);
  const d =
    `M${n(cx - ht)} ${n(yt)} L${n(cx + ht)} ${n(yt)} ` +
    bordaOndulada(cx, yt, yb, 1, largura, passo) +
    ` L${n(cx - hb)} ${n(yb)} ` +
    bordaOndulada(cx, yb, yt, -1, largura, passo) +
    ' Z';
  const voltas: string[] = [];
  for (let y = yt + espiral * 0.6; y < yb; y += espiral) {
    const hw = largura(y);
    voltas.push(`M${n(cx - hw)} ${n(y)} Q${n(cx)} ${n(y - espiral * 0.35)} ${n(cx + hw)} ${n(y - espiral * 0.55)}`);
  }
  return (
    `<path d="${d}" fill="${cor.madeira}"/>` +
    `<path d="${voltas.join(' ')}" fill="none" stroke="${cor.espiral}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${cor.borda}" stroke-width="11" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${cor.traco}" stroke-width="3" stroke-linejoin="round"/>`
  );
}

/** Copa fofa: círculos com contorno único (o traço por baixo de todos, o miolo por cima) e a barriga mais escura. */
function copa(bolas: ReadonlyArray<readonly [number, number, number]>, cor = COPA, sombra = COPA_SOMBRA, traco = COPA_TRACO): string {
  const c = (f: (b: readonly [number, number, number]) => string) => bolas.map(f).join('');
  return (
    c(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r + 3)}" fill="${traco}"/>`) +
    c(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${sombra}"/>`) +
    c(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y - r * 0.18)}" r="${n(r * 0.84)}" fill="${cor}"/>`)
  );
}

/** Morros: uma linha de lombadas de `-m` a `w + m`, fechada até embaixo. */
function morros(w: number, h: number, m: number, topo: number, altura: number, passo: number, cor: string, seed: number): string {
  let d = `M${-m} ${h + m} L${-m} ${n(topo)}`;
  let i = 0;
  for (let x = -m; x < w + m; x += passo) {
    const x1 = Math.min(w + m, x + passo);
    const pico = topo - altura * (0.4 + 0.6 * hash(seed + i++));
    d += ` Q${n((x + x1) / 2)} ${n(pico)} ${n(x1)} ${n(topo)}`;
  }
  return `<path d="${d} L${w + m} ${h + m} Z" fill="${cor}"/>`;
}

/** A apara colossal do fundo (o cartão-postal da fase), com a copa e a janelinha acesa. */
function aparaGigante(cx: number, h: number): string {
  const yt = h * 0.24;
  const yb = h * 0.82;
  const janelaY = yt + (yb - yt) * 0.42;
  const r = h * 0.1;
  return (
    apara(cx, yt, yb, 30, 92, LONGE, 44, 58) +
    `<circle cx="${n(cx)}" cy="${n(janelaY)}" r="16" fill="${LUZ}" stroke="${LONGE.traco}" stroke-width="4"/>` +
    `<path d="M${n(cx)} ${n(janelaY - 16)} V${n(janelaY + 16)} M${n(cx - 16)} ${n(janelaY)} H${n(cx + 16)}" stroke="${LONGE.traco}" stroke-width="3"/>` +
    copa(
      [
        [cx - r * 1.15, yt + 6, r * 0.85],
        [cx, yt - r * 0.45, r],
        [cx + r * 1.15, yt + 4, r * 0.88],
        [cx - r * 0.5, yt + r * 0.5, r * 0.7],
        [cx + r * 0.55, yt + r * 0.5, r * 0.72],
      ],
      '#c3ddb0',
      '#b0d29c',
      '#a3c58f',
    )
  );
}

/** Arbusto baixo atrás do chão, com cogumelinhos às vezes. */
function arbusto(x: number, chao: number, s: number, seed: number): string {
  const bolas: Array<[number, number, number]> = [
    [x - 22 * s, chao - 8 * s, 18 * s],
    [x, chao - 18 * s, 22 * s],
    [x + 24 * s, chao - 8 * s, 17 * s],
  ];
  let out = copa(bolas, '#a3cd8a', '#8fbd75', '#7aa365');
  if (hash(seed) < 0.55) {
    const mx = x + 40 * s;
    out +=
      `<path d="M${n(mx - 3)} ${n(chao)} V${n(chao - 12)} H${n(mx + 3)} V${n(chao)} Z" fill="#f7ecd6" stroke="#c99b86" stroke-width="2.5"/>` +
      `<path d="M${n(mx - 12)} ${n(chao - 11)} Q${n(mx)} ${n(chao - 28)} ${n(mx + 12)} ${n(chao - 11)} Z" fill="#f2c3b0" stroke="#c99b86" stroke-width="2.5"/>` +
      `<circle cx="${n(mx - 4)}" cy="${n(chao - 17)}" r="2.2" fill="${WHITE}"/><circle cx="${n(mx + 5)}" cy="${n(chao - 14)}" r="1.8" fill="${WHITE}"/>`;
  }
  return out;
}

/** Semente de dente-de-leão flutuando (pequena e clara, para não parecer item). */
function semente(x: number, y: number): string {
  const raios = [0, 50, 100, 150, 200, 250, 300].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return `M${n(x)} ${n(y)} L${n(x + 7 * Math.cos(a))} ${n(y - 7 * Math.abs(Math.sin(a)) - 2)}`;
  });
  return `<path d="${raios.join(' ')} M${n(x)} ${n(y)} L${n(x + 2)} ${n(y + 9)}" stroke="${WHITE}" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>`;
}

/** Folha escura da moldura da frente. */
function folhaFrente(x: number, y: number, rot: number, s: number): string {
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(s)})">` +
    `<path d="M0 0 Q26 -16 58 0 Q26 16 0 0 Z" fill="${FRENTE}"/>` +
    `<path d="M4 0 Q28 -2 52 0" stroke="${FRENTE_VEIO}" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`
  );
}

/** Cipó descendo pela parede, com folhas alternadas. */
function cipo(x: number, y0: number, y1: number, seed: number): string {
  let d = `M${n(x)} ${n(y0)}`;
  const folhas: string[] = [];
  let i = 0;
  for (let y = y0; y < y1; y += 60) {
    const lado = i % 2 === 0 ? 1 : -1;
    d += ` Q${n(x + lado * 10)} ${n(y + 30)} ${n(x)} ${n(y + 60)}`;
    folhas.push(folhaFrente(x, y + 30, lado > 0 ? -30 + 20 * hash(seed + i) : 210 - 20 * hash(seed + i), 0.55));
    i++;
  }
  return `<path d="${d}" stroke="${FRENTE}" stroke-width="7" fill="none" stroke-linecap="round"/>` + folhas.join('');
}

/** Tufo de folhas pendurado do alto, nos cantos de cima. */
function tufoAlto(x: number, lado: number, seed: number): string {
  const out: string[] = [];
  for (let k = 0; k < 7; k++) {
    const fx = x + lado * (k * 26 + 14 * hash(seed + k));
    const fy = -10 + 22 * hash(seed + 10 + k) + (k % 2) * 14;
    out.push(folhaFrente(fx, fy, lado > 0 ? 40 + 50 * hash(seed + 20 + k) : 140 - 50 * hash(seed + 20 + k), 0.9 + 0.3 * hash(seed + 30 + k)));
  }
  return out.join('');
}

export const FLORESTA_CENARIO: Cenario = {
  ceu: (w, h) => {
    const faixas = CEU.map(([y0, cor], i) => {
      const y1 = (CEU[i + 1]?.[0] ?? 1) * h;
      return `<rect x="0" y="${n(y0 * h)}" width="${w}" height="${n(y1 - y0 * h + 1)}" fill="${cor}"/>`;
    }).join('');
    const pauta: string[] = [];
    for (let y = C; y < h; y += C) pauta.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    return (
      faixas +
      `<g stroke="#c9d9bd" stroke-width="2" opacity="0.55">${pauta.join('')}</g>` +
      `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#eab8aa" stroke-width="3" opacity="0.5"/>`
    );
  },

  longe: {
    amp: 6,
    desenho: (_a, w, h, m) =>
      `<circle cx="${n(0.8 * w)}" cy="${n(0.16 * h)}" r="92" fill="${LUZ}" opacity="0.5"/>` +
      `<circle cx="${n(0.8 * w)}" cy="${n(0.16 * h)}" r="60" fill="#fff0a3"/>` +
      morros(w, h, m, h * 0.6, h * 0.12, 190, '#c7dfb6', 11) +
      aparaGigante(w * 0.5, h) +
      `<path d="M${-m} ${n(h * 0.7)} Q${n(w * 0.25)} ${n(h * 0.66)} ${n(w * 0.5)} ${n(h * 0.7)} T${w + m} ${n(h * 0.69)} L${w + m} ${h + m} L${-m} ${h + m} Z" fill="#eef2d9" opacity="0.8"/>` +
      morros(w, h, m, h * 0.78, h * 0.07, 150, '#b7d6a3', 23),
  },

  meio: {
    amp: 3,
    desenho: (a, w, h, m) => {
      const raios = [
        [0.36, 0.22],
        [0.58, 0.46],
        [0.66, 0.55],
      ]
        .map(
          ([t, b]) =>
            `<path d="M${n((t ?? 0) * w)} ${-m} L${n((t ?? 0) * w + 46)} ${-m} L${n((b ?? 0) * w + 120)} ${h + m} L${n((b ?? 0) * w)} ${h + m} Z" fill="#fffbe3" opacity="0.32"/>`,
        )
        .join('');
      const troncos = (
        [
          [0.06, 30, 44, 0],
          [0.25, 24, 34, 1],
          [0.76, 26, 38, 2],
          [0.94, 32, 46, 0],
        ] as const
      )
        .map(([fx, ht, hb, borda]) => apara(fx * w, -m - 20, h + m, ht, hb, { ...MEIO, borda: BORDAS[borda] }, 52, 74))
        .join('');
      const bolas: Array<[number, number, number]> = [];
      let i = 0;
      for (let x = -m - 20; x < w + m + 60; x += 110) bolas.push([x + 20 * hash(40 + i), -18 + 34 * hash(50 + i), 66 + 22 * hash(60 + i++)]);
      const chao = (a.rows - 1) * C;
      const arbustos: string[] = [];
      i = 0;
      for (let x = 120; x < w - 80; x += 170 + 60 * hash(70 + i)) arbustos.push(arbusto(x, chao + 4, 0.8 + 0.35 * hash(80 + i), 90 + i++));
      const sementes = [0.18, 0.33, 0.47, 0.62, 0.71, 0.86].map((fx, k) => semente(fx * w, (0.3 + 0.4 * hash(100 + k)) * h)).join('');
      return raios + troncos + copa(bolas) + arbustos.join('') + sementes;
    },
  },

  frente: {
    amp: -4,
    desenho: (a, w, h, m) => {
      const chao = (a.rows - 1) * C;
      const pedras: string[] = [];
      for (let x = 30, i = 0; x < w; x += 90 + 50 * hash(120 + i), i++) {
        pedras.push(`<ellipse cx="${n(x)}" cy="${n(chao + 26 + 6 * hash(130 + i))}" rx="${n(10 + 8 * hash(140 + i))}" ry="5" fill="${FRENTE}"/>`);
      }
      return (
        tufoAlto(-m, 1, 200) +
        tufoAlto(w + m, -1, 300) +
        cipo(C * 0.4, 0, h, 400) +
        cipo(w - C * 0.4, 30, h, 500) +
        pedras.join('')
      );
    },
  },

  solidos: (a: Arena) => {
    const raizes: string[] = [];
    for (let r = 0; r < a.rows; r++) {
      for (let c = 0; c < a.cols; c++) {
        if (cellAt(a, c, r) !== SOLID || hash(c * 31 + r * 17) > 0.32) continue;
        const x = c * C + 8;
        const y = r * C + 22;
        raizes.push(`M${x} ${y} q6 -8 12 0 t12 0`);
      }
    }
    const musgo = solidTops(a)
      .map(({ x0, x1, y }) => {
        // Tampa de musgo: topo reto (onde se pisa) e a barra de baixo em gotinhas.
        let d = `M${x0 + 6} ${y - 2} L${x1 - 6} ${y - 2} Q${x1} ${y - 2} ${x1} ${y + 5} L${x1} ${y + 10}`;
        let k = 0;
        for (let x = x1; x > x0; k++) {
          const nx = Math.max(x0, x - 16);
          d += ` Q${n((x + nx) / 2)} ${n(y + 14 + 6 * hash(x * 0.37 + k))} ${n(nx)} ${y + 10}`;
          x = nx;
        }
        d += ` L${x0} ${y + 5} Q${x0} ${y - 2} ${x0 + 6} ${y - 2} Z`;
        return outlined(d, MUSGO, 3) + line(`M${x0 + 9} ${y + 3} L${Math.max(x0 + 10, x1 - 9)} ${y + 3}`, 2.4, WHITE).replace('/>', ' opacity="0.4"/>');
      })
      .join('');
    return (
      `<g filter="url(#sombra-plataforma)"><path d="${solidPath(a)}" fill="${SOLIDO}"/></g>` +
      `<path d="${raizes.join(' ')}" fill="none" stroke="${RAIZ}" stroke-width="3" stroke-linecap="round"/>` +
      musgo
    );
  },

  plataforma: (r: Rect) => {
    const x = r.c0 * C + 3;
    const y = r.r0 * C + 2;
    const w = (r.c1 - r.c0 + 1) * C - 6;
    const h = 20;
    const body = `M${x + 10} ${y} L${x + w - 10} ${y} Q${x + w} ${y} ${x + w} ${y + 10} Q${x + w} ${y + h} ${x + w - 10} ${y + h} L${x + 10} ${y + h} Q${x} ${y + h} ${x} ${y + 10} Q${x} ${y} ${x + 10} ${y} Z`;
    const casca: string[] = [];
    for (let k = x + 22, i = 0; k < x + w - 22; k += 30 + 10 * hash(r.c0 * 7 + r.r0 * 13 + i++)) {
      casca.push(`M${n(k)} ${y + 12} q6 -4 12 0`);
    }
    // Folhas penduradas nas pontas, abaixo do topo (o topo é onde se pisa e fica limpo).
    const folha = (fx: number, fy: number, rot: number) =>
      `<g transform="translate(${n(fx)} ${fy}) rotate(${rot})">${outlined('M0 0 Q9 -7 22 0 Q9 7 0 0 Z', FOLHA, 3)}</g>`;
    return (
      folha(x + 6, y + 16, 140) +
      folha(x + 12, y + 18, 105) +
      folha(x + w - 6, y + 16, 40) +
      folha(x + w - 12, y + 18, 75) +
      `<g filter="url(#sombra-plataforma)">${outlined(body, GALHO, 5)}</g>` +
      `<path d="M${x + 4} ${y + 13} L${x + w - 4} ${y + 13} Q${x + w - 3} ${y + h - 3} ${x + w - 10} ${y + h - 2.5} L${x + 10} ${y + h - 2.5} Q${x + 3} ${y + h - 3} ${x + 4} ${y + 13} Z" fill="${GALHO_SOMBRA}"/>` +
      (casca.length ? `<path d="${casca.join(' ')}" fill="none" stroke="${GALHO_SOMBRA}" stroke-width="2.5" stroke-linecap="round"/>` : '') +
      `<path d="${body}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
      line(`M${x + 12} ${y + 6.5} L${x + Math.min(w - 12, 12 + w * 0.35)} ${y + 6.5}`, 3, WHITE).replace('/>', ' opacity="0.7"/>')
    );
  },

  baseTubo: () =>
    // Toco cortado com os anéis no alto, musgo e um cogumelinho; o tubo fica na frente.
    `<path d="M-30 80 Q-34 60 -28 44 L28 44 Q34 60 30 80 Z" fill="#e6cba4" stroke="#ab8e68" stroke-width="3"/>` +
    `<path d="M-36 80 Q-30 72 -24 74 M36 80 Q30 72 24 74" stroke="#ab8e68" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="0" cy="44" rx="28" ry="8" fill="#efe2c8" stroke="#ab8e68" stroke-width="3"/>` +
    `<ellipse cx="0" cy="44" rx="17" ry="4.5" fill="none" stroke="#d6b78c" stroke-width="2"/><ellipse cx="0" cy="44" rx="7" ry="2" fill="none" stroke="#d6b78c" stroke-width="2"/>` +
    `<path d="M-28 46 Q-20 52 -12 47 Q-4 53 4 48" stroke="#7fb069" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    `<path d="M24 80 V70 M18 70 Q24 60 30 70 Z" fill="#f2c3b0" stroke="#c99b86" stroke-width="2"/>`,

  ancora: (x, y) =>
    `<path d="M${x + 3} ${y + 2} q10 2 12 12 q-8 0 -12 -12 Z" fill="${FOLHA}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<ellipse cx="${x}" cy="${y + 2}" rx="6" ry="4" fill="${GALHO_SOMBRA}" stroke="${INK}" stroke-width="2.5"/>`,
};

/** Tema da Floresta: o caderno de fallback fica vazio; quem desenha é o cenário. */
export const FLORESTA: Tema = {
  pauta: () => '',
  rabiscos: () => '',
  manchas: () => '',
  etiqueta: GALHO,
  cenario: FLORESTA_CENARIO,
};
