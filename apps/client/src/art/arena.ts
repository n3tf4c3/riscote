import { ONE_WAY, SOLID, cellAt, type Arena } from '@riscote/shared';
import { C, U, rects, solidPath, solidTops, type Rect } from './celulas';
import { BIBLIOTECA } from './biblioteca';
import { CASTELO } from './castelo';
import { FLORESTA } from './floresta';
import { JARDIM } from './jardim';
import { OFICINA } from './oficina';
import { INK, PALETTE, PAPER, PAPER_LINE, WHITE, line, outlined, shade, shadowFilter, svgDoc } from './svg';

// Arena em cartum (direção de 2026-10-31), gerada das células do mapa em duas camadas:
// o fundo de caderno pautado e, por cima dos efeitos, as plataformas e paredes.
// As atravessáveis são "etiquetas" de cor chapada com contorno marinho e sombra dura; os sólidos,
// blocos marinho com a quina de cima clara. Decoração só no fundo, em traço apagado.
// Os temas com `cenario` (fases com profundidade, 2026-11-01) trocam o caderno por um céu parado e
// camadas que deslizam pelo parallax, e trazem a própria aparência de sólidos e atravessáveis.
// Unidades na escala 2: uma célula = 40.

type At = (fx: number, fy: number, s?: number) => string;

/**
 * Camada de parallax. A arena não se move (a câmera é fixa), então o que dá profundidade é o
 * deslocamento das camadas conforme a equipe anda: o que está longe acompanha mais a equipe,
 * o que está na frente vai contra.
 */
export interface Camada {
  /** Deslocamento máximo em pixels do mundo; negativo vai contra a equipe (camada da frente). */
  amp: number;
  /** Corpo do SVG em coordenadas da arena; pode passar das bordas até a margem `m` (unidades). */
  desenho: (a: Arena, w: number, h: number, m: number) => string;
}

/** Cenário em camadas: céu parado, longe, meio e frente, e a aparência das células jogáveis. */
export interface Cenario {
  /** Opaco e parado: as faixas do céu e a lembrança do papel. */
  ceu: (w: number, h: number) => string;
  longe: Camada;
  meio: Camada;
  /**
   * Por cima das plataformas e atrás de itens, inimigos e bonecos. É recortada nas paredes e no
   * chão (e na faixa de cima, se ela não tiver plataformas), recuada pelo próprio deslocamento:
   * nunca cobre onde se pisa.
   */
  frente: Camada;
  /** Paredes e chão, no lugar do bloco marinho. */
  solidos: (a: Arena) => string;
  /** Uma plataforma atravessável, no lugar da etiqueta. */
  plataforma: (r: Rect) => string;
  /** Enfeite do ponto `A` (de onde a fiandeira desce); (x, y) é o meio do alto da célula. */
  ancora: (x: number, y: number) => string;
  /** Enfeite atrás da bisnaga de tinta (quadro '-40 -4 80 86', chão em y = 80). */
  baseTubo?: () => string;
}

/**
 * Cada tema: a pauta do papel, os rabiscos do fundo (herdam o traço apagado do grupo), umas manchas
 * de cor pastel e a cor das etiquetas (plataformas atravessáveis).
 */
export interface Tema {
  pauta: (w: number, h: number) => string;
  rabiscos: (at: At, w: number, h: number) => string;
  manchas: (at: At) => string;
  etiqueta: string;
  cenario?: Cenario;
}

function linhas(w: number, h: number, passo: number, verticais = false): string {
  const out: string[] = [];
  for (let y = passo; y < h; y += passo) out.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  if (verticais) for (let x = passo; x < w; x += passo) out.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  return out.join('');
}

/** Bolha de cor pastel no fundo (como o círculo pêssego das referências). */
function bolha(at: At, fx: number, fy: number, r: number, color: string, opacity = 0.5, dy = 0): string {
  return `<circle transform="${at(fx, fy)}" cy="${dy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
}

const PAUTA = `stroke="${PAPER_LINE}" stroke-width="2"`;

/** Caderno pautado (capítulo 1 e a mesa do chefe): casinha, sol, ondas, montanhas e anotações. */
const CADERNO: Tema = {
  pauta: (w, h) => `<g ${PAUTA}>${linhas(w, h, C)}</g>`,
  rabiscos: (at) =>
    `<path transform="${at(0.18, 0.2, 1.6)}" d="M0 40 L0 0 L30 -20 L60 0 L60 40 Z M20 40 L20 18 L40 18 L40 40 M8 6 L52 6"/>` +
    `<path transform="${at(0.766, 0.133)}" d="M0 0 a26 26 0 1 1 -1 0 M0 -26 v-14 M26 0 h14 M-26 0 h-14 M0 26 v14 M18 -18 l10 -10 M-18 -18 l-10 -10"/>` +
    `<path transform="${at(0.47, 0.32, 1.4)}" d="M0 0 q20 -30 40 0 t40 0 t40 0 M0 14 q20 -30 40 0 t40 0 t40 0"/>` +
    `<path transform="${at(0.1, 0.7, 1.3)}" d="M0 0 l30 -40 l30 40 l26 -30 l30 30 M10 -6 l8 -10 M40 -8 l6 -10 M70 -4 l6 -8"/>` +
    `<path transform="${at(0.84, 0.62, 1.2)}" d="M0 0 q14 -26 28 0 q14 26 28 0 M-6 30 h70 M-6 38 h50"/>` +
    `<path transform="${at(0.6, 0.85, 1.2)}" d="M0 0 c10 -20 30 -20 40 0 c-10 8 -30 8 -40 0 M40 0 l14 -8 l0 16 Z"/>`,
  manchas: (at) => bolha(at, 0.766, 0.133, 26, PALETTE.amarelo, 0.35, 26) + bolha(at, 0.3, 0.55, 44, PALETTE.pessego, 0.45) + bolha(at, 0.88, 0.8, 30, PALETTE.pessego, 0.35),
  etiqueta: PALETTE.amarelo,
};

/** Papel quadriculado de matemática: gráfico de parábola, triângulo, compasso e uma conta. */
const QUADRICULADA: Tema = {
  pauta: (w, h) =>
    `<g stroke="${PAPER_LINE}" stroke-width="1.2">${linhas(w, h, C / 2, true)}</g>` +
    `<g stroke="#d9cfbb" stroke-width="2">${linhas(w, h, C * 2, true)}</g>`,
  rabiscos: (at) =>
    `<path transform="${at(0.2, 0.3, 1.5)}" d="M0 0 v-80 M0 0 h100 M-4 -74 l4 -6 l4 6 M94 -4 l6 4 l-6 4 M12 -70 Q46 64 80 -70"/>` +
    `<path transform="${at(0.72, 0.2, 1.4)}" d="M0 0 L80 0 L24 -54 Z M24 -54 L24 0 M24 -9 h9 v9 M8 0 a10 10 0 0 0 -2 -8"/>` +
    `<path transform="${at(0.5, 0.56, 1.3)}" d="M-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0 M0 0 L30 -16 M0 0 l-2 -48 l-8 -26 M-2 -48 l8 -26"/>` +
    `<path transform="${at(0.14, 0.82, 1.4)}" d="M0 -20 L6 -26 L6 0 M16 -12 h12 M22 -18 v12 M36 -20 L42 -26 L42 0 M52 -15 h12 M52 -8 h12 M72 -20 q8 -12 16 -2 q0 6 -16 22 h18"/>` +
    `<path transform="${at(0.82, 0.74, 1.3)}" d="M0 0 h60 M0 -14 h44 M8 -30 l10 10 M18 -30 l-10 10 M30 -30 v10 M26 -26 h8"/>`,
  manchas: (at) => bolha(at, 0.5, 0.56, 50, '#bfe9e1', 0.5) + bolha(at, 0.2, 0.22, 34, PALETTE.pessego, 0.35),
  etiqueta: '#3cc8b4',
};

/** Partitura: pautas de cinco linhas com barras de compasso, clave, notas e uma ligadura. */
const PARTITURA: Tema = {
  pauta: (w, h) => {
    const out: string[] = [];
    for (let y = C * 0.75; y + 48 < h; y += C * 3) {
      for (let i = 0; i < 5; i++) out.push(`<line x1="0" y1="${y + i * 12}" x2="${w}" y2="${y + i * 12}"/>`);
      for (let x = w / 4; x < w; x += w / 4) out.push(`<line x1="${Math.round(x)}" y1="${y}" x2="${Math.round(x)}" y2="${y + 48}"/>`);
    }
    return `<g ${PAUTA}>${out.join('')}</g>`;
  },
  rabiscos: (at) =>
    `<path transform="${at(0.09, 0.15, 1.5)}" d="M10 40 q-14 -6 -8 -18 q8 -12 18 -2 q8 12 -6 22 q-18 8 -20 -14 q0 -20 22 -40 q10 -14 2 -22 q-10 0 -10 22 l6 76 q2 12 -8 10 q-6 -2 -4 -8"/>` +
    `<path transform="${at(0.3, 0.4, 1.4)}" d="M0 0 a9 6 -20 1 0 18 -4 a9 6 -20 1 0 -18 4 M18 -4 v-52 M40 -10 a9 6 -20 1 0 18 -4 a9 6 -20 1 0 -18 4 M58 -14 v-50 M18 -56 L58 -64 M18 -48 L58 -56"/>` +
    `<path transform="${at(0.68, 0.18, 1.4)}" d="M0 0 a9 6 -20 1 0 18 -4 a9 6 -20 1 0 -18 4 M18 -4 v-52 q14 10 16 28"/>` +
    `<path transform="${at(0.6, 0.72, 1.3)}" d="M0 0 q50 -40 100 0 M48 -40 a3 3 0 1 0 0.1 0 M10 20 l10 -6 l10 6 l10 -6 l10 6"/>` +
    `<path transform="${at(0.86, 0.5, 1.3)}" d="M0 0 a9 6 -20 1 0 18 -4 a9 6 -20 1 0 -18 4 M0 0 v44 M-14 30 l28 -8 M-14 40 l28 -8"/>`,
  manchas: (at) => bolha(at, 0.32, 0.36, 46, '#ffd6de', 0.5) + bolha(at, 0.8, 0.6, 38, PALETTE.pessego, 0.4),
  etiqueta: '#ff8fa3',
};

/** Mapa do tesouro: trilha pontilhada até o X, rosa dos ventos, ilha com coqueiro e um barquinho. */
const MAPA: Tema = {
  pauta: (w, h) => `<g ${PAUTA} opacity="0.7">${linhas(w, h, C)}</g>`,
  rabiscos: (at, w, h) =>
    `<path stroke-dasharray="7 11" d="M${Math.round(0.06 * w)} ${Math.round(0.9 * h)} C${Math.round(0.3 * w)} ${Math.round(0.95 * h)} ${Math.round(0.2 * w)} ${Math.round(0.55 * h)} ${Math.round(0.4 * w)} ${Math.round(0.6 * h)} S${Math.round(0.7 * w)} ${Math.round(0.4 * h)} ${Math.round(0.56 * w)} ${Math.round(0.3 * h)} S${Math.round(0.42 * w)} ${Math.round(0.12 * h)} ${Math.round(0.5 * w)} ${Math.round(0.08 * h)}"/>` +
    `<path transform="${at(0.5, 0.08, 1.4)}" stroke-width="5" d="M-12 -12 L12 12 M12 -12 L-12 12"/>` +
    `<path transform="${at(0.12, 0.2, 1.4)}" d="M0 -40 L8 -8 L40 0 L8 8 L0 40 L-8 8 L-40 0 L-8 -8 Z M0 -40 v-8 M-4 -58 v-10 l8 10 v-10 M-26 -26 l-6 -6 M26 26 l6 6"/>` +
    `<path transform="${at(0.8, 0.22, 1.3)}" d="M-50 10 q10 -24 40 -22 q30 -6 54 10 q10 12 -10 16 q-40 8 -84 -4 M0 -12 q4 -30 -4 -48 M-4 -60 q-20 -4 -26 8 M-4 -60 q14 -10 26 0 M-4 -60 q-8 -14 -22 -14"/>` +
    `<path transform="${at(0.84, 0.66, 1.3)}" d="M-30 0 h60 l-10 14 h-40 Z M0 0 v-46 l26 30 h-26 M-60 26 q10 -8 20 0 t20 0 t20 0 t20 0 t20 0 t20 0"/>`,
  manchas: (at) => bolha(at, 0.8, 0.24, 58, '#cfe6f5', 0.55) + bolha(at, 0.84, 0.7, 52, '#cfe6f5', 0.45) + bolha(at, 0.5, 0.08, 24, PALETTE.pessego, 0.6),
  etiqueta: '#ff8a4c',
};

/** Folha de calendário: grade de sete colunas, a faixa do mês no alto, um dia circulado, um bolo e lembretes. */
const CALENDARIO: Tema = {
  pauta: (w, h) => {
    const out: string[] = [];
    for (let i = 1; i < 7; i++) out.push(`<line x1="${Math.round((i * w) / 7)}" y1="${C * 4}" x2="${Math.round((i * w) / 7)}" y2="${h}"/>`);
    for (let y = C * 4; y < h; y += C * 3) out.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    return `<rect x="0" y="${C * 2}" width="${w}" height="${C * 2}" fill="#e9e2f7" opacity="0.7"/><g ${PAUTA}>${out.join('')}</g>`;
  },
  rabiscos: (at) =>
    `<path transform="${at(0.36, 0.42, 1.4)}" d="M-30 0 a30 24 0 1 0 60 -2 a30 24 0 1 0 -58 -6 M-10 -10 L-4 -16 L-4 10 M6 -12 q10 -8 14 2 q0 6 -14 20 h16"/>` +
    `<path transform="${at(0.7, 0.62, 1.3)}" d="M-24 0 h48 v-22 h-48 Z M-24 -11 h48 M-14 -22 v-10 M0 -22 v-12 M14 -22 v-10 M-14 -36 q2 -4 0 -6 M0 -38 q2 -4 0 -6 M14 -36 q2 -4 0 -6"/>` +
    `<path transform="${at(0.14, 0.78, 1.3)}" d="M0 0 l10 12 l24 -30 M48 -10 h50 M48 4 h36"/>` +
    `<path transform="${at(0.86, 0.36, 1.2)}" d="M0 0 q20 -26 50 -10 M50 -10 l-12 -6 M50 -10 l-8 10 M-10 18 h60 M-10 28 h40"/>` +
    `<path transform="${at(0.5, 0.12, 1.5)}" d="M-60 0 h22 M-50 -10 v20 M-30 0 q6 -10 12 0 q6 10 12 0 M10 -10 v20 l14 -20 v20 M34 -10 v20 h14"/>`,
  manchas: (at) => bolha(at, 0.36, 0.42, 48, '#ffd6de', 0.5) + bolha(at, 0.7, 0.6, 40, PALETTE.pessego, 0.4),
  etiqueta: '#a993f2',
};

/**
 * Temas pelo nome. Os capítulos com tema (`visualDe`) pedem o seu (`floresta`, `biblioteca`); `jardim`,
 * `oficina` e `castelo` ainda não têm capítulo e só aparecem pedidos (`?tema=jardim`). Os de Partituras e
 * mapas (`quadriculada`, `partitura`, `mapa`, `calendario`) também só aparecem pedidos: as páginas
 * foram para a Biblioteca em 2026-11-01, com ids novos.
 */
const TEMAS: Record<string, Tema> = {
  caderno: CADERNO,
  quadriculada: QUADRICULADA,
  partitura: PARTITURA,
  mapa: MAPA,
  calendario: CALENDARIO,
  floresta: FLORESTA,
  biblioteca: BIBLIOTECA,
  jardim: JARDIM,
  oficina: OFICINA,
  castelo: CASTELO,
};

/** Nome do tema da arena: o pedido, se existir, senão o da própria arena, senão o caderno. */
export function temaId(a: Arena, pedido?: string | null): string {
  if (pedido && TEMAS[pedido]) return pedido;
  return TEMAS[a.id] ? a.id : 'caderno';
}

function tema(a: Arena, pedido?: string | null): Tema {
  return TEMAS[temaId(a, pedido)] ?? CADERNO;
}

/** Página de caderno: papel liso, pauta do tema, margem vermelha clara, manchas pastel e rabiscos apagados. */
export function arenaFundoSvg(a: Arena, pedido?: string | null): string {
  const w = a.cols * C;
  const h = a.rows * C;
  const t = tema(a, pedido);
  if (t.cenario) return svgDoc(`0 0 ${w} ${h}`, t.cenario.ceu(w, h));
  const at: At = (fx, fy, s = 1) => `translate(${Math.round(fx * w)} ${Math.round(fy * h)}) scale(${s})`;
  return svgDoc(
    `0 0 ${w} ${h}`,
    `<rect width="${w}" height="${h}" fill="${PAPER}"/>` +
      t.manchas(at) +
      t.pauta(w, h) +
      `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#f2b3a8" stroke-width="3"/>` +
      `<g fill="none" stroke="#d8ccb6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${t.rabiscos(at, w, h)}</g>`,
  );
}

/** Quina de luz nos topos expostos dos sólidos (onde dá para pisar) e um brilho fino nas paredes. */
function solidLight(a: Arena): string {
  return solidTops(a)
    .map(
      ({ x0, x1, y }) =>
        `<rect x="${x0}" y="${y + 3}" width="${x1 - x0}" height="9" rx="4.5" fill="#39425c"/>` +
        line(`M${x0 + 8} ${y + 6} L${x1 - 8} ${y + 6}`, 2.4, WHITE).replace('/>', ' opacity="0.28"/>'),
    )
    .join('');
}

/** Plataforma atravessável: etiqueta arredondada de cor chapada, faixa de sombra embaixo e brilho no alto. */
function etiqueta(r: Rect, color: string): string {
  const x = r.c0 * C + 3;
  const y = r.r0 * C + 2;
  const w = (r.c1 - r.c0 + 1) * C - 6;
  const h = 20;
  const body = `M${x + 10} ${y} L${x + w - 10} ${y} Q${x + w} ${y} ${x + w} ${y + 10} Q${x + w} ${y + h} ${x + w - 10} ${y + h} L${x + 10} ${y + h} Q${x} ${y + h} ${x} ${y + 10} Q${x} ${y} ${x + 10} ${y} Z`;
  return (
    `<g filter="url(#sombra-plataforma)">${outlined(body, color, 5)}</g>` +
    `<path d="M${x + 4} ${y + 13} L${x + w - 4} ${y + 13} Q${x + w - 3} ${y + h - 3} ${x + w - 10} ${y + h - 2.5} L${x + 10} ${y + h - 2.5} Q${x + 3} ${y + h - 3} ${x + 4} ${y + 13} Z" fill="${shade(color, 0.8)}"/>` +
    `<path d="${body}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    line(`M${x + 12} ${y + 6.5} L${x + Math.min(w - 12, 12 + w * 0.35)} ${y + 6.5}`, 3, WHITE).replace('/>', ' opacity="0.7"/>')
  );
}

/** Plataformas e paredes (fundo transparente), em pixels do mundo × 2. Sem tubos nem surgimentos. */
export function arenaSvg(a: Arena, pedido?: string | null): string {
  const w = a.cols * C;
  const h = a.rows * C;
  const t = tema(a, pedido);
  const defs = `<defs>${shadowFilter('sombra-plataforma', 5, 7, 0.2)}</defs>`;
  const cenario = t.cenario;
  if (cenario) {
    const ancoras = a.anchors.map((p) => cenario.ancora(p.col * C + C / 2, p.row * C)).join('');
    return svgDoc(`0 0 ${w} ${h}`, defs + cenario.solidos(a) + rects(a, ONE_WAY).map(cenario.plataforma).join('') + ancoras);
  }
  const solids = `<g filter="url(#sombra-plataforma)"><path d="${solidPath(a)}" fill="${INK}"/></g>` + solidLight(a);
  const ledges = rects(a, ONE_WAY).map((r) => etiqueta(r, t.etiqueta)).join('');
  return svgDoc(`0 0 ${w} ${h}`, defs + solids + ledges);
}

/** Uma camada de parallax pronta: o SVG (com a margem em volta da arena) e como ela se move. */
export interface CamadaSvg {
  nome: 'longe' | 'meio' | 'frente';
  svg: string;
  /** Deslocamento máximo em pixels do mundo (negativo: contra a equipe). */
  amp: number;
  /** Quanto o desenho passa de cada borda da arena, em pixels do mundo. */
  margem: number;
}

/** Margem de cada lado, em unidades do desenho, para o deslocamento nunca mostrar a borda da camada. */
function margemDe(amp: number): number {
  return Math.ceil(Math.abs(amp) * U) + 6;
}

/**
 * Onde a camada da frente pode desenhar: paredes e chão, mais a faixa das duas linhas de cima se
 * nela não houver plataforma, recuados pelo deslocamento da camada onde encostam no espaço de jogo.
 */
export function frenteRecorte(a: Arena, amp: number, m: number): string {
  const inset = Math.ceil(Math.abs(amp) * U) + 2;
  const w = a.cols * C;
  const h = a.rows * C;
  const parts: string[] = [];
  for (const r of rects(a, SOLID)) {
    const x0 = r.c0 === 0 ? -m : r.c0 * C + inset;
    const x1 = r.c1 === a.cols - 1 ? w + m : (r.c1 + 1) * C - inset;
    const y0 = r.r0 === 0 ? -m : r.r0 * C + inset;
    const y1 = r.r1 === a.rows - 1 ? h + m : (r.r1 + 1) * C - inset;
    if (x1 > x0 && y1 > y0) parts.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/>`);
  }
  let faixaLivre = true;
  for (let r = 0; r < 2; r++) for (let c = 0; c < a.cols; c++) if (cellAt(a, c, r) === ONE_WAY) faixaLivre = false;
  if (faixaLivre) parts.push(`<rect x="${-m}" y="${-m}" width="${w + 2 * m}" height="${m + 2 * C - inset}"/>`);
  return parts.join('');
}

/** As camadas de parallax do tema (vazio nos temas de caderno, que são uma folha só). */
export function arenaCamadasSvg(a: Arena, pedido?: string | null): CamadaSvg[] {
  const cenario = tema(a, pedido).cenario;
  if (!cenario) return [];
  const w = a.cols * C;
  const h = a.rows * C;
  const camadas = [
    ['longe', cenario.longe],
    ['meio', cenario.meio],
    ['frente', cenario.frente],
  ] as const;
  return camadas.map(([nome, camada]) => {
    const m = margemDe(camada.amp);
    let body = camada.desenho(a, w, h, m);
    if (nome === 'frente') body = `<clipPath id="recorte-frente">${frenteRecorte(a, camada.amp, m)}</clipPath><g clip-path="url(#recorte-frente)">${body}</g>`;
    return { nome, svg: svgDoc(`${-m} ${-m} ${w + 2 * m} ${h + 2 * m}`, body), amp: camada.amp, margem: m / U };
  });
}

/** Enfeite do tema atrás da bisnaga, ou null (o caderno não tem). */
export function tuboBaseSvg(a: Arena, pedido?: string | null): string | null {
  const base = tema(a, pedido).cenario?.baseTubo;
  return base ? svgDoc('-40 -4 80 86', base()) : null;
}

/** Bisnaga de tinta azul (só no modo difícil); base no ponto (0, 80). */
export function tuboSvg(): string {
  const body = 'M-14 22 Q0 17 14 22 L12 68 Q0 71 -12 68 Z';
  return svgDoc(
    '-20 0 40 82',
    `<ellipse cx="0" cy="79" rx="16" ry="3" fill="${INK}" opacity="0.18"/>` +
      // Tampa de rosca e gargalo.
      outlined('M-9 3 Q-9 1 -7 1 L7 1 Q9 1 9 3 L9 13 L-9 13 Z', WHITE, 2.6) +
      line('M-4.5 4 L-4.5 11 M0 4 L0 11 M4.5 4 L4.5 11', 1.4, PALETTE.cinzaClaro) +
      outlined('M-5 13 L5 13 L6 20 L-6 20 Z', PALETTE.cinzaClaro, 2.6) +
      // Corpo azul com rótulo branco e uma gota.
      outlined(body, PALETTE.azul, 2.8) +
      `<path d="M3 24 Q12 22 12 30 L11 66 Q7 68 3 68 Z" fill="${shade(PALETTE.azul, 0.8)}"/>` +
      `<path d="${body}" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>` +
      outlined('M-9 36 L9 35 L9 52 L-9 53 Z', WHITE, 2.2) +
      outlined('M0 38 Q5 45 5 47 A5 5 0 1 1 -5 47 Q-5 45 0 38 Z', PALETTE.azul, 1.8) +
      line('M-8 26 Q-10 32 -9 34', 2.4, WHITE).replace('/>', ' opacity="0.8"/>') +
      // Rabo dobrado e uma gota escorrendo.
      outlined('M-15 68 L15 68 L15 77 L-15 77 Z', PALETTE.azul, 2.6) +
      line('M-10 70.5 L-10 74.5 M-4 70.5 L-4 74.5 M2 70.5 L2 74.5 M8 70.5 L8 74.5', 1.4, WHITE) +
      outlined('M15 60 Q17 64 17 66 A2.6 2.6 0 1 1 13 66 Q13 64 15 60 Z', PALETTE.azul, 1.4),
  );
}

export const ARENA_UNITS = U;
