import { SOLID, type Arena } from '@riscote/shared';
import type { Cenario, Tema } from './arena';
import { C, n, rects, solidPath, solidTops, type Rect } from './celulas';
import { INK, WHITE, hash, line, outlined, shade } from './svg';

// Biblioteca dos Sonhos, "A Estante que Sonha" (conceito de 2026-11-01, protótipo): uma biblioteca
// de noite onde os livros sonham. Cúpula estrelada com constelações traçadas a régua (um barquinho
// de papel, uma pipa), estantes em arco ao fundo e, no centro, o cartão-postal da fase: um livro
// pop-up gigante aberto, com morros, um moinho e um sol de cartolina. Luminárias pendentes deixam
// poças de luz quente. Nada de tinteiro nem de traça na decoração (são inimigos), nem escada (sugeriria
// subir), nem xícaras, cubos de açúcar ou gelatina.
// Leitura: a cúpula é a parte escura e fica só no alto; o resto do fundo é claro e quente. Os sólidos
// são pilhas de livros escuros com o topo de páginas creme; os atravessáveis, livros deitados em fila,
// de capa colorida com contorno marinho e sombra dura.

/** Faixas da cúpula (escura em cima, clareando) e a parede quente embaixo. */
const CEU: ReadonlyArray<readonly [number, string]> = [
  [0, '#56638a'],
  [0.12, '#6c78a0'],
  [0.24, '#8792b5'],
  [0.35, '#a5adc9'],
  [0.46, '#e9d8b8'],
];
const ESTRELA = '#f6e7b8';
const NERVURA = '#7a85aa';
const CONSTELACAO = '#cdd3e6';

const PAREDE = '#e2cfab';
const ESTANTE_LONGE = '#d6bf97';
const ESTANTE_LONGE_FUNDO = '#cbb189';
const TRACO_LONGE = '#b99a70';
/** Lombadas do fundo: cores apagadas. */
const LOMBADAS_LONGE = ['#d8b9a8', '#c9c3a0', '#b8c4c9', '#d6c39a', '#c4b0c4'] as const;

const MADEIRA = '#a8743f';
const MADEIRA_FUNDO = '#c49a6c';
const MADEIRA_TRACO = '#7d5532';
/** Lombadas das estantes do meio: vivas, mas mais claras que as peças jogáveis. */
const LOMBADAS = ['#d98b7a', '#8fb0c4', '#e3c070', '#a3c492', '#c2a0c8', '#e7d6b0'] as const;
const LUZ = '#ffe2a0';

/** Pilhas de livros dos sólidos: tons escuros alternados, com filetes dourados. */
const SOLIDO = '#3a2a3f';
const SOLIDO_TONS = ['#3a2a3f', '#33304a', '#43293a', '#2f3a48'] as const;
const DOURADO = '#c9a55a';
const PAGINAS = '#f3e6c6';
const PAGINAS_LINHA = '#d8c49c';
/** Capas dos livros atravessáveis: terracota, mostarda, sálvia e couro (nada de azul: é a cor da tinta). */
const CAPAS = ['#c8553d', '#e0a93b', '#7fa86a', '#b5764a'] as const;
const FITA = '#e0b45c';

const VELUDO = '#5b3556';
const VELUDO_DOBRA = '#6e4569';

/** Estrelinha de quatro pontas, pequena e apagada (não pode parecer o item de invencibilidade). */
function estrela(x: number, y: number, s: number): string {
  return `<path transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" fill="${ESTRELA}" opacity="0.85"/>`;
}

/** Constelação traçada a régua: linhas finas ligando pontos. */
function constelacao(x: number, y: number, tracos: ReadonlyArray<ReadonlyArray<readonly [number, number]>>): string {
  const d = tracos.map((t) => t.map(([px, py], i) => `${i ? 'L' : 'M'}${n(x + px)} ${n(y + py)}`).join(' ')).join(' ');
  const pontos = new Set<string>();
  for (const t of tracos) for (const [px, py] of t) pontos.add(`${n(x + px)},${n(y + py)}`);
  return (
    `<path d="${d}" fill="none" stroke="${CONSTELACAO}" stroke-width="2" stroke-linejoin="round" opacity="0.7"/>` +
    [...pontos].map((p) => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3.5" fill="${ESTRELA}"/>`).join('')
  );
}

/** Lombadas em pé numa fileira, de `x0` a `x1`, com a base em `y`. */
function fileira(x0: number, x1: number, y: number, alt: number, cores: readonly string[], seed: number, traco: string | null, opacidade = 1): string {
  const out: string[] = [];
  let i = 0;
  for (let x = x0; x < x1 - 6; i++) {
    const lw = Math.min(x1 - x, 10 + 10 * hash(seed + i));
    const lh = alt * (0.7 + 0.3 * hash(seed + 50 + i));
    const cor = cores[Math.floor(hash(seed + 100 + i) * cores.length)] ?? cores[0];
    const stroke = traco ? ` stroke="${traco}" stroke-width="2"` : '';
    out.push(`<rect x="${n(x)}" y="${n(y - lh)}" width="${n(lw - 1)}" height="${n(lh)}" fill="${cor}"${stroke}/>`);
    if (lw > 13 && hash(seed + 150 + i) < 0.6) out.push(`<rect x="${n(x + 2)}" y="${n(y - lh * 0.8)}" width="${n(lw - 5)}" height="3" fill="${shade(cor ?? WHITE, 0.82)}"/>`);
    x += lw;
  }
  return `<g opacity="${opacidade}">${out.join('')}</g>`;
}

/** Estante em arco do fundo: moldura, fundo e três fileiras de lombadas apagadas. */
function estanteLonge(x: number, largura: number, topo: number, base: number, seed: number): string {
  const r = largura / 2;
  const corpo = `M${n(x)} ${n(base)} L${n(x)} ${n(topo + r)} A${n(r)} ${n(r)} 0 0 1 ${n(x + largura)} ${n(topo + r)} L${n(x + largura)} ${n(base)} Z`;
  const ix = x + 10;
  const iw = largura - 20;
  const interior = `M${n(ix)} ${n(base)} L${n(ix)} ${n(topo + r + 4)} A${n(iw / 2)} ${n(iw / 2)} 0 0 1 ${n(ix + iw)} ${n(topo + r + 4)} L${n(ix + iw)} ${n(base)} Z`;
  const fileiras: string[] = [];
  for (let k = 0, y = topo + r + 50; y < base; k++, y += 50) {
    fileiras.push(fileira(ix + 2, ix + iw - 2, y, 36, LOMBADAS_LONGE, seed + k * 31, null, 0.85));
    fileiras.push(`<rect x="${n(ix)}" y="${n(y)}" width="${n(iw)}" height="5" fill="${ESTANTE_LONGE}"/>`);
  }
  return (
    `<path d="${corpo}" fill="${ESTANTE_LONGE}" stroke="${TRACO_LONGE}" stroke-width="3"/>` +
    `<path d="${interior}" fill="${ESTANTE_LONGE_FUNDO}"/>` +
    fileiras.join('')
  );
}

/** O livro pop-up gigante (o cartão-postal da fase): páginas abertas, morros, moinho e sol de cartolina. */
function livroPopUp(cx: number, base: number, W: number, h: number): string {
  const t = `stroke="${TRACO_LONGE}" stroke-width="3" stroke-linejoin="round"`;
  const pico1 = base - h * 0.2;
  const pico2 = base - h * 0.13;
  // Moinho no morro de trás.
  const mx = cx - W * 0.28;
  const my = base - h * 0.17;
  const pas = [20, 110, 200, 290]
    .map((deg) => `<rect transform="translate(${n(mx)} ${n(my - 70)}) rotate(${deg})" x="-6" y="-62" width="12" height="56" fill="#f3e3c4" ${t}/>`)
    .join('');
  return (
    // Sol de cartolina no palito.
    `<path d="M${n(cx + W * 0.45)} ${n(base - 20)} L${n(cx + W * 0.45)} ${n(base - h * 0.28)}" stroke="${TRACO_LONGE}" stroke-width="4"/>` +
    `<circle cx="${n(cx + W * 0.45)}" cy="${n(base - h * 0.3)}" r="30" fill="#f6dc8f" ${t}/>` +
    // Morros de cartolina.
    `<path d="M${n(cx - W * 0.85)} ${n(base - 14)} Q${n(cx - W * 0.35)} ${n(pico1 - h * 0.08)} ${n(cx + W * 0.2)} ${n(base - 14)} Z" fill="#c7d6b3" ${t}/>` +
    `<path d="M${n(mx - 16)} ${n(my)} L${n(mx - 9)} ${n(my - 74)} L${n(mx + 9)} ${n(my - 74)} L${n(mx + 16)} ${n(my)} Z" fill="#ead2b0" ${t}/>` +
    pas +
    `<circle cx="${n(mx)}" cy="${n(my - 70)}" r="6" fill="#ead2b0" ${t}/>` +
    `<path d="M${n(cx - W * 0.2)} ${n(base - 12)} Q${n(cx + W * 0.4)} ${n(pico2 - h * 0.06)} ${n(cx + W * 0.92)} ${n(base - 12)} Z" fill="#b5c99f" ${t}/>` +
    // Páginas abertas e a capa por baixo.
    `<path d="M${n(cx - W - 10)} ${n(base - 4)} L${n(cx + W + 10)} ${n(base - 4)} L${n(cx + W + 10)} ${n(base + 10)} L${n(cx - W - 10)} ${n(base + 10)} Z" fill="#d79a86" ${t}/>` +
    `<path d="M${n(cx - W)} ${n(base - 4)} L${n(cx - W)} ${n(base - 22)} Q${n(cx - W * 0.5)} ${n(base - 34)} ${n(cx)} ${n(base - 16)} Q${n(cx + W * 0.5)} ${n(base - 34)} ${n(cx + W)} ${n(base - 22)} L${n(cx + W)} ${n(base - 4)} Z" fill="#f6ecd6" ${t}/>` +
    `<path d="M${n(cx)} ${n(base - 16)} L${n(cx)} ${n(base - 4)}" ${t}/>`
  );
}

/** Folha solta flutuando (pequena, clara, inclinada). */
function folhaSolta(x: number, y: number, rot: number): string {
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})" opacity="0.8">` +
    `<rect x="-12" y="-15" width="24" height="30" rx="2" fill="#f3ead6" stroke="#c9b089" stroke-width="2"/>` +
    `<path d="M-7 -7 H7 M-7 -1 H7 M-7 5 H3" stroke="#d6c7a6" stroke-width="1.6"/></g>`
  );
}

/** Estante alta do meio, colada à parede de um lado: moldura de madeira e prateleiras curtas cheias. */
function estante(x0: number, x1: number, topo: number, base: number, seed: number): string {
  const out: string[] = [];
  out.push(`<rect x="${n(x0)}" y="${n(topo)}" width="${n(x1 - x0)}" height="${n(base - topo)}" fill="${MADEIRA}" stroke="${MADEIRA_TRACO}" stroke-width="3"/>`);
  out.push(`<rect x="${n(x0 + 12)}" y="${n(topo + 12)}" width="${n(x1 - x0 - 24)}" height="${n(base - topo - 12)}" fill="${MADEIRA_FUNDO}"/>`);
  for (let k = 0, y = topo + 120; y < base; k++, y += 120) {
    out.push(fileira(x0 + 14, x1 - 14, y, 92, LOMBADAS, seed + k * 17, shade(MADEIRA_FUNDO, 0.75)));
    // Tábua sem contorno e da cor do fundo da estante: perto da parede, não pode parecer um degrau.
    out.push(`<rect x="${n(x0 + 12)}" y="${n(y)}" width="${n(x1 - x0 - 24)}" height="8" fill="${shade(MADEIRA_FUNDO, 0.86)}"/>`);
  }
  return out.join('');
}

/** Luminária pendente: corrente, cúpula cor de mel e a poça de luz em volta. */
function luminaria(x: number, y: number, topo: number): string {
  return (
    `<circle cx="${n(x)}" cy="${n(y + 30)}" r="120" fill="${LUZ}" opacity="0.2"/>` +
    `<circle cx="${n(x)}" cy="${n(y + 30)}" r="70" fill="${LUZ}" opacity="0.3"/>` +
    `<path d="M${n(x)} ${n(topo)} V${n(y)}" stroke="#8a6a4a" stroke-width="3" stroke-dasharray="7 4"/>` +
    `<path d="M${n(x - 30)} ${n(y + 30)} Q${n(x - 26)} ${n(y)} ${n(x)} ${n(y)} Q${n(x + 26)} ${n(y)} ${n(x + 30)} ${n(y + 30)} Z" fill="#d99a4a" stroke="${MADEIRA_TRACO}" stroke-width="3" stroke-linejoin="round"/>` +
    `<ellipse cx="${n(x)}" cy="${n(y + 32)}" rx="12" ry="6" fill="#fff6d8"/>`
  );
}

/** Pilha baixa de livros deitados atrás do chão. */
function pilha(x: number, chao: number, seed: number): string {
  const out: string[] = [];
  let y = chao + 4;
  const qtd = 2 + Math.floor(hash(seed) * 3);
  for (let k = 0; k < qtd; k++) {
    const lw = 50 + 26 * hash(seed + k + 1);
    const lh = 10 + 4 * hash(seed + k + 11);
    const dx = (hash(seed + k + 21) - 0.5) * 12;
    const cor = LOMBADAS[Math.floor(hash(seed + k + 31) * LOMBADAS.length)] ?? LOMBADAS[0];
    y -= lh;
    out.push(`<rect x="${n(x - lw / 2 + dx)}" y="${n(y)}" width="${n(lw)}" height="${n(lh)}" rx="2" fill="${cor}" stroke="${shade(cor, 0.72)}" stroke-width="2"/>`);
  }
  return out.join('');
}

/** Cortina de veludo em bando, presa no canto de cima, com franja dourada. */
function cortina(x: number, lado: number, w: number, m: number): string {
  const x1 = x + lado * w;
  const d = `M${n(x)} ${-m} L${n(x1)} ${-m} L${n(x1)} 6 Q${n(x + lado * w * 0.55)} 34 ${n(x + lado * w * 0.25)} 62 Q${n(x + lado * 20)} 82 ${n(x)} 96 Z`;
  const franja: string[] = [];
  for (let t = 0.06; t < 1; t += 0.07) {
    // Pontos ao longo da curva de baixo, aproximados.
    const px = x1 + (x - x1) * t;
    const py = 6 + 90 * t * t;
    franja.push(`M${n(px)} ${n(py)} v10`);
  }
  return (
    `<path d="${d}" fill="${VELUDO}"/>` +
    `<path d="M${n(x + lado * w * 0.7)} ${-m} Q${n(x + lado * w * 0.62)} 20 ${n(x + lado * w * 0.5)} 34 M${n(x + lado * w * 0.42)} ${-m} Q${n(x + lado * w * 0.36)} 30 ${n(x + lado * w * 0.22)} 58" stroke="${VELUDO_DOBRA}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="${franja.join(' ')}" stroke="${FITA}" stroke-width="4" stroke-linecap="round"/>`
  );
}

/** Cordão dourado descendo pela parede, com uma borla. */
function cordao(x: number, h: number): string {
  let d = `M${n(x)} 0`;
  for (let y = 0, i = 0; y < h; y += 50, i++) d += ` Q${n(x + (i % 2 ? -6 : 6))} ${n(y + 25)} ${n(x)} ${n(y + 50)}`;
  const by = h * 0.42;
  return (
    `<path d="${d}" stroke="${FITA}" stroke-width="5" fill="none" opacity="0.85"/>` +
    `<path d="M${n(x - 7)} ${n(by)} L${n(x + 7)} ${n(by)} L${n(x + 10)} ${n(by + 30)} L${n(x - 10)} ${n(by + 30)} Z" fill="${FITA}" opacity="0.9"/>`
  );
}

/** Livro deitado de um atravessável, de `xa` a `xb` no alto `y`: mostra a lombada ou o corte das páginas. */
function livroDeitado(xa: number, xb: number, y: number, cor: string, lombada: boolean, fita: boolean): string {
  const h = 20;
  const corpo = `M${n(xa + 5)} ${y} L${n(xb - 5)} ${y} Q${n(xb)} ${y} ${n(xb)} ${y + 5} L${n(xb)} ${y + h - 5} Q${n(xb)} ${y + h} ${n(xb - 5)} ${y + h} L${n(xa + 5)} ${y + h} Q${n(xa)} ${y + h} ${n(xa)} ${y + h - 5} L${n(xa)} ${y + 5} Q${n(xa)} ${y} ${n(xa + 5)} ${y} Z`;
  let miolo: string;
  if (lombada) {
    miolo =
      `<rect x="${n(xa + 10)}" y="${y + 3}" width="5" height="${h - 6}" fill="${DOURADO}"/>` +
      `<rect x="${n(xb - 15)}" y="${y + 3}" width="5" height="${h - 6}" fill="${DOURADO}"/>` +
      `<path d="M${n(xa + 24)} ${y + 13} H${n(Math.max(xa + 26, xb - 24))}" stroke="${shade(cor, 0.75)}" stroke-width="3" stroke-linecap="round"/>`;
  } else {
    // Corte das páginas entre as duas capas.
    miolo =
      `<rect x="${n(xa + 3)}" y="${y + 5}" width="${n(xb - xa - 6)}" height="${h - 10}" fill="${PAGINAS}"/>` +
      `<path d="M${n(xa + 5)} ${y + 8.5} H${n(xb - 5)} M${n(xa + 5)} ${y + 11.5} H${n(xb - 5)}" stroke="${PAGINAS_LINHA}" stroke-width="1.4"/>`;
  }
  const marcador = fita
    ? `<path d="M${n(xb - 22)} ${y + h - 2} L${n(xb - 14)} ${y + h - 2} L${n(xb - 14)} ${y + h + 12} L${n(xb - 18)} ${y + h + 8} L${n(xb - 22)} ${y + h + 12} Z" fill="${CAPAS[0]}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    : '';
  return (
    marcador +
    `<path d="${corpo}" fill="${cor}"/>` +
    miolo +
    `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>` +
    line(`M${n(xa + 8)} ${y + 3.5} L${n(xa + Math.max(10, (xb - xa) * 0.45))} ${y + 3.5}`, 2.6, WHITE).replace('/>', ' opacity="0.6"/>')
  );
}

export const BIBLIOTECA_CENARIO: Cenario = {
  ceu: (w, h) => {
    const faixas = CEU.map(([y0, cor], i) => {
      const y1 = (CEU[i + 1]?.[0] ?? 1) * h;
      return `<rect x="0" y="${n(y0 * h)}" width="${w}" height="${n(y1 - y0 * h + 1)}" fill="${cor}"/>`;
    }).join('');
    const pauta: string[] = [];
    for (let y = Math.ceil((0.46 * h) / C) * C; y < h; y += C) pauta.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    return (
      faixas +
      `<g stroke="#d8c6a2" stroke-width="2" opacity="0.6">${pauta.join('')}</g>` +
      `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#e7a99a" stroke-width="3" opacity="0.35"/>`
    );
  },

  longe: {
    amp: 6,
    desenho: (_a, w, h, m) => {
      const domo = h * 0.46;
      const apice = -m - 60;
      const nervuras = [-m, 0.15 * w, 0.33 * w, 0.67 * w, 0.85 * w, w + m]
        .map((x) => `M${n(w / 2)} ${apice} Q${n(x + (x - w / 2) * 0.35)} ${n(domo * 0.35)} ${n(x)} ${n(domo)}`)
        .join(' ');
      const estrelas: string[] = [];
      for (let i = 0; i < 22; i++) estrelas.push(estrela(hash(300 + i) * w, (0.03 + 0.36 * hash(400 + i)) * h, 0.7 + 0.6 * hash(500 + i)));
      const lua = `M${n(0.2 * w)} ${n(0.13 * h - 34)} A34 34 0 1 0 ${n(0.2 * w)} ${n(0.13 * h + 34)} A26 30 0 1 1 ${n(0.2 * w)} ${n(0.13 * h - 34)} Z`;
      const estantes: string[] = [];
      const passo = w / 8;
      for (let k = 0; k < 9; k++) estantes.push(estanteLonge(-m + k * passo + passo * 0.12, passo * 0.76, h * 0.4, h + m, 600 + k * 53));
      const folhas = [
        [0.3, 0.52, -14],
        [0.42, 0.4, 10],
        [0.66, 0.47, 18],
        [0.78, 0.36, -8],
      ]
        .map(([fx, fy, rot]) => folhaSolta((fx ?? 0) * w, (fy ?? 0) * h, rot ?? 0))
        .join('');
      return (
        `<path d="${nervuras}" fill="none" stroke="${NERVURA}" stroke-width="5" opacity="0.8"/>` +
        estrelas.join('') +
        `<path d="${lua}" fill="#fbefc9"/>` +
        constelacao(0.62 * w, 0.1 * h, [
          [
            [-60, 0],
            [60, 0],
            [40, 22],
            [-40, 22],
            [-60, 0],
          ],
          [
            [0, 0],
            [0, -50],
            [30, -10],
            [0, -10],
          ],
        ]) +
        constelacao(0.38 * w, 0.2 * h, [
          [
            [0, -40],
            [26, 0],
            [0, 40],
            [-26, 0],
            [0, -40],
          ],
          [
            [0, 40],
            [10, 60],
            [-6, 78],
            [8, 96],
          ],
        ]) +
        `<rect x="${-m}" y="${n(domo - 8)}" width="${w + 2 * m}" height="${n(h + m - domo + 8)}" fill="${PAREDE}"/>` +
        `<rect x="${-m}" y="${n(domo - 8)}" width="${w + 2 * m}" height="14" fill="${ESTANTE_LONGE_FUNDO}" stroke="${TRACO_LONGE}" stroke-width="3"/>` +
        estantes.join('') +
        livroPopUp(w / 2, h * 0.9, w * 0.17, h) +
        folhas
      );
    },
  },

  meio: {
    amp: 3,
    desenho: (a, w, h, m) => {
      const chao = (a.rows - 1) * C;
      const pilhas: string[] = [];
      for (let x = 150, i = 0; x < w - 150; x += 180 + 90 * hash(700 + i), i++) {
        // O meio fica livre para o livro pop-up.
        if (Math.abs(x - w / 2) < w * 0.2) continue;
        pilhas.push(pilha(x, chao, 710 + i * 7));
      }
      return (
        luminaria(0.3 * w, 0.2 * h, -m) +
        luminaria(0.7 * w, 0.16 * h, -m) +
        estante(-m, 0.1 * w, 0.06 * h, h + m, 800) +
        estante(0.9 * w, w + m, 0.06 * h, h + m, 900) +
        pilhas.join('')
      );
    },
  },

  frente: {
    amp: -4,
    desenho: (a, w, h, m) => {
      const chao = (a.rows - 1) * C;
      const caidos: string[] = [];
      for (let x = 60, i = 0; x < w - 40; x += 120 + 80 * hash(1000 + i), i++) {
        const cor = ['#8a6a80', '#7d8aa0', '#a8875a'][i % 3];
        caidos.push(`<rect x="${n(x)}" y="${n(chao + 18 + 6 * hash(1010 + i))}" width="${n(30 + 20 * hash(1020 + i))}" height="8" rx="2" fill="${cor}" opacity="0.9"/>`);
      }
      return cortina(-m, 1, w * 0.2 + m, m) + cortina(w + m, -1, w * 0.2 + m, m) + cordao(C * 0.45, h) + cordao(w - C * 0.45, h) + caidos.join('');
    },
  },

  solidos: (a: Arena) => {
    // Cada linha de células vira duas fileiras de livros deitados, de comprimentos sorteados.
    const livros: string[] = [];
    let seed = 0;
    for (const r of rects(a, SOLID)) {
      const x0 = r.c0 === 0 ? -8 : r.c0 * C;
      const x1 = r.c1 === a.cols - 1 ? a.cols * C + 8 : (r.c1 + 1) * C;
      for (let y = r.r0 * C; y < (r.r1 + 1) * C; y += C / 2) {
        for (let x = x0; x < x1; seed++) {
          const lw = Math.min(x1 - x, 50 + 70 * hash(1100 + seed));
          const cor = SOLIDO_TONS[Math.floor(hash(1200 + seed) * SOLIDO_TONS.length)] ?? SOLIDO;
          livros.push(`<rect x="${n(x)}" y="${y}" width="${n(lw)}" height="${C / 2}" fill="${cor}"/>`);
          livros.push(`<path d="M${n(x)} ${y} V${y + C / 2} M${n(x)} ${y + C / 2} H${n(x + lw)}" stroke="#251b29" stroke-width="2"/>`);
          if (lw > 40) {
            livros.push(`<rect x="${n(x + 7)}" y="${y + 4}" width="3" height="${C / 2 - 8}" fill="${DOURADO}" opacity="0.75"/>`);
            livros.push(`<rect x="${n(x + lw - 10)}" y="${y + 4}" width="3" height="${C / 2 - 8}" fill="${DOURADO}" opacity="0.75"/>`);
          }
          x += lw;
        }
      }
    }
    const topos = solidTops(a)
      .map(
        ({ x0, x1, y }) =>
          `<rect x="${x0}" y="${y - 2}" width="${x1 - x0}" height="11" rx="4" fill="${PAGINAS}" stroke="${INK}" stroke-width="3"/>` +
          `<path d="M${x0 + 6} ${y + 2.5} H${x1 - 6} M${x0 + 6} ${y + 5.5} H${x1 - 6}" stroke="${PAGINAS_LINHA}" stroke-width="1.4"/>`,
      )
      .join('');
    const forma = solidPath(a);
    return (
      `<clipPath id="pilhas"><path d="${forma}"/></clipPath>` +
      `<g filter="url(#sombra-plataforma)"><path d="${forma}" fill="${SOLIDO}"/></g>` +
      `<g clip-path="url(#pilhas)">${livros.join('')}</g>` +
      topos
    );
  },

  plataforma: (r: Rect) => {
    const x = r.c0 * C + 3;
    const y = r.r0 * C + 2;
    const w = (r.c1 - r.c0 + 1) * C - 6;
    const seed = r.c0 * 7 + r.r0 * 13;
    const cortes = [x];
    for (let k = 0; cortes[cortes.length - 1]! < x + w; k++) {
      const prox = (cortes[cortes.length - 1] ?? x) + 70 + 80 * hash(seed + k);
      // Livro que sobraria curto demais vai junto com o anterior.
      cortes.push(prox > x + w - 50 ? x + w : prox);
    }
    const livros: string[] = [];
    for (let k = 0; k + 1 < cortes.length; k++) {
      const cor = CAPAS[Math.floor(hash(seed + 40 + k) * CAPAS.length)] ?? CAPAS[0];
      livros.push(livroDeitado(cortes[k]!, cortes[k + 1]!, y, cor, hash(seed + 80 + k) < 0.5, k === 0 && w > 100));
    }
    return `<g filter="url(#sombra-plataforma)">${livros.join('')}</g>`;
  },

  baseTubo: () =>
    // Pilha de livros deitados atrás da bisnaga, mais clara que as peças.
    `<rect x="-34" y="66" width="68" height="14" rx="3" fill="#e2a08f" stroke="#a8743f" stroke-width="2.5"/>` +
    `<rect x="-28" y="54" width="58" height="12" rx="3" fill="#b9cfa6" stroke="#a8743f" stroke-width="2.5"/>` +
    `<rect x="-31" y="42" width="52" height="12" rx="3" fill="#eccb85" stroke="#a8743f" stroke-width="2.5"/>` +
    `<path d="M-30 73 H30 M-24 60 H26 M-27 48 H17" stroke="#fff4dc" stroke-width="2" opacity="0.8"/>`,

  ancora: (x, y) =>
    `<path d="M${x + 2} ${y} L${x + 9} ${y} L${x + 9} ${y + 16} L${x + 5.5} ${y + 12} L${x + 2} ${y + 16} Z" fill="${FITA}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
};

/** Tema da Biblioteca: o caderno de fallback fica vazio; quem desenha é o cenário. */
export const BIBLIOTECA: Tema = {
  pauta: () => '',
  rabiscos: () => '',
  manchas: () => '',
  etiqueta: CAPAS[0],
  cenario: BIBLIOTECA_CENARIO,
};
