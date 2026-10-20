import { randomInt } from 'node:crypto';
import { Room, matchMaker, type Client } from '@colyseus/core';
import {
  ARENAS,
  DEFAULT_PARAMS,
  MAX_PLAYERS,
  MSG_INPUT,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  TICK_RATE,
  createPlayer,
  parseInput,
  stepPlayer,
  type Arena,
  type CreateRoomOptions,
  type InputMessage,
  type PlayerState,
} from '@riscote/shared';
import { GameState, PlayerSchema } from './state.ts';

/** Fila acima disto descarta os comandos mais antigos: limita o atraso acumulado (~130 ms). */
const MAX_QUEUE = 8;
/** Fila acima disto aplica dois comandos no mesmo tick para recuperar o atraso. */
const CATCH_UP_QUEUE = 3;
/** Sem comandos por mais que isto, o jogador segue a simulação com os botões soltos. */
const STARVE_TICKS = 10;
const PATCH_RATE_MS = 1000 / 30;

interface Seat {
  player: PlayerState;
  queue: InputMessage[];
  lastSeq: number;
  starved: number;
}

function randomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  return code;
}

export class ArenaRoom extends Room<{ state: GameState }> {
  private arena!: Arena;
  private seats = new Map<string, Seat>();
  // Parâmetros fixos no servidor; o painel de ajuste do cliente só vale no modo local.
  private readonly params = { ...DEFAULT_PARAMS };

  async onCreate(options: CreateRoomOptions = {}): Promise<void> {
    let code = randomCode();
    while ((await matchMaker.query({ roomId: code })).length > 0) code = randomCode();
    this.roomId = code;

    this.maxClients = MAX_PLAYERS;
    // 60 comandos/s mais folga; acima disso o cliente é desconectado.
    this.maxMessagesPerSecond = 120;
    this.arena = ARENAS.find((a) => a.id === options.arenaId) ?? ARENAS[1]!;

    const state = new GameState();
    state.arenaId = this.arena.id;
    this.state = state;
    this.patchRate = PATCH_RATE_MS;

    this.onMessage(MSG_INPUT, (client, raw) => this.receiveInput(client, raw));
    this.setFixedTimestep(() => this.step(), TICK_RATE);
  }

  onJoin(client: Client): void {
    const used = new Set([...this.state.players.values()].map((p) => p.slot));
    let slot = 0;
    while (used.has(slot)) slot++;

    const player = createPlayer(this.arena.playerSpawns[slot]!, this.params);
    this.seats.set(client.sessionId, { player, queue: [], lastSeq: -1, starved: 0 });
    const net = new PlayerSchema();
    net.slot = slot;
    net.ack = 0;
    this.state.players.set(client.sessionId, net);
    copyToNet(player, net);
  }

  onLeave(client: Client): void {
    this.seats.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  private receiveInput(client: Client, raw: unknown): void {
    const seat = this.seats.get(client.sessionId);
    const input = parseInput(raw);
    if (!seat || !input || input.seq <= seat.lastSeq) return;
    seat.lastSeq = input.seq;
    seat.queue.push(input);
    if (seat.queue.length > MAX_QUEUE) seat.queue.shift();
  }

  private step(): void {
    this.state.tick++;
    for (const [sessionId, seat] of this.seats) {
      const net = this.state.players.get(sessionId);
      if (!net) continue;
      // Cada comando é simulado exatamente uma vez, na ordem: é o que o cliente previu.
      const steps = seat.queue.length > CATCH_UP_QUEUE ? 2 : 1;
      for (let i = 0; i < steps; i++) {
        const input = seat.queue.shift();
        if (input) {
          seat.starved = 0;
          stepPlayer(seat.player, input.buttons, this.arena, this.params);
          net.ack = input.seq;
        } else if (++seat.starved > STARVE_TICKS) {
          stepPlayer(seat.player, 0, this.arena, this.params);
        }
      }
      copyToNet(seat.player, net);
    }
  }
}

function copyToNet(s: PlayerState, net: PlayerSchema): void {
  net.x = s.x;
  net.y = s.y;
  net.vx = s.vx;
  net.vy = s.vy;
  net.onGround = s.onGround;
  net.onOneWay = s.onOneWay;
  net.coyote = s.coyote;
  net.jumpBuffer = s.jumpBuffer;
  net.jumpHeld = s.jumpHeld;
  net.facing = s.facing;
  net.prevButtons = s.prevButtons;
}
