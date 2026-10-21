import type * as Phaser from 'phaser';
import type { Arena } from '@riscote/shared';
import { arenaFundoSvg, arenaSvg, tuboSvg } from './arena';
import {
  TRACA_FRAMES,
  bolaSvg,
  borraoSvg,
  gotaSvg,
  poeiraSvg,
  respingoSvg,
  saltadorSoakSvg,
  saltadorSvg,
  tracaSoakSvg,
  tracaSvg,
} from './enemies';
import { itemSvg } from './items';
import { POSES, riscoteSvg, type Pose } from './riscote';
import { BOIL, INK, hex } from './svg';

/** Pixels de tela por pixel do mundo: o jogo online roda com a câmera em zoom 2 para a arte não borrar. */
export const RES = 2;

/** Como um desenho ocupa o mundo: `k` pixels do mundo por unidade do SVG e o ponto de apoio (fração do quadro). */
export interface ArtSpec {
  key: string;
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

export function tracaKey(frame: number): string {
  return `traca-${frame % TRACA_FRAMES}`;
}

/** Riscotes, inimigos, itens e efeitos: iguais em todas as arenas. */
export function commonSpecs(playerColors: readonly number[]): ArtSpec[] {
  const specs: ArtSpec[] = [];
  playerColors.forEach((color, slot) => {
    for (const pose of POSES) specs.push(...boiled(riscoteKey(slot, pose), (v) => riscoteSvg(slot, hex(color), pose, v), 0.11, 100, 290));
  });
  for (let f = 0; f < TRACA_FRAMES; f++) specs.push(...boiled(tracaKey(f), (v) => tracaSvg(f, v), 0.19, 106, 150));
  specs.push(
    ...boiled('traca-tinta', tracaSoakSvg, 0.19, 106, 150),
    ...boiled('saltador', (v) => saltadorSvg(false, v), 0.3, 103, 134),
    ...boiled('saltador-ar', (v) => saltadorSvg(true, v), 0.3, 103, 134),
    ...boiled('saltador-tinta', saltadorSoakSvg, 0.3, 103, 134),
    ...boiled('bola', bolaSvg, 10 / 22, 0, 0),
    ...boiled('borrao', borraoSvg, 0.3, 100, 67),
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

/** O fundo de caderno e a camada de plataformas (os efeitos ficam entre as duas). */
export function arenaSpecs(a: Arena): { fundo: ArtSpec; plataformas: ArtSpec } {
  return {
    fundo: { key: `arena-${a.id}-fundo`, svg: arenaFundoSvg(a), k: 0.5, ox: 0, oy: 0 },
    plataformas: { key: `arena-${a.id}`, svg: arenaSvg(a), k: 0.5, ox: 0, oy: 0 },
  };
}

/** Rasteriza o SVG no tamanho exato em que vai aparecer na tela e registra como textura. */
async function rasterize(textures: Phaser.Textures.TextureManager, s: ArtSpec): Promise<void> {
  if (textures.exists(s.key)) return;
  const size = artSize(s);
  const w = Math.ceil(size.w * RES);
  const h = Math.ceil(size.h * RES);
  const svg = s.svg.replace('<svg ', `<svg width="${w}" height="${h}" preserveAspectRatio="none" `);
  const img = new Image(w, h);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
  if (!textures.exists(s.key)) textures.addCanvas(s.key, canvas);
}

/** Carrega a arte que falta; enquanto isso a cena desenha o greybox. */
export async function loadArt(textures: Phaser.Textures.TextureManager, specs: ArtSpec[]): Promise<void> {
  await Promise.all(specs.map((s) => rasterize(textures, s)));
}
