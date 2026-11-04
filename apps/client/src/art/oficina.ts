import { SOLID, cellAt, type Arena } from '@riscote/shared';
import type { Cenario, Tema } from './arena';
import { C, n, solidPath, solidTops, type Rect } from './celulas';
import { INK, WHITE, hash, line, outlined } from './svg';

// Oficina Mágica, "A Oficina do Riscador" (conceito de 2026-11-01, protótipo): a oficina de um
// inventor onde as ferramentas trabalham sozinhas. O cartão-postal da fase é o Riscador, um braço
// articulado gigante que desenha sozinho numa prancheta, e o que ele esboça é o castelo de nuvens da
// fase seguinte. Engrenagens de papelão, polias, um painel de ferramentas de desenho, rolos de papel.
// O Riscador não desenha a própria arena: linhas no lugar das plataformas, deslocadas pelo parallax,
// virariam plataformas-fantasma.
// Leitura: engrenagens e polias ficam junto às paredes e no alto, nunca na ponta de uma plataforma
// (sugeririam plataforma móvel); nada de vidros e potes (lembrariam o tinteiro), grampos ou borrachas;
// nem blocos com letras, caixas-surpresa ou soldadinhos.

/** Parede de papel kraft, mais escura junto ao teto. */
const CEU: ReadonlyArray<readonly [number, string]> = [
  [0, '#d9c6a3'],
  [0.14, '#e2d0ae'],
  [0.3, '#e9dbbd'],
  [0.5, '#eee2c7'],
];
const PRANCHETA = '#f8f2e4';
const MOLDURA = '#b8875a';
const TRACO_LONGE = '#9c7650';
const ESBOCO = '#a9a39a';
/** Latão apagado: o Riscador está longe e passa por trás do jogo, então não pode chamar mais atenção que as peças. */
const LATAO = '#dcc495';
const LATAO_TRACO = '#b79b6c';
const LAPIS = '#ecd08a';
const PAINEL = '#d8b98c';
const FERRAMENTA = '#b89a72';
const LUZ = '#fff6d6';

const PAPELAO = '#d4a373';
const COBRE = '#c4865c';
const PAPELAO_TRACO = '#8c5a35';
const SALVIA = '#5f7d6a';
const ROLO = '#f1e4c8';

const GAVETEIRO = '#2e2a36';
const GAVETA = '#38333f';
const GAVETA_TRACO = '#24212b';
const TAMPO = '#b07a4a';
const TAMPO_VEIO = '#8c5a35';
const REGUA = '#ffd166';
const REGUA_SOMBRA = '#e0ae3e';
const METAL = '#8a8f9c';

const FRENTE = '#5a3f2c';
const FRENTE_CLARA = '#7a5a40';
const LAPIS_FRENTE = '#c9932f';
const LAPIS_FACETA = '#a87a24';

/** Engrenagem: `dentes` dentes entre os raios `ri` e `re`, com um furo no meio. */
function engrenagem(x: number, y: number, re: number, dentes: number, rot: number, cor: string, traco: string): string {
  const ri = re * 0.82;
  const pts: string[] = [];
  for (let k = 0; k < dentes; k++) {
    const a0 = ((k / dentes) * 360 + rot) * (Math.PI / 180);
    const passo = (2 * Math.PI) / dentes;
    const ang = [a0, a0 + passo * 0.12, a0 + passo * 0.38, a0 + passo * 0.5, a0 + passo * 0.62, a0 + passo * 0.88];
    const raio = [ri, re, re, re, ri, ri];
    ang.forEach((a, i) => pts.push(`${n(x + Math.cos(a) * (raio[i] ?? ri))} ${n(y + Math.sin(a) * (raio[i] ?? ri))}`));
  }
  const furos = [0, 120, 240]
    .map((d) => {
      const a = ((d + rot) * Math.PI) / 180;
      return `<circle cx="${n(x + Math.cos(a) * re * 0.48)}" cy="${n(y + Math.sin(a) * re * 0.48)}" r="${n(re * 0.16)}" fill="${traco}" opacity="0.35"/>`;
    })
    .join('');
  return (
    `<path d="M${pts.join(' L')} Z" fill="${cor}" stroke="${traco}" stroke-width="3" stroke-linejoin="round"/>` +
    furos +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(re * 0.14)}" fill="${traco}"/>`
  );
}

/** O Riscador: base de latão, dois braços articulados e um lápis na ponta, sobre a prancheta. */
function riscador(bx: number, by: number, ex: number, ey: number, px: number, py: number): string {
  const braco = (x0: number, y0: number, x1: number, y1: number, larg: number) =>
    `<path d="M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)}" stroke="${LATAO_TRACO}" stroke-width="${larg + 6}" stroke-linecap="round"/>` +
    `<path d="M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)}" stroke="${LATAO}" stroke-width="${larg}" stroke-linecap="round"/>`;
  // Lápis inclinado, com a ponta no papel.
  const ang = Math.atan2(py - ey, px - ex);
  const lx = px - Math.cos(ang) * 60;
  const ly = py - Math.sin(ang) * 60;
  const faiscas = [
    [14, -10],
    [-12, -14],
    [18, 8],
  ]
    .map(([dx, dy]) => `<path d="M${n(px + (dx ?? 0))} ${n(py + (dy ?? 0) - 5)} v10 M${n(px + (dx ?? 0) - 5)} ${n(py + (dy ?? 0))} h10" stroke="${LUZ}" stroke-width="3" stroke-linecap="round"/>`)
    .join('');
  return (
    braco(bx, by, ex, ey, 10) +
    braco(ex, ey, lx, ly, 7) +
    `<path d="M${n(lx)} ${n(ly)} L${n(px - Math.cos(ang) * 14)} ${n(py - Math.sin(ang) * 14)}" stroke="${LATAO_TRACO}" stroke-width="13" stroke-linecap="butt"/>` +
    `<path d="M${n(lx)} ${n(ly)} L${n(px - Math.cos(ang) * 14)} ${n(py - Math.sin(ang) * 14)}" stroke="${LAPIS}" stroke-width="8" stroke-linecap="butt"/>` +
    `<path d="M${n(px - Math.cos(ang) * 14 + Math.sin(ang) * 6)} ${n(py - Math.sin(ang) * 14 - Math.cos(ang) * 6)} L${n(px)} ${n(py)} L${n(px - Math.cos(ang) * 14 - Math.sin(ang) * 6)} ${n(py - Math.sin(ang) * 14 + Math.cos(ang) * 6)} Z" fill="#e8c9a0" stroke="${LATAO_TRACO}" stroke-width="2"/>` +
    `<circle cx="${n(bx)}" cy="${n(by)}" r="24" fill="${LATAO}" stroke="${LATAO_TRACO}" stroke-width="3"/>` +
    `<circle cx="${n(bx)}" cy="${n(by)}" r="10" fill="${LATAO_TRACO}"/>` +
    `<circle cx="${n(ex)}" cy="${n(ey)}" r="10" fill="${LATAO}" stroke="${LATAO_TRACO}" stroke-width="3"/>` +
    `<circle cx="${n(lx)}" cy="${n(ly)}" r="9" fill="${LATAO}" stroke="${LATAO_TRACO}" stroke-width="3"/>` +
    faiscas
  );
}

/** Esboço a lápis do castelo de nuvens (a fase seguinte), com linhas de construção. */
function esbocoCastelo(x: number, y: number, s: number): string {
  const torre = (tx: number, tw: number, th: number) =>
    `M${n(x + tx * s)} ${n(y)} V${n(y - th * s)} H${n(x + (tx + tw) * s)} V${n(y)} ` +
    `M${n(x + (tx - 4) * s)} ${n(y - th * s)} Q${n(x + (tx + tw / 2) * s)} ${n(y - (th + 30) * s)} ${n(x + (tx + tw + 4) * s)} ${n(y - th * s)} ` +
    `M${n(x + (tx + tw / 2) * s)} ${n(y - (th + 22) * s)} V${n(y - (th + 50) * s)} L${n(x + (tx + tw / 2 + 22) * s)} ${n(y - (th + 42) * s)} L${n(x + (tx + tw / 2) * s)} ${n(y - (th + 36) * s)}`;
  const nuvem = `M${n(x - 40 * s)} ${n(y + 10 * s)} q${n(10 * s)} ${n(-30 * s)} ${n(40 * s)} ${n(-14 * s)} q${n(20 * s)} ${n(-30 * s)} ${n(54 * s)} ${n(-6 * s)} q${n(30 * s)} ${n(-24 * s)} ${n(56 * s)} ${n(4 * s)} q${n(30 * s)} ${n(-20 * s)} ${n(52 * s)} ${n(10 * s)} q${n(30 * s)} ${n(-10 * s)} ${n(40 * s)} ${n(16 * s)}`;
  return (
    `<path d="${torre(0, 40, 90)} ${torre(60, 56, 140)} ${torre(136, 40, 100)} M${n(x + 40 * s)} ${n(y - 50 * s)} H${n(x + 60 * s)} M${n(x + 116 * s)} ${n(y - 60 * s)} H${n(x + 136 * s)} ${nuvem}" fill="none" stroke="${ESBOCO}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M${n(x - 60 * s)} ${n(y)} H${n(x + 230 * s)} M${n(x + 88 * s)} ${n(y + 30 * s)} V${n(y - 220 * s)}" stroke="${ESBOCO}" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.7"/>`
  );
}

/** Painel perfurado com ferramentas de desenho penduradas (silhuetas apagadas). */
function painel(x: number, y: number, w: number, h: number, seed: number): string {
  const furos: string[] = [];
  for (let fy = y + 14; fy < y + h - 6; fy += 20) for (let fx = x + 14; fx < x + w - 6; fx += 20) furos.push(`M${n(fx)} ${n(fy)} h0.1`);
  const t = `fill="none" stroke="${FERRAMENTA}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
  const cx = x + w / 2;
  const ferramentas =
    `<path d="M${n(x + 24)} ${n(y + 24)} L${n(x + 24)} ${n(y + 100)} L${n(x + 80)} ${n(y + 100)} Z" ${t}/>` +
    `<path d="M${n(cx + 10)} ${n(y + 20)} L${n(cx - 6)} ${n(y + 110)} M${n(cx + 10)} ${n(y + 20)} L${n(cx + 26)} ${n(y + 110)} M${n(cx + 10)} ${n(y + 12)} v8" ${t}/>` +
    `<path d="M${n(x + w - 30)} ${n(y + 18)} V${n(y + 120)} M${n(x + w - 40)} ${n(y + 18)} H${n(x + w - 20)}" ${t}/>` +
    `<path d="M${n(x + 30 + 10 * hash(seed))} ${n(y + h - 60)} l40 30 M${n(x + 30)} ${n(y + h - 30)} l40 -30 M${n(x + 24)} ${n(y + h - 64)} a7 7 0 1 0 0.1 0 M${n(x + 24)} ${n(y + h - 24)} a7 7 0 1 0 0.1 0" ${t}/>`;
  return (
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="6" fill="${PAINEL}" stroke="${TRACO_LONGE}" stroke-width="3"/>` +
    `<path d="${furos.join(' ')}" stroke="${TRACO_LONGE}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>` +
    ferramentas
  );
}

/** Polia presa no alto, com a corda em laço. */
function polia(x: number, topo: number, y: number): string {
  return (
    `<path d="M${n(x)} ${n(topo)} V${n(y - 20)}" stroke="${PAPELAO_TRACO}" stroke-width="4"/>` +
    `<path d="M${n(x - 16)} ${n(y)} V${n(y + 70)} Q${n(x - 16)} ${n(y + 86)} ${n(x)} ${n(y + 86)} Q${n(x + 16)} ${n(y + 86)} ${n(x + 16)} ${n(y + 70)} V${n(y)}" stroke="#b49a7a" stroke-width="3.5" fill="none"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="20" fill="${COBRE}" stroke="${PAPELAO_TRACO}" stroke-width="3"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="6" fill="${PAPELAO_TRACO}"/>`
  );
}

/** Rolo de papel deitado atrás do chão. */
function rolo(x: number, chao: number, r: number, comp: number): string {
  return (
    `<rect x="${n(x)}" y="${n(chao - 2 * r)}" width="${n(comp)}" height="${n(2 * r)}" fill="${ROLO}" stroke="#c9b08a" stroke-width="2.5"/>` +
    `<ellipse cx="${n(x + comp)}" cy="${n(chao - r)}" rx="${n(r * 0.55)}" ry="${n(r)}" fill="#f8efdc" stroke="#c9b08a" stroke-width="2.5"/>` +
    `<path d="M${n(x + comp)} ${n(chao - r)} m0 -${n(r * 0.3)} a${n(r * 0.18)} ${n(r * 0.3)} 0 1 1 0 ${n(r * 0.6)}" stroke="#c9b08a" stroke-width="2" fill="none"/>`
  );
}

/** Lápis gigante em pé, como coluna (fica dentro da parede). */
function lapisColuna(x: number, y0: number, y1: number): string {
  return (
    `<rect x="${n(x - 13)}" y="${n(y0)}" width="26" height="${n(y1 - y0)}" fill="${LAPIS_FRENTE}"/>` +
    `<path d="M${n(x - 4)} ${n(y0)} V${n(y1)} M${n(x + 5)} ${n(y0)} V${n(y1)}" stroke="${LAPIS_FACETA}" stroke-width="3"/>` +
    `<path d="M${n(x - 13)} ${n(y0 + 50)} h26 M${n(x - 13)} ${n(y0 + 62)} h26" stroke="${FRENTE_CLARA}" stroke-width="5"/>`
  );
}

/** Régua ou esquadro escuro pendurado num gancho, nos cantos de cima. */
function pendurado(x: number, y: number, tipo: number, rot: number): string {
  const corpo = tipo === 0 ? `M-7 0 H7 V84 H-7 Z` : `M-5 0 L-5 64 L42 64 Z M3 22 L3 56 L24 56 Z`;
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})">` +
    `<path d="M0 -40 V0" stroke="${FRENTE}" stroke-width="3"/>` +
    `<path d="${corpo}" fill="${FRENTE}" fill-rule="evenodd"/>` +
    (tipo === 0 ? `<path d="M-7 18 h6 M-7 36 h6 M-7 54 h6 M-7 72 h6" stroke="${FRENTE_CLARA}" stroke-width="2.5"/>` : '') +
    `</g>`
  );
}

export const OFICINA_CENARIO: Cenario = {
  ceu: (w, h) => {
    const faixas = CEU.map(([y0, cor], i) => {
      const y1 = (CEU[i + 1]?.[0] ?? 1) * h;
      return `<rect x="0" y="${n(y0 * h)}" width="${w}" height="${n(y1 - y0 * h + 1)}" fill="${cor}"/>`;
    }).join('');
    const pauta: string[] = [];
    for (let y = C; y < h; y += C) pauta.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    return (
      faixas +
      `<g stroke="#d6c39f" stroke-width="2" opacity="0.55">${pauta.join('')}</g>` +
      `<line x1="${C * 3.2}" y1="0" x2="${C * 3.2}" y2="${h}" stroke="#e7a99a" stroke-width="3" opacity="0.35"/>`
    );
  },

  longe: {
    amp: 6,
    desenho: (_a, w, h, m) => {
      const px0 = 0.3 * w;
      const px1 = 0.7 * w;
      const py0 = 0.14 * h;
      const py1 = 0.66 * h;
      const pernas = `<path d="M${n(px0 + 30)} ${n(py1)} L${n(px0 + 10)} ${h + m} M${n(px1 - 30)} ${n(py1)} L${n(px1 - 10)} ${h + m}" stroke="${MOLDURA}" stroke-width="14"/>`;
      const prancheta =
        `<rect x="${n(px0 - 12)}" y="${n(py0 - 12)}" width="${n(px1 - px0 + 24)}" height="${n(py1 - py0 + 24)}" rx="8" fill="${MOLDURA}" stroke="${TRACO_LONGE}" stroke-width="3"/>` +
        `<rect x="${n(px0)}" y="${n(py0)}" width="${n(px1 - px0)}" height="${n(py1 - py0)}" fill="${PRANCHETA}"/>` +
        [
          [px0 + 14, py0 + 14],
          [px1 - 14, py0 + 14],
          [px0 + 14, py1 - 14],
          [px1 - 14, py1 - 14],
        ]
          .map(([x, y]) => `<circle cx="${n(x ?? 0)}" cy="${n(y ?? 0)}" r="6" fill="${COBRE}"/>`)
          .join('');
      const janela =
        `<path d="M${n(0.1 * w - 40)} ${-m} L${n(0.1 * w + 60)} ${-m} L${n(0.32 * w + 120)} ${h + m} L${n(0.32 * w - 60)} ${h + m} Z" fill="${LUZ}" opacity="0.28"/>` +
        `<circle cx="${n(0.1 * w)}" cy="${n(0.12 * h)}" r="58" fill="${LUZ}" stroke="${TRACO_LONGE}" stroke-width="8"/>` +
        `<path d="M${n(0.1 * w - 58)} ${n(0.12 * h)} H${n(0.1 * w + 58)} M${n(0.1 * w)} ${n(0.12 * h - 58)} V${n(0.12 * h + 58)}" stroke="${TRACO_LONGE}" stroke-width="5"/>`;
      return (
        janela +
        painel(0.03 * w, 0.32 * h, 0.2 * w, 0.3 * h, 4600) +
        painel(0.77 * w, 0.34 * h, 0.2 * w, 0.28 * h, 4700) +
        pernas +
        prancheta +
        esbocoCastelo(0.4 * w, 0.56 * h, 0.95) +
        riscador(px1 + 10, py0 + 10, 0.6 * w, 0.04 * h, 0.46 * w, 0.22 * h) +
        `<rect x="${-m}" y="${n(h - C * 1.6)}" width="${w + 2 * m}" height="${n(C * 1.6 + m)}" fill="#c9b08a"/>`
      );
    },
  },

  meio: {
    amp: 3,
    desenho: (a, w, h, m) => {
      const chao = (a.rows - 1) * C;
      const coisas: string[] = [];
      for (let x = 120, i = 0; x < w - 160; x += 200 + 120 * hash(4800 + i), i++) {
        if (Math.abs(x - w / 2) < w * 0.16) continue;
        coisas.push(rolo(x, chao + 4, 12 + 5 * hash(4900 + i), 60 + 40 * hash(5000 + i)));
      }
      const lampada =
        `<circle cx="${n(0.5 * w)}" cy="${n(0.06 * h + 40)}" r="70" fill="${LUZ}" opacity="0.3"/>` +
        `<path d="M${n(0.5 * w)} ${-m} V${n(0.06 * h)}" stroke="#5a4a3c" stroke-width="3"/>` +
        `<path d="M${n(0.5 * w - 34)} ${n(0.06 * h + 34)} L${n(0.5 * w - 12)} ${n(0.06 * h)} H${n(0.5 * w + 12)} L${n(0.5 * w + 34)} ${n(0.06 * h + 34)} Z" fill="${SALVIA}" stroke="#3f5446" stroke-width="3" stroke-linejoin="round"/>` +
        `<ellipse cx="${n(0.5 * w)}" cy="${n(0.06 * h + 36)}" rx="14" ry="6" fill="#fffbe8"/>`;
      return (
        engrenagem(0, 0.26 * h, 92, 14, 8, PAPELAO, PAPELAO_TRACO) +
        engrenagem(0.07 * w + 40, 0.07 * h, 48, 10, 0, COBRE, PAPELAO_TRACO) +
        engrenagem(w, 0.56 * h, 84, 13, 4, PAPELAO, PAPELAO_TRACO) +
        engrenagem(0.93 * w - 30, 0.1 * h, 46, 9, 12, COBRE, PAPELAO_TRACO) +
        polia(0.36 * w, -m, 0.12 * h) +
        polia(0.64 * w + 40, -m, 0.07 * h) +
        lampada +
        coisas.join('')
      );
    },
  },

  frente: {
    amp: -4,
    desenho: (a, w, h, m) => {
      const chao = (a.rows - 1) * C;
      const aparas: string[] = [];
      for (let x = 50, i = 0; x < w - 30; x += 90 + 70 * hash(5100 + i), i++) {
        aparas.push(`<path d="M${n(x)} ${n(chao + 24)} q8 -10 16 0 q-6 8 -12 2" stroke="${FRENTE_CLARA}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
      }
      return (
        pendurado(-m + 40, -m + 20, 0, 8) +
        pendurado(-m + 90, -m + 8, 1, -6) +
        pendurado(w + m - 40, -m + 16, 0, -10) +
        pendurado(w + m - 110, -m + 4, 1, 4) +
        lapisColuna(C * 0.45, -m, h + m) +
        lapisColuna(w - C * 0.45, -m, h + m) +
        aparas.join('')
      );
    },
  },

  solidos: (a: Arena) => {
    // Gaveteiro: uma gaveta por célula, com puxador de latão.
    const gavetas: string[] = [];
    for (let r = 0; r < a.rows; r++) {
      for (let c = 0; c < a.cols; c++) {
        if (cellAt(a, c, r) !== SOLID) continue;
        const x = c * C;
        const y = r * C;
        gavetas.push(`<rect x="${x + 4}" y="${y + 4}" width="${C - 8}" height="${C - 8}" rx="4" fill="${GAVETA}" stroke="${GAVETA_TRACO}" stroke-width="2.5"/>`);
        gavetas.push(`<rect x="${x + C / 2 - 7}" y="${y + C / 2 - 3}" width="14" height="6" rx="3" fill="${LATAO}" opacity="${hash(c * 13 + r * 7) < 0.5 ? 0.9 : 0.6}"/>`);
      }
    }
    const tampos = solidTops(a)
      .map(
        ({ x0, x1, y }) =>
          `<rect x="${x0 - 2}" y="${y - 2}" width="${x1 - x0 + 4}" height="12" rx="4" fill="${TAMPO}" stroke="${INK}" stroke-width="3"/>` +
          `<path d="M${x0 + 10} ${y + 6} H${Math.max(x0 + 12, x1 - 10)}" stroke="${TAMPO_VEIO}" stroke-width="1.6" stroke-dasharray="34 9 12 9"/>` +
          line(`M${x0 + 8} ${y + 2} L${Math.max(x0 + 10, x1 - 8)} ${y + 2}`, 2.2, WHITE).replace('/>', ' opacity="0.45"/>'),
      )
      .join('');
    const forma = solidPath(a);
    return (
      `<clipPath id="gaveteiro"><path d="${forma}"/></clipPath>` +
      `<g filter="url(#sombra-plataforma)"><path d="${forma}" fill="${GAVETEIRO}"/></g>` +
      `<g clip-path="url(#gaveteiro)">${gavetas.join('')}</g>` +
      tampos
    );
  },

  plataforma: (r: Rect) => {
    const x = r.c0 * C + 3;
    const y = r.r0 * C + 2;
    const w = (r.c1 - r.c0 + 1) * C - 6;
    const h = 20;
    const body = `M${x + 6} ${y} L${x + w - 6} ${y} Q${x + w} ${y} ${x + w} ${y + 6} L${x + w} ${y + h - 6} Q${x + w} ${y + h} ${x + w - 6} ${y + h} L${x + 6} ${y + h} Q${x} ${y + h} ${x} ${y + h - 6} L${x} ${y + 6} Q${x} ${y} ${x + 6} ${y} Z`;
    // Marcas da régua descendo da borda de cima: curtas a cada 8, longas a cada 40.
    const marcas: string[] = [];
    for (let k = 8, i = 1; k < w - 6; k += 8, i++) marcas.push(`M${x + k} ${y + 2} v${i % 5 === 0 ? 8 : 4}`);
    // Mãos-francesas de metal nas pontas, por baixo.
    const apoio = (ax: number, lado: number) => outlined(`M${ax} ${y + h - 2} L${ax} ${y + h + 12} L${ax + lado * 4} ${y + h + 12} L${ax + lado * 4} ${y + h + 4} L${ax + lado * 14} ${y + h - 2} Z`, METAL, 2.5);
    return (
      apoio(x + 12, 1) +
      apoio(x + w - 12, -1) +
      `<g filter="url(#sombra-plataforma)">${outlined(body, REGUA, 5)}</g>` +
      `<path d="M${x + 3} ${y + 14} H${x + w - 3} V${y + h - 3} H${x + 3} Z" fill="${REGUA_SOMBRA}"/>` +
      `<path d="${marcas.join(' ')}" stroke="${INK}" stroke-width="1.8" opacity="0.75"/>` +
      `<circle cx="${x + w - 12}" cy="${y + 11}" r="3.5" fill="${REGUA_SOMBRA}" stroke="${INK}" stroke-width="2"/>` +
      `<path d="${body}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    );
  },

  baseTubo: () =>
    // Suporte de parede com duas presilhas de metal, como de ferramenta.
    `<rect x="-30" y="20" width="60" height="60" rx="4" fill="#d8b98c" stroke="#9c7650" stroke-width="3"/>` +
    `<path d="M-30 40 H30 M-30 60 H30" stroke="#c4a172" stroke-width="2"/>` +
    `<rect x="-24" y="30" width="48" height="6" rx="3" fill="#a5aab8" stroke="#6f7480" stroke-width="2"/>` +
    `<rect x="-24" y="58" width="48" height="6" rx="3" fill="#a5aab8" stroke="#6f7480" stroke-width="2"/>`,

  ancora: (x, y) =>
    `<path d="M${x} ${y} V${y + 8} q0 7 6 7 q6 0 6 -6" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>` +
    `<path d="M${x} ${y} V${y + 8} q0 7 6 7 q6 0 6 -6" fill="none" stroke="${METAL}" stroke-width="2.5" stroke-linecap="round"/>`,
};

/** Tema da Oficina: o caderno de fallback fica vazio; quem desenha é o cenário. */
export const OFICINA: Tema = {
  pauta: () => '',
  rabiscos: () => '',
  manchas: () => '',
  etiqueta: REGUA,
  cenario: OFICINA_CENARIO,
};
