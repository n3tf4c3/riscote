import { SOLID, cellAt, type Arena } from '@riscote/shared';
import type { Cenario, Tema } from './arena';
import { C, n, solidPath, solidTops, type Rect } from './celulas';
import { INK, WHITE, hash, line, outlined } from './svg';

// Castelo das Nuvens, "A Cidadela de Papel Enrolado" (conceito de 2026-11-01, protótipo): o grande
// final. Um castelo acima das nuvens com torres de rolos de papel amarrados por barbante, a ponta de
// cada torre enrolada em espiral (no lugar de telhado cônico), bandeirolas de origami e bandos de
// aviões de papel, contra um amanhecer dourado. É o castelo que o Riscador esboça na Oficina.
// Nada de torres cônicas azuis de conto de fadas, torre de relógio ou tempestade com raios.
// Leitura: as plataformas são nuvens, então as nuvens do fundo nunca têm topo reto nem contorno
// marinho e são tingidas de lilás; as nuvens jogáveis são brancas, de topo reto, com contorno marinho
// e sombra dura. O azul fica só na faixa mais alta do céu, clara, para não apagar o boneco azul-céu.

/** Céu do amanhecer: azul claro só no alto, lilás, rosa e pêssego, e o dourado junto ao mar de nuvens. */
const CEU: ReadonlyArray<readonly [number, string]> = [
  [0, '#cfe0f0'],
  [0.12, '#ddd3f0'],
  [0.26, '#ecd0e6'],
  [0.4, '#f9d3cf'],
  [0.54, '#ffe2c6'],
  [0.66, '#fff0d2'],
];
const SOL = '#fff1c4';
const RAIO = '#ffe7b0';
/** Mar de nuvens tingido de lilás: as nuvens jogáveis, brancas, precisam se destacar dele. */
const MAR = '#ece2f4';
const MAR_SOMBRA = '#ddd0ec';

const MURO = '#f3d9c0';
const MURO_SOMBRA = '#e5c3a8';
const MURO_TRACO = '#c9a08a';
const ROLO = '#f8e8d4';
const ROLO_ESPIRAL = '#d9b59a';
const BARBANTE = '#c98f7a';
const JANELA = '#e9b9a0';
const BANDEIRAS = ['#f4b6a6', '#bfe3d0', '#fbe39a', '#d6c6f0'] as const;

const NUVEM_FUNDO = '#efe6f7';
const NUVEM_FUNDO_SOMBRA = '#ddd0ec';
const NUVEM_FUNDO_TRACO = '#cfc0e4';
const AVIAO = '#fffaf2';
const AVIAO_TRACO = '#c9b8d8';

const TEMPESTADE = '#3a3f5c';
const TEMPESTADE_TONS = ['#434a6b', '#363b57'] as const;
const CRISTA = '#fff4dc';
const NUVEM = '#ffffff';
const NUVEM_BARRIGA = '#cbbfe6';
const FLAMULA = '#c96f6a';
const FRENTE_NUVEM = '#ddd0ec';

/** Nuvem redonda do fundo: bolas com um contorno claro só (o traço por baixo de todas), nunca de topo reto. */
function nuvemFundo(bolas: ReadonlyArray<readonly [number, number, number]>, opacidade = 1): string {
  const c = (f: (b: readonly [number, number, number]) => string) => bolas.map(f).join('');
  return (
    `<g opacity="${opacidade}">` +
    c(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r + 3)}" fill="${NUVEM_FUNDO_TRACO}"/>`) +
    c(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${NUVEM_FUNDO_SOMBRA}"/>`) +
    c(([x, y, r]) => `<circle cx="${n(x - r * 0.08)}" cy="${n(y - r * 0.14)}" r="${n(r * 0.86)}" fill="${NUVEM_FUNDO}"/>`) +
    `</g>`
  );
}

/** Torre de rolo de papel: corpo cilíndrico, amarras de barbante, janela e a ponta enrolada em espiral. */
function torre(x: number, base: number, larg: number, alt: number, bandeira: string): string {
  const topo = base - alt;
  const t = `stroke="${MURO_TRACO}" stroke-width="3"`;
  const amarras = [0.3, 0.62].map((f) => `<path d="M${n(x)} ${n(base - alt * f)} h${n(larg)}" stroke="${BARBANTE}" stroke-width="4"/>`).join('');
  const jx = x + larg / 2;
  const jy = topo + alt * 0.42;
  return (
    `<rect x="${n(x)}" y="${n(topo)}" width="${n(larg)}" height="${n(alt)}" fill="${MURO}" ${t}/>` +
    `<rect x="${n(x + larg * 0.66)}" y="${n(topo + 2)}" width="${n(larg * 0.3)}" height="${n(alt - 4)}" fill="${MURO_SOMBRA}"/>` +
    amarras +
    `<path d="M${n(jx - 8)} ${n(jy + 14)} V${n(jy)} a8 8 0 0 1 16 0 V${n(jy + 14)} Z" fill="${JANELA}" ${t}/>` +
    // Ponta enrolada: a folha sai do alto e se enrola num caracol.
    `<path d="M${n(x)} ${n(topo)} Q${n(x - larg * 0.1)} ${n(topo - larg * 0.5)} ${n(jx)} ${n(topo - larg * 0.55)} Q${n(x + larg * 1.1)} ${n(topo - larg * 0.55)} ${n(x + larg)} ${n(topo)} Z" fill="${ROLO}" ${t}/>` +
    `<path d="M${n(jx)} ${n(topo - larg * 0.3)} m-${n(larg * 0.08)} 0 a${n(larg * 0.08)} ${n(larg * 0.08)} 0 1 1 ${n(larg * 0.16)} 0 a${n(larg * 0.16)} ${n(larg * 0.14)} 0 1 1 -${n(larg * 0.3)} 0" stroke="${ROLO_ESPIRAL}" stroke-width="3" fill="none"/>` +
    // Mastro e bandeirola de origami (triângulo dobrado).
    `<path d="M${n(jx)} ${n(topo - larg * 0.55)} V${n(topo - larg * 0.55 - 44)}" stroke="${MURO_TRACO}" stroke-width="3"/>` +
    `<path d="M${n(jx)} ${n(topo - larg * 0.55 - 44)} L${n(jx + 32)} ${n(topo - larg * 0.55 - 34)} L${n(jx)} ${n(topo - larg * 0.55 - 24)} Z" fill="${bandeira}" ${t}/>` +
    `<path d="M${n(jx)} ${n(topo - larg * 0.55 - 34)} L${n(jx + 32)} ${n(topo - larg * 0.55 - 34)}" stroke="${MURO_TRACO}" stroke-width="1.5" opacity="0.7"/>`
  );
}

/** Muralha com ameias entre duas torres. */
function muralha(x0: number, x1: number, base: number, alt: number): string {
  const topo = base - alt;
  let d = `M${n(x0)} ${n(base)} V${n(topo)}`;
  for (let x = x0, k = 0; x < x1; x += 22, k++) {
    const nx = Math.min(x1, x + 22);
    d += k % 2 === 0 ? ` H${n(nx)}` : ` V${n(topo - 14)} H${n(nx)} V${n(topo)}`;
  }
  return `<path d="${d} V${n(base)} Z" fill="${MURO_SOMBRA}" stroke="${MURO_TRACO}" stroke-width="3" stroke-linejoin="round"/>`;
}

/** A cidadela: torres de rolo de alturas diferentes ligadas por muralhas, sobre o mar de nuvens. */
function cidadela(cx: number, base: number, h: number): string {
  const torres: Array<[number, number, number]> = [
    [-190, 44, 0.24],
    [-110, 56, 0.34],
    [-28, 70, 0.44],
    [70, 54, 0.3],
    [150, 46, 0.22],
  ];
  const muralhas = torres
    .slice(0, -1)
    .map(([dx, lw], i) => muralha(cx + dx + lw, cx + (torres[i + 1]?.[0] ?? dx), base, h * 0.12))
    .join('');
  return (
    muralhas +
    torres.map(([dx, lw, fa], i) => torre(cx + dx, base, lw, h * fa, BANDEIRAS[i % BANDEIRAS.length] ?? BANDEIRAS[0])).join('')
  );
}

/** Avião de papel visto de lado, com o rastro tracejado. */
function aviao(x: number, y: number, s: number, rot: number, rastro: boolean): string {
  return (
    (rastro ? `<path d="M${n(x - 30 * s)} ${n(y + 4 * s)} q${n(-60 * s)} ${n(-30 * s)} ${n(-120 * s)} ${n(6 * s)} t${n(-110 * s)} ${n(-10 * s)}" stroke="${AVIAO_TRACO}" stroke-width="2.5" stroke-dasharray="8 8" fill="none" opacity="0.8"/>` : '') +
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(s)})">` +
    `<path d="M24 0 L-30 -14 L-14 0 L-30 10 Z" fill="${AVIAO}" stroke="${AVIAO_TRACO}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M24 0 L-14 0 L-22 8" stroke="${AVIAO_TRACO}" stroke-width="2" fill="none"/></g>`
  );
}

/** Cordão de bandeirolas triangulares caindo de um canto. */
function bandeirolas(x0: number, y0: number, x1: number, y1: number, flecha: number, seed: number): string {
  const out = [`<path d="M${n(x0)} ${n(y0)} Q${n((x0 + x1) / 2)} ${n((y0 + y1) / 2 + 2 * flecha)} ${n(x1)} ${n(y1)}" stroke="#8a6a68" stroke-width="2.5" fill="none"/>`];
  for (let k = 1; k < 7; k++) {
    const t = k / 7;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + 4 * flecha * t * (1 - t);
    const cor = BANDEIRAS[(k + seed) % BANDEIRAS.length] ?? BANDEIRAS[0];
    out.push(`<path d="M${n(x - 11)} ${n(y)} L${n(x + 11)} ${n(y)} L${n(x)} ${n(y + 26)} Z" fill="${cor}" stroke="#8a6a68" stroke-width="2" stroke-linejoin="round"/>`);
  }
  return out.join('');
}

/** Flâmula comprida descendo pela parede, com a ponta em V. */
function flamula(x: number, y0: number, comp: number): string {
  return (
    `<path d="M${n(x - 12)} ${n(y0)} H${n(x + 12)} V${n(y0 + comp)} L${n(x)} ${n(y0 + comp - 16)} L${n(x - 12)} ${n(y0 + comp)} Z" fill="${FLAMULA}"/>` +
    `<path d="M${n(x - 6)} ${n(y0)} V${n(y0 + comp - 8)}" stroke="#e39a90" stroke-width="3"/>`
  );
}

export const CASTELO_CENARIO: Cenario = {
  ceu: (w, h) => {
    const faixas = CEU.map(([y0, cor], i) => {
      const y1 = (CEU[i + 1]?.[0] ?? 1) * h;
      return `<rect x="0" y="${n(y0 * h)}" width="${w}" height="${n(y1 - y0 * h + 1)}" fill="${cor}"/>`;
    }).join('');
    const pauta: string[] = [];
    for (let y = C; y < h; y += C) pauta.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    return (
      faixas +
      `<g stroke="#e4d6e2" stroke-width="2" opacity="0.5">${pauta.join('')}</g>` +
      `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#f2b3a8" stroke-width="3" opacity="0.4"/>`
    );
  },

  longe: {
    amp: 6,
    desenho: (_a, w, h, m) => {
      const sx = 0.5 * w;
      const sy = 0.7 * h;
      const raios = Array.from({ length: 12 }, (_, k) => {
        const a0 = ((k * 30 - 4) * Math.PI) / 180;
        const a1 = ((k * 30 + 8) * Math.PI) / 180;
        const r = 2 * Math.max(w, h);
        return `M${n(sx)} ${n(sy)} L${n(sx + Math.cos(a0) * r)} ${n(sy + Math.sin(a0) * r)} L${n(sx + Math.cos(a1) * r)} ${n(sy + Math.sin(a1) * r)} Z`;
      }).join(' ');
      const mar: Array<[number, number, number]> = [];
      for (let x = -m - 20, i = 0; x < w + m + 60; x += 70, i++) mar.push([x, h * 0.76 + 14 * hash(5200 + i), 46 + 20 * hash(5300 + i)]);
      const marBaixo: Array<[number, number, number]> = [];
      for (let x = -m, i = 0; x < w + m + 60; x += 90, i++) marBaixo.push([x, h * 0.9 + 10 * hash(5400 + i), 60 + 20 * hash(5500 + i)]);
      const avioes = [
        [0.18, 0.18, 0.9, -8],
        [0.24, 0.24, 0.7, -4],
        [0.13, 0.27, 0.6, -10],
      ]
        .map(([fx, fy, s, rot], i) => aviao((fx ?? 0) * w, (fy ?? 0) * h, s ?? 1, rot ?? 0, i === 0))
        .join('');
      return (
        `<path d="${raios}" fill="${RAIO}" opacity="0.32"/>` +
        `<circle cx="${n(sx)}" cy="${n(sy)}" r="150" fill="${SOL}" opacity="0.5"/>` +
        `<circle cx="${n(sx)}" cy="${n(sy)}" r="104" fill="${SOL}"/>` +
        cidadela(sx, h * 0.78, h) +
        `<g>${mar.map(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${MAR_SOMBRA}"/>`).join('')}</g>` +
        `<g>${mar.map(([x, y, r]) => `<circle cx="${n(x - 4)}" cy="${n(y - 8)}" r="${n(r * 0.88)}" fill="${MAR}"/>`).join('')}</g>` +
        `<rect x="${-m}" y="${n(h * 0.82)}" width="${w + 2 * m}" height="${n(h * 0.18 + m)}" fill="${MAR}"/>` +
        nuvemFundo(marBaixo) +
        avioes
      );
    },
  },

  meio: {
    amp: 3,
    desenho: (_a, w, h, m) => {
      const banco = (cx: number, cy: number, larg: number, seed: number) => {
        const bolas: Array<[number, number, number]> = [];
        const qtd = Math.max(3, Math.round(larg / 60));
        for (let k = 0; k < qtd; k++) {
          const t = qtd === 1 ? 0.5 : k / (qtd - 1);
          // Mais alto no meio e baixo nas pontas: redondo por inteiro, sem topo reto.
          const r = 34 + 26 * Math.sin(Math.PI * t) + 8 * hash(seed + k);
          bolas.push([cx - larg / 2 + larg * t, cy + 10 * hash(seed + 20 + k), r]);
        }
        return nuvemFundo(bolas, 0.92);
      };
      return (
        banco(-m + 60, 0.3 * h, 260, 5600) +
        banco(w + m - 70, 0.18 * h, 300, 5700) +
        banco(0.36 * w, -10, 240, 5800) +
        banco(w + m - 40, 0.62 * h, 220, 5900) +
        banco(-m + 30, 0.7 * h, 200, 6000) +
        aviao(0.74 * w, 0.36 * h, 1.3, 6, true) +
        aviao(0.3 * w, 0.48 * h, 1.1, -12, false)
      );
    },
  },

  frente: {
    amp: -4,
    desenho: (a, w, h, m) => {
      const chao = (a.rows - 1) * C;
      const puffs: string[] = [];
      for (let x = -m, i = 0; x < w + m; x += 52 + 30 * hash(6100 + i), i++) {
        if (hash(6300 + i) < 0.4) continue;
        const r = 9 + 6 * hash(6200 + i);
        puffs.push(`<circle cx="${n(x)}" cy="${n(chao + 40 + r * 0.2)}" r="${n(r)}" fill="${FRENTE_NUVEM}"/>`);
      }
      return (
        bandeirolas(-m, 4, w * 0.22, -m, 30, 0) +
        bandeirolas(w + m, 4, w * 0.78, -m, 30, 2) +
        flamula(C * 0.45, -m, h * 0.42) +
        flamula(w - C * 0.45, -m, h * 0.36) +
        puffs.join('')
      );
    },
  },

  solidos: (a: Arena) => {
    // Nuvem de tempestade: rolos mais claros e mais escuros por dentro, recortados pela forma.
    const rolos: string[] = [];
    for (let r = 0; r < a.rows; r++) {
      for (let c = 0; c < a.cols; c++) {
        if (cellAt(a, c, r) !== SOLID || hash(c * 17 + r * 29) > 0.55) continue;
        const cor = TEMPESTADE_TONS[hash(c * 5 + r * 3) < 0.5 ? 0 : 1];
        rolos.push(`<circle cx="${c * C + 10 + 20 * hash(c + r * 7)}" cy="${r * C + 14 + 16 * hash(c * 3 + r)}" r="${n(10 + 8 * hash(c * 11 + r * 13))}" fill="${cor}"/>`);
      }
    }
    const cristas = solidTops(a)
      .map(({ x0, x1, y }) => {
        // Crista iluminada pelo sol: topo reto (onde se pisa) e a barra de baixo em bolinhas.
        let d = `M${x0 + 6} ${y - 2} L${x1 - 6} ${y - 2} Q${x1} ${y - 2} ${x1} ${y + 5} L${x1} ${y + 9}`;
        for (let x = x1, k = 0; x > x0; k++) {
          const nx = Math.max(x0, x - 18);
          d += ` Q${n((x + nx) / 2)} ${n(y + 17 + 4 * hash(x * 0.31 + k))} ${n(nx)} ${y + 9}`;
          x = nx;
        }
        d += ` L${x0} ${y + 5} Q${x0} ${y - 2} ${x0 + 6} ${y - 2} Z`;
        return outlined(d, CRISTA, 3) + line(`M${x0 + 9} ${y + 3} L${Math.max(x0 + 10, x1 - 9)} ${y + 3}`, 2.4, WHITE).replace('/>', ' opacity="0.8"/>');
      })
      .join('');
    const forma = solidPath(a);
    return (
      `<clipPath id="tempestade"><path d="${forma}"/></clipPath>` +
      `<g filter="url(#sombra-plataforma)"><path d="${forma}" fill="${TEMPESTADE}"/></g>` +
      `<g clip-path="url(#tempestade)">${rolos.join('')}</g>` +
      cristas
    );
  },

  plataforma: (r: Rect) => {
    const x = r.c0 * C + 3;
    const y = r.r0 * C + 2;
    const w = (r.c1 - r.c0 + 1) * C - 6;
    // Nuvem jogável: topo reto (onde se pisa) e a barriga em bolinhas, sem passar de 26 abaixo do topo.
    let d = `M${x + 10} ${y} L${x + w - 10} ${y} Q${x + w + 2} ${y} ${x + w} ${y + 12}`;
    for (let px = x + w, k = 0; px > x; k++) {
      const nx = Math.max(x, px - 26 - 8 * hash(r.c0 * 3 + r.r0 * 5 + k));
      d += ` Q${n((px + nx) / 2)} ${n(y + 26 + 3 * hash(r.c0 + r.r0 + k))} ${n(nx)} ${y + 14}`;
      px = nx;
    }
    d += ` Q${x - 2} ${y} ${x + 10} ${y} Z`;
    return (
      `<g filter="url(#sombra-plataforma)">${outlined(d, NUVEM, 5)}</g>` +
      `<path d="M${x + 6} ${y + 15} H${x + w - 6}" stroke="${NUVEM_BARRIGA}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
      line(`M${x + 14} ${y + 6} L${x + Math.min(w - 14, 14 + w * 0.35)} ${y + 6}`, 3, NUVEM_BARRIGA).replace('/>', ' opacity="0.9"/>')
    );
  },

  baseTubo: () =>
    // Pedestal de nuvem firme, lilás (as nuvens jogáveis são brancas e de contorno marinho).
    `<g fill="#e4d9f1" stroke="#cfc0e4" stroke-width="3"><circle cx="-20" cy="68" r="14"/><circle cx="0" cy="62" r="18"/><circle cx="20" cy="68" r="14"/></g>` +
    `<g fill="#efe6f7"><circle cx="-20" cy="68" r="11"/><circle cx="0" cy="62" r="15"/><circle cx="20" cy="68" r="11"/></g>` +
    `<rect x="-34" y="72" width="68" height="8" fill="#efe6f7"/>`,

  ancora: (x, y) =>
    // Passarinho de origami segurando o fio pelo bico.
    `<path d="M${x} ${y + 3} L${x + 7} ${y - 1} L${x + 17} ${y + 2} L${x + 9} ${y + 4} Z" fill="${WHITE}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M${x + 7} ${y - 1} L${x + 11} ${y - 8} L${x + 12} ${y + 1}" fill="${BANDEIRAS[0]}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
};

/** Tema do Castelo: o caderno de fallback fica vazio; quem desenha é o cenário. */
export const CASTELO: Tema = {
  pauta: () => '',
  rabiscos: () => '',
  manchas: () => '',
  etiqueta: NUVEM,
  cenario: CASTELO_CENARIO,
};
