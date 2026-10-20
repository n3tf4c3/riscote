import * as Phaser from 'phaser';
import {
  ONE_WAY,
  SOLID,
  TICK_DT,
  TILE,
  cellAt,
  createPlayer,
  stepPlayer,
  tubeRect,
  type Arena,
  type MovementParams,
  type PlayerState,
} from '@riscote/shared';
import type { InputSource } from './input';
import type { Metrics } from './metrics';

export interface SceneContext {
  params: MovementParams;
  input: InputSource;
  metrics: Metrics;
  arena: () => Arena;
}

// Greybox: cores só para separar o que é jogável (escuro, contorno) do fundo (claro).
const PAPER = 0xf1ead9;
const GRID = 0xe2d9c4;
const INK = 0x1f1d1a;
const ONE_WAY_FILL = 0x8a8478;
const TUBE = 0x2f6fd6;
const ENEMY_MARK = 0xc8402a;
const PLAYER_FILL = 0xe0502e;

const MAX_FRAME = 0.25;

export class ArenaScene extends Phaser.Scene {
  private arena!: Arena;
  private player!: PlayerState;
  private prevX = 0;
  private prevY = 0;
  private acc = 0;
  private simTime = 0;
  private playerGfx!: Phaser.GameObjects.Graphics;

  constructor(private readonly ctx: SceneContext) {
    super('arena');
  }

  create(): void {
    this.arena = this.ctx.arena();
    this.acc = 0;
    this.simTime = 0;
    this.ctx.metrics.reset();
    this.drawArena();
    this.playerGfx = this.add.graphics();
    this.respawn();
  }

  respawn(): void {
    const spawns = this.arena.playerSpawns;
    this.player = createPlayer(spawns[Math.floor(spawns.length / 2)]!, this.ctx.params);
    this.prevX = this.player.x;
    this.prevY = this.player.y;
  }

  get state(): PlayerState {
    return this.player;
  }

  update(_time: number, deltaMs: number): void {
    // Passo fixo, igual ao que o servidor vai usar; a tela interpola entre os dois últimos ticks.
    this.acc = Math.min(this.acc + deltaMs / 1000, MAX_FRAME);
    const buttons = this.ctx.input.buttons();
    while (this.acc >= TICK_DT) {
      this.prevX = this.player.x;
      this.prevY = this.player.y;
      stepPlayer(this.player, buttons, this.arena, this.ctx.params);
      this.simTime += TICK_DT;
      this.ctx.metrics.update(this.simTime, this.player, this.arena, this.ctx.params);
      this.acc -= TICK_DT;
    }
    const alpha = this.acc / TICK_DT;
    this.drawPlayer(
      this.prevX + (this.player.x - this.prevX) * alpha,
      this.prevY + (this.player.y - this.prevY) * alpha,
    );
  }

  private drawArena(): void {
    const a = this.arena;
    const g = this.add.graphics();
    g.fillStyle(PAPER).fillRect(0, 0, a.cols * TILE, a.rows * TILE);
    g.lineStyle(1, GRID);
    for (let c = 1; c < a.cols; c++) g.lineBetween(c * TILE, 0, c * TILE, a.rows * TILE);
    for (let r = 1; r < a.rows; r++) g.lineBetween(0, r * TILE, a.cols * TILE, r * TILE);

    for (let r = 0; r < a.rows; r++) {
      for (let c = 0; c < a.cols; c++) {
        const kind = cellAt(a, c, r);
        if (kind === SOLID) g.fillStyle(INK).fillRect(c * TILE, r * TILE, TILE, TILE);
        if (kind === ONE_WAY) {
          g.fillStyle(ONE_WAY_FILL).fillRect(c * TILE, r * TILE, TILE, TILE * 0.45);
          g.fillStyle(INK).fillRect(c * TILE, r * TILE, TILE, 3);
        }
      }
    }

    for (const tube of a.tubes) {
      const t = tubeRect(tube);
      g.fillStyle(TUBE).fillRect(t.x + 3, t.y + 4, t.w - 6, t.h - 4);
      g.fillStyle(INK).fillRect(t.x + 1, t.y, t.w - 2, 5);
      g.lineStyle(2, INK).strokeRect(t.x + 3, t.y + 4, t.w - 6, t.h - 4);
    }

    g.lineStyle(2, ENEMY_MARK);
    for (const e of a.enemySpawns) {
      const x = e.col * TILE;
      const y = e.row * TILE;
      g.lineBetween(x + 5, y + 5, x + TILE - 5, y + TILE - 5);
      g.lineBetween(x + TILE - 5, y + 5, x + 5, y + TILE - 5);
    }

    g.fillStyle(INK, 0.25);
    for (const s of a.playerSpawns) g.fillCircle(s.col * TILE + TILE / 2, (s.row + 1) * TILE - 3, 3);
  }

  private drawPlayer(x: number, y: number): void {
    const p = this.ctx.params;
    const w = p.playerWidth * TILE;
    const h = p.playerHeight * TILE;
    const g = this.playerGfx.clear();
    g.fillStyle(PLAYER_FILL).fillRect(x, y, w, h);
    g.lineStyle(2, INK).strokeRect(x, y, w, h);
    const eyeX = this.player.facing > 0 ? x + w - 5 : x + 5;
    g.fillStyle(INK).fillCircle(eyeX, y + h * 0.3, 2);
  }
}
