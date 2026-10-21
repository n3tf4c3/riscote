import type { Room } from '@colyseus/sdk';
import {
  ARENAS,
  Interpolator,
  MSG_INPUT,
  MSG_NAME,
  MSG_RECORDS,
  MSG_REPORT,
  MSG_START,
  PHASE_CHAPTER,
  PHASE_RESTART,
  Predictor,
  movementParams,
  parseDifficulty,
  type Arena,
  type ArenaReport,
  type Difficulty,
  type MovementParams,
  type NetPlayer,
  type PlayerState,
  type Positioned,
  type RecordsMessage,
} from '@riscote/shared';

interface NetMap<T> {
  get(id: string): T | undefined;
  forEach(cb: (value: T, id: string) => void): void;
  readonly size: number;
}

export interface NetEnemy {
  kind: number;
  mode: number;
  x: number;
  y: number;
  facing: number;
  soak: number;
  /** Fase da habilidade (SKILL_*). */
  skill: number;
}

export interface NetStain {
  x: number;
  y: number;
  age: number;
}

export interface NetDrop {
  slot: number;
  x: number;
  y: number;
}

/** Forma do estado sincronizado (o cliente decodifica por reflexão, sem importar o schema do servidor). */
export interface NetState {
  arenaId: string;
  arenaIndex: number;
  arenaCount: number;
  difficulty: string;
  hostId: string;
  tick: number;
  waveTime: number;
  hurry: boolean;
  phase: number;
  phaseTime: number;
  wave: number;
  lives: number;
  score: number;
  enemiesLeft: number;
  soakToBall: number;
  players: NetMap<NetPlayer>;
  enemies: NetMap<NetEnemy>;
  drops: NetMap<NetDrop>;
  items: NetMap<NetItem>;
  stains: NetMap<NetStain>;
}

export interface NetItem {
  kind: number;
  x: number;
  y: number;
  ttl: number;
}

export interface PlayerView extends Positioned {
  slot: number;
  facing: number;
  ink: number;
  down: boolean;
  rescue: number;
  invuln: number;
  away: boolean;
  hp: number;
  star: number;
  /** Para escolher a pose do desenho (corrida, pulo, queda). */
  vx: number;
  vy: number;
  onGround: boolean;
}

export type EnemyView = Positioned & NetEnemy;
export type DropView = Positioned & NetDrop;

/** Liga a sala do Colyseus à previsão do próprio jogador e à interpolação do resto. */
export class OnlineSession {
  arena: Arena;
  /** Mesmos parâmetros do servidor para o modo da sala (a velocidade muda no fácil). */
  readonly params: MovementParams;
  readonly difficulty: Difficulty;
  readonly slot: number;
  /** Relatórios de métricas das arenas encerradas nesta sessão. */
  readonly reports: ArenaReport[] = [];
  /** Placar do fim de jogo em andamento; some quando a pausa do placar acaba. */
  records: RecordsMessage | null = null;
  private wasPaused = false;
  /** Chamado quando o servidor vira a página para outra arena. */
  onArenaChange: ((arena: Arena) => void) | null = null;
  /** A conexão caiu e o SDK está tentando voltar. */
  reconnecting = false;
  private predictor: Predictor;
  private players = new Interpolator<PlayerView>();
  private enemies = new Interpolator<EnemyView>();
  private drops = new Interpolator<DropView>();

  constructor(readonly room: Room) {
    const state = this.state;
    const arena = ARENAS.find((a) => a.id === state.arenaId);
    const me = state.players.get(room.sessionId);
    if (!arena || !me) throw new Error('estado inicial da sala incompleto');
    this.arena = arena;
    this.difficulty = parseDifficulty(state.difficulty);
    this.params = movementParams(this.difficulty);
    this.slot = me.slot;
    this.predictor = new Predictor(arena, (level) => movementParams(this.difficulty, level), me);
    room.onStateChange((s: NetState) => this.onState(s));
    room.onMessage(MSG_REPORT, (r: ArenaReport) => this.reports.push(r));
    room.onMessage(MSG_RECORDS, (r: RecordsMessage) => {
      this.records = r;
    });
  }

  get state(): NetState {
    return this.room.state as NetState;
  }

  get me(): NetPlayer | undefined {
    return this.state.players.get(this.room.sessionId);
  }

  get isHost(): boolean {
    return this.state.hostId === this.room.sessionId;
  }

  /** Pede ao servidor o fim do aquecimento (só vale para o anfitrião). */
  start(): void {
    this.room.send(MSG_START);
  }

  /** Nome para a linha desta partida no placar; a pontuação é sempre a do servidor. */
  sendName(name: string): void {
    this.room.send(MSG_NAME, { name });
  }

  /** Ainda pode escrever o nome no placar. */
  get mayName(): boolean {
    return this.records?.entryId != null && this.records.waiting.includes(this.room.sessionId);
  }

  get code(): string {
    return this.room.roomId;
  }

  get local(): PlayerState {
    return this.predictor.state;
  }

  get corrections(): number {
    return this.predictor.corrections;
  }

  get pendingCount(): number {
    return this.predictor.pendingCount;
  }

  /** Um tick fixo do cliente: aplica o comando localmente e o envia. */
  tick(buttons: number): void {
    this.room.send(MSG_INPUT, this.predictor.tick(buttons));
  }

  remotePlayers(now: number): PlayerView[] {
    return this.players.sample(now);
  }

  enemyViews(now: number): EnemyView[] {
    return this.enemies.sample(now);
  }

  dropViews(now: number): DropView[] {
    return this.drops.sample(now);
  }

  private onState(state: NetState): void {
    // A mensagem do placar pode chegar antes do estado com a pausa: só some quando a pausa termina.
    const paused = state.phase === PHASE_RESTART || state.phase === PHASE_CHAPTER;
    if (this.wasPaused && !paused) this.records = null;
    this.wasPaused = paused;
    const me = state.players.get(this.room.sessionId);
    if (!me) return;
    let switched = false;
    if (state.arenaId !== this.arena.id) {
      // Página virada: todos foram reposicionados; previsão e interpolação recomeçam do estado novo.
      // A numeração dos comandos continua: o servidor descartaria seq repetido e o boneco travaria.
      const arena = ARENAS.find((a) => a.id === state.arenaId);
      if (!arena) return;
      this.arena = arena;
      this.predictor = new Predictor(arena, (level) => movementParams(this.difficulty, level), me, this.predictor.lastSeq);
      this.players = new Interpolator<PlayerView>();
      this.enemies = new Interpolator<EnemyView>();
      this.drops = new Interpolator<DropView>();
      switched = true;
    }

    const now = performance.now();
    const others: PlayerView[] = [];
    state.players.forEach((p, id) => {
      if (id === this.room.sessionId) return;
      others.push({
        id, slot: p.slot, x: p.x, y: p.y, facing: p.facing,
        ink: p.ink, down: p.down, rescue: p.rescue, invuln: p.invuln, away: p.away, hp: p.hp, star: p.star,
        vx: p.vx, vy: p.vy, onGround: p.onGround,
      });
    });
    this.players.push(now, others);

    const enemies: EnemyView[] = [];
    state.enemies.forEach((e, id) => {
      enemies.push({ id, kind: e.kind, mode: e.mode, x: e.x, y: e.y, facing: e.facing, soak: e.soak, skill: e.skill });
    });
    this.enemies.push(now, enemies);

    const drops: DropView[] = [];
    state.drops.forEach((d, id) => drops.push({ id, slot: d.slot, x: d.x, y: d.y }));
    this.drops.push(now, drops);

    if (switched) this.onArenaChange?.(this.arena);
    else this.predictor.reconcile(me);
  }
}
