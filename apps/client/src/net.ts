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
  type RemoteView,
} from '@riscote/shared';

/** Forma do estado sincronizado (o cliente decodifica por reflexão, sem importar o schema do servidor). */
export interface NetState {
  arenaId: string;
  tick: number;
  players: { get(id: string): NetPlayer | undefined; forEach(cb: (p: NetPlayer, id: string) => void): void };
}

/** Liga a sala do Colyseus à previsão do próprio jogador e à interpolação dos demais. */
export class OnlineSession {
  readonly arena: Arena;
  readonly params = { ...DEFAULT_PARAMS };
  readonly slot: number;
  private readonly predictor: Predictor;
  private readonly interpolator = new Interpolator();

  constructor(readonly room: Room) {
    const state = room.state as NetState;
    const arena = ARENAS.find((a) => a.id === state.arenaId);
    const me = state.players.get(room.sessionId);
    if (!arena || !me) throw new Error('estado inicial da sala incompleto');
    this.arena = arena;
    this.slot = me.slot;
    this.predictor = new Predictor(arena, this.params, me);
    room.onStateChange((s: NetState) => this.onState(s));
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

  remotes(now: number): RemoteView[] {
    return this.interpolator.sample(now);
  }

  private onState(state: NetState): void {
    const others: RemoteView[] = [];
    state.players.forEach((p, id) => {
      if (id !== this.room.sessionId) others.push({ id, slot: p.slot, x: p.x, y: p.y, facing: p.facing });
    });
    this.interpolator.push(performance.now(), others);
    const me = state.players.get(this.room.sessionId);
    if (me) this.predictor.reconcile(me);
  }
}
