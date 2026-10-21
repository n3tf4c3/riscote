import type * as Phaser from 'phaser';
import {
  BORRAO_SIZE,
  ENEMY_BORRACHA,
  ENEMY_BORRAO,
  ENEMY_FIANDEIRA,
  ENEMY_GRAMPO,
  ENEMY_SALTADOR,
  ENEMY_SIZE,
  ENEMY_TINTEIRO,
  ENEMY_TRACA,
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
const TRACA = 0xe8247c;
const SALTADOR = 0x6a2fc4;
const BORRACHA_FRENTE = 0xff4f8b;
/** Corpo de cada inimigo no greybox (o borrão tem desenho próprio). */
const ENEMY_COLORS: Record<number, number> = {
  [ENEMY_TRACA]: TRACA,
  [ENEMY_SALTADOR]: SALTADOR,
  [ENEMY_GRAMPO]: 0x2fb64a,
  [ENEMY_FIANDEIRA]: 0xc8282e,
  [ENEMY_TINTEIRO]: 0xe08a2a,
  [ENEMY_BORRACHA]: 0x8fd04a,
};
const ENEMY_MARK = 0xc8402a;
const STAR_GOLD = 0xe8b400;
/** Cor do líquido de cada item, na ordem ITEM_FORCA..ITEM_INVENCIVEL. */
const ITEM_COLORS = [0xc8402a, 0xd99a1e, 0x2f6fd6, 0x1f9e89, STAR_GOLD];

/** Cores dos 5 jogadores (plano, seção 3): vermelhão, azul, ocre, verde-azulado, púrpura. */
export const PLAYER_COLORS = [0xe0502e, 0x3f8fd8, 0xd99a1e, 0x1f9e89, 0x9b4f96] as const;

/** `showTubes`: os tubos de tinta só aparecem no modo difícil (nos outros a tinta é infinita). */
export function drawArena(scene: Phaser.Scene, a: Arena, showTubes = true): Phaser.GameObjects.Graphics {
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

  for (const tube of showTubes ? a.tubes : []) {
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
  return g;
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
  /** Conexão caiu: desenhado esmaecido até voltar. */
  away?: boolean;
  /** Medidor de tinta ao lado do boneco: só quando a tinta acaba (modo difícil). */
  inkGauge?: boolean;
  /** Toques que ainda aguenta; acima de 1 (modo fácil), desenha a proteção. */
  hp?: number;
  /** Segundos de invencibilidade (item): aura dourada pulsando. */
  star?: number;
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
  } else drawPlayer(g, x, y, p, look.facing, color, isLocal, playerAlpha(look, now));
  drawPlayerOverlay(g, x, y, p, look, color, false, now);
}

/** Opacidade do boneco: esmaecido sem conexão, piscando enquanto invulnerável. */
export function playerAlpha(look: PlayerLook, now: number): number {
  if (look.away) return 0.25;
  return look.invuln > 0 && Math.floor(now / 100) % 2 === 0 ? 0.35 : 1;
}

/**
 * O que vai por cima do boneco (greybox ou arte): anel de resgate, aura, proteção, medidor e o marcador
 * do próprio. Com a arte carregada, as auras são desenhos de pincel atrás do boneco (`auras` = false).
 */
export function drawPlayerOverlay(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  p: MovementParams,
  look: PlayerLook,
  color: number,
  marker: boolean,
  now: number,
  auras = true,
): void {
  const w = p.playerWidth * TILE;
  const h = p.playerHeight * TILE;
  if (look.down) {
    if (look.rescue > 0) {
      const k = Math.min(1, look.rescue / RULES.rescueTime);
      g.lineStyle(3, INK).beginPath();
      g.arc(x + w / 2, y + h - 19, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      g.strokePath();
    }
    return;
  }
  if (look.away) return;
  if (marker) {
    // Marcador acima da cabeça (a arte é mais alta que a caixa de colisão).
    g.fillStyle(INK).fillTriangle(x + w / 2 - 4, y - 14, x + w / 2 + 4, y - 14, x + w / 2, y - 9);
  }
  if (auras && (look.star ?? 0) > 0) {
    const pulse = 0.55 + 0.45 * Math.sin(now / 90);
    g.lineStyle(3, STAR_GOLD, pulse).strokeRoundedRect(x - 6, y - 6, w + 12, h + 12, 7);
  }
  if (auras && (look.hp ?? 1) > 1) {
    // Proteção do modo fácil: contorno extra que some no primeiro toque.
    g.lineStyle(2, color, 0.9).strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, 5);
  }

  // Medidor de tinta: frasquinho ao lado do boneco (plano, seção 2.7).
  if (look.inkGauge === false) return;
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
  if (e.kind === ENEMY_BORRAO) return drawBorrao(g, x, y, e.facing);
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
  const body = ENEMY_COLORS[e.kind] ?? TRACA;
  const round = e.kind === ENEMY_SALTADOR || e.kind === ENEMY_FIANDEIRA || e.kind === ENEMY_TINTEIRO;
  if (round) g.fillStyle(body).fillRoundedRect(x, y, size, size, 6);
  else g.fillStyle(body).fillRect(x, y + 3, size, size - 3);
  // Borracha: a frente (o lado que apaga) em rosa.
  if (e.kind === ENEMY_BORRACHA) g.fillStyle(BORRACHA_FRENTE).fillRect(e.facing > 0 ? x + size / 2 : x, y + 3, size / 2, size - 3);
  const soaked = Math.min(1, e.soak / Math.max(1, soakToBall));
  if (soaked > 0) g.fillStyle(INK_BLUE, 0.75).fillRect(x, y + size * (1 - soaked), size, size * soaked);
  g.lineStyle(2, INK);
  if (round) g.strokeRoundedRect(x, y, size, size, 6);
  else if (e.kind !== ENEMY_TRACA) g.strokeRect(x, y + 3, size, size - 3);
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

/** Borrão: mancha de nanquim com escorridos e olhos vermelhos — perigo que não se derrota. */
function drawBorrao(g: Phaser.GameObjects.Graphics, x: number, y: number, facing: number): void {
  const size = BORRAO_SIZE * TILE;
  const cx = x + size / 2;
  const cy = y + size / 2;
  g.fillStyle(INK, 0.92).fillCircle(cx, cy, size / 2);
  g.fillCircle(cx - size * 0.3, cy + size * 0.25, size * 0.22);
  g.fillCircle(cx + size * 0.32, cy - size * 0.2, size * 0.18);
  g.fillRect(cx - size * 0.15, cy + size * 0.3, 3, size * 0.35);
  g.fillRect(cx + size * 0.12, cy + size * 0.35, 3, size * 0.25);
  const eye = facing > 0 ? 4 : -4;
  g.fillStyle(0xd7261e).fillCircle(cx - 5 + eye, cy - 3, 3).fillCircle(cx + 5 + eye, cy - 3, 3);
}

/** Mistura linear de duas cores 0xrrggbb. */
function mix(c0: number, c1: number, t: number): number {
  const ch = (shift: number) => Math.round(((c0 >> shift) & 255) * (1 - t) + ((c1 >> shift) & 255) * t) << shift;
  return ch(16) | ch(8) | ch(0);
}

/**
 * Virada de página: o papel novo avança da direita para a esquerda; a folha que vira mostra o verso
 * curvado (mais largo embaixo) e projeta sombra na página velha.
 */
export function drawPageTurn(g: Phaser.GameObjects.Graphics, width: number, height: number, progress: number): void {
  const p = Math.max(0, Math.min(1, progress));
  const w = width * p;
  if (w <= 0) return;
  const edge = width - w;
  g.fillStyle(PAPER).fillRect(edge, 0, w, height);
  g.lineStyle(1, GRID);
  for (let y = TILE; y < height; y += TILE) g.lineBetween(edge, y, width, y);
  // Verso da folha: faixa curvada, mais larga embaixo, clareando para a dobra.
  const curl = p < 1 ? 14 + 26 * (1 - p) : 0;
  const slices = 6;
  for (let i = 0; i < slices; i++) {
    const a = i / slices;
    const b = (i + 1) / slices;
    g.fillStyle(mix(0xd9ccb0, 0xfbf7ee, a))
      .beginPath()
      .moveTo(edge - curl * 0.55 * a, 0)
      .lineTo(edge - curl * 0.55 * b, 0)
      .lineTo(edge - curl * b, height)
      .lineTo(edge - curl * a, height)
      .closePath()
      .fillPath();
  }
  // Sombra na página que fica.
  for (let i = 0; i < 6; i++) g.fillStyle(INK, 0.1 * (1 - i / 6)).fillRect(edge - curl - (i + 1) * 3, 0, 3, height);
  g.lineStyle(2, INK, 0.8).lineBetween(edge - curl * 0.55, 0, edge - curl, height);
  g.lineStyle(3, INK).lineBetween(edge, 0, edge, height);
}
/** Item: potinho de tinta com o líquido na cor do poder e um símbolo; pisca nos últimos 3 s. */
export function drawItem(g: Phaser.GameObjects.Graphics, x: number, y: number, kind: number, ttl: number, now: number): void {
  if (ttl < 3 && Math.floor(now / 150) % 2 === 0) return;
  const s = RULES.itemSize * TILE;
  const cx = x + s / 2;
  const bob = Math.sin(now / 220) * 1.5;
  const top = y - 2 + bob;
  g.fillStyle(ITEM_COLORS[kind] ?? INK).fillRoundedRect(x, top + 5, s, s - 3, 4);
  g.lineStyle(2, INK).strokeRoundedRect(x, top + 5, s, s - 3, 4);
  g.fillStyle(INK).fillRect(cx - 4, top, 8, 6);
  const gy = top + 5 + (s - 3) / 2;
  g.lineStyle(2, 0xf6f1e6).fillStyle(0xf6f1e6);
  if (kind === 0) {
    // Força: cruz grossa.
    g.fillRect(cx - 4, gy - 1.5, 8, 3).fillRect(cx - 1.5, gy - 4, 3, 8);
  } else if (kind === 1) {
    // Agilidade: riscos de velocidade.
    g.lineBetween(cx - 4, gy - 3, cx + 3, gy - 3).lineBetween(cx - 2, gy, cx + 4, gy).lineBetween(cx - 4, gy + 3, cx + 3, gy + 3);
  } else if (kind === 2) {
    // Tiro ágil: duas gotas.
    g.fillCircle(cx - 2.5, gy, 2).fillCircle(cx + 2.5, gy, 2);
  } else if (kind === 3) {
    // Alcance: seta.
    g.lineBetween(cx - 4, gy, cx + 4, gy).lineBetween(cx + 4, gy, cx + 1, gy - 3).lineBetween(cx + 4, gy, cx + 1, gy + 3);
  } else {
    // Invencível: estrela.
    g.fillStyle(INK).fillTriangle(cx, gy - 5, cx - 4.5, gy + 3.5, cx + 4.5, gy + 3.5).fillTriangle(cx, gy + 5, cx - 4.5, gy - 2.5, cx + 4.5, gy - 2.5);
  }
}