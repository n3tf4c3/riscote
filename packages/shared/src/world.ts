import { EMPTY, cellAt, type Arena, type CellPos } from './arena.ts';
import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT } from './input.ts';
import { DEFAULT_PARAMS, TICK_DT, TILE, type MovementParams } from './params.ts';
import { createPlayer, stepPlayer, touchesTube, type PlayerState } from './physics.ts';

/** Regras da etapa 3 (plano, seções 2.3 a 2.7). Valores iniciais, a ajustar em playtest. */
export const RULES = {
  tankSize: 12,
  refillPerSecond: 12,
  shotCooldown: 0.18,
  dropSpeed: 16, // células/s
  dropLife: 0.35, // s
  dropSize: 0.4, // células
  soakToBall: 4,
  soakToBallBigTeam: 5, // com 4 ou 5 jogadores
  soakDecay: 1.5, // s para perder um nível de encharcado
  ballTime: 5, // s até a bola se desfazer sozinha
  rollSpeed: 12, // células/s
  rollMaxBounces: 3,
  rollMaxTime: 4,
  burstRadius: 2.5, // células: o respingo da bola estourando encharca quem está perto (diferencial)
  burstSoak: 2,
  maxEnemiesOnScreen: 8,
  spawnDelay: 1,
  clearDelay: 3,
  restartDelay: 2,
  rescueTime: 1,
  respawnTime: 5,
  invulnTime: 2,
  teamLives: 5,
  scorePerEnemy: 100,
  // Etapa 4: pressão de tempo, virada de página e fim de capítulo (plano, seção 2.4).
  hurryTime: 60, // s na arena até o borrão aparecer
  borraoSpeed: 2.5, // células/s, atravessa paredes e não pode ser derrotado
  turnDelay: 1.2, // s de virada de página
  chapterDelay: 6, // s de resumo no fim do capítulo
} as const;

export const ENEMY_TRACA = 0;
export const ENEMY_SALTADOR = 1;
/** A ameaça de tempo: persegue o jogador mais próximo, atravessa paredes e não é encharcada. */
export const ENEMY_BORRAO = 2;
export const MODE_WALK = 0;
export const MODE_BALL = 1;
export const MODE_ROLL = 2;
export const PHASE_PLAYING = 0;
export const PHASE_CLEAR = 1;
export const PHASE_RESTART = 2;
export const PHASE_TURN = 3;
export const PHASE_CHAPTER = 4;

export const ENEMY_SIZE = 0.9; // células, nos três modos
export const BORRAO_SIZE = 1.3; // células

/** Métricas de playtest por jogador numa arena (plano, seção 6). */
export interface PlayerArenaStats {
  slot: number;
  kills: number;
  shots: number;
  downSeconds: number;
  /** Parado no chão sem atirar (aproximação de "sem participar"). */
  idleSeconds: number;
  emptyTankSeconds: number;
}

export interface ArenaReport {
  arena: string;
  position: number;
  arenas: number;
  players: number;
  seconds: number;
  outcome: 'limpa' | 'recomeço';
  hurry: boolean;
  downs: number;
  rescues: number;
  livesUsed: number;
  /** Bolas que derrubaram 2 ou mais inimigos além de si mesmas. */
  combos: number;
  /** Distância média entre os jogadores de pé, em células. */
  spreadCells: number;
  perPlayer: PlayerArenaStats[];
}

interface RunningStats {
  downs: number;
  rescues: number;
  livesUsed: number;
  combos: number;
  spreadSum: number;
  spreadSamples: number;
  perPlayer: Map<string, PlayerArenaStats>;
}

const ENEMY_BASE: Record<number, MovementParams> = {
  [ENEMY_TRACA]: {
    ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
    runSpeed: 3.5, groundAccel: 60, groundDecel: 60, airAccel: 20, jumpHeight: 3.6, jumpCutMult: 1,
  },
  [ENEMY_SALTADOR]: {
    ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
    runSpeed: 5, airAccel: 40, jumpHeight: 3.8, jumpCutMult: 1,
  },
};

/** Encharcado anda mais devagar: um parâmetro por nível de tinta. */
const ENEMY_PARAMS: Record<number, MovementParams[]> = Object.fromEntries(
  Object.entries(ENEMY_BASE).map(([kind, base]) => [
    kind,
    Array.from({ length: RULES.soakToBallBigTeam + 1 }, (_, soak) => ({
      ...base,
      runSpeed: base.runSpeed * Math.max(0.4, 1 - 0.15 * soak),
    })),
  ]),
);

export const BALL_PARAMS: MovementParams = {
  ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
  runSpeed: RULES.rollSpeed, groundAccel: 2000, groundDecel: 30, airAccel: 2000, jumpCutMult: 1,
};

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function bodyBox(b: PlayerState, p: MovementParams, grow = 0): Box {
  return { x: b.x - grow, y: b.y - grow, w: p.playerWidth * TILE + 2 * grow, h: p.playerHeight * TILE + 2 * grow };
}

export function enemyBox(e: { kind: number; body: { x: number; y: number } }): Box {
  const size = (e.kind === ENEMY_BORRAO ? BORRAO_SIZE : ENEMY_SIZE) * TILE;
  return { x: e.body.x, y: e.body.y, w: size, h: size };
}

function emptyStats(): RunningStats {
  return { downs: 0, rescues: 0, livesUsed: 0, combos: 0, spreadSum: 0, spreadSamples: 0, perPlayer: new Map() };
}

/** Gerador determinístico (mulberry32): mesma semente, mesma partida. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WorldPlayer {
  id: string;
  slot: number;
  body: PlayerState;
  ink: number;
  cooldown: number;
  down: boolean;
  downTime: number;
  rescue: number;
  invuln: number;
  kills: number;
}

export interface Enemy {
  id: number;
  kind: number;
  mode: number;
  body: PlayerState;
  dir: 1 | -1;
  soak: number;
  soakTimer: number;
  ballTime: number;
  rollTime: number;
  bounces: number;
  combo: number;
  kicker: string | null;
  aiTimer: number;
  edgeDecided: boolean;
  wasBlocked: boolean;
}

export interface Drop {
  id: number;
  owner: string;
  slot: number;
  x: number;
  y: number;
  vx: number;
  life: number;
}

/**
 * Partida autoritativa de uma sala: jogadores, tinta, inimigos, bolas, vidas e ondas.
 * Puro e determinístico: o servidor chama applyInput por comando e step uma vez por tick.
 */
export class World {
  /** Capítulo: as arenas em sequência; limpar a última fecha o capítulo e volta à primeira. */
  readonly chapter: readonly Arena[];
  arenaIndex = 0;
  /** Segundos na arena atual (a pressão de tempo começa em RULES.hurryTime). */
  waveTime = 0;
  hurry = false;
  readonly params: MovementParams = { ...DEFAULT_PARAMS };
  readonly players = new Map<string, WorldPlayer>();
  readonly enemies = new Map<number, Enemy>();
  readonly drops = new Map<number, Drop>();
  lives: number = RULES.teamLives;
  score = 0;
  phase = PHASE_PLAYING;
  phaseTime = 0;
  wave = 0;
  soakToBall: number = RULES.soakToBall;
  private spawnQueue = 0;
  private spawnTimer = 0;
  private spawnCount = 0;
  private waveStarted = false;
  private nextId = 1;
  private readonly rng: () => number;
  private readonly autoWaves: boolean;
  private stats: RunningStats = emptyStats();
  private reports: ArenaReport[] = [];

  /** `waves: false` desliga ondas, pressão de tempo e progressão (cenários montados à mão nos testes). */
  constructor(chapter: Arena | readonly Arena[], seed: number, options: { waves?: boolean } = {}) {
    this.chapter = Array.isArray(chapter) ? chapter : [chapter as Arena];
    if (this.chapter.length === 0) throw new Error('capítulo sem arenas');
    this.rng = seededRandom(seed);
    this.autoWaves = options.waves ?? true;
  }

  get arena(): Arena {
    return this.chapter[this.arenaIndex]!;
  }

  /** Inimigos que faltam derrotar; o borrão não conta (não pode ser derrotado). */
  get enemiesLeft(): number {
    let count = this.spawnQueue;
    for (const e of this.enemies.values()) if (e.kind !== ENEMY_BORRAO) count++;
    return count;
  }

  /** Relatórios das arenas encerradas desde a última chamada. */
  takeReports(): ArenaReport[] {
    const out = this.reports;
    this.reports = [];
    return out;
  }

  private playerStats(p: WorldPlayer): PlayerArenaStats {
    let s = this.stats.perPlayer.get(p.id);
    if (!s) {
      s = { slot: p.slot, kills: 0, shots: 0, downSeconds: 0, idleSeconds: 0, emptyTankSeconds: 0 };
      this.stats.perPlayer.set(p.id, s);
    }
    return s;
  }

  addPlayer(id: string, slot: number): WorldPlayer {
    const player: WorldPlayer = {
      id, slot,
      body: createPlayer(this.arena.playerSpawns[slot]!, this.params),
      ink: RULES.tankSize, cooldown: 0,
      down: false, downTime: 0, rescue: 0,
      invuln: RULES.invulnTime, kills: 0,
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  /** Aplica um comando de um jogador: movimento, tiro de tinta ou chute. */
  applyInput(id: string, buttons: number): void {
    const p = this.players.get(id);
    if (!p) return;
    const pressed = buttons & ~p.body.prevButtons;
    if (p.down) {
      p.body.prevButtons = buttons;
      return;
    }
    stepPlayer(p.body, buttons, this.arena, this.params);
    if (pressed & BTN_ATTACK) this.attack(p);
  }

  /** Avança o mundo um tick (depois dos comandos do tick). */
  step(): void {
    const dt = TICK_DT;
    // A primeira onda é dimensionada com quem está na sala no primeiro tick.
    if (this.autoWaves && !this.waveStarted && this.players.size > 0) this.startWave();

    for (const p of this.players.values()) {
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      if (!p.down && touchesTube(p.body, this.arena, this.params)) {
        p.ink = Math.min(RULES.tankSize, p.ink + RULES.refillPerSecond * dt);
      }
    }

    if (this.phase === PHASE_PLAYING && this.waveStarted) {
      this.waveTime += dt;
      this.measure(dt);
      if (this.autoWaves && !this.hurry && this.waveTime >= RULES.hurryTime) this.spawnBorrao();
    }

    this.stepDrops(dt);
    this.stepEnemies(dt);
    this.stepDamage();
    this.stepRescue(dt);
    this.stepSpawns(dt);
    this.stepPhase(dt);
  }

  spawnEnemy(kind: number, cell: CellPos): Enemy {
    // O borrão não usa física: os parâmetros só posicionam o corpo inicial.
    const params = ENEMY_PARAMS[kind]?.[0] ?? BALL_PARAMS;
    const enemy: Enemy = {
      id: this.nextId++, kind, mode: MODE_WALK,
      body: createPlayer(cell, params),
      dir: this.rng() < 0.5 ? -1 : 1,
      soak: 0, soakTimer: 0, ballTime: 0, rollTime: 0, bounces: 0, combo: 0, kicker: null,
      aiTimer: 1 + this.rng() * 2, edgeDecided: false, wasBlocked: false,
    };
    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  /** O borrão surge no alto, no centro, e vem atrás de quem estiver mais perto. */
  spawnBorrao(): Enemy {
    const e = this.spawnEnemy(ENEMY_BORRAO, { col: Math.floor(this.arena.cols / 2), row: 1 });
    e.body.x = (this.arena.cols * TILE - BORRAO_SIZE * TILE) / 2;
    e.body.y = TILE;
    this.hurry = true;
    return e;
  }

  /** Amostra de métricas por tick (plano, seção 6). */
  private measure(dt: number): void {
    const standing: PlayerState[] = [];
    for (const p of this.players.values()) {
      const s = this.playerStats(p);
      if (p.down) {
        s.downSeconds += dt;
        continue;
      }
      standing.push(p.body);
      if (p.ink < 1) s.emptyTankSeconds += dt;
      if (p.body.vx === 0 && p.body.onGround && p.cooldown === 0) s.idleSeconds += dt;
    }
    if (standing.length < 2) return;
    let sum = 0;
    let pairs = 0;
    for (let i = 0; i < standing.length; i++) {
      for (let j = i + 1; j < standing.length; j++) {
        sum += Math.hypot(standing[i]!.x - standing[j]!.x, standing[i]!.y - standing[j]!.y);
        pairs++;
      }
    }
    this.stats.spreadSum += sum / pairs / TILE;
    this.stats.spreadSamples++;
  }

  private report(outcome: ArenaReport['outcome']): void {
    const round = (v: number) => Math.round(v * 100) / 100;
    this.reports.push({
      arena: this.arena.id,
      position: this.arenaIndex + 1,
      arenas: this.chapter.length,
      players: this.players.size,
      seconds: round(this.waveTime),
      outcome,
      hurry: this.hurry,
      downs: this.stats.downs,
      rescues: this.stats.rescues,
      livesUsed: this.stats.livesUsed,
      combos: this.stats.combos,
      spreadCells: round(this.stats.spreadSamples ? this.stats.spreadSum / this.stats.spreadSamples : 0),
      perPlayer: [...this.stats.perPlayer.values()].map((s) => ({
        ...s,
        downSeconds: round(s.downSeconds),
        idleSeconds: round(s.idleSeconds),
        emptyTankSeconds: round(s.emptyTankSeconds),
      })),
    });
  }

  private attack(p: WorldPlayer): void {
    const reach = bodyBox(p.body, this.params, 2);
    for (const e of this.enemies.values()) {
      if (e.mode === MODE_BALL && overlaps(reach, enemyBox(e))) {
        // Chutar não gasta tinta.
        e.mode = MODE_ROLL;
        e.dir = p.body.facing;
        e.kicker = p.id;
        e.rollTime = 0;
        e.bounces = 0;
        e.combo = 0;
        return;
      }
    }
    if (p.cooldown > 0 || p.ink < 1) return;
    p.ink -= 1;
    p.cooldown = RULES.shotCooldown;
    this.playerStats(p).shots++;
    const box = bodyBox(p.body, this.params);
    const size = RULES.dropSize * TILE;
    const id = this.nextId++;
    this.drops.set(id, {
      id, owner: p.id, slot: p.slot,
      x: p.body.facing > 0 ? box.x + box.w : box.x - size,
      y: box.y + box.h * 0.35,
      vx: p.body.facing * RULES.dropSpeed * TILE,
      life: RULES.dropLife,
    });
  }

  private stepDrops(dt: number): void {
    const size = RULES.dropSize * TILE;
    for (const d of this.drops.values()) {
      d.x += d.vx * dt;
      d.life -= dt;
      const col = Math.floor((d.x + size / 2) / TILE);
      const row = Math.floor((d.y + size / 2) / TILE);
      if (d.life <= 0 || cellAt(this.arena, col, row) === 1) {
        this.drops.delete(d.id);
        continue;
      }
      const box = { x: d.x, y: d.y, w: size, h: size };
      for (const e of this.enemies.values()) {
        // A tinta não pega no borrão nem na bola rolando.
        if (e.mode === MODE_ROLL || e.kind === ENEMY_BORRAO || !overlaps(box, enemyBox(e))) continue;
        this.drops.delete(d.id);
        this.soak(e, 1);
        break;
      }
    }
  }

  private soak(e: Enemy, amount: number): void {
    e.soak = Math.min(e.soak + amount, RULES.soakToBallBigTeam);
    e.soakTimer = RULES.soakDecay;
    if (e.mode === MODE_BALL) e.ballTime = RULES.ballTime;
    else if (e.mode === MODE_WALK && e.soak >= this.soakToBall) {
      e.mode = MODE_BALL;
      e.ballTime = RULES.ballTime;
    }
  }

  private stepEnemies(dt: number): void {
    for (const e of this.enemies.values()) {
      if (e.kind === ENEMY_BORRAO) {
        this.chase(e, dt);
      } else if (e.mode === MODE_WALK) {
        if (e.soak > 0 && (e.soakTimer -= dt) <= 0) {
          e.soak--;
          e.soakTimer = RULES.soakDecay;
        }
        const buttons = this.think(e, dt);
        stepPlayer(e.body, buttons, this.arena, ENEMY_PARAMS[e.kind]![e.soak]!);
        e.wasBlocked = e.body.vx === 0 && (buttons & (BTN_LEFT | BTN_RIGHT)) !== 0;
      } else if (e.mode === MODE_BALL) {
        stepPlayer(e.body, 0, this.arena, BALL_PARAMS);
        if ((e.ballTime -= dt) <= 0) {
          // Escapou: volta a andar, sem tinta.
          e.mode = MODE_WALK;
          e.soak = 0;
        }
      } else {
        stepPlayer(e.body, e.dir > 0 ? BTN_RIGHT : BTN_LEFT, this.arena, BALL_PARAMS);
        e.rollTime += dt;
        if (e.body.vx === 0) {
          e.dir = e.dir > 0 ? -1 : 1;
          e.bounces++;
        }
        const box = enemyBox(e);
        for (const other of this.enemies.values()) {
          if (other === e || other.mode === MODE_ROLL || other.kind === ENEMY_BORRAO) continue;
          if (overlaps(box, enemyBox(other))) {
            e.combo++;
            if (e.combo === 2) this.stats.combos++;
            this.defeat(other, e.kicker, e.combo);
          }
        }
        if (e.bounces >= RULES.rollMaxBounces || e.rollTime >= RULES.rollMaxTime) this.burst(e);
      }
    }
  }

  /** Borrão: segue em linha reta o jogador de pé mais próximo, atravessando paredes. */
  private chase(e: Enemy, dt: number): void {
    const target = this.nearestPlayer(e.body);
    if (!target) return;
    const box = enemyBox(e);
    const dx = target.body.x + (this.params.playerWidth * TILE) / 2 - (box.x + box.w / 2);
    const dy = target.body.y + (this.params.playerHeight * TILE) / 2 - (box.y + box.h / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const step = Math.min(dist, RULES.borraoSpeed * TILE * dt);
    e.body.x += (dx / dist) * step;
    e.body.y += (dy / dist) * step;
    e.dir = dx >= 0 ? 1 : -1;
  }

  /** IA simples: a traça patrulha e às vezes pula ou desce; o saltador pula na direção do jogador mais próximo. */
  private think(e: Enemy, dt: number): number {
    const b = e.body;
    const dirButton = e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
    if (e.kind === ENEMY_TRACA) {
      let buttons = 0;
      if (b.onGround) {
        if (e.wasBlocked) e.dir = e.dir > 0 ? -1 : 1;
        const edge = this.edgeAhead(e);
        if (edge && !e.edgeDecided && this.rng() < 0.5) e.dir = e.dir > 0 ? -1 : 1;
        e.edgeDecided = edge;
        if ((e.aiTimer -= dt) <= 0) {
          e.aiTimer = 2 + this.rng() * 2;
          buttons |= BTN_JUMP;
        }
      }
      return buttons | (e.dir > 0 ? BTN_RIGHT : BTN_LEFT);
    }

    if (!b.onGround) return dirButton;
    if ((e.aiTimer -= dt) > 0) return 0;
    e.aiTimer = 0.9 + this.rng() * 0.6;
    const target = this.nearestPlayer(b);
    if (target) {
      e.dir = target.body.x > b.x ? 1 : -1;
      if (target.body.y - b.y > 2 * TILE && b.onOneWay) return BTN_DOWN | BTN_JUMP;
    }
    return BTN_JUMP | (e.dir > 0 ? BTN_RIGHT : BTN_LEFT);
  }

  private edgeAhead(e: Enemy): boolean {
    const b = e.body;
    const w = ENEMY_SIZE * TILE;
    const footRow = Math.round((b.y + ENEMY_SIZE * TILE) / TILE);
    const col = e.dir > 0 ? Math.floor((b.x + w + 1) / TILE) : Math.floor((b.x - 1) / TILE);
    return cellAt(this.arena, col, footRow) === EMPTY;
  }

  private nearestPlayer(b: PlayerState): WorldPlayer | null {
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down) continue;
      const d = Math.abs(p.body.x - b.x) + Math.abs(p.body.y - b.y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  private defeat(e: Enemy, kicker: string | null, combo: number): void {
    this.enemies.delete(e.id);
    this.score += RULES.scorePerEnemy * Math.max(1, combo);
    const p = kicker ? this.players.get(kicker) : undefined;
    if (p) {
      p.kills++;
      this.playerStats(p).kills++;
    }
  }

  private burst(ball: Enemy): void {
    const center = enemyBox(ball);
    const cx = center.x + center.w / 2;
    const cy = center.y + center.h / 2;
    this.defeat(ball, ball.kicker, 1);
    for (const e of this.enemies.values()) {
      if (e.mode !== MODE_WALK || e.kind === ENEMY_BORRAO) continue;
      const box = enemyBox(e);
      if (Math.hypot(box.x + box.w / 2 - cx, box.y + box.h / 2 - cy) <= RULES.burstRadius * TILE) {
        this.soak(e, RULES.burstSoak);
      }
    }
  }

  private stepDamage(): void {
    for (const p of this.players.values()) {
      if (p.down || p.invuln > 0) continue;
      const box = bodyBox(p.body, this.params);
      for (const e of this.enemies.values()) {
        if (e.mode === MODE_WALK && overlaps(box, enemyBox(e))) {
          p.down = true;
          p.downTime = 0;
          p.rescue = 0;
          p.body.vx = 0;
          p.body.vy = 0;
          this.stats.downs++;
          break;
        }
      }
    }
  }

  private stepRescue(dt: number): void {
    for (const p of this.players.values()) {
      if (!p.down) continue;
      p.downTime += dt;
      const area = bodyBox(p.body, this.params, 0.3 * TILE);
      let helped = false;
      for (const o of this.players.values()) {
        if (o !== p && !o.down && overlaps(area, bodyBox(o.body, this.params))) helped = true;
      }
      p.rescue = helped ? p.rescue + dt : 0;
      if (p.rescue >= RULES.rescueTime) {
        this.stats.rescues++;
        this.revive(p, false);
      } else if (p.downTime >= RULES.respawnTime && this.lives > 0) {
        this.lives--;
        this.stats.livesUsed++;
        this.revive(p, true);
      }
    }
  }

  private revive(p: WorldPlayer, atSpawn: boolean): void {
    p.down = false;
    p.downTime = 0;
    p.rescue = 0;
    p.invuln = RULES.invulnTime;
    p.ink = RULES.tankSize;
    if (atSpawn) {
      const prevButtons = p.body.prevButtons;
      p.body = createPlayer(this.safestSpawn(p.slot), this.params);
      p.body.prevButtons = prevButtons;
    }
  }

  /**
   * Renascer longe de quem derruba: entre o surgimento do jogador e as células ao lado
   * dos tubos, a mais distante dos inimigos andando. Empate fica com o surgimento próprio.
   */
  private safestSpawn(slot: number): CellPos {
    const candidates: CellPos[] = [this.arena.playerSpawns[slot]!];
    for (const tube of this.arena.tubes) {
      candidates.push({ col: tube.col + (tube.col < this.arena.cols / 2 ? 1 : -1), row: tube.row });
    }
    let best = candidates[0]!;
    let bestDist = -1;
    for (const c of candidates) {
      let nearest = Infinity;
      for (const e of this.enemies.values()) {
        if (e.mode !== MODE_WALK) continue;
        nearest = Math.min(nearest, Math.hypot(e.body.x - c.col * TILE, e.body.y - c.row * TILE));
      }
      if (nearest > bestDist) {
        bestDist = nearest;
        best = c;
      }
    }
    return best;
  }

  private stepSpawns(dt: number): void {
    if (this.phase !== PHASE_PLAYING || this.spawnQueue === 0) return;
    if (this.enemies.size >= RULES.maxEnemiesOnScreen) return;
    if ((this.spawnTimer -= dt) > 0) return;
    this.spawnNext();
    this.spawnTimer = RULES.spawnDelay;
  }

  private spawnNext(): void {
    const points = this.arena.enemySpawns;
    const cell = points[this.spawnCount % points.length]!;
    const kind = this.spawnCount % 3 === 2 ? ENEMY_SALTADOR : ENEMY_TRACA;
    this.spawnCount++;
    this.spawnQueue--;
    this.spawnEnemy(kind, cell);
  }

  /**
   * Arena limpa → pausa curta → virada de página → próxima arena; depois da última, resumo do
   * capítulo e volta à primeira. Todos caídos sem vidas → a mesma arena recomeça.
   */
  private stepPhase(dt: number): void {
    if (this.phase === PHASE_PLAYING) {
      if (this.waveStarted && this.enemiesLeft === 0) {
        this.report('limpa');
        // O borrão vai embora junto com a arena.
        this.enemies.clear();
        this.phase = PHASE_CLEAR;
        this.phaseTime = RULES.clearDelay;
      } else if (this.lives === 0 && this.players.size > 0 && [...this.players.values()].every((p) => p.down)) {
        if (this.waveStarted) this.report('recomeço');
        this.phase = PHASE_RESTART;
        this.phaseTime = RULES.restartDelay;
      }
      return;
    }
    if ((this.phaseTime -= dt) > 0) return;

    if (!this.autoWaves) {
      if (this.phase === PHASE_RESTART) this.resetTeam();
      this.phase = PHASE_PLAYING;
      return;
    }
    switch (this.phase) {
      case PHASE_CLEAR:
        if (this.arenaIndex < this.chapter.length - 1) {
          this.phase = PHASE_TURN;
          this.phaseTime = RULES.turnDelay;
        } else {
          this.phase = PHASE_CHAPTER;
          this.phaseTime = RULES.chapterDelay;
        }
        break;
      case PHASE_TURN:
        this.loadArena(this.arenaIndex + 1);
        break;
      case PHASE_CHAPTER:
        this.score = 0;
        this.lives = RULES.teamLives;
        this.loadArena(0);
        break;
      case PHASE_RESTART:
        this.resetTeam();
        this.startWave();
        break;
    }
  }

  private resetTeam(): void {
    this.lives = RULES.teamLives;
    for (const p of this.players.values()) this.revive(p, true);
  }

  /** Vira a página: todos começam juntos nos próprios surgimentos da nova arena. */
  private loadArena(index: number): void {
    this.arenaIndex = index;
    for (const p of this.players.values()) {
      const prevButtons = p.body.prevButtons;
      p.body = createPlayer(this.arena.playerSpawns[p.slot]!, this.params);
      p.body.prevButtons = prevButtons;
      p.down = false;
      p.downTime = 0;
      p.rescue = 0;
      p.invuln = RULES.invulnTime;
      p.ink = RULES.tankSize;
    }
    this.startWave();
  }

  /** Nova onda: quantidade e resistência calculadas com quem está na sala agora (plano, seção 2.6). */
  private startWave(): void {
    this.waveStarted = true;
    this.phase = PHASE_PLAYING;
    this.wave++;
    this.waveTime = 0;
    this.hurry = false;
    this.stats = emptyStats();
    this.enemies.clear();
    this.drops.clear();
    const n = Math.max(1, this.players.size);
    this.soakToBall = n >= 4 ? RULES.soakToBallBigTeam : RULES.soakToBall;
    this.spawnQueue = Math.round(4 + 1.5 * n);
    this.spawnCount = 0;
    this.spawnTimer = RULES.spawnDelay;
    const initial = Math.min(this.spawnQueue, RULES.maxEnemiesOnScreen, this.arena.enemySpawns.length);
    for (let i = 0; i < initial; i++) this.spawnNext();
  }
}
