import { cellAt, ONE_WAY, SOLID, tubeRect, type Arena, type CellPos } from './arena.ts';
import { BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT } from './input.ts';
import { TICK_DT, TILE, type MovementParams } from './params.ts';

const EPS = 0.001;

/** Estado de um jogador. Posição é o canto superior esquerdo da caixa, em pixels; y cresce para baixo. */
export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** Apoiado só em plataforma atravessável: pode descer com baixo + pulo. */
  onOneWay: boolean;
  coyote: number;
  jumpBuffer: number;
  /** Pulo em andamento com o botão ainda segurado (permite o pulo curto ao soltar). */
  jumpHeld: boolean;
  facing: 1 | -1;
  prevButtons: number;
}

export function createPlayer(spawn: CellPos, p: MovementParams): PlayerState {
  const w = p.playerWidth * TILE;
  const h = p.playerHeight * TILE;
  return {
    x: spawn.col * TILE + (TILE - w) / 2,
    y: (spawn.row + 1) * TILE - h,
    vx: 0,
    vy: 0,
    onGround: false,
    onOneWay: false,
    coyote: 0,
    jumpBuffer: 0,
    jumpHeld: false,
    facing: 1,
    prevButtons: 0,
  };
}

export function jumpPhysics(p: MovementParams): { gravity: number; jumpVelocity: number } {
  const h = p.jumpHeight * TILE;
  return { gravity: (2 * h) / (p.timeToApex * p.timeToApex), jumpVelocity: (2 * h) / p.timeToApex };
}

function approach(value: number, target: number, delta: number): number {
  if (value < target) return Math.min(value + delta, target);
  return Math.max(value - delta, target);
}

/** Avança um tick fixo. Função pura sobre o estado (muta `s`): mesma entrada, mesmo resultado. */
export function stepPlayer(
  s: PlayerState,
  buttons: number,
  arena: Arena,
  p: MovementParams,
  dt: number = TICK_DT,
): void {
  const w = p.playerWidth * TILE;
  const h = p.playerHeight * TILE;
  const pressed = buttons & ~s.prevButtons;
  const dir = (buttons & BTN_RIGHT ? 1 : 0) - (buttons & BTN_LEFT ? 1 : 0);
  if (dir !== 0) s.facing = dir > 0 ? 1 : -1;

  const target = dir * p.runSpeed * TILE;
  const accel = (s.onGround ? (dir !== 0 ? p.groundAccel : p.groundDecel) : p.airAccel) * TILE;
  s.vx = approach(s.vx, target, accel * dt);

  s.coyote = s.onGround ? p.coyoteTime : Math.max(0, s.coyote - dt);
  s.jumpBuffer = pressed & BTN_JUMP ? p.jumpBuffer : Math.max(0, s.jumpBuffer - dt);

  const { gravity, jumpVelocity } = jumpPhysics(p);
  if (s.jumpBuffer > 0 && buttons & BTN_DOWN && s.onGround && s.onOneWay) {
    // Desce pela plataforma: 2 px abaixo da superfície, a checagem de pouso já não a considera.
    s.y += 2;
    s.jumpBuffer = 0;
    s.coyote = 0;
    s.onGround = false;
  } else if (s.jumpBuffer > 0 && s.coyote > 0) {
    s.vy = -jumpVelocity;
    s.jumpBuffer = 0;
    s.coyote = 0;
    s.onGround = false;
    s.jumpHeld = true;
  }

  if (s.jumpHeld && !(buttons & BTN_JUMP)) {
    if (s.vy < 0) s.vy *= p.jumpCutMult;
    s.jumpHeld = false;
  }
  if (s.vy >= 0) s.jumpHeld = false;

  moveX(s, s.vx * dt, arena, w, h);

  // Integração exata para gravidade constante: o ápice bate com jumpHeight.
  const g = gravity * (s.vy > 0 ? p.fallGravityMult : 1);
  // Limite de queda abaixo de uma célula por tick: a colisão nunca atravessa uma plataforma.
  const maxFall = Math.min(p.maxFallSpeed * TILE, (0.9 * TILE) / dt);
  const dy = Math.min(s.vy * dt + 0.5 * g * dt * dt, maxFall * dt);
  s.vy = Math.min(s.vy + g * dt, maxFall);
  moveY(s, dy, arena, w, h);

  s.prevButtons = buttons;
}

function moveX(s: PlayerState, dx: number, arena: Arena, w: number, h: number): void {
  if (dx === 0) return;
  s.x += dx;
  const r0 = Math.floor(s.y / TILE);
  const r1 = Math.floor((s.y + h - EPS) / TILE);
  if (dx > 0) {
    const c = Math.floor((s.x + w - EPS) / TILE);
    for (let r = r0; r <= r1; r++) {
      if (cellAt(arena, c, r) === SOLID) {
        s.x = c * TILE - w;
        s.vx = 0;
        return;
      }
    }
  } else {
    const c = Math.floor(s.x / TILE);
    for (let r = r0; r <= r1; r++) {
      if (cellAt(arena, c, r) === SOLID) {
        s.x = (c + 1) * TILE;
        s.vx = 0;
        return;
      }
    }
  }
}

function moveY(s: PlayerState, dy: number, arena: Arena, w: number, h: number): void {
  const prevBottom = s.y + h;
  s.y += dy;
  s.onGround = false;
  s.onOneWay = false;
  const c0 = Math.floor(s.x / TILE);
  const c1 = Math.floor((s.x + w - EPS) / TILE);

  if (dy < 0) {
    const r = Math.floor(s.y / TILE);
    for (let c = c0; c <= c1; c++) {
      if (cellAt(arena, c, r) === SOLID) {
        s.y = (r + 1) * TILE;
        s.vy = 0;
        s.jumpHeld = false;
        return;
      }
    }
    return;
  }

  // Descendo (ou parado): a linha em que os pés entram.
  const r = Math.floor((s.y + h) / TILE);
  const surface = r * TILE;
  let solidBelow = false;
  let oneWayBelow = false;
  for (let c = c0; c <= c1; c++) {
    const kind = cellAt(arena, c, r);
    if (kind === SOLID) solidBelow = true;
    // Plataforma atravessável só segura quem vinha de cima da superfície.
    else if (kind === ONE_WAY && prevBottom <= surface + EPS) oneWayBelow = true;
  }
  if (solidBelow || oneWayBelow) {
    s.y = surface - h;
    s.vy = 0;
    s.onGround = true;
    s.onOneWay = !solidBelow;
  }
}

export function touchesTube(s: PlayerState, arena: Arena, p: MovementParams): boolean {
  const w = p.playerWidth * TILE;
  const h = p.playerHeight * TILE;
  return arena.tubes.some((tube) => {
    const t = tubeRect(tube);
    return s.x < t.x + t.w && s.x + w > t.x && s.y < t.y + t.h && s.y + h > t.y;
  });
}
