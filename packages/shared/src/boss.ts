import { EMPTY, cellAt, parseArena, type Arena, type CellPos } from './arena.ts';
import { TILE } from './params.ts';

// O chefe: o Mata-Borrão, um mata-borrão de mesa que ganhou vida e quer secar a página.
// Luta numa página própria do capítulo. A vida só cai com bolas chutadas nele; a tinta
// direta enche o medidor de encharcado, e cheio ele fica pesado (parado, levando o dobro).
// Cada capítulo tem o seu chefe (decisão do usuário em 2026-11-01): a mesma estrutura do
// Mata-Borrão (vida, fases, avisos, encharcado, fiapos) e um golpe próprio, sempre avisado antes.
// O tipo vem da página (`bossKind`); o desenho de cada um fica no cliente.

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
  /** Apara-bumerangue (o Apontador): marca a altura, atira a apara rente a essa altura e ela volta. */
  shavingWindup: 0.9,
  shavingSpeed: 11, // células/s
  shavingRise: 16, // células/s até a altura marcada, saindo da boca dele
  shavingWidth: 1.4,
  shavingHeight: 0.9,
  /**
   * Virada de página (o Calhamaço): uma página gigante varre a arena de uma parede à outra, com uma
   * fresta na altura de quem está mais perto da parede de onde ela sai; só passa quem está na fresta.
   */
  pageWindup: 1.2,
  pageSpeed: 7, // células/s
  pageWidth: 0.7,
  pageGapAbove: 2.2, // células acima do centro do alvo
  pageGapBelow: 1.2, // células abaixo
  /**
   * Enxurrada (o Regador): o jardim enche de água até logo abaixo do topo da plataforma mais baixa;
   * quem ficou no chão é derrubado. Sobe, fica um tempo e escoa.
   */
  floodWindup: 1.3,
  floodRise: 0.5,
  floodHold: 1.6,
  floodDrain: 0.5,
  /** Quanto a água fica abaixo do topo da plataforma mais baixa (quem está de pé nela fica seco). */
  floodMargin: 0.25, // células
  /**
   * Traçado (a Lapiseira): risca retas que atravessam a arena inteira, uma delas passando por quem está
   * mais perto; tracejadas no aviso, depois de tinta.
   */
  lineWindup: 1.1,
  lineTime: 0.7, // s machucando
  lineWidth: 0.45, // células
  lineCount: [2, 3, 3],
  /**
   * Redemoinho (o Dragão-Pipa): um anel de vento cresce a partir dele até as bordas, com uma brecha
   * apontada para quem estava mais perto dele; só a brecha é segura.
   */
  ringWindup: 1.2,
  ringSpeed: 8, // células/s
  ringWidth: 0.8, // células
  ringGap: 0.6, // radianos para cada lado do meio da brecha
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
/** Apara-bumerangue (o Apontador): marca uma altura, atira uma apara por ela até a parede e ela volta. */
export const ATTACK_SHAVING = 4;
/** Virada de página (o Calhamaço): marca a fresta e uma página gigante varre a arena. */
export const ATTACK_PAGE = 5;
/** Enxurrada (o Regador): marca a altura da água e o jardim enche até ali. */
export const ATTACK_FLOOD = 6;
/** Traçado (a Lapiseira): retas riscadas na arena. */
export const ATTACK_LINES = 7;
/** Redemoinho (o Dragão-Pipa): um anel de vento com uma brecha. */
export const ATTACK_RING = 8;

export const HAZARD_WAVE = 0;
export const HAZARD_BLOT = 1;
export const HAZARD_SHAVING = 2;
/** Um pedaço da página da virada (acima ou abaixo da fresta); os dois correm juntos. */
export const HAZARD_PAGE = 3;
/** A água da enxurrada: um retângulo do chão até o nível dela, subindo e escoando. */
export const HAZARD_FLOOD = 4;
/** Uma reta do traçado: de (x, y) a (x + w, y + h); `wait` acima de 0 é o aviso. */
export const HAZARD_LINE = 5;
/** O anel do redemoinho: centro (x, y), raio `w`, direção do meio da brecha `h` (radianos). */
export const HAZARD_RING = 6;

/** Os chefes: o Mata-Borrão fecha o capítulo 1; cada capítulo novo traz o seu. */
export const BOSS_MATA_BORRAO = 0;
export const BOSS_APONTADOR = 1;
export const BOSS_CALHAMACO = 2;
export const BOSS_REGADOR = 3;
export const BOSS_LAPISEIRA = 4;
export const BOSS_DRAGAO = 5;

/** Golpes que cada chefe sorteia em cada fase (1, 2 e 3). */
const BOSS_ATTACKS: Record<number, readonly (readonly number[])[]> = {
  [BOSS_MATA_BORRAO]: [
    [ATTACK_STAMP, ATTACK_WAVE],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_RAIN],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_RAIN],
  ],
  [BOSS_APONTADOR]: [
    [ATTACK_STAMP, ATTACK_SHAVING],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_SHAVING, ATTACK_RAIN],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_SHAVING, ATTACK_RAIN],
  ],
  [BOSS_CALHAMACO]: [
    [ATTACK_STAMP, ATTACK_PAGE],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_PAGE, ATTACK_RAIN],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_PAGE, ATTACK_RAIN],
  ],
  [BOSS_REGADOR]: [
    [ATTACK_STAMP, ATTACK_FLOOD],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_FLOOD, ATTACK_RAIN],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_FLOOD, ATTACK_RAIN],
  ],
  [BOSS_LAPISEIRA]: [
    [ATTACK_STAMP, ATTACK_LINES],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_LINES, ATTACK_RAIN],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_LINES, ATTACK_RAIN],
  ],
  [BOSS_DRAGAO]: [
    [ATTACK_STAMP, ATTACK_RING],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_RING, ATTACK_RAIN],
    [ATTACK_STAMP, ATTACK_WAVE, ATTACK_RING, ATTACK_RAIN],
  ],
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function hit(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** A reta do traçado (com `half` de folga para cada lado) encosta na caixa. */
function lineHits(a: Rect, z: Hazard, half: number): boolean {
  const len = Math.hypot(z.w, z.h);
  const n = Math.max(1, Math.ceil(len / 2));
  for (let i = 0; i <= n; i++) {
    const x = z.x + (z.w * i) / n;
    const y = z.y + (z.h * i) / n;
    if (x >= a.x - half && x <= a.x + a.w + half && y >= a.y - half && y <= a.y + a.h + half) return true;
  }
  return false;
}

/** O anel do redemoinho encosta na caixa, fora da brecha (o meio da caixa dentro da brecha está a salvo). */
export function ringHits(a: Rect, z: { x: number; y: number; w: number; h: number }): boolean {
  const angle = Math.atan2(a.y + a.h / 2 - z.y, a.x + a.w / 2 - z.x);
  let diff = Math.abs(angle - z.h) % (2 * Math.PI);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  if (diff <= BOSS_RULES.ringGap) return false;
  const dx = Math.max(a.x - z.x, 0, z.x - (a.x + a.w));
  const dy = Math.max(a.y - z.y, 0, z.y - (a.y + a.h));
  const near = Math.hypot(dx, dy);
  const far = Math.hypot(Math.max(Math.abs(a.x - z.x), Math.abs(a.x + a.w - z.x)), Math.max(Math.abs(a.y - z.y), Math.abs(a.y + a.h - z.y)));
  const half = (BOSS_RULES.ringWidth * TILE) / 2;
  return near <= z.w + half && far >= z.w - half;
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
  /** Apara: a altura (y do topo) da faixa marcada e se já está voltando. */
  laneY?: number;
  back?: boolean;
  /** Enxurrada: segundos desde que a água começou a subir. */
  age?: number;
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
  /** Altura (centro) da faixa da apara-bumerangue. */
  targetY = 0;
  readonly kind: number;
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
    this.kind = bossKind(arena);
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
    for (const z of this.hazards.values()) {
      if (z.wait > 0) continue;
      if (z.kind === HAZARD_LINE) {
        if (lineHits(body, z, (BOSS_RULES.lineWidth * TILE) / 2)) return true;
      } else if (z.kind === HAZARD_RING) {
        if (ringHits(body, z)) return true;
      } else if (hit(body, z)) return true;
    }
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
    // Com uma página ainda varrendo a arena (ou a água ainda alta), não vem outra.
    const paging = [...this.hazards.values()].some((z) => z.kind === HAZARD_PAGE);
    const flooding = [...this.hazards.values()].some((z) => z.kind === HAZARD_FLOOD);
    const ringing = [...this.hazards.values()].some((z) => z.kind === HAZARD_RING);
    const options = BOSS_ATTACKS[this.kind]![this.phase - 1]!.filter(
      (a) => !(paging && a === ATTACK_PAGE) && !(flooding && a === ATTACK_FLOOD) && !(ringing && a === ATTACK_RING),
    );
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
    } else if (this.attack === ATTACK_SHAVING) {
      // Marca a altura de quem está mais perto e vira para ele.
      this.timer = BOSS_RULES.shavingWindup;
      const target = this.host.nearestTarget(this.x + this.w / 2, this.y + this.h / 2);
      const half = (BOSS_RULES.shavingHeight * TILE) / 2;
      const y = target ? target.y : this.y + this.h / 2;
      this.targetY = Math.min(this.floorY + this.h - half, Math.max(TILE + half, y));
      if (target) this.dir = target.x >= this.x + this.w / 2 ? 1 : -1;
    } else if (this.attack === ATTACK_LINES) {
      this.timer = BOSS_RULES.lineWindup;
      this.lines();
    } else if (this.attack === ATTACK_RING) {
      // O anel sai do meio dele; a brecha aponta para quem está mais perto.
      this.timer = BOSS_RULES.ringWindup;
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      const target = this.host.nearestTarget(cx, cy);
      const gap = target ? Math.atan2(target.y - cy, target.x - cx) : -Math.PI / 2;
      const id = this.host.nextId();
      this.hazards.set(id, { id, kind: HAZARD_RING, x: cx, y: cy, w: TILE / 2, h: gap, vx: 0, wait: BOSS_RULES.ringWindup });
    } else if (this.attack === ATTACK_FLOOD) {
      // A altura da água: logo abaixo do topo da plataforma mais baixa.
      this.timer = BOSS_RULES.floodWindup;
      this.targetY = floodLevel(this.arena);
    } else if (this.attack === ATTACK_PAGE) {
      // A página sai da parede do outro lado de quem está mais perto dele e varre na direção desse
      // alguém; a fresta fica na altura de quem está mais perto daquela parede (o que tem menos tempo).
      this.timer = BOSS_RULES.pageWindup;
      const cy = this.y + this.h / 2;
      const near = this.host.nearestTarget(this.x + this.w / 2, cy);
      const fromLeft = near ? near.x >= this.x + this.w / 2 : this.dir > 0;
      const w = BOSS_RULES.pageWidth * TILE;
      this.targetX = fromLeft ? TILE : (this.arena.cols - 1) * TILE - w;
      const first = this.host.nearestTarget(this.targetX, cy);
      const y = first ? first.y : cy;
      this.targetY = Math.min(this.floorY + this.h - BOSS_RULES.pageGapBelow * TILE, Math.max(TILE + BOSS_RULES.pageGapAbove * TILE, y));
      this.dir = fromLeft ? 1 : -1;
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
    if (this.attack === ATTACK_SHAVING) this.shaving();
    if (this.attack === ATTACK_PAGE) this.turnPage();
    if (this.attack === ATTACK_FLOOD) {
      const id = this.host.nextId();
      const bottom = (this.arena.rows - 1) * TILE;
      this.hazards.set(id, { id, kind: HAZARD_FLOOD, x: TILE, y: bottom, w: (this.arena.cols - 2) * TILE, h: 0, vx: 0, wait: 0, laneY: this.targetY, age: 0 });
    }
    this.recover();
  }

  /**
   * As retas do traçado: a primeira passa por quem está mais perto, as outras por pontos sorteados; cada uma
   * com um ângulo sorteado, de borda a borda da arena.
   */
  private lines(): void {
    const left = TILE;
    const right = (this.arena.cols - 1) * TILE;
    const top = TILE;
    const bottom = (this.arena.rows - 1) * TILE;
    const count = BOSS_RULES.lineCount[this.phase - 1]!;
    const target = this.host.nearestTarget(this.x + this.w / 2, this.y + this.h / 2);
    for (let i = 0; i < count; i++) {
      const px = i === 0 && target ? target.x : left + this.host.rng() * (right - left);
      const py = i === 0 && target ? target.y : top + this.host.rng() * (bottom - top);
      const angle = this.host.rng() * Math.PI;
      const c = Math.cos(angle);
      const sn = Math.sin(angle);
      const span = (lo: number, hi: number, p: number, d: number): [number, number] =>
        Math.abs(d) < 1e-6 ? [-Infinity, Infinity] : [Math.min((lo - p) / d, (hi - p) / d), Math.max((lo - p) / d, (hi - p) / d)];
      const [ax, bx] = span(left, right, px, c);
      const [ay, by] = span(top, bottom, py, sn);
      const t0 = Math.max(ax, ay);
      const t1 = Math.min(bx, by);
      if (!(t1 > t0)) continue;
      const id = this.host.nextId();
      this.hazards.set(id, { id, kind: HAZARD_LINE, x: px + c * t0, y: py + sn * t0, w: c * (t1 - t0), h: sn * (t1 - t0), vx: 0, wait: BOSS_RULES.lineWindup, age: 0 });
    }
  }

  /** A página: um pedaço acima da fresta e outro abaixo (se houver espaço), correndo juntos. */
  private turnPage(): void {
    const w = BOSS_RULES.pageWidth * TILE;
    const top = TILE;
    const bottom = (this.arena.rows - 1) * TILE;
    const gapTop = this.targetY - BOSS_RULES.pageGapAbove * TILE;
    const gapBottom = this.targetY + BOSS_RULES.pageGapBelow * TILE;
    const vx = this.dir * BOSS_RULES.pageSpeed * TILE;
    for (const [y, h] of [[top, gapTop - top], [gapBottom, bottom - gapBottom]] as const) {
      if (h <= 0) continue;
      const id = this.host.nextId();
      this.hazards.set(id, { id, kind: HAZARD_PAGE, x: this.targetX, y, w, h, vx, wait: 0 });
    }
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

  /** A apara sai da boca, sobe ou desce até a faixa marcada e corre até a parede; de lá, volta. */
  private shaving(): void {
    const w = BOSS_RULES.shavingWidth * TILE;
    const h = BOSS_RULES.shavingHeight * TILE;
    const id = this.host.nextId();
    const x = this.dir > 0 ? this.x + this.w - w / 2 : this.x - w / 2;
    const y = this.y + this.h * 0.45 - h / 2;
    this.hazards.set(id, { id, kind: HAZARD_SHAVING, x, y, w, h, vx: this.dir * BOSS_RULES.shavingSpeed * TILE, wait: 0, laneY: this.targetY - h / 2, back: false });
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
      if (z.kind === HAZARD_LINE) {
        // Tracejada no aviso; depois, de tinta por um instante.
        if (z.wait > 0) z.wait -= dt;
        else if ((z.age = (z.age ?? 0) + dt) >= BOSS_RULES.lineTime) this.hazards.delete(z.id);
        continue;
      }
      if (z.kind === HAZARD_RING) {
        // Depois do aviso, cresce até passar dos cantos da arena.
        if (z.wait > 0) {
          z.wait -= dt;
          continue;
        }
        z.w += BOSS_RULES.ringSpeed * TILE * dt;
        const corner = Math.max(Math.hypot(z.x, z.y), Math.hypot(this.arena.cols * TILE - z.x, z.y), Math.hypot(z.x, this.arena.rows * TILE - z.y), Math.hypot(this.arena.cols * TILE - z.x, this.arena.rows * TILE - z.y));
        if (z.w > corner) this.hazards.delete(z.id);
        continue;
      }
      if (z.kind === HAZARD_FLOOD) {
        // Sobe até o nível marcado, fica e escoa.
        const age = (z.age = (z.age ?? 0) + dt);
        const bottom = (this.arena.rows - 1) * TILE;
        const full = bottom - (z.laneY ?? bottom);
        const { floodRise: rise, floodHold: hold, floodDrain: drain } = BOSS_RULES;
        const k = age < rise ? age / rise : age < rise + hold ? 1 : 1 - (age - rise - hold) / drain;
        if (k <= 0 && age > rise) {
          this.hazards.delete(z.id);
          continue;
        }
        z.h = full * Math.max(0, Math.min(1, k));
        z.y = bottom - z.h;
        continue;
      }
      if (z.kind === HAZARD_PAGE) {
        // Corre até encostar na parede do outro lado.
        z.x += z.vx * dt;
        if ((z.vx > 0 && z.x + z.w >= right) || (z.vx < 0 && z.x <= left)) this.hazards.delete(z.id);
        continue;
      }
      if (z.kind === HAZARD_SHAVING) {
        const lane = z.laneY ?? z.y;
        const rise = BOSS_RULES.shavingRise * TILE * dt;
        z.y = z.y < lane ? Math.min(lane, z.y + rise) : Math.max(lane, z.y - rise);
        z.x += z.vx * dt;
        const out = z.x < left || z.x + z.w > right;
        if (out && !z.back) {
          // Bateu na parede: volta pela mesma faixa.
          z.x = Math.min(right - z.w, Math.max(left, z.x));
          z.vx = -z.vx;
          z.back = true;
        } else if (out || (z.back && Math.abs(z.x + z.w / 2 - (this.x + this.w / 2)) < this.w / 4)) {
          // Voltou para a mão dele (ou passou da outra parede).
          this.hazards.delete(z.id);
        }
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

// O bosque do Apontador: a mesma ideia da mesa (chão largo no meio, saliências baixas nos cantos
// para nascer longe da queda dele), com andares em mais alturas para fugir da faixa da apara.
const BOSQUE = [
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#.......======......======.....#',
  '#..............................#',
  '#..............................#',
  '#=====......========......=====#',
  '#..............................#',
  '#..............................#',
  '#...=======..........=======...#',
  '#..............................#',
  '#.PPP.....................PP...#',
  '#=====....................=====#',
  '#..............................#',
  '#T............................T#',
  '################################',
];

export const BOSQUE_ARENA: Arena = parseArena('bosque', 'Bosque do Apontador 32×18', BOSQUE);

// A sala de leitura do Calhamaço: estantes compridas em andares regulares, para dar tempo de chegar
// à fresta da virada de página subindo ou descendo, e as saliências baixas nos cantos.
const ATRIL = [
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#.....=========....=========...#',
  '#..............................#',
  '#..............................#',
  '#==========............========#',
  '#..............................#',
  '#..............................#',
  '#....===========..===========..#',
  '#..............................#',
  '#.PPP.....................PP...#',
  '#=====....................=====#',
  '#..............................#',
  '#T............................T#',
  '################################',
];

export const ATRIL_ARENA: Arena = parseArena('atril', 'Sala de leitura do Calhamaço 32×18', ATRIL);

// O coreto do Regador: plataformas baixas dos dois lados e no meio, para subir antes da enxurrada, e
// andares mais altos em degraus até a pérgola.
const CORETO = [
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..........==========..........#',
  '#..............................#',
  '#..............................#',
  '#...=======..........=======...#',
  '#..............................#',
  '#..............................#',
  '#=====......==========....=====#',
  '#..............................#',
  '#..............................#',
  '#.PPP...=====......=====..PP...#',
  '#=====....................=====#',
  '#..............................#',
  '#T............................T#',
  '################################',
];

export const CORETO_ARENA: Arena = parseArena('coreto', 'Coreto do Regador 32×18', CORETO);

/** Altura da água da enxurrada: um pouco abaixo do topo da plataforma mais baixa da página. */
export function floodLevel(arena: Arena): number {
  for (let row = arena.rows - 2; row > 0; row--) {
    for (let col = 1; col < arena.cols - 1; col++) {
      if (cellAt(arena, col, row) !== EMPTY) return row * TILE + BOSS_RULES.floodMargin * TILE;
    }
  }
  return (arena.rows - 1) * TILE;
}

// A bancada da Lapiseira: tábuas compridas em andares regulares, com vãos para fugir das retas.
const BANCADA = [
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#....==========....==========..#',
  '#..............................#',
  '#..............................#',
  '#=======........==........=====#',
  '#..............................#',
  '#..............................#',
  '#.....=========....=========...#',
  '#..............................#',
  '#.PPP.....................PP...#',
  '#=====....................=====#',
  '#..............................#',
  '#T............................T#',
  '################################',
];

export const BANCADA_ARENA: Arena = parseArena('bancada', 'Bancada da Lapiseira 32×18', BANCADA);

// O alto da torre do Dragão-Pipa: nuvens em vários andares e lados, para chegar à brecha do redemoinho.
const TORRE = [
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#............========..........#',
  '#..............................#',
  '#..............................#',
  '#...======..............======.#',
  '#..............................#',
  '#..............................#',
  '#.........=====....=====.......#',
  '#..............................#',
  '#..............................#',
  '#.......=====........=====.....#',
  '#.PPP.....................PP...#',
  '#=====....................=====#',
  '#..............................#',
  '#T............................T#',
  '################################',
];

export const TORRE_ARENA: Arena = parseArena('torre', 'Torre do Dragão-Pipa 32×18', TORRE);

/** As páginas de chefe e quem luta em cada uma. */
const BOSS_PAGES: Record<string, number> = {
  [BOSS_ARENA.id]: BOSS_MATA_BORRAO,
  [BOSQUE_ARENA.id]: BOSS_APONTADOR,
  [ATRIL_ARENA.id]: BOSS_CALHAMACO,
  [CORETO_ARENA.id]: BOSS_REGADOR,
  [BANCADA_ARENA.id]: BOSS_LAPISEIRA,
  [TORRE_ARENA.id]: BOSS_DRAGAO,
};

export const BOSS_ARENAS: readonly Arena[] = [BOSS_ARENA, BOSQUE_ARENA, ATRIL_ARENA, CORETO_ARENA, BANCADA_ARENA, TORRE_ARENA];

export function isBossArena(arena: Arena): boolean {
  return BOSS_PAGES[arena.id] !== undefined;
}

/** O chefe da página (fora de uma página de chefe, o Mata-Borrão). */
export function bossKind(arena: Arena): number {
  return BOSS_PAGES[arena.id] ?? BOSS_MATA_BORRAO;
}

/**
 * Capítulo com a página do chefe na posição `at` (0 = antes da primeira).
 * Capítulo mais curto: o chefe fica no fim.
 */
export function withBoss(chapter: readonly Arena[], at: number, boss: Arena = BOSS_ARENA): Arena[] {
  const i = Math.min(Math.max(0, at), chapter.length);
  return [...chapter.slice(0, i), boss, ...chapter.slice(i)];
}
