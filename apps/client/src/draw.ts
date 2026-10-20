import type * as Phaser from 'phaser';
import { ONE_WAY, SOLID, TILE, cellAt, tubeRect, type Arena, type MovementParams } from '@riscote/shared';

// Greybox: cores só para separar o que é jogável (escuro, contorno) do fundo (claro).
const PAPER = 0xf1ead9;
const GRID = 0xe2d9c4;
export const INK = 0x1f1d1a;
const ONE_WAY_FILL = 0x8a8478;
const TUBE = 0x2f6fd6;
const ENEMY_MARK = 0xc8402a;

/** Cores dos 5 jogadores (plano, seção 3): vermelhão, azul, ocre, verde-azulado, púrpura. */
export const PLAYER_COLORS = [0xe0502e, 0x3f8fd8, 0xd99a1e, 0x1f9e89, 0x9b4f96] as const;

export function drawArena(scene: Phaser.Scene, a: Arena): void {
  const g = scene.add.graphics();
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

export function drawPlayer(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  p: MovementParams,
  facing: number,
  color: number,
  isLocal: boolean,
): void {
  const w = p.playerWidth * TILE;
  const h = p.playerHeight * TILE;
  g.fillStyle(color).fillRect(x, y, w, h);
  g.lineStyle(isLocal ? 3 : 2, INK).strokeRect(x, y, w, h);
  const eyeX = facing > 0 ? x + w - 5 : x + 5;
  g.fillStyle(INK).fillCircle(eyeX, y + h * 0.3, 2);
  if (isLocal) {
    // Marcador acima da cabeça: o jogador acha o próprio boneco entre os cinco.
    g.fillStyle(INK).fillTriangle(x + w / 2 - 4, y - 9, x + w / 2 + 4, y - 9, x + w / 2, y - 4);
  }
}
