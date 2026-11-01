import { BOSS_VB, type BossPose } from './boss';
import type { PeleChefe } from './pele';
import { INK, PALETTE, WHITE, blush, eye, line, outlined, oval, shine, svgDoc } from './svg';

// O Calhamaço, chefe da Biblioteca dos Sonhos: um livro antiquíssimo e grosso, em pé e vivo, com
// jeito de bibliotecário ranzinza e sonolento. Capa de couro ameixa gasta (um remendo costurado,
// arranhões claros), cantoneiras de latão, o fecho de correia com a placa e o buraco da chave no
// lado da frente, óculos redondos de aro dourado e sobrancelhas brancas e fartas. A boca mostra as
// beiradas das páginas como dentes e a fita marcadora vermelha faz a língua. A lombada fica à
// esquerda (mais escura, com os nervos dourados e a etiqueta de catálogo), o topo mostra o miolo de
// páginas creme e as perninhas curtas usam pantufas. Olha para a direita, no mesmo quadro do
// Mata-Borrão (`BOSS_VB`, apoio em (150, 225), corpo na caixa de 300 × 225). O couro é ameixa
// saturado e o latão é dourado, para saltar da parede creme da biblioteca e da cúpula azul-escura;
// o azul da tinta dos jogadores só aparece no pesado.

const LW = 7;
const COURO = '#8b3fa8';
const COURO_SOMBRA = '#62297e';
const COURO_LOMBADA = '#6c2f8c';
const COURO_LUZ = '#c18ade';
const COURO_RISCO = '#a965c8';
const OURO = '#f2b632';
const OURO_SOMBRA = '#c4871d';
const OURO_LUZ = '#ffe38a';
const PAGINA = '#fdf3d8';
const PAGINA_SOMBRA = '#e6d3a6';
const PAGINA_LINHA = '#c9ad7c';
const FITA = '#e2343f';
const FITA_SOMBRA = '#a51f30';
const PELO = '#f6f3fb';
const PELO_SOMBRA = '#cbc3dd';
const BOCA = '#3d1a46';
const ETIQUETA = '#fff8e8';
const TINTA = PALETTE.azul;
const TINTA_SOMBRA = '#2456ad';
const TINTA_CLARA = '#8fc0ff';

/** Capa da frente (a dobradiça é a borda da esquerda, em x = 72). */
const FRENTE = 'M72 40 L278 38 Q291 38 291 51 L291 195 Q291 208 278 208 L72 208 Z';
/** Lombada arredondada, vista de lado (à esquerda), um pouco para trás e para cima. */
const LOMBADA = 'M72 40 Q46 20 30 10 Q16 4 16 20 L16 166 Q16 178 26 184 Q48 196 72 208 Z';
/** Topo do livro: o miolo de páginas entre as duas capas. */
const TOPO = 'M72 40 L284 38 Q292 38 287 33 L240 6 L30 7 Q20 8 27 12 Z';
const EYES: Array<[number, number]> = [
  [160, 100],
  [228, 98],
];
const LENTE = 29;

const f = (v: number) => v.toFixed(1);

/** Sinal de perigo dos golpes: estrelinha amarela. */
function star(x: number, y: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`;
  });
  return outlined(`M${pts.join(' L')} Z`, PALETTE.amarelo, 4);
}

/** Folha solta voando: retângulo de papel girado, com duas linhas de texto e o canto dobrado. */
function folhaSolta(x: number, y: number, rot: number, s = 1): string {
  return (
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
    outlined('M-14 -18 L10 -18 L14 -13 L14 18 L-14 18 Z', PAGINA, 4.5) +
    outlined('M10 -18 L10 -13 L14 -13 Z', PAGINA_SOMBRA, 3) +
    line('M-8 -8 L7 -8 M-8 0 L8 0 M-8 8 L4 8', 2.6, PAGINA_LINHA) +
    `</g>`
  );
}

/** Pálpebra de couro descendo até `y + abre` (sono ou peso). */
function palpebra(x: number, y: number, abre: number): string {
  return outlined(`M${x - 23} ${y + abre} Q${x - 23} ${y - 24} ${x} ${y - 24} Q${x + 23} ${y - 24} ${x + 23} ${y + abre} Q${x} ${y + abre - 5} ${x - 23} ${y + abre} Z`, COURO, 5);
}

/** Olho em espiral (derrotado). */
function espiral(x: number, y: number): string {
  return (
    oval(x, y, 21, 21, WHITE, 5) +
    line(`M${x} ${y} Q${x + 6} ${y - 2} ${x + 5} ${y + 5} Q${x} ${y + 12} ${x - 8} ${y + 4} Q${x - 12} ${y - 8} ${x} ${y - 11} Q${x + 13} ${y - 10} ${x + 13} ${y + 2}`, 4)
  );
}

/** Olhos grandes, um jeito por pose (como os do Mata-Borrão). */
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
      // Pálpebras quase fechadas: tinta demais para manter os olhos abertos.
      return EYES.map(([x, y]) => eye(x, y, 21, 20, [0.2, 0.7], 0.5, 5) + palpebra(x, y, 6)).join('');
    default:
      // Sonolento e ranzinza: pálpebras a meio pau, de olho em quem faz barulho.
      return EYES.map(([x, y]) => eye(x, y, 21, 20, [0.7, 0.35], 0.5, 5) + palpebra(x, y, -5)).join('');
  }
}

/** Óculos redondos de aro dourado; escorregam, entortam conforme a pose e, no golpe, voam longe. */
function oculos(pose: BossPose): string {
  const pos: Record<BossPose, [number, number]> = { parado: [0, 2], raiva: [0, 2], salto: [-8, -4], grito: [-6, -6], pesado: [16, 6], golpe: [0, 0], derrota: [12, 14] };
  const [dy, rot] = pos[pose];
  const voando = pose === 'golpe';
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  const aro = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="${LENTE}" fill="${WHITE}" fill-opacity="0.16" stroke="${INK}" stroke-width="11"/>` +
    `<circle cx="${x}" cy="${y}" r="${LENTE}" fill="none" stroke="${OURO}" stroke-width="4.5"/>`;
  const reflexo = (x: number, y: number) =>
    pose === 'raiva'
      ? // Na raiva, a lente faísca na borda: olhar de quem vai pedir silêncio.
        shine(`M${x + 6} ${y - 24} L${x + 22} ${y - 10}`, 5, 0.95)
      : shine(`M${x - 18} ${y - 6} Q${x - 14} ${y - 16} ${x - 4} ${y - 20}`, 4, 0.75);
  const trinca = pose === 'derrota' ? line(`M${rx + 4} ${ry - 28} L${rx - 4} ${ry - 12} L${rx + 8} ${ry - 2} L${rx - 2} ${ry + 14}`, 3) : '';
  // Haste até a dobradiça; voando, a haste fica dobrada junto do aro.
  const haste = voando ? `M${lx - LENTE} ${ly - 4} L${lx - LENTE - 16} ${ly + 10}` : `M${lx - LENTE} ${ly - 4} L78 ${ly - 12}`;
  const lugar = voando ? `translate(176 -14) rotate(-22) scale(0.72) translate(-194 -99)` : `translate(0 ${dy}) rotate(${rot} 194 99)`;
  return (
    `<g transform="${lugar}">` +
    line(haste, 10) +
    line(haste, 4, OURO) +
    line(`M${lx + LENTE - 1} ${ly - 3} Q${(lx + rx) / 2} ${ly - 14} ${rx - LENTE + 1} ${ry - 3}`, 10) +
    line(`M${lx + LENTE - 1} ${ly - 3} Q${(lx + rx) / 2} ${ly - 14} ${rx - LENTE + 1} ${ry - 3}`, 4, OURO) +
    aro(lx, ly) +
    aro(rx, ry) +
    reflexo(lx, ly) +
    reflexo(rx, ry) +
    trinca +
    `</g>`
  );
}

/** Sobrancelha farta e branca de bibliotecário velho, centrada em (0, 0). */
const TUFO = 'M-31 6 Q-35 -4 -25 -7 Q-23 -16 -12 -13 Q-6 -21 4 -15 Q12 -20 20 -12 Q31 -13 31 -3 Q35 7 25 9 Q0 13 -31 6 Z';

function tufo(x: number, y: number, rot: number, espelho: boolean): string {
  return (
    `<g transform="translate(${x} ${y})${espelho ? ' scale(-1 1)' : ''} rotate(${rot})">` +
    outlined(TUFO, PELO, 5) +
    line('M-24 3 Q0 8 23 4', 4, PELO_SOMBRA) +
    line('M-14 -6 L-10 -2 M2 -9 L4 -4 M15 -6 L14 -2', 2.6, PELO_SOMBRA) +
    `</g>`
  );
}

/** As duas sobrancelhas: [deslocamento, giro] da esquerda e da direita (a direita é espelhada). */
function sobrancelhas(pose: BossPose): string {
  const jeito: Record<BossPose, [[number, number], [number, number]]> = {
    // Ranzinza, com uma sobrancelha erguida: "quem fez esse barulho?".
    parado: [[2, 10], [-8, -8]],
    raiva: [[8, 24], [8, 24]],
    salto: [[-12, -12], [-12, -12]],
    grito: [[-14, -14], [-14, -14]],
    pesado: [[2, -14], [2, -14]],
    golpe: [[4, 16], [4, 16]],
    derrota: [[0, -18], [0, -18]],
  };
  const [[ldy, lr], [rdy, rr]] = jeito[pose];
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  return tufo(lx - 2, ly - 44 + ldy, lr, false) + tufo(rx + 2, ry - 44 + rdy, rr, true);
}

/** Fita marcadora pendurada de (x, y0), com `len` de comprimento, a ponta em V e um balanço `sway`. */
function fitaLingua(x: number, y0: number, len: number, sway: number): string {
  const y1 = y0 + len;
  return (
    outlined(
      `M${x - 9} ${y0} L${x + 9} ${y0} Q${x + 11 + sway * 0.4} ${f(y0 + len * 0.5)} ${x + 9 + sway} ${y1} L${x + sway} ${y1 - 8} L${x - 9 + sway} ${y1} Q${x - 11 + sway * 0.4} ${f(y0 + len * 0.5)} ${x - 9} ${y0} Z`,
      FITA,
      4.5,
    ) +
    line(`M${x + 4} ${y0 + 4} Q${x + 6 + sway * 0.4} ${f(y0 + len * 0.5)} ${x + 5 + sway} ${y1 - 7}`, 4, FITA_SOMBRA)
  );
}

/** Boca aberta: fundo ameixa-escuro, as beiradas das páginas como dentes em cima e a fita como língua. */
function bocaAberta(id: string, d: string, o: { dentes: [number, number]; lingua?: [number, number, number] }): string {
  const clip = `ca-boca-${id}`;
  const [yd, hd] = o.dentes;
  let miolo = `<rect x="120" y="${yd - 40}" width="160" height="${40 + hd}" fill="${PAGINA}"/>`;
  for (let x = 130; x < 270; x += 13) miolo += line(`M${x} ${yd - 10} L${x + 1} ${yd + hd - 2}`, 2.4, PAGINA_LINHA);
  miolo += line(`M120 ${yd + hd} L280 ${yd + hd}`, 3.5);
  if (o.lingua) {
    const [cx, cy, r] = o.lingua;
    miolo += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f(r * 0.6)}" fill="${FITA}"/>` + line(`M${cx} ${f(cy - r * 0.45)} L${cx} ${cy + r}`, 3, FITA_SOMBRA);
  }
  return (
    `<clipPath id="${clip}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${BOCA}"/>` +
    `<g clip-path="url(#${clip})">${miolo}</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
  );
}

/** A boca, uma por pose. */
function boca(pose: BossPose): string {
  switch (pose) {
    case 'grito':
      return bocaAberta('grito', 'M150 146 Q198 132 246 144 Q244 206 198 208 Q152 206 150 146 Z', { dentes: [140, 16], lingua: [198, 200, 30] });
    case 'salto':
      return bocaAberta('salto', 'M176 166 A22 24 0 1 1 220 166 A22 24 0 1 1 176 166 Z', { dentes: [142, 12], lingua: [198, 188, 16] });
    case 'raiva':
      // Dentes cerrados: o bloco de páginas apertado.
      return (
        outlined('M154 152 Q198 142 242 152 L238 184 Q198 194 158 186 Z', PAGINA, 6) +
        line('M168 148 L169 187 M184 145 L185 190 M200 144 L200 191 M216 145 L216 190 M230 148 L230 187', 3, PAGINA_LINHA) +
        line('M156 168 Q198 160 240 166', 4)
      );
    case 'pesado':
      return line('M160 170 Q172 158 184 170 Q196 182 208 170 Q220 158 232 170', 7);
    case 'golpe':
      return bocaAberta('golpe', 'M182 164 Q198 152 214 164 Q218 188 198 190 Q178 188 182 164 Z', { dentes: [150, 8], lingua: [198, 190, 11] });
    case 'derrota':
      // Boca torta e a fita marcadora pendurada para fora, mole.
      return line('M156 172 Q198 152 240 174', 7) + fitaLingua(212, 166, 50, -6);
    default:
      // Sorriso torto de quem sabe tudo, com a fita pendurada para fora como língua.
      return bocaAberta('parado', 'M158 156 Q198 168 238 150 Q234 184 198 188 Q164 186 158 156 Z', { dentes: [148, 11] }) + fitaLingua(214, 174, 44, 4);
  }
}

/** Topo do livro com o miolo de páginas; na raiva as folhas eriçam, no golpe voam. */
function topo(pose: BossPose, heavy: boolean): string {
  let linhas = '';
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    linhas += `M${f(72 - 48 * t)} ${f(40 - 32 * t)} L${f(284 - 48 * t)} ${f(38 - 32 * t)} `;
  }
  // Na raiva, algumas folhas se levantam do miolo, eriçadas.
  const ergue = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})">` +
    outlined('M-11 0 L-11 -26 Q-2 -31 11 -27 L11 0 Z', PAGINA, 4) +
    line('M-6 -19 L6 -20 M-6 -12 L6 -12', 2.4, PAGINA_LINHA) +
    `</g>`;
  const ericadas = pose === 'raiva' ? ergue(118, 26, -16) + ergue(178, 22, 4) + ergue(232, 20, 18) : '';
  return (
    `<path d="${TOPO}" fill="${PAGINA}"/>` +
    line(linhas, 2.4, PAGINA_LINHA) +
    // Bordas das duas capas no alto.
    `<path d="M72 40 L284 38 L278 33 L66 35 Z" fill="${heavy ? TINTA : COURO}"/>` +
    `<path d="M30 7 L240 6 L246 10 L34 11 Z" fill="${COURO_SOMBRA}"/>` +
    `<path d="${TOPO}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    ericadas
  );
}

/** Nervos dourados e a etiqueta de catálogo na lombada. */
function lombada(heavy: boolean): string {
  const nervo = (y: number) => `M16 ${y} Q40 ${y + 10} 72 ${y + 30}`;
  return (
    [36, 52, 146, 162].map((y) => line(nervo(y), 11) + line(nervo(y), 5, OURO)).join('') +
    // Etiqueta de catálogo (as letras são riscos, nunca texto).
    outlined('M22 74 L64 100 L64 142 L22 116 Z', heavy ? '#d9e8ff' : ETIQUETA, 4.5) +
    line('M30 89 L56 105 M30 100 L50 112 M30 111 L54 126', 3.4) +
    shine('M22 18 Q21 24 22 30', 4, 0.6)
  );
}

/** Cantoneiras de latão nos quatro cantos da capa, com um rebite cada. */
function cantoneiras(): string {
  const c = (d: string, rx: number, ry: number) => outlined(d, OURO, 5) + oval(rx, ry, 4, 4, OURO_LUZ, 2.5);
  return (
    c('M248 39 L278 38 Q291 38 291 51 L291 80 Z', 279, 50) +
    c('M291 166 L291 195 Q291 208 278 208 L250 208 Z', 279, 196) +
    c('M72 40 L102 40 L72 70 Z', 80, 48) +
    c('M72 178 L102 208 L72 208 Z', 80, 200) +
    shine('M262 43 L282 43', 3, 0.8)
  );
}

/** Fecho: correia de couro passando pela beirada da frente e a placa com o buraco da chave. */
function fecho(pose: BossPose): string {
  if (pose === 'golpe') {
    // A pancada abriu o fecho: a correia salta para fora e a placa voa.
    return (
      outlined('M286 124 L312 104 L318 116 L292 144 Z', COURO_SOMBRA, 5) +
      `<g transform="rotate(-30 304 100)">${outlined('M292 86 L316 86 Q320 86 320 90 L320 112 Q320 116 316 116 L292 116 Q288 116 288 112 L288 90 Q288 86 292 86 Z', OURO, 5)}` +
      oval(304, 98, 3.5, 3.5, INK, 0) +
      `<path d="M302.5 99 L305.5 99 L306 108 L302 108 Z" fill="${INK}"/></g>`
    );
  }
  return (
    outlined('M262 124 L298 124 L298 150 L262 150 Z', COURO_SOMBRA, 5) +
    outlined('M250 118 L276 118 Q281 118 281 123 L281 151 Q281 156 276 156 L250 156 Q245 156 245 151 L245 123 Q245 118 250 118 Z', OURO, 5) +
    `<path d="M247 146 L279 146 L279 152 Q279 154 276 154 L250 154 Q247 154 247 151 Z" fill="${OURO_SOMBRA}"/>` +
    oval(263, 132, 4, 4, INK, 0) +
    `<path d="M261 133 L265 133 L266 144 L260 144 Z" fill="${INK}"/>` +
    shine('M250 124 L262 124', 3, 0.85)
  );
}

/** Perninhas curtas de couro com pantufas; no salto ficam penduradas e abertas. */
function pernas(pose: BossPose, cor: string, sombra: string): string {
  const abre = pose === 'salto' ? 10 : 0;
  const desce = pose === 'salto' ? 3 : 0;
  return [118, 236]
    .map((x, i) => {
      const b = x + (i === 0 ? -abre : abre);
      return (
        outlined(`M${x - 11} 198 L${x + 11} 198 L${b + 9} ${213 + desce} L${b - 9} ${213 + desce} Z`, cor, 6) +
        `<path d="M${x - 6} 206 L${x + 8} 206" stroke="${sombra}" stroke-width="5" stroke-linecap="round"/>` +
        oval(b + 6, 218 + desce, 22, 9, FITA, 6) +
        `<path d="M${b - 12} ${221 + desce} Q${b + 6} ${229 + desce} ${b + 26} ${221 + desce}" fill="none" stroke="${FITA_SOMBRA}" stroke-width="4" stroke-linecap="round"/>` +
        `<ellipse cx="${b + 6}" cy="${218 + desce}" rx="22" ry="9" fill="none" stroke="${INK}" stroke-width="6"/>` +
        oval(b + 22, 213 + desce, 5, 4, WHITE, 3)
      );
    })
    .join('');
}

/** Extras de emoção: veia, suor, folhas voando, estrelinhas. */
function extras(pose: BossPose): string {
  switch (pose) {
    case 'raiva':
      return line('M104 64 Q114 64 114 54 M124 54 Q124 64 134 64 M134 74 Q124 74 124 84 M114 84 Q114 74 104 74', 6, '#ffd2c2') + blush(124, 132, 14, 0.7) + blush(270, 112, 9, 0.7);
    case 'grito':
      return line('M298 60 L314 52 M300 84 L316 84 M298 108 L312 116', 6) + folhaSolta(268, -18, 24, 0.9);
    case 'salto':
      return line('M300 56 L314 48 M302 80 L316 80', 6);
    case 'pesado':
      return outlined('M124 64 Q132 78 132 84 A8 8 0 1 1 116 84 Q116 78 124 64 Z', '#bfe3ff', 4) + outlined('M282 60 Q288 70 288 74 A6 6 0 1 1 276 74 Q276 70 282 60 Z', '#bfe3ff', 3.5);
    case 'golpe':
      // As páginas soltam do miolo com a pancada.
      return star(126, 24, 13) + star(300, 40, 10) + folhaSolta(96, -20, -28, 0.9) + folhaSolta(262, -22, 30, 0.9) + line('M300 160 L312 166 M298 182 L310 192', 5);
    case 'derrota':
      return star(100, -6, 12) + star(186, -28, 10) + star(262, -8, 11) + folhaSolta(296, 196, 70, 0.8);
    default:
      return blush(124, 132, 14) + blush(272, 114, 9);
  }
}

/** O Calhamaço numa pose. */
export function calhamacoSvg(pose: BossPose, variant = 0): string {
  const heavy = pose === 'pesado';
  const couro = heavy ? TINTA : COURO;
  const sombra = heavy ? TINTA_SOMBRA : COURO_SOMBRA;
  const gota = (x: number, y: number, r: number) =>
    outlined(`M${x} ${y - r * 2.2} Q${x + r} ${y - r * 0.6} ${x + r} ${y} A${r} ${r} 0 1 1 ${x - r} ${y} Q${x - r} ${y - r * 0.6} ${x} ${y - r * 2.2} Z`, TINTA, 4);
  // Pesado: a tinta sobe pela capa e pela lombada.
  const tintaFrente = heavy
    ? `<g clip-path="url(#ca-frente)">` +
      `<path d="M60 112 Q100 100 140 112 T220 110 T300 108 L300 230 L60 230 Z" fill="${TINTA}"/>` +
      `<path d="M60 180 Q180 188 300 178 L300 230 L60 230 Z" fill="${TINTA_SOMBRA}"/>` +
      line('M88 130 Q92 150 88 170', 5, TINTA_CLARA) +
      `</g>`
    : '';
  const tintaLombada = heavy ? `<g clip-path="url(#ca-lombada)"><path d="M0 104 Q40 96 80 120 L80 230 L0 230 Z" fill="${TINTA_SOMBRA}"/></g>` : '';
  return svgDoc(
    BOSS_VB,
    `<clipPath id="ca-frente"><path d="${FRENTE}"/></clipPath>` +
      `<clipPath id="ca-lombada"><path d="${LOMBADA}"/></clipPath>` +
      `<ellipse cx="150" cy="226" rx="140" ry="10" fill="${INK}" opacity="0.18"/>` +
      pernas(pose, couro, sombra) +
      // Lombada: couro mais escuro, com a barriga de sombra.
      `<path d="${LOMBADA}" fill="${COURO_LOMBADA}"/>` +
      `<g clip-path="url(#ca-lombada)"><path d="M0 156 Q40 170 80 186 L80 230 L0 230 Z" fill="${COURO_SOMBRA}"/></g>` +
      tintaLombada +
      lombada(heavy) +
      `<path d="${LOMBADA}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      // Capa da frente: couro, moldura gravada, barriga de sombra, arranhões e remendo.
      `<path d="${FRENTE}" fill="${COURO}"/>` +
      `<g clip-path="url(#ca-frente)">` +
      `<path d="M60 180 Q180 188 300 178 L300 230 L60 230 Z" fill="${COURO_SOMBRA}"/>` +
      line('M232 190 L248 184 M110 52 L124 48 M272 86 L278 100', 4, COURO_RISCO) +
      `</g>` +
      tintaFrente +
      `<path d="M88 56 L272 54 Q276 54 276 58 L276 188 Q276 192 272 192 L88 192 Q84 192 84 188 L84 60 Q84 56 88 56 Z" fill="none" stroke="${sombra}" stroke-width="4"/>` +
      outlined('M92 150 L124 146 L128 178 L96 182 Z', heavy ? TINTA_SOMBRA : COURO_LUZ, 4) +
      line('M96 156 L100 154 M97 166 L101 164 M99 176 L103 174 M119 151 L123 153 M120 161 L124 163 M121 171 L125 173', 2.6) +
      shine('M94 62 Q91 100 93 132', 5, 0.7) +
      `<path d="${FRENTE}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      (heavy ? gota(96, 222, 7) + gota(170, 226, 8) + gota(262, 222, 6) + gota(34, 198, 6) : '') +
      topo(pose, heavy) +
      cantoneiras() +
      fecho(pose) +
      olhos(pose) +
      oculos(pose) +
      sobrancelhas(pose) +
      boca(pose) +
      extras(pose),
    variant,
  );
}

/** Onda de folhas soltas correndo para a direita, rente ao chão (quadro de `ondaSvg`). */
export function calhamacoOndaSvg(variant = 0): string {
  const crista = 'M-28 0 Q-16 -4 -8 -13 Q0 -26 9 -19 Q13 -13 7 -10 Q1 -10 3 -4 Q5 0 10 0 Z';
  return svgDoc(
    '-34 -30 46 32',
    `<clipPath id="ca-onda"><path d="${crista}"/></clipPath>` +
      line('M-32 -12 L-24 -12 M-33 -5 L-22 -5', 1.8) +
      // Uma folha menor voando atrás da crista.
      `<g transform="translate(-19 -15) rotate(-24)">${outlined('M-4 -5 L3 -5 L4 -3.6 L4 5 L-4 5 Z', PAGINA, 1.4)}${line('M-2 -1.5 L2 -1.5 M-2 1.5 L2 1.5', 0.8, PAGINA_LINHA)}</g>` +
      `<path d="${crista}" fill="${PAGINA}"/>` +
      `<g clip-path="url(#ca-onda)">` +
      `<path d="${crista}" fill="none" stroke="${COURO}" stroke-width="5"/>` +
      line('M-22 -2.5 Q-13 -5 -8 -9.5 M-15 -1.5 Q-8 -3.5 -4 -7.5 Q-1 -11 2 -15', 1.1, PAGINA_LINHA) +
      `</g>` +
      outlined(crista, 'none', 2.2) +
      `<circle cx="2" cy="-15" r="1.6" fill="${INK}"/><circle cx="6.5" cy="-15.5" r="1.4" fill="${INK}"/>` +
      line('M0 -19 L4 -17.5 M5.5 -17.5 L9 -19.5', 1.1) +
      shine('M-6 -13 Q0 -20 4 -17', 1.4),
    variant,
  );
}

/** Livrinho da chuva caindo de lombada para baixo, com cara brava (quadro de `borraoGotaSvg`, centro em (0, 0)). */
export function calhamacoLivroSvg(variant = 0): string {
  const capa = 'M-10 -11 L8 -12 Q10 -12 10 -10 L10 10 Q10 12 8 12 L-10 12 Z';
  return svgDoc(
    '-14 -26 28 40',
    line('M-6 -24.5 L-6 -18.5 M0 -25 L0 -19.5 M6 -24.5 L6 -18.5', 1.4) +
      `<g transform="rotate(-12)">` +
      // Miolo de páginas aparecendo em cima e a lombada à esquerda.
      outlined('M-10 -11 L-6 -15 L11 -16 L8 -12 Z', PAGINA, 1.8) +
      line('M-7.5 -13 L9 -14', 0.8, PAGINA_LINHA) +
      outlined('M-10 -11 Q-14 -10 -14 -7 L-14 13 Q-13 15 -10 12 Z', COURO_LOMBADA, 1.8) +
      line('M-14 -4 Q-12 -3 -10 -4 M-14 8 Q-12 9 -10 8', 1.8, OURO) +
      `<clipPath id="ca-livro"><path d="${capa}"/></clipPath>` +
      `<path d="${capa}" fill="${COURO}"/>` +
      `<path d="M-12 7 Q0 9 12 6 L12 14 L-12 14 Z" fill="${COURO_SOMBRA}" clip-path="url(#ca-livro)"/>` +
      `<path d="${capa}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
      outlined('M4 -12 L8 -12 Q10 -12 10 -10 L10 -6 Z', OURO, 1.2) +
      outlined('M10 6 L10 10 Q10 12 8 12 L4 12 Z', OURO, 1.2) +
      shine('M-7.5 -7 L-7.5 -2', 1.3, 0.7) +
      // Cara brava: olhos com sobrancelha em V e dentes de página cerrados.
      `<ellipse cx="-3.2" cy="-2" rx="2.7" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1"/><ellipse cx="4" cy="-2.2" rx="2.7" ry="3" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="-2.4" cy="-1.3" r="1.4" fill="${INK}"/><circle cx="4.8" cy="-1.5" r="1.4" fill="${INK}"/>` +
      line('M-6.6 -6.4 L-1 -4.6 M7.4 -6.6 L1.8 -4.8', 1.4) +
      outlined('M-3.5 4 L5 3.6 L4.6 7.4 L-3 7.6 Z', PAGINA, 1) +
      line('M0.8 3.8 L0.8 7.5 M-3.2 5.7 L4.8 5.5', 0.7) +
      `</g>`,
    variant,
  );
}

export const CHEFE_CALHAMACO: PeleChefe = {
  id: 'biblioteca',
  nome: 'O Calhamaço',
  titulo: 'CALHAMAÇO',
  frase: 'ele quer fechar o livro com todo mundo dentro!',
  respingo: 0x8b3fa8,
  chefe: calhamacoSvg,
  onda: calhamacoOndaSvg,
  chuva: calhamacoLivroSvg,
};
