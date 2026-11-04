import { BOSS_VB, type BossPose } from './boss';
import { VENTO, VENTO_SOMBRA } from './castelo-poderes';
import type { PeleChefe } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, outlined, oval, shine, svgDoc } from './svg';

// O Dragão-Pipa, chefe do Castelo das Nuvens e o grande final: uma pipa de festa em forma de dragão,
// feita de papel de seda e varetas de bambu. A cabeça grande é de papel dobrado (as facetas da dobra
// em dois tons de vermelho, o focinho laranja), com uma juba de papel plissado dourado atrás, chifres
// de vareta com bandeirolas e bigodes de fita verde-esmeralda. O corpo é uma fila curta de discos de
// papel com a cruz de varetas à mostra, presos numa vareta-espinha, que se enrola atrás da cabeça e
// termina nas fitas da cauda; a linha da pipa sobe da cauda para fora do quadro. Fica de pé em
// pezinhos de papel. Olha para a direita, no mesmo quadro do Mata-Borrão (`BOSS_VB`, apoio em
// (150, 225), corpo na caixa de 300 × 225; os chifres, a juba e a linha passam por cima). O vermelho
// e o dourado de festa saltam do amanhecer pastel e das nuvens brancas; o vento dele é menta
// (`VENTO`), e o azul da tinta dos jogadores só aparece no pesado.

const LW = 7;
const PAPEL = '#e8423a';
const PAPEL_SOMBRA = '#b02a2f';
const PAPEL_LUZ = '#ff7f5c';
const FOCINHO = '#ff8a3a';
const FOCINHO_SOMBRA = '#d9601f';
const OURO = '#ffc234';
const OURO_SOMBRA = '#d98a1c';
const OURO_LUZ = '#ffe58a';
const FITA = '#18a680';
const FITA_SOMBRA = '#0f7a5e';
const BAMBU = '#d9b46a';
const BAMBU_SOMBRA = '#a8823e';
const MIOLO = '#ffe9b8';
const BOCA = '#5a1f2c';
const TINTA = PALETTE.azul;
const TINTA_SOMBRA = '#2456ad';
const TINTA_CLARA = '#8fc0ff';

const f = (v: number) => v.toFixed(1);
type P = [number, number];

/** Cabeça de papel dobrado, focinho para a direita. */
const CABECA = 'M140 96 L166 50 L216 26 L258 32 L268 60 L302 64 Q320 68 317 92 L312 128 L302 160 L282 192 L226 204 L170 196 L138 160 Z';
/** Faceta de baixo (a dobra na sombra). */
const CABECA_BAIXO = 'M120 152 L214 138 L320 132 L320 220 L120 220 Z';
/** Faceta da esquerda (a dobra virada para a luz). */
const CABECA_LADO = 'M134 50 L176 30 L190 132 L130 164 Z';
/** Focinho: a dobra da ponta, mais comprida que o crânio. */
const FOCINHO_D = 'M266 56 L304 62 Q322 68 318 94 L312 128 L300 156 L286 150 Q262 110 266 56 Z';
const EYES: Array<[number, number]> = [
  [194, 94],
  [238, 90],
];
/** Centro da juba e dos discos do corpo (do primeiro, junto da cabeça, até a cauda). */
const JUBA: P = [176, 112];
const DISCOS: Array<[number, number, number]> = [
  [126, 160, 42],
  [68, 170, 35],
  [26, 140, 27],
  [14, 98, 20],
];

/** Sinal de dor: estrelinha amarela. */
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
    oval(x, y, 19, 20, WHITE, 5) +
    line(`M${x} ${y} Q${x + 6} ${y - 2} ${x + 5} ${y + 5} Q${x} ${y + 11} ${x - 7} ${y + 4} Q${x - 11} ${y - 7} ${x} ${y - 10} Q${x + 12} ${y - 9} ${x + 12} ${y + 2}`, 4)
  );
}

/** Vareta de bambu de `a` até `b`, com os nós. */
function vareta(a: P, b: P, larg = 9, nos = 2): string {
  let marcas = '';
  for (let i = 1; i <= nos; i++) {
    const t = i / (nos + 1);
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / d) * (larg / 2);
    const ny = ((b[0] - a[0]) / d) * (larg / 2);
    marcas += `M${f(x - nx)} ${f(y - ny)} L${f(x + nx)} ${f(y + ny)} `;
  }
  return capsule([a, b], larg, BAMBU, 4) + line(marcas, 2.5, BAMBU_SOMBRA);
}

/** Juba de papel plissado atrás da cabeça: leque em ziguezague, meia dobra de cada prega na sombra. */
function juba(pose: BossPose): string {
  const [cx, cy] = JUBA;
  const arrepiada = pose === 'grito' || pose === 'raiva' || pose === 'salto';
  const murcha = pose === 'pesado' || pose === 'derrota';
  const a0 = murcha ? 140 : 112;
  const a1 = murcha ? 330 : arrepiada ? 312 : 300;
  const pico = arrepiada ? 118 : murcha ? 92 : 106;
  const vale = 76;
  const N = 9;
  const pt = (graus: number, r: number): P => [cx + Math.cos((graus * Math.PI) / 180) * r, cy + Math.sin((graus * Math.PI) / 180) * r];
  const borda: P[] = [];
  for (let i = 0; i <= N * 2; i++) borda.push(pt(a0 + ((a1 - a0) * i) / (N * 2), i % 2 === 0 ? vale : pico));
  const d = `M${cx} ${cy} L${borda.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
  const claro = murcha && pose === 'pesado' ? '#e0b45c' : OURO;
  let pregas = '';
  for (let i = 0; i < N * 2; i += 2) {
    const [vx, vy] = borda[i]!;
    const [px, py] = borda[i + 1]!;
    pregas += `<path d="M${cx} ${cy} L${f(vx)} ${f(vy)} L${f(px)} ${f(py)} Z" fill="${i % 4 === 0 ? OURO_SOMBRA : FOCINHO_SOMBRA}"/>`;
  }
  return (
    `<path d="${d}" fill="${claro}"/>` +
    pregas +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>`
  );
}

/**
 * Chifre de vareta curvada para trás (de `a` até `b`, puxada por `c`), com a bandeirola de papel na
 * ponta. `quebrado`: a vareta partiu no meio.
 */
function chifre(a: P, c: P, b: P, cor: string, quebrado = false): string {
  const fim = quebrado ? 0.5 : 1;
  const pts: P[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * fim;
    const u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  const nos = [pts[3]!, pts[6]!]
    .map(([x, y]) => `M${f(x - 5)} ${f(y + 1)} L${f(x + 5)} ${f(y - 1)}`)
    .join(' ');
  const corpo = capsule(pts, 10, BAMBU, 4) + line(quebrado ? nos.split(' M')[0]! : nos, 2.5, BAMBU_SOMBRA);
  const [px, py] = pts[pts.length - 1]!;
  if (quebrado)
    // Lascas da vareta partida.
    return corpo + outlined(`M${f(px - 6)} ${f(py + 4)} L${f(px - 4)} ${f(py - 10)} L${f(px)} ${f(py - 1)} L${f(px + 4)} ${f(py - 12)} L${f(px + 7)} ${f(py + 4)} Z`, BAMBU, 3.5);
  return corpo + outlined(`M${f(px)} ${f(py)} L${f(px - 34)} ${f(py + 6)} L${f(px - 22)} ${f(py + 12)} L${f(px - 6)} ${f(py + 22)} Z`, cor, 4.5);
}

/** Um disco de papel do corpo, com o aro dourado, a cruz de varetas e a barbatana plissada. */
function disco(i: number, x: number, y: number, r: number, heavy: boolean): string {
  const id = `dp-disco-${i}`;
  const d = `M${x - r} ${y} A${r} ${r} 0 1 1 ${x + r} ${y} A${r} ${r} 0 1 1 ${x - r} ${y} Z`;
  const fin = `M${x - r * 0.55} ${f(y - r * 0.8)} L${x - r * 0.2} ${f(y - r * 1.5)} L${x} ${f(y - r * 0.95)} L${x + r * 0.3} ${f(y - r * 1.55)} L${x + r * 0.6} ${f(y - r * 0.8)} Z`;
  const tinta = heavy
    ? `<path d="M${x - r - 2} ${y + r * 0.05} Q${x} ${y - r * 0.25} ${x + r + 2} ${y + r * 0.1} L${x + r + 2} ${y + r + 2} L${x - r - 2} ${y + r + 2} Z" fill="${TINTA}"/>`
    : '';
  return (
    outlined(fin, OURO, 4.5) +
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${PAPEL}"/>` +
    `<g clip-path="url(#${id})">` +
    `<path d="M${x - r - 2} ${f(y + r * 0.45)} Q${x} ${f(y + r * 0.62)} ${x + r + 2} ${f(y + r * 0.4)} L${x + r + 2} ${y + r + 2} L${x - r - 2} ${y + r + 2} Z" fill="${PAPEL_SOMBRA}"/>` +
    tinta +
    `</g>` +
    // Aro dourado por dentro da borda.
    `<circle cx="${x}" cy="${y}" r="${r - 6}" fill="none" stroke="${heavy ? TINTA_CLARA : OURO}" stroke-width="5"/>` +
    // Cruz de varetas: o esqueleto da pipa à mostra pelo papel.
    line(`M${f(x - r * 0.68)} ${f(y - r * 0.68)} L${f(x + r * 0.68)} ${f(y + r * 0.68)} M${f(x + r * 0.68)} ${f(y - r * 0.68)} L${f(x - r * 0.68)} ${f(y + r * 0.68)}`, 4, BAMBU_SOMBRA) +
    `<circle cx="${x}" cy="${y}" r="3.5" fill="${BAMBU}" stroke="${INK}" stroke-width="2.5"/>` +
    shine(`M${f(x - r * 0.62)} ${f(y - r * 0.2)} Q${f(x - r * 0.55)} ${f(y - r * 0.6)} ${f(x - r * 0.2)} ${f(y - r * 0.68)}`, 4, 0.75) +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${LW}"/>`
  );
}

/** Fitas da cauda e a linha da pipa, subindo da ponta do corpo para fora do quadro. */
function cauda(pose: BossPose): string {
  const balanca = pose === 'salto' ? 14 : pose === 'raiva' ? -10 : 0;
  const linha =
    pose === 'derrota'
      ? 'M14 92 Q-2 60 20 40 Q44 22 22 6 Q2 -8 30 -20 Q60 -30 40 -40'
      : `M14 90 Q${-8 + balanca} 50 ${8 + balanca} 10 Q${20 + balanca} -20 ${-6 + balanca} -46`;
  const laco = (x: number, y: number) =>
    outlined(`M${x} ${y} L${x - 9} ${y - 6} L${x - 9} ${y + 6} Z M${x} ${y} L${x + 9} ${y - 6} L${x + 9} ${y + 6} Z`, OURO, 3);
  return (
    line(linha, 3) +
    (pose === 'derrota' ? '' : laco(-1 + balanca, 46) + laco(10 + balanca, -6)) +
    // Duas fitas compridas da cauda.
    outlined(`M10 98 Q-10 112 -8 140 Q-6 162 -10 184 L-2 186 Q4 160 2 140 Q2 116 18 104 Z`, FITA, 4) +
    outlined(`M16 102 Q2 122 8 150 Q12 172 6 194 L14 194 Q22 170 18 148 Q14 124 24 108 Z`, OURO, 4)
  );
}

/** Pezinho de papel com três dedos. */
function pe(x: number, y = 223): string {
  return (
    capsule(
      [
        [x, y - 26],
        [x, y - 12],
      ],
      14,
      FOCINHO_SOMBRA,
      5,
    ) +
    outlined(`M${x - 18} ${y} Q${x - 20} ${y - 14} ${x - 6} ${y - 16} L${x + 10} ${y - 16} Q${x + 26} ${y - 14} ${x + 24} ${y} Z`, FOCINHO, 5) +
    line(`M${x - 4} ${y - 1} L${x - 4} ${y - 7} M${x + 9} ${y - 1} L${x + 9} ${y - 7}`, 3)
  );
}

/** Bigodes de fita saindo do focinho. */
function bigodes(pose: BossPose, heavy: boolean): string {
  const cor = heavy ? TINTA_SOMBRA : FITA;
  if (pose === 'derrota' || heavy)
    return outlined('M296 148 Q312 168 300 196 Q296 206 304 214 L296 216 Q286 204 292 192 Q302 168 288 152 Z', cor, 4);
  const sobe = pose === 'grito' || pose === 'raiva' ? -16 : 0;
  return (
    outlined(`M290 64 Q${306} ${40 + sobe} ${296} ${18 + sobe} Q${290} ${4 + sobe} ${304} ${-8 + sobe} L${310} ${-2 + sobe} Q${300} ${8 + sobe} ${304} ${20 + sobe} Q${314} ${44 + sobe} ${298} ${70} Z`, cor, 4) +
    outlined(`M298 150 Q314 166 306 186 Q302 196 310 204 L302 208 Q292 196 298 184 Q304 168 290 156 Z`, FITA_SOMBRA, 4)
  );
}

/** Olhos grandes, um jeito por pose. */
function olhos(pose: BossPose): string {
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  switch (pose) {
    case 'golpe':
      // Dor: olhos apertados em > <.
      return line(`M${lx - 14} ${ly - 12} L${lx + 10} ${ly} L${lx - 14} ${ly + 12} M${rx + 14} ${ry - 12} L${rx - 10} ${ry} L${rx + 14} ${ry + 12}`, 8);
    case 'derrota':
      return EYES.map(([x, y]) => espiral(x, y)).join('');
    case 'raiva':
      return eye(lx, ly + 3, 19, 15, [0.6, 0.3], 0.5, 5) + eye(rx, ry + 3, 19, 15, [0.6, 0.3], 0.5, 5);
    case 'salto':
      return eye(lx, ly - 2, 20, 23, [0.5, -0.5], 0.46, 5) + eye(rx, ry - 2, 20, 23, [0.5, -0.5], 0.46, 5);
    case 'grito':
      return eye(lx, ly - 2, 21, 23, [0.3, 0], 0.3, 5) + eye(rx, ry - 2, 21, 23, [0.3, 0], 0.3, 5);
    case 'pesado':
      // Pálpebras de papel encharcado, caídas.
      return EYES.map(
        ([x, y]) =>
          eye(x, y, 19, 19, [0.2, 0.7], 0.5, 5) +
          outlined(`M${x - 21} ${y + 4} Q${x - 20} ${y - 21} ${x} ${y - 21} Q${x + 20} ${y - 21} ${x + 21} ${y + 4} Q${x} ${y - 1} ${x - 21} ${y + 4} Z`, PAPEL_SOMBRA, 5),
      ).join('');
    default:
      // Convencido: olhar de lado com a pálpebra de papel meio baixada.
      return EYES.map(
        ([x, y]) =>
          eye(x, y, 19, 20, [0.65, 0.2], 0.52, 5) +
          outlined(`M${x - 21} ${y - 6} Q${x - 20} ${y - 21} ${x} ${y - 21} Q${x + 20} ${y - 21} ${x + 21} ${y - 6} Q${x} ${y - 10} ${x - 21} ${y - 6} Z`, PAPEL_SOMBRA, 5),
      ).join('');
  }
}

/** Sobrancelhas de papel dobrado (triângulos dourados com contorno). */
function sobrancelhas(pose: BossPose): string {
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  const tri = (x0: number, y0: number, x1: number, y1: number) => outlined(`M${x0} ${y0} L${x1} ${y1} L${f((x0 + x1) / 2)} ${f((y0 + y1) / 2 - 9)} Z`, OURO, 4.5);
  switch (pose) {
    case 'raiva':
      return tri(lx - 24, ly - 32, lx + 18, ly - 14) + tri(rx - 18, ry - 14, rx + 24, ry - 32);
    case 'salto':
    case 'grito':
      return tri(lx - 22, ly - 34, lx + 20, ly - 40) + tri(rx - 20, ry - 40, rx + 22, ry - 34);
    case 'pesado':
      return tri(lx - 22, ly - 22, lx + 18, ly - 30) + tri(rx - 18, ry - 30, rx + 22, ry - 22);
    case 'golpe':
      return tri(lx - 22, ly - 26, lx + 14, ly - 20) + tri(rx - 14, ry - 20, rx + 22, ry - 26);
    case 'derrota':
      return tri(lx - 20, ly - 28, lx + 16, ly - 34) + tri(rx - 16, ry - 34, rx + 20, ry - 28);
    default:
      // Uma erguida: "quem ousa subir no meu castelo?".
      return tri(lx - 20, ly - 28, lx + 18, ly - 24) + tri(rx - 20, ry - 30, rx + 24, ry - 42);
  }
}

/** Boca aberta: fundo vinho, língua e dentes de papel. */
function bocaAberta(id: string, d: string, lingua: [number, number, number], dentes = ''): string {
  const [cx, cy, r] = lingua;
  return (
    `<clipPath id="dp-boca-${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${BOCA}"/>` +
    `<g clip-path="url(#dp-boca-${id})"><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f(r * 0.65)}" fill="${PALETTE.lingua}"/>` +
    (dentes ? `<path d="${dentes}" fill="${MIOLO}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '') +
    `</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
  );
}

/** A boca no focinho, uma por pose. */
function boca(pose: BossPose): string {
  switch (pose) {
    case 'grito':
      return bocaAberta('grito', 'M206 140 Q256 128 304 132 Q300 194 252 198 Q212 194 206 140 Z', [254, 192, 28], 'M214 136 L228 156 L240 134 L254 156 L268 132 L282 154 L296 131 Z');
    case 'salto':
      return bocaAberta('salto', 'M240 160 A18 20 0 1 1 276 160 A18 20 0 1 1 240 160 Z', [258, 176, 12]);
    case 'raiva':
      // Bochechas cheias de vento e dentes cerrados.
      return (
        outlined('M212 146 Q258 136 302 140 L298 172 Q258 182 216 176 Z', MIOLO, 6) +
        line('M228 142 L228 177 M244 140 L244 179 M260 139 L260 180 M276 139 L276 178 M290 140 L290 175 M214 160 Q258 152 300 156', 4)
      );
    case 'pesado':
      return line('M220 166 Q232 154 244 166 Q256 178 268 166 Q280 154 292 166', 7);
    case 'golpe':
      return bocaAberta('golpe', 'M240 156 Q258 144 276 156 Q280 182 258 184 Q236 182 240 156 Z', [258, 182, 10], 'M246 150 L252 160 L258 150 L264 160 L270 150 Z');
    case 'derrota':
      return line('M214 168 Q256 150 300 172', 7) + outlined('M262 164 Q260 196 276 194 Q290 190 282 162 Z', PALETTE.lingua, 5);
    default:
      // Sorriso maroto com uma presa de papel.
      return bocaAberta('parado', 'M214 150 Q258 182 302 144 Q290 180 256 182 Q224 182 214 150 Z', [262, 186, 22], 'M282 156 L294 152 L290 172 Z');
  }
}

/** Rasgo do golpe na bochecha: a fenda escura com a vareta aparecendo e uma aba de papel descolada. */
function rasgo(): string {
  return (
    outlined('M146 120 L162 130 L156 139 L170 147 L164 156 L180 168 L170 172 L154 160 L159 151 L145 142 L151 134 L141 126 Z', '#4a2430', 4) +
    line('M150 130 L168 162', 4, BAMBU) +
    outlined('M170 147 L194 138 L184 152 L180 168 Z', PAPEL_SOMBRA, 4) +
    outlined('M170 147 L194 138 L182 146 Z', PAPEL_LUZ, 3)
  );
}

/** Extras de emoção: vento juntando, riscos de impulso, papel rasgado, estrelinhas. */
function extras(pose: BossPose): string {
  const espira = (x: number, y: number, r: number) =>
    line(`M${x - r} ${y} A${r} ${r} 0 1 1 ${x} ${y + r} A${r * 0.6} ${r * 0.6} 0 1 1 ${x + r * 0.5} ${y - r * 0.1}`, 9, INK) +
    line(`M${x - r} ${y} A${r} ${r} 0 1 1 ${x} ${y + r} A${r * 0.6} ${r * 0.6} 0 1 1 ${x + r * 0.5} ${y - r * 0.1}`, 4.5, VENTO);
  switch (pose) {
    case 'raiva':
      // O redemoinho começando: espirais de vento menta em volta dele.
      return espira(30, 20, 18) + espira(150, -24, 14) + espira(286, 214, 12) + espira(-2, 200, 12) + blush(228, 132, 14, 0.7);
    case 'grito':
      return line('M296 112 L308 104 M298 196 L310 204 M290 30 L300 18', 5);
    case 'salto':
      return line('M40 210 L30 222 M120 214 L114 226 M270 212 L280 224', 5);
    case 'pesado':
      return (
        outlined('M118 208 Q122 218 122 222 A5 5 0 1 1 112 222 Q112 218 118 208 Z', TINTA, 3.5) +
        outlined('M60 210 Q64 220 64 224 A5 5 0 1 1 54 224 Q54 220 60 210 Z', TINTA, 3.5) +
        outlined('M266 30 Q272 42 272 48 A7 7 0 1 1 258 48 Q258 42 266 30 Z', TINTA_CLARA, 4)
      );
    case 'golpe':
      // O chifre partido voando, retalhos e estrelas (o rasgo fica na cabeça).
      return (
        `<g transform="translate(150 -24) rotate(-40)">${vareta([0, 0], [0, -34], 10, 1)}${outlined('M0 -34 L34 -26 L22 -20 L4 -12 Z', FITA, 4.5)}</g>` +
        outlined('M116 30 L130 24 L128 38 Z', PAPEL, 3) +
        outlined('M98 64 L108 56 L112 70 Z', OURO, 3) +
        star(226, 6, 13) +
        star(290, 30, 10) +
        line('M290 50 L302 40 M292 70 L306 68', 5)
      );
    case 'derrota':
      return star(80, 70, 12) + star(170, 40, 10) + star(240, 60, 11);
    default:
      return blush(232, 130, 13);
  }
}

/** O Dragão-Pipa numa pose. */
export function dragaoSvg(pose: BossPose, variant = 0): string {
  const heavy = pose === 'pesado';
  const derrota = pose === 'derrota';
  // O corpo: espinha de bambu, os discos (da cauda para a frente) e os pés.
  const espinha = DISCOS.map(([x, y]) => [x, y] as P);
  const corpo =
    cauda(pose) +
    capsule(espinha, 9, BAMBU, 4) +
    pe(70) +
    DISCOS.slice()
      .reverse()
      .map(([x, y, r], i) => disco(DISCOS.length - 1 - i, x, y, r, heavy))
      .join('');
  // A cabeça, com a juba atrás e os chifres; no pesado a faceta de baixo encharca.
  const cabeca =
    juba(pose) +
    chifre([184, 42], [178, -4], [134, -14], OURO) +
    chifre([226, 32], [228, -12], [186, -32], FITA, pose === 'golpe') +
    pe(196) +
    pe(254) +
    `<clipPath id="dp-cabeca"><path d="${CABECA}"/></clipPath>` +
    `<path d="${CABECA}" fill="${PAPEL}"/>` +
    `<g clip-path="url(#dp-cabeca)">` +
    `<path d="${CABECA_LADO}" fill="${PAPEL_LUZ}"/>` +
    `<path d="${FOCINHO_D}" fill="${heavy ? FOCINHO_SOMBRA : FOCINHO}"/>` +
    `<path d="${CABECA_BAIXO}" fill="${heavy ? TINTA : PAPEL_SOMBRA}"/>` +
    (heavy ? `<path d="M120 190 Q220 184 320 178 L320 220 L120 220 Z" fill="${TINTA_SOMBRA}"/>` + line('M160 160 Q170 176 166 192', 5, TINTA_CLARA) : '') +
    // Vincos da dobra.
    line('M176 30 L190 132 L138 160 M190 132 L312 112 M268 60 L300 66 M190 132 L214 204', 3, heavy ? TINTA_SOMBRA : PAPEL_SOMBRA) +
    `</g>` +
    shine('M154 76 Q172 48 204 36', 6, 0.8) +
    `<path d="${CABECA}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    // Vareta da testa, aparecendo nas duas pontas.
    vareta([134, 76], [150, 60], 9, 0) +
    // Narina enrolada no alto do focinho.
    oval(304, 84, 5, 4, INK, 0) +
    line('M292 76 Q304 66 314 76', 4) +
    bigodes(pose, heavy) +
    boca(pose) +
    olhos(pose) +
    sobrancelhas(pose) +
    (pose === 'golpe' ? rasgo() : '');
  // A cabeça fica um pouco à esquerda para o focinho caber no quadro.
  const cabecaPosta = `<g transform="translate(${derrota ? -26 : -14} ${pose === 'salto' ? -6 : 0})${derrota ? ' rotate(12 200 200) translate(0 4)' : ''}">${cabeca}</g>`;
  const tudo =
    `<ellipse cx="150" cy="224" rx="150" ry="9" fill="${INK}" opacity="0.18"/>` +
    corpo +
    cabecaPosta +
    extras(pose) +
    (heavy ? outlined('M200 208 Q206 218 206 222 A6 6 0 1 1 194 222 Q194 218 200 208 Z', TINTA, 3.5) : '');
  // Na raiva ele se inclina para trás, enchendo-se de vento.
  return svgDoc(BOSS_VB, pose === 'raiva' ? `<g transform="rotate(-4 150 225)">${tudo}</g>` : tudo, variant);
}

/** Lufada de vento rente ao chão, correndo para a direita, carregando confete de papel (quadro de `ondaSvg`). */
export function dragaoOndaSvg(variant = 0): string {
  const crista = 'M-28 0 Q-16 -4 -8 -13 Q0 -26 9 -19 Q13 -13 7 -10 Q1 -10 3 -4 Q5 0 10 0 Z';
  return svgDoc(
    '-34 -30 46 32',
    line('M-32 -12 L-24 -12 M-33 -5 L-22 -5', 1.8) +
      `<clipPath id="dp-onda"><path d="${crista}"/></clipPath>` +
      `<path d="${crista}" fill="${VENTO}"/>` +
      `<g clip-path="url(#dp-onda)">` +
      `<path d="M-30 0 Q-14 -4 -6 -2 Q2 -1 12 -3 L12 2 L-30 2 Z" fill="${VENTO_SOMBRA}"/>` +
      `</g>` +
      outlined(crista, 'none', 2.2) +
      // Redemoinho na crista.
      line('M-2 -18 Q4 -22 7 -17 Q8 -13 4 -13', 1.3) +
      // Confete de papel voando junto.
      outlined('M-20 -18 L-16 -20 L-15 -16 L-19 -14 Z', PAPEL, 0.8) +
      outlined('M-12 -24 L-8 -25 L-8.5 -21 Z', OURO, 0.8) +
      outlined('M-24 -10 L-21 -12 L-19.5 -9 L-22.5 -7.5 Z', FITA, 0.8) +
      outlined('M10 -24 L13 -22 L10.5 -20 Z', PAPEL, 0.8) +
      `<circle cx="1" cy="-10" r="1.4" fill="${INK}"/><circle cx="5" cy="-10.2" r="1.3" fill="${INK}"/>` +
      line('M-1 -13 L2.6 -11.8 M4 -11.8 L7.2 -13.4', 1.1) +
      shine('M-20 -3 Q-12 -6 -8 -10', 1.2, 0.8),
    variant,
  );
}

/** Escama de papel dobrado caindo da chuva, com a ponta para cima e cara brava (quadro de `borraoGotaSvg`). */
export function dragaoEscamaSvg(variant = 0): string {
  const corpo = 'M0 -24 L11 -6 Q13 6 0 13 Q-13 6 -11 -6 Z';
  return svgDoc(
    '-14 -26 28 40',
    `<clipPath id="dp-escama"><path d="${corpo}"/></clipPath>` +
      `<path d="${corpo}" fill="${PAPEL}"/>` +
      `<g clip-path="url(#dp-escama)">` +
      // Metade direita na sombra: a dobra do meio.
      `<path d="M0 -26 L14 -26 L14 14 L0 14 Z" fill="${PAPEL_SOMBRA}"/>` +
      `<path d="M-14 7 Q0 4 14 7 L14 14 L-14 14 Z" fill="${OURO}"/>` +
      `</g>` +
      `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
      line('M0 -22 L0 -12', 1, OURO_LUZ) +
      shine('M-7 -6 Q-8 -1 -6 3', 1.6, 0.9) +
      `<ellipse cx="-3.4" cy="-2" rx="2.7" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<ellipse cx="3.6" cy="-2.2" rx="2.7" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="-2.6" cy="-1.4" r="1.4" fill="${INK}"/><circle cx="4.4" cy="-1.6" r="1.4" fill="${INK}"/>` +
      line('M-6.8 -6.4 L-1.2 -4.6 M7 -6.6 L1.6 -4.8', 1.4) +
      outlined('M-2.8 3 Q0.4 1.2 3.6 3 Q0.4 5.2 -2.8 3 Z', BOCA, 0.9),
    variant,
  );
}

export const CHEFE_DRAGAO: PeleChefe = {
  id: 'castelo',
  nome: 'O Dragão-Pipa',
  titulo: 'DRAGÃO-PIPA',
  frase: 'ele quer soprar todo mundo para fora do castelo!',
  respingo: 0xe8423a,
  chefe: dragaoSvg,
  onda: dragaoOndaSvg,
  chuva: dragaoEscamaSvg,
};
