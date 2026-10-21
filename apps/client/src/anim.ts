import {
  ENEMY_BORRAO,
  ENEMY_SALTADOR,
  MODE_BALL,
  MODE_ROLL,
  MODE_WALK,
  RULES,
  SKILL_ACT,
  SKILL_REST,
  SKILL_WARN,
  TILE,
  floorSpan,
  type Arena,
} from '@riscote/shared';
import { runPose, type Pose } from './art/riscote';
import { tracaKey } from './art/textures';
import { INK_BLUE, INK } from './draw';
import type { Effects } from './fx';

// Animação só do cliente: escolhe quadros e compressão a partir do movimento já simulado.
// Nada aqui muda posição, caixa de colisão ou regra; tudo é derivado do que chega da simulação.

/** Passada da corrida: avança um quadro a cada tantos pixels percorridos. */
const STRIDE = 10;
/** Deslocamento maior que isto num quadro é renascimento ou teletransporte, não passo. */
const JUMP_CUT = 40;

export interface Motion {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

export interface Frame {
  pose: Pose;
  sx: number;
  sy: number;
}

interface RiscoteState {
  x: number;
  dist: number;
  ground: boolean;
  down: boolean;
  fallVy: number;
  landAt: number;
  landPower: number;
  jumpAt: number;
  nextBlink: number;
  blinkEnd: number;
  blinks: number;
}

const ease = (t: number) => (t >= 1 ? 0 : (1 - t) * (1 - t));

/** Quadro, compressão e esticamento de cada riscote; dispara poeira, respingos e o chacoalhar. */
export class RiscoteAnimator {
  private states = new Map<number, RiscoteState>();

  constructor(private readonly fx: Effects) {}

  frame(slot: number, m: Motion, w: number, h: number, down: boolean, shooting: boolean, color: number, now: number): Frame {
    let s = this.states.get(slot);
    if (!s) {
      s = { x: m.x, dist: 0, ground: m.onGround, down, fallVy: 0, landAt: -Infinity, landPower: 0, jumpAt: -Infinity, nextBlink: now + 1500 + slot * 400, blinkEnd: 0, blinks: slot };
      this.states.set(slot, s);
    }
    const step = Math.abs(m.x - s.x);
    if (step < JUMP_CUT) s.dist += step;
    s.x = m.x;
    const feetX = m.x + w / 2;
    const feetY = m.y + h;

    if (down && !s.down) {
      this.fx.splat(feetX, feetY - 4, false, 1.4, INK);
      this.fx.droplets(feetX, feetY - 8, color, 10, 160);
      this.fx.shake(180, 0.004);
    } else if (!down && s.down) this.fx.sparkle(feetX, m.y + h / 2, color, 10, 12);
    s.down = down;

    if (!down) {
      if (!m.onGround) s.fallVy = Math.max(s.fallVy, m.vy);
      if (m.onGround && !s.ground) {
        s.landAt = now;
        s.landPower = Math.min(1, Math.max(0.35, s.fallVy / 450));
        this.fx.dust(feetX, feetY, s.landPower);
        s.fallVy = 0;
      } else if (!m.onGround && s.ground && m.vy < 0) {
        s.jumpAt = now;
        this.fx.dust(feetX, feetY, 0.2);
      }
    }
    s.ground = m.onGround;

    let sx = 1;
    let sy = 1;
    const land = ease((now - s.landAt) / 170) * s.landPower;
    const jump = ease((now - s.jumpAt) / 210);
    if (down) {
      sx = 1 + 0.04 * Math.sin(now / 160);
    } else if (land > 0) {
      sx = 1 + 0.3 * land;
      sy = 1 - 0.26 * land;
    } else if (jump > 0) {
      sx = 1 - 0.16 * jump;
      sy = 1 + 0.2 * jump;
    } else if (!m.onGround) {
      const k = Math.min(0.08, Math.abs(m.vy) / 4500);
      sx = 1 - k * 0.6;
      sy = 1 + k;
    }

    let pose: Pose;
    if (down) pose = 'derrubado';
    else if (!m.onGround) pose = m.vy < 0 ? 'pulando' : 'caindo';
    else if (shooting) pose = 'atirando';
    else if (Math.abs(m.vx) > 20) pose = runPose(Math.floor(s.dist / STRIDE));
    else {
      // Parado: respira e pisca de vez em quando.
      const breath = Math.sin(now / 520 + slot * 1.7);
      sy *= 1 + 0.022 * breath;
      sx *= 1 - 0.01 * breath;
      if (now >= s.nextBlink) {
        s.blinks++;
        s.blinkEnd = now + 130;
        s.nextBlink = now + 2200 + ((s.blinks * 977) % 2600);
      }
      pose = now < s.blinkEnd ? 'piscando' : 'parado';
    }
    return { pose, sx, sy };
  }
}

export interface EnemyLike {
  id: string;
  kind: number;
  mode: number;
  x: number;
  y: number;
  facing: number;
  soak: number;
  skill: number;
}

export interface EnemyFrame {
  key: string;
  sx: number;
  sy: number;
  angle: number;
}

interface EnemyState {
  x: number;
  y: number;
  vy: number;
  dist: number;
  mode: number;
  soak: number;
  air: boolean;
  landAt: number;
  seen: number;
  lastTrail: number;
  skill: number;
  skillAt: number;
}

/**
 * Quadros e reações dos inimigos: passos da traça, salto do saltador, bola tremendo e rolando, estouros,
 * e o aviso de cada habilidade (traça de antenas em pé, saltador agachado, borrão se contraindo).
 */
export class EnemyAnimator {
  private states = new Map<string, EnemyState>();
  private primed = false;
  private lastDrip = 0;

  constructor(
    private readonly fx: Effects,
    private readonly size: number,
    private readonly borraoSize: number,
    private readonly arena: Arena,
  ) {}

  /** Entrada numa fase de habilidade: respingos, poeira e a onda da pancada. */
  private skillChanged(e: EnemyLike, prev: number, cx: number): void {
    const feet = e.y + this.size;
    if (e.kind === ENEMY_SALTADOR) {
      if (e.skill === SKILL_WARN) this.fx.dust(cx, feet, 0.4);
      else if (e.skill === SKILL_REST && prev === SKILL_ACT) {
        // Pousou da pancada: a onda corre pelo mesmo trecho de chão que a simulação usa.
        const floor = Math.round(feet / TILE) * TILE;
        const [left, right] = floorSpan(this.arena, cx, floor, RULES.slamRadius);
        this.fx.wave(cx, floor, left, right, RULES.slamRadius * TILE, RULES.slamWaveTime);
        this.fx.splat(cx, floor - 2, false, 1, INK);
        this.fx.dust(cx, floor, 1);
        this.fx.shake(220, 0.007);
      }
    } else if (e.kind !== ENEMY_BORRAO) {
      if (e.skill === SKILL_WARN) this.fx.sparkle(cx + e.facing * this.size * 0.4, e.y - 2, 0xc8402a, 6, 7);
      else if (e.skill === SKILL_ACT) {
        this.fx.dust(cx, feet, 0.6);
        this.fx.streaks(cx, e.y + this.size / 2, e.facing, 6);
      }
    }
  }

  /** Chamado uma vez por quadro com todos os inimigos visíveis; `live` = partida em andamento. */
  frames(enemies: EnemyLike[], now: number, dt: number, live: boolean): Map<string, EnemyFrame> {
    const out = new Map<string, EnemyFrame>();
    const half = this.size / 2;
    for (const e of enemies) {
      let s = this.states.get(e.id);
      const cx = e.x + (e.kind === ENEMY_BORRAO ? this.borraoSize : this.size) / 2;
      const cy = e.y + (e.kind === ENEMY_BORRAO ? this.borraoSize : this.size) / 2;
      if (!s) {
        s = { x: e.x, y: e.y, vy: 0, dist: 0, mode: e.mode, soak: e.soak, air: false, landAt: -Infinity, seen: now, lastTrail: 0, skill: e.skill, skillAt: now };
        this.states.set(e.id, s);
        if (this.primed && live) {
          // Chegou um inimigo novo: cai na página com um respingo.
          this.fx.splat(cx, cy, false, e.kind === ENEMY_BORRAO ? 1.6 : 0.8, INK);
          if (e.kind === ENEMY_BORRAO) this.fx.shake(260, 0.005);
        }
      }
      const dx = e.x - s.x;
      if (Math.abs(dx) < 40) s.dist += Math.abs(dx);
      if (dt > 0) s.vy = s.vy * 0.6 + ((e.y - s.y) / dt) * 0.4;
      s.x = e.x;
      s.y = e.y;
      s.seen = now;

      // Mudanças de estado vistas pelo cliente.
      if (e.mode !== s.mode) {
        if (e.mode === MODE_BALL && s.mode === MODE_WALK) {
          this.fx.splat(cx, cy, true, 1.2, INK_BLUE);
          this.fx.shake(90, 0.003);
        } else if (e.mode === MODE_ROLL) {
          this.fx.streaks(cx, cy, e.facing, 8);
          this.fx.droplets(cx, cy, INK_BLUE, 10, 180, e.facing > 0 ? 0 : Math.PI, 1.4, true);
          this.fx.shake(150, 0.005);
        } else if (e.mode === MODE_WALK) {
          // Escapou da bola: sacode a tinta para os lados.
          this.fx.droplets(cx, cy, INK_BLUE, 14, 170, -Math.PI / 2, Math.PI * 1.4);
        }
      } else if (e.mode === MODE_WALK && e.soak > s.soak) this.fx.splat(cx, cy, true, 0.55, INK_BLUE);
      s.mode = e.mode;
      s.soak = e.soak;
      if (e.skill !== s.skill) {
        if (live && e.mode === MODE_WALK) this.skillChanged(e, s.skill, cx);
        s.skill = e.skill;
        s.skillAt = now;
      }
      /** 0 → 1 ao longo do aviso. */
      const warn = Math.min(1, (now - s.skillAt) / (1000 * (e.kind === ENEMY_SALTADOR ? RULES.slamWarn : RULES.dashWarn)));

      let key: string;
      let sx = 1;
      let sy = 1;
      let angle = 0;
      if (e.kind === ENEMY_BORRAO) {
        key = 'borrao';
        const w = Math.sin(now / 170);
        sx = 1 + 0.07 * w;
        sy = 1 - 0.07 * Math.sin(now / 170 + 0.6);
        if (e.skill === SKILL_WARN) {
          // Vai soltar uma mancha: se contrai, treme e pinga mais.
          const k = Math.min(1, (now - s.skillAt) / (1000 * RULES.stainWarnLead));
          sx = 1 - 0.18 * k + 0.05 * Math.sin(now / 30);
          sy = 1 - 0.12 * k + 0.05 * Math.sin(now / 30 + 1.4);
          if (now - this.lastDrip > 70) {
            this.lastDrip = now;
            this.fx.droplets(cx, e.y + this.borraoSize * 0.8, INK, 2, 60, Math.PI / 2, 1.2);
          }
        } else if (now - this.lastDrip > 260) {
          this.lastDrip = now;
          this.fx.droplets(cx + (Math.sin(now) * this.borraoSize) / 3, e.y + this.borraoSize * 0.85, INK, 1, 20, Math.PI / 2, 0.4);
        }
      } else if (e.mode === MODE_BALL) {
        key = 'bola';
        sx = 1 + 0.06 * Math.sin(now / 55);
        sy = 1 - 0.06 * Math.sin(now / 55);
      } else if (e.mode === MODE_ROLL) {
        key = 'bola';
        angle = ((e.x / half) * 180) / Math.PI;
        if (now - s.lastTrail > 45) {
          s.lastTrail = now;
          this.fx.droplets(cx, e.y + this.size - 2, INK_BLUE, 2, 50, -Math.PI / 2, 1.2);
        }
      } else if (e.kind === ENEMY_SALTADOR) {
        const air = Math.abs(s.vy) > 25;
        if (!air && s.air) {
          s.landAt = now;
          this.fx.dust(cx, e.y + this.size, 0.5);
        }
        s.air = air;
        key = air ? 'saltador-ar' : 'saltador';
        const land = ease((now - s.landAt) / 180);
        if (e.skill === SKILL_WARN) {
          // Aviso da pancada: agacha fundo, cerra os dentes e treme cada vez mais.
          key = 'saltador-carga';
          sx = 1 + 0.3 * warn;
          sy = 1 - 0.32 * warn;
          angle = 5 * warn * Math.sin(now / 24);
        } else if (land > 0) {
          sx = 1 + 0.25 * land;
          sy = 1 - 0.22 * land;
        } else if (air) {
          const k = Math.min(0.14, Math.abs(s.vy) / 2500);
          sx = 1 - k * 0.7;
          sy = 1 + k;
        } else {
          // Preparo do próximo salto: encolhe e solta.
          const p = 0.5 + 0.5 * Math.sin(now / 140);
          sx = 1 + 0.06 * p;
          sy = 1 - 0.07 * p;
        }
      } else if (e.skill === SKILL_WARN) {
        // Aviso do bote: antenas em pé, encolhe e treme.
        key = 'traca-bote';
        sx = 1 + 0.08 * warn;
        sy = 1 - 0.1 * warn;
        angle = 4 * Math.sin(now / 22);
      } else if (e.skill === SKILL_ACT) {
        key = tracaKey(Math.floor(s.dist / 5));
        sx = 1.14;
        sy = 0.9;
        if (now - s.lastTrail > 50) {
          s.lastTrail = now;
          this.fx.streaks(cx - e.facing * half, cy, e.facing, 2);
        }
      } else if (e.skill === SKILL_REST) {
        // Cansada: arfa.
        key = tracaKey(0);
        sy = 1 - 0.06 * (0.5 + 0.5 * Math.sin(now / 70));
        sx = 1 + 0.03 * (0.5 + 0.5 * Math.sin(now / 70));
      } else {
        key = tracaKey(Math.floor(s.dist / 5));
      }
      out.set(e.id, { key, sx, sy, angle });
    }

    // Quem sumiu: bola que estourou, inimigo derrubado pela bola.
    for (const [id, s] of this.states) {
      if (s.seen === now) continue;
      this.states.delete(id);
      if (!live) continue;
      const cx = s.x + half;
      const cy = s.y + half;
      if (s.mode === MODE_ROLL) {
        this.fx.splat(cx, cy, true, 1.8, INK_BLUE);
        this.fx.splat(cx, cy, false, 1, INK);
        this.fx.shake(200, 0.006);
      } else {
        this.fx.splat(cx, cy, false, 1.3, INK);
        this.fx.sparkle(cx, cy, 0xe8b400, 8, 10);
        this.fx.shake(120, 0.004);
      }
    }
    this.primed = true;
    return out;
  }
}

/** Gotas: direção de voo para o desenho, rastro e o respingo quando somem. */
export class DropWatcher {
  private states = new Map<string, { x: number; y: number; dir: number; seen: number; trail: number }>();

  constructor(
    private readonly fx: Effects,
    private readonly size: number,
  ) {}

  dirs(drops: Array<{ id: string; x: number; y: number }>, now: number): Map<string, number> {
    const out = new Map<string, number>();
    const half = this.size / 2;
    for (const d of drops) {
      let s = this.states.get(d.id);
      if (!s) {
        s = { x: d.x, y: d.y, dir: 0, seen: now, trail: now };
        this.states.set(d.id, s);
      }
      if (d.x !== s.x) s.dir = d.x > s.x ? 1 : -1;
      s.x = d.x;
      s.y = d.y;
      s.seen = now;
      if (now - s.trail > 40) {
        s.trail = now;
        this.fx.droplets(d.x + half - s.dir * half, d.y + half, INK_BLUE, 1, 15, Math.PI / 2, 0.6);
      }
      out.set(d.id, s.dir || 1);
    }
    for (const [id, s] of this.states) {
      if (s.seen === now) continue;
      this.states.delete(id);
      this.fx.splat(s.x + half, s.y + half, true, 0.45, INK_BLUE);
    }
    return out;
  }
}
