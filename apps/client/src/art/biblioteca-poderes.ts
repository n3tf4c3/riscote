import { INK, WHITE, line, outlined, shine, svgDoc } from './svg';

// Perigos dos bichos da Biblioteca dos Sonhos (2026-11-01): a página solta que cai balançando, as
// letras que a enciclopédia atira em leque e a ponta enrolada do tapete de pergaminho. O fundo da
// biblioteca é creme e madeira embaixo e azul-escuro estrelado na cúpula, então todo perigo tem
// contorno marinho firme e cor saturada (carmim, verde-esmeralda, laranja, pergaminho dourado);
// nenhum usa o azul da tinta dos jogadores, para não parecer bola nem item, e nenhum usa texto (as
// letras são caminhos, porque a fonte não é confiável na rasterização). Quadro de 48 unidades
// (`-24 -24 48 48`) com o desenho centrado em (0, 0), que é onde o jogo o põe.

const VB = '-24 -24 48 48';

/** Espessura de contorno para ~0,9 px no mundo, dado `k` (pixels do mundo por unidade). */
const lw = (k: number) => +(0.9 / k).toFixed(2);

const PAPEL = '#fff4d6';
const PAPEL_VERSO = '#ecd6a4';
const PAPEL_LINHA = '#c9ad7c';
const CARMIM = '#e0313f';
const CARMIM_ESCURO = '#a11d33';
const ESMERALDA = '#22a54a';
const ESMERALDA_ESCURO = '#16743a';
const LARANJA = '#ff8a1f';
const LARANJA_ESCURO = '#c95a10';
/** Pergaminho do tapete (o jogo pinta a faixa com as mesmas cores). */
export const PERGAMINHO = '#f2cf7e';
export const PERGAMINHO_SOMBRA = '#c99a45';
const PERGAMINHO_MIOLO = '#a8743f';

// ---------------------------------------------------------------- página solta

// A folha é desenhada em escala 1,2 para ocupar o quadro; o contorno compensa.
const PAGINA_LW = +(lw(0.36) / 1.2).toFixed(2);
const PAGINA = 'M-14 -17 Q-2 -20 13 -17 Q16 -2 15 9 L7 18 Q-4 20 -15 17 Q-17 0 -14 -17 Z';

/**
 * Página solta que cai balançando: folha creme meio enrolada, com a beirada carmim (de livro de
 * borda pintada), o canto de baixo dobrado mostrando o verso e uma cara brava rabiscada, grande
 * para ler a 17 px. Centro em (0, 0).
 */
export function paginaSoltaSvg(variant = 0): string {
  const w = PAGINA_LW;
  return svgDoc(
    VB,
    `<g transform="scale(1.2)">` +
      `<clipPath id="bp-pagina"><path d="${PAGINA}"/></clipPath>` +
      `<path d="${PAGINA}" fill="${PAPEL}"/>` +
      `<g clip-path="url(#bp-pagina)">` +
      `<path d="${PAGINA}" fill="none" stroke="${CARMIM}" stroke-width="7"/>` +
      // Leve curva da folha: sombra no lado esquerdo.
      `<path d="M-20 -20 Q-10 0 -18 22 L-24 22 L-24 -20 Z" fill="${PAPEL_VERSO}" opacity="0.8"/>` +
      `</g>` +
      `<path d="${PAGINA}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>` +
      // Canto dobrado.
      outlined('M15 9 Q8 8 7 18 Z', PAPEL_VERSO, w * 0.8) +
      // Linhas de texto em cima, apagadas.
      line('M-8 -12.5 L8 -13', 1.4, PAPEL_LINHA) +
      // Cara brava: olhos grandes com sobrancelha em V e boca em serra.
      `<ellipse cx="-5" cy="-2" rx="4.4" ry="4.8" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>` +
      `<ellipse cx="5.5" cy="-2.2" rx="4.4" ry="4.8" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="-4" cy="-1" r="2.3" fill="${INK}"/><circle cx="6.5" cy="-1.2" r="2.3" fill="${INK}"/>` +
      line('M-10.5 -9 L-1.5 -5.6 M11 -9.2 L2 -5.8', 2.4) +
      line('M-7 9 L-4.5 6.5 L-2 9 L0.5 6.5 L3 9 L5.5 6.5 L8 9', 1.8) +
      shine('M-11 -13 Q-12 -6 -11.5 -1', 1.6, 0.9) +
      `</g>`,
    variant,
  );
}

// ---------------------------------------------------------------- letras voadoras

const LETRA_LW = lw(0.36);

/** Letras grossas: contorno (com os furos, `evenodd`), cor, sombra e o risco de brilho. */
const LETRAS: ReadonlyArray<{ d: string; cor: string; sombra: string; brilho: string; extra?: string }> = [
  {
    // A carmim.
    d: 'M-16 18 L-5.5 -18 L5.5 -18 L16 18 L6.5 18 L4.4 10 L-4.4 10 L-6.5 18 Z M-2.6 2.5 L2.6 2.5 L0 -7.5 Z',
    cor: CARMIM,
    sombra: CARMIM_ESCURO,
    brilho: 'M-4 -14 L-11 12',
  },
  {
    // B verde-esmeralda.
    d:
      'M-13 -18 L3 -18 Q15 -18 15 -8.5 Q15 -2.5 9.5 -0.5 Q17 2 17 9 Q17 18 5 18 L-13 18 Z ' +
      'M-4 -10.5 L2 -10.5 Q6 -10.5 6 -7 Q6 -3.5 2 -3.5 L-4 -3.5 Z M-4 3.5 L3.5 3.5 Q8 3.5 8 7 Q8 10.5 3.5 10.5 L-4 10.5 Z',
    cor: ESMERALDA,
    sombra: ESMERALDA_ESCURO,
    brilho: 'M-9 -13 L-9 13',
  },
  {
    // Interrogação laranja (o gancho e o ponto).
    d:
      'M-13 -7 Q-13 -19 0 -19 Q13 -19 13 -8 Q13 -1 5.5 2.5 Q4.5 3 4.5 5 L4.5 7 L-4.5 7 L-4.5 3.5 Q-4.5 -1.5 1.5 -4 Q4 -5 4 -7.5 Q4 -10.5 0 -10.5 Q-4 -10.5 -4 -7 Z ' +
      'M-5 15 A5 5 0 1 0 5 15 A5 5 0 1 0 -5 15 Z',
    cor: LARANJA,
    sombra: LARANJA_ESCURO,
    brilho: 'M-9 -9 Q-8.5 -15 -2 -16',
  },
];

/**
 * Letra voadora que a enciclopédia atira em leque: `letra` 0 é um A carmim, 1 um B verde-esmeralda
 * e 2 uma interrogação laranja. Grossas, de cor chapada com a sombra embaixo, contorno marinho e um
 * risco de brilho. Centro em (0, 0).
 */
export function letraSvg(letra: 0 | 1 | 2, variant = 0): string {
  const w = LETRA_LW;
  const l = LETRAS[letra]!;
  const id = `bp-letra${letra}`;
  return svgDoc(
    VB,
    `<clipPath id="${id}"><path d="${l.d}" clip-rule="evenodd"/></clipPath>` +
      `<path d="${l.d}" fill="${l.cor}" fill-rule="evenodd"/>` +
      `<g clip-path="url(#${id})"><path d="M-24 9 Q0 13 24 7 L24 24 L-24 24 Z" fill="${l.sombra}"/>${shine(l.brilho, 2.6, 0.85)}</g>` +
      `<path d="${l.d}" fill="none" fill-rule="evenodd" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`,
    variant,
  );
}

// ---------------------------------------------------------------- rolo do tapete de pergaminho

const ROLO_LW = lw(0.3);

/**
 * Ponta enrolada do tapete de pergaminho, vista de lado: o rolo redondo (~34 de diâmetro) com as
 * voltas em espiral, a sombra embaixo e a ponta da vareta de madeira no meio. Centro em (0, 0).
 */
export function pergaminhoRoloSvg(variant = 0): string {
  const w = ROLO_LW;
  const voltas: string[] = [];
  for (let i = 0; i <= 36; i++) {
    const t = i / 36;
    const a = t * Math.PI * 5 + Math.PI / 2;
    const r = 4.5 + 10.5 * t;
    voltas.push(`${i === 0 ? 'M' : 'L'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
  }
  return svgDoc(
    VB,
    `<clipPath id="bp-rolo"><circle cx="0" cy="0" r="17"/></clipPath>` +
      `<circle cx="0" cy="0" r="17" fill="${PERGAMINHO}"/>` +
      `<g clip-path="url(#bp-rolo)"><path d="M-20 6 Q0 14 20 4 L20 20 L-20 20 Z" fill="${PERGAMINHO_SOMBRA}"/></g>` +
      `<path d="${voltas.join(' ')}" fill="none" stroke="${INK}" stroke-width="${(w * 0.6).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="0" cy="0" r="17" fill="none" stroke="${INK}" stroke-width="${w}"/>` +
      `<circle cx="0" cy="0" r="4" fill="${PERGAMINHO_MIOLO}" stroke="${INK}" stroke-width="${(w * 0.6).toFixed(2)}"/>` +
      shine('M-12 -6 Q-9 -12 -3 -14', 2.4, 0.9),
    variant,
  );
}
