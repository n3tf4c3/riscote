import { BOSS_VB, type BossPose } from './boss';
import { AGUA, AGUA_SOMBRA, ESPUMA } from './jardim-poderes';
import type { PeleChefe } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, outlined, oval, shine, svgDoc } from './svg';

// O Regador, chefe do Jardim das Lanternas: um regador de jardim antigo, gigante e vivo, de lata
// pintada de verde-esmalte, já amassada, com a tinta descascando em manchas de ferrugem e rebites na
// costura. A alça grande em arco passa por cima do corpo e carrega um ninho com um passarinho e um
// ramo de hera; a boca de encher fica no alto, à direita. O bico comprido sai do meio da cara e sobe
// para a direita, e o crivo de cobre na ponta (a "rosa" do regador) faz o nariz. Olha para a direita,
// no mesmo quadro do Mata-Borrão (`BOSS_VB`, apoio em (150, 225), corpo na caixa de 300 × 225; a alça,
// o ninho e o bico passam por cima). O verde-esmalte saturado é o complemento do céu coral e malva do
// entardecer; a água dele é verde-água (`AGUA`), e o azul da tinta dos jogadores só aparece no pesado.

const LW = 7;
const LATA = '#3d9a47';
const LATA_SOMBRA = '#2a7034';
const LATA_LUZ = '#93d36b';
const FERRUGEM = '#d4682c';
const FERRUGEM_SOMBRA = '#9c4419';
const METAL = '#c3c9d1';
const COBRE = '#e88a3c';
const COBRE_SOMBRA = '#b35e22';
const COBRE_LUZ = '#ffc68a';
const NINHO = '#a4703f';
const NINHO_SOMBRA = '#74491f';
const HERA = '#7cc44e';
const HERA_SOMBRA = '#4e8f34';
const PASSARO = PALETTE.amarelo;
const PASSARO_PEITO = '#ff8a4c';
const BOCA = '#5a1f2c';
const TINTA = PALETTE.azul;
const TINTA_SOMBRA = '#2456ad';
const TINTA_CLARA = '#8fc0ff';

/** Corpo da lata: um balde largo de topo levemente abaulado. */
const CORPO = 'M32 58 Q134 42 236 56 Q250 58 250 72 L254 194 Q254 208 240 208 L28 208 Q14 208 14 194 L20 72 Q20 60 32 58 Z';
/** Aro de reforço no pé, um pouco mais largo que o corpo. */
const PE = 'M10 198 L258 198 Q262 198 262 204 L262 214 Q262 222 254 222 L16 222 Q6 222 6 214 L6 204 Q6 198 10 198 Z';
const EYES: Array<[number, number]> = [
  [112, 106],
  [180, 102],
];
/** Onde o bico sai da cara. */
const BICO_BASE: [number, number] = [206, 150];

const f = (v: number) => v.toFixed(1);
type P = [number, number];

/** Ponto e tangente na curva quadrática p0 → c → p1. */
function curva(p0: P, c: P, p1: P, t: number): { x: number; y: number; nx: number; ny: number } {
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0];
  const y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1];
  const dx = 2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]);
  const dy = 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
  const n = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / n, ny: dx / n };
}

/** Tubo que afina de `w0` para `w1` ao longo da curva (o bico). */
function tubo(p0: P, c: P, p1: P, w0: number, w1: number): string {
  const a: string[] = [];
  const b: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const { x, y, nx, ny } = curva(p0, c, p1, t);
    const w = (w0 + (w1 - w0) * t) / 2;
    a.push(`${f(x + nx * w)} ${f(y + ny * w)}`);
    b.unshift(`${f(x - nx * w)} ${f(y - ny * w)}`);
  }
  return `M${a.join(' L')} L${b.join(' L')} Z`;
}

/** Linha paralela à curva, a uma fração `lado` da meia-largura (para sombra e brilho do bico). */
function paralela(p0: P, c: P, p1: P, w0: number, w1: number, lado: number, t0 = 0.05, t1 = 0.92): string {
  const pts: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = t0 + ((t1 - t0) * i) / 10;
    const { x, y, nx, ny } = curva(p0, c, p1, t);
    const w = ((w0 + (w1 - w0) * t) / 2) * lado;
    pts.push(`${f(x + nx * w)} ${f(y + ny * w)}`);
  }
  return `M${pts.join(' L')}`;
}

/** Gota de água (ou de tinta) com a ponta para cima. */
function gota(x: number, y: number, r: number, cor: string = AGUA, w = 4): string {
  return outlined(`M${x} ${f(y - r * 2.2)} Q${f(x + r)} ${f(y - r * 0.6)} ${f(x + r)} ${y} A${r} ${r} 0 1 1 ${f(x - r)} ${y} Q${f(x - r)} ${f(y - r * 0.6)} ${x} ${f(y - r * 2.2)} Z`, cor, w);
}

/** Sinal de perigo dos golpes: estrelinha amarela. */
function star(x: number, y: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`;
  });
  return outlined(`M${pts.join(' L')} Z`, PALETTE.amarelo, 4);
}

/** Olho em espiral (derrotado). */
function espiral(x: number, y: number): string {
  return (
    oval(x, y, 21, 21, WHITE, 5) +
    line(`M${x} ${y} Q${x + 6} ${y - 2} ${x + 5} ${y + 5} Q${x} ${y + 12} ${x - 8} ${y + 4} Q${x - 12} ${y - 8} ${x} ${y - 11} Q${x + 13} ${y - 10} ${x + 13} ${y + 2}`, 4)
  );
}

/** Crivo de cobre (o nariz), em coordenadas locais: o bico chega por -x e o crivo olha para +x. */
function crivo(): string {
  let furos = '';
  for (const [x, y] of [
    [13, -13],
    [13, -4],
    [13, 5],
    [13, 14],
    [18, -9],
    [18, 0],
    [18, 9],
  ] as const)
    furos += `<circle cx="${x}" cy="${y}" r="2.1" fill="${INK}"/>`;
  return (
    outlined('M-4 -9 L10 -19 L10 19 L-4 9 Z', COBRE_SOMBRA, 5) +
    oval(15, 0, 9, 24, COBRE, 5) +
    `<path d="M15 24 Q24 22 24 0 Q22 18 15 20 Z" fill="${COBRE_SOMBRA}"/>` +
    `<ellipse cx="15" cy="0" rx="9" ry="24" fill="none" stroke="${INK}" stroke-width="5"/>` +
    furos +
    shine('M12 -19 Q10 -14 10 -8', 3, 0.9) +
    line('M0 -10 L7 -15', 3, COBRE_LUZ)
  );
}

/** O bico: tubo verde da cara até o crivo. `solto`: o crivo voou e a ponta fica aberta. */
function bico(c: P, p: P, solto = false): string {
  const b = BICO_BASE;
  const fim = curva(b, c, p, 1);
  const ang = (Math.atan2(fim.ny, fim.nx) * 180) / Math.PI - 90;
  const corpo = tubo(b, c, p, 34, 18);
  const ponta = solto
    ? `<g transform="translate(${f(p[0])} ${f(p[1])}) rotate(${f(ang)})">${oval(0, 0, 5, 10, '#123c2a', 4)}</g>` +
      line(`M${p[0] + 6} ${p[1] - 14} L${p[0] + 14} ${p[1] - 24} M${p[0] + 14} ${p[1] - 4} L${p[0] + 26} ${p[1] - 8}`, 4, AGUA)
    : `<g transform="translate(${f(p[0])} ${f(p[1])}) rotate(${f(ang)}) scale(1.15)">${crivo()}</g>`;
  return (
    `<path d="${corpo}" fill="${LATA}"/>` +
    line(paralela(b, c, p, 34, 18, -0.5), 6, LATA_SOMBRA) +
    line(paralela(b, c, p, 34, 18, 0.45, 0.2, 0.85), 4, LATA_LUZ) +
    `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    // Anel que prende o bico na cara.
    oval(b[0], b[1], 13, 21, LATA_SOMBRA, 6, ` transform="rotate(-36 ${b[0]} ${b[1]})"`) +
    ponta
  );
}

/** Alça em arco por cima do corpo, com as braçadeiras e o ramo de hera. */
function alca(): string {
  const pts: P[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const p = curva([40, 70], [62, -40], [184, 56], t);
    pts.push([p.x, p.y]);
  }
  const folha = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})">${outlined('M0 0 Q-9 -6 -6 -14 Q0 -10 4 -16 Q8 -8 12 -10 Q12 -2 0 0 Z', HERA, 3.5)}${line('M0 -1 L1 -10', 2, HERA_SOMBRA)}</g>`;
  return (
    capsule(pts, 17, LATA, LW) +
    line('M40 54 Q42 14 70 0', 4, LATA_LUZ) +
    // Ramo de hera enroscado na perna esquerda da alça.
    line('M30 70 Q48 50 38 32 Q30 14 52 4 Q66 -2 70 -8', 3.5, HERA_SOMBRA) +
    folha(30, 64, -30) +
    folha(48, 40, 30) +
    folha(34, 22, -50) +
    folha(56, 4, 40)
  );
}

/** Passarinho: corpo amarelo, peito laranja, bico e asinha. Olha para a direita. */
function passaro(x: number, y: number, s: number, assustado: boolean): string {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})">` +
    outlined('M14 -4 L24 0 L14 4 Z', PASSARO_PEITO, 3) +
    oval(0, 0, 15, 13, PASSARO, 4) +
    `<path d="M2 4 Q10 2 13 6 Q8 12 0 11 Z" fill="${PASSARO_PEITO}"/>` +
    `<ellipse cx="0" cy="0" rx="15" ry="13" fill="none" stroke="${INK}" stroke-width="4"/>` +
    (assustado
      ? oval(6, -3, 5, 6, WHITE, 2.5) + `<circle cx="7" cy="-3" r="1.8" fill="${INK}"/>` + line('M-10 -2 L-22 -14 M-8 2 L-24 0', 4) + outlined('M-12 -6 Q-22 -18 -14 -22 Q-6 -16 -6 -6 Z', PASSARO, 3)
      : `<circle cx="6" cy="-3" r="2.6" fill="${INK}"/><circle cx="6.8" cy="-4" r="0.9" fill="${WHITE}"/>` + outlined('M-12 0 Q-6 -8 2 -2 Q-4 6 -12 0 Z', '#ffd977', 3)) +
    line('M-6 -12 L-4 -16 M-2 -13 L2 -17', 2.5) +
    `</g>`
  );
}

/** Ninho de gravetos no alto da alça, com o passarinho espiando (fora do golpe, ele voou). */
function ninho(pose: BossPose): string {
  const derrota = pose === 'derrota';
  const giro = derrota ? -14 : 0;
  const ave = pose === 'golpe' ? '' : derrota ? passaro(122, -30, 0.8, true) : passaro(112, -34, 0.85, pose === 'grito' || pose === 'salto');
  return (
    `<g transform="rotate(${giro} 104 -16)">` +
    ave +
    outlined('M74 -24 Q104 -30 134 -24 Q136 -6 104 -6 Q72 -6 74 -24 Z', NINHO, 4.5) +
    line('M78 -18 Q100 -10 130 -20 M80 -12 Q104 -18 128 -10 M86 -24 L96 -14 M112 -26 L120 -12', 2.6, NINHO_SOMBRA) +
    line('M72 -24 L66 -30 M134 -22 L142 -28 M128 -8 L136 -4', 3) +
    `</g>`
  );
}

/** Manchas de ferrugem, amassados e rebites na lata. */
function marcas(heavy: boolean): string {
  const ferrugem = heavy
    ? ''
    : outlined('M28 168 Q38 158 50 166 Q60 162 58 176 Q62 188 48 186 Q36 192 30 182 Q22 176 28 168 Z', FERRUGEM, 3.5) +
      `<path d="M34 180 Q44 186 54 180" fill="none" stroke="${FERRUGEM_SOMBRA}" stroke-width="3" stroke-linecap="round"/>` +
      outlined('M222 186 Q232 176 244 184 Q248 194 236 196 Q224 198 222 186 Z', FERRUGEM, 3.5) +
      outlined('M226 80 Q236 74 242 84 Q240 94 232 92 Q222 90 226 80 Z', FERRUGEM, 3.5) +
      // Lasca da tinta mostrando a lata nua.
      outlined('M62 74 L76 70 L80 80 L70 86 L60 82 Z', METAL, 3);
  return (
    ferrugem +
    // Amassado: uma meia-lua de sombra com a beira clara.
    line('M70 126 Q56 138 66 156', 5, LATA_SOMBRA) +
    line('M74 128 Q62 140 70 154', 3, LATA_LUZ) +
    line('M196 196 Q206 186 216 194', 4, LATA_SOMBRA) +
    // Costura com rebites, à esquerda.
    line('M30 76 L26 192', 3.5, LATA_SOMBRA) +
    [92, 120, 148].map((y) => oval(33 - (y - 76) / 30, y, 3.5, 3.5, METAL, 2.5)).join('')
  );
}

/** Boca de encher no alto, à direita, com a água dentro (no salto e na raiva, ela transborda). */
function bocaDeEncher(pose: BossPose, heavy: boolean): string {
  const agua = heavy ? TINTA : AGUA;
  const respinga =
    pose === 'salto'
      ? gota(208, 18, 6, agua) + gota(232, 8, 7, agua) + gota(250, 28, 5, agua)
      : pose === 'raiva'
        ? outlined('M200 52 Q204 34 214 44 Q220 30 228 44 Q238 34 242 52 Z', agua, 4) + gota(196, 30, 5, agua) + gota(246, 24, 5, agua)
        : '';
  return (
    oval(220, 54, 24, 9, LATA_SOMBRA, 6) +
    `<ellipse cx="220" cy="56" rx="16" ry="5" fill="${heavy ? TINTA_SOMBRA : AGUA_SOMBRA}"/>` +
    respinga
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
      return eye(lx, ly + 3, 21, 16, [0.6, 0.3], 0.5, 5) + eye(rx, ry + 3, 21, 16, [0.6, 0.3], 0.5, 5);
    case 'salto':
      return eye(lx, ly - 2, 22, 25, [0.5, -0.5], 0.46, 5) + eye(rx, ry - 2, 22, 25, [0.5, -0.5], 0.46, 5);
    case 'grito':
      return eye(lx, ly - 2, 23, 25, [0.2, 0], 0.3, 5) + eye(rx, ry - 2, 23, 25, [0.2, 0], 0.3, 5);
    case 'pesado':
      // Pálpebras de lata caídas: água de tinta demais.
      return EYES.map(
        ([x, y]) =>
          eye(x, y, 21, 20, [0.2, 0.7], 0.5, 5) +
          outlined(`M${x - 23} ${y + 5} Q${x - 22} ${y - 22} ${x} ${y - 22} Q${x + 22} ${y - 22} ${x + 23} ${y + 5} Q${x} ${y} ${x - 23} ${y + 5} Z`, LATA_SOMBRA, 5),
      ).join('');
    default:
      // Velho maroto: olhar de lado, meio desconfiado.
      return EYES.map(
        ([x, y]) =>
          eye(x, y, 21, 20, [0.65, 0.2], 0.52, 5) +
          outlined(`M${x - 23} ${y - 6} Q${x - 22} ${y - 22} ${x} ${y - 22} Q${x + 22} ${y - 22} ${x + 23} ${y - 6} Q${x} ${y - 10} ${x - 23} ${y - 6} Z`, LATA_SOMBRA, 5),
      ).join('');
  }
}

/** Sobrancelhas grossas de marinho. */
function sobrancelhas(pose: BossPose): string {
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  switch (pose) {
    case 'raiva':
      return line(`M${lx - 26} ${ly - 34} L${lx + 20} ${ly - 14} M${rx + 26} ${ry - 34} L${rx - 20} ${ry - 14}`, 11);
    case 'salto':
    case 'grito':
      return line(`M${lx - 24} ${ly - 38} Q${lx} ${ly - 52} ${lx + 22} ${ly - 40} M${rx - 22} ${ry - 40} Q${rx} ${ry - 52} ${rx + 24} ${ry - 38}`, 10);
    case 'pesado':
      return line(`M${lx - 24} ${ly - 26} L${lx + 20} ${ly - 34} M${rx - 20} ${ry - 34} L${rx + 24} ${ry - 26}`, 9);
    case 'golpe':
      return line(`M${lx - 24} ${ly - 30} L${lx + 14} ${ly - 22} M${rx - 14} ${ry - 22} L${rx + 24} ${ry - 30}`, 9);
    case 'derrota':
      return line(`M${lx - 22} ${ly - 30} L${lx + 18} ${ly - 36} M${rx - 18} ${ry - 36} L${rx + 22} ${ry - 30}`, 8);
    default:
      // Uma sobrancelha erguida: "quem pisou no meu canteiro?".
      return line(`M${lx - 22} ${ly - 30} L${lx + 18} ${ly - 26} M${rx - 20} ${ry - 32} Q${rx} ${ry - 46} ${rx + 24} ${ry - 38}`, 9);
  }
}

/** Boca aberta: fundo vinho, língua e um dente torto. */
function bocaAberta(id: string, d: string, lingua: [number, number, number], dente = ''): string {
  const [cx, cy, r] = lingua;
  return (
    `<clipPath id="rg-boca-${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${BOCA}"/>` +
    `<g clip-path="url(#rg-boca-${id})"><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f(r * 0.65)}" fill="${PALETTE.lingua}"/>` +
    (dente ? `<path d="${dente}" fill="${WHITE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '') +
    `</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
  );
}

/** A boca, uma por pose (à esquerda do bico). */
function boca(pose: BossPose): string {
  switch (pose) {
    case 'grito':
      return bocaAberta('grito', 'M96 146 Q144 134 190 148 Q186 204 144 206 Q100 204 96 146 Z', [146, 198, 28], 'M118 130 L136 130 L135 160 L119 158 Z');
    case 'salto':
      return bocaAberta('salto', 'M124 168 A20 22 0 1 1 164 168 A20 22 0 1 1 124 168 Z', [144, 186, 14]);
    case 'raiva':
      return (
        outlined('M98 152 Q144 142 188 152 L184 184 Q144 194 102 186 Z', WHITE, 6) +
        line('M114 148 L114 187 M130 145 L130 190 M146 144 L146 191 M162 145 L162 190 M176 148 L176 187 M100 168 Q144 160 186 166', 4)
      );
    case 'pesado':
      return line('M104 172 Q116 160 128 172 Q140 184 152 172 Q164 160 176 172', 7);
    case 'golpe':
      return bocaAberta('golpe', 'M126 164 Q144 152 162 164 Q166 188 144 190 Q122 188 126 164 Z', [144, 188, 11]);
    case 'derrota':
      return line('M100 174 Q144 154 186 176', 7) + outlined('M150 168 Q148 200 164 198 Q178 194 170 166 Z', PALETTE.lingua, 5);
    default:
      // Sorrisão de canto, com um dente torto para fora.
      return bocaAberta('parado', 'M100 158 Q146 188 188 150 Q178 184 144 186 Q110 186 100 158 Z', [150, 190, 22], 'M160 150 L176 150 L173 176 L161 174 Z');
  }
}

/** O bico de cada pose: [controle, ponta]. */
const BICOS: Record<BossPose, [P, P]> = {
  parado: [
    [244, 110],
    [270, 62],
  ],
  raiva: [
    [246, 100],
    [264, 48],
  ],
  salto: [
    [240, 104],
    [266, 56],
  ],
  grito: [
    [248, 112],
    [278, 66],
  ],
  pesado: [
    [250, 132],
    [282, 106],
  ],
  golpe: [
    [244, 110],
    [270, 62],
  ],
  derrota: [
    [262, 142],
    [280, 194],
  ],
};

/** Extras de emoção: suor, jatos do crivo, estrelinhas, peças voando. */
function extras(pose: BossPose, ponta: P): string {
  const [px, py] = ponta;
  switch (pose) {
    case 'raiva':
      return (
        line('M50 96 Q60 96 60 86 M70 86 Q70 96 80 96 M80 106 Q70 106 70 116 M60 116 Q60 106 50 106', 6, '#ffd2c2') +
        blush(84, 140, 14, 0.7) +
        // O crivo já goteja: a enxurrada vem aí.
        gota(px + 26, py - 18, 5) +
        gota(px + 34, py + 2, 4.5) +
        line(`M${px + 8} ${py - 34} L${px + 14} ${py - 42} M${px + 30} ${py - 30} L${px + 40} ${py - 34}`, 5)
      );
    case 'grito':
      // Leque de gotas saindo do crivo.
      return (
        gota(px + 34, py - 34, 6) +
        gota(px + 30, py - 4, 6.5) +
        gota(px + 20, py + 22, 5.5) +
        gota(px + 16, py - 50, 5) +
        line(`M${px + 22} ${py - 22} L${px + 30} ${py - 26} M${px + 24} ${py + 8} L${px + 32} ${py + 10}`, 4, AGUA_SOMBRA)
      );
    case 'salto':
      // Riscos de impulso dos dois lados do pé.
      return line('M0 178 L-8 192 M2 152 L-8 160 M272 182 L282 194', 5);
    case 'pesado':
      return gota(px + 14, py + 40, 7, TINTA) + gota(px - 6, py + 52, 5, TINTA) + outlined('M76 64 Q82 76 82 82 A7 7 0 1 1 68 82 Q68 76 76 64 Z', '#bfe3ff', 4);
    case 'golpe':
      // O crivo voou com a pancada; o passarinho saiu voando e um rebite pulou fora.
      return (
        `<g transform="translate(286 -6) rotate(-62) scale(0.85)">${crivo()}</g>` +
        line('M248 18 L262 6 M240 30 L254 20', 5) +
        passaro(54, -26, 0.8, true) +
        outlined('M28 -18 Q36 -26 40 -16 Q34 -12 28 -18 Z', PASSARO, 2.5) +
        outlined('M76 -40 Q86 -44 84 -34 Q78 -32 76 -40 Z', PASSARO, 2.5) +
        star(150, 18, 14) +
        star(206, 4, 10) +
        oval(4, 120, 5, 5, METAL, 3) +
        line('M-4 108 L-8 100 M10 106 L14 98', 3)
      );
    case 'derrota':
      // Bico mole, água vazando pelo chão.
      return (
        `<ellipse cx="270" cy="218" rx="40" ry="8" fill="${AGUA}" stroke="${INK}" stroke-width="4"/>` +
        `<ellipse cx="262" cy="216" rx="14" ry="3" fill="${ESPUMA}"/>` +
        star(60, 40, 12) +
        star(150, 12, 10) +
        star(212, 30, 11)
      );
    default:
      return blush(84, 140, 14) + blush(222, 130, 9) + gota(px + 22, py + 28, 5);
  }
}

/** O Regador numa pose. */
export function regadorSvg(pose: BossPose, variant = 0): string {
  const heavy = pose === 'pesado';
  const [c, p] = BICOS[pose];
  // Pesado: a tinta sobe por dentro da lata e escorre pelo pé.
  const tinta = heavy
    ? `<g clip-path="url(#rg-corpo)">` +
      `<path d="M0 118 Q40 104 84 118 T170 116 T260 112 L260 230 L0 230 Z" fill="${TINTA}"/>` +
      `<path d="M0 178 Q130 190 260 176 L260 230 L0 230 Z" fill="${TINTA_SOMBRA}"/>` +
      line('M34 132 Q38 152 34 172', 5, TINTA_CLARA) +
      `</g>`
    : '';
  const pingos = heavy ? gota(56, 236, 7, TINTA) + gota(134, 238, 8, TINTA) + gota(232, 234, 6, TINTA) : '';
  const corpo =
    `<ellipse cx="134" cy="224" rx="132" ry="9" fill="${INK}" opacity="0.18"/>` +
    alca() +
    // Pé de reforço.
    outlined(PE, heavy ? TINTA_SOMBRA : LATA_SOMBRA, LW) +
    line('M20 206 L248 206', 3.5, heavy ? TINTA_CLARA : LATA) +
    // Corpo de lata, com a barriga de sombra e o brilho vertical.
    `<clipPath id="rg-corpo"><path d="${CORPO}"/></clipPath>` +
    `<path d="${CORPO}" fill="${LATA}"/>` +
    `<g clip-path="url(#rg-corpo)"><path d="M0 172 Q130 186 260 170 L260 230 L0 230 Z" fill="${LATA_SOMBRA}"/></g>` +
    marcas(heavy) +
    tinta +
    shine('M44 78 Q40 110 42 140', 6, 0.75) +
    `<path d="${CORPO}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    // Borda enrolada no alto.
    line('M34 60 Q134 46 234 58', 5, LATA_LUZ) +
    bocaDeEncher(pose, heavy) +
    ninho(pose) +
    pingos +
    boca(pose) +
    bico(c, p, pose === 'golpe') +
    olhos(pose) +
    sobrancelhas(pose) +
    extras(pose, p);
  // Na raiva ele se inclina para trás, tomando impulso para a enxurrada.
  return svgDoc(BOSS_VB, pose === 'raiva' ? `<g transform="rotate(-4 150 225)">${corpo}</g>` : corpo, variant);
}

/** Crista d'água correndo para a direita, rente ao chão, com espuma e gotas (quadro de `ondaSvg`). */
export function regadorOndaSvg(variant = 0): string {
  const crista = 'M-28 0 Q-16 -4 -8 -13 Q0 -26 9 -19 Q13 -13 7 -10 Q1 -10 3 -4 Q5 0 10 0 Z';
  return svgDoc(
    '-34 -30 46 32',
    line('M-32 -12 L-24 -12 M-33 -5 L-22 -5', 1.8) +
      `<clipPath id="rg-onda"><path d="${crista}"/></clipPath>` +
      `<path d="${crista}" fill="${AGUA}"/>` +
      `<g clip-path="url(#rg-onda)">` +
      `<path d="M-30 0 Q-14 -4 -6 -2 Q2 -1 12 -3 L12 2 L-30 2 Z" fill="${AGUA_SOMBRA}"/>` +
      // Espuma na crista enrolada.
      `<path d="M-6 -15 Q0 -26 10 -20 Q14 -13 7 -10 Q2 -12 1 -16 Q-2 -14 -6 -15 Z" fill="${ESPUMA}"/>` +
      `</g>` +
      outlined(crista, 'none', 2.2) +
      // Gotinhas soltas atrás da crista.
      outlined('M-16 -16 Q-14.5 -13 -14.5 -12 A1.6 1.6 0 1 1 -17.5 -12 Q-17.5 -13 -16 -16 Z', AGUA, 0.9) +
      outlined('M-22 -10 Q-21 -8 -21 -7.4 A1.2 1.2 0 1 1 -23 -7.4 Q-23 -8 -22 -10 Z', AGUA, 0.8) +
      `<circle cx="1" cy="-12" r="1.6" fill="${INK}"/><circle cx="5.5" cy="-12.5" r="1.4" fill="${INK}"/>` +
      line('M-1 -15.4 L3 -14 M4.5 -14 L8 -16', 1.1) +
      shine('M-20 -3 Q-12 -6 -8 -10', 1.2, 0.8),
    variant,
  );
}

/** Gotona da chuva do regador, caindo com a ponta para cima e cara brava (quadro de `borraoGotaSvg`). */
export function regadorGotaSvg(variant = 0): string {
  const corpo = 'M0 -24 Q4 -10 11 0 A11 11 0 1 1 -11 0 Q-4 -10 0 -24 Z';
  return svgDoc(
    '-14 -26 28 40',
    `<clipPath id="rg-gota"><path d="${corpo}"/></clipPath>` +
      `<path d="${corpo}" fill="${AGUA}"/>` +
      `<g clip-path="url(#rg-gota)">` +
      `<path d="M-12 5 Q0 9 12 4 L12 14 L-12 14 Z" fill="${AGUA_SOMBRA}"/>` +
      `<path d="M0 -24 Q2.5 -16 4.5 -12 Q0 -10 -4.5 -12 Q-2.5 -16 0 -24 Z" fill="${ESPUMA}"/>` +
      `</g>` +
      `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
      shine('M-6.5 -4 Q-7.5 1 -5 5', 1.8, 0.9) +
      `<ellipse cx="-3.2" cy="1.5" rx="2.7" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<ellipse cx="4" cy="1.3" rx="2.7" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="-2.4" cy="2.2" r="1.4" fill="${INK}"/><circle cx="4.8" cy="2" r="1.4" fill="${INK}"/>` +
      line('M-6.6 -2.8 L-1 -1.1 M7.4 -3 L1.8 -1.3', 1.4) +
      outlined('M-3 6.4 Q0.5 4.4 4 6.4 Q0.5 8.6 -3 6.4 Z', BOCA, 0.9),
    variant,
  );
}

export const CHEFE_REGADOR: PeleChefe = {
  id: 'jardim',
  nome: 'O Regador',
  titulo: 'REGADOR',
  frase: 'ele quer alagar o jardim inteiro!',
  respingo: 0x2fbfb2,
  chefe: regadorSvg,
  onda: regadorOndaSvg,
  chuva: regadorGotaSvg,
};
