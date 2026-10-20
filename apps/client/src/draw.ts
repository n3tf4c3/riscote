import type * as Phaser from 'phaser';
import {
  ENEMY_SALTADOR,
  ENEMY_SIZE,
  MODE_WALK,
  ONE_WAY,
  RULES,
  SOLID,
  TILE,
  cellAt,
  tubeRect,
  type Arena,
  type MovementParams,
} from '@riscote/shared';

// Greybox: cores só para separar o que é jogável (escuro, contorno) do fundo (claro).
const PAPER = 0xf1ead9;
const GRID = 0xe2d9c4;
export const INK = 0x1f1d1a;
const ONE_WAY_FILL = 0x8a8478;
/** Azul da tinta dos jogadores: tubos, gotas, medidores e inimigos encharcados. */
export const INK_BLUE = 0x2f6fd6;
const TUBE = INK_BLUE;
const TRACA = 0x8b6f4e;
const SALTADOR = 0x5d4f8f;
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
  alpha = 1,
): void {
  const w = p.playerWidth * TILE;
  const h = p.playerHeight * TILE;
  g.fillStyle(color, alpha).fillRect(x, y, w, h);
  g.lineStyle(isLocal ? 3 : 2, INK, alpha).strokeRect(x, y, w, h);
  const eyeX = facing > 0 ? x + w - 5 : x + 5;
  g.fillStyle(INK, alpha).fillCircle(eyeX, y + h * 0.3, 2);
  if (isLocal) {
    // Marcador acima da cabeça: o jogador acha o próprio boneco entre os cinco.
    g.fillStyle(INK).fillTriangle(x + w / 2 - 4, y - 9, x + w / 2 + 4, y - 9, x + w / 2, y - 4);
  }
}

export interface PlayerLook {
  facing: number;
  ink: number;
  down: boolean;
  rescue: number;
  invuln: number;
}

/** Jogador com medidor de tinta ao lado; derrubado vira mancha com o anel de resgate; invulnerável pisca. */
export function drawPlayerFull(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  p: MovementParams,
  look: PlayerLook,
  color: number,
  isLocal: boolean,
  now: number,
): void {
  const w = p.playerWidth * TILE;
  const h = p.playerHeight * TILE;
  if (look.down) {
    const cx = x + w / 2;
    const cy = y + h - 5;
    g.fillStyle(color, 0.85).fillEllipse(cx, cy, w * 1.6, 10);
    g.lineStyle(2, INK).strokeEllipse(cx, cy, w * 1.6, 10);
    if (look.rescue > 0) {
      const k = Math.min(1, look.rescue / RULES.rescueTime);
      g.lineStyle(3, INK).beginPath();
      g.arc(cx, cy - 14, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      g.strokePath();
    }
    return;
  }
  const blink = look.invuln > 0 && Math.floor(now / 100) % 2 === 0;
  drawPlayer(g, x, y, p, look.facing, color, isLocal, blink ? 0.35 : 1);

  // Medidor de tinta: frasquinho ao lado do boneco (plano, seção 2.7).
  const gx = look.facing > 0 ? x - 6 : x + w + 2;
  const fill = (h - 4) * Math.max(0, Math.min(1, look.ink / RULES.tankSize));
  g.fillStyle(0xffffff).fillRect(gx, y + 2, 4, h - 4);
  g.fillStyle(look.ink < 1 && Math.floor(now / 200) % 2 === 0 ? 0xc8402a : INK_BLUE).fillRect(gx, y + h - 2 - fill, 4, fill);
  g.lineStyle(1, INK).strokeRect(gx, y + 2, 4, h - 4);
}

export interface EnemyLook {
  kind: number;
  mode: number;
  facing: number;
  soak: number;
}

export function drawEnemy(g: Phaser.GameObjects.Graphics, x: number, y: number, e: EnemyLook, soakToBall: number): void {
  const size = ENEMY_SIZE * TILE;
  if (e.mode !== MODE_WALK) {
    // Bola de tinta; rolando, um traço gira com o deslocamento.
    const r = size / 2 + 1;
    const cx = x + size / 2;
    const cy = y + size / 2;
    g.fillStyle(INK_BLUE).fillCircle(cx, cy, r);
    g.lineStyle(2, INK).strokeCircle(cx, cy, r);
    const a = x / r;
    g.lineStyle(2, 0xffffff, 0.8).lineBetween(cx - Math.cos(a) * r * 0.6, cy - Math.sin(a) * r * 0.6, cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6);
    return;
  }
  const body = e.kind === ENEMY_SALTADOR ? SALTADOR : TRACA;
  if (e.kind === ENEMY_SALTADOR) g.fillStyle(body).fillRoundedRect(x, y, size, size, 6);
  else g.fillStyle(body).fillRect(x, y + 3, size, size - 3);
  const soaked = Math.min(1, e.soak / Math.max(1, soakToBall));
  if (soaked > 0) g.fillStyle(INK_BLUE, 0.75).fillRect(x, y + size * (1 - soaked), size, size * soaked);
  g.lineStyle(2, INK);
  if (e.kind === ENEMY_SALTADOR) g.strokeRoundedRect(x, y, size, size, 6);
  else {
    g.strokeRect(x, y + 3, size, size - 3);
    // Antenas da traça.
    g.lineBetween(x + 5, y + 3, x + 2, y - 3);
    g.lineBetween(x + size - 5, y + 3, x + size - 2, y - 3);
  }
  const eyeX = e.facing > 0 ? x + size - 5 : x + 5;
  g.fillStyle(0xffffff).fillCircle(eyeX, y + 8, 3);
  g.fillStyle(INK).fillCircle(eyeX, y + 8, 1.5);
}

export function drawDrop(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  const size = RULES.dropSize * TILE;
  g.fillStyle(INK_BLUE).fillCircle(x + size / 2, y + size / 2, size / 2 + 1);
  g.lineStyle(1.5, color).strokeCircle(x + size / 2, y + size / 2, size / 2 + 1);
}
