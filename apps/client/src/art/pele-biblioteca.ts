import { cuspeSvg } from './enemies';
import type { Pele } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, openMouth, outlined, oval, shine, svgDoc } from './svg';

// Pele da Biblioteca dos Sonhos (2026-11-01): seis criaturas de biblioteca, de noite, cada uma com o
// papel de um inimigo do caderno. Cada desenho usa o quadro (viewBox), o ponto de apoio e mais ou
// menos a área da criatura da Floresta do mesmo papel (`pele-floresta.ts`), para a caixa de colisão
// continuar batendo. O fundo tem a cúpula azul-acinzentada em cima e parede de pergaminho e madeira
// embaixo, com livros deitados de terracota, mostarda, sálvia e couro; por isso as criaturas são de
// cores saturadas e diferentes entre si (jade, escarlate, papel branco com carmim, magenta, laranja e
// roxo), sempre de contorno marinho. O azul da tinta (SOAK) fica só nas camadas do encharcado.
// Nada de tinteiro nem de traça (são do capítulo 1), nem candelabro, bule, xícara ou relógio.

const SOAK = PALETTE.azul;

/** Espessura de contorno para ~0,8 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.8 / k).toFixed(2);

/** Número curto para o SVG. */
const n = (v: number) => +v.toFixed(1);

/** Gotinhas de tinta azul pingando (camada do encharcado). */
function drips(points: ReadonlyArray<readonly [number, number, number]>): string {
  return points.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SOAK}"/>`).join('');
}

/** Camada do encharcado: a forma em azul com a borda de cima ondulada e um brilho. */
function soakLayer(d: string, glint: string, w: number): string {
  return `<path d="${d}" fill="${SOAK}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" opacity="0.92"/>` + shine(glint, w * 0.9, 0.7);
}

/** Pálpebras de bravo ou de ranzinza: a metade de cima do olho tampada pela cor da pele, cortada em diagonal. */
function lids(d: string, fill: string, w: number): string {
  return `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
}

/**
 * Pálpebra sobre o olho (cx, cy, rx, ry): tampa de cima até `cut` (fração do raio acima do centro),
 * cortada em diagonal; `tilt` > 0 baixa o lado da frente (direita), < 0 o de trás.
 */
function lidOf(cx: number, cy: number, rx: number, ry: number, fill: string, w: number, cut = 0.1, tilt = 0): string {
  const y = cy - ry * cut;
  return lids(`M${n(cx - rx - 0.6)} ${n(y - tilt)} Q${n(cx)} ${n(cy - ry * (2.05 - cut))} ${n(cx + rx + 0.6)} ${n(y + tilt)} Z`, fill, w);
}

/** Estrelinha de quatro pontas com contorno (brilho de mágica). */
function estrelinha(x: number, y: number, s: number, fill: string): string {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" fill="${fill}" stroke="${INK}" stroke-width="${n(1.4 / s)}" stroke-linejoin="round"/>`;
}

type Pt = readonly [number, number];

/** Ponto da curva cúbica de Bézier em `t`. */
function cubica(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

// ---------------------------------------------------------------- marca-página (traça)

const TRACA_FRAMES = 3;
const TRACA_VB = '30 60 200 95';
const JADE = '#17b07a';
const JADE_ESCURO = '#0b6a4a';
const JADE_CLARO = '#a6f2d0';
const OURO = '#ffc234';
const OURO_ESCURO = '#b5760b';
const BRILHO_MAGICO = '#ffe14d';
const FITA_LW = lw(0.19);
/** Largura da fita. */
const FAIXA = 24;
/** Ponta da fita (a cabeça): retângulo de cantos redondos com o corte em V no alto, que vira duas orelhas. */
const PONTA = 'M148 147 Q140 147 140 139 L140 92 L164 103 L188 92 L188 139 Q188 147 180 147 Z';

/** Fita de cetim ao longo de `d`: avesso escuro embaixo, face jade em cima e o pesponto claro. */
function faixa(d: string, w: number): string {
  const s = (color: string, width: number, extra = '') =>
    `<path d="${d}"${extra} fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return (
    s(INK, FAIXA + w * 2) +
    s(JADE_ESCURO, FAIXA) +
    s(JADE, FAIXA - 10, ' transform="translate(0 -4.5)"') +
    `<path d="${d}" transform="translate(0 -4.5)" fill="none" stroke="${JADE_CLARO}" stroke-width="1.6" stroke-dasharray="5 6" stroke-linecap="round"/>`
  );
}

/** Borla dourada pendurada no nó em (0, 0) do grupo, girada `rot` graus. */
function borla(x: number, y: number, rot: number, w: number): string {
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(1.3)">` +
    outlined('M-4 2 Q-8 9 -10 18 Q0 21 10 18 Q8 9 4 2 Z', OURO, w * 0.7) +
    line('M-5 11 L-6.5 17.5 M0 10 L0 18.5 M5 11 L6.5 17.5', 1.6, OURO_ESCURO) +
    oval(0, 0, 5.2, 4.6, OURO, w * 0.7) +
    `<path d="M-2.5 -1.5 Q-1 -3 1.5 -2.8" fill="none" stroke="${WHITE}" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>` +
    `</g>`
  );
}

/** A ponta da fita com a cara por cima. */
function ponta(face: string, w: number): string {
  return (
    `<clipPath id="bi-ponta"><path d="${PONTA}"/></clipPath>` +
    `<path d="${PONTA}" fill="${JADE}"/>` +
    `<ellipse cx="166" cy="153" rx="32" ry="13" fill="${JADE_ESCURO}" clip-path="url(#bi-ponta)"/>` +
    `<path d="M183 103 L183 136" fill="none" stroke="${JADE_CLARO}" stroke-width="1.6" stroke-dasharray="5 6" stroke-linecap="round"/>` +
    `<path d="${PONTA}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
    shine('M145.5 104 L145.5 124', 3, 0.75) +
    face
  );
}

/**
 * Marca-página: fita de cetim jade com pesponto claro e borla dourada no rabo, que anda como
 * lagarta-mede-palmo (o meio da fita sobe e desce). A ponta da frente, de corte em V, é a cabeça, e
 * o V vira duas orelhas. Travessa: olhar de lado, pálpebra caída e sorriso de canto com um dentinho.
 * `alert` é o aviso de sumir: a fita gira sobre si mesma, de pé, com a cabeça lá em cima, olhos
 * arregalados, sorrisão e brilhos de mágica em volta.
 */
function marcaPaginaSvg(frame: number, variant = 0, alert = false): string {
  if (alert) return marcaPaginaGiroSvg(variant);
  const w = FITA_LW;
  const t = ((frame % TRACA_FRAMES) / TRACA_FRAMES) * Math.PI * 2;
  // Mede-palmo: quanto mais alto o meio, mais perto o rabo chega da cabeça.
  const h = 15 + 11 * Math.sin(t);
  const tx = 62 + (h - 15) * 0.6;
  const p0: Pt = [tx, 137];
  const p1: Pt = [tx + 16, 137 - 1.33 * h];
  const p2: Pt = [128, 137 - 1.33 * h];
  const p3: Pt = [150, 136];
  const d = `M${n(p0[0])} ${p0[1]} C${n(p1[0])} ${n(p1[1])} ${p2[0]} ${n(p2[1])} ${p3[0]} ${p3[1]}`;
  const brilho = [0.22, 0.32, 0.42, 0.52]
    .map((s, i) => {
      const [x, y] = cubica(p0, p1, p2, p3, s);
      return `${i === 0 ? 'M' : 'L'}${n(x)} ${n(y - 7)}`;
    })
    .join(' ');
  const face =
    eye(155, 117, 6.5, 8, [0.7, 0.1], 0.55, 3) +
    eye(173, 116, 6, 7.5, [0.7, 0.1], 0.55, 3) +
    lidOf(155, 117, 6.5, 8, JADE, 2.4, 0.15, 1.5) +
    lidOf(173, 116, 6, 7.5, JADE, 2.4, 0.15, 1.5) +
    line('M147 104 Q153 101 160 104.5 M167 103.5 Q173 100 180 102', 3.4) +
    blush(149, 130, 5, 0.6) +
    line('M156 131 Q168 138 180 128', 3.8) +
    outlined('M169 134.5 L169.5 139.5 L174.5 138 L173.5 133.5 Z', WHITE, 2);
  const cord = capsule([[tx, 134], [tx - 8, 124], [tx - 15, 124]], 2.4, OURO, 1.5);
  const lean = n(2.5 * Math.sin(t));
  return svgDoc(
    TRACA_VB,
    `<ellipse cx="106" cy="149" rx="62" ry="5" fill="${INK}" opacity="0.14"/>` +
      cord +
      borla(tx - 16, 124, 8 * Math.sin(t + 1), w) +
      faixa(d, w) +
      shine(brilho, 2.6, 0.7) +
      `<g transform="rotate(${lean} 164 147)">${ponta(face, w)}</g>`,
    variant,
  );
}

/** Aviso do marca-página: girando de pé sobre si mesmo, prestes a sumir. */
function marcaPaginaGiroSvg(variant = 0): string {
  const w = FITA_LW;
  const cx = 118;
  const y0 = 147;
  const y1 = 108;
  const voltas = 3;
  // Fita torcida: lentes que se tocam nas pontas, alternando a face e o avesso.
  let twist = '';
  for (let i = 0; i < voltas; i++) {
    const ya = y0 - ((y0 - y1) * i) / voltas;
    const yb = y0 - ((y0 - y1) * (i + 1)) / voltas;
    const xa = cx + (i % 2 === 0 ? 4 : -4);
    const xb = cx + (i % 2 === 0 ? -4 : 4);
    const mid = (ya + yb) / 2;
    const fill = i % 2 === 0 ? JADE : JADE_ESCURO;
    twist += outlined(`M${xa} ${n(ya)} Q${cx + 30} ${n(mid)} ${xb} ${n(yb)} Q${cx - 30} ${n(mid)} ${xa} ${n(ya)} Z`, fill, w);
  }
  const face =
    eye(155, 117, 7.5, 9, [0.35, -0.3], 0.42, 3) +
    eye(173, 116, 7, 8.5, [0.35, -0.3], 0.42, 3) +
    line('M146 103 Q153 98.5 161 102 M167 101 Q174 97 182 100', 3.4) +
    blush(148, 129, 5, 0.6) +
    openMouth('M151 127 Q167 133 183 125 Q181 141 167 141 Q154 140 151 127 Z', [167, 141, 6], 3) +
    outlined('M155 128.6 L179 126.6 L178.4 131 L156.4 132.4 Z', WHITE, 1.8);
  return svgDoc(
    TRACA_VB,
    `<ellipse cx="118" cy="149" rx="34" ry="4.5" fill="${INK}" opacity="0.14"/>` +
      // Rastro do giro, por trás.
      line('M92 124 A26 7 0 0 1 144 124', 2.4, INK) +
      // A borla voa para fora com o giro.
      capsule([[cx - 2, 144], [102, 146], [88, 139]], 2.2, OURO, 1.5) +
      borla(85, 137, 72, w) +
      twist +
      line('M90 134 A28 7 0 0 0 146 134', 2.4, INK) +
      // A cabeça, um pouco menor, no alto do giro.
      `<g transform="translate(118 110) scale(0.85) translate(-164 -147)">${ponta(face, w / 0.85)}</g>` +
      estrelinha(86, 104, 0.95, BRILHO_MAGICO) +
      estrelinha(150, 92, 1.1, BRILHO_MAGICO) +
      estrelinha(154, 124, 0.75, BRILHO_MAGICO) +
      estrelinha(80, 120, 0.6, WHITE),
    variant,
  );
}

function marcaPaginaSoakSvg(variant = 0): string {
  return svgDoc(
    TRACA_VB,
    soakLayer(
      'M50 136 Q66 129 84 133 Q104 127 124 132 Q140 126 152 130 Q166 123 188 128 L188 139 Q188 147 180 147 L62 147 Q50 147 50 136 Z',
      'M62 138 Q76 134 90 136',
      FITA_LW,
    ) + drips([[82, 151, 2.6], [120, 152, 2.2], [166, 151, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- dicionário (saltador)

const SALTADOR_VB = '60 40 84 110';
const ESCARLATE = '#e2333f';
const ESCARLATE_ESCURO = '#8e1427';
const DOURADO = '#f2b632';
const PAGINA = '#fff4d8';
const PAGINA_LINHA = '#d6bd8a';
const DICIO_LW = lw(0.3);
/** Capa da frente do dicionário (a lombada fica à esquerda, as páginas aparecem à direita). */
const CAPA_DICIO = 'M80 58 L117 58 Q122 58 122 63 L122 111 Q122 116 117 116 L80 116 Q74 116 74 110 L74 64 Q74 58 80 58 Z';

/** Corpo do dicionário (capa de trás, miolo de páginas com os dedões do índice e a capa da frente). */
function dicionarioCorpo(w: number, face: string): string {
  let folhas = '';
  for (let y = 66; y <= 108; y += 5) folhas += `M118 ${y} L130 ${y} `;
  return (
    outlined('M84 58 L129 58 Q134 58 134 63 L134 111 Q134 116 129 116 L84 116 Z', ESCARLATE_ESCURO, w) +
    `<rect x="118" y="61" width="13" height="52" fill="${PAGINA}" stroke="${INK}" stroke-width="${w * 0.6}"/>` +
    line(folhas, 1.1, PAGINA_LINHA) +
    // Dedões do índice no corte das páginas.
    `<path d="M131 70 A3 3 0 0 0 131 76 Z M131 82 A3 3 0 0 0 131 88 Z M131 94 A3 3 0 0 0 131 100 Z" fill="${ESCARLATE_ESCURO}" stroke="${INK}" stroke-width="1"/>` +
    `<clipPath id="bi-dicio"><path d="${CAPA_DICIO}"/></clipPath>` +
    `<path d="${CAPA_DICIO}" fill="${ESCARLATE}"/>` +
    `<g clip-path="url(#bi-dicio)">` +
    `<ellipse cx="102" cy="122" rx="34" ry="14" fill="${ESCARLATE_ESCURO}"/>` +
    // Lombada: faixa mais escura com filetes dourados.
    `<rect x="70" y="56" width="12" height="62" fill="${ESCARLATE_ESCURO}"/>` +
    `</g>` +
    line('M75 66 L81 66 M75 70 L81 70 M75 104 L81 104 M75 108 L81 108', 1.6, DOURADO) +
    `<path d="M88 63 L116 63 L116 111 L88 111 Z" fill="none" stroke="${DOURADO}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="${CAPA_DICIO}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
    line('M82 58 L82 116', 1.4, INK) +
    shine('M91 67 L106 67', 2.6, 0.75) +
    blush(93, 93, 4, 0.65) +
    face
  );
}

/**
 * Dicionário: livro gordo de capa escarlate com filete dourado, lombada escura à esquerda e o miolo
 * de páginas creme à direita, com os dedões do índice. Pula com as perninhas e tem cara de bobo
 * pesadão. No ar, as capas abrem como asas e folhas soltas voam. `charge` é o aviso: agachado,
 * entreaberto e tremendo, com folhas escapando, cenho fechado e dentes cerrados.
 */
function dicionarioSvg(air: boolean, variant = 0, charge = false): string {
  const w = DICIO_LW;
  let face: string;
  let legs: string;
  let extra = '';
  let back = '';
  let pose = '';
  if (charge) {
    pose = 'translate(0 4) rotate(-4 103 116)';
    legs =
      capsule([[91, 116], [86, 124], [90, 130]], 4, ESCARLATE_ESCURO, w) +
      capsule([[110, 116], [115, 124], [111, 130]], 4, ESCARLATE_ESCURO, w) +
      oval(91, 131.5, 7, 3.4, INK, 0) +
      oval(113, 131.5, 7, 3.4, INK, 0);
    // Folhas escapando pelo corte, entreaberto.
    back =
      outlined('M120 66 Q126 52 138 47 L141 53 Q131 58 126 68 Z', PAGINA, w * 0.7) +
      outlined('M122 72 Q132 62 143 62 L142 68 Q133 70 127 76 Z', PAGINA, w * 0.7) +
      outlined('M116 62 Q116 48 124 42 L129 46 Q122 53 122 63 Z', PAGINA, w * 0.7);
    face =
      eye(96, 82, 6, 5.2, [0.6, 0.3], 0.62, 2) +
      eye(112, 81, 6.5, 5.6, [0.6, 0.3], 0.62, 2) +
      line('M88 72 L101 78 M106 77 L120 70', 3.6) +
      outlined('M95 95 L116 94 L115.5 104 L95.5 104.5 Z', WHITE, 2) +
      line('M100 94.8 L100 104.4 M105.5 94.6 L105.5 104.3 M111 94.3 L111 104.1 M95.2 99.6 L115.8 99', 1.3);
    extra = line('M64 74 L69 76 M63 84 L68 84 M64 94 L69 92 M138 84 L142 86 M138 94 L143 95', 2.2);
  } else if (air) {
    legs =
      capsule([[91, 116], [89, 128]], 4, ESCARLATE_ESCURO, w) +
      capsule([[110, 116], [113, 127]], 4, ESCARLATE_ESCURO, w) +
      oval(90, 131, 4.6, 5.5, INK, 0) +
      oval(114, 130, 4.6, 5.5, INK, 0);
    // Capas abertas como asas, atrás do corpo.
    back =
      outlined('M78 62 L62 52 L62 98 L78 110 Z', ESCARLATE, w) +
      line('M66.5 60 L66.5 97', 1.4, DOURADO) +
      outlined('M130 62 L143 52 L143 98 L130 110 Z', ESCARLATE, w) +
      line('M139 60 L139 97', 1.4, DOURADO);
    extra =
      `<g transform="rotate(-18 70 104)">${outlined('M64 98 L76 98 L76 112 L64 112 Z', PAGINA, w * 0.6)}${line('M67 102 L73 102 M67 106 L73 106', 1, PAGINA_LINHA)}</g>` +
      `<g transform="rotate(22 136 112)">${outlined('M131 106 L141 106 L141 118 L131 118 Z', PAGINA, w * 0.6)}${line('M133.5 110 L138.5 110 M133.5 114 L138.5 114', 1, PAGINA_LINHA)}</g>`;
    face =
      eye(96, 80, 6.5, 8.5, [0.4, -0.4], 0.5, 2) +
      eye(112, 79, 7, 9, [0.4, -0.4], 0.5, 2) +
      line('M89 67.5 Q95 64 101 67.5 M106 66.5 Q113 62.5 119 66', 2.6) +
      openMouth('M97 93 Q108 90 118 92 Q116 106 107 106 Q99 105 97 93 Z', [107, 105, 6], 2);
  } else {
    legs =
      capsule([[91, 116], [91, 128]], 4, ESCARLATE_ESCURO, w) +
      capsule([[110, 116], [110, 128]], 4, ESCARLATE_ESCURO, w) +
      oval(93, 131, 7, 3.6, INK, 0) +
      oval(112, 131, 7, 3.6, INK, 0);
    face =
      eye(96, 81, 6.5, 8, [0.3, 0.1], 0.5, 2) +
      eye(112, 80, 7, 8.5, [0.1, 0.2], 0.5, 2) +
      line('M90 69 Q96 66 102 69 M106 68 Q113 64 119 68', 2.4) +
      outlined('M96 94 Q107 103 119 92 Q115 101 107 102.5 Q99 102 96 94 Z', PALETTE.vermelhoBoca, 2) +
      outlined('M104 99 Q107 106 111.5 104.5 Q114 102 111.5 98.5 Z', PALETTE.lingua, 1.6);
  }
  return svgDoc(
    SALTADOR_VB,
    (air ? '' : `<ellipse cx="103" cy="135" rx="30" ry="3.5" fill="${INK}" opacity="0.14"/>`) +
      `<g transform="${pose}">${back}${legs}${dicionarioCorpo(w, face)}</g>` +
      extra,
    variant,
  );
}

function dicionarioSoakSvg(variant = 0): string {
  return svgDoc(
    SALTADOR_VB,
    soakLayer('M74 92 Q86 86 98 90 Q112 84 124 89 Q130 86 134 89 L134 111 Q134 116 129 116 L80 116 Q74 116 74 110 Z', 'M80 97 L80 108', DICIO_LW) +
      drips([[88, 123, 2.4], [118, 125, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- pergaminho (grampo)

const GRAMPO_FRAMES = 3;
const GRAMPO_VB = '4 6 92 86';
const PAPEL = '#fffaf0';
const PAPEL_SOMBRA = '#ead3a4';
const PAPEL_LINHA = '#c4a26a';
const CARMIM = '#cc1f45';
const CARMIM_ESCURO = '#7c1230';
const FOLHA = 'M32 26 L68 26 L68 74 L32 74 Z';
const PERGAMINHO_LW = lw(0.24);

/**
 * Rolo deitado em y = `cy`, de `x0` a `x1`: a vareta carmim atravessa e sai dos dois lados com um
 * pegador redondo, e a ponta de trás mostra o miolo em espiral.
 */
function rolo(cy: number, x0: number, x1: number, w: number, id: string): string {
  const r = 6.5;
  const e = r * 0.55;
  const d = `M${x0} ${cy - r} L${x1} ${cy - r} A${e} ${r} 0 0 1 ${x1} ${cy + r} L${x0} ${cy + r} Z`;
  return (
    capsule([[x0 - 6, cy], [x1 + 7, cy]], 3, CARMIM_ESCURO, w * 0.7) +
    oval(x0 - 7, cy, 3.6, 4.2, CARMIM, w * 0.7) +
    oval(x1 + 8, cy, 3.6, 4.2, CARMIM, w * 0.7) +
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${PAPEL}"/>` +
    `<rect x="${x0 - 5}" y="${cy + 2.2}" width="${x1 - x0 + 10}" height="6" fill="${PAPEL_SOMBRA}" clip-path="url(#${id})"/>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
    oval(x0, cy, e, r, PAPEL_SOMBRA, w) +
    `<path d="M${x0} ${cy} a0.9 1.4 0 0 1 1.8 0 a1.8 2.8 0 0 1 -3.6 0 a2.7 4.2 0 0 1 5.4 0" fill="none" stroke="${PAPEL_LINHA}" stroke-width="1.2" stroke-linecap="round"/>` +
    shine(`M${x0 + 6} ${cy - 3.2} L${x1 - 4} ${cy - 3.2}`, 1.6, 0.9)
  );
}

/**
 * Pergaminho: folha branca com um rolo em cima e outro embaixo, varetas carmim de pegador redondo,
 * linhas de escrita e um lacre carmim de fitas penduradas. Corre em perninhas carmim, de bracinhos
 * no embalo, e é ranzinza: pálpebra caída, cenho franzido e boca torta. `frame` troca as pernas.
 */
function pergaminhoSvg(frame: number, variant = 0): string {
  const swing = [-7, 0, 7][frame % GRAMPO_FRAMES]!;
  const w = PERGAMINHO_LW;
  const legs =
    capsule([[43, 80], [40 + swing, 85]], 4, CARMIM_ESCURO, w * 0.7) +
    capsule([[57, 80], [60 - swing, 85]], 4, CARMIM_ESCURO, w * 0.7) +
    oval(43 + swing, 86.5, 6.5, 3.2, INK, 0) +
    oval(63 - swing, 86.5, 6.5, 3.2, INK, 0);
  const arms =
    capsule([[33, 48], [24, 54 + swing * 0.6], [20, 48 + swing]], 3.4, CARMIM_ESCURO, w * 0.7) +
    capsule([[67, 48], [76, 54 - swing * 0.6], [80, 48 - swing]], 3.4, CARMIM_ESCURO, w * 0.7);
  const escrita = 'M37 60 L46 60.5 M49 61 L56 61 M37 65.5 L51 66';
  return svgDoc(
    GRAMPO_VB,
    `<ellipse cx="50" cy="89" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      legs +
      `<clipPath id="bi-folha"><path d="${FOLHA}"/></clipPath>` +
      `<path d="${FOLHA}" fill="${PAPEL}"/>` +
      `<g clip-path="url(#bi-folha)">` +
      `<rect x="28" y="28" width="44" height="4" fill="${PAPEL_SOMBRA}"/>` +
      line(escrita, 1.4, PAPEL_LINHA) +
      `</g>` +
      `<path d="${FOLHA}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      rolo(76, 32, 68, w, 'bi-rolo-baixo') +
      rolo(24, 32, 68, w, 'bi-rolo-cima') +
      // Lacre com as fitas penduradas por cima do rolo de baixo.
      outlined('M58 66 L55 80 L58 78 L60 81 L61 67 Z M62 66 L64 79 L66.5 77 L68.5 79 L65 65 Z', CARMIM, 1.2) +
      oval(61, 64, 5.4, 5, CARMIM, w * 0.75) +
      `<circle cx="61" cy="64" r="2.6" fill="none" stroke="${CARMIM_ESCURO}" stroke-width="1.3"/>` +
      arms +
      // Cara ranzinza.
      eye(44, 43, 5, 5.5, [0.5, 0.3], 0.55, 1.6) +
      eye(58, 42.5, 5, 5.5, [0.5, 0.3], 0.55, 1.6) +
      lidOf(44, 43, 5, 5.5, PAPEL, 1.5, 0.05, -1) +
      lidOf(58, 42.5, 5, 5.5, PAPEL, 1.5, 0.05, 1) +
      line('M37 35.5 L49 38.5 M65 34.5 L53 38', 2.6) +
      blush(38.5, 49.5, 2.8, 0.55) +
      line('M44 53 Q51 49 58 52.5 L60.5 51', 2.4),
    variant,
  );
}

function pergaminhoSoakSvg(variant = 0): string {
  return svgDoc(
    GRAMPO_VB,
    soakLayer('M32 60 Q39 56 46 59 Q53 55 60 59 Q65 56 68 58 L68 69.5 L71.5 70 Q75 76 71.5 82.5 L32 82.5 Q29 76 32 69.5 Z', 'M36 64 L36 70', PERGAMINHO_LW) +
      drips([[40, 87, 2], [60, 88, 1.7]]),
    variant,
  );
}

// ---------------------------------------------------------------- morcego-de-biblioteca (fiandeira)

const FIANDEIRA_VB = '-6 0 112 104';
const MAGENTA = '#dc3f8a';
const MAGENTA_ESCURO = '#8c1f5a';
const BARRIGA_ROSA = '#ffadd0';
const ASA = '#6b2a72';
const ASA_OSSO = '#3f1546';
const ORELHA = '#ffc6dd';
const MORCEGO_LW = lw(0.42);

/**
 * Asa esquerda do morcego, do ombro `s` às pontas dos dedos `t1..t3` e de volta ao corpo em `b`, com
 * a borda de baixo em arcos (a membrana entre os dedos). A direita é o espelho em x = 50.
 */
function asa(s: Pt, t1: Pt, t2: Pt, t3: Pt, b: Pt, w: number, mirror: boolean): string {
  const arco = (a: Pt, c: Pt): string => {
    const mx = (a[0] + c[0]) / 2;
    const my = (a[1] + c[1]) / 2;
    // A membrana encolhe em direção ao ombro.
    return `Q${n(mx + (s[0] - mx) * 0.3)} ${n(my + (s[1] - my) * 0.3)} ${c[0]} ${c[1]}`;
  };
  const topo = `Q${n((s[0] + t1[0]) / 2)} ${n(Math.min(s[1], t1[1]) - 6)} ${t1[0]} ${t1[1]}`;
  const d = `M${s[0]} ${s[1]} ${topo} ${arco(t1, t2)} ${arco(t2, t3)} ${arco(t3, b)} Z`;
  const ossos = `M${s[0]} ${s[1]} L${t2[0]} ${t2[1]} M${s[0]} ${s[1]} L${t3[0]} ${t3[1]}`;
  const body = outlined(d, ASA, w) + line(ossos, 1.4, ASA_OSSO);
  return mirror ? `<g transform="translate(100 0) scale(-1 1)">${body}</g>` : body;
}

/** Corpo do morcego (orelhas, bola de pelo, barriga e pés) com a cara por cima. */
function morcegoCorpo(w: number, face: string, earTilt = 0): string {
  return (
    `<g transform="rotate(${-earTilt} 41 38)">${outlined('M36 44 L32 22 L48 36 Z', MAGENTA, w)}${outlined('M37.5 39 L35 27.5 L44 36 Z', ORELHA, 0)}</g>` +
    `<g transform="rotate(${earTilt} 59 38)">${outlined('M64 44 L68 22 L52 36 Z', MAGENTA, w)}${outlined('M62.5 39 L65 27.5 L56 36 Z', ORELHA, 0)}</g>` +
    oval(44, 70, 3.4, 2.6, MAGENTA_ESCURO, w * 0.8) +
    oval(56, 70, 3.4, 2.6, MAGENTA_ESCURO, w * 0.8) +
    `<clipPath id="bi-morcego"><circle cx="50" cy="53" r="16.5"/></clipPath>` +
    `<circle cx="50" cy="53" r="16.5" fill="${MAGENTA}"/>` +
    `<ellipse cx="51" cy="66" rx="11" ry="7" fill="${BARRIGA_ROSA}" clip-path="url(#bi-morcego)"/>` +
    `<circle cx="50" cy="53" r="16.5" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
    // Topete onde o fio se prende.
    line('M49 37 Q47 32 50.5 31 Q53.5 31.5 52 34.5', 1.6) +
    shine('M38 48 Q40 42 45 40', 2, 0.75) +
    face
  );
}

/**
 * Morcego-de-biblioteca: bola de pelo magenta com barriga rosa, orelhonas pontudas e asas ameixa de
 * dedos marcados, pendurado por um fio preso no topete (o fio chega ao centro do corpo, por trás). De
 * pé, não de cabeça para baixo, porque as mesmas poses servem quando ele anda sem o fio. Matreiro:
 * olhar de lado, pálpebra meio caída e sorriso com dois caninos. `frame` bate as asas (em cima e
 * embaixo). Centro do corpo em (50, 54).
 */
function morcegoSvg(frame: number, variant = 0): string {
  const w = MORCEGO_LW;
  const up = frame % 2 === 0;
  const s: Pt = [36, 50];
  const b: Pt = [37, 62];
  const [t1, t2, t3]: [Pt, Pt, Pt] = up
    ? [[15, 28], [17, 46], [26, 58]]
    : [[13, 62], [21, 75], [31, 73]];
  const face =
    eye(44, 51, 4.6, 5.2, [0.6, 0.15], 0.58, 1.4) +
    eye(56.5, 50.5, 4.6, 5.2, [0.6, 0.15], 0.58, 1.4) +
    lidOf(44, 51, 4.6, 5.2, MAGENTA, 1.2, 0.2, 0.8) +
    lidOf(56.5, 50.5, 4.6, 5.2, MAGENTA, 1.2, 0.2, 0.8) +
    blush(39.5, 57.5, 2.6, 0.7) +
    line('M45 59 Q51 63.5 58 58', 1.6) +
    outlined('M47.5 60.6 L48.6 64 L50.2 61.4 Z M53.5 61.3 L54.8 64.2 L56.2 60.7 Z', WHITE, 0.9);
  return svgDoc(
    FIANDEIRA_VB,
    `<g transform="translate(0 ${up ? -1.5 : 1.5})">` +
      asa(s, t1, t2, t3, b, w, false) +
      asa(s, t1, t2, t3, b, w, true) +
      morcegoCorpo(w, face) +
      `</g>`,
    variant,
  );
}

/** Morcego mergulhando: asas varridas para trás, inclinado para a frente, decidido. Mesmo quadro. */
export function morcegoMergulhoSvg(variant = 0): string {
  const w = MORCEGO_LW;
  const s: Pt = [38, 46];
  const b: Pt = [40, 56];
  const face =
    eye(44, 52, 4.6, 4.4, [0.7, 0.5], 0.62, 1.4) +
    eye(56.5, 51.5, 4.6, 4.4, [0.7, 0.5], 0.62, 1.4) +
    lidOf(44, 52, 4.6, 4.4, MAGENTA, 1.2, 0.35, 1.6) +
    lidOf(56.5, 51.5, 4.6, 4.4, MAGENTA, 1.2, 0.35, 1.6) +
    line('M38.5 46 L48 49 M51.5 48.5 L61.5 45', 2) +
    outlined('M45 58 L58 57 L57.5 62.5 L45.5 63 Z', WHITE, 1.1) +
    line('M49.5 57.8 L49.5 62.8 M53.8 57.5 L53.8 62.6 M45.2 60.5 L57.8 59.8', 0.8);
  return svgDoc(
    FIANDEIRA_VB,
    // Riscos de velocidade, de onde ele veio.
    line('M14 6 L24 20 M26 0 L33 13 M6 20 L16 32', 2, INK) +
      `<g transform="rotate(14 50 54)">` +
      asa(s, [18, 14], [22, 28], [30, 42], b, w, false) +
      asa(s, [18, 14], [22, 28], [30, 42], b, w, true) +
      morcegoCorpo(w, face) +
      `</g>`,
    variant,
  );
}

function morcegoSoakSvg(variant = 0): string {
  return svgDoc(
    FIANDEIRA_VB,
    soakLayer('M33.6 56 Q41 51 50 55 Q59 51 66.4 56 Q64 69.5 50 69.5 Q36 69.5 33.6 56 Z', 'M37 60 Q38 64 41 66', MORCEGO_LW) +
      drips([[44, 75, 2], [56, 77, 1.6]]),
    variant,
  );
}

// ---------------------------------------------------------------- coruja-de-óculos (tinteiro)

const TINTEIRO_VB = '6 10 92 88';
const LARANJA = '#f07a22';
const LARANJA_ESCURO = '#a3420e';
const PEITO = '#ffd79a';
const DISCO = '#fff1d6';
const BICO = '#ffcf33';
const ARO = '#e2a21c';
const LENTE = '#e8f4f6';
const LUZ = '#fff4a8';
const RAIO = '#ffd23f';
const CORUJA = 'M52 26 Q84 28 84 62 Q84 92 52 92 Q20 92 20 62 Q20 28 52 26 Z';
const CORUJA_LW = lw(0.25);

/** Um aro dos óculos: contorno marinho, aro dourado e a lente. */
function aro(cx: number, cy: number, r: number, lente: string): string {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${lente}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="5.4"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ARO}" stroke-width="2.4"/>`
  );
}

/**
 * Coruja-de-óculos: bibliotecária laranja de penachos, disco creme no rosto, barriga clara com
 * peninhas em V, asas dobradas e óculos redondos de aro dourado. Anda bamboleando. Severa: uma
 * sobrancelha erguida por cima dos óculos e o bico fechado. `charge` é o aviso do raio de luz: as
 * lentes acendem em branco-amarelo com raiozinhos para a frente, olhar fixo de pupilas miúdas,
 * cenho baixo, e ela se inclina um pouco para a frente.
 */
function corujaSvg(frame: number, variant = 0, charge = false): string {
  const step = frame % 2 === 0 ? 0 : 1;
  const w = CORUJA_LW;
  const tilt = charge ? 6 : step === 0 ? -2.5 : 2.5;
  const feetL = step === 0 ? 0 : -3;
  const feetR = step === 0 ? -3 : 0;
  const pe = (x: number, lift: number) =>
    `<path d="M${x - 6} ${93 + lift} L${x - 5} ${97 + lift} M${x} ${93 + lift} L${x} ${97.5 + lift} M${x + 6} ${93 + lift} L${x + 5} ${97 + lift}" fill="none" stroke="${INK}" stroke-width="5.6" stroke-linecap="round"/>` +
    `<path d="M${x - 6} ${93 + lift} L${x - 5} ${97 + lift} M${x} ${93 + lift} L${x} ${97.5 + lift} M${x + 6} ${93 + lift} L${x + 5} ${97 + lift}" fill="none" stroke="${BICO}" stroke-width="2.6" stroke-linecap="round"/>`;
  let penas = '';
  for (const [x, y] of [[46, 72], [56, 72], [66, 72], [51, 80], [61, 80]] as const) penas += `M${x - 3} ${y - 2} L${x} ${y + 1} L${x + 3} ${y - 2} `;
  const lente = charge ? LUZ : LENTE;
  const olhos = charge
    ? `<circle cx="47" cy="49" r="2.2" fill="${INK}"/><circle cx="67" cy="49" r="2.2" fill="${INK}"/>` +
      line('M36 34 L53 41 M61 41 L78 33', 3.6)
    : eye(47, 49, 5.5, 6.2, [0.5, 0.1], 0.55, 1.8) +
      eye(67, 49, 5.5, 6.2, [0.5, 0.1], 0.55, 1.8) +
      lidOf(47, 49, 5.5, 6.2, LENTE, 1.4, 0.2, -0.6) +
      line('M37 35 L52 37 M61 35 Q68 28 77 33', 2.8);
  const brilho = charge
    ? `<circle cx="47" cy="48" r="16" fill="${LUZ}" opacity="0.55"/><circle cx="67" cy="48" r="16" fill="${LUZ}" opacity="0.55"/>`
    : '';
  const raios = charge
    ? capsule([[81, 42], [90, 37]], 2.4, RAIO, 1.4) +
      capsule([[82, 49], [93, 49]], 2.4, RAIO, 1.4) +
      capsule([[81, 56], [90, 61]], 2.4, RAIO, 1.4) +
      capsule([[67, 32], [69, 24]], 2.4, RAIO, 1.4) +
      capsule([[47, 32], [45, 24]], 2.4, RAIO, 1.4)
    : '';
  const lenteBrilho = charge
    ? shine('M41 44 Q43 41 46 40.5 M61 44 Q63 41 66 40.5', 2.4, 1)
    : shine('M41.5 45 Q43 42.5 45.5 42 M61.5 45 Q63 42.5 65.5 42', 1.6, 0.9);
  return svgDoc(
    TINTEIRO_VB,
    `<ellipse cx="52" cy="95" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      pe(43, feetL) +
      pe(62, feetR) +
      `<g transform="rotate(${tilt} 52 94)">` +
      // Penachos.
      outlined('M27 38 L22 15 L42 29 Z', LARANJA_ESCURO, w) +
      outlined('M77 38 L84 15 L63 29 Z', LARANJA_ESCURO, w) +
      `<clipPath id="bi-coruja"><path d="${CORUJA}"/></clipPath>` +
      `<path d="${CORUJA}" fill="${LARANJA}"/>` +
      `<g clip-path="url(#bi-coruja)">` +
      `<ellipse cx="57" cy="80" rx="22" ry="17" fill="${PEITO}"/>` +
      `<ellipse cx="44" cy="100" rx="40" ry="9" fill="${LARANJA_ESCURO}" opacity="0.5"/>` +
      `</g>` +
      line(penas, 1.6, LARANJA_ESCURO) +
      `<path d="${CORUJA}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M27 50 Q29 38 38 32', 2.8, 0.8) +
      // Asas dobradas.
      outlined(`M23 54 Q15 70 25 ${86 + (step ? -2 : 0)} Q32 74 30 56 Z`, LARANJA_ESCURO, w) +
      outlined(`M82 54 Q90 70 80 ${86 + (step ? 0 : -2)} Q73 74 75 56 Z`, LARANJA_ESCURO, w) +
      // Disco do rosto e óculos.
      `<path d="M57 36 Q48 28 39 34 Q29 42 33 54 Q37 64 50 63 L57 61 L64 63 Q77 64 81 54 Q85 42 75 34 Q66 28 57 36 Z" fill="${DISCO}" stroke="${INK}" stroke-width="${w * 0.7}" stroke-linejoin="round"/>` +
      brilho +
      line('M36 47 L25 43', 4.8, INK) +
      line('M36 47 L25 43', 2, ARO) +
      aro(47, 48, 9.5, lente) +
      aro(67, 48, 9.5, lente) +
      line('M56 47 Q57 45 58 47', 4.8, INK) +
      line('M56 47 Q57 45 58 47', 2, ARO) +
      olhos +
      lenteBrilho +
      raios +
      outlined(charge ? 'M53 58 L62 58 L57.5 67 Z M54.5 63 L60.5 63' : 'M53 58 L62 58 L57.5 66 Z', BICO, 1.8) +
      blush(38, 61, 3.4, 0.6) +
      `</g>`,
    variant,
  );
}

function corujaSoakSvg(variant = 0): string {
  return svgDoc(
    TINTEIRO_VB,
    soakLayer('M21 70 Q32 64 44 68 Q56 62 68 67 Q78 63 83.5 67 Q82 92 52 92 Q22 92 21 70 Z', 'M26 74 Q27 81 31 85', CORUJA_LW) +
      drips([[40, 97, 1.8], [64, 97, 1.5]]),
    variant,
  );
}

// ---------------------------------------------------------------- enciclopédia (borracha)

const BORRACHA_VB = '2 14 106 80';
const ROXO = '#7a3cc8';
const ROXO_ESCURO = '#44207c';
const FORRO = '#c9a8f0';
const METAL = '#f1b52b';
const METAL_ESCURO = '#a2700c';
const CAPA_ENC = 'M40 20 L90 20 Q97 20 97 27 L97 81 Q97 88 90 88 L40 88 Q34 88 34 82 L34 26 Q34 20 40 20 Z';
const ENC_LW = lw(0.23);

/** Miolo de páginas macias (o lado vulnerável), à esquerda: cortes ondulados creme. */
function paginasMacias(x0: number, x1: number, w: number): string {
  let folhas = '';
  for (let y = 29; y <= 82; y += 4.4) {
    const yy = n(y);
    folhas += `M${x0 + 1.5} ${yy} Q${n((x0 + x1) / 2)} ${n(y + 1.6)} ${x1} ${yy} `;
  }
  return (
    outlined(`M${x0 + 3} 24 L${x1} 24 L${x1} 85 L${x0 + 3} 85 Q${x0 - 1} 72 ${x0} 54 Q${x0 - 1} 36 ${x0 + 3} 24 Z`, PAGINA, w * 0.7) +
    line(folhas, 1.2, PAGINA_LINHA)
  );
}

/**
 * Enciclopédia: volume alto de capa dura roxa andando em pé. A frente (à direita) é a armadura: o
 * filete de metal dourado na borda, as cantoneiras com rebites e o fecho com fechadura, que barram a
 * tinta. Atrás (à esquerda) aparece o miolo de páginas macias, de corte ondulado: o lado que a tinta
 * pega. Zangada: pálpebras em V e dentes cerrados. Olha para a direita.
 */
function enciclopediaSvg(variant = 0): string {
  const w = ENC_LW;
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="55" cy="90" rx="44" ry="3" fill="${INK}" opacity="0.14"/>` +
      oval(42, 88, 8, 3.6, INK, 0) +
      oval(84, 88, 8, 3.6, INK, 0) +
      // Capa de trás e o miolo macio.
      outlined('M24 22 L44 22 L44 88 L24 88 Q18 88 18 82 L18 28 Q18 22 24 22 Z', ROXO_ESCURO, w) +
      paginasMacias(20, 38, w) +
      `<clipPath id="bi-enc"><path d="${CAPA_ENC}"/></clipPath>` +
      `<path d="${CAPA_ENC}" fill="${ROXO}"/>` +
      `<ellipse cx="62" cy="96" rx="40" ry="14" fill="${ROXO_ESCURO}" clip-path="url(#bi-enc)"/>` +
      `<path d="${CAPA_ENC}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      // Filetes dourados da capa.
      line('M42 28 L80 28 M42 80 L80 80', 1.6, METAL) +
      shine('M39 36 L39 60', 2.8, 0.75) +
      // Armadura da frente: borda de metal, cantoneiras e fecho.
      outlined('M88 22 L95 22 Q99 22 99 26 L99 82 Q99 86 95 86 L88 86 Z', METAL, w * 0.75) +
      outlined('M80 18 L94 18 Q101 18 101 25 L101 39 Z', METAL, w * 0.75) +
      outlined('M80 90 L94 90 Q101 90 101 83 L101 69 Z', METAL, w * 0.75) +
      `<circle cx="94" cy="25" r="1.6" fill="${METAL_ESCURO}"/><circle cx="94" cy="83" r="1.6" fill="${METAL_ESCURO}"/>` +
      outlined('M78 50 L100 50 L100 60 L78 60 Z', METAL, w * 0.75) +
      oval(100, 55, 6.5, 7, METAL, w * 0.75) +
      `<circle cx="100" cy="53.6" r="1.6" fill="${INK}"/>` +
      line('M100 54 L100 58', 1.4) +
      `<circle cx="82" cy="55" r="1.4" fill="${METAL_ESCURO}"/>` +
      // Cara zangada.
      eye(56, 44, 5.5, 6, [0.5, 0.2], 0.58, 1.8) +
      eye(71, 43, 5, 6, [0.5, 0.2], 0.58, 1.8) +
      lids('M50 41.5 L62 44 L62 38 L50 37 Z M66 43 L76 40 L76 36 L66 37 Z', ROXO, 1.5) +
      line('M49.5 41 L62 44.4 M66 43.4 L77 39.6', 3) +
      outlined('M53 60.5 L73 59.5 L72.5 67 L54 68 Z', WHITE, 1.8) +
      line('M58 60.3 L58 67.8 M63 60 L63 67.5 M68 59.8 L68 67.3 M53.5 64.2 L72.8 63.3', 1.2) +
      blush(49, 55, 3.4, 0.6),
    variant,
  );
}

/** Letra voando, desenhada a traço (sem fonte): marinho por cima de um halo branco. */
function letra(d: string, x: number, y: number, rot: number): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${line(d, 4.6, WHITE)}${line(d, 2.2, INK)}</g>`;
}

/**
 * Enciclopédia aberta: a capa blindada escancarada para a frente como uma porta, mostrando a página
 * (agora a tinta pega também pela frente), com as letras começando a voar para fora e a cara gritando
 * no papel. Mesmo quadro e apoio da pose normal.
 */
export function enciclopediaAbertaSvg(variant = 0): string {
  const w = ENC_LW;
  let texto = '';
  for (let y = 31; y <= 79; y += 6) texto += `M30 ${y} L${y % 12 === 7 ? 50 : 44} ${y} `;
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="55" cy="90" rx="44" ry="3" fill="${INK}" opacity="0.14"/>` +
      oval(42, 88, 8, 3.6, INK, 0) +
      oval(78, 88, 8, 3.6, INK, 0) +
      // Capa de trás, o maço de páginas e a folha aberta.
      outlined('M24 20 L84 20 L84 88 L24 88 Q18 88 18 82 L18 26 Q18 20 24 20 Z', ROXO_ESCURO, w) +
      outlined('M24 23 L86 23 L86 86 L24 86 Z', PAGINA, w * 0.7) +
      line('M26 84 L86 84 M26 81.5 L86 81.5', 1.1, PAGINA_LINHA) +
      line(texto, 1.6, PAGINA_LINHA) +
      // A capa escancarada, vista de lado: o forro claro e as peças de metal na borda de fora.
      outlined('M86 22 L105 14 L105 92 L86 87 Z', FORRO, w) +
      outlined('M99 16.5 L105 14 L105 30 Z', METAL, w * 0.6) +
      outlined('M99 90.5 L105 92 L105 76 Z', METAL, w * 0.6) +
      outlined('M101 49 L105 48.5 L105 59 L101 58.5 Z', METAL, w * 0.6) +
      line('M89 26 L89 83', 1.4, ROXO) +
      // Cara gritando na página.
      eye(52, 42, 6.5, 7.5, [0.4, -0.1], 0.42, 1.8) +
      eye(70, 41, 6, 7.5, [0.4, -0.1], 0.42, 1.8) +
      line('M44 33 L58 37 M64 36 L77 31', 3) +
      openMouth('M50 54 Q61 51 74 53 Q74 72 62 73 Q51 72 50 54 Z', [62, 72, 7], 1.8) +
      outlined('M53 54.2 L71 53.4 L70.6 57.6 L53.4 58.2 Z', WHITE, 1.4) +
      blush(45, 55, 3.4, 0.6) +
      // Letras escapando.
      letra('M-4 5 L0 -6 L4 5 M-2.4 1 L2.4 1', 79, 70, 18) +
      letra('M-3 -6 L-3 6 M-3 -6 Q4 -6 4 -2.5 Q4 0 -3 0 Q5 0 5 3 Q5 6 -3 6', 94, 72, -14) +
      letra('M-4 -5 L4 -5 L-4 5 L4 5', 80, 27, -20) +
      letra('M4 -4 Q0 -7 -3.5 -4 Q-6 0 -3.5 4 Q0 7 4 4', 95, 38, 12),
    variant,
  );
}

function enciclopediaSoakSvg(variant = 0): string {
  return svgDoc(
    BORRACHA_VB,
    soakLayer('M18 66 Q30 60 44 64 Q58 58 72 64 Q86 58 99 64 L99 82 Q99 88 92 88 L24 88 Q18 88 18 82 Z', 'M23 70 L23 81', ENC_LW) +
      drips([[34, 93, 1.8], [72, 93, 1.5]]),
    variant,
  );
}

export const PELE_BIBLIOTECA: Pele = {
  id: 'biblioteca',
  traca: marcaPaginaSvg,
  tracaTinta: marcaPaginaSoakSvg,
  saltador: dicionarioSvg,
  saltadorTinta: dicionarioSoakSvg,
  grampo: pergaminhoSvg,
  grampoTinta: pergaminhoSoakSvg,
  fiandeira: morcegoSvg,
  fiandeiraTinta: morcegoSoakSvg,
  tinteiro: corujaSvg,
  tinteiroTinta: corujaSoakSvg,
  borracha: enciclopediaSvg,
  borrachaTinta: enciclopediaSoakSvg,
  cuspe: cuspeSvg,
};
