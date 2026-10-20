import type * as Phaser from 'phaser';
import type { Arena } from '@riscote/shared';
import { arenaSvg, tuboSvg } from './arena';
import { bolaSvg, borraoSvg, saltadorSoakSvg, saltadorSvg, tracaSoakSvg, tracaSvg } from './enemies';
import { itemSvg } from './items';
import { POSES, riscoteSvg, type Pose } from './riscote';
import { hex } from './svg';

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

export function riscoteKey(slot: number, pose: Pose): string {
  return `riscote-${slot}-${pose}`;
}

/** Riscotes, inimigos e itens: iguais em todas as arenas. */
export function commonSpecs(playerColors: readonly number[]): ArtSpec[] {
  const specs: ArtSpec[] = [];
  playerColors.forEach((color, slot) => {
    for (const pose of POSES) specs.push(spec(riscoteKey(slot, pose), riscoteSvg(slot, hex(color), pose), 0.11, 100, 290));
  });
  specs.push(
    spec('traca', tracaSvg(), 0.19, 106, 150),
    spec('traca-tinta', tracaSoakSvg(), 0.19, 106, 150),
    spec('saltador', saltadorSvg(), 0.3, 103, 134),
    spec('saltador-tinta', saltadorSoakSvg(), 0.3, 103, 134),
    spec('bola', bolaSvg(), 10 / 22, 0, 0),
    spec('borrao', borraoSvg(), 0.3, 100, 67),
    spec('tubo', tuboSvg(), 0.5, 0, 80),
  );
  for (let kind = 0; kind < 5; kind++) specs.push(spec(`item-${kind}`, itemSvg(kind), 0.2, 100, 142));
  return specs;
}

export function arenaSpec(a: Arena): ArtSpec {
  return { key: `arena-${a.id}`, svg: arenaSvg(a), k: 0.5, ox: 0, oy: 0 };
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
