import { EMPTY, SOLID, cellAt, type Arena, type CellPos } from './arena.ts';
import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT } from './input.ts';
import { DEFAULT_PARAMS, TICK_DT, TILE, type MovementParams } from './params.ts';
import { createPlayer, stepPlayer, touchesTube, type PlayerState } from './physics.ts';
import { DIFFICULTY_RULES, POWER_MAX_LEVEL, movementParams, type Difficulty } from './protocol.ts';
import type { RunEndReason } from './records.ts';

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
  hitInvulnTime: 1.5, // s de invulnerabilidade depois de um toque que não derrubou (modo fácil)
  teamLives: 5,
  scorePerEnemy: 100,
  // Etapa 4: pressão de tempo, virada de página e fim de capítulo (plano, seção 2.4).
  hurryTime: 60, // s na arena até o borrão aparecer
  borraoSpeed: 2.5, // células/s, atravessa paredes e não pode ser derrotado
  turnDelay: 1.2, // s de virada de página
  chapterDelay: 6, // s de resumo no fim do capítulo
  // Fim de jogo com pontos (capítulo concluído ou equipe sem vidas): pausa para escrever o nome no placar.
  recordDelay: 40, // s no máximo para todos escreverem
  recordShow: 6, // s com o placar na tela depois que todos escreveram
  // Itens que fortalecem o boneco (acumulam até ele ser derrubado, exceto a invencibilidade).
  itemFirstAt: 10, // s na arena até o primeiro item
  itemEvery: 12, // s entre itens
  itemLife: 10, // s até sumir se ninguém pegar
  maxItemsOnScreen: 2,
  itemSize: 0.8, // células
  invincibleTime: 6, // s
  ratePerLevel: 0.75, // multiplica a cadência de tiro por nível
  dropSpeedPerLevel: 0.2, // +20% de velocidade da gota por nível
  rangePerLevel: 0.35, // +35% de alcance da gota por nível
  // Habilidades dos inimigos: cada uma tem um aviso antes de acontecer.
  dashSight: 6, // células à frente, no mesmo andar, para a traça dar o bote
  dashWarn: 0.5, // s parada, tremendo, antes do bote
  dashTime: 0.6, // s de bote
  dashRest: 0.6, // s cansada depois do bote
  dashCooldown: 2.5, // s até poder dar outro bote
  dashSpeedMult: 2.5,
  slamEvery: 3, // a cada tantos saltos, o saltador dá uma pancada
  slamWarn: 0.5, // s agachado antes do salto alto
  slamJumpHeight: 5, // células
  slamRadius: 3, // células que a onda percorre para cada lado, rente ao chão
  slamWaveTime: 0.3, // s até a onda chegar ao fim
  slamWaveBand: 0.75, // células: largura da frente da onda
  slamRest: 0.5, // s parado depois da pancada
  stainEvery: 4, // s entre as manchas do borrão
  stainWarnLead: 0.4, // s em que o borrão se contrai antes de soltar a mancha
  stainWarn: 0.6, // s em que a mancha nova ainda não machuca
  stainLife: 5, // s machucando depois do aviso
  stainSize: 1.1, // células
  maxStains: 4,
} as const;

export const ITEM_FORCA = 0;
export const ITEM_AGILIDADE = 1;
export const ITEM_TIRO_AGIL = 2;
export const ITEM_ALCANCE = 3;
export const ITEM_INVENCIVEL = 4;
/** Chance relativa de cada item (a invencibilidade é a mais rara). */
const ITEM_WEIGHTS = [25, 25, 20, 20, 10];

export const ENEMY_TRACA = 0;
export const ENEMY_SALTADOR = 1;
/** A ameaça de tempo: persegue o jogador mais próximo, atravessa paredes e não é encharcada. */
export const ENEMY_BORRAO = 2;
export const MODE_WALK = 0;
export const MODE_BALL = 1;
export const MODE_ROLL = 2;
/** Fase da habilidade de um inimigo: aviso, em ação e recuperação (o borrão só usa o aviso). */
export const SKILL_NONE = 0;
export const SKILL_WARN = 1;
export const SKILL_ACT = 2;
export const SKILL_REST = 3;
export const PHASE_PLAYING = 0;
export const PHASE_CLEAR = 1;
export const PHASE_RESTART = 2;
export const PHASE_TURN = 3;
export const PHASE_CHAPTER = 4;
/** Aquecimento antes do início: todos andam pela arena, sem inimigos, até o anfitrião começar. */
export const PHASE_LOBBY = 5;

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

/** Fim de jogo com pontos: o que o servidor leva ao placar. */
export interface RunEnd {
  reason: RunEndReason;
  score: number;
  arena: string;
  /** Quem estava na sala, na ordem de chegada. */
  players: string[];
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
function bySoak(base: MovementParams): MovementParams[] {
  return Array.from({ length: RULES.soakToBallBigTeam + 1 }, (_, soak) => ({
    ...base,
    runSpeed: base.runSpeed * Math.max(0.4, 1 - 0.15 * soak),
  }));
}

const ENEMY_PARAMS: Record<number, MovementParams[]> = Object.fromEntries(
  Object.entries(ENEMY_BASE).map(([kind, base]) => [kind, bySoak(base)]),
);

/** Bote da traça e salto alto do saltador, também mais lentos quando encharcados. */
const SKILL_PARAMS: Record<number, MovementParams[]> = {
  [ENEMY_TRACA]: bySoak({
    ...ENEMY_BASE[ENEMY_TRACA]!,
    runSpeed: ENEMY_BASE[ENEMY_TRACA]!.runSpeed * RULES.dashSpeedMult, groundAccel: 200,
  }),
  [ENEMY_SALTADOR]: bySoak({ ...ENEMY_BASE[ENEMY_SALTADOR]!, jumpHeight: RULES.slamJumpHeight }),
};

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

export function stainBox(s: { x: number; y: number }): Box {
  const size = RULES.stainSize * TILE;
  return { x: s.x, y: s.y, w: size, h: size };
}

/**
 * Trecho de chão contínuo por onde a onda da pancada corre: a partir de `x`, na linha de chão sob
 * `feetY`, até `cells` células para cada lado, parando no vão ou na parede. Devolve [esquerda, direita] em pixels.
 */
export function floorSpan(arena: Arena, x: number, feetY: number, cells: number): [number, number] {
  const row = Math.round(feetY / TILE);
  const start = Math.floor(x / TILE);
  const open = (col: number) => cellAt(arena, col, row) !== EMPTY && cellAt(arena, col, row - 1) !== SOLID;
  let left = start;
  let right = start;
  while (left > start - cells && open(left - 1)) left--;
  while (right < start + cells && open(right + 1)) right++;
  const reach = cells * TILE;
  return [Math.max(left * TILE, x - reach), Math.min((right + 1) * TILE, x + reach)];
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
  /** Conexão caiu e a vaga está reservada: parado, invulnerável e ignorado pelos inimigos. */
  away: boolean;
  /** Toques que ainda aguenta antes de cair. */
  hp: number;
  /** Níveis acumulados dos itens (0 a POWER_MAX_LEVEL). */
  strength: number;
  speed: number;
  rate: number;
  range: number;
  /** Segundos restantes de invencibilidade (item). */
  star: number;
  /** Itens pegos (métrica). */
  items: number;
}

export interface Item {
  id: number;
  kind: number;
  x: number;
  y: number;
  ttl: number;
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
  /** Habilidade: fase (SKILL_*), tempo restante na fase e espera até poder usá-la de novo. */
  skill: number;
  skillTimer: number;
  skillCd: number;
  /** Saltos do saltador desde a última pancada. */
  hops: number;
}

/** Mancha deixada pelo borrão: inofensiva no aviso, depois machuca ao toque. */
export interface Stain {
  id: number;
  x: number;
  y: number;
  age: number;
}

/** Onda da pancada do saltador, rente ao chão (altura dos pés `y`) entre `left` e `right`. */
export interface Shock {
  x: number;
  y: number;
  left: number;
  right: number;
  age: number;
}

export interface Drop {
  id: number;
  owner: string;
  slot: number;
  x: number;
  y: number;
  vx: number;
  life: number;
  /** Quanto encharca ao acertar (1 + nível de força de quem atirou). */
  power: number;
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
  readonly params: MovementParams;
  /** Parâmetros por nível de agilidade (índice = nível). */
  private readonly speedParams: MovementParams[];
  readonly items = new Map<number, Item>();
  private nextItemAt: number = RULES.itemFirstAt;
  readonly players = new Map<string, WorldPlayer>();
  readonly enemies = new Map<number, Enemy>();
  readonly drops = new Map<number, Drop>();
  readonly stains = new Map<number, Stain>();
  shocks: Shock[] = [];
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
  readonly difficulty: Difficulty;
  /** Tinta acaba e recarrega nos tubos: só no modo difícil. */
  readonly limitedInk: boolean;
  readonly hitsToDown: number;
  private stats: RunningStats = emptyStats();
  private reports: ArenaReport[] = [];
  private runEnds: RunEnd[] = [];

  /** `waves: false` desliga ondas, pressão de tempo e progressão (cenários montados à mão nos testes). */
  constructor(chapter: Arena | readonly Arena[], seed: number, options: { waves?: boolean; difficulty?: Difficulty } = {}) {
    this.chapter = Array.isArray(chapter) ? chapter : [chapter as Arena];
    if (this.chapter.length === 0) throw new Error('capítulo sem arenas');
    this.rng = seededRandom(seed);
    this.autoWaves = options.waves ?? true;
    this.difficulty = options.difficulty ?? 'medio';
    this.limitedInk = DIFFICULTY_RULES[this.difficulty].limitedInk;
    this.hitsToDown = DIFFICULTY_RULES[this.difficulty].hitsToDown;
    this.params = movementParams(this.difficulty);
    this.speedParams = Array.from({ length: POWER_MAX_LEVEL + 1 }, (_, level) => movementParams(this.difficulty, level));
    this.phase = this.autoWaves ? PHASE_LOBBY : PHASE_PLAYING;
  }

  /** Sai do aquecimento: a primeira arena é dimensionada com quem está na sala agora. */
  start(): boolean {
    if (this.phase !== PHASE_LOBBY || this.players.size === 0) return false;
    this.startWave();
    return true;
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

  /** Fins de jogo com pontos desde a última chamada (o servidor leva ao placar). */
  takeRunEnds(): RunEnd[] {
    const out = this.runEnds;
    this.runEnds = [];
    return out;
  }

  /** Todos escreveram o nome (ou não há quem escreva): a pausa do placar encurta para RULES.recordShow. */
  closeRecords(): void {
    if (this.phase === PHASE_RESTART || this.phase === PHASE_CHAPTER) this.phaseTime = Math.min(this.phaseTime, RULES.recordShow);
  }

  /** Fecha a partida para o placar; sem pontos, não há o que registrar. */
  private endRun(reason: RunEndReason): boolean {
    if (!this.waveStarted || this.score <= 0) return false;
    this.runEnds.push({ reason, score: this.score, arena: this.arena.id, players: [...this.players.keys()] });
    return true;
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
      invuln: RULES.invulnTime, kills: 0, away: false, hp: this.hitsToDown,
      strength: 0, speed: 0, rate: 0, range: 0, star: 0, items: 0,
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  /** Marca ou desmarca a ausência (queda de conexão com vaga reservada). Ao voltar, ganha invulnerabilidade. */
  setAway(id: string, away: boolean): void {
    const p = this.players.get(id);
    if (!p || p.away === away) return;
    p.away = away;
    if (!away) p.invuln = RULES.invulnTime;
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
    stepPlayer(p.body, buttons, this.arena, this.speedParams[p.speed]!);
    if (pressed & BTN_ATTACK) this.attack(p);
  }

  /** Avança o mundo um tick (depois dos comandos do tick). */
  step(): void {
    const dt = TICK_DT;
    for (const p of this.players.values()) {
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.star = Math.max(0, p.star - dt);
      if (!p.down && touchesTube(p.body, this.arena, this.params)) {
        p.ink = Math.min(RULES.tankSize, p.ink + RULES.refillPerSecond * dt);
      }
    }

    if (this.phase === PHASE_PLAYING && this.waveStarted) {
      this.waveTime += dt;
      this.measure(dt);
      if (this.autoWaves && !this.hurry && this.waveTime >= RULES.hurryTime) this.spawnBorrao();
    }

    this.stepItems(dt);
    this.stepDrops(dt);
    this.stepHazards(dt);
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
      skill: SKILL_NONE, skillTimer: 0, skillCd: 0, hops: 0,
    };
    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  /** Coloca um item sobre a célula sólida ou atravessável `cell` (o item fica na célula de cima). */
  spawnItem(kind: number, cell: CellPos): Item {
    const size = RULES.itemSize * TILE;
    const item: Item = {
      id: this.nextId++, kind,
      x: cell.col * TILE + (TILE - size) / 2,
      y: cell.row * TILE - size,
      ttl: RULES.itemLife,
    };
    this.items.set(item.id, item);
    return item;
  }

  /** Itens aparecem de tempos em tempos sobre uma plataforma sorteada; quem encosta pega. */
  private stepItems(dt: number): void {
    if (this.autoWaves && this.phase === PHASE_PLAYING && this.waveStarted && this.waveTime >= this.nextItemAt) {
      this.nextItemAt += RULES.itemEvery;
      if (this.items.size < RULES.maxItemsOnScreen) this.spawnRandomItem();
    }
    const size = RULES.itemSize * TILE;
    for (const item of this.items.values()) {
      if ((item.ttl -= dt) <= 0) {
        this.items.delete(item.id);
        continue;
      }
      const box = { x: item.x, y: item.y, w: size, h: size };
      for (const p of this.players.values()) {
        if (p.down || p.away || !overlaps(box, bodyBox(p.body, this.params))) continue;
        this.pickItem(p, item.kind);
        this.items.delete(item.id);
        break;
      }
    }
  }

  private spawnRandomItem(): void {
    const cells: CellPos[] = [];
    for (let row = 2; row < this.arena.rows; row++) {
      for (let col = 1; col < this.arena.cols - 1; col++) {
        if (cellAt(this.arena, col, row) !== EMPTY && cellAt(this.arena, col, row - 1) === EMPTY) cells.push({ col, row });
      }
    }
    if (cells.length === 0) return;
    const cell = cells[Math.floor(this.rng() * cells.length)]!;
    let roll = this.rng() * ITEM_WEIGHTS.reduce((a, b) => a + b, 0);
    let kind = 0;
    while (roll >= ITEM_WEIGHTS[kind]!) roll -= ITEM_WEIGHTS[kind++]!;
    this.spawnItem(kind, cell);
  }

  private pickItem(p: WorldPlayer, kind: number): void {
    p.items++;
    const up = (level: number) => Math.min(POWER_MAX_LEVEL, level + 1);
    if (kind === ITEM_FORCA) p.strength = up(p.strength);
    else if (kind === ITEM_AGILIDADE) p.speed = up(p.speed);
    else if (kind === ITEM_TIRO_AGIL) p.rate = up(p.rate);
    else if (kind === ITEM_ALCANCE) p.range = up(p.range);
    else if (kind === ITEM_INVENCIVEL) p.star = RULES.invincibleTime;
  }

  /** O borrão surge no alto, no centro, e vem atrás de quem estiver mais perto. */
  spawnBorrao(): Enemy {
    const e = this.spawnEnemy(ENEMY_BORRAO, { col: Math.floor(this.arena.cols / 2), row: 1 });
    e.body.x = (this.arena.cols * TILE - BORRAO_SIZE * TILE) / 2;
    e.body.y = TILE;
    e.skillCd = RULES.stainEvery;
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
    if (this.limitedInk) p.ink -= 1;
    p.cooldown = RULES.shotCooldown * RULES.ratePerLevel ** p.rate;
    this.playerStats(p).shots++;
    const box = bodyBox(p.body, this.params);
    const size = RULES.dropSize * TILE;
    const id = this.nextId++;
    this.drops.set(id, {
      id, owner: p.id, slot: p.slot,
      x: p.body.facing > 0 ? box.x + box.w : box.x - size,
      y: box.y + box.h * 0.35,
      vx: p.body.facing * RULES.dropSpeed * TILE * (1 + RULES.dropSpeedPerLevel * p.rate),
      life: RULES.dropLife * (1 + RULES.rangePerLevel * p.range),
      power: 1 + p.strength,
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
        this.soak(e, d.power);
        break;
      }
    }
  }

  private soak(e: Enemy, amount: number): void {
    e.soak = Math.min(e.soak + amount, RULES.soakToBallBigTeam);
    e.soakTimer = RULES.soakDecay;
    if (e.mode === MODE_BALL) e.ballTime = RULES.ballTime;
    else if (e.mode === MODE_WALK && e.soak >= this.soakToBall) {
      // Virar bola interrompe a habilidade.
      e.mode = MODE_BALL;
      e.ballTime = RULES.ballTime;
      e.skill = SKILL_NONE;
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
        const params = e.skill === SKILL_ACT ? SKILL_PARAMS : ENEMY_PARAMS;
        stepPlayer(e.body, buttons, this.arena, params[e.kind]![e.soak]!);
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

  /** Manchas envelhecem e somem; ondas da pancada correm e acabam. */
  private stepHazards(dt: number): void {
    for (const s of this.stains.values()) {
      if ((s.age += dt) >= RULES.stainWarn + RULES.stainLife) this.stains.delete(s.id);
    }
    for (const w of this.shocks) w.age += dt;
    this.shocks = this.shocks.filter((w) => w.age < RULES.slamWaveTime);
  }

  /**
   * Borrão: segue em linha reta o jogador de pé mais próximo, atravessando paredes.
   * De tempos em tempos se contrai (aviso) e solta uma mancha onde está, fora das paredes.
   */
  private chase(e: Enemy, dt: number): void {
    if ((e.skillCd -= dt) <= 0) {
      e.skillCd = RULES.stainEvery;
      this.dropStain(e);
    }
    e.skill = e.skillCd <= RULES.stainWarnLead ? SKILL_WARN : SKILL_NONE;
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

  private dropStain(e: Enemy): void {
    const box = enemyBox(e);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    if (this.stains.size >= RULES.maxStains || cellAt(this.arena, Math.floor(cx / TILE), Math.floor(cy / TILE)) === SOLID) return;
    const half = (RULES.stainSize * TILE) / 2;
    const id = this.nextId++;
    this.stains.set(id, { id, x: cx - half, y: cy - half, age: 0 });
  }

  /**
   * IA simples: a traça patrulha e às vezes pula ou desce; o saltador pula na direção do jogador mais próximo.
   * Habilidades: a traça dá o bote em quem estiver à frente no mesmo andar; o saltador, a cada tantos saltos,
   * salta alto e cai com uma onda rente ao chão. As duas param num aviso antes.
   */
  private think(e: Enemy, dt: number): number {
    const b = e.body;
    const dirButton = e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
    e.skillCd = Math.max(0, e.skillCd - dt);
    if (e.kind === ENEMY_TRACA) {
      if (e.skill !== SKILL_NONE) return this.dash(e, dt);
      if (b.onGround && e.skillCd === 0 && this.preyAhead(e)) {
        e.skill = SKILL_WARN;
        e.skillTimer = RULES.dashWarn;
        return 0;
      }
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

    if (e.skill !== SKILL_NONE) return this.slam(e, dt);
    if (!b.onGround) return dirButton;
    if ((e.aiTimer -= dt) > 0) return 0;
    e.aiTimer = 0.9 + this.rng() * 0.6;
    const target = this.nearestPlayer(b);
    if (target) {
      e.dir = target.body.x > b.x ? 1 : -1;
      if (target.body.y - b.y > 2 * TILE && b.onOneWay) return BTN_DOWN | BTN_JUMP;
    }
    if (++e.hops >= RULES.slamEvery) {
      e.hops = 0;
      e.skill = SKILL_WARN;
      e.skillTimer = RULES.slamWarn;
      return 0;
    }
    return BTN_JUMP | (e.dir > 0 ? BTN_RIGHT : BTN_LEFT);
  }

  /** Bote da traça: aviso parada → corrida rápida (até bater) → cansada → espera. */
  private dash(e: Enemy, dt: number): number {
    if (e.skill === SKILL_ACT && e.wasBlocked) e.skillTimer = 0;
    if ((e.skillTimer -= dt) <= 0) {
      if (e.skill === SKILL_WARN) {
        e.skill = SKILL_ACT;
        e.skillTimer = RULES.dashTime;
      } else if (e.skill === SKILL_ACT) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.dashRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.dashCooldown;
      }
    }
    return e.skill === SKILL_ACT ? (e.dir > 0 ? BTN_RIGHT : BTN_LEFT) : 0;
  }

  /** Jogador de pé no mesmo andar da traça, à frente dela, perto e sem parede no meio. */
  private preyAhead(e: Enemy): boolean {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    const feet = b.y + size;
    const row = Math.floor((feet - 1) / TILE);
    const pw = this.params.playerWidth * TILE;
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      if (Math.abs(p.body.y + this.params.playerHeight * TILE - feet) > 0.6 * TILE) continue;
      const gap = e.dir > 0 ? p.body.x - (b.x + size) : b.x - (p.body.x + pw);
      if (gap < -size / 2 || gap > RULES.dashSight * TILE) continue;
      const from = Math.floor((b.x + size / 2) / TILE);
      const to = Math.floor((p.body.x + pw / 2) / TILE);
      let clear = true;
      for (let col = Math.min(from, to); col <= Math.max(from, to); col++) {
        if (cellAt(this.arena, col, row) === SOLID) clear = false;
      }
      if (clear) return true;
    }
    return false;
  }

  /** Pancada do saltador: agachado (aviso) → salto alto rumo ao jogador → ao cair, onda → parado. */
  private slam(e: Enemy, dt: number): number {
    const b = e.body;
    const dirButton = e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      const target = this.nearestPlayer(b);
      if (target) e.dir = target.body.x > b.x ? 1 : -1;
      e.skill = SKILL_ACT;
      e.skillTimer = 0;
      return BTN_JUMP | (e.dir > 0 ? BTN_RIGHT : BTN_LEFT);
    }
    if (e.skill === SKILL_ACT) {
      // skillTimer conta o tempo no ar: o primeiro tick ainda está no chão.
      e.skillTimer += dt;
      if (!b.onGround || e.skillTimer < 0.1) return dirButton;
      const size = ENEMY_SIZE * TILE;
      const x = b.x + size / 2;
      const y = b.y + size;
      const [left, right] = floorSpan(this.arena, x, y, RULES.slamRadius);
      this.shocks.push({ x, y, left, right, age: 0 });
      e.skill = SKILL_REST;
      e.skillTimer = RULES.slamRest;
      return 0;
    }
    if ((e.skillTimer -= dt) <= 0) e.skill = SKILL_NONE;
    return 0;
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
      if (p.down || p.away) continue;
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
      if (p.down || p.away || p.invuln > 0 || p.star > 0) continue;
      if (!this.touchesHazard(p)) continue;
      if (p.hp > 1) {
        // Modo fácil: o primeiro toque só tira a proteção.
        p.hp--;
        p.invuln = RULES.hitInvulnTime;
        continue;
      }
      p.down = true;
      // Derrubado perde tudo o que acumulou.
      p.strength = 0;
      p.speed = 0;
      p.rate = 0;
      p.range = 0;
      p.star = 0;
      p.downTime = 0;
      p.rescue = 0;
      p.body.vx = 0;
      p.body.vy = 0;
      this.stats.downs++;
    }
  }

  /** Inimigo andando, mancha já firme ou a frente da onda da pancada (só pega quem está no chão). */
  private touchesHazard(p: WorldPlayer): boolean {
    const box = bodyBox(p.body, this.params);
    for (const e of this.enemies.values()) {
      if (e.mode === MODE_WALK && overlaps(box, enemyBox(e))) return true;
    }
    for (const s of this.stains.values()) {
      if (s.age >= RULES.stainWarn && overlaps(box, stainBox(s))) return true;
    }
    if (!p.body.onGround) return false;
    for (const w of this.shocks) {
      if (Math.abs(box.y + box.h - w.y) > TILE / 2 || box.x >= w.right || box.x + box.w <= w.left) continue;
      const front = RULES.slamRadius * TILE * Math.min(1, (w.age + TICK_DT) / RULES.slamWaveTime);
      const dist = Math.max(0, box.x - w.x, w.x - (box.x + box.w));
      if (dist <= front && dist >= front - RULES.slamWaveBand * TILE) return true;
    }
    return false;
  }

  private stepRescue(dt: number): void {
    for (const p of this.players.values()) {
      if (!p.down) continue;
      p.downTime += dt;
      const area = bodyBox(p.body, this.params, 0.3 * TILE);
      let helped = false;
      for (const o of this.players.values()) {
        if (o !== p && !o.down && !o.away && overlaps(area, bodyBox(o.body, this.params))) helped = true;
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
    p.hp = this.hitsToDown;
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
    if (this.phase === PHASE_LOBBY) return;
    if (this.phase === PHASE_PLAYING) {
      if (this.waveStarted && this.enemiesLeft === 0) {
        this.report('limpa');
        // O borrão vai embora junto com a arena, e as manchas com ele.
        this.enemies.clear();
        this.stains.clear();
        this.shocks = [];
        this.phase = PHASE_CLEAR;
        this.phaseTime = RULES.clearDelay;
      } else if (this.lives === 0 && this.players.size > 0 && [...this.players.values()].every((p) => p.down || p.away)) {
        if (this.waveStarted) this.report('recomeço');
        // Sem vidas é fim de jogo: os pontos vão ao placar e a arena recomeça do zero.
        this.phase = PHASE_RESTART;
        this.phaseTime = this.endRun('sem-vidas') ? RULES.recordDelay : RULES.restartDelay;
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
          this.phaseTime = this.endRun('capitulo') ? RULES.recordDelay : RULES.chapterDelay;
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
    this.score = 0;
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
      p.hp = this.hitsToDown;
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
    this.items.clear();
    this.stains.clear();
    this.shocks = [];
    this.nextItemAt = RULES.itemFirstAt;
    const n = Math.max(1, this.players.size);
    this.soakToBall = n >= 4 ? RULES.soakToBallBigTeam : RULES.soakToBall;
    this.spawnQueue = Math.round(4 + 1.5 * n);
    this.spawnCount = 0;
    this.spawnTimer = RULES.spawnDelay;
    const initial = Math.min(this.spawnQueue, RULES.maxEnemiesOnScreen, this.arena.enemySpawns.length);
    for (let i = 0; i < initial; i++) this.spawnNext();
  }
}
