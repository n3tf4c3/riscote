import { SOLID, type Arena } from '@riscote/shared';
import type { Cenario, Tema } from './arena';
import { C, n, rects, solidPath, solidTops, type Rect } from './celulas';
import { INK, WHITE, hash, line, outlined } from './svg';

// Jardim das Lanternas, "O Jardim ao Entardecer" (conceito de 2026-11-01, protótipo): um jardim no
// fim da tarde, com cordões de lanternas de papel, cachos de flores pendentes, um lago que reflete o
// céu com barquinhos de papel e velinhas e, no alto, o cartão-postal da fase: uma lua de papel
// pendurada por barbante, como num teatro. Ao longe, um coreto num morro.
// Leitura num fundo que escurece: o tom mais escuro do céu é uma ardósia média e fica só no alto
// (o borrão, quase preto, continua visível); as lanternas são pálidas, longe do âmbar do tinteiro;
// nada de magenta (traça) nem violeta saturado (saltador). As peças jogáveis ganham um segundo
// contorno cor de papel, como um recorte, para não depender só do marinho.

/** Faixas do céu do entardecer: ardósia em cima, malva, rosa antigo, coral e o brilho do horizonte. */
const CEU: ReadonlyArray<readonly [number, string]> = [
  [0, '#606b86'],
  [0.11, '#7d7896'],
  [0.22, '#ad8aa0'],
  [0.33, '#d99c96'],
  [0.44, '#f2b394'],
  [0.53, '#ffd2a6'],
];
const RECORTE = '#f8ecd8';
const LUA = '#fff3d6';
const LUA_TRACO = '#e0c49c';
const ESTRELA = '#fff1cf';

const MORRO_LONGE = '#a68aa2';
const MARGEM_LONGE = '#857f99';
const LAGO = '#d9a09c';
const LAGO_FUNDO = '#c48f9e';
const BRILHO = '#ffe0c0';

const LANTERNA = '#ffd9a0';
const LANTERNA_CLARA = '#ffeccb';
const LANTERNA_COSTELA = '#e8a868';
const LANTERNA_TAMPA = '#7a5a4a';
const HALO = '#ffe7b8';
const FOLHAGEM = '#4f7a6a';
const FOLHAGEM_CLARA = '#628d7a';
const FOLHAGEM_TRACO = '#456d5d';
const FLORES = ['#fff0e0', '#f9d3c0', '#ffe6c8'] as const;

const MURO = '#2a2f45';
const PEDRAS = ['#363c58', '#3b3f5c', '#33384f'] as const;
const CAPA_MURO = '#cbbfae';
const HERA = '#5c8a6a';
const PONTE = '#d9a066';
const PONTE_SOMBRA = '#b07a45';
const ARGOLA = '#e0b45c';

const FRENTE = '#2f4b47';
const FRENTE_CLARA = '#41635b';
const BAMBU = '#3e5d4e';
const BAMBU_NO = '#2f4a3d';

/** Lanterna de papel sanfonada, com tampa, costelas e o halo em volta; (x, y) é o meio. */
function lanterna(x: number, y: number, s: number, cor: string = LANTERNA): string {
  const rx = 14 * s;
  const ry = 17 * s;
  return (
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(28 * s)}" fill="${HALO}" opacity="0.26"/>` +
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${cor}"/>` +
    `<path d="M${n(x - rx * 0.92)} ${n(y - ry * 0.35)} Q${n(x)} ${n(y - ry * 0.5)} ${n(x + rx * 0.92)} ${n(y - ry * 0.35)} M${n(x - rx)} ${n(y + ry * 0.05)} Q${n(x)} ${n(y - ry * 0.08)} ${n(x + rx)} ${n(y + ry * 0.05)} M${n(x - rx * 0.92)} ${n(y + ry * 0.45)} Q${n(x)} ${n(y + ry * 0.32)} ${n(x + rx * 0.92)} ${n(y + ry * 0.45)}" stroke="${LANTERNA_COSTELA}" stroke-width="${n(2 * s)}" fill="none"/>` +
    `<rect x="${n(x - rx * 0.45)}" y="${n(y - ry - 3 * s)}" width="${n(rx * 0.9)}" height="${n(5 * s)}" rx="${n(2 * s)}" fill="${LANTERNA_TAMPA}"/>` +
    `<rect x="${n(x - rx * 0.45)}" y="${n(y + ry - 2 * s)}" width="${n(rx * 0.9)}" height="${n(5 * s)}" rx="${n(2 * s)}" fill="${LANTERNA_TAMPA}"/>` +
    `<ellipse cx="${n(x - rx * 0.35)}" cy="${n(y - ry * 0.2)}" rx="${n(rx * 0.22)}" ry="${n(ry * 0.4)}" fill="${WHITE}" opacity="0.45"/>`
  );
}

/** Ponto na curva de um cordão (parábola de (x0, y0) a (x1, y1) caindo `flecha` no meio). */
function noCordao(x0: number, y0: number, x1: number, y1: number, flecha: number, t: number): [number, number] {
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + 4 * flecha * t * (1 - t)];
}

/** Cordão de barbante com lanternas penduradas. */
function cordao(x0: number, y0: number, x1: number, y1: number, flecha: number, qtd: number, seed: number): string {
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2 + 2 * flecha];
  const out = [`<path d="M${n(x0)} ${n(y0)} Q${n(cx)} ${n(cy)} ${n(x1)} ${n(y1)}" stroke="#7a6a68" stroke-width="2.5" fill="none"/>`];
  for (let k = 1; k <= qtd; k++) {
    const t = k / (qtd + 1);
    const [x, y] = noCordao(x0, y0, x1, y1, flecha, t);
    const queda = 10 + 12 * hash(seed + k);
    out.push(`<path d="M${n(x)} ${n(y)} V${n(y + queda)}" stroke="#7a6a68" stroke-width="2"/>`);
    out.push(lanterna(x, y + queda + 17 * 0.9, 0.9, hash(seed + 20 + k) < 0.4 ? LANTERNA_CLARA : LANTERNA));
  }
  return out.join('');
}

/** Cacho de flores pendente (glicínia de papel): bolinhas claras afinando para baixo. */
function cacho(x: number, y: number, comp: number, seed: number): string {
  const out: string[] = [];
  for (let k = 0; k < 9; k++) {
    const t = k / 8;
    const r = 9 * (1 - t * 0.6);
    const dx = (hash(seed + k) - 0.5) * 14 * (1 - t);
    const cor = FLORES[Math.floor(hash(seed + 30 + k) * FLORES.length)] ?? FLORES[0];
    out.push(`<circle cx="${n(x + dx)}" cy="${n(y + t * comp)}" r="${n(r)}" fill="${cor}" stroke="#d9b8a8" stroke-width="1.5"/>`);
  }
  return out.join('');
}

/** Folha grande e redonda (taioba) com a nervura do meio. */
function folhao(x: number, y: number, r: number, rot: number, cor = FOLHAGEM_CLARA, traco = FOLHAGEM_TRACO): string {
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})">` +
    `<path d="M0 0 Q${n(-r)} ${n(-r * 0.4)} ${n(-r * 0.2)} ${n(-r * 1.5)} Q0 ${n(-r * 1.2)} ${n(r * 0.2)} ${n(-r * 1.5)} Q${n(r)} ${n(-r * 0.4)} 0 0 Z" fill="${cor}" stroke="${traco}" stroke-width="3"/>` +
    `<path d="M0 -2 V${n(-r * 1.2)}" stroke="${traco}" stroke-width="2.5"/></g>`
  );
}

/** Barquinho de papel com uma velinha acesa, no lago. */
function barquinho(x: number, y: number): string {
  return (
    `<circle cx="${n(x)}" cy="${n(y - 22)}" r="16" fill="${HALO}" opacity="0.35"/>` +
    `<path d="M${n(x - 22)} ${n(y - 8)} L${n(x + 22)} ${n(y - 8)} L${n(x + 14)} ${n(y)} L${n(x - 14)} ${n(y)} Z M${n(x - 8)} ${n(y - 8)} L${n(x)} ${n(y - 20)} L${n(x + 8)} ${n(y - 8)} Z" fill="#fbf1e2" stroke="#d8b9a6" stroke-width="2"/>` +
    `<rect x="${n(x - 2)}" y="${n(y - 30)}" width="4" height="9" fill="#fbf1e2"/>` +
    `<path d="M${n(x)} ${n(y - 38)} q4 5 0 8 q-4 -3 0 -8 Z" fill="#ffd27a"/>`
  );
}

/** Coreto ao longe: base, colunas e cúpula, com luzinhas. */
function coreto(x: number, y: number): string {
  const cor = '#8e7b98';
  const luzes = [-30, -15, 0, 15, 30].map((dx) => `<circle cx="${n(x + dx)}" cy="${n(y - 58 + Math.abs(dx) * 0.25)}" r="3" fill="#ffe3a8"/>`).join('');
  return (
    `<rect x="${n(x - 44)}" y="${n(y - 10)}" width="88" height="12" fill="${cor}"/>` +
    [-34, -12, 12, 34].map((dx) => `<rect x="${n(x + dx - 3)}" y="${n(y - 54)}" width="6" height="46" fill="${cor}"/>`).join('') +
    `<path d="M${n(x - 46)} ${n(y - 52)} Q${n(x)} ${n(y - 100)} ${n(x + 46)} ${n(y - 52)} Z" fill="${cor}"/>` +
    `<path d="M${n(x)} ${n(y - 76)} V${n(y - 92)}" stroke="${cor}" stroke-width="3"/>` +
    luzes
  );
}

/** Colmo de bambu em gomos, de `y0` a `y1`. */
function bambu(x: number, y0: number, y1: number, seed: number): string {
  const out = [`<rect x="${n(x - 8)}" y="${n(y0)}" width="16" height="${n(y1 - y0)}" fill="${BAMBU}"/>`];
  for (let y = y0 + 30 + 20 * hash(seed); y < y1; y += 70 + 20 * hash(seed + y)) {
    out.push(`<path d="M${n(x - 9)} ${n(y)} H${n(x + 9)}" stroke="${BAMBU_NO}" stroke-width="4"/>`);
    out.push(`<path d="M${n(x + 6)} ${n(y)} q18 -6 30 -22 q-20 4 -30 22 Z" fill="${FRENTE_CLARA}"/>`);
  }
  return out.join('');
}

export const JARDIM_CENARIO: Cenario = {
  ceu: (w, h) => {
    const faixas = CEU.map(([y0, cor], i) => {
      const y1 = (CEU[i + 1]?.[0] ?? 1) * h;
      return `<rect x="0" y="${n(y0 * h)}" width="${w}" height="${n(y1 - y0 * h + 1)}" fill="${cor}"/>`;
    }).join('');
    const pauta: string[] = [];
    for (let y = C; y < h; y += C) pauta.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    return (
      faixas +
      `<g stroke="${RECORTE}" stroke-width="2" opacity="0.16">${pauta.join('')}</g>` +
      `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#ffb4a2" stroke-width="3" opacity="0.3"/>`
    );
  },

  longe: {
    amp: 6,
    desenho: (_a, w, h, m) => {
      const estrelas: string[] = [];
      for (let i = 0; i < 14; i++) estrelas.push(`<circle cx="${n(hash(1300 + i) * w)}" cy="${n((0.02 + 0.18 * hash(1400 + i)) * h)}" r="${n(1.8 + 1.6 * hash(1500 + i))}" fill="${ESTRELA}" opacity="0.85"/>`);
      const lx = 0.76 * w;
      const ly = 0.17 * h;
      const lua =
        `<path d="M${n(lx)} ${-m} V${n(ly - 46)}" stroke="#f3dcc0" stroke-width="2"/>` +
        `<circle cx="${n(lx)}" cy="${n(ly)}" r="58" fill="${LUA}" opacity="0.25"/>` +
        `<circle cx="${n(lx)}" cy="${n(ly)}" r="46" fill="${LUA}" stroke="${LUA_TRACO}" stroke-width="3"/>` +
        `<path d="M${n(lx - 30)} ${n(ly - 34)} A46 46 0 0 0 ${n(lx - 30)} ${n(ly + 34)} A40 46 0 0 1 ${n(lx - 30)} ${n(ly - 34)} Z" fill="#f6dfba"/>` +
        `<circle cx="${n(lx + 14)}" cy="${n(ly - 12)}" r="8" fill="#f3d8b0"/><circle cx="${n(lx - 4)}" cy="${n(ly + 18)}" r="6" fill="#f3d8b0"/><circle cx="${n(lx + 22)}" cy="${n(ly + 14)}" r="4" fill="#f3d8b0"/>` +
        `<path d="M${n(lx - 6)} ${n(ly - 45)} L${n(lx + 4)} ${n(ly + 45)}" stroke="${LUA_TRACO}" stroke-width="1.5" opacity="0.7"/>`;
      const horizonte = h * 0.6;
      let morro = `M${-m} ${h + m} L${-m} ${n(horizonte)}`;
      for (let x = -m, i = 0; x < w + m; x += 200, i++) morro += ` Q${n(x + 100)} ${n(horizonte - h * (0.05 + 0.07 * hash(1600 + i)))} ${n(x + 200)} ${n(horizonte)}`;
      let margem = `M${-m} ${h + m} L${-m} ${n(horizonte + 26)}`;
      for (let x = -m, i = 0; x < w + m; x += 60, i++) margem += ` Q${n(x + 30)} ${n(horizonte + 26 - 18 - 20 * hash(1700 + i))} ${n(x + 60)} ${n(horizonte + 26)}`;
      const lagoY = horizonte + 40;
      const brilhos: string[] = [];
      for (let i = 0; i < 24; i++) {
        const bx = hash(1800 + i) * w;
        const by = lagoY + 14 + hash(1900 + i) * (h - lagoY);
        brilhos.push(`M${n(bx)} ${n(by)} h${n(10 + 16 * hash(2000 + i))}`);
      }
      const reflexo: string[] = [];
      for (let y = lagoY + 10; y < h; y += 16) reflexo.push(`M${n(lx - 14 + 8 * hash(y))} ${n(y)} h${n(20 + 10 * hash(y + 1))}`);
      return (
        estrelas.join('') +
        lua +
        `<path d="${morro} L${w + m} ${h + m} Z" fill="${MORRO_LONGE}"/>` +
        coreto(0.3 * w, horizonte - h * 0.06) +
        `<path d="${margem} L${w + m} ${h + m} Z" fill="${MARGEM_LONGE}"/>` +
        `<rect x="${-m}" y="${n(lagoY)}" width="${w + 2 * m}" height="${n(h + m - lagoY)}" fill="${LAGO}"/>` +
        `<rect x="${-m}" y="${n(lagoY + (h - lagoY) * 0.45)}" width="${w + 2 * m}" height="${n(h + m)}" fill="${LAGO_FUNDO}"/>` +
        `<path d="${brilhos.join(' ')}" stroke="${BRILHO}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>` +
        `<path d="${reflexo.join(' ')}" stroke="${LUA}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>` +
        barquinho(0.18 * w, lagoY + 34) +
        barquinho(0.58 * w, lagoY + 58) +
        barquinho(0.86 * w, lagoY + 26)
      );
    },
  },

  meio: {
    amp: 3,
    desenho: (a, w, h, m) => {
      const chao = (a.rows - 1) * C;
      const vagalumes: string[] = [];
      for (let i = 0; i < 9; i++) {
        const x = (0.1 + 0.8 * hash(2100 + i)) * w;
        const y = (0.35 + 0.45 * hash(2200 + i)) * h;
        vagalumes.push(`<circle cx="${n(x)}" cy="${n(y)}" r="7" fill="#fff3b0" opacity="0.25"/><circle cx="${n(x)}" cy="${n(y)}" r="2.4" fill="#fff6c8"/>`);
      }
      const folhas: string[] = [];
      for (let x = -m, i = 0; x < w + m; x += 70, i++) {
        folhas.push(`<circle cx="${n(x)}" cy="${n(-20 + 26 * hash(2300 + i))}" r="${n(46 + 16 * hash(2400 + i))}" fill="${FOLHAGEM}" stroke="${FOLHAGEM_TRACO}" stroke-width="3"/>`);
      }
      const cachos: string[] = [];
      for (let x = 30, i = 0; x < w; x += 90 + 50 * hash(2500 + i), i++) cachos.push(cacho(x, 26 + 20 * hash(2600 + i), 46 + 40 * hash(2700 + i), 2800 + i * 11));
      const plantas: string[] = [];
      for (let x = 70, i = 0; x < w - 40; x += 150 + 80 * hash(2900 + i), i++) {
        plantas.push(folhao(x - 14, chao + 6, 22 + 8 * hash(3000 + i), -24));
        plantas.push(folhao(x + 14, chao + 6, 26 + 8 * hash(3100 + i), 18));
        if (hash(3200 + i) < 0.5) plantas.push(`<circle cx="${n(x)}" cy="${n(chao - 30)}" r="8" fill="${FLORES[0]}" stroke="#d9b8a8" stroke-width="2"/><circle cx="${n(x)}" cy="${n(chao - 30)}" r="3" fill="#ffd27a"/>`);
      }
      return (
        folhas.join('') +
        cachos.join('') +
        cordao(-m, 0.02 * h, 0.5 * w, 0.01 * h, 0.05 * h, 4, 3300) +
        cordao(0.5 * w, 0.01 * h, w + m, 0.03 * h, 0.05 * h, 4, 3400) +
        vagalumes.join('') +
        plantas.join('')
      );
    },
  },

  frente: {
    amp: -4,
    desenho: (a, w, h, m) => {
      const chao = (a.rows - 1) * C;
      const pedras: string[] = [];
      for (let x = 40, i = 0; x < w; x += 110 + 60 * hash(3500 + i), i++) {
        pedras.push(`<ellipse cx="${n(x)}" cy="${n(chao + 26)}" rx="${n(16 + 8 * hash(3600 + i))}" ry="6" fill="#4a4f68"/>`);
      }
      const canto = (x0: number, lado: number, seed: number) => {
        const out: string[] = [];
        for (let k = 0; k < 6; k++) out.push(folhao(x0 + lado * (k * 34 + 10), -m + 4, 30 + 10 * hash(seed + k), 180 + lado * (-30 + 25 * hash(seed + 10 + k)), FRENTE, FRENTE_CLARA));
        for (let k = 0; k < 3; k++) out.push(cacho(x0 + lado * (40 + k * 50), 0, 50, seed + 40 + k * 9));
        return out.join('');
      };
      return canto(-m, 1, 3700) + canto(w + m, -1, 3800) + bambu(C * 0.45, -m, h + m, 3900) + bambu(w - C * 0.45, -m, h + m, 4000) + pedras.join('');
    },
  },

  solidos: (a: Arena) => {
    // Muro de pedras em fiadas desencontradas.
    const pedras: string[] = [];
    let seed = 0;
    for (const r of rects(a, SOLID)) {
      const x0 = r.c0 === 0 ? -8 : r.c0 * C;
      const x1 = r.c1 === a.cols - 1 ? a.cols * C + 8 : (r.c1 + 1) * C;
      for (let y = r.r0 * C, fiada = 0; y < (r.r1 + 1) * C; y += C / 2, fiada++) {
        let x = x0 - (fiada % 2) * 18;
        for (; x < x1; seed++) {
          const pw = 34 + 28 * hash(4100 + seed);
          const cor = PEDRAS[Math.floor(hash(4200 + seed) * PEDRAS.length)] ?? PEDRAS[0];
          pedras.push(`<rect x="${n(x + 1.5)}" y="${y + 1.5}" width="${n(pw - 3)}" height="${C / 2 - 3}" rx="7" fill="${cor}" stroke="#262a3f" stroke-width="2.5"/>`);
          x += pw;
        }
      }
    }
    const hera: string[] = [];
    const topos = solidTops(a)
      .map(({ x0, x1, y }, i) => {
        for (let x = x0 + 14, k = 0; x < x1 - 10; x += 26 + 30 * hash(4300 + i * 17 + k), k++) {
          if (hash(4400 + i * 13 + k) < 0.45) continue;
          hera.push(`<g transform="translate(${n(x)} ${y + 8}) rotate(${n(70 + 40 * hash(4500 + k + i))})">${outlined('M0 0 Q6 -5 14 0 Q6 5 0 0 Z', HERA, 2)}</g>`);
        }
        return (
          `<rect x="${x0}" y="${y - 2}" width="${x1 - x0}" height="11" rx="5" fill="${CAPA_MURO}" stroke="${INK}" stroke-width="3"/>` +
          line(`M${x0 + 8} ${y + 2} L${Math.max(x0 + 10, x1 - 8)} ${y + 2}`, 2.2, WHITE).replace('/>', ' opacity="0.5"/>')
        );
      })
      .join('');
    const forma = solidPath(a);
    return (
      // O recorte de papel: o traço claro por baixo do miolo só aparece na borda de fora.
      `<path d="${forma}" fill="none" stroke="${RECORTE}" stroke-width="9" stroke-linejoin="round"/>` +
      `<clipPath id="muro"><path d="${forma}"/></clipPath>` +
      `<g filter="url(#sombra-plataforma)"><path d="${forma}" fill="${MURO}"/></g>` +
      `<g clip-path="url(#muro)">${pedras.join('')}</g>` +
      hera.join('') +
      topos
    );
  },

  plataforma: (r: Rect) => {
    const x = r.c0 * C + 3;
    const y = r.r0 * C + 2;
    const w = (r.c1 - r.c0 + 1) * C - 6;
    const h = 20;
    const body = `M${x + 8} ${y} L${x + w - 8} ${y} Q${x + w} ${y} ${x + w} ${y + 8} L${x + w} ${y + h - 6} Q${x + w} ${y + h} ${x + w - 6} ${y + h} L${x + 6} ${y + h} Q${x} ${y + h} ${x} ${y + h - 6} L${x} ${y + 8} Q${x} ${y} ${x + 8} ${y} Z`;
    const ripas: string[] = [];
    for (let k = x + 18; k < x + w - 8; k += 20) ripas.push(`M${k} ${y + 3} V${y + h - 3}`);
    // Mãos-francesas nas pontas, por baixo (o topo fica limpo).
    const apoio = (ax: number, lado: number) => outlined(`M${ax} ${y + h - 2} L${ax} ${y + h + 10} Q${ax} ${y + h + 2} ${ax + lado * 12} ${y + h - 2} Z`, PONTE_SOMBRA, 3);
    return (
      `<path d="${body}" fill="none" stroke="${RECORTE}" stroke-width="13" stroke-linejoin="round"/>` +
      apoio(x + 12, 1) +
      apoio(x + w - 12, -1) +
      `<g filter="url(#sombra-plataforma)">${outlined(body, PONTE, 5)}</g>` +
      `<path d="M${x + 3} ${y + 14} H${x + w - 3} V${y + h - 3} H${x + 3} Z" fill="${PONTE_SOMBRA}"/>` +
      `<path d="${ripas.join(' ')}" stroke="${PONTE_SOMBRA}" stroke-width="2"/>` +
      `<path d="${body}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
      line(`M${x + 12} ${y + 6.5} L${x + Math.min(w - 12, 12 + w * 0.35)} ${y + 6.5}`, 3, WHITE).replace('/>', ' opacity="0.65"/>')
    );
  },

  baseTubo: () =>
    // Pedra baixa coberta de musgo, com uma flor clara.
    `<path d="M-34 80 Q-36 58 -14 52 Q8 46 26 56 Q38 64 34 80 Z" fill="#9a93b0" stroke="#6f6a88" stroke-width="3"/>` +
    `<path d="M-26 60 Q-10 52 6 56 Q16 52 26 58" stroke="#628d7a" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<circle cx="26" cy="56" r="6" fill="#fff0e0" stroke="#d9b8a8" stroke-width="2"/><circle cx="26" cy="56" r="2.2" fill="#ffd27a"/>`,

  ancora: (x, y) => `<circle cx="${x}" cy="${y + 5}" r="4.5" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="${x}" cy="${y + 5}" r="4.5" fill="none" stroke="${ARGOLA}" stroke-width="2.5"/>`,
};

/** Tema do Jardim: o caderno de fallback fica vazio; quem desenha é o cenário. */
export const JARDIM: Tema = {
  pauta: () => '',
  rabiscos: () => '',
  manchas: () => '',
  etiqueta: PONTE,
  cenario: JARDIM_CENARIO,
};
