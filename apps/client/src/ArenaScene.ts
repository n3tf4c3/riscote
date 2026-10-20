import * as Phaser from 'phaser';
import { TICK_DT, createPlayer, stepPlayer, type Arena, type MovementParams, type PlayerState } from '@riscote/shared';
import { PLAYER_COLORS, drawArena, drawPlayer } from './draw';
import type { InputSource } from './input';
import type { Metrics } from './metrics';

export interface SceneContext {
  params: MovementParams;
  input: InputSource;
  metrics: Metrics;
  arena: () => Arena;
}

const MAX_FRAME = 0.25;

/** Modo local (etapa 1): um jogador, sem rede, com parâmetros ajustáveis. */
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
    drawArena(this, this.arena);
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
    // Passo fixo, igual ao do servidor; a tela interpola entre os dois últimos ticks.
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
    const g = this.playerGfx.clear();
    drawPlayer(
      g,
      this.prevX + (this.player.x - this.prevX) * alpha,
      this.prevY + (this.player.y - this.prevY) * alpha,
      this.ctx.params,
      this.player.facing,
      PLAYER_COLORS[0],
      false,
    );
  }
}
