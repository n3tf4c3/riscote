import { BOSS_VB, type BossPose } from './boss';
import { GRAFITE, METAL, METAL_SOMBRA } from './oficina-poderes';
import type { PeleChefe } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, outlined, oval, shine, svgDoc } from './svg';

// A Lapiseira, chefe da Oficina Mágica: uma lapiseira de desenho técnico, gigante e viva, que rabisca
// sozinha. Para caber na caixa de 4 × 3 células, ela é baixinha e gorducha e fica deitada, de pé em
// duas perninhas: o corpo de plástico verde-azulado à esquerda, com o botão de apertar de metal na
// ponta de trás e o prendedor (o clipe) por cima, o anel de borracha laranja com os frisos, o cone de
// metal e a ponta de grafite, que é o nariz, apontando para a direita. A cara fica no corpo. Mesmo
// quadro do Mata-Borrão (`BOSS_VB`, apoio em (150, 225), corpo na caixa de 300 × 225; o clipe e o
// grafite passam por cima). Plástico e metal, sem madeira (não é o lápis do caderno nem o
// Apontador). O verde-azulado saturado salta da parede kraft; o azul da tinta só aparece no pesado.

const LW = 7;
const CORPO_COR = '#17a398';
const CORPO_SOMBRA = '#0f7570';
const CORPO_LUZ = '#7fe0d2';
const BORRACHA = '#ff7a1f';
const BORRACHA_SOMBRA = '#c4520f';
const METAL_LUZ = '#eef1f6';
const GRAFITE_SOMBRA = '#3a3e48';
const GRAFITE_LUZ = '#a9afba';
const SAPATO = '#3a3e48';
const BOCA = '#5a1f2c';
const TINTA = PALETTE.azul;
const TINTA_SOMBRA = '#2456ad';
const TINTA_CLARA = '#8fc0ff';

/** Corpo: cilindro deitado de cantos arredondados. */
const CORPO = 'M50 72 L176 72 Q200 72 200 96 L200 168 Q200 192 176 192 L50 192 Q26 192 26 168 L26 96 Q26 72 50 72 Z';
const EYES: Array<[number, number]> = [
  [96, 120],
  [154, 116],
];
/** Onde o grafite sai da ponteira. */
const PONTA: [number, number] = [284, 132];

const f = (v: number) => v.toFixed(1);

/** Sinal de perigo: estrelinha amarela. */
function star(x: number, y: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`;
  });
  return outlined(`M${pts.join(' L')} Z`, PALETTE.amarelo, 4);
}

/** Olho em espiral (derrotada). */
function espiral(x: number, y: number): string {
  return (
    oval(x, y, 20, 20, WHITE, 5) +
    line(`M${x} ${y} Q${x + 6} ${y - 2} ${x + 5} ${y + 5} Q${x} ${y + 12} ${x - 8} ${y + 4} Q${x - 12} ${y - 8} ${x} ${y - 11} Q${x + 13} ${y - 10} ${x + 13} ${y + 2}`, 4)
  );
}

/**
 * O grafite saindo da ponteira, em coordenadas locais (sai por +x): `len` de comprimento, girado
 * `rot` graus. `quebrado`: a ponta partiu e ficou o toco lascado.
 */
function grafite(len: number, rot: number, quebrado = false): string {
  const d = quebrado ? 'M0 -7 L8 -7 L12 -3 L8 0 L13 4 L9 7 L0 7 Z' : `M0 -7 L${len - 13} -7 L${len} 0 L${len - 13} 7 L0 7 Z`;
  return (
    `<g transform="translate(${PONTA[0]} ${PONTA[1]}) rotate(${rot})">` +
    outlined(d, GRAFITE, 4.5) +
    (quebrado ? '' : line(`M2 -2.5 L${len - 15} -2.5`, 2.5, GRAFITE_LUZ)) +
    `</g>`
  );
}

/** Cone de metal e ponteira; o grafite vai por cima. */
function ponteira(): string {
  const cone = 'M232 92 L268 120 Q272 123 272 127 L272 137 Q272 141 268 144 L232 172 Z';
  return (
    `<clipPath id="lp-cone"><path d="${cone}"/></clipPath>` +
    `<path d="${cone}" fill="${METAL}"/>` +
    `<g clip-path="url(#lp-cone)"><path d="M220 140 L280 136 L280 180 L220 180 Z" fill="${METAL_SOMBRA}"/></g>` +
    // Frisos do cone.
    line('M246 104 L246 160 M258 113 L258 151', 3.5, METAL_SOMBRA) +
    `<path d="${cone}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    shine('M238 104 L262 122', 4, 0.9) +
    // Tubinho da ponteira.
    outlined('M270 124 L286 125 L286 139 L270 140 Z', METAL_SOMBRA, 5)
  );
}

/** Anel de borracha laranja com os frisos, entre o corpo e o cone. */
function anel(heavy: boolean): string {
  const d = 'M196 80 L228 84 Q236 85 236 94 L236 170 Q236 179 228 180 L196 184 Z';
  let frisos = '';
  for (let x = 204; x <= 228; x += 8) frisos += `M${x} ${84 + (x - 196) * 0.12} L${x} ${180 - (x - 196) * 0.12} `;
  return (
    `<clipPath id="lp-anel"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${BORRACHA}"/>` +
    `<g clip-path="url(#lp-anel)"><path d="M190 158 L240 156 L240 190 L190 190 Z" fill="${heavy ? TINTA_SOMBRA : BORRACHA_SOMBRA}"/></g>` +
    line(frisos, 3.5, BORRACHA_SOMBRA) +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    shine('M204 92 L226 94', 3.5, 0.8)
  );
}

/** Botão de apertar na ponta de trás e o anel de metal que o segura. `dx`: afundado (> 0) ou saltado (< 0). */
function botao(dx: number): string {
  return (
    outlined(`M${-4 + dx} 108 L${14 + dx} 108 L${14 + dx} 156 L${-4 + dx} 156 Q${-9 + dx} 156 ${-9 + dx} 150 L${-9 + dx} 114 Q${-9 + dx} 108 ${-4 + dx} 108 Z`, METAL, 6) +
    line(`M${-3 + dx} 148 L${10 + dx} 148`, 3.5, METAL_SOMBRA) +
    shine(`M${-4 + dx} 116 L${6 + dx} 116`, 3, 0.9) +
    // Anel de metal na traseira.
    outlined('M14 90 L30 86 L30 178 L14 174 Q8 172 8 166 L8 98 Q8 92 14 90 Z', METAL, 6) +
    line('M10 158 L28 160', 3.5, METAL_SOMBRA) +
    shine('M14 98 L14 128', 3, 0.9)
  );
}

/**
 * Clipe de metal: a cinta em volta do corpo, perto da traseira, e a lâmina que corre por cima e
 * encosta no corpo na ponta. `torto`: na derrota a lâmina entorta para cima.
 */
function clipe(torto: boolean): string {
  const d = torto ? 'M46 66 Q110 46 160 18' : 'M46 64 L168 62 Q186 62 188 78';
  return (
    `<g clip-path="url(#lp-corpo)">` +
    `<rect x="36" y="64" width="20" height="136" fill="${METAL}" stroke="${INK}" stroke-width="6"/>` +
    line('M40 72 L40 190', 3, METAL_LUZ) +
    `</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${METAL}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>` +
    (torto ? oval(160, 18, 9, 9, METAL, 5) : oval(188, 78, 8, 8, METAL, 5) + line('M58 58 L162 57', 3, METAL_LUZ))
  );
}

/** Olhos grandes, um jeito por pose. */
function olhos(pose: BossPose): string {
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  switch (pose) {
    case 'golpe':
      return line(`M${lx - 16} ${ly - 13} L${lx + 10} ${ly} L${lx - 16} ${ly + 13} M${rx + 16} ${ry - 13} L${rx - 10} ${ry} L${rx + 16} ${ry + 13}`, 8);
    case 'derrota':
      return EYES.map(([x, y]) => espiral(x, y)).join('');
    case 'raiva':
      return eye(lx, ly + 3, 20, 15, [0.7, 0.3], 0.5, 5) + eye(rx, ry + 3, 20, 15, [0.7, 0.3], 0.5, 5);
    case 'salto':
      return eye(lx, ly - 2, 21, 24, [0.5, -0.5], 0.46, 5) + eye(rx, ry - 2, 21, 24, [0.5, -0.5], 0.46, 5);
    case 'grito':
      return eye(lx, ly - 2, 22, 24, [0.3, 0], 0.3, 5) + eye(rx, ry - 2, 22, 24, [0.3, 0], 0.3, 5);
    case 'pesado':
      return EYES.map(
        ([x, y]) =>
          eye(x, y, 20, 20, [0.2, 0.7], 0.5, 5) +
          outlined(`M${x - 22} ${y + 5} Q${x - 21} ${y - 22} ${x} ${y - 22} Q${x + 21} ${y - 22} ${x + 22} ${y + 5} Q${x} ${y} ${x - 22} ${y + 5} Z`, CORPO_SOMBRA, 5),
      ).join('');
    default:
      // Desenhista exibida: olhar de lado, de pálpebra meio baixa, mirando a folha.
      return EYES.map(
        ([x, y]) =>
          eye(x, y, 20, 21, [0.7, 0.25], 0.52, 5) +
          outlined(`M${x - 22} ${y - 4} Q${x - 21} ${y - 23} ${x} ${y - 23} Q${x + 21} ${y - 23} ${x + 22} ${y - 4} Q${x} ${y - 9} ${x - 22} ${y - 4} Z`, CORPO_SOMBRA, 5),
      ).join('');
  }
}

/** Sobrancelhas de grafite (traço de lápis grosso). */
function sobrancelhas(pose: BossPose): string {
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  switch (pose) {
    case 'raiva':
      return line(`M${lx - 24} ${ly - 32} L${lx + 20} ${ly - 13} M${rx + 24} ${ry - 32} L${rx - 20} ${ry - 13}`, 11);
    case 'salto':
    case 'grito':
      return line(`M${lx - 22} ${ly - 36} Q${lx} ${ly - 50} ${lx + 22} ${ly - 38} M${rx - 22} ${ry - 38} Q${rx} ${ry - 50} ${rx + 22} ${ry - 36}`, 10);
    case 'pesado':
      return line(`M${lx - 22} ${ly - 26} L${lx + 20} ${ly - 33} M${rx - 20} ${ry - 33} L${rx + 22} ${ry - 26}`, 9);
    case 'golpe':
      return line(`M${lx - 22} ${ly - 30} L${lx + 14} ${ly - 22} M${rx - 14} ${ry - 22} L${rx + 22} ${ry - 30}`, 9);
    case 'derrota':
      return line(`M${lx - 20} ${ly - 30} L${lx + 18} ${ly - 35} M${rx - 18} ${ry - 35} L${rx + 20} ${ry - 30}`, 8);
    default:
      // Uma sobrancelha erguida, cheia de si.
      return line(`M${lx - 20} ${ly - 30} L${lx + 18} ${ly - 27} M${rx - 20} ${ry - 32} Q${rx} ${ry - 46} ${rx + 22} ${ry - 38}`, 9);
  }
}

/** Boca aberta: fundo vinho, língua e, se pedir, um dente. */
function bocaAberta(id: string, d: string, lingua: [number, number, number], dente = ''): string {
  const [cx, cy, r] = lingua;
  return (
    `<clipPath id="lp-boca-${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${BOCA}"/>` +
    `<g clip-path="url(#lp-boca-${id})"><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f(r * 0.65)}" fill="${PALETTE.lingua}"/>` +
    (dente ? `<path d="${dente}" fill="${WHITE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '') +
    `</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
  );
}

/** A boca, uma por pose. */
function boca(pose: BossPose): string {
  switch (pose) {
    case 'grito':
      return bocaAberta('grito', 'M82 146 Q126 136 172 146 Q168 188 126 190 Q86 188 82 146 Z', [128, 186, 26], 'M100 132 L116 132 L115 158 L101 156 Z');
    case 'salto':
      return bocaAberta('salto', 'M108 160 A18 18 0 1 1 144 160 A18 18 0 1 1 108 160 Z', [126, 176, 13]);
    case 'raiva':
      return (
        outlined('M84 150 Q126 142 168 150 L164 178 Q126 186 88 180 Z', WHITE, 6) +
        line('M98 147 L99 181 M112 145 L112 183 M126 144 L126 184 M140 145 L140 183 M154 147 L153 181 M86 164 Q126 158 166 162', 4)
      );
    case 'pesado':
      return line('M90 168 Q101 157 112 168 Q123 179 134 168 Q145 157 156 168', 7);
    case 'golpe':
      return bocaAberta('golpe', 'M110 158 Q126 146 142 158 Q146 180 126 182 Q106 180 110 158 Z', [126, 180, 10]);
    case 'derrota':
      return line('M86 170 Q126 152 166 172', 7) + outlined('M132 165 Q130 194 145 192 Q158 188 151 163 Z', PALETTE.lingua, 5);
    default:
      // Sorriso convencido, com a língua no canto (concentrada no desenho).
      return bocaAberta('parado', 'M86 152 Q128 180 166 148 Q158 178 126 180 Q96 180 86 152 Z', [142, 182, 18]);
  }
}

/** Perninhas curtas de metal e sapatos; no salto elas encolhem. */
function pernas(pose: BossPose): string {
  const alto = pose === 'salto';
  const pe = (x: number, dx: number) => {
    const y = alto ? 206 : 216;
    return capsule([[x, 188], [x + dx * 0.4, y - 6]], 14, METAL_SOMBRA, 6) + outlined(`M${x + dx - 22} ${y + 8} Q${x + dx - 24} ${y - 8} ${x + dx - 4} ${y - 8} L${x + dx + 12} ${y - 6} Q${x + dx + 26} ${y - 2} ${x + dx + 24} ${y + 8} Z`, SAPATO, 6) + shine(`M${x + dx - 14} ${y - 3} L${x + dx} ${y - 3}`, 3, 0.6);
  };
  return alto ? pe(70, -8) + pe(160, -6) : pe(70, 0) + pe(160, 4);
}

/** Grafite de cada pose: [comprimento, giro, quebrado]. */
const GRAFITES: Record<BossPose, [number, number, boolean]> = {
  parado: [26, 0, false],
  raiva: [28, -6, false],
  salto: [26, -8, false],
  grito: [28, 0, false],
  pesado: [26, 40, false],
  golpe: [0, 0, true],
  derrota: [0, 18, true],
};

/** Extras de emoção: cliques, rabiscos, estrelinhas, o grafite partido voando. */
function extras(pose: BossPose): string {
  switch (pose) {
    case 'raiva':
      // Clique-clique no botão: o traçado vem aí. Veia de bravo e um rabisco de ensaio na ponta.
      return (
        line('M-2 98 L-8 88 M8 96 L10 86 M-2 166 L-8 176 M8 168 L10 178', 5) +
        line('M50 96 Q60 96 60 86 M70 86 Q70 96 80 96 M80 106 Q70 106 70 116 M60 116 Q60 106 50 106', 6, '#ffd2c2') +
        blush(70, 148, 13, 0.7) +
        line('M282 112 L300 98 L288 96 L306 80 L292 80 L308 64', 5, GRAFITE)
      );
    case 'grito':
      // Três riscos retos de grafite disparando da ponta.
      return line('M294 118 L304 86 M298 128 L308 118 M294 146 L304 174', 6, GRAFITE) + line('M280 106 L288 94 M280 158 L288 170', 4);
    case 'salto':
      return line('M40 214 L28 226 M110 204 L104 218 M196 210 L206 222', 5);
    case 'pesado':
      return (
        outlined('M300 168 Q304 176 304 180 A6 6 0 1 1 292 180 Q292 176 300 168 Z', TINTA, 4) +
        outlined('M64 62 Q70 74 70 80 A7 7 0 1 1 56 80 Q56 74 64 62 Z', '#bfe3ff', 4)
      );
    case 'golpe':
      // O grafite partiu com a pancada e voa girando; o botão saltou na mola.
      return (
        `<g transform="translate(282 62) rotate(-50) scale(1.5)">${outlined('M-14 -5 L-4 -5 L-2 -2 L-5 1 L-2 5 L-14 5 Z', GRAFITE, 4.5)}${outlined('M-4 -5 L6 -5 L14 0 L6 5 L-2 5 L-5 1 L-2 -2 Z', GRAFITE, 4.5)}</g>` +
        line('M276 96 L268 108 M296 92 L304 104 M262 84 L250 86', 4) +
        star(126, 30, 14) +
        star(196, 14, 10) +
        star(46, 26, 10) +
        oval(300, 34, 3, 3, GRAFITE, 2) +
        oval(306, 52, 2.5, 2.5, GRAFITE, 2)
      );
    case 'derrota':
      // Um montinho de pó de grafite no chão.
      return (
        `<path d="M250 224 Q262 206 280 210 Q296 212 304 224 Z" fill="${GRAFITE}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
        line('M266 214 Q276 210 286 214', 2.5, GRAFITE_LUZ) +
        star(60, 30, 12) +
        star(130, 12, 10) +
        star(204, 34, 11)
      );
    default:
      return blush(70, 148, 13) + blush(184, 142, 8) + line('M296 136 Q302 142 306 140', 3, GRAFITE);
  }
}

/** A Lapiseira numa pose. */
export function lapiseiraSvg(pose: BossPose, variant = 0): string {
  const heavy = pose === 'pesado';
  const [len, rot, quebrado] = GRAFITES[pose];
  // Pesado: a tinta sobe por dentro do corpo de plástico e pinga pelo grafite.
  const tinta = heavy
    ? `<g clip-path="url(#lp-corpo)">` +
      `<path d="M0 124 Q40 112 84 124 T170 122 T220 118 L220 200 L0 200 Z" fill="${TINTA}"/>` +
      `<path d="M0 170 Q110 182 220 168 L220 200 L0 200 Z" fill="${TINTA_SOMBRA}"/>` +
      line('M66 136 Q70 152 66 168', 5, TINTA_CLARA) +
      `</g>`
    : '';
  const corpo =
    `<ellipse cx="146" cy="224" rx="130" ry="8" fill="${INK}" opacity="0.18"/>` +
    pernas(pose) +
    botao(pose === 'raiva' ? 10 : pose === 'golpe' ? -3 : 0) +
    // Corpo de plástico, com a barriga de sombra e o brilho comprido de cilindro.
    `<clipPath id="lp-corpo"><path d="${CORPO}"/></clipPath>` +
    `<path d="${CORPO}" fill="${CORPO_COR}"/>` +
    `<g clip-path="url(#lp-corpo)"><path d="M0 166 Q110 176 220 164 L220 200 L0 200 Z" fill="${CORPO_SOMBRA}"/>` +
    `</g>` +
    tinta +
    `<path d="${CORPO}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    shine('M64 86 L182 86', 6, 0.75) +
    line('M64 96 L120 96', 3, CORPO_LUZ) +
    anel(heavy) +
    ponteira() +
    grafite(len, rot, quebrado) +
    clipe(pose === 'derrota') +
    boca(pose) +
    olhos(pose) +
    sobrancelhas(pose) +
    extras(pose);
  // Na raiva ela se inclina para trás, tomando impulso; derrotada, tomba de nariz.
  const giro = pose === 'raiva' ? -4 : pose === 'derrota' ? 4 : 0;
  return svgDoc(BOSS_VB, giro ? `<g transform="rotate(${giro} 150 225)">${corpo}</g>` : corpo, variant);
}

/** Nuvem de pó de grafite enrolada, correndo para a direita, rente ao chão (quadro de `ondaSvg`). */
export function lapiseiraOndaSvg(variant = 0): string {
  const crista = 'M-28 0 Q-16 -4 -8 -13 Q0 -26 9 -19 Q13 -13 7 -10 Q1 -10 3 -4 Q5 0 10 0 Z';
  return svgDoc(
    '-34 -30 46 32',
    line('M-32 -12 L-24 -12 M-33 -5 L-22 -5', 1.8) +
      `<clipPath id="lp-onda"><path d="${crista}"/></clipPath>` +
      `<path d="${crista}" fill="${GRAFITE}"/>` +
      `<g clip-path="url(#lp-onda)">` +
      `<path d="M-30 0 Q-14 -4 -6 -2 Q2 -1 12 -3 L12 2 L-30 2 Z" fill="${GRAFITE_SOMBRA}"/>` +
      // Brilho de grafite na crista enrolada.
      `<path d="M-6 -15 Q0 -26 10 -20 Q14 -13 7 -10 Q2 -12 1 -16 Q-2 -14 -6 -15 Z" fill="${GRAFITE_LUZ}"/>` +
      `</g>` +
      outlined(crista, 'none', 2.2) +
      // Grãos de pó soltos atrás.
      `<circle cx="-16" cy="-14" r="1.6" fill="${GRAFITE}" stroke="${INK}" stroke-width="0.8"/>` +
      `<circle cx="-22" cy="-8" r="1.2" fill="${GRAFITE}" stroke="${INK}" stroke-width="0.7"/>` +
      `<circle cx="-11" cy="-19" r="1" fill="${GRAFITE}" stroke="${INK}" stroke-width="0.6"/>` +
      `<ellipse cx="1" cy="-12" rx="1.9" ry="2.1" fill="${WHITE}"/><ellipse cx="5.5" cy="-12.5" rx="1.7" ry="2" fill="${WHITE}"/>` +
      `<circle cx="1.5" cy="-11.8" r="1" fill="${INK}"/><circle cx="6" cy="-12.3" r="0.9" fill="${INK}"/>` +
      line('M-1 -15.4 L3 -14 M4.5 -14 L8 -16', 1.1) +
      shine('M-20 -3 Q-12 -6 -8 -10', 1.2, 0.7),
    variant,
  );
}

/** Toco de grafite caindo de ponta para baixo, com cara brava (quadro de `borraoGotaSvg`). */
export function lapiseiraGrafiteSvg(variant = 0): string {
  const corpo = 'M-9 -18 Q-9 -21 -6 -21 L6 -21 Q9 -21 9 -18 L9 3 L0 13 L-9 3 Z';
  return svgDoc(
    '-14 -26 28 40',
    line('M-5 -25.5 L-5 -23.5 M5 -25.5 L5 -23.5', 1.4) +
      `<clipPath id="lp-toco"><path d="${corpo}"/></clipPath>` +
      `<path d="${corpo}" fill="${GRAFITE}"/>` +
      `<g clip-path="url(#lp-toco)">` +
      `<path d="M3 -24 L10 -24 L10 6 L3 10 Z" fill="${GRAFITE_SOMBRA}"/>` +
      `<path d="M-10 4 L10 4 L10 18 L-10 18 Z" fill="${GRAFITE_SOMBRA}" opacity="0.6"/>` +
      `</g>` +
      `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
      shine('M-5.5 -17 L-5.5 -2', 1.8, 0.9) +
      `<ellipse cx="-3.2" cy="-8" rx="2.7" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<ellipse cx="3.6" cy="-8.2" rx="2.7" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="-2.6" cy="-7.4" r="1.4" fill="${INK}"/><circle cx="4.2" cy="-7.6" r="1.4" fill="${INK}"/>` +
      line('M-6.6 -12.6 L-1 -10.8 M7 -12.8 L1.6 -11', 1.4) +
      outlined('M-3 -1.6 Q0.4 -3.6 3.8 -1.6 Q0.4 0.6 -3 -1.6 Z', BOCA, 0.9),
    variant,
  );
}

export const CHEFE_LAPISEIRA: PeleChefe = {
  id: 'oficina',
  nome: 'A Lapiseira',
  titulo: 'LAPISEIRA',
  frase: 'ela quer riscar todo mundo da página!',
  respingo: 0x565b66,
  chefe: lapiseiraSvg,
  onda: lapiseiraOndaSvg,
  chuva: lapiseiraGrafiteSvg,
};
