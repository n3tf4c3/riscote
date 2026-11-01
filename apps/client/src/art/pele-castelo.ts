import { cuspeSvg } from './enemies';
import type { Pele } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, openMouth, outlined, oval, shine, svgDoc } from './svg';

// Pele do Castelo das Nuvens (2026-11-01): o grande final. Seis criaturas de papel dobrado (origami)
// do castelo de rolos de papel acima das nuvens, cada uma com o papel de um inimigo do caderno. Cada
// desenho usa o quadro (viewBox), o ponto de apoio e mais ou menos a área da criatura do Jardim do
// mesmo papel (`pele-jardim.ts`), para a caixa de colisão continuar batendo. O céu do amanhecer vai do
// azul claro (só no alto) ao lilás, ao rosa, ao pêssego e ao dourado; as nuvens jogáveis são brancas
// com contorno marinho e as do fundo, lilases. Por isso nenhuma criatura é branca nem azul-clara:
// são papéis de cores saturadas e diferentes entre si (laranja, verde-água, vermelho, ouro, verde e
// rosa-escuro), com as dobras em duas tintas chapadas e sempre de contorno marinho. Nada de magenta
// nem violeta saturado (são do capítulo 1). O azul da tinta (SOAK) fica só nas camadas do encharcado.
// Nada de torre cônica azul, torre de relógio nem tempestade com raios.

const SOAK = PALETTE.azul;

/** Espessura de contorno para ~0,8 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.8 / k).toFixed(2);

/** Número curto para o SVG. */
const n = (v: number) => +v.toFixed(1);

type Pt = readonly [number, number];

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

/** Forma chapada com uma segunda tinta (sombra) recortada dentro dela, o contorno por cima. */
function shaded(d: string, fill: string, shadow: string, w: number, id: string): string {
  return (
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${fill}"/>` +
    `<g clip-path="url(#${id})">${shadow}</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`
  );
}

/** Olho feliz fechado (arco para cima). */
function happyEye(cx: number, cy: number, r: number, w: number): string {
  return line(`M${n(cx - r)} ${n(cy + r * 0.35)} Q${cx} ${n(cy - r * 0.9)} ${n(cx + r)} ${n(cy + r * 0.35)}`, w);
}

/** Polígono reto (uma face da dobra). */
function poly(pts: ReadonlyArray<Pt>): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`).join(' ') + ' Z';
}

/** Faceta chapada sem contorno (a segunda tinta de uma dobra). */
function facet(pts: ReadonlyArray<Pt>, fill: string): string {
  return `<path d="${poly(pts)}" fill="${fill}"/>`;
}

/** Polígono com os lados estufados para fora em `p` unidades (papel cheio de ar). */
function bowed(pts: ReadonlyArray<Pt>, p: number): string {
  const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
  const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
  let d = `M${n(pts[0]![0])} ${n(pts[0]![1])}`;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const len = Math.hypot(mx - cx, my - cy) || 1;
    d += ` Q${n(mx + ((mx - cx) / len) * p * 2)} ${n(my + ((my - cy) / len) * p * 2)} ${n(b[0])} ${n(b[1])}`;
  }
  return d + ' Z';
}

/** Pontas de uma estrela de cinco pontas (de pé), alternando ponta e vértice de dentro. */
function starPts(cx: number, cy: number, R: number, r: number, rot = 0): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 === 0 ? R : r;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return pts;
}

/**
 * Estrela de origami: cada ponta dobrada ao meio, a metade da direita na segunda tinta, com os vincos
 * do centro às pontas. `rot` gira a estrela.
 */
function origamiStar(cx: number, cy: number, R: number, fill: string, dark: string, w: number, rot = 0): string {
  const pts = starPts(cx, cy, R, R * 0.46, rot);
  let faces = '';
  let vincos = '';
  for (let i = 0; i < 10; i += 2) {
    faces += facet([[cx, cy], pts[i]!, pts[i + 1]!], dark);
    vincos += `M${n(cx)} ${n(cy)} L${n(pts[i]![0])} ${n(pts[i]![1])} `;
  }
  return (
    `<path d="${poly(pts)}" fill="${fill}"/>` +
    faces +
    line(vincos, Math.max(0.8, w * 0.45), dark) +
    `<path d="${poly(pts)}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`
  );
}

// ---------------------------------------------------------------- raposa de origami (traça)

const TRACA_FRAMES = 3;
const TRACA_VB = '30 60 200 95';
const RAPOSA = '#f0742a';
const RAPOSA_ESCURA = '#a8401a';
const RAPOSA_CLARA = '#ffa766';
const OURO = '#ffc93c';
const OURO_ESCURO = '#b47a0c';
const RAPOSA_LW = lw(0.19);
const CAUDA = 'M104 106 L58 74 L50 100 L70 120 L100 128 Z';
const CORPO_RAPOSA = 'M98 102 L150 96 L158 122 L150 138 L102 138 L92 120 Z';
const CABECA_RAPOSA = 'M144 100 L148 70 L162 86 L178 72 L182 98 L204 116 L180 130 L154 126 Z';

/**
 * Raposa de origami: raposa de papel laranja dobrado, de cabeça triangular com duas orelhas pontudas,
 * corpo em trapézio e uma cauda grande de ponta dourada, cada dobra em duas tintas chapadas. Trota em
 * quatro perninhas finas. Espertinha: olhar de lado, pálpebra meio caída e sorriso de canto com um
 * dentinho. `alert` é o aviso do rastro: o focinho desce farejando a trilha, os olhos se apertam e a
 * cauda se levanta.
 */
function raposaSvg(frame: number, variant = 0, alert = false): string {
  const w = RAPOSA_LW;
  const t = ((frame % TRACA_FRAMES) / TRACA_FRAMES) * Math.PI * 2;
  const bob = alert ? 1.5 : n(1.8 * Math.sin(t));
  const swing = alert ? 0 : n(7 * Math.cos(t));
  let pernas = '';
  [104, 118, 140, 153].forEach((x, i) => {
    const d = i % 2 === 0 ? swing : -swing;
    pernas += capsule([[x, 132], [x - d, 146]], 4.4, RAPOSA_ESCURA, 2.4) + oval(n(x - d + 1.5), 147.5, 5, 2.4, INK, 0);
  });
  const cauda =
    `<g transform="rotate(${alert ? 16 : n(swing * 0.4)} 100 118)">` +
    shaded(
      CAUDA,
      RAPOSA,
      facet([[58, 74], [40, 100], [66, 126], [100, 128]], RAPOSA_ESCURA) + facet([[58, 74], [44, 98], [52, 100], [68, 88]], OURO) +
        facet([[58, 74], [60, 70], [74, 84], [68, 88]], OURO_ESCURO),
      w,
      'ca-cauda',
    ) +
    shine('M72 88 L96 105', 3, 0.7) +
    `</g>`;
  const corpo =
    shaded(
      CORPO_RAPOSA,
      RAPOSA,
      facet([[88, 122], [160, 124], [154, 142], [96, 142]], RAPOSA_ESCURA) + facet([[138, 98], [160, 120], [152, 140], [134, 140]], RAPOSA_CLARA),
      w,
      'ca-corpo-rp',
    ) +
    line('M124 99 L128 123', 2, RAPOSA_ESCURA) +
    shine('M104 106 L130 103', 3, 0.75);
  const face = alert
    ? // Farejando: olhos apertados, focinho franzido e linhas de cheiro.
      eye(164, 103, 5.4, 6, [0.6, 0.5], 0.6, 2.6) +
      eye(178, 105, 5, 5.6, [0.6, 0.5], 0.6, 2.6) +
      lidOf(164, 103, 5.4, 6, RAPOSA, 2.2, 0.45, 1.6) +
      lidOf(178, 105, 5, 5.6, RAPOSA, 2.2, 0.45, 1.6) +
      line('M156 95 L169 99 M173 98 L185 100', 3.2) +
      blush(160, 116, 4.6, 0.6) +
      line('M184 122 Q190 125 196 121', 2.8) +
      line('M191 108 L196 110 M193 113 L198 114', 2, RAPOSA_ESCURA)
    : eye(164, 103, 5.6, 6.6, [0.75, 0.1], 0.55, 2.6) +
      eye(178.5, 105, 5.2, 6.2, [0.75, 0.1], 0.55, 2.6) +
      lidOf(164, 103, 5.6, 6.6, RAPOSA, 2.2, 0.2, 1.4) +
      lidOf(178.5, 105, 5.2, 6.2, RAPOSA, 2.2, 0.2, 1.4) +
      line('M156 93 Q162 90 169 93.5 M173 94 Q179 92 185 95', 3) +
      blush(160, 116, 4.6, 0.6) +
      line('M178 120 Q189 125 199 118', 3) +
      outlined('M190 122.6 L190.6 127 L194.6 125.6 L194 121.4 Z', WHITE, 1.8);
  const cabeca =
    `<g transform="rotate(${alert ? 22 : 0} 150 112)">` +
    shaded(
      CABECA_RAPOSA,
      RAPOSA,
      facet([[154, 126], [180, 130], [206, 116], [184, 113]], RAPOSA_ESCURA) +
        facet([[162, 86], [178, 72], [184, 98], [204, 116], [184, 113]], RAPOSA_CLARA) +
        facet([[150, 78], [151, 92], [158, 87]], RAPOSA_ESCURA) +
        facet([[176, 80], [168, 88], [179, 92]], RAPOSA_ESCURA),
      w,
      'ca-cabeca-rp',
    ) +
    line('M162 86 L184 113', 1.8, RAPOSA_ESCURA) +
    shine('M147 98 L149 80', 2.8, 0.75) +
    oval(203, 116, 3.6, 3, INK, 0) +
    face +
    (alert ? line('M210 124 L216 127 M208 131 L213 136 M212 118 L218 118', 2.4) : '') +
    `</g>`;
  return svgDoc(
    TRACA_VB,
    `<ellipse cx="124" cy="149" rx="56" ry="5" fill="${INK}" opacity="0.14"/>` +
      pernas +
      `<g transform="translate(0 ${bob})">` +
      cauda +
      corpo +
      cabeca +
      `</g>`,
    variant,
  );
}

function raposaSoakSvg(variant = 0): string {
  return svgDoc(
    TRACA_VB,
    soakLayer(
      'M60 116 Q74 110 88 115 Q104 108 120 114 Q136 108 150 114 Q166 108 180 115 Q192 112 200 118 L180 130 L156 127 L150 138 L102 138 L100 128 L70 120 Z',
      'M72 118 Q82 115 92 117',
      RAPOSA_LW,
    ) + drips([[96, 146, 2.6], [128, 146, 2.2], [176, 136, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- balãozinho de origami (saltador)

const SALTADOR_VB = '60 40 84 110';
const BALAO = '#16a596';
const BALAO_ESCURO = '#0b5d58';
const BALAO_CLARO = '#6ed6c6';
const BALAO_LW = lw(0.3);
/** Contorno do balão de papel (um cubo em três quartos): de frente para a direita. */
const BALAO_PTS: Pt[] = [[74, 66], [118, 60], [136, 70], [134, 118], [92, 120], [78, 112]];

/**
 * Balãozinho de origami: o clássico balão-bomba de papel dobrado, um cubinho verde-água de três
 * faces (o alto claro, a lateral escura e a frente com a cara), os vincos da dobra nos cantos e o
 * furinho de soprar em cima. Pula em dois pezinhos de papel. Bobo contente: olhão para cima e sorrisão.
 * `charge` é o aviso do estouro: estufa enorme, as faces arredondam, os cantos rasgam e a cara faz
 * força (olhos apertados, dentes cerrados, suor). No ar, os pés penduram e a cara é de "uau".
 */
function balaoSvg(air: boolean, variant = 0, charge = false): string {
  const w = BALAO_LW;
  const p = charge ? 5 : 1.2;
  const sil = bowed(BALAO_PTS, p);
  const corpo =
    shaded(
      sil,
      BALAO,
      // Lateral escura (à esquerda) e alto claro, estendidos para fora do contorno.
      facet([[56, 58], [74, 66], [90, 74], [92, 120], [86, 136], [56, 126]], BALAO_ESCURO) +
        facet([[56, 46], [142, 44], [152, 66], [136, 70], [90, 74], [74, 66]], BALAO_CLARO) +
        `<ellipse cx="118" cy="126" rx="26" ry="8" fill="${BALAO_ESCURO}" opacity="0.55"/>`,
      w,
      'ca-balao',
    ) +
    line('M90 74 L136 70 M90 74 L92 120', 1.6) +
    // Vincos do balão nos cantos da frente e no alto.
    line('M94 78 L102 86 M132 74 L125 81 M95 116 L102 109 M131 114 L124 107', 1.5, BALAO_ESCURO) +
    line('M80 67 L96 66 M112 62 L104 66', 1.3, BALAO) +
    // Furinho de soprar.
    `<ellipse cx="104" cy="66" rx="4.4" ry="2.2" fill="${INK}"/>` +
    shine('M78 76 L80 104', 2.4, 0.55) +
    shine('M96 64 Q104 61 112 61', 2.2, 0.8);
  let face: string;
  let pes: string;
  let extra = '';
  if (charge) {
    face =
      line('M101 86 L108 90 L101 93 M127 85 L120 89 L127 92', 2.6) +
      line('M98 80 L108 83 M120 82 L130 78', 2.6) +
      blush(100, 100, 4.6, 0.75) +
      blush(128, 99, 4.6, 0.75) +
      outlined('M104 99 L124 98 L123.5 106 L104.5 107 Z', WHITE, 1.8) +
      line('M109 98.8 L109 106.8 M114 98.6 L114 106.6 M119 98.4 L119 106.4 M104.3 102.8 L123.8 102', 1.1) +
      // Rasgos nos cantos e suor.
      line('M72 70 L77 72 L74 76 M138 72 L134 76 L138 79 M136 114 L131 116 L134 120', 1.8) +
      `<path d="M141 84 Q138 89 140 91 Q143 92 143.5 89 Q143.5 87 141 84 Z" fill="${WHITE}" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M68 90 Q65 95 67 97 Q70 98 70.5 95 Q70.5 93 68 90 Z" fill="${WHITE}" stroke="${INK}" stroke-width="1.4"/>`;
    pes =
      capsule([[98, 120], [96, 130]], 4, BALAO_ESCURO, w * 0.8) +
      capsule([[124, 119], [127, 130]], 4, BALAO_ESCURO, w * 0.8) +
      outlined('M88 129 L101 129 L100 133 L89 133 Z', BALAO_ESCURO, w * 0.6) +
      outlined('M122 129 L135 129 L134 133 L123 133 Z', BALAO_ESCURO, w * 0.6);
    extra = line('M64 64 L69 68 M140 52 L136 57 M64 116 L69 114', 2.2);
  } else if (air) {
    face =
      eye(106, 88, 5, 6.2, [0.3, -0.4], 0.5, 2) +
      eye(122, 87, 4.8, 6, [0.3, -0.4], 0.5, 2) +
      line('M100 78 Q105 75 110 78 M117 77 Q122 74 127 77', 2.2) +
      blush(101, 99, 4, 0.65) +
      blush(128, 98, 4, 0.65) +
      openMouth('M109 98 Q115 96 120 98 Q121 107 114.5 107.5 Q108 107 109 98 Z', [114.5, 106, 4], 2);
    pes =
      capsule([[98, 119], [94, 131]], 4, BALAO_ESCURO, w * 0.8) +
      capsule([[124, 118], [126, 131]], 4, BALAO_ESCURO, w * 0.8) +
      outlined('M88 132 L98 130 L98 135 L90 136 Z', BALAO_ESCURO, w * 0.6) +
      outlined('M122 131 L132 131 L131 136 L123 136 Z', BALAO_ESCURO, w * 0.6);
    extra = line('M86 124 L84 130 M140 116 L143 121', 2);
  } else {
    face =
      eye(106, 89, 5, 6.2, [0.2, -0.3], 0.52, 2) +
      eye(122, 88, 4.8, 6, [0.4, -0.3], 0.52, 2) +
      blush(100, 100, 4.2, 0.65) +
      blush(128, 99, 4.2, 0.65) +
      openMouth('M104 98 Q115 101 126 97 Q124 108 115 108.5 Q106 108 104 98 Z', [115, 107, 5], 2);
    pes =
      capsule([[98, 119], [96, 129]], 4, BALAO_ESCURO, w * 0.8) +
      capsule([[124, 118], [126, 129]], 4, BALAO_ESCURO, w * 0.8) +
      outlined('M88 128 L101 128 L100 132 L89 132 Z', BALAO_ESCURO, w * 0.6) +
      outlined('M122 128 L135 128 L134 132 L123 132 Z', BALAO_ESCURO, w * 0.6);
  }
  const pose = charge ? 'translate(104 122) scale(1.13) translate(-104 -122)' : air ? 'translate(0 -2)' : '';
  return svgDoc(
    SALTADOR_VB,
    (air ? '' : `<ellipse cx="111" cy="134" rx="28" ry="3.4" fill="${INK}" opacity="0.14"/>`) +
      pes +
      `<g transform="${pose}">${corpo}${face}</g>` +
      extra,
    variant,
  );
}

function balaoSoakSvg(variant = 0): string {
  return svgDoc(
    SALTADOR_VB,
    soakLayer(bowed([[76, 94], [90, 98], [106, 92], [120, 97], [135, 92], [134, 118], [92, 120], [78, 112]], 0.6), 'M81 100 L82 108', BALAO_LW) +
      drips([[96, 127, 2.4], [126, 126, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- aviãozinho de papel (grampo)

const GRAMPO_FRAMES = 3;
const GRAMPO_VB = '4 6 92 86';
const AVIAO = '#e2443a';
const AVIAO_MEIO = '#bf2f34';
const AVIAO_ESCURO = '#8a1d2a';
const AVIAO_LW = lw(0.24);
const ASA = 'M90 56 L12 20 L22 50 Z';
const QUILHA = 'M90 56 L22 50 L32 76 Z';

/** A cara do avião, sobre a dobra entre a asa e a quilha. `brava`: a cara decidida do voo. */
function aviaoCara(brava: boolean): string {
  return brava
    ? eye(47, 44.5, 4.2, 4.8, [0.7, 0.2], 0.6, 1.5) +
        eye(58, 47, 4, 4.6, [0.7, 0.2], 0.6, 1.5) +
        lidOf(47, 44.5, 4.2, 4.8, AVIAO, 1.4, 0.3, 1.2) +
        lidOf(58, 47, 4, 4.6, AVIAO, 1.4, 0.3, 1.2) +
        line('M41 37 L52 41 M54 41.5 L63 42.5', 2.6) +
        outlined('M53 56 L69 56.6 L67.6 61.4 L54.4 60.6 Z', WHITE, 1.5) +
        line('M58 56.2 L58 60.8 M63 56.4 L63 61', 1) +
        blush(43, 53, 2.8, 0.6)
    : eye(47, 44.5, 4.2, 5, [0.7, 0.1], 0.58, 1.5) +
        eye(58, 47, 4, 4.8, [0.7, 0.1], 0.58, 1.5) +
        lidOf(47, 44.5, 4.2, 5, AVIAO, 1.4, 0.2, 0.8) +
        // Uma sobrancelha erguida (convencido).
        line('M42 36.5 L51 38.5 M54 39 Q58 35.5 62.5 39', 2.4) +
        line('M52 58 Q60 61.5 68 56.5', 2.2) +
        outlined('M62.5 59.4 L63 62.6 L66.2 61.4 L65.6 58.4 Z', WHITE, 1.3) +
        blush(43, 53, 2.8, 0.6);
}

/**
 * Aviãozinho de papel: avião dobrado de papel vermelho, nariz para a direita, a asa de cá em cima e a
 * quilha embaixo (mais escura), com a asa de lá aparecendo por trás e os vincos da dobra. Corre em duas
 * perninhas finas de tênis marinho debaixo da quilha. Convencido: sobrancelha erguida, pálpebra caída e
 * sorriso de canto com um dentinho. `frame` troca as pernas.
 */
function aviaoSvg(frame: number, variant = 0): string {
  const swing = [-6, 0, 6][frame % GRAMPO_FRAMES]!;
  const w = AVIAO_LW;
  const bob = frame % 2 === 0 ? 0 : -1.2;
  let pernas = '';
  ([[44, 70], [60, 65]] as const).forEach(([x, y], i) => {
    const d = i % 2 === 0 ? swing : -swing;
    pernas += capsule([[x, y], [x - d, 85]], 3, AVIAO_ESCURO, w * 0.5) + oval(x - d + 2, 86.5, 5, 2.6, INK, 0);
  });
  return svgDoc(
    GRAMPO_VB,
    `<ellipse cx="50" cy="89" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      pernas +
      `<g transform="translate(0 ${bob})">` +
      // Asa de lá, por trás.
      outlined('M88 55 L24 14 L34 36 Z', AVIAO_ESCURO, w * 0.8) +
      outlined(QUILHA, AVIAO_MEIO, w) +
      line('M88 57 L30 64', 1.4, AVIAO_ESCURO) +
      outlined(ASA, AVIAO, w) +
      line('M86 54 L22 28', 1.4, AVIAO_MEIO) +
      shine('M30 28 L60 42', 2.4, 0.75) +
      aviaoCara(false) +
      `</g>`,
    variant,
  );
}

/**
 * Aviãozinho em voo: as perninhas recolhidas, as asas abertas para cima e para baixo, o nariz para a
 * frente e os riscos de vento atrás. Cara decidida (olhos apertados e dentes à mostra). Mesmo quadro
 * e apoio da corrida.
 */
export function aviaoVooSvg(variant = 0): string {
  const w = AVIAO_LW;
  return svgDoc(
    GRAMPO_VB,
    line('M6 30 L14 31 M4 50 L13 50 M7 68 L16 66 M10 40 L15 40.5', 2.2) +
      // Asa de baixo (a de lá, aberta para baixo).
      outlined('M90 58 L18 84 L28 62 Z', AVIAO_ESCURO, w * 0.8) +
      outlined('M90 56 L22 50 L28 66 Z', AVIAO_MEIO, w) +
      outlined('M90 56 L10 14 L22 50 Z', AVIAO, w) +
      line('M86 54 L20 22', 1.4, AVIAO_MEIO) +
      line('M86 58 L30 76', 1.4, AVIAO) +
      shine('M28 24 L58 40', 2.4, 0.75) +
      aviaoCara(true) +
      line('M94 48 L96 44 M95 64 L97 68', 1.8),
    variant,
  );
}

function aviaoSoakSvg(variant = 0): string {
  return svgDoc(
    GRAMPO_VB,
    soakLayer('M18 40 Q26 36 34 41 Q44 37 54 44 Q64 42 72 48 Q82 48 90 56 L32 76 L22 50 Z', 'M24 46 L27 54', AVIAO_LW) +
      drips([[40, 80, 2], [60, 76, 1.7]]),
    variant,
  );
}

// ---------------------------------------------------------------- móbile de estrelas (fiandeira)

const FIANDEIRA_VB = '-6 0 112 104';
const ESTRELA = '#f4b324';
const ESTRELA_ESCURA = '#a86e0a';
const VERDE_AGUA = '#17a08e';
const VERDE_AGUA_ESCURO = '#0c5c54';
const ROSA_ESCURO = '#de4659';
const ROSA_ESCURO_SOMBRA = '#8c1f34';
const FOLHA = '#4cae3f';
const FOLHA_ESCURA = '#256a2a';
const VARETA = '#a8662e';
const MOBILE_LW = lw(0.42);

/**
 * Móbile de estrelas: uma estrela de origami dourada no meio, com a cara, presa embaixo de uma vareta
 * de papel enrolado; nas pontas da vareta, por fios, uma estrelinha verde-água e outra rosa-escuro, e
 * outra verde pendurada embaixo da grande. O fio do jogo chega à argola em cima. De pé, porque as
 * mesmas poses servem quando ele anda sem o fio. Matreiro: olhar de lado, pálpebra meio caída e
 * sorrisinho de canto. `frame` balança a vareta e as estrelinhas. Centro em (50, 54).
 */
function mobileSvg(frame: number, variant = 0): string {
  const w = MOBILE_LW;
  const a = frame % 2 === 0 ? -9 : 9;
  const pendente = (x: number, y0: number, len: number, R: number, fill: string, dark: string, ang: number, rot: number) =>
    `<g transform="rotate(${ang} ${x} ${y0})">` +
    line(`M${x} ${y0} L${x} ${y0 + len}`, 1) +
    origamiStar(x, y0 + len + R * 0.9, R, fill, dark, w * 0.7, rot) +
    `</g>`;
  const face =
    eye(44.5, 52.5, 3.6, 4.2, [0.6, 0.15], 0.58, 1.3) +
    eye(55.5, 52, 3.4, 4, [0.6, 0.15], 0.58, 1.3) +
    lidOf(44.5, 52.5, 3.6, 4.2, ESTRELA, 1.1, 0.2, 0.7) +
    lidOf(55.5, 52, 3.4, 4, ESTRELA, 1.1, 0.2, 0.7) +
    blush(41, 58.5, 2.4, 0.7) +
    line('M46 59.5 Q51 62.5 56.5 58 L58.4 57', 1.5);
  return svgDoc(
    FIANDEIRA_VB,
    pendente(50, 63, 15, 7, FOLHA, FOLHA_ESCURA, a * 0.6, -a) +
      `<g transform="rotate(${a * 0.35} 50 29)">` +
      pendente(24, 30, 14, 8, VERDE_AGUA, VERDE_AGUA_ESCURO, -a * 0.8, a * 1.5) +
      pendente(76, 30, 14, 8, ROSA_ESCURO, ROSA_ESCURO_SOMBRA, -a * 0.8, -a * 1.5) +
      capsule([[22, 30], [78, 30]], 2.6, VARETA, w * 0.6) +
      line('M32 30 L34 30 M66 30 L68 30', 1, '#6e3f16') +
      `</g>` +
      // Argola do fio e o fiozinho até a estrela.
      line('M50 30 L50 34', 1.2) +
      `<circle cx="50" cy="26.5" r="3" fill="none" stroke="${INK}" stroke-width="3.2"/>` +
      `<circle cx="50" cy="26.5" r="3" fill="none" stroke="${VARETA}" stroke-width="1.2"/>` +
      origamiStar(50, 55, 22, ESTRELA, ESTRELA_ESCURA, w) +
      shine('M44 39 L48 34.5', 1.8, 0.85) +
      face,
    variant,
  );
}

function mobileSoakSvg(variant = 0): string {
  return svgDoc(
    FIANDEIRA_VB,
    soakLayer('M32 56 Q38 52 44 55 Q50 51 56 55 Q62 52 68 56 L60 63 L63 73 L50 67 L37 73 L40 63 Z', 'M37 58 L40 60', MOBILE_LW) +
      drips([[40, 78, 1.8], [60, 78, 1.5]]),
    variant,
  );
}

// ---------------------------------------------------------------- cornetinha de papel (tinteiro)

const TINTEIRO_VB = '6 10 92 88';
const CORNETA = '#3a9d47';
const CORNETA_ESCURA = '#1d642c';
const CORNETA_CLARA = '#7cc65a';
const BOCAL = '#f2b230';
const BOCAL_ESCURO = '#a8700f';
const CORNETA_LW = lw(0.25);
const CORNETA_D = 'M26 48 L64 38 Q74 34 79 25 Q83 21 86 24 L86 92 Q83 95 79 91 Q74 82 64 78 L26 68 Z';

/**
 * Cornetinha de papel: uma corneta de papel verde enrolado, deitada, com o bocal dourado atrás (à
 * esquerda) e a boca larga de aba dourada virada para a frente (à direita), os vincos do rolo em
 * espiral e o corpo bamboleando em dois pezinhos. Atrevida: sobrancelha erguida e sorriso de lado.
 * `charge` é o aviso das notas: a boca se abre ainda mais, as bochechas estufam (soprando) e ela se
 * inclina para trás, decidida.
 */
function cornetaSvg(frame: number, variant = 0, charge = false): string {
  const step = frame % 2 === 0 ? 0 : 1;
  const w = CORNETA_LW;
  const tilt = charge ? -5 : step === 0 ? -2.5 : 2.5;
  const pe = (x: number, y: number, lift: number) =>
    capsule([[x, y], [x, 92 + lift]], 4.4, CORNETA_ESCURA, w * 0.6) + oval(x + 3, 93.5 + lift, 7, 3.4, INK, 0);
  const boca = charge ? 'translate(84 58) scale(1.08 1.14) translate(-84 -58)' : '';
  const face = charge
    ? eye(41, 53, 4.4, 4.6, [0.6, 0.1], 0.6, 1.8) +
      eye(54, 52, 4.2, 4.4, [0.6, 0.1], 0.6, 1.8) +
      lidOf(41, 53, 4.4, 4.6, CORNETA, 1.6, 0.3, 1.4) +
      lidOf(54, 52, 4.2, 4.4, CORNETA, 1.6, 0.3, 1.4) +
      line('M35 45 L46 48 M50 47.5 L60 44', 2.8) +
      oval(38, 64, 5.4, 4.6, CORNETA, 1.8) +
      oval(58, 63, 5.4, 4.6, CORNETA, 1.8) +
      blush(38, 64, 3.6, 0.8) +
      blush(58, 63, 3.6, 0.8) +
      oval(48, 65, 3, 2.6, PALETTE.vermelhoBoca, 1.8)
    : eye(42, 55, 4.6, 5.6, [0.55, 0.1], 0.55, 1.8) +
      eye(55, 54, 4.4, 5.4, [0.55, 0.1], 0.55, 1.8) +
      lidOf(42, 55, 4.6, 5.6, CORNETA, 1.4, 0.15, -0.6) +
      line('M36 47 L46 48 M50 46 Q55 41 61 45', 2.4) +
      blush(36.5, 64, 3.2, 0.6) +
      line('M42 65 Q50 69.5 57 64 L59.4 63', 2.2);
  return svgDoc(
    TINTEIRO_VB,
    `<ellipse cx="52" cy="95" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      pe(40, 70, step === 0 ? 0 : -2.5) +
      pe(60, 74, step === 0 ? -2.5 : 0) +
      `<g transform="rotate(${tilt} 52 94)">` +
      // Bocal dourado atrás.
      outlined('M12 52 L27 49 L27 67 L12 64 Z', BOCAL, w * 0.75) +
      oval(12, 58, 2.8, 6, BOCAL_ESCURO, w * 0.6) +
      `<g transform="${boca}">` +
      shaded(
        CORNETA_D,
        CORNETA,
        `<ellipse cx="56" cy="84" rx="40" ry="12" fill="${CORNETA_ESCURA}"/>` + facet([[26, 48], [64, 38], [64, 44], [26, 54]], CORNETA_CLARA),
        w,
        'ca-corneta',
      ) +
      // Vincos do rolo em espiral.
      line('M30 47.5 Q36 58 31 67.5 M64 38.5 Q71 58 65 77.5', 1.8, CORNETA_ESCURA) +
      // Boca larga com a aba dourada.
      oval(85, 58, 6.5, 34, BOCAL, w * 0.8) +
      oval(86, 58, 3.4, 29, CORNETA_ESCURA, w * 0.5) +
      shine('M82 32 Q80 40 80 48', 2, 0.85) +
      `</g>` +
      // Anel dourado junto ao bocal.
      outlined('M26 48 L31 46.7 L31 69.3 L26 68 Z', BOCAL, w * 0.6) +
      shine('M36 46 Q46 42 56 40', 2.4, 0.8) +
      face +
      (charge ? line('M94 30 L97 27 M95 58 L98 58 M94 86 L97 89', 1.8) : '') +
      `</g>`,
    variant,
  );
}

function cornetaSoakSvg(variant = 0): string {
  return svgDoc(
    TINTEIRO_VB,
    soakLayer('M24 62 Q34 58 42 62 Q52 58 62 62 Q72 60 80 64 L86 64 L86 92 Q83 95 79 91 Q74 82 64 78 L26 68 Z', 'M30 64 L36 66', CORNETA_LW) +
      drips([[40, 80, 1.8], [64, 86, 1.5]]),
    variant,
  );
}

// ---------------------------------------------------------------- torreão (borracha)

const BORRACHA_VB = '2 14 106 80';
const TORRE = '#c8405e';
const TORRE_ESCURA = '#7c1d39';
const TORRE_CLARA = '#e8768c';
const BARBANTE = '#efb83e';
const PORTAO = '#b8792f';
const PORTAO_ESCURO = '#6e4416';
const VAO = '#3a2230';
const TORREAO_LW = lw(0.23);
const CILINDRO = 'M30 37 L80 37 L80 80 Q55 88 30 80 Z';
const CUPULA = 'M27 38 Q25 18 55 18 Q85 18 83 38 Q55 43 27 38 Z';

/** Corpo do torreão: o rolo de papel rosa-escuro, as amarras de barbante e a ponta enrolada em espiral. */
function torreaoCorpo(w: number, id: string): string {
  return (
    shaded(
      CILINDRO,
      TORRE,
      `<rect x="70" y="30" width="16" height="60" fill="${TORRE_ESCURA}"/><ellipse cx="55" cy="88" rx="30" ry="7" fill="${TORRE_ESCURA}"/>`,
      w,
      `${id}-rolo`,
    ) +
    // A borda da folha enrolada.
    line('M37 38 L37 82', 1.6, TORRE_ESCURA) +
    shine('M33 44 L33 74', 2.6, 0.7) +
    // Amarras de barbante.
    capsule([[29, 46], [81, 46]], 2.4, BARBANTE, 1.2) +
    capsule([[29, 74], [81, 74]], 2.4, BARBANTE, 1.2) +
    capsule([[33, 76], [30, 82]], 1.6, BARBANTE, 0.9) +
    // Ponta enrolada: a folha sobe e se enrola num caracol.
    shaded(CUPULA, TORRE_CLARA, `<ellipse cx="70" cy="40" rx="20" ry="8" fill="${TORRE}"/>`, w, `${id}-cupula`) +
    line('M55 29 m-2.6 0 a2.6 2.6 0 1 1 5.2 0 a5.6 5 0 1 1 -11 0 a8.6 7.6 0 1 1 17 0', 1.6, TORRE_ESCURA) +
    shine('M34 30 Q37 23 45 21', 2.4, 0.8)
  );
}

/**
 * Torreão: torrezinha de papel rosa-escuro enrolado, amarrada com barbante dourado, com a ponta
 * enrolada num caracol (nada de telhado cônico), andando em dois tocos de perna. O portão de papelão
 * com a grade levadiça fica virado para a direita como um escudo (barra a tinta de frente); a cara fica
 * no lado de trás do rolo. Zangado: pálpebras em V e dentes cerrados.
 */
function torreaoSvg(variant = 0): string {
  const w = TORREAO_LW;
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="60" cy="90" rx="40" ry="3" fill="${INK}" opacity="0.14"/>` +
      capsule([[42, 82], [40, 87]], 5, TORRE_ESCURA, w * 0.6) +
      capsule([[64, 84], [66, 87]], 5, TORRE_ESCURA, w * 0.6) +
      oval(42, 89, 7, 3, INK, 0) +
      oval(69, 89, 7, 3, INK, 0) +
      torreaoCorpo(w, 'ca-torreao') +
      // Portão de papelão com a grade, para a frente.
      shaded(
        'M74 52 Q74 38 88 38 Q102 38 102 52 L102 86 L74 86 Z',
        PORTAO,
        `<rect x="94" y="30" width="12" height="60" fill="${PORTAO_ESCURO}"/>`,
        w,
        'ca-portao',
      ) +
      line('M81 41 L81 86 M88 38.5 L88 86 M95 41 L95 86 M74.5 52 L101.5 52 M74.5 63 L101.5 63 M74.5 74 L101.5 74', 1.8) +
      shine('M78 50 Q79 43 85 41', 2, 0.6) +
      capsule([[74, 47], [70, 47]], 3, BARBANTE, 1) +
      capsule([[74, 79], [70, 79]], 3, BARBANTE, 1) +
      // Cara zangada no lado de trás do rolo.
      eye(46, 56, 4.8, 5.8, [0.6, 0.2], 0.58, 1.8) +
      eye(59, 55.5, 4.6, 5.6, [0.6, 0.2], 0.58, 1.8) +
      lids('M40 53.5 L51.6 56 L51.6 49 L40 48 Z M54 55 L64 52 L64 47 L54 48 Z', TORRE, 1.5) +
      line('M39.5 53 L52 56.4 M54 55.4 L65 51.6', 3) +
      outlined('M42 64.5 L62 63.5 L61.5 70.5 L43 71.5 Z', WHITE, 1.8) +
      line('M47 64.3 L47 71.3 M52 64 L52 71 M57 63.8 L57 70.8 M42.5 68 L61.8 67.1', 1.2) +
      blush(39, 63, 3.2, 0.6),
    variant,
  );
}

/**
 * Torreão de portão aberto: o portão girou para a frente na dobradiça e mostra o vão escuro do rolo
 * (agora a tinta pega também pela frente), com as flechas de papel espiando pela ponta e a cara de
 * susto (olhos arregalados, boquinha redonda e suor). Mesmo quadro e apoio da pose normal.
 */
export function torreaoAbertoSvg(variant = 0): string {
  const w = TORREAO_LW;
  const flecha = (x0: number, y0: number, x1: number, y1: number) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const ponta = poly([
      [x1 + c * 5, y1 + s * 5],
      [x1 - s * 3.4, y1 + c * 3.4],
      [x1 + s * 3.4, y1 - c * 3.4],
    ]);
    return capsule([[x0, y0], [x1, y1]], 1.6, BARBANTE, 1) + outlined(ponta, OURO, 1.3);
  };
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="60" cy="90" rx="40" ry="3" fill="${INK}" opacity="0.14"/>` +
      // Flechas de papel saindo de dentro da ponta.
      flecha(45, 30, 38, 20) +
      flecha(56, 28, 57, 18) +
      flecha(66, 30, 74, 20) +
      capsule([[42, 82], [40, 87]], 5, TORRE_ESCURA, w * 0.6) +
      capsule([[64, 84], [66, 87]], 5, TORRE_ESCURA, w * 0.6) +
      oval(42, 89, 7, 3, INK, 0) +
      oval(69, 89, 7, 3, INK, 0) +
      torreaoCorpo(w, 'ca-aberto') +
      // Vão escuro do portão, na frente do rolo.
      outlined('M62 58 Q62 49 70.5 49 Q79 49 79 58 L79 83 Q70 84.6 62 83.4 Z', VAO, w * 0.8) +
      line('M64 58 L77 58', 1.2, PORTAO_ESCURO) +
      // O portão aberto, visto de lado, preso na dobradiça.
      outlined('M80 49 L97 43 L97 89 L80 84 Z', PORTAO, w) +
      line('M85.5 47 L85.5 85.6 M91 45 L91 87.3 M80.5 60 L96.5 57 M80.5 72 L96.5 72', 1.6) +
      line('M80 49 L80 84', 1.6, PORTAO_ESCURO) +
      // Cara de susto.
      eye(43, 56, 5.4, 6.6, [0.2, -0.2], 0.36, 1.8) +
      eye(56, 55.5, 5.2, 6.4, [0.2, -0.2], 0.36, 1.8) +
      line('M37 46 Q42 42 48 46 M51 45 Q56 41 61 45', 2.4) +
      oval(50, 67.5, 3.4, 3.8, PALETTE.vermelhoBoca, 1.8) +
      blush(38, 65, 3, 0.7) +
      blush(59.5, 64.5, 3, 0.7) +
      `<path d="M28 50 Q25 55 27 57 Q30 58 30.5 55 Q30.5 53 28 50 Z" fill="${WHITE}" stroke="${INK}" stroke-width="1.4"/>` +
      line('M20 56 L25 57 M19 66 L24 66 M101 52 L105 50 M101 64 L106 64', 2),
    variant,
  );
}

function torreaoSoakSvg(variant = 0): string {
  return svgDoc(
    BORRACHA_VB,
    soakLayer('M30 64 Q40 59 50 63 Q62 58 74 62 Q88 57 102 62 L102 86 L74 86 L74 84 Q55 88 30 80 Z', 'M34 67 L35 76', TORREAO_LW) +
      drips([[44, 92, 1.8], [84, 92, 1.5]]),
    variant,
  );
}

export const PELE_CASTELO: Pele = {
  id: 'castelo',
  traca: raposaSvg,
  tracaTinta: raposaSoakSvg,
  saltador: balaoSvg,
  saltadorTinta: balaoSoakSvg,
  grampo: aviaoSvg,
  grampoTinta: aviaoSoakSvg,
  fiandeira: mobileSvg,
  fiandeiraTinta: mobileSoakSvg,
  tinteiro: cornetaSvg,
  tinteiroTinta: cornetaSoakSvg,
  borracha: torreaoSvg,
  borrachaTinta: torreaoSoakSvg,
  cuspe: cuspeSvg,
};
