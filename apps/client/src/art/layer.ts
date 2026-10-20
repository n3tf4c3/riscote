import type * as Phaser from 'phaser';
import { artSize, type ArtSize, type ArtSpec } from './textures';

export interface DrawOptions {
  flip?: boolean;
  alpha?: number;
  angle?: number;
}

/** Sprites reaproveitados quadro a quadro: `begin`, um `draw` por desenho, `end` esconde as sobras. */
export class ArtLayer {
  private readonly specs = new Map<string, { spec: ArtSpec; size: ArtSize }>();
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private used = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    specs: ArtSpec[],
  ) {
    for (const spec of specs) this.specs.set(spec.key, { spec, size: artSize(spec) });
  }

  begin(): void {
    this.used = 0;
  }

  /** Desenha `key` com o ponto de apoio em (x, y); espelhar mantém o apoio no lugar. */
  draw(key: string, x: number, y: number, depth: number, opts: DrawOptions = {}): void {
    const entry = this.specs.get(key);
    if (!entry) return;
    let img = this.pool[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, key);
      this.pool.push(img);
    }
    this.used++;
    const { spec, size } = entry;
    img
      .setTexture(key)
      .setVisible(true)
      .setOrigin(opts.flip ? 1 - spec.ox : spec.ox, spec.oy)
      .setDisplaySize(size.w, size.h)
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
