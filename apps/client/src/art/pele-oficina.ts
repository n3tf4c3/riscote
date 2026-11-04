import { cuspeSvg } from './enemies';
import type { Pele } from './pele';
import { INK, PALETTE, WHITE, blush, capsule, eye, line, openMouth, outlined, oval, shine, svgDoc } from './svg';

// Pele da Oficina Mágica (2026-11-01): seis ferramentas de desenho e de construção que trabalham
// sozinhas na oficina do inventor, cada uma com o papel de um inimigo do caderno. Cada desenho usa o
// quadro (viewBox), o ponto de apoio e mais ou menos a área da criatura do Jardim do mesmo papel
// (`pele-jardim.ts`), para a caixa de colisão continuar batendo. As paredes são de papel kraft e as
// engrenagens de papelão (bege e castanho); por isso as criaturas são de cores saturadas e diferentes
// entre si (mostarda com aço, verde-petróleo com mola de aço, vermelho com pontas prateadas, latão,
// verde com grafite e aço com cabo laranja), sempre de contorno marinho. Nada de magenta nem violeta
// saturado (são do capítulo 1). O azul da tinta (SOAK) fica só nas camadas do encharcado. Nada de pote
// nem vidro (lembrariam o tinteiro), grampeador, borracha, bloco de letras, caixa-surpresa ou soldadinho.

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

/** Olho espremido de esforço (">" ou "<"); `dir` 1 aponta para a direita. */
function squeezeEye(cx: number, cy: number, r: number, dir: 1 | -1, w: number): string {
  return line(`M${n(cx - r * dir)} ${n(cy - r * 0.8)} L${n(cx + r * dir)} ${cy} L${n(cx - r * dir)} ${n(cy + r * 0.8)}`, w);
}

/** Retângulo de cantos arredondados como caminho. */
function rr(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${n(x + r)} ${n(y)} L${n(x + w - r)} ${n(y)} Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + r)} ` +
    `L${n(x + w)} ${n(y + h - r)} Q${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} ` +
    `L${n(x + r)} ${n(y + h)} Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - r)} L${n(x)} ${n(y + r)} Q${n(x)} ${n(y)} ${n(x + r)} ${n(y)} Z`
  );
}

/** Gota de suor. */
function suor(x: number, y: number, s: number): string {
  return `<path d="M${x} ${y} Q${n(x - 3 * s)} ${n(y + 5 * s)} ${n(x - 1 * s)} ${n(y + 7 * s)} Q${n(x + 2 * s)} ${n(y + 8 * s)} ${n(x + 2.5 * s)} ${n(y + 5 * s)} Q${n(x + 2.5 * s)} ${n(y + 3 * s)} ${x} ${y} Z" fill="#d8f3ff" stroke="${INK}" stroke-width="${n(1.4 * s)}"/>`;
}

// Aço e latão, comuns a várias peças.
const ACO = '#c3cad6';
const ACO_ESCURO = '#7c8698';

// ---------------------------------------------------------------- compasso (traça)

const TRACA_FRAMES = 3;
const TRACA_VB = '30 60 200 95';
const MOSTARDA = '#f2b425';
const MOSTARDA_ESCURA = '#a8740a';
const HASTE = '#8b97a8';
const HASTE_ESCURA = '#535e70';
const MADEIRA_LAPIS = '#f3cf98';
const COMPASSO_LW = lw(0.19);
const PERNA = 58;
const CABECA_R = 21;

/** Perna da ponta-seca, de pé a partir da dobradiça (hx, hy); o grupo de fora gira. */
function pernaAgulha(hx: number, hy: number, w: number): string {
  const p = hy + PERNA;
  return (
    capsule([[hx, hy], [hx, p - 14]], 9, HASTE, w * 0.7) +
    line(`M${hx - 2} ${hy + 4} L${hx - 2} ${p - 16}`, 2, HASTE_ESCURA) +
    outlined(`M${hx - 4.5} ${p - 15} L${hx + 4.5} ${p - 15} L${hx} ${p} Z`, ACO, w * 0.5) +
    oval(hx, p - 15, 6, 3, HASTE_ESCURA, w * 0.45)
  );
}

/** Perna do lápis: haste, presilha mostarda, madeira apontada e o grafite. */
function pernaLapis(hx: number, hy: number, w: number): string {
  const p = hy + PERNA;
  return (
    capsule([[hx, hy], [hx, p - 22]], 9, HASTE, w * 0.7) +
    line(`M${hx - 2} ${hy + 4} L${hx - 2} ${p - 24}`, 2, HASTE_ESCURA) +
    outlined(`M${hx - 6.5} ${p - 25} L${hx + 6.5} ${p - 25} L${hx + 6.5} ${p - 14} L${hx - 6.5} ${p - 14} Z`, MOSTARDA, w * 0.5) +
    outlined(`M${hx - 5} ${p - 14} L${hx + 5} ${p - 14} L${hx} ${p} Z`, MADEIRA_LAPIS, w * 0.5) +
    `<path d="M${hx - 1.9} ${p - 5.3} L${hx + 1.9} ${p - 5.3} L${hx} ${p} Z" fill="${INK}"/>`
  );
}

/**
 * Compasso: compasso de desenho vivo, de cabeça mostarda redonda (a dobradiça) e duas pernas de aço,
 * a ponta-seca atrás e a do lápis na frente, andando em tesoura. Travesso: olhar de lado, pálpebra
 * caída e sorriso de canto com um dentinho. `alert` é o aviso do giro: a ponta-seca fincada reta, a
 * perna do lápis aberta para a frente e o rastro do círculo, com cara de pura alegria.
 */
function compassoSvg(frame: number, variant = 0, alert = false): string {
  const w = COMPASSO_LW;
  const t = ((frame % TRACA_FRAMES) / TRACA_FRAMES) * Math.PI * 2;
  const s = Math.sin(t);
  const aN = alert ? 0 : n(22 + 11 * s);
  const aP = alert ? -84 : n(-(22 - 11 * s));
  const menor = Math.min(Math.abs(aN), Math.abs(aP));
  const hx = 108;
  // A perna mais fechada toca o chão; a outra fica no ar.
  const hy = n(149 - PERNA * Math.cos((menor * Math.PI) / 180));
  const cy = n(hy - 9);
  let rastro = '';
  if (alert) {
    // Rastro do círculo atrás do lápis (que sobe girando) e riscos de velocidade.
    const ang = (a: number): [number, number] => [n(hx + PERNA * Math.sin((a * Math.PI) / 180)), n(hy + PERNA * Math.cos((a * Math.PI) / 180))];
    const [x0, y0] = ang(35);
    const [x1, y1] = ang(82);
    rastro =
      `<path d="M${x0} ${y0} A${PERNA} ${PERNA} 0 0 0 ${x1} ${y1}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round"/>` +
      line(`M${hx + 54} ${hy - 14} L${hx + 62} ${hy - 20} M${hx + 60} ${hy - 2} L${hx + 70} ${hy - 4}`, 3) +
      `<ellipse cx="${hx}" cy="149" rx="40" ry="4" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="5 6" opacity="0.5"/>`;
  }
  const face = alert
    ? happyEye(hx - 7, cy - 3, 7, 3.4) +
      happyEye(hx + 11, cy - 4, 6.5, 3.4) +
      line(`M${hx - 15} ${cy - 15} Q${hx - 8} ${cy - 19} ${hx} ${cy - 16} M${hx + 5} ${cy - 17} Q${hx + 12} ${cy - 21} ${hx + 19} ${cy - 18}`, 3.2) +
      blush(hx - 15, cy + 8, 5.5, 0.7) +
      blush(hx + 20, cy + 6, 4.5, 0.6) +
      openMouth(`M${hx - 8} ${cy + 5} Q${hx + 6} ${cy + 9} ${hx + 20} ${cy + 3} Q${hx + 18} ${cy + 21} ${hx + 6} ${cy + 21} Q${hx - 6} ${cy + 19} ${hx - 8} ${cy + 5} Z`, [hx + 6, cy + 19, 6], 3) +
      outlined(`M${hx - 5} ${cy + 6} L${hx + 17} ${cy + 4} L${hx + 16.5} ${cy + 8} L${hx - 4.5} ${cy + 9.6} Z`, WHITE, 1.8)
    : eye(hx - 7, cy - 3, 6.5, 8, [0.7, 0.1], 0.55, 3) +
      eye(hx + 11, cy - 4, 6, 7.5, [0.7, 0.1], 0.55, 3) +
      lidOf(hx - 7, cy - 3, 6.5, 8, MOSTARDA, 2.4, 0.15, 1.5) +
      lidOf(hx + 11, cy - 4, 6, 7.5, MOSTARDA, 2.4, 0.15, 1.5) +
      line(`M${hx - 15} ${cy - 16} Q${hx - 9} ${cy - 19} ${hx - 2} ${cy - 15.5} M${hx + 5} ${cy - 16.5} Q${hx + 11} ${cy - 20} ${hx + 18} ${cy - 18}`, 3.4) +
      blush(hx - 15, cy + 9, 5, 0.6) +
      line(`M${hx - 7} ${cy + 11} Q${hx + 6} ${cy + 18} ${hx + 19} ${cy + 7}`, 3.8) +
      outlined(`M${hx + 8} ${cy + 14} L${hx + 8.5} ${cy + 19} L${hx + 13.5} ${cy + 17.5} L${hx + 12.5} ${cy + 13} Z`, WHITE, 2);
  const cabeca = `M${hx} ${cy - CABECA_R} A${CABECA_R} ${CABECA_R} 0 1 1 ${hx - 0.1} ${cy - CABECA_R} Z`;
  return svgDoc(
    TRACA_VB,
    `<ellipse cx="${hx}" cy="150" rx="${alert ? 34 : 30}" ry="4" fill="${INK}" opacity="0.14"/>` +
      rastro +
      `<g transform="rotate(${aN} ${hx} ${hy})">${pernaAgulha(hx, hy, w)}</g>` +
      `<g transform="rotate(${aP} ${hx} ${hy})">${pernaLapis(hx, hy, w)}</g>` +
      shaded(cabeca, MOSTARDA, `<ellipse cx="${hx + 6}" cy="${cy + 23}" rx="26" ry="10" fill="${MOSTARDA_ESCURA}"/>`, w, 'of-cabeca-cp') +
      // Parafuso da dobradiça, embaixo da cara.
      oval(hx, cy + 17, 3.4, 2.6, ACO, 1.8) +
      line(`M${hx - 2} ${cy + 17} L${hx + 2} ${cy + 17}`, 1.2) +
      shine(`M${hx - 16} ${cy - 3} Q${hx - 14} ${cy - 13} ${hx - 6} ${cy - 17}`, 3, 0.75) +
      // A cara foi desenhada para uma cabeça maior: encolhe em volta do centro.
      `<g transform="translate(${hx} ${cy}) scale(0.76) translate(${-hx} ${-cy})">${face}</g>`,
    variant,
  );
}

function compassoSoakSvg(variant = 0): string {
  // Quadro 0: pernas abertas a 22 graus, cabeça em (108, 86).
  const cy = n(149 - PERNA * Math.cos((22 * Math.PI) / 180) - 9);
  const y = n(cy + 4);
  const dx = n(Math.sqrt(CABECA_R * CABECA_R - 16));
  return svgDoc(
    TRACA_VB,
    soakLayer(
      `M${n(108 - dx)} ${y} Q93 ${n(y - 5)} 99 ${n(y - 1)} Q105 ${n(y - 5)} 111 ${n(y - 1)} Q117 ${n(y - 5)} 122 ${n(y - 1)} Q126 ${n(y - 4)} ${n(108 + dx)} ${y} A${CABECA_R} ${CABECA_R} 0 0 1 ${n(108 - dx)} ${y} Z`,
      `M${n(108 - dx + 5)} ${n(y + 4)} Q${n(108 - dx + 8)} ${n(y + 12)} ${n(108 - dx + 14)} ${n(y + 16)}`,
      COMPASSO_LW,
    ) + drips([[86, 146, 2.4], [130, 147, 2.2], [108, 114, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- molinha (saltador)

const SALTADOR_VB = '60 40 84 110';
const PETROLEO = '#159b8e';
const PETROLEO_ESCURO = '#0b5d57';
const MOLINHA_LW = lw(0.3);

/** Espiras da mola entre `top` e `bot`: primeiro as costas (escuras), depois a frente (aço). */
function espiras(top: number, bot: number, count: number, rx: number): string {
  let back = '';
  let front = '';
  for (let i = 0; i < count; i++) {
    const y = n(top + ((bot - top) * (i + 0.5)) / count);
    // As costas vão por cima da elipse; a frente desce inclinada, como uma hélice.
    const b = `M${103 - rx} ${y} A${rx} 5 0 0 1 ${103 + rx} ${n(y - 1.5)}`;
    const f = `M${103 - rx} ${y} A${rx} 5 0 0 0 ${103 + rx} ${n(y - 1.5)}`;
    back += line(b, 7 + 4, INK) + line(b, 7, ACO_ESCURO);
    front += line(f, 7 + 4, INK) + line(f, 7, ACO) + shine(`M${103 - rx + 6} ${n(y + 2.4)} Q${103 - rx + 12} ${n(y + 4.4)} ${103 - rx + 18} ${n(y + 4.6)}`, 1.6, 0.8);
  }
  return back + front;
}

/** Corpo da molinha: base, espiras e o tampo (a cabeça) com a cara. */
function molinhaCorpo(cap: { top: number; h: number; w: number }, coilBot: number, count: number, face: string, w: number): string {
  const x = 103 - cap.w / 2;
  const tampo = rr(x, cap.top, cap.w, cap.h, 13);
  return (
    // Base de baixo.
    outlined(rr(80, coilBot - 1, 46, 8, 4), PETROLEO_ESCURO, w) +
    espiras(cap.top + cap.h - 3, coilBot, count, 22) +
    shaded(tampo, PETROLEO, `<ellipse cx="${108}" cy="${cap.top + cap.h + 4}" rx="${cap.w / 2 + 6}" ry="12" fill="${PETROLEO_ESCURO}"/>`, w, 'of-tampo') +
    // Rebites do tampo.
    `<circle cx="${n(x + 6)}" cy="${n(cap.top + 6)}" r="1.8" fill="${PETROLEO_ESCURO}"/><circle cx="${n(x + cap.w - 6)}" cy="${n(cap.top + 6)}" r="1.8" fill="${PETROLEO_ESCURO}"/>` +
    shine(`M${n(x + 5)} ${n(cap.top + cap.h - 9)} L${n(x + 5)} ${n(cap.top + 13)}`, 2.6, 0.75) +
    face
  );
}

/**
 * Molinha: mola de aço gorducha com tampo e base verde-petróleo; a cara fica no tampo. Bobo contente
 * parada. `charge` é o aviso do ricochete: espremida até o fim, com o tampo largo, cara de força
 * (olhos espremidos, dentes cerrados) e suor. No ar, esticada comprida e gritando de alegria.
 */
function molinhaSvg(air: boolean, variant = 0, charge = false): string {
  const w = MOLINHA_LW;
  if (charge) {
    const top = 88;
    const cy = top + 14;
    const face =
      squeezeEye(96, cy - 2, 4.6, 1, 2.4) +
      squeezeEye(116, cy - 2.5, 4.4, -1, 2.4) +
      line(`M88 ${cy - 9} L100 ${cy - 6} M112 ${cy - 6.5} L124 ${cy - 10}`, 2.6) +
      outlined(`M98 ${cy + 4} L120 ${cy + 3} L119.5 ${cy + 10} L98.5 ${cy + 10.5} Z`, WHITE, 1.8) +
      line(`M103.5 ${cy + 3.8} L103.6 ${cy + 10.4} M109 ${cy + 3.5} L109 ${cy + 10.2} M114.5 ${cy + 3.3} L114.4 ${cy + 10} M98.3 ${cy + 7.2} L119.7 ${cy + 6.6}`, 1.1) +
      blush(88, cy + 6, 4.4, 0.75) +
      blush(126, cy + 5, 4, 0.75);
    return svgDoc(
      SALTADOR_VB,
      `<ellipse cx="103" cy="135" rx="32" ry="3.5" fill="${INK}" opacity="0.14"/>` +
        molinhaCorpo({ top, h: 28, w: 66 }, 127, 4, face, w) +
        suor(132, 82, 1) +
        suor(72, 86, 0.9) +
        line('M64 104 L69 105 M64 114 L69 113 M137 104 L142 103 M137 114 L142 115', 2.2),
      variant,
    );
  }
  if (air) {
    const top = 48;
    const cy = top + 15;
    const face =
      eye(97, cy - 3, 6, 7.5, [0.4, -0.3], 0.5, 2) +
      eye(115, cy - 3.5, 5.8, 7.2, [0.4, -0.3], 0.5, 2) +
      line(`M90 ${cy - 13} Q96 ${cy - 17} 102 ${cy - 14} M109 ${cy - 14.5} Q115 ${cy - 18} 121 ${cy - 15}`, 2.4) +
      openMouth(`M99 ${cy + 5} Q110 ${cy + 4} 121 ${cy + 2} Q119 ${cy + 15} 110 ${cy + 15} Q101 ${cy + 14} 99 ${cy + 5} Z`, [110, cy + 14, 5], 2);
    return svgDoc(SALTADOR_VB, molinhaCorpo({ top, h: 30, w: 54 }, 128, 4, face, w) + line('M68 92 L66 100 M70 108 L68 116 M138 92 L140 100', 2.2), variant);
  }
  const top = 70;
  const cy = top + 15;
  const face =
    eye(97, cy - 3, 6, 7.5, [0.3, 0.1], 0.5, 2) +
    eye(115, cy - 3.5, 5.8, 7.2, [0.1, 0.2], 0.5, 2) +
    line(`M98 ${cy + 7} Q110 ${cy + 15} 123 ${cy + 4}`, 2.6) +
    line(`M96.5 ${cy + 5.2} L99.5 ${cy + 8.4} M121.5 ${cy + 2.4} L124.5 ${cy + 5.4}`, 2.2) +
    blush(90, cy + 6, 4.2, 0.65) +
    blush(124, cy + 9, 3.6, 0.55);
  return svgDoc(
    SALTADOR_VB,
    `<ellipse cx="103" cy="135" rx="30" ry="3.5" fill="${INK}" opacity="0.14"/>` + molinhaCorpo({ top, h: 30, w: 56 }, 127, 4, face, w),
    variant,
  );
}

function molinhaSoakSvg(variant = 0): string {
  return svgDoc(
    SALTADOR_VB,
    soakLayer('M75 92 Q83 87 91 91 Q99 86 107 90 Q115 85 123 90 Q128 87 131 90 L131 99 Q131 100 128 100 L126 100 L126 133 L80 133 L80 100 L78 100 Q75 100 75 97 Z', 'M80 96 L80 110', MOLINHA_LW) +
      drips([[88, 140, 2.2], [118, 141, 2]]),
    variant,
  );
}

// ---------------------------------------------------------------- ímã-ferradura (grampo)

const GRAMPO_FRAMES = 3;
const GRAMPO_VB = '4 6 92 86';
const IMA = '#d92f34';
const IMA_ESCURO = '#861a28';
const PRATA = '#e2e6ee';
const PRATA_ESCURA = '#99a2b3';
const IMA_LW = lw(0.24);
/** Ferradura de boca para cima: braços de 20 a 42 e de 58 a 80, curva embaixo até y 78 (boca rasa, para a cara caber). */
const FERRADURA = 'M20 28 L42 28 L42 42 A8 8 0 0 0 58 42 L58 28 L80 28 L80 48 A30 30 0 0 1 20 48 Z';

/**
 * Ímã-ferradura: ímã vermelho em ferradura, de boca para cima, com as duas pontas prateadas como
 * chifres, correndo inclinado para a frente em duas perninhas. Ranzinza: pálpebras baixas, cenho
 * franzido e boca torta para baixo. Das pontas saem os riscos do campo. `frame` troca as pernas.
 */
function imaSvg(frame: number, variant = 0): string {
  const w = IMA_LW;
  const swing = [-7, 0, 7][frame % GRAMPO_FRAMES]!;
  const bob = frame % 2 === 0 ? 0 : -1.4;
  const perna = (x: number, d: number) => capsule([[x, 74], [x + d, 85]], 4, INK, 0) + oval(x + d + 2, 87, 5, 2.6, INK, 0);
  return svgDoc(
    GRAMPO_VB,
    `<ellipse cx="50" cy="89" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      perna(40, swing) +
      perna(58, -swing) +
      `<g transform="translate(0 ${bob}) rotate(9 50 80)">` +
      shaded(FERRADURA, IMA, `<ellipse cx="62" cy="88" rx="30" ry="13" fill="${IMA_ESCURO}"/>`, w, 'of-ferradura') +
      // Pontas prateadas.
      shaded(rr(20, 13, 22, 16, 3), PRATA, `<rect x="20" y="24" width="22" height="6" fill="${PRATA_ESCURA}"/>`, w, 'of-ponta-a') +
      shaded(rr(58, 13, 22, 16, 3), PRATA, `<rect x="58" y="24" width="22" height="6" fill="${PRATA_ESCURA}"/>`, w, 'of-ponta-b') +
      shine('M24 34 L24 50', 2.8, 0.8) +
      shine('M24.5 16.5 L28 16.5', 2, 0.9) +
      // Riscos do campo.
      line('M22 9 Q31 4 40 9 M60 9 Q69 4 78 9', 1.8) +
      // Cara ranzinza na curva.
      eye(42, 61, 4.8, 5.4, [0.6, 0.35], 0.58, 1.5) +
      eye(58, 60.5, 4.6, 5.2, [0.6, 0.35], 0.58, 1.5) +
      lidOf(42, 61, 4.8, 5.4, IMA, 1.4, 0.0, 0.6) +
      lidOf(58, 60.5, 4.6, 5.2, IMA, 1.4, 0.0, -0.6) +
      line('M34.5 53 L46 55.6 M65.5 52.6 L54 55.6', 2.6) +
      blush(33, 68, 2.6, 0.6) +
      line('M44 72 Q51 67.5 59 71', 2.4) +
      `</g>`,
    variant,
  );
}

function imaSoakSvg(variant = 0): string {
  return svgDoc(
    GRAMPO_VB,
    soakLayer('M19 52 Q27 46 35 50 Q43 45 50 50 Q58 45 66 50 Q74 45 82 51 Q84 64 74 74 Q64 82 50 82 Q34 82 25 72 Q18 63 19 52 Z', 'M24 57 Q25 64 29 69', IMA_LW) +
      drips([[38, 87, 2], [64, 87, 1.7]]),
    variant,
  );
}

// ---------------------------------------------------------------- prumo (fiandeira)

const FIANDEIRA_VB = '-6 0 112 104';
const LATAO = '#d9a62c';
const LATAO_ESCURO = '#8e6210';
const LATAO_CLARO = '#f4d37a';
const PRUMO_LW = lw(0.42);
const PRUMO_D = 'M37 36 L63 36 Q72 39 71 51 Q67 66 50 85 Q33 66 29 51 Q28 39 37 36 Z';

/**
 * Prumo: prumo de latão de pedreiro, gordo em cima e de ponta afiada embaixo, com a tampa de aço e a
 * argola onde o fio chega (por trás, até o centro). Sério: cenho reto, pálpebras baixas e boca firme.
 * De pé, porque as mesmas poses servem quando ele anda sem o fio. `frame` balança um pouco em volta da
 * argola. Centro em (50, 54).
 */
function prumoSvg(frame: number, variant = 0): string {
  const w = PRUMO_LW;
  const a = frame % 2 === 0 ? -5 : 5;
  return svgDoc(
    FIANDEIRA_VB,
    `<g transform="rotate(${a} 50 29)">` +
      // Argola do fio.
      `<circle cx="50" cy="28" r="3.4" fill="none" stroke="${INK}" stroke-width="3.6"/>` +
      `<circle cx="50" cy="28" r="3.4" fill="none" stroke="${ACO}" stroke-width="1.4"/>` +
      shaded(PRUMO_D, LATAO, `<ellipse cx="60" cy="82" rx="22" ry="15" fill="${LATAO_ESCURO}"/>`, w, 'of-prumo') +
      // Frisos do torno.
      line('M32 45 Q50 48 68 45', 1.2, LATAO_ESCURO) +
      line('M36.5 66 Q50 68.5 63.5 66', 1.2, LATAO_ESCURO) +
      // Tampa de aço.
      outlined(rr(39, 31, 22, 6.5, 2.5), ACO, w * 0.6) +
      line('M44 32.5 L44 36 M50 32.5 L50 36 M56 32.5 L56 36', 0.9, ACO_ESCURO) +
      shine('M33 50 Q33.5 43 38 40', 2, 0.85) +
      `<path d="M43 72 L47 78" stroke="${LATAO_CLARO}" stroke-width="1.6" stroke-linecap="round"/>` +
      // Cara séria.
      eye(44, 53, 4.2, 4.8, [0.5, 0.25], 0.58, 1.4) +
      eye(56, 52.5, 4, 4.6, [0.5, 0.25], 0.58, 1.4) +
      lidOf(44, 53, 4.2, 4.8, LATAO, 1.2, 0.25, 0) +
      lidOf(56, 52.5, 4, 4.6, LATAO, 1.2, 0.25, 0) +
      line('M38.5 46.5 L48.5 47.5 M51.5 47.3 L61.5 46.3', 1.9) +
      blush(39, 59, 2.4, 0.6) +
      line('M46 61.5 L56 61', 1.7) +
      `</g>`,
    variant,
  );
}

function prumoSoakSvg(variant = 0): string {
  return svgDoc(
    FIANDEIRA_VB,
    soakLayer('M30 57 Q36 53 42 56 Q48 52 54 56 Q60 52 66 56 Q68 55 70 56 Q66 68 50 85 Q35 68 30 57 Z', 'M34 61 L38 66', PRUMO_LW) +
      drips([[44, 82, 1.6], [56, 84, 1.4]]),
    variant,
  );
}

// ---------------------------------------------------------------- furadeira (tinteiro)

const TINTEIRO_VB = '6 10 92 88';
const VERDE = '#3ea24c';
const VERDE_ESCURO = '#1c6230';
const GRAFITE = '#3d4250';
const GRAFITE_CLARO = '#5c6272';
const FURADEIRA_LW = lw(0.25);
/** Carcaça do motor, de pé, com o mandril em cima; o cabo sai para trás e a bateria fica na ponta dele. */
const CARCACA = 'M44 38 L60 38 Q70 38 70 48 L70 82 Q70 90 62 90 L42 90 Q34 90 34 82 L34 48 Q34 38 44 38 Z';

/** Broca em espiral, de pé sobre o mandril (até y 11). */
function broca(w: number): string {
  return (
    outlined('M49 27 L55 27 L55 15 Q52 9 49 15 Z', ACO, w * 0.5) +
    line('M49.4 25 L54.6 21.5 M49.4 20.5 L54.6 17 M49.8 16 L53.8 13.4', 1.4, ACO_ESCURO)
  );
}

/**
 * Furadeira: furadeira de bateria verde deitada de lado, com o mandril e a broca em espiral apontando
 * para o alto, o cabo de grafite com o gatilho mostarda saindo para trás e a bateria na ponta dele,
 * bamboleando em dois pezinhos sob a carcaça. Atrevida: sobrancelha erguida e sorriso de lado.
 * `charge` é o aviso da broca: ela gira (riscos em volta), a carcaça treme e a cara fica decidida,
 * de dentes cerrados.
 */
function furadeiraSvg(frame: number, variant = 0, charge = false): string {
  const step = frame % 2 === 0 ? 0 : 1;
  const w = FURADEIRA_LW;
  const tilt = charge ? 0 : step === 0 ? -2.5 : 2.5;
  const pe = (x: number, lift: number) => oval(x, 94 + lift, 7.5, 3.4, GRAFITE, w * 0.7);
  const giro = charge
    ? `<ellipse cx="52" cy="17" rx="10" ry="3.4" fill="none" stroke="${INK}" stroke-width="1.8" stroke-dasharray="7 4"/>` +
      `<ellipse cx="52" cy="24" rx="13" ry="4" fill="none" stroke="${INK}" stroke-width="1.8" stroke-dasharray="8 5"/>` +
      line('M36 12 L41 15 M68 12 L63 15 M33 22 L38 23 M71 22 L66 23', 2)
    : '';
  const tremor = charge ? line('M76 50 L81 48 M77 62 L82 62 M76 74 L81 76', 2.2) : '';
  const face = charge
    ? eye(45, 60, 5, 5, [0.6, -0.2], 0.6, 1.8) +
      eye(60, 59, 4.8, 5, [0.6, -0.2], 0.6, 1.8) +
      lidOf(45, 60, 5, 5, VERDE, 1.6, 0.3, 1.4) +
      lidOf(60, 59, 4.8, 5, VERDE, 1.6, 0.3, 1.4) +
      line('M39 51 L50 55 M55 54 L66 50', 3) +
      outlined('M43 69 L62 68 L61.5 75 L43.5 75.5 Z', WHITE, 1.6) +
      line('M47.7 68.8 L47.7 75.4 M52.5 68.6 L52.5 75.2 M57.2 68.4 L57.2 75 M43.2 72.2 L61.8 71.5', 1.1) +
      blush(39.5, 67, 3, 0.75) +
      blush(65.5, 66, 3, 0.75)
    : eye(45, 61, 5, 6, [0.5, 0.1], 0.55, 1.8) +
      eye(60, 60, 4.8, 6, [0.5, 0.1], 0.55, 1.8) +
      lidOf(45, 61, 5, 6, VERDE, 1.4, 0.15, -0.6) +
      line('M39 52 L49 53 M55 51 Q60 46 66 50', 2.6) +
      blush(39.5, 70, 3, 0.6) +
      line('M45 71 Q53 76 61 70 L63.5 69', 2.4);
  return svgDoc(
    TINTEIRO_VB,
    `<ellipse cx="44" cy="96" rx="34" ry="3" fill="${INK}" opacity="0.14"/>` +
      giro +
      pe(44, step === 0 ? 0 : -2.5) +
      pe(61, step === 0 ? -2.5 : 0) +
      `<g transform="rotate(${tilt} 52 95)">` +
      tremor +
      broca(w) +
      // Mandril de três garras, com os frisos.
      outlined('M46 31 L58 31 L56.5 25 L47.5 25 Z', ACO_ESCURO, w * 0.5) +
      outlined(rr(40, 29, 24, 12, 3), ACO, w * 0.6) +
      line('M45 31 L45 39 M49.7 31 L49.7 39 M54.3 31 L54.3 39 M59 31 L59 39', 1.2, ACO_ESCURO) +
      // Cabo para trás, com o gatilho por cima, e a bateria na ponta.
      outlined('M36 64 L17 66 L17 80 L36 80 Z', GRAFITE, w * 0.7) +
      line('M22 68 L22 78 M27 68 L27 78', 1.3, GRAFITE_CLARO) +
      outlined('M30 64.6 Q31 58 35 57 L35 64.2 Z', MOSTARDA, w * 0.45) +
      shaded(rr(7, 56, 15, 37, 4), VERDE, `<rect x="7" y="84" width="15" height="10" fill="${VERDE_ESCURO}"/>`, w * 0.8, 'of-bateria') +
      line('M10 62 L19 62 M10 66 L19 66', 1.3, VERDE_ESCURO) +
      // Carcaça.
      shaded(CARCACA, VERDE, `<ellipse cx="60" cy="96" rx="26" ry="13" fill="${VERDE_ESCURO}"/>`, w, 'of-carcaca') +
      // Respiros e a chave de giro.
      line('M38 46 L38 54 M42 44 L42 48', 1.4, VERDE_ESCURO) +
      oval(63, 44, 3.2, 2.2, GRAFITE_CLARO, 1.3) +
      shine('M37.5 60 L37.5 50 Q38 44 42 42', 2.6, 0.75) +
      face +
      `</g>`,
    variant,
  );
}

function furadeiraSoakSvg(variant = 0): string {
  return svgDoc(
    TINTEIRO_VB,
    soakLayer('M34 70 Q42 65 50 69 Q58 64 66 68 L70 67 L70 82 Q70 90 62 90 L42 90 Q34 90 34 82 Z', 'M38 74 L38 82', FURADEIRA_LW) +
      soakLayer('M7 76 Q11 73 15 76 Q19 73 22 76 L22 89 Q22 93 18 93 L11 93 Q7 93 7 89 Z', 'M10 80 L10 86', FURADEIRA_LW) +
      drips([[16, 97, 1.6], [44, 98, 1.8], [62, 98, 1.5]]),
    variant,
  );
}

// ---------------------------------------------------------------- martelo (borracha)

const BORRACHA_VB = '2 14 106 80';
const FERRO = '#8d9ab0';
const FERRO_ESCURO = '#4f5b72';
const FERRO_CLARO = '#c8d1df';
const CABO = '#ef6a2a';
const CABO_ESCURO = '#9a3412';
const PESCOCO = '#d9964e';
const MARTELO_LW = lw(0.23);
const CABO_D = 'M46 42 L68 42 L69 82 Q69 87 64 87 L50 87 Q45 87 45 82 Z';

/** O martelo inteiro (cabeça de ferro com a orelha atrás, cabo e pezinhos), com a cara no cabo. */
function marteloCorpo(w: number, face: string, pes = true): string {
  return (
    (pes ? oval(50, 89, 7, 3, INK, 0) + oval(66, 89, 7, 3, INK, 0) : '') +
    // Cabo: pescoço de madeira e empunhadura laranja com frisos.
    shaded(CABO_D, CABO, `<rect x="40" y="38" width="34" height="17" fill="${PESCOCO}"/><ellipse cx="70" cy="88" rx="12" ry="22" fill="${CABO_ESCURO}"/>`, w, 'of-cabo') +
    line('M46 55 L68.5 55', 1.6) +
    line('M47 79 L67.5 79 M47 83.5 L67.5 83.5', 1.4, CABO_ESCURO) +
    shine('M49 60 L49 74', 2.4, 0.7) +
    // Orelha (unha de arrancar prego), curvada para trás e para baixo.
    shaded('M38 20 Q18 20 9 46 Q8 50 12 50 Q15 49 16 46 Q22 32 38 34 Z', FERRO, `<path d="M8 40 L40 30 L40 52 L8 52 Z" fill="${FERRO_ESCURO}"/>`, w, 'of-orelha') +
    line('M33 27 Q20 30 13 46', 1.6, FERRO_ESCURO) +
    // Cabeça de ferro.
    shaded(rr(34, 17, 56, 27, 5), FERRO, `<rect x="30" y="35" width="64" height="12" fill="${FERRO_ESCURO}"/>`, w, 'of-cabeca-mt') +
    shine('M40 22 L80 22', 2.8, 0.8) +
    // Boca do martelo (a face de bater), larga, virada para a frente: o escudo.
    shaded(rr(86, 13, 16, 35, 5), FERRO_CLARO, `<rect x="96" y="10" width="8" height="40" fill="${FERRO}"/>`, w, 'of-boca-mt') +
    line('M90 18 L90 43', 1.6, FERRO_ESCURO) +
    shine('M93 18 L93 30', 2.4, 0.9) +
    face
  );
}

/**
 * Martelo: martelo de unha andando de pé sobre o cabo, a cabeça de ferro em cima com a boca larga
 * virada para a frente como escudo (o ferro barra a tinta de frente) e a orelha curvada para trás.
 * A cara fica no cabo laranja, de costas para o ferro. Zangado: pálpebras em V e dentes cerrados.
 */
function marteloSvg(variant = 0): string {
  const w = MARTELO_LW;
  const face =
    eye(52, 62, 4.6, 5.6, [0.5, 0.2], 0.58, 1.6) +
    eye(63, 61.5, 4.4, 5.4, [0.5, 0.2], 0.58, 1.6) +
    lids('M47 59.5 L56.6 62 L56.6 55.5 L47 55.5 Z M58.4 61.3 L67.8 58.3 L67.8 55.3 L58.4 55.3 Z', CABO, 1.4) +
    line('M46.5 59 L57 62.3 M58.3 61.6 L68.4 58', 2.8) +
    outlined('M49 69 L66 68.5 L65.6 75 L49.4 75.5 Z', WHITE, 1.6) +
    line('M53.3 68.9 L53.3 75.4 M57.6 68.8 L57.6 75.3 M61.9 68.7 L61.9 75.2 M49.2 72.3 L65.8 71.8', 1.1);
  return svgDoc(BORRACHA_VB, `<ellipse cx="55" cy="90" rx="40" ry="3" fill="${INK}" opacity="0.14"/>` + marteloCorpo(w, face), variant);
}

/**
 * Martelo erguido: inclinado para trás na ponta dos pés, com a cabeça de ferro levantada para a
 * martelada. É o instante vulnerável (o cabo fica à mostra): cara de esforço (olhos espremidos,
 * dentes cerrados), suor, tremedeira e o arco do golpe. Mesmo quadro e apoio da pose de pé.
 */
export function marteloErguidoSvg(variant = 0): string {
  const w = MARTELO_LW;
  const face =
    squeezeEye(52, 62, 4.2, 1, 2.2) +
    squeezeEye(63, 61.5, 4, -1, 2.2) +
    line('M46.5 55.5 L56 58.5 M59 58.2 L68.4 55', 2.6) +
    outlined('M49 67 L66 66.5 L65.6 74 L49.4 74.5 Z', WHITE, 1.6) +
    line('M53.3 66.9 L53.3 74.4 M57.6 66.8 L57.6 74.3 M61.9 66.7 L61.9 74.2 M49.2 70.6 L65.8 70.1', 1.1) +
    blush(47.5, 69, 2.6, 0.75) +
    blush(67.5, 68, 2.6, 0.75);
  return svgDoc(
    BORRACHA_VB,
    `<ellipse cx="57" cy="90" rx="30" ry="3" fill="${INK}" opacity="0.14"/>` +
      // Pezinhos na ponta, fora da inclinação.
      oval(52, 89, 6, 2.6, INK, 0) +
      oval(66, 89, 6, 2.6, INK, 0) +
      `<g transform="translate(57 88) rotate(-16) scale(0.86) translate(-57 -88)">` +
      marteloCorpo(w, face, false) +
      `</g>` +
      // Arco do golpe à frente e tremedeira.
      `<path d="M78 20 Q98 22 104 44" fill="none" stroke="${INK}" stroke-width="2.4" stroke-dasharray="6 5" stroke-linecap="round"/>` +
      line('M98 52 L104 50 M97 62 L103 62', 2.2) +
      line('M24 60 L29 61 M26 70 L31 70', 2.2) +
      suor(80, 50, 1) +
      suor(36, 46, 0.9),
    variant,
  );
}

function marteloSoakSvg(variant = 0): string {
  return svgDoc(
    BORRACHA_VB,
    soakLayer('M45 66 Q51 62 57 65 Q63 61 69 65 L69 82 Q69 87 64 87 L50 87 Q45 87 45 82 Z', 'M49 70 L49 80', MARTELO_LW) +
      soakLayer('M10 46 Q16 40 22 44 Q28 39 36 42 Q46 38 56 42 Q66 38 76 42 Q86 38 102 42 L102 48 L86 48 L86 44 L34 44 L16 46 Q15 49 12 50 Q8 50 10 46 Z', 'M40 41.5 L50 41.5', MARTELO_LW) +
      drips([[42, 92, 1.8], [72, 92, 1.5], [94, 52, 1.6]]),
    variant,
  );
}

export const PELE_OFICINA: Pele = {
  id: 'oficina',
  traca: compassoSvg,
  tracaTinta: compassoSoakSvg,
  saltador: molinhaSvg,
  saltadorTinta: molinhaSoakSvg,
  grampo: imaSvg,
  grampoTinta: imaSoakSvg,
  fiandeira: prumoSvg,
  fiandeiraTinta: prumoSoakSvg,
  tinteiro: furadeiraSvg,
  tinteiroTinta: furadeiraSoakSvg,
  borracha: marteloSvg,
  borrachaTinta: marteloSoakSvg,
  cuspe: cuspeSvg,
};
