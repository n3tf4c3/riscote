import * as Phaser from 'phaser';
import { PHASE_CLEAR, PHASE_RESTART, TICK_DT, TILE } from '@riscote/shared';
import { INK, PLAYER_COLORS, drawArena, drawDrop, drawEnemy, drawPlayerFull } from './draw';
import type { InputSource } from './input';
import type { OnlineSession } from './net';

const MAX_FRAME = 0.25;
const GREY = 0x888888;

/** Modo online: o próprio boneco é previsto; inimigos, gotas e os outros chegam interpolados do servidor. */
export class OnlineScene extends Phaser.Scene {
  private acc = 0;
  private prevX = 0;
  private prevY = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;

  constructor(private readonly ctx: { session: () => OnlineSession | null; input: InputSource }) {
    super('online');
  }

  create(): void {
    const session = this.ctx.session();
    if (!session) return;
    drawArena(this, session.arena);
    this.gfx = this.add.graphics();
    const w = session.arena.cols * TILE;
    this.banner = this.add
      .text(w / 2, TILE * 1.5, '', { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#1f1d1a', fontStyle: 'bold' })
      .setOrigin(0.5, 0.5);
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

    const now = performance.now();
    const state = session.state;
    const g = this.gfx.clear();
    for (const e of session.enemyViews(now)) drawEnemy(g, e.x, e.y, e, state.soakToBall);
    for (const r of session.remotePlayers(now)) {
      drawPlayerFull(g, r.x, r.y, session.params, r, PLAYER_COLORS[r.slot] ?? GREY, false, now);
    }
    const me = session.me;
    const alpha = this.acc / TICK_DT;
    const local = session.local;
    if (me) {
      drawPlayerFull(
        g,
        this.prevX + (local.x - this.prevX) * alpha,
        this.prevY + (local.y - this.prevY) * alpha,
        session.params,
        { facing: local.facing, ink: me.ink, down: me.down, rescue: me.rescue, invuln: me.invuln },
        PLAYER_COLORS[session.slot] ?? GREY,
        true,
        now,
      );
    }
    for (const d of session.dropViews(now)) drawDrop(g, d.x, d.y, PLAYER_COLORS[d.slot] ?? INK);

    this.banner.setText(
      state.phase === PHASE_CLEAR ? 'Arena limpa!' : state.phase === PHASE_RESTART ? 'Sem vidas: recomeçando a arena…' : '',
    );
  }
}
