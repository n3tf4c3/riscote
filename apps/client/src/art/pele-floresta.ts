import type { Pele } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, openMouth, outlined, oval, shine, svgDoc } from './svg';

// Pele da Floresta Encantada (2026-11-01): os mesmos seis inimigos do caderno, com as mesmas regras,
// vestidos de bichos do bosque. Cada desenho usa o quadro (viewBox), o ponto de apoio e mais ou
// menos a área do original em `enemies.ts`, para a caixa de colisão continuar batendo. O fundo do
// bosque é claro e verde-pálido, então os bichos são saturados, de contorno marinho, e nenhum é
// verde-pálido; o azul da tinta (SOAK) fica só nas camadas do encharcado.

const SOAK = PALETTE.azul;

/** Espessura de contorno para ~0,8 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.8 / k).toFixed(2);

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

// ---------------------------------------------------------------- lagarta-cereja (traça)

const TRACA_FRAMES = 3;
const TRACA_VB = '30 60 200 95';
const CEREJA = '#d8213f';
const CEREJA_ESCURA = '#8c1230';
const CREME = '#fff0c2';
const LAGARTA_LW = lw(0.19);
/** Segmentos do corpo, do rabo para a frente: [cx, cy, rx, ry]. */
const GOMOS: Array<[number, number, number, number]> = [
  [62, 124, 12, 9.5],
  [83, 121, 14, 11.5],
  [105, 119, 15, 12.5],
  [127, 118, 15, 13],
];

/**
 * Lagarta-cereja: gomos carmim com barriga cor de vinho e pintas creme, perninhas curtas que andam
 * numa onda do rabo para a cabeça e dois chifrinhos creme. Cara de travessa (olhar de lado e um
 * sorrisinho). `alert` é o aviso do bote: empina a cabeça, chifres em pé, cenho fechado e boca aberta.
 */
function lagartaSvg(frame: number, variant = 0, alert = false): string {
  const t = (frame / TRACA_FRAMES) * Math.PI * 2;
  const w = LAGARTA_LW;
  let legs = '';
  let body = '';
  GOMOS.forEach(([cx, cy0, rx, ry], i) => {
    const wave = 2.6 * Math.sin(t - i * 1.5);
    const cy = cy0 + wave - (alert && i === 3 ? 4 : 0);
    const swing = 6 * Math.cos(t - i * 1.5);
    legs += capsule([[cx, cy + ry - 4], [cx + swing, 143]], 5, CEREJA_ESCURA, 2.6) + oval(cx + swing + 1.5, 145, 5, 3, INK, 0);
    const id = `fl-gomo${i}`;
    body +=
      `<clipPath id="${id}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${CEREJA}"/>` +
      `<ellipse cx="${cx + 2}" cy="${cy + ry * 0.95}" rx="${rx * 1.1}" ry="${ry * 0.55}" fill="${CEREJA_ESCURA}" clip-path="url(#${id})"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
      oval(cx - 1, cy - ry * 0.38, ry * 0.42, ry * 0.34, CREME, 2.2) + `<circle cx="${cx + rx * 0.55}" cy="${cy + ry * 0.05}" r="${(ry * 0.2).toFixed(1)}" fill="${CREME}" stroke="${INK}" stroke-width="1.8"/>`;
  });
  const head = 'M164 87 Q190 87 190 110 Q190 132 164 132 Q139 132 139 110 Q139 87 164 87 Z';
  const horns = alert
    ? capsule([[154, 92], [154, 84], [157, 78]], 4.5, CREME, 2.4) + capsule([[171, 91], [174, 84], [179, 79]], 4.5, CREME, 2.4)
    : capsule([[153, 92], [146, 82], [138, 78]], 4.5, CREME, 2.4) + capsule([[168, 90], [166, 79], [160, 72]], 4.5, CREME, 2.4);
  const face = alert
    ? eye(157, 106, 8, 8, [0.6, 0.2], 0.6, 3.2) +
      eye(176, 105, 7.5, 7.5, [0.6, 0.2], 0.6, 3.2) +
      lids('M148 99 L166 104 L166 98 L148 96 Z M168 103 L184 97 L184 95 L168 98 Z', CEREJA, 2.4) +
      line('M146 96 L166 103 M168 102 L186 94', 5) +
      openMouth('M156 118 Q172 114 186 116 Q184 132 172 132 Q160 131 156 118 Z', [172, 132, 7], 3.2) +
      outlined('M160 118.5 L182 116.5 L181.5 121 L161 122.5 Z', WHITE, 2)
    : eye(156, 105, 8, 9.5, [0.6, 0.05], 0.55, 3.2) +
      eye(175, 104, 7.5, 9, [0.6, 0.05], 0.55, 3.2) +
      lids('M147.6 103 Q156 93 164.4 101 Z M167.4 101 Q175 92 182.6 100 Z', CEREJA, 2.4) +
      line('M146 92 Q154 87 163 91 M168 90 Q176 85 184 90', 4.2) +
      line('M157 120 Q171 128 184 116', 4.5) +
      outlined('M174 123 L174 129 L180 127.5 L179.5 121.5 Z', WHITE, 2.2);
  const headGroup =
    `<clipPath id="fl-cabeca"><path d="${head}"/></clipPath>` +
    `<path d="${head}" fill="${CEREJA}"/>` +
    `<ellipse cx="166" cy="134" rx="28" ry="12" fill="${CEREJA_ESCURA}" clip-path="url(#fl-cabeca)"/>` +
    `<path d="${head}" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
    shine('M146 100 Q149 92 156 90', 3.2, 0.75) +
    blush(147, 120, 5.5, 0.6) +
    face;
  // No bote, a cabeça empina para trás e para cima, girando sobre o pescoço.
  const pose = alert ? 'translate(1 -7) rotate(-9 146 128)' : `translate(0 ${(1.6 * Math.sin(t - 4.5)).toFixed(2)})`;
  return svgDoc(
    TRACA_VB,
    `<ellipse cx="106" cy="149" rx="62" ry="5" fill="${INK}" opacity="0.14"/>` +
      outlined('M52 120 Q42 118 36 109 Q40 122 52 129 Z', CEREJA_ESCURA, 3) +
      legs +
      body +
      `<g transform="${pose}">${horns}${headGroup}</g>`,
    variant,
  );
}

function lagartaSoakSvg(variant = 0): string {
  return svgDoc(
    TRACA_VB,
    soakLayer('M48 124 Q60 117 74 122 Q92 115 108 120 Q126 113 142 118 Q160 112 188 118 Q188 132 164 133 L60 133 Q48 133 48 124 Z', 'M64 125 Q80 121 96 123', LAGARTA_LW) +
      drips([[82, 139, 3], [118, 141, 2.4], [158, 139, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- grilo-pulante (saltador)

const SALTADOR_VB = '60 40 84 110';
const GRILO = 'M105 56 Q134 57 134 87 Q134 115 105 116 Q75 116 75 88 Q75 57 105 56 Z';
const LIMA = '#8fd023';
const LIMA_BARRIGA = '#4f9a17';
const LIMA_PERNA = '#5cae1a';
const LIMA_ESCURA = '#2f6e12';
const GRILO_LW = lw(0.3);

/** Coxa da perna de trás (o "tambor" do grilo), com duas listrinhas. */
function coxa(d: string, stripes: string, w: number): string {
  return outlined(d, LIMA_PERNA, w) + line(stripes, 1.4, LIMA_ESCURA);
}

/**
 * Grilo-pulante: bola lima com barriga verde-escura, a coxa grande da perna de trás dobrada com o
 * joelho lá em cima, antenas compridas e cara boba de sorriso. No ar estica as pernas e grita de
 * alegria. `charge` é o aviso da pancada: encolhe a perna, cenho baixo e dentes cerrados.
 */
function griloSvg(air: boolean, variant = 0, charge = false): string {
  const w = GRILO_LW;
  let back: string;
  let thigh: string;
  if (air) {
    back =
      capsule([[73, 121], [64, 134]], 3.2, LIMA_ESCURA, w) +
      oval(65, 136, 6, 3, LIMA_ESCURA, w) +
      capsule([[114, 112], [123, 121]], 3.2, LIMA_ESCURA, w) +
      capsule([[124, 107], [133, 115]], 3.2, LIMA_ESCURA, w);
    thigh = coxa('M95 101 Q92 116 79 123 Q69 127 69 120 Q70 112 86 99 Z', 'M84 108 L80 113 M90 108 L85 114', w);
  } else {
    const knee = charge ? 80 : 70;
    back =
      capsule([[68, knee + 2], [77, 128]], 3.2, LIMA_ESCURA, w) +
      oval(80, 131, 8, 3.8, LIMA_ESCURA, w) +
      capsule([[114, 111], [116, 128]], 3.2, LIMA_ESCURA, w) +
      oval(119, 131, 7, 3.6, LIMA_ESCURA, w) +
      capsule([[125, 106], [129, 128]], 3.2, LIMA_ESCURA, w) +
      oval(132, 131, 6, 3.4, LIMA_ESCURA, w);
    thigh = charge
      ? coxa('M93 107 Q76 110 67 94 Q62 82 70 80 Q78 79 88 92 Q97 103 93 107 Z', 'M74 89 L79 86 M79 96 L84 92', w)
      : coxa('M94 104 Q76 104 68 86 Q63 72 71 69 Q79 68 88 86 Q97 99 94 104 Z', 'M72 81 L77 78 M76 90 L82 87', w);
  }
  const antennae = air
    ? line('M106 57 Q96 46 74 50 M115 57 Q108 41 88 42', 2.2)
    : charge
      ? line('M106 57 Q96 50 76 56 M115 57 Q106 46 86 47', 2.2)
      : line('M107 57 Q101 41 83 44 M116 58 Q122 43 139 45', 2.2);
  let face: string;
  if (charge) {
    face =
      eye(103, 82, 6, 5, [0.6, 0.3], 0.62, 2) +
      eye(120, 81, 6.5, 5.4, [0.6, 0.3], 0.62, 2) +
      line('M94 72 L109 79 M113 78 L129 70', 3.6) +
      outlined('M105 94 L129 92 L128 103 L106 104 Z', WHITE, 2) +
      line('M111 93.6 L111 104 M117 93.2 L117 103.6 M123 92.7 L123 103.4 M105.5 99 L128.5 97.5', 1.3);
  } else if (air) {
    face =
      eye(103, 79, 6.5, 8.5, [0.4, -0.4], 0.5, 2) +
      eye(120, 78, 7, 9.5, [0.4, -0.4], 0.5, 2) +
      line('M96 66 Q103 62 109 66 M114 64 Q121 59 128 63', 2.6) +
      openMouth('M106 93 Q118 90 129 92 Q127 107 117 107 Q108 106 106 93 Z', [117, 106, 6], 2);
  } else {
    face =
      eye(103, 81, 6.5, 8, [0.3, 0.1], 0.5, 2) +
      eye(120, 80, 7, 9, [0.1, 0.2], 0.5, 2) +
      line('M97 69 Q103 66 109 69 M114 67 Q121 63 128 67', 2.4) +
      outlined('M105 94 Q117 104 130 92 Q126 101 117 103 Q108 103 105 94 Z', PALETTE.vermelhoBoca, 2) +
      outlined('M114 100 Q117 108 122 106 Q125 103 122 99 Z', PALETTE.lingua, 1.6);
  }
  return svgDoc(
    SALTADOR_VB,
    (air ? '' : `<ellipse cx="103" cy="135" rx="30" ry="3.5" fill="${INK}" opacity="0.14"/>`) +
      back +
      `<clipPath id="fl-grilo"><path d="${GRILO}"/></clipPath>` +
      `<path d="${GRILO}" fill="${LIMA}"/>` +
      `<ellipse cx="110" cy="114" rx="26" ry="15" fill="${LIMA_BARRIGA}" clip-path="url(#fl-grilo)"/>` +
      `<path d="${GRILO}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M88 66 Q94 60 103 59', 3, 0.75) +
      antennae +
      thigh +
      blush(96, 93, 4.2, 0.65) +
      face,
    variant,
  );
}

function griloSoakSvg(variant = 0): string {
  return svgDoc(
    SALTADOR_VB,
    soakLayer('M75 92 Q88 86 100 90 Q113 84 125 89 Q130 86 134 90 Q134 115 105 116 Q75 116 75 92 Z', 'M82 97 Q88 95 94 96', GRILO_LW) +
      drips([[86, 123, 2.4], [118, 126, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- pinha-corredora (grampo)

const GRAMPO_FRAMES = 3;
const GRAMPO_VB = '4 6 92 86';
const PINHA = 'M50 20 Q73 22 74 46 Q75 66 62 76 Q50 82 38 76 Q25 66 26 46 Q27 22 50 20 Z';
const CASTANHA = '#b4612a';
const CASTANHA_ESCURA = '#5e2c12';
const CASTANHA_CLARA = '#d98a48';
const FOLHA_ESCURA = '#2f8a2e';
const PINHA_LW = lw(0.24);

/** Escamas da pinha: fileiras de "U" desencontradas, cada uma com a borda escura e a ponta clara. */
function escamas(): string {
  let out = '';
  for (let row = 0; row < 6; row++) {
    const y = 28 + row * 9.5;
    const off = row % 2 === 0 ? 0 : 6;
    for (let x = 20 + off; x <= 82; x += 12) {
      out +=
        `<path d="M${x - 6} ${y - 3} Q${x - 6} ${y + 6} ${x} ${y + 7} Q${x + 6} ${y + 6} ${x + 6} ${y - 3}" fill="${CASTANHA}" stroke="${CASTANHA_ESCURA}" stroke-width="1.8" stroke-linejoin="round"/>` +
        `<path d="M${x - 2.5} ${y + 3.5} Q${x} ${y + 5} ${x + 2.5} ${y + 3.5}" fill="none" stroke="${CASTANHA_CLARA}" stroke-width="1.5" stroke-linecap="round"/>`;
    }
  }
  return out;
}

/**
 * Pinha-corredora: pinha castanha de escamas com borda escura, um raminho de folha no alto, duas
 * perninhas correndo e bracinhos no embalo. Ranzinza: pálpebra caída, cenho franzido e boca torta.
 * `frame` troca as pernas.
 */
function pinhaSvg(frame: number, variant = 0): string {
  const swing = [-7, 0, 7][frame % GRAMPO_FRAMES]!;
  const w = PINHA_LW;
  const legs =
    capsule([[43, 74], [40 + swing, 84]], 4, CASTANHA_ESCURA, w * 0.7) +
    capsule([[57, 74], [60 - swing, 84]], 4, CASTANHA_ESCURA, w * 0.7) +
    oval(43 + swing, 86, 6.5, 3.4, INK, 0) +
    oval(63 - swing, 86, 6.5, 3.4, INK, 0);
  const arms =
    capsule([[28, 50], [20, 56 + swing * 0.6], [17, 50 + swing]], 3.4, CASTANHA_ESCURA, w * 0.7) +
    capsule([[72, 50], [80, 56 - swing * 0.6], [83, 50 - swing]], 3.4, CASTANHA_ESCURA, w * 0.7);
  return svgDoc(
    GRAMPO_VB,
    `<ellipse cx="50" cy="89" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      legs +
      arms +
      `<clipPath id="fl-pinha"><path d="${PINHA}"/></clipPath>` +
      `<path d="${PINHA}" fill="${CASTANHA_ESCURA}"/>` +
      `<g clip-path="url(#fl-pinha)">${escamas()}` +
      // A carinha fica numa área lisa, para ler no tamanho do jogo.
      `<ellipse cx="53" cy="47" rx="17" ry="13" fill="${CASTANHA}"/></g>` +
      `<path d="${PINHA}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M31 40 Q33 29 42 25', 2.6, 0.75) +
      // Raminho no alto.
      line('M50 21 Q51 14 55 10', 2.6, INK) +
      outlined('M54 13 Q62 6 70 9 Q64 17 54 13 Z', FOLHA_ESCURA, 1.6) +
      // Olhos de pálpebra caída.
      eye(46, 45, 5, 5.5, [0.5, 0.3], 0.55, 1.6) +
      eye(60, 44.5, 5, 5.5, [0.5, 0.3], 0.55, 1.6) +
      lids('M40.5 44 Q46 38 51.5 44 Z M54.5 43.5 Q60 37.5 65.5 43.5 Z', CASTANHA, 1.5) +
      line('M39 37 L51 40.5 M67 36 L55 40', 2.6) +
      line('M46 56 Q53 52 60 56 L62.5 54.5', 2.4),
    variant,
  );
}

function pinhaSoakSvg(variant = 0): string {
  return svgDoc(
    GRAMPO_VB,
    soakLayer('M27 58 Q34 53 42 57 Q50 52 58 57 Q66 53 73 58 Q70 70 62 76 Q50 82 38 76 Q30 70 27 58 Z', 'M32 63 Q34 68 37 71', PINHA_LW) +
      drips([[40, 86, 2], [60, 87, 1.7]]),
    variant,
  );
}

// ---------------------------------------------------------------- bicho-cesto (fiandeira)

const FIANDEIRA_VB = '-6 0 112 104';
const CESTO = 'M50 37 Q70 39 68 60 Q66 77 50 85 Q34 77 32 60 Q30 39 50 37 Z';
const FERRUGEM = '#c4511d';
const FERRUGEM_ESCURA = '#86300f';
const FERRUGEM_CLARA = '#e3803a';
const AMEIXA = '#6a2a5e';
const AMEIXA_CLARA = '#9a4a88';
const CESTO_LW = lw(0.42);

/** Folhas secas do cesto, de baixo para cima: [x, y, rotação]. */
const FOLHAS: ReadonlyArray<readonly [number, number, number]> = [
  [50, 82, 0],
  [41, 72, 18],
  [59, 73, -16],
  [50, 64, 4],
  [38, 56, 22],
  [62, 57, -20],
  [50, 48, -6],
  [40, 42, 26],
  [60, 42, -24],
];

/**
 * Bicho-cesto: lagartinha ameixa que mora num cesto de folhas secas cor de ferrugem e desce por um
 * fio de seda. Espia pela boca do cesto com bracinhos agarrados na borda. Matreiro: olhos meio
 * fechados olhando de lado e sorriso de canto. `frame` alterna os braços e o balanço do cesto.
 * Centro do corpo em (50, 52).
 */
function bichoCestoSvg(frame: number, variant = 0): string {
  const k = frame % 2 === 0 ? 1 : -1;
  const w = CESTO_LW;
  let leaves = '';
  FOLHAS.forEach(([x, y, r], i) => {
    const fill = i % 3 === 0 ? FERRUGEM : i % 3 === 1 ? FERRUGEM_CLARA : FERRUGEM;
    leaves +=
      `<g transform="rotate(${r} ${x} ${y})">` +
      `<path d="M${x} ${y - 9} Q${x + 9} ${y - 3} ${x} ${y + 9} Q${x - 9} ${y - 3} ${x} ${y - 9} Z" fill="${fill}" stroke="${FERRUGEM_ESCURA}" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<path d="M${x} ${y - 6} L${x} ${y + 6}" stroke="${FERRUGEM_ESCURA}" stroke-width="1" stroke-linecap="round"/></g>`;
  });
  // Um braço segura a borda e o outro acena; no quadro seguinte trocam.
  const armUp = (side: number) =>
    capsule([[50 + side * 9, 36], [50 + side * 15, 30], [50 + side * 19, 24]], 3, AMEIXA, w) +
    oval(50 + side * 19.5, 23, 2.6, 2.6, AMEIXA_CLARA, w * 0.8);
  const armHold = (side: number) =>
    capsule([[50 + side * 9, 35], [50 + side * 15, 35], [50 + side * 16, 40]], 3, AMEIXA, w) +
    oval(50 + side * 16, 40.5, 2.6, 2.6, AMEIXA_CLARA, w * 0.8);
  const arms = k > 0 ? armHold(-1) + armUp(1) : armUp(-1) + armHold(1);
  return svgDoc(
    FIANDEIRA_VB,
    `<g transform="rotate(${k * 4} 50 20)">` +
      // Cabeça espiando por trás da borda do cesto.
      oval(50, 30, 13, 11.5, AMEIXA, w) +
      shine('M40 26 Q42 21 47 20', 2, 0.7) +
      eye(45, 29, 4.4, 4.8, [0.7, 0.2], 0.6, 1.3) +
      eye(56, 28.5, 4.4, 4.8, [0.7, 0.2], 0.6, 1.3) +
      lids('M40.4 28 Q45 22 49.6 28 Z M51.4 27.5 Q56 21.5 60.6 27.5 Z', AMEIXA, 1.2) +
      line('M40 26.5 L37.5 24.5 M60.6 26.5 L63.5 24', 1.2) +
      blush(41.5, 34, 2.4, 0.7) +
      line('M47 35 Q53 37.5 58 33', 1.6, WHITE) +
      line('M47 35 Q53 37.5 58 33', 0.8, INK) +
      `<clipPath id="fl-cesto"><path d="${CESTO}"/></clipPath>` +
      `<path d="${CESTO}" fill="${FERRUGEM_ESCURA}"/>` +
      `<g clip-path="url(#fl-cesto)">${leaves}</g>` +
      `<path d="${CESTO}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M36 48 Q37 42 41 40', 1.8, 0.6) +
      // Borda do cesto, por cima do queixo.
      outlined('M33 40 Q50 33 67 40 Q66 44 62 44 Q50 39 38 44 Q34 44 33 40 Z', FERRUGEM_CLARA, w * 0.8) +
      arms +
      // Ponta do cesto, um cabinho de folha seca.
      line('M50 85 Q49 89 52 92', 1.6, FERRUGEM_ESCURA) +
      `</g>`,
    variant,
  );
}

function bichoCestoSoakSvg(variant = 0): string {
  return svgDoc(
    FIANDEIRA_VB,
    soakLayer('M32 62 Q40 57 50 61 Q60 56 68 62 Q66 77 50 85 Q34 77 32 62 Z', 'M36 66 Q37 70 40 73', CESTO_LW) +
      drips([[44, 89, 2], [56, 91, 1.6]]),
    variant,
  );
}

// ---------------------------------------------------------------- caracol-de-seiva (tinteiro)

const TINTEIRO_VB = '6 10 92 88';
const CORAL = '#f1607c';
const CORAL_ESCURO = '#ab2f50';
const LESMA = '#e6b47c';
const LESMA_ESCURA = '#bf8350';
const SEIVA = '#c6d64a';
const SEIVA_ESCURA = '#7f9218';
const CARACOL_LW = lw(0.25);

/**
 * Caracol-de-seiva: concha em espiral rosa-coral nas costas e corpo bege-caramelo, com a cabeça
 * levantada na frente e dois chifrinhos. Atrevido: sobrancelha erguida e língua de fora.
 * `charge` é o aviso do cuspe: bochechas estufadas, olhos apertados e uma bolha de seiva se
 * formando na boca.
 */
function caracolSvg(frame: number, variant = 0, charge = false): string {
  const step = frame % 2 === 0 ? 0 : 1;
  const w = CARACOL_LW;
  const hx = -step * 2;
  const body =
    `M14 95 Q10 95 11 90 Q14 86 24 86 L66 86 L${66 + hx} 58 Q${67 + hx} 38 ${81 + hx} 38 Q${96 + hx} 38 ${96 + hx} 58 ` +
    `L${96 + hx} 88 Q${96 + hx} 95 ${88 + hx} 95 Z`;
  const face = charge
    ? line(`M${73 + hx} 50 L${79 + hx} 54 L${73 + hx} 58 M${92 + hx} 50 L${86 + hx} 54 L${92 + hx} 58`, 2.6) +
      oval(70 + hx, 70, 7.5, 7, '#ffb07a', w * 0.8) +
      oval(91 + hx, 70, 5.5, 6.5, '#ffb07a', w * 0.8) +
      outlined(`M${79 + hx} 70 Q${83 + hx} 66 ${87 + hx} 70 Q${83 + hx} 73 ${79 + hx} 70 Z`, PALETTE.vermelhoBoca, 1.5) +
      // A bolha de seiva crescendo na boca.
      oval(88 + hx, 80, 6, 5.5, SEIVA, 1.8) +
      shine(`M${85 + hx} 78 Q${86.5 + hx} 76 ${88.5 + hx} 76`, 1.5, 0.9)
    : eye(76 + hx, 54, 5.5, 6.5, [0.5, 0.1], 0.55, 1.8) +
      eye(90 + hx, 53, 5, 7, [0.5, 0.1], 0.55, 1.8) +
      line(`M${70 + hx} 44 L${81 + hx} 46 M${85 + hx} 42 Q${90 + hx} 38 ${95 + hx} 42`, 2.4) +
      blush(70 + hx, 64, 3.6, 0.65) +
      line(`M${76 + hx} 66 Q${84 + hx} 71 ${93 + hx} 64`, 2.4) +
      outlined(`M${84 + hx} 68 Q${85 + hx} 76 ${89 + hx} 75 Q${92 + hx} 73 ${90 + hx} 67 Z`, PALETTE.lingua, 1.5);
  // Espiral da concha: meias-voltas que crescem a partir do miolo.
  const spiral = 'M40 62 A4 4 0 0 1 48 62 A8 8 0 0 1 32 62 A12 12 0 0 1 56 62 A16 16 0 0 1 24 62 A19 19 0 0 1 61 60';
  const sy = step === 0 ? 0 : -1.5;
  return svgDoc(
    TINTEIRO_VB,
    `<ellipse cx="52" cy="95" rx="38" ry="3" fill="${INK}" opacity="0.14"/>` +
      line('M10 93 L4 93', 1.6, LESMA_ESCURA) +
      line(`M${78 + hx} 40 L${74 + hx} 26 M${86 + hx} 39 L${90 + hx} 25`, 2.6 + w * 2, INK) +
      line(`M${78 + hx} 40 L${74 + hx} 26 M${86 + hx} 39 L${90 + hx} 25`, 2.6, LESMA) +
      oval(74 + hx, 25, 3.4, 3.4, LESMA, 1.8) +
      oval(90 + hx, 24, 3.4, 3.4, LESMA, 1.8) +
      `<clipPath id="fl-lesma"><path d="${body}"/></clipPath>` +
      `<path d="${body}" fill="${LESMA}"/>` +
      `<rect x="0" y="89" width="110" height="10" fill="${LESMA_ESCURA}" clip-path="url(#fl-lesma)"/>` +
      `<path d="${body}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine(`M${70 + hx} 56 Q${70 + hx} 46 ${75 + hx} 42`, 2.2, 0.7) +
      `<g transform="translate(0 ${sy})">` +
      `<clipPath id="fl-concha"><circle cx="41" cy="61" r="25"/></clipPath>` +
      `<circle cx="41" cy="61" r="25" fill="${CORAL}"/>` +
      `<ellipse cx="46" cy="86" rx="30" ry="12" fill="${CORAL_ESCURO}" opacity="0.55" clip-path="url(#fl-concha)"/>` +
      `<path d="${spiral}" fill="none" stroke="${CORAL_ESCURO}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<circle cx="41" cy="61" r="25" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
      shine('M22 52 Q25 42 34 38', 2.6, 0.85) +
      `</g>` +
      face,
    variant,
  );
}

function caracolSoakSvg(variant = 0): string {
  return svgDoc(
    TINTEIRO_VB,
    soakLayer('M12 76 Q22 70 34 74 Q48 68 60 73 Q74 68 86 73 Q92 70 96 74 L96 88 Q96 95 88 95 L14 95 Q10 95 11 90 Z', 'M18 80 L18 88', CARACOL_LW),
    variant,
  );
}

// ---------------------------------------------------------------- ouriço-escudo (borracha)

const BORRACHA_VB = '2 14 106 80';
const OURICO = 'M12 82 Q10 52 32 38 Q54 26 78 32 Q100 40 100 68 Q100 88 86 88 L22 88 Q12 88 12 82 Z';
const PELUCIA = '#f2c58c';
const PELUCIA_SOMBRA = '#d79a5c';
const ESPINHO = '#5a2f1b';
const ESPINHO_PONTA = '#a8653a';
const FOCINHO = '#f7dcb4';
const OURICO_LW = lw(0.23);

/** Coroa de espinhos da frente: leque de pontas em volta de (62, 66), do alto até a frente. */
function espinhos(): { crown: string; tips: string } {
  const cx = 60;
  const cy = 64;
  const n = 8;
  const a0 = -112;
  const a1 = 4;
  const pt = (a: number, r: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(cx + Math.cos(rad) * r).toFixed(1)} ${(cy + Math.sin(rad) * r).toFixed(1)}`;
  };
  let d = `M${cx - 8} ${cy + 18} L${pt(a0 - 6, 28)}`;
  let tips = '';
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const out = 41 + (i % 2) * 5;
    d += ` L${pt(a, out)} L${pt(a + (a1 - a0) / n / 2, 27)}`;
    tips += `M${pt(a, out - 4)} L${pt(a, out - 12)} `;
  }
  d += ` L${cx + 30} ${cy + 18} Z`;
  return { crown: d, tips };
}

/**
 * Ouriço-escudo: atrás, pelúcia caramelo macia e redonda (o lado vulnerável); na frente, um leque de
 * espinhos castanho-escuros eriçados (o lado que estoura a tinta), com o focinho claro espiando por
 * baixo. Zangado: pálpebras em V e dentes cerrados. Olha para a direita.
 */
function ouricoSvg(variant = 0): string {
  const w = OURICO_LW;
  const { crown, tips } = espinhos();
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="55" cy="90" rx="44" ry="3" fill="${INK}" opacity="0.14"/>` +
      oval(28, 88, 8, 3.6, INK, 0) +
      oval(80, 88, 8, 3.6, INK, 0) +
      `<clipPath id="fl-ourico"><path d="${OURICO}"/></clipPath>` +
      `<path d="${OURICO}" fill="${PELUCIA}"/>` +
      `<ellipse cx="40" cy="92" rx="40" ry="14" fill="${PELUCIA_SOMBRA}" clip-path="url(#fl-ourico)"/>` +
      `<path d="${OURICO}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      // Tufinhos macios da pelúcia.
      line('M20 56 Q24 52 28 55 M18 68 Q22 64 26 67 M30 46 Q34 42 38 45', 2, PELUCIA_SOMBRA) +
      shine('M18 60 Q22 46 34 40', 2.8, 0.8) +
      `<path d="${crown}" fill="${ESPINHO}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      `<path d="${tips}" fill="none" stroke="${ESPINHO_PONTA}" stroke-width="2.4" stroke-linecap="round"/>` +
      // Focinho: é nele que fica a cara.
      oval(82, 70, 19, 15, FOCINHO, w) +
      oval(101, 67, 4, 3.4, INK, 0) +
      `<circle cx="100" cy="65.8" r="1.2" fill="${WHITE}"/>` +
      eye(76, 63, 5.5, 6, [0.5, 0.2], 0.58, 1.8) +
      eye(91, 62, 5, 6, [0.5, 0.2], 0.58, 1.8) +
      lids('M70 60.5 L82 63 L82 57 L70 56 Z M86 62 L96 59 L96 55 L86 56 Z', FOCINHO, 1.5) +
      line('M69.5 60 L82 63.4 M86 62.4 L97 58.6', 3) +
      outlined('M73 73.5 L93 72.5 L92.5 80 L74 81 Z', WHITE, 1.8) +
      line('M78 73.3 L78 80.8 M83 73 L83 80.5 M88 72.8 L88 80.3 M73.5 77.2 L92.8 76.3', 1.2) +
      blush(70, 77, 3.4, 0.6) +
      `<circle cx="106" cy="86" r="1.6" fill="${ESPINHO}" stroke="${INK}" stroke-width="1"/>`,
    variant,
  );
}

function ouricoSoakSvg(variant = 0): string {
  return svgDoc(
    BORRACHA_VB,
    soakLayer('M12 70 Q24 64 36 68 Q50 62 64 68 Q80 62 100 68 L100 76 Q100 88 86 88 L22 88 Q12 88 12 82 Z', 'M18 74 L18 82', OURICO_LW) +
      drips([[34, 92, 1.8], [70, 93, 1.5]]),
    variant,
  );
}

// ---------------------------------------------------------------- cuspe do caracol

/** Bolota de seiva âmbar-esverdeada correndo para a direita, com riscos de velocidade. */
function bolotaSvg(variant = 0): string {
  return svgDoc(
    '-20 -14 40 28',
    line('M-19 -2 L-12 -2 M-18 4 L-10 4', 1.6, SEIVA_ESCURA) +
      `<path d="M-13 3 Q-6 -5 4 -8 Q15 -9 15 1 Q15 10 4 10 Q-6 10 -13 3 Z" fill="${SEIVA}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M-8 5 Q0 9 10 6" fill="none" stroke="${SEIVA_ESCURA}" stroke-width="1.8" stroke-linecap="round"/>` +
      shine('M3 -4 Q8 -5 10 -2', 1.8, 0.9),
    variant,
  );
}

export const PELE_FLORESTA: Pele = {
  id: 'floresta',
  traca: lagartaSvg,
  tracaTinta: lagartaSoakSvg,
  saltador: griloSvg,
  saltadorTinta: griloSoakSvg,
  grampo: pinhaSvg,
  grampoTinta: pinhaSoakSvg,
  fiandeira: bichoCestoSvg,
  fiandeiraTinta: bichoCestoSoakSvg,
  tinteiro: caracolSvg,
  tinteiroTinta: caracolSoakSvg,
  borracha: ouricoSvg,
  borrachaTinta: ouricoSoakSvg,
  cuspe: bolotaSvg,
};
