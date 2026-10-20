import * as Phaser from 'phaser';
import { TICK_DT } from '@riscote/shared';
import { PLAYER_COLORS, drawArena, drawPlayer } from './draw';
import type { InputSource } from './input';
import type { OnlineSession } from './net';

const MAX_FRAME = 0.25;

/** Modo online (etapa 2): o próprio boneco é previsto; os outros chegam interpolados do servidor. */
export class OnlineScene extends Phaser.Scene {
  private acc = 0;
  private prevX = 0;
  private prevY = 0;
  private gfx!: Phaser.GameObjects.Graphics;

  constructor(private readonly ctx: { session: () => OnlineSession | null; input: InputSource }) {
    super('online');
  }

  create(): void {
    const session = this.ctx.session();
    if (!session) return;
    drawArena(this, session.arena);
    this.gfx = this.add.graphics();
    this.acc = 0;
    this.prevX = session.local.x;
    this.prevY = session.local.y;
  }

  update(_time: number, deltaMs: number): void {
    const session = this.ctx.session();
    if (!session || !this.gfx) return;

    this.acc = Math.min(this.acc + deltaMs / 1000, MAX_FRAME);
    const buttons = this.ctx.input.buttons();
    while (this.acc >= TICK_DT) {
      this.prevX = session.local.x;
      this.prevY = session.local.y;
      session.tick(buttons);
      this.acc -= TICK_DT;
    }

    const g = this.gfx.clear();
    for (const r of session.remotes(performance.now())) {
      drawPlayer(g, r.x, r.y, session.params, r.facing, PLAYER_COLORS[r.slot] ?? 0x888888, false);
    }
    const alpha = this.acc / TICK_DT;
    const me = session.local;
    drawPlayer(
      g,
      this.prevX + (me.x - this.prevX) * alpha,
      this.prevY + (me.y - this.prevY) * alpha,
      session.params,
      me.facing,
      PLAYER_COLORS[session.slot] ?? 0x888888,
      true,
    );
  }
}
