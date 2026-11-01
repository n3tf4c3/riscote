import type * as Phaser from 'phaser';
import type { Arena } from '@riscote/shared';
import { arenaCamadasSvg, arenaFundoSvg, arenaSvg, temaId, tuboBaseSvg, tuboSvg, type CamadaSvg } from './arena';
import {
  GRAMPO_FRAMES,
  TRACA_FRAMES,
  bolaSvg,
  borrachaSoakSvg,
  borrachaSvg,
  borraoSvg,
  cuspeSvg,
  fiandeiraSoakSvg,
  fiandeiraSvg,
  gotaSvg,
  grampoSoakSvg,
  grampoSvg,
  manchaSvg,
  poeiraSvg,
  respingoSvg,
  saltadorSoakSvg,
  saltadorSvg,
  tinteiroSoakSvg,
  tinteiroSvg,
  tracaSoakSvg,
  tracaSvg,
} from './enemies';
import { borboletaSvg, brotoSvg, casuloSvg, gravetoSvg, ouricoBolaSvg, ouricoTontoSvg, seivaArcoSvg } from './floresta-poderes';
import { letraSvg, paginaSoltaSvg, pergaminhoRoloSvg } from './biblioteca-poderes';
import { enciclopediaAbertaSvg, morcegoMergulhoSvg } from './pele-biblioteca';
import { bolhaSvg, gotinhaSvg, orvalhoSvg } from './jardim-poderes';
import { sombrinhaFechadaSvg } from './pele-jardim';
import { brocaSvg, parafusoSvg } from './oficina-poderes';
import { marteloErguidoSvg } from './pele-oficina';
import { estilhacoSvg, estrelaSvg, flechaSvg, notaSvg } from './castelo-poderes';
import { aviaoVooSvg, torreaoAbertoSvg } from './pele-castelo';
import { itemSvg } from './items';
import { auraEstrelaSvg, auraProtecaoSvg } from './auras';
import { PLAYER_GLOWS, POSES, riscoteSvg, type Pose } from './riscote';
import { PELE_CADERNO, type Pele } from './pele';
import { BOIL, INK, hex } from './svg';

/** Pixels de tela por pixel do mundo: o jogo online roda com a câmera em zoom 2 para a arte não borrar. */
export const RES = 2;

/** Como um desenho ocupa o mundo: `k` pixels do mundo por unidade do SVG e o ponto de apoio (fração do quadro). */
export interface ArtSpec {
  key: string;
  /** Chave da textura, quando é diferente da chave do desenho (as peles de cada capítulo). */
  tex?: string;
  svg: string;
  k: number;
  ox: number;
  oy: number;
}

export interface ArtSize {
  w: number;
  h: number;
}

function viewBox(svg: string): { x: number; y: number; w: number; h: number } {
  const m = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(svg);
  if (!m) throw new Error('svg sem viewBox');
  return { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) };
}

/** Tamanho no mundo de um desenho. */
export function artSize(spec: ArtSpec): ArtSize {
  const vb = viewBox(spec.svg);
  return { w: vb.w * spec.k, h: vb.h * spec.k };
}

/** Ponto de apoio a partir de uma coordenada do próprio SVG. */
function anchor(svg: string, ax: number, ay: number): { ox: number; oy: number } {
  const vb = viewBox(svg);
  return { ox: (ax - vb.x) / vb.w, oy: (ay - vb.y) / vb.h };
}

function spec(key: string, svg: string, k: number, ax: number, ay: number): ArtSpec {
  return { key, svg, k, ...anchor(svg, ax, ay) };
}

/** Chave da variação `v` da linha viva; a variação 0 usa a chave simples. */
export function boilKey(key: string, v: number): string {
  return v === 0 ? key : `${key}~${v}`;
}

/** As `BOIL` variações de um desenho, todas com o mesmo tamanho e apoio. */
function boiled(key: string, make: (variant: number) => string, k: number, ax: number, ay: number): ArtSpec[] {
  return Array.from({ length: BOIL }, (_, v) => spec(boilKey(key, v), make(v), k, ax, ay));
}

export function riscoteKey(slot: number, pose: Pose): string {
  return `riscote-${slot}-${pose}`;
}

/** Bolha de proteção do modo fácil, na cor de cada jogador. */
export function protecaoKey(slot: number): string {
  return `aura-protecao-${slot}`;
}

/** Tamanho das auras no mundo: um pouco maior que o boneco (16 × 26 px). */
const AURA_K = 0.3;

export function tracaKey(frame: number): string {
  return `traca-${frame % TRACA_FRAMES}`;
}

export function grampoKey(frame: number): string {
  return `grampo-${frame % GRAMPO_FRAMES}`;
}

/** Chave da textura de um desenho da pele: o caderno usa a chave simples; as outras, com o prefixo. */
export function vestir(specs: ArtSpec[], pele: string): ArtSpec[] {
  return pele === PELE_CADERNO.id ? specs : specs.map((s) => ({ ...s, tex: `${pele}:${s.key}` }));
}

/** Os inimigos na pele do capítulo, com o tamanho e o apoio de sempre. */
function inimigos(p: Pele): ArtSpec[] {
  const specs: ArtSpec[] = [];
  for (let f = 0; f < TRACA_FRAMES; f++) specs.push(...boiled(tracaKey(f), (v) => p.traca(f, v, false), 0.19, 106, 150));
  specs.push(
    ...boiled('traca-bote', (v) => p.traca(0, v, true), 0.19, 106, 150),
    ...boiled('traca-tinta', (v) => p.tracaTinta(v), 0.19, 106, 150),
    ...boiled('saltador', (v) => p.saltador(false, v, false), 0.3, 103, 134),
    ...boiled('saltador-carga', (v) => p.saltador(false, v, true), 0.3, 103, 134),
    ...boiled('saltador-ar', (v) => p.saltador(true, v, false), 0.3, 103, 134),
    ...boiled('saltador-tinta', (v) => p.saltadorTinta(v), 0.3, 103, 134),
    ...Array.from({ length: GRAMPO_FRAMES }, (_, f) => boiled(grampoKey(f), (v) => p.grampo(f, v), 0.24, 50, 89)).flat(),
    ...boiled('grampo-tinta', (v) => p.grampoTinta(v), 0.24, 50, 89),
    ...boiled('fiandeira-0', (v) => p.fiandeira(0, v), 0.42, 50, 54),
    ...boiled('fiandeira-1', (v) => p.fiandeira(1, v), 0.42, 50, 54),
    ...boiled('fiandeira-tinta', (v) => p.fiandeiraTinta(v), 0.42, 50, 54),
    ...boiled('tinteiro-0', (v) => p.tinteiro(0, v, false), 0.25, 52, 96),
    ...boiled('tinteiro-1', (v) => p.tinteiro(1, v, false), 0.25, 52, 96),
    ...boiled('tinteiro-carga', (v) => p.tinteiro(0, v, true), 0.25, 52, 96),
    ...boiled('tinteiro-tinta', (v) => p.tinteiroTinta(v), 0.25, 52, 96),
    ...boiled('borracha', (v) => p.borracha(v), 0.23, 55, 89),
    ...boiled('borracha-tinta', (v) => p.borrachaTinta(v), 0.23, 55, 89),
    ...boiled('cuspe', (v) => p.cuspe(v), 0.36, 0, 0),
  );
  return vestir(specs, p.id);
}

/** Os poderes das criaturas da Floresta: casulo, borboleta, bola de espinhos, ouriço tonto, brotos, graveto e seiva. */
export function poderesFlorestaSpecs(): ArtSpec[] {
  return vestir(
    [
      spec('lagarta-casulo', casuloSvg(), 0.2, 50, 96),
      spec('borboleta-0', borboletaSvg(0), 0.22, 60, 50),
      spec('borboleta-1', borboletaSvg(1), 0.22, 60, 50),
      spec('ourico-bola', ouricoBolaSvg(), 0.2, 0, 0),
      spec('ourico-tonto', ouricoTontoSvg(), 0.23, 55, 89),
      spec('broto-0', brotoSvg(0), 0.4, 0, 0),
      spec('broto-1', brotoSvg(1), 0.4, 0, 0),
      spec('graveto', gravetoSvg(), 0.4, 0, 0),
      spec('seiva-arco', seivaArcoSvg(), 0.5, 0, 0),
    ],
    'floresta',
  );
}

/**
 * Os poderes das criaturas da Biblioteca: a enciclopédia aberta e o morcego mergulhando (nos quadros da
 * borracha e da fiandeira), a página solta, as letras e a ponta do tapete do pergaminho.
 */
export function poderesBibliotecaSpecs(): ArtSpec[] {
  return vestir(
    [
      spec('enciclopedia-aberta', enciclopediaAbertaSvg(), 0.23, 55, 89),
      spec('morcego-mergulho', morcegoMergulhoSvg(), 0.42, 50, 54),
      spec('pagina-solta', paginaSoltaSvg(), 0.36, 0, 0),
      ...[0, 1, 2].map((i) => spec(`letra-${i}`, letraSvg(i as 0 | 1 | 2), 0.36, 0, 0)),
      spec('pergaminho-rolo', pergaminhoRoloSvg(), 0.3, 0, 0),
    ],
    'biblioteca',
  );
}

/** Os poderes das criaturas do Jardim: a sombrinha fechada (no quadro da borracha), a bolha, o orvalho e a gotinha. */
export function poderesJardimSpecs(): ArtSpec[] {
  return vestir(
    [
      spec('sombrinha-fechada', sombrinhaFechadaSvg(), 0.23, 55, 89),
      spec('bolha', bolhaSvg(), 0.36, 0, 0),
      spec('orvalho', orvalhoSvg(), 0.3, 0, 0),
      spec('gotinha', gotinhaSvg(), 0.3, 0, 0),
    ],
    'jardim',
  );
}

/** Os poderes das criaturas da Oficina: o martelo erguido (no quadro da borracha), o parafuso e a broca. */
export function poderesOficinaSpecs(): ArtSpec[] {
  return vestir(
    [spec('martelo-erguido', marteloErguidoSvg(), 0.23, 55, 89), spec('parafuso', parafusoSvg(), 0.3, 0, 0), spec('broca', brocaSvg(), 0.3, 0, 0)],
    'oficina',
  );
}

/**
 * Os poderes das criaturas do Castelo: o avião voando (no quadro do grampo), o torreão aberto (no da borracha),
 * a nota, a lasca, a estrela e a flecha.
 */
export function poderesCasteloSpecs(): ArtSpec[] {
  return vestir(
    [
      spec('aviao-voo', aviaoVooSvg(), 0.24, 50, 89),
      spec('torreao-aberto', torreaoAbertoSvg(), 0.23, 55, 89),
      spec('nota', notaSvg(), 0.36, 0, 0),
      spec('estilhaco', estilhacoSvg(), 0.3, 0, 0),
      spec('estrela', estrelaSvg(), 0.3, 0, 0),
      spec('flecha', flechaSvg(), 0.36, 0, 0),
    ],
    'castelo',
  );
}

/** Riscotes, inimigos (na pele do capítulo), itens e efeitos. */
export function commonSpecs(playerColors: readonly number[], pele: Pele = PELE_CADERNO): ArtSpec[] {
  const specs: ArtSpec[] = [];
  playerColors.forEach((color, slot) => {
    for (const pose of POSES) specs.push(...boiled(riscoteKey(slot, pose), (v) => riscoteSvg(slot, hex(color), pose, v), 0.11, 100, 290));
    specs.push(...boiled(protecaoKey(slot), (v) => auraProtecaoSvg(hex(color), PLAYER_GLOWS[slot] ?? hex(color), v), AURA_K, 0, 0));
  });
  specs.push(...boiled('aura-estrela', auraEstrelaSvg, AURA_K, 0, 0));
  specs.push(...inimigos(pele));
  specs.push(
    ...boiled('bola', bolaSvg, 10 / 22, 0, 0),
    ...boiled('borrao', borraoSvg, 0.3, 100, 67),
    ...boiled('mancha', manchaSvg, 0.44, 0, 0),
    ...boiled('gota', gotaSvg, 0.75, 0, 0),
    spec('tubo', tuboSvg(), 0.5, 0, 80),
    spec('poeira', poeiraSvg(), 0.35, 0, 0),
  );
  for (let s = 0; s < 2; s++) {
    specs.push(spec(`respingo-azul-${s}`, respingoSvg('#2f6fd6', s), 0.4, 0, 0));
    specs.push(spec(`respingo-tinta-${s}`, respingoSvg(INK, s), 0.4, 0, 0));
  }
  for (let kind = 0; kind < 5; kind++) specs.push(...boiled(`item-${kind}`, (v) => itemSvg(kind, v), 0.2, 100, 142));
  return specs;
}

/** Camada de parallax como textura: o desenho, quanto ela anda e quanto passa de cada borda. */
export interface CamadaSpec {
  spec: ArtSpec;
  nome: CamadaSvg['nome'];
  amp: number;
  margem: number;
}

/**
 * O fundo (caderno ou céu parado) e a camada de plataformas (os efeitos ficam entre as duas), mais
 * as camadas de parallax dos temas com cenário. `tema` troca o tema da arena (`?tema=`).
 */
export function arenaSpecs(a: Arena, tema?: string | null): { fundo: ArtSpec; plataformas: ArtSpec; camadas: CamadaSpec[]; baseTubo: ArtSpec | null } {
  const id = `arena-${a.id}@${temaId(a, tema)}`;
  const base = tuboBaseSvg(a, tema);
  return {
    // Atrás da bisnaga, com o mesmo apoio dela: o meio da base, no chão (quadro -40 -4 80 86).
    baseTubo: base ? { key: `tubo-base@${temaId(a, tema)}`, svg: base, k: 0.5, ox: 0.5, oy: 84 / 86 } : null,
    fundo: { key: `${id}-fundo`, svg: arenaFundoSvg(a, tema), k: 0.5, ox: 0, oy: 0 },
    plataformas: { key: id, svg: arenaSvg(a, tema), k: 0.5, ox: 0, oy: 0 },
    camadas: arenaCamadasSvg(a, tema).map((c) => ({
      spec: { key: `${id}-${c.nome}`, svg: c.svg, k: 0.5, ox: 0, oy: 0 },
      nome: c.nome,
      amp: c.amp,
      margem: c.margem,
    })),
  };
}

/**
 * Quanto trabalho de rasterização cabe antes de devolver a vez ao navegador. Os filtros de tinta
 * custam até ~10 ms por desenho; feitos de uma vez, as centenas de desenhos travavam a página
 * (e o canvas recém-criado ficava preto) por segundos.
 */
const SLICE_MS = 8;
let sliceStart = 0;
/** Uma rasterização por vez, em fila: assim a fatia de tempo vale para todas juntas. */
let queue: Promise<unknown> = Promise.resolve();
/** Desenhos já rasterizados (ou a caminho), por chave: a capa adianta o trabalho e a cena só registra. */
const rasters = new Map<string, Promise<HTMLCanvasElement>>();

function inTurn<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    if (performance.now() - sliceStart > SLICE_MS) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      sliceStart = performance.now();
    }
    return job();
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Rasteriza um SVG em `w × h` pixels, na mesma fila em fatias (a capa usa para o palco). */
export function rasterSvg(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  return inTurn(async () => {
    const sized = svg.replace('<svg ', `<svg width="${w}" height="${h}" preserveAspectRatio="none" `);
    const img = new Image(w, h);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
    return canvas;
  });
}

/** Rasteriza o SVG no tamanho exato em que vai aparecer na tela. */
function raster(s: ArtSpec): Promise<HTMLCanvasElement> {
  const key = s.tex ?? s.key;
  let done = rasters.get(key);
  if (done) return done;
  const size = artSize(s);
  done = rasterSvg(s.svg, Math.ceil(size.w * RES), Math.ceil(size.h * RES));
  rasters.set(key, done);
  // Falhou: outra tentativa pode refazer.
  done.catch(() => rasters.delete(key));
  return done;
}

/** Adianta a rasterização (na capa, antes de existir o jogo), um desenho por vez. */
export async function prepareArt(specs: ArtSpec[]): Promise<void> {
  for (const s of specs) await raster(s);
}

/** Carrega a arte que falta e registra como textura; enquanto isso a cena desenha o greybox. */
export async function loadArt(
  textures: Phaser.Textures.TextureManager,
  specs: ArtSpec[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let done = 0;
  onProgress?.(done, specs.length);
  await Promise.all(
    specs.map(async (s) => {
      const key = s.tex ?? s.key;
      if (!textures.exists(key)) {
        const canvas = await raster(s);
        if (!textures.exists(key)) textures.addCanvas(key, canvas);
      }
      onProgress?.(++done, specs.length);
    }),
  );
}
