import type * as Phaser from 'phaser';
import { BOIL } from './svg';
import { artSize, boilKey, type ArtSize, type ArtSpec } from './textures';

/** Troca de variação da linha viva: ~9 quadros por segundo. */
const BOIL_MS = 110;

export interface DrawOptions {
  flip?: boolean;
  alpha?: number;
  angle?: number;
  /** Compressão e esticamento em volta do ponto de apoio. */
  sx?: number;
  sy?: number;
  /** Sem linha viva (efeitos que já mudam de forma sozinhos). */
  still?: boolean;
}

/** Sprites reaproveitados quadro a quadro: `begin`, um `draw` por desenho, `end` esconde as sobras. */
export class ArtLayer {
  private readonly specs = new Map<string, { spec: ArtSpec; size: ArtSize }>();
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private used = 0;
  private boil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    specs: ArtSpec[],
  ) {
    for (const spec of specs) this.specs.set(spec.key, { spec, size: artSize(spec) });
  }

  begin(now: number): void {
    this.used = 0;
    this.boil = Math.floor(now / BOIL_MS) % BOIL;
  }

  /** Desenha `key` com o ponto de apoio em (x, y); espelhar mantém o apoio no lugar. */
  draw(key: string, x: number, y: number, depth: number, opts: DrawOptions = {}): void {
    const entry = this.specs.get(key);
    if (!entry) return;
    // A variação da linha viva entra quando a textura dela já carregou.
    const boiled = boilKey(key, opts.still ? 0 : this.boil);
    const texture = this.scene.textures.exists(boiled) ? boiled : key;
    let img = this.pool[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, texture);
      this.pool.push(img);
    }
    this.used++;
    const { spec, size } = entry;
    img
      .setTexture(texture)
      .setVisible(true)
      .setOrigin(opts.flip ? 1 - spec.ox : spec.ox, spec.oy)
      .setDisplaySize(size.w * (opts.sx ?? 1), size.h * (opts.sy ?? 1))
      .setFlipX(opts.flip ?? false)
      .setPosition(x, y)
      .setAlpha(opts.alpha ?? 1)
      .setAngle(opts.angle ?? 0)
      .setDepth(depth);
  }

  end(): void {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i]?.setVisible(false);
  }
}
