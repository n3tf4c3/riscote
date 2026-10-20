import { randomInt } from 'node:crypto';
import { Room, matchMaker, type Client } from '@colyseus/core';
import {
  ARENAS,
  MAX_PLAYERS,
  MSG_INPUT,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  TICK_RATE,
  World,
  parseInput,
  type CreateRoomOptions,
  type InputMessage,
  type WorldPlayer,
} from '@riscote/shared';
import { DropSchema, EnemySchema, GameState, PlayerSchema } from './state.ts';

/** Fila acima disto descarta os comandos mais antigos: limita o atraso acumulado (~130 ms). */
const MAX_QUEUE = 8;
/** Fila acima disto aplica dois comandos no mesmo tick para recuperar o atraso. */
const CATCH_UP_QUEUE = 3;
/** Sem comandos por mais que isto, o jogador segue a simulação com os botões soltos. */
const STARVE_TICKS = 10;
const PATCH_RATE_MS = 1000 / 30;

interface Seat {
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
  /** Ondas automáticas de inimigos. Só subclasses de teste desligam; nunca vem do cliente. */
  protected readonly waves: boolean = true;
  private world!: World;
  private seats = new Map<string, Seat>();

  async onCreate(options: CreateRoomOptions = {}): Promise<void> {
    let code = randomCode();
    while ((await matchMaker.query({ roomId: code })).length > 0) code = randomCode();
    this.roomId = code;

    this.maxClients = MAX_PLAYERS;
    // 60 comandos/s mais folga; acima disso o cliente é desconectado.
    this.maxMessagesPerSecond = 120;
    const arena = ARENAS.find((a) => a.id === options.arenaId) ?? ARENAS[1]!;
    this.world = new World(arena, randomInt(2 ** 31), { waves: this.waves });

    const state = new GameState();
    state.arenaId = arena.id;
    state.tick = 0;
    this.state = state;
    this.sync();
    this.patchRate = PATCH_RATE_MS;

    this.onMessage(MSG_INPUT, (client, raw) => this.receiveInput(client, raw));
    this.setFixedTimestep(() => this.step(), TICK_RATE);
  }

  onJoin(client: Client): void {
    const used = new Set([...this.world.players.values()].map((p) => p.slot));
    let slot = 0;
    while (used.has(slot)) slot++;

    const player = this.world.addPlayer(client.sessionId, slot);
    this.seats.set(client.sessionId, { queue: [], lastSeq: -1, starved: 0 });
    const net = new PlayerSchema();
    net.slot = slot;
    net.ack = 0;
    this.state.players.set(client.sessionId, net);
    copyPlayer(player, net);
  }

  onLeave(client: Client): void {
    this.world.removePlayer(client.sessionId);
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
      // Cada comando é aplicado exatamente uma vez, na ordem: é o que o cliente previu.
      const steps = seat.queue.length > CATCH_UP_QUEUE ? 2 : 1;
      for (let i = 0; i < steps; i++) {
        const input = seat.queue.shift();
        if (input) {
          seat.starved = 0;
          this.world.applyInput(sessionId, input.buttons);
          net.ack = input.seq;
        } else if (++seat.starved > STARVE_TICKS) {
          this.world.applyInput(sessionId, 0);
        }
      }
    }
    this.world.step();
    this.sync();
  }

  /** Copia o mundo para o estado sincronizado. */
  private sync(): void {
    const w = this.world;
    const s = this.state;
    s.phase = w.phase;
    s.phaseTime = w.phaseTime;
    s.wave = w.wave;
    s.lives = w.lives;
    s.score = w.score;
    s.enemiesLeft = w.enemiesLeft;
    s.soakToBall = w.soakToBall;

    for (const [id, p] of w.players) {
      const net = s.players.get(id);
      if (net) copyPlayer(p, net);
    }

    for (const id of [...s.enemies.keys()]) if (!w.enemies.has(Number(id))) s.enemies.delete(id);
    for (const e of w.enemies.values()) {
      const key = String(e.id);
      let net = s.enemies.get(key);
      if (!net) {
        net = new EnemySchema();
        net.kind = e.kind;
        s.enemies.set(key, net);
      }
      net.mode = e.mode;
      net.x = e.body.x;
      net.y = e.body.y;
      net.facing = e.dir;
      net.soak = e.soak;
    }

    for (const id of [...s.drops.keys()]) if (!w.drops.has(Number(id))) s.drops.delete(id);
    for (const d of w.drops.values()) {
      const key = String(d.id);
      let net = s.drops.get(key);
      if (!net) {
        net = new DropSchema();
        net.slot = d.slot;
        s.drops.set(key, net);
      }
      net.x = d.x;
      net.y = d.y;
    }
  }
}

function copyPlayer(p: WorldPlayer, net: PlayerSchema): void {
  const s = p.body;
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
  net.ink = p.ink;
  net.down = p.down;
  net.rescue = p.rescue;
  net.invuln = p.invuln;
  net.kills = p.kills;
}
