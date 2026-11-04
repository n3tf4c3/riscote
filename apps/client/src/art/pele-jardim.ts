import { cuspeSvg } from './enemies';
import type { Pele } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, openMouth, outlined, oval, shine, svgDoc } from './svg';

// Pele do Jardim das Lanternas (2026-11-01): seis bichos e coisas vivas de um jardim ao entardecer,
// cada um com o papel de um inimigo do caderno. Cada desenho usa o quadro (viewBox), o ponto de apoio
// e mais ou menos a área da criatura da Biblioteca do mesmo papel (`pele-biblioteca.ts`), para a caixa
// de colisão continuar batendo. O céu vai da ardósia ao malva, ao rosa antigo e ao coral, e as
// lanternas e as flores são pálidas (creme e pêssego); por isso as criaturas são de cores saturadas e
// diferentes entre si (laranja com lima acesa, verde-folha, azul-petróleo, ocre com verdete, terracota
// com água verde-água e carmim), sempre de contorno marinho. Nada de magenta nem violeta saturado
// (são do capítulo 1). O azul da tinta (SOAK) fica só nas camadas do encharcado; a água do capítulo é
// verde-água. Nada de bule, xícara, relógio, candelabro, aranha, cogumelo nem flor falante.

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

// ---------------------------------------------------------------- vaga-lume (traça)

const TRACA_FRAMES = 3;
const TRACA_VB = '30 60 200 95';
const LARANJA = '#f27b1d';
const LARANJA_ESCURO = '#a5400c';
const ELITRO = '#5b3b2e';
const ELITRO_ESCURO = '#33201a';
const LUME = '#cfe83a';
const LUME_ESCURO = '#86a312';
const LUME_LUZ = '#f3ff9a';
const VAGALUME_LW = lw(0.19);
const CABECA_VL = 'M158 89 Q184 89 184 115 Q184 141 158 141 Q133 141 133 115 Q133 89 158 89 Z';

/** Abdômen aceso (atrás, à esquerda), com os gomos e o halo de luz. `forte` é o pisca do aviso. */
function abdomen(w: number, forte: boolean): string {
  const d = 'M112 112 Q104 100 82 102 Q56 104 54 124 Q54 142 80 143 Q104 143 112 130 Z';
  const halo = forte
    ? `<circle cx="80" cy="122" r="44" fill="${LUME_LUZ}" opacity="0.45"/><circle cx="80" cy="122" r="31" fill="${LUME_LUZ}" opacity="0.75"/>`
    : `<ellipse cx="80" cy="123" rx="36" ry="27" fill="${LUME_LUZ}" opacity="0.4"/>`;
  return (
    halo +
    shaded(
      d,
      forte ? LUME_LUZ : LUME,
      `<ellipse cx="86" cy="148" rx="36" ry="13" fill="${forte ? LUME : LUME_ESCURO}"/>`,
      w,
      'ja-abdomen',
    ) +
    line('M70 104.5 Q64 124 70 142 M88 102.5 Q83 122 89 143', 2.2, forte ? LUME : LUME_ESCURO) +
    shine('M62 116 Q66 108 74 106', 3, 0.85)
  );
}

/** Seis perninhas (três de cada lado); `swing` alterna os pares. */
function perninhas(swing: number): string {
  let s = '';
  [96, 116, 136].forEach((x, i) => {
    const d = i % 2 === 0 ? swing : -swing;
    s += capsule([[x - 4, 134], [x - 4 - d, 146]], 3.4, ELITRO_ESCURO, 2.2) + oval(x - 3 - d, 147, 4, 2.2, INK, 0);
  });
  return s;
}

/**
 * Vaga-lume: besourinho de capuz laranja (a cabeça), élitros castanhos dobrados nas costas e o abdômen
 * lima aceso atrás, com halo de luz, andando em seis perninhas. Travesso: olhar de lado, pálpebra
 * caída e sorriso de canto com um dentinho. `alert` é o aviso do clarão: o abdômen brilha forte, as
 * asas se abrem zumbindo e a cara é de pura alegria (olhos fechados de riso e bocão).
 */
function vagalumeSvg(frame: number, variant = 0, alert = false): string {
  const w = VAGALUME_LW;
  const t = ((frame % TRACA_FRAMES) / TRACA_FRAMES) * Math.PI * 2;
  const bob = alert ? -2 : n(1.6 * Math.sin(t));
  const swing = alert ? 0 : n(6 * Math.cos(t));
  const antenas = alert
    ? capsule([[150, 92], [146, 78], [138, 70]], 2.4, ELITRO_ESCURO, 1.8) +
      capsule([[166, 92], [172, 78], [182, 70]], 2.4, ELITRO_ESCURO, 1.8) +
      oval(137, 69, 4, 4, LUME, 2) +
      oval(183, 69, 4, 4, LUME, 2)
    : capsule([[150, 92], [144, 80], [n(134 + swing * 0.4), 76]], 2.4, ELITRO_ESCURO, 1.8) +
      capsule([[166, 91], [170, 79], [n(178 - swing * 0.4), 72]], 2.4, ELITRO_ESCURO, 1.8) +
      oval(n(133 + swing * 0.4), 75, 3.6, 3.6, LUME, 2) +
      oval(n(179 - swing * 0.4), 71, 3.6, 3.6, LUME, 2);
  const elitro = 'M140 106 Q118 86 84 98 Q76 101 74 106 Q104 102 128 116 Q136 118 140 112 Z';
  const asas = alert
    ? // Asas abertas, zumbindo, por trás do corpo.
      outlined('M118 104 Q92 70 70 66 Q66 84 104 108 Z', WHITE, w * 0.7, ' opacity="0.8"') +
      outlined('M126 102 Q120 70 104 62 Q94 76 116 106 Z', WHITE, w * 0.7, ' opacity="0.8"') +
      line('M66 74 L58 70 M64 84 L56 84 M100 60 L96 52 M112 60 L114 52', 2.2)
    : '';
  const face = alert
    ? happyEye(151, 111, 7, 3.4) +
      happyEye(170, 110, 6.5, 3.4) +
      line('M143 99 Q150 95 158 98 M164 97 Q171 93 178 96', 3.2) +
      blush(146, 124, 5.5, 0.7) +
      openMouth('M148 120 Q163 124 180 117 Q178 136 164 137 Q151 136 148 120 Z', [164, 136, 7], 3) +
      outlined('M151 120.8 L177 118 L176.4 122.4 L152 124.2 Z', WHITE, 1.8)
    : eye(151, 111, 6.5, 8, [0.7, 0.1], 0.55, 3) +
      eye(169, 110, 6, 7.5, [0.7, 0.1], 0.55, 3) +
      lidOf(151, 111, 6.5, 8, LARANJA, 2.4, 0.15, 1.5) +
      lidOf(169, 110, 6, 7.5, LARANJA, 2.4, 0.15, 1.5) +
      line('M143 98 Q149 95 156 98.5 M163 97.5 Q169 94 176 96', 3.4) +
      blush(145, 124, 5, 0.6) +
      line('M151 126 Q164 133 177 122', 3.8) +
      outlined('M166 129 L166.5 134 L171.5 132.5 L170.5 128 Z', WHITE, 2);
  const brilhos = alert
    ? [0, 45, 90, 135, 180, 225, 270, 315]
        .map((a) => {
          const r = (a * Math.PI) / 180;
          const [c, s] = [Math.cos(r), Math.sin(r)];
          return capsule([[n(80 + 47 * c), n(122 + 30 * s)], [n(80 + 56 * c), n(122 + 36 * s)]], 2.4, LUME_LUZ, 1.4);
        })
        .join('')
    : '';
  return svgDoc(
    TRACA_VB,
    `<ellipse cx="112" cy="149" rx="58" ry="5" fill="${INK}" opacity="0.14"/>` +
      brilhos +
      perninhas(swing) +
      `<g transform="translate(0 ${bob})">` +
      asas +
      abdomen(w, alert) +
      // Tórax entre o abdômen e a cabeça.
      oval(124, 122, 18, 15, ELITRO_ESCURO, w) +
      shaded(elitro, ELITRO, `<path d="M74 110 Q104 104 140 116 L140 130 L74 130 Z" fill="${ELITRO_ESCURO}"/>`, w, 'ja-elitro') +
      shine('M88 99 Q104 94 120 97', 2.4, 0.6) +
      antenas +
      shaded(CABECA_VL, LARANJA, `<ellipse cx="160" cy="146" rx="30" ry="14" fill="${LARANJA_ESCURO}"/>`, w, 'ja-cabeca-vl') +
      shine('M139 104 Q142 96 150 93', 3.2, 0.75) +
      face +
      `</g>`,
    variant,
  );
}

function vagalumeSoakSvg(variant = 0): string {
  return svgDoc(
    TRACA_VB,
    soakLayer(
      'M54 126 Q66 119 80 123 Q96 116 112 121 Q126 115 140 120 Q156 113 184 119 Q184 141 158 141 L80 143 Q54 142 54 126 Z',
      'M62 129 Q74 125 88 127',
      VAGALUME_LW,
    ) + drips([[86, 149, 2.6], [124, 151, 2.2], [164, 149, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- sapo-bolha (saltador)

const SALTADOR_VB = '60 40 84 110';
const SAPO = '#3faa45';
const SAPO_ESCURO = '#1d6a33';
const SAPO_BARRIGA = '#e9df6a';
const BOLHA = '#d9fbf6';
const BOLHA_REFLEXO = '#ff9f7a';
const SAPO_LW = lw(0.3);
const CORPO_SAPO = 'M76 114 Q70 94 80 80 Q90 68 106 68 Q124 68 132 82 Q140 98 132 114 Q128 122 116 122 L88 122 Q78 122 76 114 Z';

/** Corpo do sapo (pata de trás dobrada, corpo, barriga, olhos saltados) com a cara por cima. */
function sapoCorpo(w: number, face: string, cheek = ''): string {
  return (
    // Coxa da pata de trás, dobrada.
    oval(84, 108, 13, 11, SAPO_ESCURO, w) +
    shaded(
      CORPO_SAPO,
      SAPO,
      `<ellipse cx="114" cy="112" rx="20" ry="13" fill="${SAPO_BARRIGA}"/><ellipse cx="94" cy="128" rx="30" ry="9" fill="${SAPO_ESCURO}"/>`,
      w,
      'ja-sapo',
    ) +
    // Pintas nas costas.
    `<circle cx="84" cy="90" r="3.4" fill="${SAPO_ESCURO}"/><circle cx="92" cy="80" r="2.4" fill="${SAPO_ESCURO}"/>` +
    oval(94, 66, 11, 10.5, SAPO, w) +
    oval(118, 65, 11, 10.5, SAPO, w) +
    shine('M82 96 Q83 86 90 80', 2.6, 0.75) +
    cheek +
    face
  );
}

/**
 * Sapo-bolha: sapo verde-folha do lago, de barriga amarela, pintas escuras e olhos saltados no alto.
 * Sentado de pata dobrada, com cara de bobo contente (sorrisão de sapo). `charge` é o aviso da bolha:
 * as bochechas estufam enormes e uma bolha de sabão começa a sair dos lábios. No ar, as patas esticam.
 */
function sapoSvg(air: boolean, variant = 0, charge = false): string {
  const w = SAPO_LW;
  let face: string;
  let legs: string;
  let extra = '';
  let cheek = '';
  let pose = '';
  if (charge) {
    pose = 'translate(0 3)';
    legs =
      capsule([[86, 118], [80, 128], [86, 130]], 4, SAPO_ESCURO, w) +
      capsule([[114, 118], [116, 129]], 4, SAPO_ESCURO, w) +
      oval(82, 131.5, 8, 3.4, SAPO_ESCURO, w * 0.6) +
      oval(119, 131, 6.5, 3.2, SAPO_ESCURO, w * 0.6);
    // Bochechas estufadas, quase do tamanho do corpo.
    cheek = oval(124, 98, 17, 14, SAPO, w) + shine('M116 88 Q122 85 128 87', 2.4, 0.8) + blush(122, 100, 6, 0.7);
    face =
      eye(94, 65, 6.5, 6.5, [0.6, 0.2], 0.6, 2) +
      eye(118, 64, 6.5, 6.5, [0.6, 0.2], 0.6, 2) +
      lidOf(94, 65, 6.5, 6.5, SAPO, 2, 0.3, 1) +
      lidOf(118, 64, 6.5, 6.5, SAPO, 2, 0.3, 1) +
      // Biquinho soprando.
      oval(139, 101, 2.8, 3.6, PALETTE.vermelhoBoca, 1.8);
    extra =
      `<circle cx="136" cy="88" r="7.5" fill="${BOLHA}" opacity="0.75" stroke="${INK}" stroke-width="1.8"/>` +
      `<path d="M131 91 Q131 84 137 82.5" fill="none" stroke="${BOLHA_REFLEXO}" stroke-width="1.4" stroke-linecap="round"/>` +
      shine('M139 84.5 L140.5 86', 1.8, 1) +
      line('M64 92 L69 93 M64 102 L69 101', 2.2);
  } else if (air) {
    legs =
      capsule([[86, 116], [76, 128], [70, 140]], 5, SAPO_ESCURO, w) +
      capsule([[116, 118], [122, 130]], 4, SAPO_ESCURO, w) +
      oval(68, 143, 6, 3.6, SAPO_ESCURO, w * 0.6) +
      oval(124, 133, 5, 3.2, SAPO_ESCURO, w * 0.6);
    face =
      eye(94, 65, 6.5, 7.5, [0.4, -0.3], 0.5, 2) +
      eye(118, 64, 6.5, 7.5, [0.4, -0.3], 0.5, 2) +
      openMouth('M100 92 Q116 90 130 88 Q127 104 115 104 Q104 103 100 92 Z', [115, 103, 6], 2);
  } else {
    legs =
      capsule([[90, 118], [86, 129]], 4, SAPO_ESCURO, w) +
      capsule([[116, 118], [118, 129]], 4, SAPO_ESCURO, w) +
      oval(84, 131, 8, 3.4, SAPO_ESCURO, w * 0.6) +
      oval(120, 131, 7, 3.2, SAPO_ESCURO, w * 0.6);
    face =
      eye(94, 65, 6.5, 7.5, [0.3, 0.1], 0.5, 2) +
      eye(118, 64, 6.5, 7.5, [0.1, 0.2], 0.5, 2) +
      line('M98 90 Q116 100 133 86', 2.6) +
      line('M96 88 L99 91 M131 84 L134 87', 2.2) +
      blush(126, 96, 4.4, 0.65) +
      `<circle cx="125" cy="78" r="1.3" fill="${INK}"/><circle cx="130" cy="77" r="1.3" fill="${INK}"/>`;
  }
  return svgDoc(
    SALTADOR_VB,
    (air ? '' : `<ellipse cx="103" cy="135" rx="30" ry="3.5" fill="${INK}" opacity="0.14"/>`) +
      `<g transform="${pose}">${legs}${sapoCorpo(w, face, cheek)}</g>` +
      extra,
    variant,
  );
}

function sapoSoakSvg(variant = 0): string {
  return svgDoc(
    SALTADOR_VB,
    soakLayer('M72 100 Q84 94 96 98 Q110 92 122 97 Q132 93 136 97 Q136 108 132 114 Q128 122 116 122 L88 122 Q78 122 76 114 Q72 108 72 100 Z', 'M79 104 L80 113', SAPO_LW) +
      drips([[88, 128, 2.4], [118, 129, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- besouro-do-orvalho (grampo)

const GRAMPO_FRAMES = 3;
const GRAMPO_VB = '4 6 92 86';
const PETROLEO = '#1d7fa0';
const PETROLEO_ESCURO = '#0f4a62';
const PETROLEO_CLARO = '#6cc6dc';
const OCRE = '#e7a826';
const ORVALHO = '#bff4ee';
const BESOURO_LW = lw(0.24);
const CASCO = 'M16 74 Q14 36 44 32 Q70 30 74 56 L74 74 Z';

/**
 * Besouro-do-orvalho: besouro redondo de casco azul-petróleo com a borda ocre e duas pintas claras,
 * cabeça grande na frente com um chifrinho onde fica pendurada uma gota de orvalho. Corre reto em seis
 * perninhas (as de trás mais escuras) e é teimoso: pálpebras baixas, cenho firme e beicinho.
 * `frame` troca as pernas.
 */
function besouroSvg(frame: number, variant = 0): string {
  const swing = [-6, 0, 6][frame % GRAMPO_FRAMES]!;
  const w = BESOURO_LW;
  let legs = '';
  [24, 40, 56].forEach((x, i) => {
    const d = i % 2 === 0 ? swing : -swing;
    // Par de trás (escuro) e par da frente.
    legs += capsule([[x + 4, 72], [x + 4 + d * 0.8, 85]], 3.6, PETROLEO_ESCURO, w * 0.6);
    legs += capsule([[x, 72], [x - d, 86]], 3.6, INK, w * 0.4) + oval(x - d + 1.5, 87, 4.5, 2.4, INK, 0);
  });
  const bob = frame % 2 === 0 ? 0 : -1.2;
  return svgDoc(
    GRAMPO_VB,
    `<ellipse cx="48" cy="89" rx="32" ry="3" fill="${INK}" opacity="0.14"/>` +
      legs +
      `<g transform="translate(0 ${bob})">` +
      // Barriga ocre por baixo do casco.
      outlined('M18 70 L76 70 Q78 78 70 79 L22 79 Q16 78 18 70 Z', OCRE, w) +
      shaded(CASCO, PETROLEO, `<ellipse cx="44" cy="80" rx="34" ry="12" fill="${PETROLEO_ESCURO}"/>`, w, 'ja-casco') +
      // Divisão dos élitros e pintas claras.
      line('M44 33 Q34 52 32 73', 1.8, PETROLEO_ESCURO) +
      oval(26, 52, 4.2, 3.6, PETROLEO_CLARO, 1.6) +
      oval(44, 46, 3.4, 3, PETROLEO_CLARO, 1.6) +
      shine('M22 50 Q24 40 34 36', 2.6, 0.8) +
      // Chifrinho com a gota de orvalho.
      capsule([[74, 46], [80, 34], [86, 30]], 3.2, PETROLEO_ESCURO, w * 0.6) +
      `<path d="M86 31 Q81 38 83 41 Q86 44 89 41 Q91 38 86 31 Z" fill="${ORVALHO}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      shine('M85 38 L85 39.5', 1.4, 1) +
      // Cabeça.
      shaded('M72 44 Q88 44 88 60 Q88 76 72 76 Q56 76 56 60 Q56 44 72 44 Z', PETROLEO, `<ellipse cx="74" cy="80" rx="18" ry="9" fill="${PETROLEO_ESCURO}"/>`, w, 'ja-cabeca-bs') +
      eye(66, 58, 4.6, 5.2, [0.6, 0.35], 0.58, 1.5) +
      eye(79, 57.5, 4.4, 5, [0.6, 0.35], 0.58, 1.5) +
      lidOf(66, 58, 4.6, 5.2, PETROLEO, 1.4, 0.0, 0.6) +
      lidOf(79, 57.5, 4.4, 5, PETROLEO, 1.4, 0.0, -0.6) +
      line('M60 50.5 L71 53 M85 50 L75 53', 2.6) +
      blush(62, 66, 2.6, 0.6) +
      // Beicinho teimoso.
      line('M69 69 Q74 66 80 68.5', 2.2) +
      `</g>`,
    variant,
  );
}

function besouroSoakSvg(variant = 0): string {
  return svgDoc(
    GRAMPO_VB,
    soakLayer('M15 60 Q24 54 34 58 Q44 52 54 57 Q64 52 74 56 Q82 54 88 59 Q88 76 72 78 L22 79 Q15 78 15 60 Z', 'M20 64 L21 72', BESOURO_LW) +
      drips([[34, 85, 2], [62, 86, 1.7]]),
    variant,
  );
}

// ---------------------------------------------------------------- sino-dos-ventos (fiandeira)

const FIANDEIRA_VB = '-6 0 112 104';
const SINO = '#e3a21c';
const SINO_ESCURO = '#99620a';
const VERDETE = '#1fa38c';
const VERDETE_ESCURO = '#0d5e52';
const TIRA = '#d8323e';
const TIRA_ESCURA = '#851a28';
const SINO_LW = lw(0.42);
const SINO_D = 'M50 32 Q37 32 35.5 46 Q34.5 57 29 63 Q28 67 32 67 L68 67 Q72 67 71 63 Q65.5 57 64.5 46 Q63 32 50 32 Z';

/**
 * Sino-dos-ventos: sininho ocre de jardim, pendurado por um fio que chega ao topo (por trás, até o
 * centro), com uma argola em cima, quatro tubinhos de verdete pendurados na boca e uma tira de papel
 * carmim no badalo. De pé, porque as mesmas poses servem quando ele anda sem o fio. Matreiro: olhar de
 * lado, pálpebra meio caída e sorrisinho de canto. `frame` balança os tubos e a tira. Centro em (50, 54).
 */
function sinoSvg(frame: number, variant = 0): string {
  const w = SINO_LW;
  const a = frame % 2 === 0 ? -9 : 9;
  const tubos: ReadonlyArray<readonly [number, number]> = [
    [35, 15],
    [44, 21],
    [56, 19],
    [65, 13],
  ];
  let t = '';
  for (const [x, len] of tubos) {
    t +=
      line(`M${x} 66 L${x} 71`, 1.2) +
      `<g>${outlined(`M${x - 2.6} 71 L${x + 2.6} 71 L${x + 2.6} ${71 + len} L${x - 2.6} ${71 + len} Z`, VERDETE, w * 0.55)}` +
      line(`M${x - 0.8} 73 L${x - 0.8} ${69 + len}`, 1, VERDETE_ESCURO) +
      `</g>`;
  }
  const face =
    eye(44, 49, 4.4, 5, [0.6, 0.15], 0.58, 1.4) +
    eye(56, 48.5, 4.2, 4.8, [0.6, 0.15], 0.58, 1.4) +
    lidOf(44, 49, 4.4, 5, SINO, 1.2, 0.2, 0.8) +
    lidOf(56, 48.5, 4.2, 4.8, SINO, 1.2, 0.2, 0.8) +
    blush(39.5, 56, 2.6, 0.7) +
    line('M45 57 Q51 61 58 55.5 L60 54.5', 1.6);
  return svgDoc(
    FIANDEIRA_VB,
    // Tubos e badalo balançando por baixo do sino.
    `<g transform="rotate(${a * 0.7} 50 66)">` +
      t +
      line('M50 66 L50 80', 1.2) +
      oval(50, 81, 3, 3, SINO_ESCURO, 1.4) +
      `</g>` +
      `<g transform="rotate(${a} 50 66)">` +
      outlined(`M46 84 L54 84 L${54 + a * 0.15} 98 L${50 + a * 0.15} 95 L${46 + a * 0.15} 98 Z`, TIRA, w * 0.55) +
      line(`M48 87 L52 87 M48 90 L52 90`, 1, TIRA_ESCURA) +
      `</g>` +
      // Argola do fio.
      `<circle cx="50" cy="29" r="3.4" fill="none" stroke="${INK}" stroke-width="3.6"/>` +
      `<circle cx="50" cy="29" r="3.4" fill="none" stroke="${SINO_ESCURO}" stroke-width="1.4"/>` +
      shaded(SINO_D, SINO, `<ellipse cx="54" cy="70" rx="22" ry="8" fill="${SINO_ESCURO}"/>`, w, 'ja-sino') +
      // Aba da boca do sino.
      outlined('M30 64 L70 64 Q73 64 72 67.5 L28 67.5 Q27 64 30 64 Z', SINO_ESCURO, w * 0.6) +
      shine('M39.5 44 Q41 37 46 35', 2, 0.8) +
      face,
    variant,
  );
}

function sinoSoakSvg(variant = 0): string {
  return svgDoc(
    FIANDEIRA_VB,
    soakLayer('M33 56 Q40 52 46 55 Q52 51 58 55 Q63 52 67 56 Q68 61 72 64 Q73 68 68 68 L32 68 Q27 68 28 64 Q32 61 33 56 Z', 'M34 61 L36 64', SINO_LW) +
      drips([[38, 74, 1.8], [62, 76, 1.5]]),
    variant,
  );
}

// ---------------------------------------------------------------- chafariz (tinteiro)

const TINTEIRO_VB = '6 10 92 88';
const TERRACOTA = '#cc5f34';
const TERRACOTA_ESCURA = '#7c3016';
const TERRACOTA_CLARA = '#e8875a';
const AGUA = '#38c9bd';
const AGUA_ESCURA = '#167f7a';
const ESPUMA = '#d6fbf5';
const CHAFARIZ_LW = lw(0.25);
const BACIA = 'M22 56 L82 56 Q82 62 79 64 Q78 90 52 91 Q26 90 25 64 Q22 62 22 56 Z';

/**
 * Chafariz: fonte de jardim de terracota, uma bacia gorda que é o corpo, com coluninha e tacinha em
 * cima de onde sobe um esguicho verde-água. Anda bamboleando em dois pezinhos. Atrevida: sobrancelha
 * erguida e sorriso de lado. `charge` é o aviso do esguicho por baixo da terra: a água borbulha e
 * transborda pela borda, as bochechas estufam e a cara fica decidida.
 */
function chafarizSvg(frame: number, variant = 0, charge = false): string {
  const step = frame % 2 === 0 ? 0 : 1;
  const w = CHAFARIZ_LW;
  const tilt = charge ? 0 : step === 0 ? -2.5 : 2.5;
  const pe = (x: number, lift: number) => oval(x, 93 + lift, 8, 4, TERRACOTA_ESCURA, w * 0.7);
  const esguicho = charge
    ? // Esguicho alto, transbordando.
      outlined('M49 30 Q46 18 52 11 Q58 18 55 30 Z', AGUA, w * 0.6) +
      outlined('M50 26 Q38 16 26 30 Q36 24 48 30 Z M54 26 Q66 16 78 30 Q68 24 56 30 Z', AGUA, w * 0.6) +
      `<circle cx="34" cy="16" r="2.4" fill="${AGUA}" stroke="${INK}" stroke-width="1.4"/><circle cx="72" cy="15" r="2.2" fill="${AGUA}" stroke="${INK}" stroke-width="1.4"/>`
    : outlined('M50 30 Q48 22 52 16 Q56 22 54 30 Z', AGUA, w * 0.6) +
      outlined('M50 26 Q42 18 34 28 Q42 24 49 30 Z M54 26 Q62 18 70 28 Q62 24 55 30 Z', AGUA, w * 0.6);
  const transborda = charge
    ? outlined('M20 56 Q22 50 30 52 Q36 46 44 51 Q52 45 60 51 Q68 46 74 52 Q82 50 84 56 L84 58 Q80 58 80 66 Q78 70 76 64 L76 58 L28 58 L28 68 Q26 72 24 66 Q24 58 20 58 Z', AGUA, w * 0.7) +
      `<circle cx="36" cy="49" r="2.6" fill="${ESPUMA}" stroke="${INK}" stroke-width="1.3"/><circle cx="58" cy="47" r="2" fill="${ESPUMA}" stroke="${INK}" stroke-width="1.3"/><circle cx="70" cy="50" r="2.2" fill="${ESPUMA}" stroke="${INK}" stroke-width="1.3"/>`
    : '';
  const face = charge
    ? eye(43, 68, 5.2, 5, [0.6, 0.2], 0.6, 1.8) +
      eye(62, 67, 5, 5, [0.6, 0.2], 0.6, 1.8) +
      lidOf(43, 68, 5.2, 5, TERRACOTA, 1.6, 0.3, 1.4) +
      lidOf(62, 67, 5, 5, TERRACOTA, 1.6, 0.3, 1.4) +
      line('M36 59 L49 63 M56 62 L69 58', 3) +
      // Bochechas cheias.
      oval(34, 78, 6, 5, TERRACOTA, 1.8) +
      oval(70, 77, 6, 5, TERRACOTA, 1.8) +
      blush(34, 78, 4, 0.75) +
      blush(70, 77, 4, 0.75) +
      oval(53, 80, 3.6, 3, PALETTE.vermelhoBoca, 1.8)
    : eye(43, 69, 5, 6, [0.5, 0.1], 0.55, 1.8) +
      eye(61, 68, 5, 6, [0.5, 0.1], 0.55, 1.8) +
      lidOf(43, 69, 5, 6, TERRACOTA, 1.4, 0.15, -0.6) +
      line('M37 60 L48 61 M56 59 Q62 54 69 58', 2.6) +
      blush(36, 79, 3.4, 0.6) +
      line('M45 80 Q54 85 62 79 L64.5 78', 2.4);
  return svgDoc(
    TINTEIRO_VB,
    `<ellipse cx="52" cy="95" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      pe(41, step === 0 ? 0 : -2.5) +
      pe(63, step === 0 ? -2.5 : 0) +
      `<g transform="rotate(${tilt} 52 94)">` +
      esguicho +
      // Tacinha e coluna.
      outlined('M38 30 L66 30 Q64 38 52 38 Q40 38 38 30 Z', TERRACOTA_CLARA, w * 0.75) +
      `<ellipse cx="52" cy="30.5" rx="12" ry="2" fill="${AGUA}"/>` +
      outlined('M47 37 L57 37 L58 56 L46 56 Z', TERRACOTA, w * 0.75) +
      // Bacia (o corpo).
      shaded(BACIA, TERRACOTA, `<ellipse cx="46" cy="96" rx="40" ry="12" fill="${TERRACOTA_ESCURA}"/>`, w, 'ja-bacia') +
      // Borda grossa com a água por cima.
      outlined('M19 52 Q19 50 22 50 L82 50 Q85 50 85 52 L85 58 Q85 60 82 60 L22 60 Q19 60 19 58 Z', TERRACOTA_CLARA, w * 0.8) +
      `<path d="M24 51.5 L80 51.5" stroke="${AGUA}" stroke-width="2.4" stroke-linecap="round"/>` +
      shine('M27 66 Q28 76 33 83', 2.8, 0.75) +
      line('M24 55 L80 55', 1.2, TERRACOTA) +
      transborda +
      face +
      `</g>`,
    variant,
  );
}

function chafarizSoakSvg(variant = 0): string {
  return svgDoc(
    TINTEIRO_VB,
    soakLayer('M24 72 Q34 66 44 70 Q54 64 64 69 Q73 65 80 69 Q78 90 52 91 Q26 90 24 72 Z', 'M29 76 Q30 82 34 86', CHAFARIZ_LW) +
      drips([[40, 97, 1.8], [64, 97, 1.5]]),
    variant,
  );
}

// ---------------------------------------------------------------- sombrinha (borracha)

const BORRACHA_VB = '2 14 106 80';
const CARMIM = '#d22a3e';
const CARMIM_ESCURO = '#801628';
const FORRO = '#f06a5a';
const BAMBU = '#d99a2b';
const BAMBU_ESCURO = '#8a5a12';
const SOMBRINHA_LW = lw(0.23);
/** Copa aberta, vista de três quartos: o lado de fora bojudo vira para a direita (o escudo). */
const COPA = 'M54 16 Q84 16 96 34 Q102 44 104 51 Q102 58 96 68 Q84 86 54 86 Z';
/** Boca da copa (o lado de dentro, com as varetas e a cara). */
const BOCA_COPA = { cx: 54, cy: 51, rx: 20, ry: 35 };

/**
 * Sombrinha: guarda-sol de papel carmim, aberto e virado para a direita como um escudo (o papel
 * esticado barra a tinta de frente). Atrás, à esquerda, aparece o lado de dentro, com as varetas de
 * bambu saindo do miolo e a cara; o cabo de bambu desce para trás e faz de perna, com o gancho no
 * chão, e um pezinho sob a copa. Zangada: pálpebras em V e dentes cerrados. Olha para a direita.
 */
function sombrinhaSvg(variant = 0): string {
  const w = SOMBRINHA_LW;
  const { cx, cy, rx, ry } = BOCA_COPA;
  // Pontas das varetas na borda da boca, de cima para baixo, pelo lado de trás (esquerdo).
  const pontas: Array<[number, number]> = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    pontas.push([cx - rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  // Por dentro, as varetas saem do miolo e param antes da cara.
  let varetas = '';
  for (const [ex, ey] of pontas) varetas += `M${n(cx + (ex - cx) * 0.62)} ${n(cy + (ey - cy) * 0.62)} L${n(ex)} ${n(ey)} `;
  // Por fora, as varetas aparecem pelo papel e se juntam na ponteira.
  let costelas = '';
  for (const [, ey] of pontas.slice(1, -1)) {
    costelas += `M${n(cx + 10)} ${n(cy + (ey - cy) * 0.92)} Q${n(cx + 38)} ${n(cy + (ey - cy) * 0.6)} 104 ${cy} `;
  }
  // Boca em recortes (o papel entre as varetas), fechada pelo lado da frente.
  let borda = `M${n(pontas[0]![0])} ${n(pontas[0]![1])} `;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / 8) * Math.PI;
    const [x1, y1] = pontas[i + 1]!;
    borda += `Q${n(cx - rx * Math.cos(a) * 0.78)} ${n(cy + ry * Math.sin(a) * 0.84)} ${n(x1)} ${n(y1)} `;
  }
  borda += `Q${n(cx + rx * 0.95)} ${cy} ${n(pontas[0]![0])} ${n(pontas[0]![1])} Z`;
  const bicos = pontas.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="1.9" fill="${BAMBU}" stroke="${INK}" stroke-width="1.2"/>`).join('');
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="55" cy="90" rx="44" ry="3" fill="${INK}" opacity="0.14"/>` +
      // Cabo de bambu: sai do miolo, desce para trás e termina no gancho, no chão.
      capsule([[54, 52], [30, 60], [22, 76], [24, 86], [32, 88], [36, 84]], 4.6, BAMBU, w * 0.75) +
      line('M27 68 L31 70 M22.5 80 L26.5 80.5', 1.6, BAMBU_ESCURO) +
      // Pezinho sob a copa.
      capsule([[64, 84], [66, 88]], 4, BAMBU, w * 0.6) +
      oval(68, 89, 6.5, 3, INK, 0) +
      // Lado de fora da copa: papel carmim com as varetas aparecendo e o bojo escuro embaixo.
      shaded(COPA, CARMIM, `<ellipse cx="86" cy="86" rx="34" ry="18" fill="${CARMIM_ESCURO}"/>`, w, 'ja-copa') +
      line(costelas, 1.6, CARMIM_ESCURO) +
      shine('M70 20 Q86 23 94 33', 3, 0.8) +
      // Ponteira de bambu na frente.
      capsule([[104, 51], [108, 51]], 3.4, BAMBU, w * 0.6) +
      // Lado de dentro.
      outlined(borda, FORRO, w) +
      line(varetas, 1.6, BAMBU) +
      bicos +
      // Cara zangada no miolo.
      eye(48, 44, 5, 6, [0.5, 0.2], 0.58, 1.8) +
      eye(62, 43.5, 4.8, 6, [0.5, 0.2], 0.58, 1.8) +
      lids('M42 41.5 L53.6 44 L53.6 37 L42 36 Z M57 43 L67 40 L67 35 L57 36 Z', FORRO, 1.5) +
      line('M41.5 41 L54 44.4 M57 43.4 L68 39.6', 3) +
      outlined('M44 58.5 L64 57.5 L63.5 65 L45 66 Z', WHITE, 1.8) +
      line('M49 58.3 L49 65.8 M54 58 L54 65.5 M59 57.8 L59 65.3 M44.5 62.2 L63.8 61.3', 1.2) +
      blush(41, 52, 3.4, 0.6),
    variant,
  );
}

/**
 * Sombrinha fechada: a copa enrolada no cabo, de pé como um charuto carmim com a fita amarrada, a
 * ponteira em cima e o gancho do cabo embaixo. É o instante vulnerável antes de abrir de novo: cara
 * de susto e esforço (olhos arregalados, boquinha apertada, gotas de suor) e tremedeira. Mesmo quadro
 * e apoio da pose aberta.
 */
export function sombrinhaFechadaSvg(variant = 0): string {
  const w = SOMBRINHA_LW;
  const corpo = 'M56 18 Q62 30 70 48 Q76 64 72 80 Q66 86 56 86 Q46 86 40 80 Q36 64 42 48 Q50 30 56 18 Z';
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="55" cy="90" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      // Gancho do cabo e pezinho.
      capsule([[50, 84], [48, 88], [42, 89], [38, 86]], 4.2, BAMBU, w * 0.7) +
      capsule([[62, 84], [64, 88]], 4, BAMBU, w * 0.6) +
      oval(66, 89, 6, 3, INK, 0) +
      // Ponteira.
      capsule([[56, 18], [56, 15]], 3.4, BAMBU, w * 0.6) +
      shaded(corpo, CARMIM, `<ellipse cx="62" cy="90" rx="26" ry="14" fill="${CARMIM_ESCURO}"/>`, w, 'ja-fechada') +
      // Dobras do papel enrolado.
      line('M52 26 Q46 46 44 78 M60 26 Q66 46 68 78', 1.6, CARMIM_ESCURO) +
      shine('M46 52 Q48 40 52 32', 2.8, 0.8) +
      // Fita amarrada.
      outlined('M41 70 L71 70 L71.5 75 L40.5 75 Z', BAMBU, w * 0.6) +
      outlined('M69 72 L80 66 L80 78 Z', BAMBU, w * 0.5) +
      // Cara de susto e esforço.
      eye(50, 50, 6, 7, [0.2, -0.1], 0.36, 1.8) +
      eye(63, 49.5, 5.6, 6.6, [0.2, -0.1], 0.36, 1.8) +
      line('M43 39 Q49 35 55 39 M58 38 Q64 34 70 38', 2.6) +
      oval(57, 63, 3.6, 2.6, PALETTE.vermelhoBoca, 1.8) +
      blush(45, 60, 3.2, 0.7) +
      blush(68, 59, 3.2, 0.7) +
      // Suor e tremedeira.
      `<path d="M76 34 Q73 39 75 41 Q78 42 78.5 39 Q78.5 37 76 34 Z" fill="${ORVALHO}" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M37 42 Q34 47 36 49 Q39 50 39.5 47 Q39.5 45 37 42 Z" fill="${ORVALHO}" stroke="${INK}" stroke-width="1.4"/>` +
      line('M28 54 L33 55 M27 64 L32 64 M80 52 L85 51 M81 62 L86 63', 2.2),
    variant,
  );
}

function sombrinhaSoakSvg(variant = 0): string {
  return svgDoc(
    BORRACHA_VB,
    soakLayer('M34 62 Q46 56 58 60 Q72 54 86 60 Q96 56 102 62 Q96 78 86 82 Q72 88 54 86 Q36 86 34 62 Z', 'M39 68 L40 78', SOMBRINHA_LW) +
      drips([[40, 92, 1.8], [72, 92, 1.5]]),
    variant,
  );
}

export const PELE_JARDIM: Pele = {
  id: 'jardim',
  traca: vagalumeSvg,
  tracaTinta: vagalumeSoakSvg,
  saltador: sapoSvg,
  saltadorTinta: sapoSoakSvg,
  grampo: besouroSvg,
  grampoTinta: besouroSoakSvg,
  fiandeira: sinoSvg,
  fiandeiraTinta: sinoSoakSvg,
  tinteiro: chafarizSvg,
  tinteiroTinta: chafarizSoakSvg,
  borracha: sombrinhaSvg,
  borrachaTinta: sombrinhaSoakSvg,
  cuspe: cuspeSvg,
};
