import { BOSS_VB, type BossPose } from './boss';
import type { PeleChefe } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, outlined, oval, shine, svgDoc } from './svg';

// O Apontador, chefe da Floresta Encantada: um apontador de lápis de manivela, gigante e vivo, que
// mora no Bosque das Aparas (é dele que saem as aparas-tronco da floresta). Bloco de madeira castanha
// em vista de três quartos (o lado à esquerda, mais escuro), coroa de musgo e folhas no alto, a placa
// de metal na frente com o furo cônico que é a boca (a lâmina faz os dentes), a manivela de puxador
// vermelho presa no lado e perninhas de raiz. Olha para a direita, no mesmo quadro do Mata-Borrão
// (`BOSS_VB`, apoio em (150, 225), corpo na caixa de 300 × 225; a manivela e as folhas passam por cima).
// O musgo é verde saturado e o contorno é marinho grosso, para saltar do fundo verde-pálido da floresta.

const LW = 7;
const MADEIRA = '#9b5a2e';
const MADEIRA_SOMBRA = '#74401f';
const MADEIRA_LADO = '#7f4824';
const MADEIRA_LUZ = '#c98a55';
const VEIO = '#6a3a1b';
const MUSGO = '#3fa83c';
const MUSGO_SOMBRA = '#2b7d2e';
const MUSGO_LUZ = '#a8de52';
const FOLHA = '#5cc23f';
const METAL = '#c9cde0';
const METAL_SOMBRA = '#9d9abf';
const LAMINA = '#f1f3fa';
const FURO = '#2b2540';
const FURO_ANEL = '#5a5480';
const PUXADOR = '#e2403a';
const PUXADOR_SOMBRA = '#a9282a';
const RAIZ = '#6b3b1d';
const RAIZ_SOMBRA = '#4f2a14';
const APARA = '#f3dcb0';
const APARA_SOMBRA = '#d4ac74';
const APARA_BORDA = '#ec5f4a';
const GRAFITE = '#4a4d5c';
const TINTA = PALETTE.azul;
const TINTA_SOMBRA = '#2456ad';
const TINTA_CLARA = '#8fc0ff';

const BLOCO = 'M40 30 Q153 22 268 30 Q290 31 290 52 L292 184 Q292 204 272 204 L36 204 Q16 204 16 184 L18 52 Q18 31 40 30 Z';
const LADO = 'M0 0 L86 0 Q80 110 86 204 L0 210 Z';
const PLACA = 'M138 114 L274 114 Q288 114 288 128 L288 184 Q288 198 274 198 L138 198 Q124 198 124 184 L124 128 Q124 114 138 114 Z';
const MUSGO_PATH =
  'M10 50 Q0 24 24 16 Q30 -6 60 2 Q76 -16 104 -2 Q122 -18 148 -4 Q172 -18 194 -2 Q218 -16 240 2 Q266 -4 274 18 Q300 22 296 48 ' +
  'Q286 64 268 56 Q254 68 238 56 Q222 68 206 56 Q190 68 174 56 Q158 68 142 56 Q126 68 110 56 Q94 68 78 56 Q62 68 46 56 Q28 66 10 50 Z';
const EIXO: [number, number] = [50, 112];
const EYES: Array<[number, number]> = [
  [172, 88],
  [242, 86],
];

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

/** Folha com nervura, apontando na direção `rot` (graus, 0 = para a direita). */
function folha(x: number, y: number, rot: number, s = 1, cor = FOLHA): string {
  return (
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
    outlined('M0 0 Q16 -14 38 0 Q16 14 0 0 Z', cor, 5) +
    line('M5 0 Q20 -1 32 0', 3, MUSGO_SOMBRA) +
    `</g>`
  );
}

/** Roseta de apara (madeira clara com a borda pintada de coral), vista de frente. */
function rosa(cx: number, cy: number, r: number, w = 5): string {
  const lobos = 9;
  const borda = (k: number) => {
    let d = '';
    for (let i = 0; i <= lobos; i++) {
      const a = (i / lobos) * Math.PI * 2;
      const m = ((i - 0.5) / lobos) * Math.PI * 2;
      const p = `${f(cx + Math.cos(a) * r * k)} ${f(cy + Math.sin(a) * r * k)}`;
      d += i === 0 ? `M${p}` : ` Q${f(cx + Math.cos(m) * r * k * 1.2)} ${f(cy + Math.sin(m) * r * k * 1.2)} ${p}`;
    }
    return d + ' Z';
  };
  const voltas: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 3.2;
    voltas.push(`${i === 0 ? 'M' : 'L'}${f(cx + Math.cos(a) * r * 0.62 * t)} ${f(cy + Math.sin(a) * r * 0.62 * t)}`);
  }
  return (
    outlined(borda(1), APARA_BORDA, w) +
    `<path d="${borda(0.74)}" fill="${APARA}"/>` +
    line(voltas.join(' '), w * 0.7, APARA_SOMBRA) +
    `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.14)}" fill="${GRAFITE}"/>`
  );
}

/** Fita de apara ao longo de `d`: contorno marinho, borda coral e miolo de madeira. */
function fita(d: string, w = 14): string {
  return line(d, w + 10, INK) + line(d, w, APARA_BORDA) + line(d, w * 0.45, APARA);
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
      return eye(lx, ly - 2, 23, 26, [0.5, -0.5], 0.46, 5) + eye(rx, ry - 2, 23, 26, [0.5, -0.5], 0.46, 5);
    case 'grito':
      return eye(lx, ly - 2, 24, 26, [0.2, 0], 0.3, 5) + eye(rx, ry - 2, 24, 26, [0.2, 0], 0.3, 5);
    case 'pesado':
      // Pálpebra caída: tinta demais para manter os olhos abertos.
      return EYES.map(
        ([x, y]) =>
          eye(x, y, 22, 21, [0.2, 0.7], 0.5, 5) +
          outlined(`M${x - 24} ${y + 4} Q${x - 23} ${y - 23} ${x} ${y - 23} Q${x + 23} ${y - 23} ${x + 24} ${y + 4} Q${x} ${y - 2} ${x - 24} ${y + 4} Z`, MADEIRA_SOMBRA, 5),
      ).join('');
    default:
      return eye(lx, ly, 22, 21, [0.6, 0.15], 0.52, 5) + eye(rx, ry, 22, 21, [0.6, 0.15], 0.52, 5);
  }
}

/** Olho em espiral (derrotado). */
function espiral(x: number, y: number): string {
  return (
    oval(x, y, 21, 21, WHITE, 5) +
    line(`M${x} ${y} Q${x + 6} ${y - 2} ${x + 5} ${y + 5} Q${x} ${y + 12} ${x - 8} ${y + 4} Q${x - 12} ${y - 8} ${x} ${y - 11} Q${x + 13} ${y - 10} ${x + 13} ${y + 2}`, 4)
  );
}

/** Sobrancelhas grossas (ficam por cima do musgo). */
function sobrancelhas(pose: BossPose): string {
  const [[lx, ly], [rx, ry]] = EYES as [[number, number], [number, number]];
  switch (pose) {
    case 'raiva':
      return line(`M${lx - 28} ${ly - 36} L${lx + 20} ${ly - 14} M${rx + 28} ${ry - 36} L${rx - 20} ${ry - 14}`, 11);
    case 'salto':
    case 'grito':
      return line(`M${lx - 24} ${ly - 40} Q${lx} ${ly - 54} ${lx + 22} ${ly - 42} M${rx - 22} ${ry - 42} Q${rx} ${ry - 54} ${rx + 24} ${ry - 40}`, 10);
    case 'pesado':
      return line(`M${lx - 24} ${ly - 28} L${lx + 20} ${ly - 36} M${rx - 20} ${ry - 36} L${rx + 24} ${ry - 28}`, 9);
    case 'golpe':
      return line(`M${lx - 24} ${ly - 30} L${lx + 14} ${ly - 22} M${rx - 14} ${ry - 22} L${rx + 24} ${ry - 30}`, 9);
    case 'derrota':
      return line(`M${lx - 22} ${ly - 30} L${lx + 18} ${ly - 36} M${rx - 18} ${ry - 36} L${rx + 22} ${ry - 30}`, 8);
    default:
      // Ar de quem manda na floresta: uma sobrancelha erguida.
      return line(`M${lx - 22} ${ly - 30} L${lx + 18} ${ly - 26} M${rx - 20} ${ry - 32} Q${rx} ${ry - 46} ${rx + 24} ${ry - 38}`, 9);
  }
}

/** Fileira de dentes da lâmina: faixa clara com a borda em serra, presa em cima (ou embaixo, `deBaixo`). */
function dentes(y: number, h: number, deBaixo = false): string {
  const passo = 18;
  const pts: string[] = [];
  for (let x = 290, i = 0; x >= 120; x -= passo / 2, i++) pts.push(`${x} ${deBaixo ? (i % 2 === 0 ? y : y - h) : i % 2 === 0 ? y : y + h}`);
  const borda = deBaixo ? 260 : 0;
  return outlined(`M120 ${borda} L290 ${borda} L${pts.join(' L')} Z`, LAMINA, 3.5);
}

/** O furo cônico que é a boca: miolo escuro, anéis do cone, lâmina como dentes. */
function furo(id: string, d: string, o: { dente?: [number, number]; baixo?: [number, number]; cone?: [number, number, number] }): string {
  const clip = `ap-boca-${id}`;
  let miolo = '';
  if (o.cone) {
    const [cx, cy, s] = o.cone;
    miolo +=
      `<ellipse cx="${cx}" cy="${cy}" rx="${s}" ry="${f(s * 0.7)}" fill="none" stroke="${FURO_ANEL}" stroke-width="5"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${f(s * 0.52)}" ry="${f(s * 0.36)}" fill="none" stroke="${FURO_ANEL}" stroke-width="4"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${f(s * 0.16)}" fill="${FURO_ANEL}"/>`;
  }
  if (o.dente) miolo += dentes(...o.dente);
  if (o.baixo) miolo += dentes(o.baixo[0], o.baixo[1], true);
  return (
    `<clipPath id="${clip}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${FURO}"/>` +
    `<g clip-path="url(#${clip})">${miolo}</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
  );
}

/** A boca, uma por pose. */
function boca(pose: BossPose): string {
  switch (pose) {
    case 'grito':
      return furo('grito', 'M144 130 Q206 118 268 128 Q268 200 206 202 Q146 200 144 130 Z', { dente: [144, 14], cone: [206, 176, 40] });
    case 'salto':
      return furo('salto', 'M178 160 A30 28 0 1 1 238 160 A30 28 0 1 1 178 160 Z', { dente: [140, 10], cone: [208, 168, 20] });
    case 'raiva':
      // Lâmina cerrada: serra em cima e embaixo.
      return furo('raiva', 'M148 134 Q206 124 264 134 L260 188 Q206 198 152 188 Z', { dente: [148, 13], baixo: [178, 13] });
    case 'pesado':
      return line('M156 160 Q168 148 180 160 Q192 172 204 160 Q216 148 228 160 Q240 172 252 158', 7);
    case 'golpe':
      return furo('golpe', 'M190 162 A20 16 0 1 1 230 162 A20 16 0 1 1 190 162 Z', { dente: [148, 8], cone: [210, 166, 10] });
    case 'derrota':
      // Língua de apara pendurada para fora.
      return fita('M214 162 Q208 178 216 186', 12) + rosa(222, 190, 13, 4) + line('M152 160 Q178 146 206 160 Q232 174 260 156', 7);
    default:
      // Sorriso de canto, com a apara presa no canto como um palito.
      return (
        furo('parado', 'M150 140 Q206 156 262 134 Q256 188 206 190 Q158 188 150 140 Z', { dente: [150, 12], cone: [210, 176, 26] }) +
        fita('M256 152 Q272 152 280 162', 12) +
        rosa(286, 170, 13, 4)
      );
  }
}

/** Manivela presa no lado: braço de metal girando em volta do eixo e o puxador vermelho na ponta. */
function manivela(graus: number, comprimento = 118, giro = false): string {
  const [ax, ay] = EIXO;
  const a = (graus * Math.PI) / 180;
  const ex = ax + Math.cos(a) * comprimento;
  const ey = ay + Math.sin(a) * comprimento;
  // Riscos de giro: dois arcos logo atrás do puxador, no sentido em que ele roda (horário).
  const arcos = giro
    ? [0, 30]
        .map((k) => {
          const r = comprimento - k;
          const a0 = a - 0.62 + k / 200;
          const a1 = a - 0.22;
          return line(`M${f(ax + Math.cos(a0) * r)} ${f(ay + Math.sin(a0) * r)} A${r} ${r} 0 0 1 ${f(ax + Math.cos(a1) * r)} ${f(ay + Math.sin(a1) * r)}`, 5);
        })
        .join('')
    : '';
  return (
    arcos +
    capsule(
      [
        [ax, ay],
        [ex, ey],
      ],
      13,
      METAL,
      6,
    ) +
    oval(ax, ay, 15, 15, METAL_SOMBRA, 6) +
    `<circle cx="${ax}" cy="${ay}" r="4.5" fill="${INK}"/>` +
    oval(ex, ey, 17, 21, PUXADOR, 6) +
    `<path d="M${f(ex - 14)} ${f(ey + 6)} Q${f(ex)} ${f(ey + 20)} ${f(ex + 14)} ${f(ey + 6)} Q${f(ex + 10)} ${f(ey + 17)} ${f(ex)} ${f(ey + 18)} Q${f(ex - 10)} ${f(ey + 17)} ${f(ex - 14)} ${f(ey + 6)} Z" fill="${PUXADOR_SOMBRA}"/>` +
    `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="17" ry="21" fill="none" stroke="${INK}" stroke-width="6"/>` +
    shine(`M${f(ex - 8)} ${f(ey - 10)} Q${f(ex - 4)} ${f(ey - 16)} ${f(ex + 3)} ${f(ey - 15)}`, 4.5, 0.85)
  );
}

/** Folhas da coroa, um jeito por pose: espetadas na raiva, caídas no peso, voando na derrota. */
function coroa(pose: BossPose): string {
  switch (pose) {
    case 'raiva':
      return folha(132, 0, -105, 1) + folha(152, -4, -88, 1.1) + folha(172, 0, -70, 1);
    case 'salto':
    case 'grito':
      return folha(138, -2, -118, 1.05) + folha(160, -6, -62, 1.05);
    case 'pesado':
      return folha(140, 2, 170, 0.95) + folha(168, 2, 12, 0.95);
    case 'derrota':
      return folha(150, 0, 160, 0.9) + folha(70, -30, -20, 0.7) + folha(244, -34, 30, 0.7);
    default:
      return folha(142, 0, -112, 1) + folha(160, -4, -68, 1.05);
  }
}

/** Perninhas de raiz com dedinhos; no salto ficam penduradas e abertas. */
function raizes(pose: BossPose, cor: string, sombra: string): string {
  const abre = pose === 'salto' ? 8 : 0;
  return [56, 118, 186, 250]
    .map((x, i) => {
      const lado = i < 2 ? -1 : 1;
      const b = x + lado * abre;
      return (
        outlined(`M${x - 15} 196 Q${x - 14} 212 ${b - 22} 218 Q${b - 30} 226 ${b - 16} 226 L${b + 18} 226 Q${b + 30} 226 ${b + 22} 217 Q${x + 14} 212 ${x + 14} 196 Z`, cor, 6) +
        `<path d="M${b - 18} 222 L${b + 20} 222" stroke="${sombra}" stroke-width="5" stroke-linecap="round"/>`
      );
    })
    .join('');
}

/** Extras de emoção: veia, suor, gotas de tinta, aparas voando, estrelinhas. */
function extras(pose: BossPose): string {
  switch (pose) {
    case 'raiva':
      return (
        line('M100 70 Q110 70 110 60 M120 60 Q120 70 130 70 M130 80 Q120 80 120 90 M110 90 Q110 80 100 80', 6, '#ffd2c2') +
        blush(122, 124, 15, 0.7)
      );
    case 'grito':
      return rosa(292, 112, 12, 4) + rosa(300, 198, 10, 4) + line('M282 140 L306 136 M284 160 L310 162', 6) + fita('M262 150 Q278 148 288 140', 10);
    case 'salto':
      return line('M298 56 L312 48 M300 80 L314 80', 6);
    case 'pesado':
      return (
        outlined('M120 66 Q128 80 128 86 A8 8 0 1 1 112 86 Q112 80 120 66 Z', '#bfe3ff', 4) +
        outlined('M290 66 Q296 76 296 80 A6 6 0 1 1 284 80 Q284 76 290 66 Z', '#bfe3ff', 3.5)
      );
    case 'golpe':
      // Lascas de madeira saltando do bloco.
      return (
        star(206, -22, 13) +
        star(282, 22, 11) +
        star(302, 72, 9) +
        outlined('M292 132 L308 124 L304 138 Z', MADEIRA_LUZ, 4) +
        outlined('M296 158 L312 162 L300 170 Z', MADEIRA_LUZ, 4) +
        line('M300 104 L310 96 M302 188 L312 194', 5)
      );
    case 'derrota':
      return star(110, 2, 12) + star(196, -22, 10) + star(266, 0, 11);
    default:
      return blush(122, 122, 14) + blush(282, 112, 9);
  }
}

/** O Apontador numa pose. */
export function apontadorSvg(pose: BossPose, variant = 0): string {
  const heavy = pose === 'pesado';
  const gota = (x: number, y: number, r: number) =>
    outlined(`M${x} ${y - r * 2.2} Q${x + r} ${y - r * 0.6} ${x + r} ${y} A${r} ${r} 0 1 1 ${x - r} ${y} Q${x - r} ${y - r * 0.6} ${x} ${y - r * 2.2} Z`, TINTA, 4);
  const angulo: Record<BossPose, number> = { parado: -104, raiva: -72, salto: -108, grito: -62, pesado: 96, golpe: -56, derrota: 106 };
  const braco: Partial<Record<BossPose, number>> = { pesado: 92, derrota: 86, golpe: 104 };
  const encharcado = heavy
    ? `<g clip-path="url(#ap-bloco)">` +
      `<path d="M0 112 Q40 100 80 112 T160 110 T240 112 T320 106 L320 240 L0 240 Z" fill="${TINTA}"/>` +
      `<path d="M0 114 Q40 104 86 114 L86 240 L0 240 Z" fill="${TINTA_SOMBRA}"/>` +
      line('M30 150 Q34 170 30 186', 5, TINTA_CLARA) +
      `</g>`
    : '';
  return svgDoc(
    BOSS_VB,
    `<clipPath id="ap-bloco"><path d="${BLOCO}"/></clipPath>` +
      `<clipPath id="ap-placa"><path d="${PLACA}"/></clipPath>` +
      `<clipPath id="ap-musgo"><path d="${MUSGO_PATH}"/></clipPath>` +
      `<ellipse cx="150" cy="226" rx="140" ry="10" fill="${INK}" opacity="0.18"/>` +
      raizes(pose, heavy ? TINTA : RAIZ, heavy ? TINTA_SOMBRA : RAIZ_SOMBRA) +
      // Bloco de madeira: frente, lado (mais escuro), veios, barriga de sombra e o brilho.
      `<path d="${BLOCO}" fill="${MADEIRA}"/>` +
      `<g clip-path="url(#ap-bloco)">` +
      `<path d="${LADO}" fill="${MADEIRA_LADO}"/>` +
      line('M30 150 Q42 170 34 192 M104 148 Q112 168 106 190 M270 66 Q280 80 274 96', 4, VEIO) +
      `<path d="M86 178 Q190 186 300 176 L300 210 L86 210 Z" fill="${MADEIRA_SOMBRA}"/>` +
      `</g>` +
      line('M98 72 Q96 120 98 162', 5, MADEIRA_LUZ) +
      encharcado +
      line('M86 32 Q80 116 86 202', 5) +
      `<path d="${BLOCO}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      (heavy ? gota(44, 232, 7) + gota(130, 240, 8) + gota(204, 236, 7) + gota(266, 228, 6) : '') +
      // Placa de metal com parafusos.
      `<path d="${PLACA}" fill="${METAL}"/>` +
      `<path d="M120 182 L292 182 L292 202 L120 202 Z" fill="${heavy ? TINTA : METAL_SOMBRA}" clip-path="url(#ap-placa)"/>` +
      // Pesado: a tinta escorre também pela placa.
      (heavy
        ? `<path d="M132 114 L132 150 Q132 158 138 158 Q144 158 144 150 L144 114 Z M266 114 L266 136 Q266 144 272 144 Q278 144 278 136 L278 114 Z" fill="${TINTA}" clip-path="url(#ap-placa)"/>`
        : '') +
      `<path d="${PLACA}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      shine('M140 124 L184 124', 5, 0.9) +
      [
        [137, 127],
        [275, 127],
        [137, 185],
        [275, 185],
      ]
        .map(([x, y]) => oval(x!, y!, 5, 5, LAMINA, 3) + line(`M${x! - 3} ${y! + 3} L${x! + 3} ${y! - 3}`, 2.4))
        .join('') +
      // Coroa de musgo com a barriga mais escura e os tufos de luz.
      `<path d="${MUSGO_PATH}" fill="${heavy ? '#358f37' : MUSGO}"/>` +
      `<path d="M0 40 Q40 30 80 40 T160 40 T240 40 T320 40 L320 80 L0 80 Z" fill="${MUSGO_SOMBRA}" clip-path="url(#ap-musgo)"/>` +
      `<path d="${MUSGO_PATH}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>` +
      line('M30 20 Q38 8 54 8 M110 4 Q124 -6 138 -2 M206 4 Q220 -6 234 2', 5, MUSGO_LUZ) +
      coroa(pose) +
      manivela(angulo[pose], braco[pose], pose === 'raiva' || pose === 'grito') +
      olhos(pose) +
      sobrancelhas(pose) +
      boca(pose) +
      extras(pose),
    variant,
  );
}

/** Onda de aparas e folhas correndo para a direita, rente ao chão (quadro de `ondaSvg`). */
export function apontadorOndaSvg(variant = 0): string {
  const crista = 'M-28 0 Q-16 -4 -8 -13 Q0 -26 9 -19 Q13 -13 7 -10 Q1 -10 3 -4 Q5 0 10 0 Z';
  const folhinha = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})">${outlined('M0 0 Q4 -3.4 9 0 Q4 3.4 0 0 Z', FOLHA, 1.4)}</g>`;
  return svgDoc(
    '-34 -30 46 32',
    `<clipPath id="ap-onda"><path d="${crista}"/></clipPath>` +
      line('M-32 -12 L-24 -12 M-33 -5 L-22 -5', 1.8) +
      folhinha(-20, -14, -150) +
      `<path d="${crista}" fill="${APARA}"/>` +
      `<g clip-path="url(#ap-onda)">` +
      `<path d="${crista}" fill="none" stroke="${APARA_BORDA}" stroke-width="5"/>` +
      line('M-20 -1 Q-10 -4 -5 -10 Q0 -16 4 -13', 1.6, APARA_SOMBRA) +
      `</g>` +
      outlined(crista, 'none', 2.2) +
      folhinha(-9, -19, -75) +
      folhinha(-1, -21, -35) +
      `<circle cx="2" cy="-15" r="1.6" fill="${INK}"/><circle cx="6.5" cy="-15.5" r="1.4" fill="${INK}"/>` +
      line('M0 -19 L4 -17.5 M5.5 -17.5 L9 -19.5', 1.1),
    variant,
  );
}

/** Bolota da chuva, caindo com cara de travessa (quadro de `borraoGotaSvg`, centro do corpo em (0, 0)). */
export function apontadorBolotaSvg(variant = 0): string {
  return svgDoc(
    '-14 -26 28 40',
    // Cabinho e folhinha.
    line('M0 -11 Q1 -17 4 -20', 4.6) +
      line('M0 -11 Q1 -17 4 -20', 2, '#7a5130') +
      `<g transform="translate(3 -19) rotate(-30)">${outlined('M0 0 Q4 -3.6 9 0 Q4 3.6 0 0 Z', FOLHA, 1.5)}</g>` +
      // Fruto.
      outlined('M-9.5 -2 Q-10.5 8 0 12.5 Q10.5 8 9.5 -2 Z', '#c48a3c', 2.4) +
      `<path d="M4 -1 Q9 2 8 7 Q5 11 1 12 Q7 6 4 -1 Z" fill="#9a6526"/>` +
      shine('M-6.5 1 Q-7 5 -5 7.5', 1.6) +
      // Chapéu quadriculado.
      outlined('M-11.5 -1 Q-12 -11 0 -12.5 Q12 -11 11.5 -1 Q0 1.5 -11.5 -1 Z', '#6e4a2a', 2.4) +
      line('M-8 -8 L-4 -1 M-3 -11 L2 -1 M3 -11 L7 -2 M-9 -4 L9 -9 M-10 -1.5 L10 -5', 1, '#4c3019') +
      // Cara travessa: olhos de lado, sobrancelha em V e sorriso de um dente.
      `<ellipse cx="-3.4" cy="3.6" rx="2.6" ry="2.9" fill="${WHITE}" stroke="${INK}" stroke-width="1"/><ellipse cx="3.6" cy="3.6" rx="2.6" ry="2.9" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="-2.4" cy="4.3" r="1.4" fill="${INK}"/><circle cx="4.6" cy="4.3" r="1.4" fill="${INK}"/>` +
      line('M-6.4 0.4 L-1.4 1.8 M6.6 0.4 L1.6 1.8', 1.3) +
      outlined('M-3 8 Q1 10.6 5 7.6 Q2 9.6 -3 8 Z', PALETTE.vermelhoBoca, 1.1) +
      `<path d="M1.4 8.9 L2 10.6 L3 8.6 Z" fill="${WHITE}"/>`,
    variant,
  );
}

/** A apara-bumerangue: roseta de apara de lado, com a borda em serra pintada de coral, a ponta de grafite e riscos de giro. */
export function aparaBumerangueSvg(variant = 0): string {
  const dentes = 14;
  const pts: string[] = [];
  for (let i = 0; i < dentes * 2; i++) {
    const a = (i / (dentes * 2)) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 : 0.8;
    pts.push(`${f(Math.cos(a) * 19 * k)} ${f(Math.sin(a) * 12.5 * k)}`);
  }
  const voltas: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const a = t * Math.PI * 3;
    voltas.push(`${i === 0 ? 'M' : 'L'}${f(Math.cos(a) * 12 * t)} ${f(Math.sin(a) * 7.8 * t)}`);
  }
  return svgDoc(
    '-24 -16 48 32',
    line('M-22 -4 A22 14 0 0 1 -6 -14.5 M22 4 A22 14 0 0 1 6 14.5', 2) +
      `<path d="M15 -2 L23 0.5 L15 3.4 Z" fill="${GRAFITE}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      outlined(`M${pts.join(' L')} Z`, APARA_BORDA, 2.4) +
      `<ellipse cx="0" cy="0" rx="13.5" ry="8.8" fill="${APARA}"/>` +
      line(voltas.join(' '), 2.2, APARA_SOMBRA) +
      `<ellipse cx="0" cy="0" rx="13.5" ry="8.8" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.5"/>` +
      `<circle cx="0" cy="0" r="2" fill="${GRAFITE}"/>` +
      shine('M-12 -4 Q-8 -8 -2 -8.5', 1.4),
    variant,
  );
}

export const CHEFE_APONTADOR: PeleChefe = {
  id: 'floresta',
  nome: 'O Apontador',
  titulo: 'APONTADOR',
  frase: 'ele quer apontar a floresta inteira!',
  respingo: 0x9b5a2e,
  chefe: apontadorSvg,
  onda: apontadorOndaSvg,
  chuva: apontadorBolotaSvg,
  golpe: aparaBumerangueSvg,
};
