// Acabamento de giz de cera nos cenários (pedido do usuário em 2026-11-03). A técnica é a do desenho
// a lápis de cor e giz sobre papel áspero: riscos diagonais curtos num tom mais claro e num mais escuro
// da própria cor, a borda das formas um pouco tremida e os pontinhos de papel onde o giz não pegou.
// Não muda o tema nem a composição de nenhum cenário: é um acabamento por cima do desenho que já existe.
//
// Em duas partes, pelo custo:
// - o tremor da borda vai no SVG (`comTremor`), com um ruído de uma oitava só, e nunca nas peças
//   jogáveis (a caixa de colisão é a do desenho);
// - riscos e grão são um ladrilho desenhado uma vez (`ladrilho`) e passado no canvas logo depois de
//   rasterizar (`aplicarGiz`): nos riscos, o próprio desenho é multiplicado por ele mesmo (escurece) ou
//   somado em "tela" (clareia), então cada tema continua com a sua paleta. Feito com filtro de ruído no SVG, custava ~200 ms por camada.

/** Quanto do acabamento entra numa textura. */
export interface Giz {
  /** Inclinação dos riscos, em graus (negativo sobe para a direita). */
  angulo: number;
  /** Comprimento e grossura dos riscos, em pixels da tela. */
  risco: readonly [number, number];
  /** Força dos riscos escuros e dos claros (0 a 1). */
  escuro: number;
  claro: number;
  /** Força dos pontinhos de papel. */
  grao: number;
}

/** Céu: riscos mais deitados e leves (fica atrás de tudo). */
export const GIZ_CEU: Giz = { angulo: -28, risco: [18, 5], escuro: 0.2, claro: 0.26, grao: 0.18 };
/** Longe e meio: o acabamento mais marcado, como os morros das referências. */
export const GIZ_LONGE: Giz = { angulo: -38, risco: [20, 5], escuro: 0.4, claro: 0.45, grao: 0.22 };
export const GIZ_MEIO: Giz = { angulo: -38, risco: [20, 5], escuro: 0.55, claro: 0.5, grao: 0.26 };
/** Frente: só nas paredes e no chão. */
export const GIZ_FRENTE: Giz = { angulo: -42, risco: [22, 6], escuro: 0.5, claro: 0.42, grao: 0.2 };
/** Sólidos e plataformas: textura por dentro, sem tremor. */
export const GIZ_JOGAVEL: Giz = { angulo: -38, risco: [20, 5], escuro: 0.45, claro: 0.4, grao: 0.16 };
/** Peças pequenas do cenário (o enfeite atrás da bisnaga): riscos miúdos. */
export const GIZ_PECA: Giz = { angulo: -38, risco: [9, 3], escuro: 0.35, claro: 0.35, grao: 0.14 };
/**
 * Corpo dos chefes (pedido do usuário em 2026-11-04): riscos miúdos e mais leves que os do cenário,
 * para o rosto e as poses continuarem legíveis. Os golpes deles ficam sem giz.
 */
export const GIZ_CHEFE: Giz = { angulo: -38, risco: [11, 3.5], escuro: 0.3, claro: 0.32, grao: 0.12 };
/** Papel da página (fundo do CSS, atrás da capa e do jogo): bem leve. */
export const GIZ_PAPEL: Giz = { angulo: -36, risco: [22, 5], escuro: 0.1, claro: 0.45, grao: 0.3 };
/** Caderno: papel, manchas e rabiscos de giz. */
export const GIZ_CADERNO: Giz = { angulo: -36, risco: [22, 5], escuro: 0.2, claro: 0.55, grao: 0.3 };

/** Deslocamento da borda, em unidades do desenho, por camada do cenário. */
export const TREMOR = { longe: 5, meio: 6, frente: 6 } as const;

/** Borda tremida de giz: só deslocamento, com ruído de uma oitava (o barato do filtro). */
export function comTremor(id: string, escala: number, corpo: string): string {
  return (
    `<defs><filter id="${id}" x="-4%" y="-4%" width="108%" height="108%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="7" result="t"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="t" scale="${escala}" xChannelSelector="R" yChannelSelector="G"/>` +
    `</filter></defs><g filter="url(#${id})">${corpo}</g>`
  );
}

/** Sorteio fixo (o mesmo desenho em toda máquina). */
function sorteio(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LADO = 256;
const ladrilhos = new Map<string, HTMLCanvasElement>();

/**
 * Ladrilho que se repete sem emenda: riscos inclinados (cinza para multiplicar ou para clarear) ou
 * pontinhos brancos de papel. Cada risco que passa da borda é desenhado de novo do outro lado.
 */
function ladrilho(tipo: 'escuro' | 'claro' | 'grao', g: Giz): HTMLCanvasElement {
  const chave = `${tipo}:${g.angulo}:${g.risco.join('x')}`;
  const pronto = ladrilhos.get(chave);
  if (pronto) return pronto;
  const c = document.createElement('canvas');
  c.width = LADO;
  c.height = LADO;
  const ctx = c.getContext('2d')!;
  const r = sorteio(tipo === 'escuro' ? 17 : tipo === 'claro' ? 29 : 43);
  if (tipo === 'grao') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 900; i++) {
      const x = r() * LADO;
      const y = r() * LADO;
      const s = 0.8 + r() * 1.6;
      ctx.globalAlpha = 0.5 + r() * 0.5;
      ctx.fillRect(x, y, s, s * (0.6 + r() * 0.6));
    }
  } else {
    const [comp, gross] = g.risco;
    ctx.lineCap = 'round';
    // Só o alfa do ladrilho importa: ele recorta o próprio desenho.
    ctx.strokeStyle = '#000000';
    const n = Math.round((LADO * LADO) / (comp * gross * 2.6));
    for (let i = 0; i < n; i++) {
      const x = r() * LADO;
      const y = r() * LADO;
      const a = ((g.angulo + (r() - 0.5) * 12) * Math.PI) / 180;
      const len = comp * (0.6 + r() * 0.8);
      const dx = (Math.cos(a) * len) / 2;
      const dy = (Math.sin(a) * len) / 2;
      ctx.lineWidth = gross * (0.6 + r() * 0.7);
      ctx.globalAlpha = 0.35 + r() * 0.65;
      for (const ox of [-LADO, 0, LADO]) {
        for (const oy of [-LADO, 0, LADO]) {
          ctx.beginPath();
          ctx.moveTo(x + ox - dx, y + oy - dy);
          ctx.lineTo(x + ox + dx, y + oy + dy);
          ctx.stroke();
        }
      }
    }
  }
  ladrilhos.set(chave, c);
  return c;
}

/**
 * Ladrilho de giz pronto para fundo de CSS (o papel da página): riscos de um marrom apagado e brancos,
 * mais o grão, num PNG que se repete. Sem o desenho por baixo, o tom vem da cor do papel.
 */
export function gizPapelUrl(g: Giz = GIZ_PAPEL): string {
  const c = document.createElement('canvas');
  c.width = LADO;
  c.height = LADO;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const camada = (tipo: 'escuro' | 'claro' | 'grao', cor: string, forca: number) => {
    const t = document.createElement('canvas');
    t.width = LADO;
    t.height = LADO;
    const tc = t.getContext('2d')!;
    tc.drawImage(ladrilho(tipo, g), 0, 0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = cor;
    tc.fillRect(0, 0, LADO, LADO);
    ctx.globalAlpha = forca;
    ctx.drawImage(t, 0, 0);
  };
  camada('escuro', '#7a6a4c', g.escuro);
  camada('claro', '#ffffff', g.claro);
  camada('grao', '#ffffff', g.grao);
  return c.toDataURL('image/png');
}

/**
 * Passa riscos e grão no canvas já rasterizado, só onde há desenho. Riscos: uma cópia do desenho
 * recortada pelo ladrilho, multiplicada (escuro) ou somada em "tela" (claro) por cima dele mesmo.
 * Grão: os pontinhos brancos postos só onde já há desenho.
 */
export function aplicarGiz(canvas: HTMLCanvasElement, g: Giz): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const camada = document.createElement('canvas');
  camada.width = w;
  camada.height = h;
  const cc = camada.getContext('2d')!;
  const passos: Array<['escuro' | 'claro' | 'grao', number, GlobalCompositeOperation]> = [
    ['escuro', g.escuro, 'multiply'],
    ['claro', g.claro, 'screen'],
    ['grao', g.grao, 'source-atop'],
  ];
  for (const [tipo, forca, modo] of passos) {
    if (forca <= 0) continue;
    const padrao = cc.createPattern(ladrilho(tipo, g), 'repeat');
    if (!padrao) continue;
    cc.globalAlpha = 1;
    cc.fillStyle = padrao;
    if (tipo === 'grao') {
      cc.globalCompositeOperation = 'copy';
      cc.fillRect(0, 0, w, h);
    } else {
      // A cópia do desenho, só onde passa um risco.
      cc.globalCompositeOperation = 'copy';
      cc.drawImage(canvas, 0, 0);
      cc.globalCompositeOperation = 'destination-in';
      cc.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = modo;
    ctx.globalAlpha = forca;
    ctx.drawImage(camada, 0, 0);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
