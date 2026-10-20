import type { Room } from '@colyseus/sdk';
import {
  ARENAS,
  DEFAULT_PARAMS,
  Interpolator,
  MSG_INPUT,
  Predictor,
  type Arena,
  type NetPlayer,
  type PlayerState,
  type Positioned,
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
}

export interface NetDrop {
  slot: number;
  x: number;
  y: number;
}

/** Forma do estado sincronizado (o cliente decodifica por reflexão, sem importar o schema do servidor). */
export interface NetState {
  arenaId: string;
  tick: number;
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
}

export interface PlayerView extends Positioned {
  slot: number;
  facing: number;
  ink: number;
  down: boolean;
  rescue: number;
  invuln: number;
}

export type EnemyView = Positioned & NetEnemy;
export type DropView = Positioned & NetDrop;

/** Liga a sala do Colyseus à previsão do próprio jogador e à interpolação do resto. */
export class OnlineSession {
  readonly arena: Arena;
  readonly params = { ...DEFAULT_PARAMS };
  readonly slot: number;
  private readonly predictor: Predictor;
  private readonly players = new Interpolator<PlayerView>();
  private readonly enemies = new Interpolator<EnemyView>();
  private readonly drops = new Interpolator<DropView>();

  constructor(readonly room: Room) {
    const state = this.state;
    const arena = ARENAS.find((a) => a.id === state.arenaId);
    const me = state.players.get(room.sessionId);
    if (!arena || !me) throw new Error('estado inicial da sala incompleto');
    this.arena = arena;
    this.slot = me.slot;
    this.predictor = new Predictor(arena, this.params, me);
    room.onStateChange((s: NetState) => this.onState(s));
  }

  get state(): NetState {
    return this.room.state as NetState;
  }

  get me(): NetPlayer | undefined {
    return this.state.players.get(this.room.sessionId);
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
    const now = performance.now();
    const others: PlayerView[] = [];
    state.players.forEach((p, id) => {
      if (id === this.room.sessionId) return;
      others.push({
        id, slot: p.slot, x: p.x, y: p.y, facing: p.facing,
        ink: p.ink, down: p.down, rescue: p.rescue, invuln: p.invuln,
      });
    });
    this.players.push(now, others);

    const enemies: EnemyView[] = [];
    state.enemies.forEach((e, id) => {
      enemies.push({ id, kind: e.kind, mode: e.mode, x: e.x, y: e.y, facing: e.facing, soak: e.soak });
    });
    this.enemies.push(now, enemies);

    const drops: DropView[] = [];
    state.drops.forEach((d, id) => drops.push({ id, slot: d.slot, x: d.x, y: d.y }));
    this.drops.push(now, drops);

    const me = state.players.get(this.room.sessionId);
    if (me) this.predictor.reconcile(me);
  }
}
