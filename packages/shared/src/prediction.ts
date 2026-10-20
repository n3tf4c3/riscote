import { stepPlayer, type PlayerState } from './physics.ts';
import type { Arena } from './arena.ts';
import type { MovementParams } from './params.ts';
import type { InputMessage, NetPlayer } from './protocol.ts';

/** Campos de simulação vindos da rede (schema usa acessores: copiar campo a campo). */
export function copyNetPlayer(n: NetPlayer, into: PlayerState): void {
  into.x = n.x;
  into.y = n.y;
  into.vx = n.vx;
  into.vy = n.vy;
  into.onGround = n.onGround;
  into.onOneWay = n.onOneWay;
  into.coyote = n.coyote;
  into.jumpBuffer = n.jumpBuffer;
  into.jumpHeld = n.jumpHeld;
  into.facing = n.facing > 0 ? 1 : -1;
  into.prevButtons = n.prevButtons;
}

/**
 * Previsão do próprio jogador: aplica cada comando na hora e, a cada estado autoritativo,
 * parte dele e reaplica os comandos que o servidor ainda não confirmou.
 */
export class Predictor {
  readonly state: PlayerState;
  /** Reconciliações que mudaram a posição prevista. */
  corrections = 0;
  /** Derrubado no servidor: os comandos seguem sendo enviados, mas o boneco não se move. */
  frozen = false;
  private seq = 0;
  private pending: InputMessage[] = [];
  private readonly arena: Arena;
  private readonly params: MovementParams;

  constructor(arena: Arena, params: MovementParams, initial: NetPlayer) {
    this.arena = arena;
    this.params = params;
    this.state = {
      x: 0, y: 0, vx: 0, vy: 0, onGround: false, onOneWay: false,
      coyote: 0, jumpBuffer: 0, jumpHeld: false, facing: 1, prevButtons: 0,
    };
    copyNetPlayer(initial, this.state);
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  /** Avança um tick com os botões atuais e devolve o comando a enviar ao servidor. */
  tick(buttons: number): InputMessage {
    const input = { seq: ++this.seq, buttons };
    this.pending.push(input);
    this.apply(buttons);
    return input;
  }

  /** Recebe o estado autoritativo do próprio jogador. Devolve true se a previsão precisou ser corrigida. */
  reconcile(server: NetPlayer): boolean {
    const beforeX = this.state.x;
    const beforeY = this.state.y;
    copyNetPlayer(server, this.state);
    this.frozen = server.down;
    this.pending = this.pending.filter((i) => i.seq > server.ack);
    for (const input of this.pending) this.apply(input.buttons);
    const corrected = Math.abs(this.state.x - beforeX) > 0.01 || Math.abs(this.state.y - beforeY) > 0.01;
    if (corrected) this.corrections++;
    return corrected;
  }

  /** Mesma regra do servidor (World.applyInput): derrubado só registra os botões. */
  private apply(buttons: number): void {
    if (this.frozen) this.state.prevButtons = buttons;
    else stepPlayer(this.state, buttons, this.arena, this.params);
  }
}

export interface RemoteView {
  id: string;
  slot: number;
  x: number;
  y: number;
  facing: number;
}

/** Qualquer coisa com posição que chega pela rede e é exibida interpolada. */
export interface Positioned {
  id: string;
  x: number;
  y: number;
}

/**
 * Interpolação dos outros jogadores: exibe o passado recente (`delayMs`) entre os dois
 * estados recebidos que o cercam, sem extrapolar.
 */
export class Interpolator<T extends Positioned = RemoteView> {
  private snapshots: Array<{ t: number; players: Map<string, T> }> = [];

  private readonly delayMs: number;
  private readonly keepMs: number;

  constructor(delayMs = 100, keepMs = 1000) {
    this.delayMs = delayMs;
    this.keepMs = keepMs;
  }

  push(t: number, players: T[]): void {
    this.snapshots.push({ t, players: new Map(players.map((p) => [p.id, { ...p }])) });
    while (this.snapshots.length > 2 && this.snapshots[0]!.t < t - this.keepMs) this.snapshots.shift();
  }

  sample(now: number): T[] {
    const target = now - this.delayMs;
    const snaps = this.snapshots;
    if (snaps.length === 0) return [];
    let i = snaps.length - 1;
    while (i > 0 && snaps[i - 1]!.t > target) i--;
    const b = snaps[i]!;
    const a = snaps[i - 1];
    if (!a || target >= b.t) return [...b.players.values()];
    const k = Math.max(0, Math.min(1, (target - a.t) / (b.t - a.t)));
    return [...b.players.values()].map((pb) => {
      const pa = a.players.get(pb.id);
      if (!pa) return pb;
      return { ...pb, x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k };
    });
  }
}
