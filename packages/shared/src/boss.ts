import { EMPTY, cellAt, parseArena, type Arena, type CellPos } from './arena.ts';
import { TILE } from './params.ts';

// O chefe: o Mata-Borrão, um mata-borrão de mesa que ganhou vida e quer secar a página.
// Luta numa página própria do capítulo. A vida só cai com bolas chutadas nele; a tinta
// direta enche o medidor de encharcado, e cheio ele fica pesado (parado, levando o dobro).

/** Valores iniciais, a ajustar em playtest. Índices [fase 1, fase 2, fase 3] onde há três. */
export const BOSS_RULES = {
  hpBase: 6,
  hpPerPlayer: 3,
  width: 4, // células
  height: 3,
  /** Células livres entre a parede e o chefe: as saliências dos tubos ficam fora do alcance dele. */
  margin: 6,
  /** A caixa que derruba é menor que o desenho: encostar de raspão não conta. */
  inset: 0.2, // células de cada lado
  gravity: 60, // células/s²
  introTime: 2.6, // s de entrada; ninguém toma dano
  roamSpeed: [2.5, 3.5, 4.5], // células/s
  attackEvery: [2.6, 2, 1.3], // s entre ataques
  recoverTime: [0.7, 0.6, 0.35],
  stampWindup: 0.8, // s agachado, com a sombra no alvo
  stampAir: 0.9, // s no ar
  stampHeight: 6, // células
  waveWindup: 0.7,
  waveSpeed: 9, // células/s
  waveWidth: 0.8,
  waveHeight: 0.8,
  rainWindup: 1, // s com as marcas no teto
  rainSpeed: 14, // células/s
  rainSize: 1,
  rainCount: [0, 3, 5],
  soakBase: 10, // gotas para ficar pesado, mais soakPerPlayer por jogador
  soakPerPlayer: 2,
  soakHold: 1, // s sem levar gota antes de começar a secar
  soakDecay: 2, // gotas/s
  heavyTime: 3,
  heavyMult: 2,
  minionEvery: [6, 6, 4.5], // s entre fiapos (traças)
  minionsAtStart: 2,
  phase2At: 0.6, // fração da vida
  phase3At: 0.25,
  hurtTime: 0.25,
  defeatTime: 1.6,
  scorePerHit: 50,
  scoreDefeat: 2000,
} as const;

export const BOSS_INTRO = 0;
export const BOSS_ROAM = 1;
export const BOSS_WINDUP = 2;
export const BOSS_STAMP = 3;
export const BOSS_RECOVER = 4;
export const BOSS_HEAVY = 5;
export const BOSS_DEFEATED = 6;

export const ATTACK_NONE = 0;
/** Carimbada: agacha, salta sobre o alvo e esmaga. */
export const ATTACK_STAMP = 1;
/** Onda de secagem: pisa e solta uma onda baixa pelo chão para os dois lados. */
export const ATTACK_WAVE = 2;
/** Chuva de borrões: marcas no teto e, depois, gotas grandes caindo nessas colunas. */
export const ATTACK_RAIN = 3;

export const HAZARD_WAVE = 0;
export const HAZARD_BLOT = 1;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function hit(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface Hazard {
  id: number;
  kind: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  /** Segundos de aviso antes de valer (só os borrões da chuva esperam). */
  wait: number;
}

/** O que o chefe precisa do mundo: tudo determinístico, sem relógio nem Math.random. */
export interface BossHost {
  rng(): number;
  nextId(): number;
  /** Centro do jogador de pé mais próximo, ou null. */
  nearestTarget(x: number, y: number): { x: number; y: number } | null;
  minions(): number;
  /** Um fiapo no chão, em `cell`; `phase` (1 a 3) é a fase do chefe, que escolhe o tipo. */
  spawnMinion(cell: CellPos, phase: number): void;
}

export function bossMaxHp(players: number): number {
  return BOSS_RULES.hpBase + BOSS_RULES.hpPerPlayer * Math.max(1, players);
}

export class Boss {
  readonly w = BOSS_RULES.width * TILE;
  readonly h = BOSS_RULES.height * TILE;
  readonly maxHp: number;
  readonly soakMax: number;
  readonly minionMax: number;
  hp: number;
  x: number;
  y: number;
  vy = 0;
  dir: 1 | -1 = 1;
  state = BOSS_INTRO;
  attack = ATTACK_NONE;
  /** Segundos restantes no estado atual (a entrada, o aviso, o salto, o peso, a queda). */
  timer: number = BOSS_RULES.introTime;
  /** Onde a carimbada vai cair (x do canto esquerdo). */
  targetX = 0;
  soak = 0;
  hurt = 0;
  /** Contadores para o cliente reagir: batidas no chão (chacoalhar) e golpes levados. */
  impacts = 0;
  hits = 0;
  /** A queda terminou: a arena pode ser dada como limpa. */
  gone = false;
  readonly hazards = new Map<number, Hazard>();
  private attackTimer = 0;
  private minionTimer = 0;
  private soakHold = 0;
  private stampFromX = 0;
  private stampT = 0;
  private readonly floorY: number;
  private readonly minX: number;
  private readonly maxX: number;
  readonly arena: Arena;
  private readonly host: BossHost;

  constructor(arena: Arena, players: number, host: BossHost) {
    this.arena = arena;
    this.host = host;
    this.maxHp = bossMaxHp(players);
    this.hp = this.maxHp;
    this.soakMax = BOSS_RULES.soakBase + BOSS_RULES.soakPerPlayer * Math.max(1, players);
    this.minionMax = 3 + Math.floor(Math.max(1, players) / 3);
    this.floorY = (arena.rows - 1) * TILE - this.h;
    // Fica no chão do meio, sem entrar embaixo das saliências dos tubos.
    this.minX = BOSS_RULES.margin * TILE;
    this.maxX = (arena.cols - BOSS_RULES.margin) * TILE - this.w;
    this.x = (arena.cols * TILE - this.w) / 2;
    this.y = -this.h;
  }

  /** 1, 2 ou 3: fica mais rápido e ganha ataques conforme perde vida. */
  get phase(): number {
    const f = this.hp / this.maxHp;
    return f > BOSS_RULES.phase2At ? 1 : f > BOSS_RULES.phase3At ? 2 : 3;
  }

  get alive(): boolean {
    return this.state !== BOSS_DEFEATED;
  }

  /** Caixa que derruba quem encosta; nula quando ele não machuca (entrada, peso, queda). */
  get harmBox(): Rect | null {
    if (this.state === BOSS_INTRO || this.state === BOSS_HEAVY || this.state === BOSS_DEFEATED) return null;
    const i = BOSS_RULES.inset * TILE;
    return { x: this.x + i, y: this.y + i, w: this.w - 2 * i, h: this.h - i };
  }

  get box(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  step(dt: number): void {
    this.hurt = Math.max(0, this.hurt - dt);
    this.stepHazards(dt);
    if (this.soakHold > 0) this.soakHold -= dt;
    else this.soak = Math.max(0, this.soak - BOSS_RULES.soakDecay * dt);
    const p = this.phase - 1;

    if (this.state !== BOSS_INTRO && this.state !== BOSS_DEFEATED && (this.minionTimer -= dt) <= 0) {
      this.minionTimer = BOSS_RULES.minionEvery[p]!;
      if (this.host.minions() < this.minionMax) this.spawnMinion(this.dir);
    }

    switch (this.state) {
      case BOSS_INTRO:
        this.fall(dt);
        if ((this.timer -= dt) <= 0) {
          for (let i = 0; i < BOSS_RULES.minionsAtStart; i++) this.spawnMinion(i % 2 === 0 ? -1 : 1);
          this.minionTimer = BOSS_RULES.minionEvery[0];
          this.roam(BOSS_RULES.attackEvery[0]);
        }
        break;
      case BOSS_ROAM:
        this.walk(dt, BOSS_RULES.roamSpeed[p]!);
        if ((this.attackTimer -= dt) <= 0) this.windup();
        break;
      case BOSS_WINDUP:
        if ((this.timer -= dt) <= 0) this.unleash();
        break;
      case BOSS_STAMP: {
        this.stampT = Math.min(BOSS_RULES.stampAir, this.stampT + dt);
        const t = this.stampT / BOSS_RULES.stampAir;
        this.x = this.stampFromX + (this.targetX - this.stampFromX) * t;
        this.y = this.floorY - 4 * BOSS_RULES.stampHeight * TILE * t * (1 - t);
        if (t >= 1) {
          this.y = this.floorY;
          this.impacts++;
          // Furioso: a carimbada já sai com a onda.
          if (this.phase === 3) this.waves();
          this.recover();
        }
        break;
      }
      case BOSS_RECOVER:
        if ((this.timer -= dt) <= 0) this.roam(BOSS_RULES.attackEvery[p]!);
        break;
      case BOSS_HEAVY:
        this.fall(dt);
        if ((this.timer -= dt) <= 0) {
          this.soak = 0;
          this.roam(1);
        }
        break;
      case BOSS_DEFEATED:
        this.fall(dt);
        if ((this.timer -= dt) <= 0) this.gone = true;
        break;
    }
  }

  /** Gota de tinta nele: absorvida sempre que encosta; enche o medidor fora da entrada e da queda. */
  soakHit(drop: Rect, amount: number): boolean {
    if (this.state === BOSS_DEFEATED || !hit(drop, this.box)) return false;
    if (this.state === BOSS_INTRO || this.state === BOSS_HEAVY) return true;
    this.soak = Math.min(this.soakMax, this.soak + amount);
    this.soakHold = BOSS_RULES.soakHold;
    if (this.soak >= this.soakMax) {
      this.state = BOSS_HEAVY;
      this.attack = ATTACK_NONE;
      this.timer = BOSS_RULES.heavyTime;
      this.vy = 0;
    }
    return true;
  }

  /** Bola rolando que o acerta: devolve o dano (0 se passou sem acertar). */
  ballHit(ball: Rect, combo: number): number {
    if (this.state === BOSS_INTRO || this.state === BOSS_DEFEATED || !hit(ball, this.box)) return 0;
    const damage = Math.min(this.hp, (1 + combo) * (this.state === BOSS_HEAVY ? BOSS_RULES.heavyMult : 1));
    this.hp -= damage;
    this.hurt = BOSS_RULES.hurtTime;
    this.hits++;
    if (this.hp <= 0) {
      this.state = BOSS_DEFEATED;
      this.attack = ATTACK_NONE;
      this.timer = BOSS_RULES.defeatTime;
      this.vy = 0;
      this.hazards.clear();
    }
    return damage;
  }

  /** Encostar no corpo ou num perigo armado derruba. */
  hurts(body: Rect): boolean {
    const harm = this.harmBox;
    if (harm && hit(body, harm)) return true;
    for (const z of this.hazards.values()) if (z.wait <= 0 && hit(body, z)) return true;
    return false;
  }

  private fall(dt: number): void {
    if (this.y >= this.floorY) return;
    this.vy += BOSS_RULES.gravity * TILE * dt;
    this.y = Math.min(this.floorY, this.y + this.vy * dt);
    if (this.y >= this.floorY) {
      this.vy = 0;
      this.impacts++;
    }
  }

  private roam(attackIn: number): void {
    this.state = BOSS_ROAM;
    this.attack = ATTACK_NONE;
    this.attackTimer = attackIn;
  }

  private recover(): void {
    this.state = BOSS_RECOVER;
    this.timer = BOSS_RULES.recoverTime[this.phase - 1]!;
  }

  /** Balança na direção de quem está mais perto, sem passar dos limites. */
  private walk(dt: number, speed: number): void {
    const target = this.host.nearestTarget(this.x + this.w / 2, this.y + this.h / 2);
    if (target) {
      const dx = target.x - (this.x + this.w / 2);
      if (Math.abs(dx) > 2 * TILE) this.dir = dx > 0 ? 1 : -1;
    }
    this.x += this.dir * speed * TILE * dt;
    if (this.x <= this.minX || this.x >= this.maxX) {
      this.x = Math.min(this.maxX, Math.max(this.minX, this.x));
      this.dir = this.x <= this.minX ? 1 : -1;
    }
  }

  private windup(): void {
    const options = this.phase === 1 ? [ATTACK_STAMP, ATTACK_WAVE] : [ATTACK_STAMP, ATTACK_WAVE, ATTACK_RAIN];
    this.attack = options[Math.floor(this.host.rng() * options.length)]!;
    this.state = BOSS_WINDUP;
    if (this.attack === ATTACK_STAMP) {
      this.timer = BOSS_RULES.stampWindup;
      const target = this.host.nearestTarget(this.x + this.w / 2, this.y + this.h / 2);
      const center = target ? target.x : this.x + this.w / 2;
      this.targetX = Math.min(this.maxX, Math.max(this.minX, center - this.w / 2));
      this.dir = this.targetX >= this.x ? 1 : -1;
    } else if (this.attack === ATTACK_WAVE) {
      this.timer = BOSS_RULES.waveWindup;
    } else {
      this.timer = BOSS_RULES.rainWindup;
      this.rain();
    }
  }

  private unleash(): void {
    if (this.attack === ATTACK_STAMP) {
      this.state = BOSS_STAMP;
      this.stampFromX = this.x;
      this.stampT = 0;
      return;
    }
    if (this.attack === ATTACK_WAVE) {
      this.impacts++;
      this.waves();
    }
    this.recover();
  }

  /** Duas ondas saindo dos lados do chefe, rente ao chão. */
  private waves(): void {
    const w = BOSS_RULES.waveWidth * TILE;
    const h = BOSS_RULES.waveHeight * TILE;
    const y = this.floorY + this.h - h;
    for (const dir of [-1, 1]) {
      const id = this.host.nextId();
      const x = dir < 0 ? this.x - w : this.x + this.w;
      this.hazards.set(id, { id, kind: HAZARD_WAVE, x, y, w, h, vx: dir * BOSS_RULES.waveSpeed * TILE, wait: 0 });
    }
  }

  /** Marca colunas no teto: uma sobre quem está mais perto, as outras sorteadas. */
  private rain(): void {
    const count = BOSS_RULES.rainCount[this.phase - 1]!;
    const cols: number[] = [];
    const target = this.host.nearestTarget(this.x + this.w / 2, this.y + this.h / 2);
    if (target) cols.push(Math.floor(target.x / TILE));
    for (let tries = 0; cols.length < count && tries < 50; tries++) {
      const col = 1 + Math.floor(this.host.rng() * (this.arena.cols - 2));
      if (cols.every((c) => Math.abs(c - col) >= 2)) cols.push(col);
    }
    const size = BOSS_RULES.rainSize * TILE;
    for (const col of cols) {
      const id = this.host.nextId();
      this.hazards.set(id, { id, kind: HAZARD_BLOT, x: col * TILE + (TILE - size) / 2, y: TILE, w: size, h: size, vx: 0, wait: BOSS_RULES.rainWindup });
    }
  }

  private stepHazards(dt: number): void {
    const left = TILE;
    const right = (this.arena.cols - 1) * TILE;
    for (const z of this.hazards.values()) {
      if (z.kind === HAZARD_WAVE) {
        z.x += z.vx * dt;
        if (z.x < left || z.x + z.w > right) this.hazards.delete(z.id);
        continue;
      }
      if (z.wait > 0) {
        z.wait -= dt;
        continue;
      }
      z.y += BOSS_RULES.rainSpeed * TILE * dt;
      // Estoura na primeira plataforma: dá para se abrigar embaixo dela.
      const col = Math.floor((z.x + z.w / 2) / TILE);
      if (cellAt(this.arena, col, Math.floor((z.y + z.h) / TILE)) !== EMPTY) this.hazards.delete(z.id);
    }
  }

  private spawnMinion(side: number): void {
    const center = Math.floor((this.x + this.w / 2) / TILE);
    const col = Math.min(this.arena.cols - 3, Math.max(2, center + side * 2));
    this.host.spawnMinion({ col, row: this.arena.rows - 2 }, this.phase);
  }
}

// A mesa do Mata-Borrão: chão largo no meio para a luta, saliências baixas nos cantos
// (onde nascem os jogadores, longe da queda dele) e andares para fugir da onda.
const MESA = [
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#...........========...........#',
  '#..............................#',
  '#..............................#',
  '#======......======......======#',
  '#..............................#',
  '#..............................#',
  '#....=======........=======....#',
  '#..............................#',
  '#.PPP.....................PP...#',
  '#=====....................=====#',
  '#..............................#',
  '#T............................T#',
  '################################',
];

export const BOSS_ARENA: Arena = parseArena('mesa', 'Mesa do Mata-Borrão 32×18', MESA);

export function isBossArena(arena: Arena): boolean {
  return arena.id === BOSS_ARENA.id;
}

/**
 * Capítulo com a página do chefe na posição `at` (0 = antes da primeira).
 * Capítulo mais curto: o chefe fica no fim.
 */
export function withBoss(chapter: readonly Arena[], at: number): Arena[] {
  const i = Math.min(Math.max(0, at), chapter.length);
  return [...chapter.slice(0, i), BOSS_ARENA, ...chapter.slice(i)];
}
