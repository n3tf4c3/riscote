import { INK, PALETTE, WHITE, blush, capsule, eye, line, openMouth, outlined, oval, shine, svgDoc } from './svg';

// Poderes novos dos bichos da Floresta Encantada (2026-11-01): o casulo e a borboleta da
// lagarta-cereja, a bola de espinhos e o tombo do ouriço-escudo, o broto de espinho da pinha, o
// graveto que cai e a seiva lançada em arco pelo caracol. As cores e as caras são as mesmas de
// `pele-floresta.ts`. O fundo do bosque é claro e verde-pálido, então todo perigo tem contorno
// marinho firme e cor saturada; nenhum usa o azul da tinta dos jogadores, para não parecer bola nem
// item. Cada função devolve o quadro (viewBox) e o ponto de apoio combinados com o jogo.

/** Espessura de contorno para ~0,8 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.8 / k).toFixed(2);

const CEREJA = '#d8213f';
const CEREJA_ESCURA = '#8c1230';
const CREME = '#fff0c2';
const SEDA = '#fff3dc';
const SEDA_SOMBRA = '#e8d6b4';
const SEDA_FIO = '#c9b088';
const CASTANHA = '#b4612a';
const CASTANHA_ESCURA = '#5e2c12';
const CASTANHA_CLARA = '#d98a48';
const TERRA = '#8a5530';
const FERRUGEM = '#c4511d';
const ESPINHO = '#5a2f1b';
const ESPINHO_SOMBRA = '#361a0d';
const ESPINHO_PONTA = '#a8653a';
const ESPINHO_MURCHO = '#7a4a2e';
const PELUCIA = '#f2c58c';
const PELUCIA_SOMBRA = '#d79a5c';
const FOCINHO = '#f7dcb4';
const FOLHA = '#2f8a2e';
const FOLHA_ESCURA = '#1b5a1d';
const FOLHA_CLARA = '#6cbf3c';
const BROTINHO = '#7cc242';
const GRAVETO = '#9a5a2a';
const GRAVETO_ESCURO = '#62340f';
const GRAVETO_CORTE = '#e0aa6a';
const SEIVA = '#c6d64a';
const SEIVA_ESCURA = '#7f9218';

/** Pálpebras de bravo: a metade de cima do olho tampada pela cor da pele, cortada em diagonal. */
function lids(d: string, fill: string, w: number): string {
  return `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
}

/** Estrelinha de cinco pontas (tontura). */
function estrela(cx: number, cy: number, r: number, w: number, rot = 0): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = ((rot - 90 + i * 36) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.45;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return outlined(`${d}Z`, PALETTE.amarelo, w);
}

/** Olho em espiral (tonto): branco com contorno e uma espiral marinho de meias-voltas. */
function olhoEspiral(cx: number, cy: number, rx: number, ry: number, s: number, w: number): string {
  let d = `M${cx} ${cy}`;
  for (let i = 1; i <= 4; i++) {
    const r = (i * s) / 2;
    const x = i % 2 === 1 ? cx + ((i + 1) / 2) * s : cx - (i / 2) * s;
    d += ` A${r} ${r} 0 0 1 ${x.toFixed(2)} ${cy}`;
  }
  return oval(cx, cy, rx, ry, WHITE, w) + `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${(w * 0.75).toFixed(2)}" stroke-linecap="round"/>`;
}

// ---------------------------------------------------------------- casulo (aviso da borboleta)

const CASULO_LW = lw(0.2);
const CASULO = 'M50 13 Q74 15 83 42 Q91 68 80 86 Q72 96 50 96 Q28 96 20 86 Q9 68 17 42 Q26 15 50 13 Z';

/**
 * Casulo: a lagarta-cereja enrolada num casulo de seda creme, com voltas de fio por cima. Só a
 * carinha carmim espia pela abertura, de olhos apertados e dentes cerrados de esforço, com uma gota
 * de suor; os chifrinhos furam a seda no alto e os riscos dos lados mostram que ele treme. É o
 * aviso: algo vai sair dali. Base no chão em (50, 96).
 */
export function casuloSvg(variant = 0): string {
  const w = CASULO_LW;
  // Voltas de fio por cima da seda, de baixo para cima (a de cima passa rente ao queixo).
  const voltas =
    capsule([[8, 84], [50, 92], [92, 80]], 4.5, SEDA, 1.8) +
    capsule([[6, 70], [50, 80], [94, 66]], 4.5, SEDA, 1.8) +
    capsule([[8, 56], [50, 68], [92, 52]], 4.5, SEDA, 1.8);
  return svgDoc(
    '0 0 100 100',
    `<ellipse cx="50" cy="96" rx="36" ry="3.5" fill="${INK}" opacity="0.16"/>` +
      // Chifrinhos furando a seda, por trás do casulo.
      capsule([[42, 22], [37, 11], [31, 6]], 5, CREME, 2.6) +
      capsule([[58, 21], [63, 10], [70, 5]], 5, CREME, 2.6) +
      `<clipPath id="fp-casulo"><path d="${CASULO}"/></clipPath>` +
      `<path d="${CASULO}" fill="${SEDA}"/>` +
      `<g clip-path="url(#fp-casulo)">` +
      `<ellipse cx="70" cy="92" rx="34" ry="40" fill="${SEDA_SOMBRA}"/>` +
      voltas +
      `</g>` +
      `<path d="${CASULO}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M23 58 Q22 40 33 27', 4, 0.9) +
      // Fiapos soltos.
      line('M20 30 Q13 26 12 18 M82 34 Q90 30 90 22', 2, SEDA_FIO) +
      // Abertura com a cara da lagarta.
      `<clipPath id="fp-cara"><ellipse cx="50" cy="40" rx="21" ry="16"/></clipPath>` +
      `<ellipse cx="50" cy="40" rx="21" ry="16" fill="${CEREJA}"/>` +
      `<ellipse cx="52" cy="58" rx="26" ry="10" fill="${CEREJA_ESCURA}" clip-path="url(#fp-cara)"/>` +
      `<ellipse cx="50" cy="40" rx="21" ry="16" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
      // Borda de seda dobrada por cima da testa.
      outlined('M28 36 Q34 21 50 21 Q66 21 72 36 Q62 29 50 29 Q38 29 28 36 Z', SEDA, 2.6) +
      // Olhos apertados de esforço, dentes cerrados e bochechas.
      line('M36 35 L44 39.5 L36 44 M64 35 L56 39.5 L64 44', 3.6) +
      outlined('M42 46 L58 46 L57 53 L43 53 Z', WHITE, 2.2) +
      line('M50 46.4 L50 52.6 M42.6 49.5 L57.4 49.5', 1.4) +
      blush(34, 47, 4, 0.75) +
      blush(66, 47, 4, 0.75) +
      // Gota de suor (branca, nunca azul).
      outlined('M76 22 Q81 29 79 33 Q76 36 73 33 Q71 29 76 22 Z', WHITE, 2) +
      // Riscos de tremor dos dois lados.
      line('M9 38 Q5 46 9 54 M4 32 Q-1 46 4 60', 3) +
      line('M91 38 Q95 46 91 54 M96 32 Q101 46 96 60', 3),
    variant,
  );
}

// ---------------------------------------------------------------- borboleta-cereja

const BORBOLETA_LW = lw(0.22);

/**
 * Borboleta: a lagarta-cereja depois do casulo. Corpinho de gomos carmim com pintas creme, a mesma
 * cabeça (agora de cenho fechado e dentes cerrados, decidida) e as antenas creme que eram os
 * chifrinhos. Asas de cima carmim com pintas creme e borda vinho; as de baixo creme com pintas
 * carmim. `frame` 0: asas abertas; 1: asas fechando na batida. Centro do corpo em (60, 50),
 * olhando para a direita.
 */
export function borboletaSvg(frame: number, variant = 0): string {
  const w = BORBOLETA_LW;
  const fechando = frame % 2 === 1;
  const sx = fechando ? 0.5 : 1;
  const lift = fechando ? -5 : 0;
  // Mapeia um ponto da asa aberta para a pose do quadro (estreita em x e ergue as pontas).
  const P = (x: number, y: number) => `${(60 + (x - 60) * sx).toFixed(1)} ${(y + (lift * Math.abs(x - 60)) / 50).toFixed(1)}`;
  const asa = (d: (m: (x: number, y: number) => string) => string, fill: string, sombra: string, pintas: Array<[number, number, number, string]>, id: string) => {
    const path = d(P);
    const [rx0, ry0] = P(60, 50).split(' ').map(Number) as [number, number];
    let spots = '';
    for (const [x, y, r, c] of pintas) {
      const [px, py] = P(x, y).split(' ').map(Number) as [number, number];
      spots += `<ellipse cx="${px}" cy="${py}" rx="${(r * Math.max(sx, 0.55)).toFixed(1)}" ry="${r}" fill="${c}" stroke="${INK}" stroke-width="1.8"/>`;
    }
    return (
      `<clipPath id="${id}"><path d="${path}"/></clipPath>` +
      `<path d="${path}" fill="${fill}"/>` +
      `<g clip-path="url(#${id})"><ellipse cx="${rx0}" cy="${ry0}" rx="${(20 * Math.max(sx, 0.5)).toFixed(1)}" ry="18" fill="${sombra}"/>${spots}</g>` +
      `<path d="${path}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`
    );
  };
  const espelho = (x: number) => 120 - x;
  const cimaD = (s: 1 | -1) => (m: (x: number, y: number) => string) => {
    const X = (x: number) => (s > 0 ? x : espelho(x));
    return `M${m(X(62), 44)} Q${m(X(76), 2)} ${m(X(104), 5)} Q${m(X(119), 9)} ${m(X(112), 30)} Q${m(X(104), 48)} ${m(X(63), 54)} Z`;
  };
  const baixoD = (s: 1 | -1) => (m: (x: number, y: number) => string) => {
    const X = (x: number) => (s > 0 ? x : espelho(x));
    return `M${m(X(62), 52)} Q${m(X(96), 48)} ${m(X(99), 72)} Q${m(X(100), 94)} ${m(X(80), 92)} Q${m(X(65), 88)} ${m(X(61), 60)} Z`;
  };
  const pCima = (s: 1 | -1): Array<[number, number, number, string]> => {
    const X = (x: number) => (s > 0 ? x : espelho(x));
    return [
      [X(98), 17, 6.5, CREME],
      [X(84), 30, 4.5, CREME],
      [X(106), 31, 3.2, CREME],
    ];
  };
  const pBaixo = (s: 1 | -1): Array<[number, number, number, string]> => {
    const X = (x: number) => (s > 0 ? x : espelho(x));
    return [
      [X(86), 74, 5.5, CEREJA],
      [X(76), 85, 3, CEREJA],
    ];
  };
  const asas =
    asa(baixoD(-1), CREME, '#f1cf86', pBaixo(-1), 'fp-asa0') +
    asa(baixoD(1), CREME, '#f1cf86', pBaixo(1), 'fp-asa1') +
    asa(cimaD(-1), CEREJA, CEREJA_ESCURA, pCima(-1), 'fp-asa2') +
    asa(cimaD(1), CEREJA, CEREJA_ESCURA, pCima(1), 'fp-asa3');
  // Gomos do corpo, de cima para baixo.
  let corpo = '';
  ([[60, 52, 9.5, 8], [60, 64, 8.5, 7.5], [60, 75, 6.5, 6.5]] as const).forEach(([cx, cy, rx, ry], i) => {
    corpo +=
      `<clipPath id="fp-gomo${i}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${CEREJA}"/>` +
      `<ellipse cx="${cx + 4}" cy="${cy + 3}" rx="${rx}" ry="${ry}" fill="${CEREJA_ESCURA}" clip-path="url(#fp-gomo${i})"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
      `<circle cx="${cx - rx * 0.35}" cy="${cy - ry * 0.25}" r="${(ry * 0.3).toFixed(1)}" fill="${CREME}" stroke="${INK}" stroke-width="1.5"/>`;
  });
  const cabeca = 'M65 17 Q80 17 80 32 Q80 47 65 47 Q49 47 49 32 Q49 17 65 17 Z';
  const batida = fechando ? line('M27 16 Q21 26 27 36 M93 16 Q99 26 93 36 M33 62 Q28 70 33 78 M87 62 Q92 70 87 78', 2.8) : '';
  return svgDoc(
    '0 0 120 100',
    batida +
      asas +
      corpo +
      // Antenas creme (eram os chifrinhos), com bolinha na ponta.
      capsule([[59, 20], [53, 10], [46, 6]], 3.2, CREME, 2.2) +
      capsule([[70, 19], [76, 9], [83, 6]], 3.2, CREME, 2.2) +
      oval(45, 6, 3.6, 3.6, CREME, 2) +
      oval(84, 6, 3.6, 3.6, CREME, 2) +
      `<clipPath id="fp-cabeca"><path d="${cabeca}"/></clipPath>` +
      `<path d="${cabeca}" fill="${CEREJA}"/>` +
      `<ellipse cx="68" cy="50" rx="20" ry="9" fill="${CEREJA_ESCURA}" clip-path="url(#fp-cabeca)"/>` +
      `<path d="${cabeca}" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
      shine('M53 30 Q54 23 60 20', 2.8, 0.8) +
      eye(61, 31, 5.5, 6, [0.7, 0.15], 0.6, 2.2) +
      eye(73.5, 30.5, 5, 6, [0.7, 0.15], 0.6, 2.2) +
      lids('M54.6 27.5 L66.6 31 L66.6 24.5 L54.6 24 Z M68.4 30.5 L78.6 26.5 L78.6 24 L68.4 24.5 Z', CEREJA, 1.6) +
      line('M53.5 26.5 L66.5 31 M68.5 30.4 L80 25', 3.4) +
      outlined('M62 39 L77 38 L76 43.5 L63 44.5 Z', WHITE, 1.8) +
      line('M67 38.8 L67.3 44.2 M72 38.5 L72.2 43.9 M62.5 41.6 L76.5 40.8', 1.1) +
      blush(55, 39, 3.2, 0.7),
    variant,
  );
}

// ---------------------------------------------------------------- ouriço em bola

const BOLA_LW = lw(0.2);

/** Contorno de estrela: `n` pontas alternando entre os raios `rOut` e `rIn`, giradas `rot` graus. */
function coroa(cx: number, cy: number, n: number, rIn: number, rOut: (i: number) => number, rot = 0): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180;
    const b = ((rot + ((i + 0.5) * 360) / n) * Math.PI) / 180;
    const ro = rOut(i);
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * ro).toFixed(1)} ${(cy + Math.sin(a) * ro).toFixed(1)} L${(cx + Math.cos(b) * rIn).toFixed(1)} ${(cy + Math.sin(b) * rIn).toFixed(1)} `;
  }
  return `${d}Z`;
}

/**
 * Ouriço em bola: enrolado numa bola de espinhos castanho-escuros com sombra mais escura embaixo,
 * riscos claros curvos de giro e o focinho claro espiando de um lado, com o olho bravo. Centro em
 * (0, 0), ~84 de diâmetro; o jogo gira o desenho.
 */
export function ouricoBolaSvg(variant = 0): string {
  const w = BOLA_LW;
  const n = 15;
  const contorno = coroa(0, 0, n, 31, (i) => (i % 2 === 0 ? 42 : 39.5), -90);
  let pontas = '';
  for (let i = 0; i < n; i++) {
    const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
    const ro = i % 2 === 0 ? 42 : 39.5;
    pontas += `M${(Math.cos(a) * (ro - 5)).toFixed(1)} ${(Math.sin(a) * (ro - 5)).toFixed(1)} L${(Math.cos(a) * (ro - 12)).toFixed(1)} ${(Math.sin(a) * (ro - 12)).toFixed(1)} `;
  }
  return svgDoc(
    '-50 -50 100 100',
    `<clipPath id="fp-bola"><path d="${contorno}"/></clipPath>` +
      `<path d="${contorno}" fill="${ESPINHO}"/>` +
      `<g clip-path="url(#fp-bola)"><path d="M-46 14 Q-10 30 22 6 Q38 -8 46 -30 L60 60 L-60 60 Z" fill="${ESPINHO_SOMBRA}"/></g>` +
      `<path d="${contorno}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      `<path d="${pontas}" fill="none" stroke="${ESPINHO_PONTA}" stroke-width="2.6" stroke-linecap="round"/>` +
      // Riscos curvos de giro, por dentro.
      line('M-21 -10 A23 23 0 0 1 4 -23 M-12 12 A16 16 0 0 1 -14 -6 M16 -16 A21 21 0 0 1 20 10', 3.4, ESPINHO_PONTA) +
      line('M4 -23 L-1 -27 M4 -23 L0 -18', 3, ESPINHO_PONTA) +
      shine('M-30 -12 Q-24 -28 -8 -33', 3.6, 0.55) +
      // Focinho espiando entre os espinhos, com o olho bravo.
      oval(22, 12, 15, 11, FOCINHO, w) +
      oval(36, 10, 4, 3.6, INK, 0) +
      `<circle cx="35" cy="8.6" r="1.3" fill="${WHITE}"/>` +
      eye(19, 8, 5, 5.5, [0.6, 0.2], 0.6, 2) +
      lids('M13.6 6.5 L25 8.5 L25 2 L13.6 2 Z', FOCINHO, 1.6) +
      line('M12.5 5.5 L25.5 9', 3.4) +
      line('M17 19 Q22 16 28 18.5', 2.6),
    variant,
  );
}

// ---------------------------------------------------------------- ouriço tonto

const TONTO_LW = lw(0.23);
const OURICO = 'M12 82 Q10 52 32 38 Q54 26 78 32 Q100 40 100 68 Q100 88 86 88 L22 88 Q12 88 12 82 Z';

/** Espinhos murchos: penteados para trás e caídos, baixinhos, ao longo de todo o lombo. */
function espinhosMurchos(): { crown: string; tips: string } {
  const cx = 58;
  const cy = 70;
  const n = 9;
  const a0 = -172;
  const a1 = -28;
  const pt = (a: number, r: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(cx + Math.cos(rad) * r).toFixed(1)} ${(cy + Math.sin(rad) * r).toFixed(1)}`;
  };
  const step = (a1 - a0) / n;
  let d = `M${pt(a0, 24)}`;
  let tips = '';
  for (let i = 0; i < n; i++) {
    const a = a0 + step * i;
    // A ponta cai para trás (ângulo menor) e para fora só um pouco: espinho deitado.
    const tip = pt(a - step * 0.55, 37 + (i % 2) * 2);
    d += ` Q${pt(a + step * 0.3, 36)} ${tip} Q${pt(a + step * 0.2, 31)} ${pt(a + step, 25)}`;
    tips += `M${pt(a + step * 0.15, 33)} L${pt(a - step * 0.2, 35)} `;
  }
  d += ` L${pt(a1, 18)} L${pt(a0, 18)} Z`;
  return { crown: d, tips };
}

/**
 * Ouriço tonto: desenrolado depois do giro, meio torto, com os espinhos murchos deitados no lombo
 * (vulnerável de todos os lados), olhos em espiral, língua de fora e estrelinhas rodando em cima.
 * Mesmo quadro do ouriço-escudo; pés em (55, 89).
 */
export function ouricoTontoSvg(variant = 0): string {
  const w = TONTO_LW;
  const { crown, tips } = espinhosMurchos();
  return svgDoc(
    '2 14 106 80',
    `<ellipse cx="55" cy="90" rx="44" ry="3" fill="${INK}" opacity="0.14"/>` +
      `<g transform="rotate(-4 55 89)">` +
      oval(28, 88, 8, 3.6, INK, 0) +
      oval(80, 88, 8, 3.6, INK, 0) +
      `<clipPath id="fp-tonto"><path d="${OURICO}"/></clipPath>` +
      `<path d="${OURICO}" fill="${PELUCIA}"/>` +
      `<ellipse cx="40" cy="92" rx="40" ry="14" fill="${PELUCIA_SOMBRA}" clip-path="url(#fp-tonto)"/>` +
      `<path d="${OURICO}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      line('M20 66 Q24 62 28 65 M24 78 Q28 74 32 77', 2, PELUCIA_SOMBRA) +
      `<path d="${crown}" fill="${ESPINHO_MURCHO}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      `<path d="${tips}" fill="none" stroke="${ESPINHO_PONTA}" stroke-width="2" stroke-linecap="round"/>` +
      shine('M17 64 Q19 56 24 51', 2.6, 0.7) +
      // Focinho com a cara tonta.
      oval(82, 70, 19, 15, FOCINHO, w) +
      oval(101, 67, 4, 3.4, INK, 0) +
      `<circle cx="100" cy="65.8" r="1.2" fill="${WHITE}"/>` +
      olhoEspiral(76, 63, 5.8, 6.4, 1.7, 1.9) +
      olhoEspiral(91, 62, 5.4, 6.4, 1.6, 1.9) +
      openMouth('M73 74 Q78 71 83 74 Q88 71 93 74 Q91 81 84 81.5 Q76 81.5 73 74 Z', [84, 82, 6], 1.8) +
      outlined('M80 78 Q80 86 85 86.5 Q89.5 86 88.5 78 Z', PALETTE.lingua, 1.6) +
      line('M84.3 79.5 L84.6 84', 1.1, PALETTE.vermelhoBoca) +
      blush(70, 75, 3.4, 0.6) +
      `</g>` +
      // Estrelinhas rodando acima da cabeça.
      `<ellipse cx="80" cy="30" rx="19" ry="5.5" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.55"/>` +
      estrela(63, 29, 5.6, 1.7, 10) +
      estrela(93, 25, 5, 1.7, -14) +
      estrela(83, 35.5, 4.4, 1.6, 30),
    variant,
  );
}

// ---------------------------------------------------------------- broto de espinho

const BROTO_LW = lw(0.4);

/** Folha pontuda de `a` até a ponta `b`, com `wd` de largura no meio. */
function lamina(a: readonly [number, number], b: readonly [number, number], wd: number): { d: string; mid: string; px: number; py: number } {
  const [ax, ay] = a;
  const [bx, by] = b;
  const len = Math.hypot(bx - ax, by - ay);
  const px = -(by - ay) / len;
  const py = (bx - ax) / len;
  const mx = ax + (bx - ax) * 0.45;
  const my = ay + (by - ay) * 0.45;
  const f = (n: number) => n.toFixed(1);
  const d =
    `M${f(ax + px * 1.5)} ${f(ay + py * 1.5)} Q${f(mx + px * wd)} ${f(my + py * wd)} ${f(bx)} ${f(by)} ` +
    `Q${f(mx - px * wd)} ${f(my - py * wd)} ${f(ax - px * 1.5)} ${f(ay - py * 1.5)} Z`;
  const mid = `M${f(ax + (bx - ax) * 0.15)} ${f(ay + (by - ay) * 0.15)} L${f(ax + (bx - ax) * 0.75)} ${f(ay + (by - ay) * 0.75)}`;
  return { d, mid, px, py };
}

/** Espinhos nas bordas de uma folha: triângulos apontando para fora. */
function espinhosDaFolha(a: readonly [number, number], b: readonly [number, number], wd: number, w: number): string {
  const { px, py } = lamina(a, b, wd);
  const [ax, ay] = a;
  const [bx, by] = b;
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  let out = '';
  const f = (n: number) => n.toFixed(1);
  for (const t of [0.4, 0.68]) {
    for (const s of [1, -1]) {
      // Largura da folha naquele ponto (aproximação da curva quadrática).
      const half = wd * 0.5 * (1 - Math.abs(t - 0.45) * 1.6);
      const cx = ax + (bx - ax) * t + px * s * half;
      const cy = ay + (by - ay) * t + py * s * half;
      const tx = cx + px * s * 3.4 + ux * 1.6;
      const ty = cy + py * s * 3.4 + uy * 1.6;
      out += outlined(`M${f(cx - ux * 1.6)} ${f(cy - uy * 1.6)} L${f(tx)} ${f(ty)} L${f(cx + ux * 1.6)} ${f(cy + uy * 1.6)} Z`, CASTANHA_CLARA, w * 0.7);
    }
  }
  return out;
}

/**
 * Broto de espinho que a pinha planta. `fase` 0 é o aviso, ainda inofensivo: um pinhão castanho
 * pequeno e meio enterrado num montinho de terra, com uma rachadura e um brotinho verde-claro
 * saindo. `fase` 1 machuca: o broto crescido, um leque de folhas pontudas verde-escuras com
 * espinhos nas bordas e uma carinha brava no meio, e a casca do pinhão aberta na base. A base fica
 * no chão em (0, 0) e o desenho acima.
 */
export function brotoSvg(fase: 0 | 1, variant = 0): string {
  const w = BROTO_LW;
  if (fase === 0) {
    return svgDoc(
      '-30 -40 60 44',
      `<ellipse cx="0" cy="0.5" rx="15" ry="1.8" fill="${INK}" opacity="0.14"/>` +
        // Brotinho saindo da rachadura, por trás do pinhão.
        capsule([[1, -9], [1.5, -15], [0.5, -20]], 1.8, BROTINHO, 1.1) +
        outlined('M0.5 -20 Q-5 -25 -9 -22 Q-5 -17 0.5 -20 Z', BROTINHO, 1.4) +
        outlined('M1 -19 Q5 -26 10 -24 Q7 -18 1 -19 Z', BROTINHO, 1.4) +
        // Pinhão.
        `<clipPath id="fp-pinhao"><ellipse cx="0" cy="-7" rx="8" ry="6.5"/></clipPath>` +
        `<ellipse cx="0" cy="-7" rx="8" ry="6.5" fill="${CASTANHA}"/>` +
        `<ellipse cx="3" cy="-2" rx="8" ry="4" fill="${CASTANHA_ESCURA}" clip-path="url(#fp-pinhao)"/>` +
        `<ellipse cx="0" cy="-7" rx="8" ry="6.5" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
        line('M-1 -13.2 L1.5 -10 L-1 -7.5 L1 -5', 1.4) +
        shine('M-5.5 -8 Q-5 -11 -2.5 -12', 1.4, 0.8) +
        // Montinho de terra por cima da base do pinhão.
        outlined('M-15 0 Q-12 -4.5 -6 -4 Q0 -2.5 6 -4 Q12 -4.5 15 0 Z', TERRA, w) +
        `<circle cx="-7" cy="-1.6" r="0.8" fill="${CASTANHA_ESCURA}"/><circle cx="5" cy="-1.4" r="0.8" fill="${CASTANHA_ESCURA}"/>` +
        // Tremidinha da terra (o broto está para sair).
        line('M-19 -7 L-17 -5 M-20 -2.5 L-17.5 -2 M19 -7 L17 -5 M20 -2.5 L17.5 -2', 1.2),
      variant,
    );
  }
  // Folhas: [base, ponta, largura]; as de trás primeiro, mais escuras.
  const atras: Array<[readonly [number, number], readonly [number, number], number]> = [
    [[-3, -4], [-23, -9], 7],
    [[3, -4], [23, -9], 7],
  ];
  const frente: Array<[readonly [number, number], readonly [number, number], number]> = [
    [[-2, -7], [-17, -31], 8],
    [[2, -7], [17, -31], 8],
    [[0, -8], [0, -39], 9],
  ];
  let folhas = '';
  for (const [a, b, wd] of atras) {
    const { d, mid } = lamina(a, b, wd);
    folhas += espinhosDaFolha(a, b, wd, w) + outlined(d, FOLHA_ESCURA, w) + line(mid, 1.1, FOLHA);
  }
  for (const [a, b, wd] of frente) {
    const { d, mid } = lamina(a, b, wd);
    folhas += espinhosDaFolha(a, b, wd, w) + outlined(d, FOLHA, w) + line(mid, 1.2, FOLHA_CLARA);
  }
  return svgDoc(
    '-30 -40 60 44',
    `<ellipse cx="0" cy="0.5" rx="20" ry="2" fill="${INK}" opacity="0.16"/>` +
      folhas +
      // Botão do meio com a carinha brava.
      oval(0, -10, 7.5, 7, FOLHA, w) +
      `<ellipse cx="2" cy="-6.5" rx="6" ry="3" fill="${FOLHA_ESCURA}" opacity="0.6"/>` +
      oval(0, -10, 7.5, 7, 'none', w) +
      eye(-2.6, -10.5, 2.3, 2.5, [0.3, 0.3], 0.62, 0.9) +
      eye(2.8, -10.6, 2.3, 2.5, [-0.3, 0.3], 0.62, 0.9) +
      line('M-5.5 -13.8 L-0.8 -12.2 M0.8 -12.2 L5.5 -13.8', 1.5) +
      line('M-2.5 -6.3 L-1.2 -7.2 L0 -6.3 L1.2 -7.2 L2.5 -6.3', 1) +
      // Casca do pinhão aberta na base.
      outlined('M-12 0 Q-13 -6 -7 -6.5 Q-4 -4 -4.5 0 Z', CASTANHA, w) +
      outlined('M12 0 Q13 -6 7 -6.5 Q4 -4 4.5 0 Z', CASTANHA, w) +
      outlined('M-15 0 Q-10 -2.5 -5 -1.5 Q0 -1 5 -1.5 Q10 -2.5 15 0 Z', TERRA, w * 0.8),
    variant,
  );
}

// ---------------------------------------------------------------- graveto

const GRAVETO_LW = lw(0.4);

/**
 * Graveto seco castanho caindo na vertical, de ponta para baixo: casca com sombra de um lado, o
 * corte claro em cima, um raminho com uma folha seca ferrugem e riscos de queda acima. Centro em (0, 0).
 */
export function gravetoSvg(variant = 0): string {
  const w = GRAVETO_LW;
  const corpo = 'M-3 -15 L3 -15 L3.4 11 L0.4 21.5 L-3.2 11 Z';
  return svgDoc(
    '-10 -24 20 48',
    line('M-5 -23.5 L-5 -18.5 M0 -23.8 L0 -19.5 M5 -23.5 L5 -18.5', 1.4) +
      // Raminho com folha seca.
      capsule([[2.5, -3], [6.5, -8], [7, -12]], 1.6, GRAVETO, 0.9) +
      outlined('M7 -12 Q10.5 -15 9.5 -20 Q5.5 -17 7 -12 Z', FERRUGEM, 1.1) +
      `<clipPath id="fp-graveto"><path d="${corpo}"/></clipPath>` +
      `<path d="${corpo}" fill="${GRAVETO}"/>` +
      `<rect x="0.8" y="-16" width="5" height="40" fill="${GRAVETO_ESCURO}" clip-path="url(#fp-graveto)"/>` +
      `<path d="${corpo}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      line('M-1.3 -9 L-1 -4 M-1.5 3 L-1.2 8 M1.8 -12 L2 -9', 0.9, GRAVETO_ESCURO) +
      shine('M-1.6 -12 L-1.6 -10', 1, 0.7) +
      oval(0, -15, 3, 1.4, GRAVETO_CORTE, 1.2),
    variant,
  );
}

// ---------------------------------------------------------------- seiva em arco

const SEIVA_LW = lw(0.5);

/**
 * Bolota grande de seiva âmbar-esverdeada voando em arco para a direita: corpo redondo com a borda
 * de baixo verde-oliva, brilho, um rastro curto de gotinhas atrás e uma carinha travessa. Centro em (0, 0).
 */
export function seivaArcoSvg(variant = 0): string {
  const w = SEIVA_LW;
  const gota = 'M-12 1 Q-10 -6 -4 -9 Q2 -12 8 -9 Q13 -6 13 1 Q13 10 3 11 Q-6 11 -12 1 Z';
  return svgDoc(
    '-16 -16 32 32',
    line('M-15.5 -3 L-11 -3 M-15 4 L-11.5 4', 1.3, SEIVA_ESCURA) +
      `<circle cx="-14" cy="8.5" r="1.4" fill="${SEIVA}" stroke="${INK}" stroke-width="0.9"/>` +
      `<circle cx="-10.5" cy="12" r="1" fill="${SEIVA}" stroke="${INK}" stroke-width="0.8"/>` +
      `<clipPath id="fp-seiva"><path d="${gota}"/></clipPath>` +
      `<path d="${gota}" fill="${SEIVA}"/>` +
      `<ellipse cx="2" cy="12" rx="15" ry="6.5" fill="${SEIVA_ESCURA}" clip-path="url(#fp-seiva)"/>` +
      `<path d="${gota}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      shine('M-7 -3 Q-5 -7 -1 -8.5', 1.6, 0.9) +
      `<circle cx="-7.5" cy="1" r="0.8" fill="${WHITE}" opacity="0.85"/>` +
      eye(1.5, -1.5, 2.2, 2.6, [0.6, 0], 0.6, 0.9) +
      eye(7.5, -2, 2, 2.6, [0.6, 0], 0.6, 0.9) +
      line('M-0.5 -5.5 L3 -4.8 M6 -5.4 L9.5 -6.2', 1) +
      line('M1.5 4 Q5.5 7 10 3.5', 1.2) +
      outlined('M6 5.6 Q6.5 8.6 8.6 8 Q9.6 7 8.8 4.6 Z', PALETTE.lingua, 0.8),
    variant,
  );
}
