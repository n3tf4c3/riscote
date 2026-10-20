import { randomInt } from 'node:crypto';
import { Room, matchMaker, type Client } from '@colyseus/core';
import {
  ARENAS,
  MAX_PLAYERS,
  MSG_INPUT,
  MSG_REPORT,
  MSG_START,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  TICK_RATE,
  World,
  parseInput,
  type CreateRoomOptions,
  type InputMessage,
  type WorldPlayer,
} from '@riscote/shared';
import { recordTick, processMetrics } from './metrics.ts';
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
  /** Segundos de vaga reservada depois de uma queda de conexão (plano, seção 4.4). */
  protected readonly reconnectSeconds: number = 30;
  private world!: World;
  private seats = new Map<string, Seat>();
  /** Ordem de chegada: o primeiro é o anfitrião; se ele sair, o seguinte assume. */
  private arrivals: string[] = [];

  async onCreate(options: CreateRoomOptions = {}): Promise<void> {
    let code = randomCode();
    while ((await matchMaker.query({ roomId: code })).length > 0) code = randomCode();
    this.roomId = code;

    this.maxClients = MAX_PLAYERS;
    // 60 comandos/s mais folga; acima disso o cliente é desconectado.
    this.maxMessagesPerSecond = 120;
    // Capítulo: todas as arenas, começando pela escolhida na criação da sala.
    const found = ARENAS.findIndex((a) => a.id === options.arenaId);
    const first = found >= 0 ? found : 1; // padrão: a arena Padrão
    const chapter = [...ARENAS.slice(first), ...ARENAS.slice(0, first)];
    this.world = new World(chapter, randomInt(2 ** 31), { waves: this.waves });

    const state = new GameState();
    state.tick = 0;
    state.hostId = '';
    this.state = state;
    this.sync();
    this.patchRate = PATCH_RATE_MS;

    this.onMessage(MSG_INPUT, (client, raw) => this.receiveInput(client, raw));
    // Só o anfitrião encerra o aquecimento; de outro jogador, a mensagem é ignorada.
    this.onMessage(MSG_START, (client) => {
      if (client.sessionId === this.state.hostId) this.world.start();
    });
    this.setFixedTimestep(() => {
      const started = performance.now();
      this.step();
      recordTick(performance.now() - started);
    }, TICK_RATE);
    processMetrics.rooms++;
  }

  onDispose(): void {
    processMetrics.rooms--;
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
    this.arrivals.push(client.sessionId);
    processMetrics.players++;
    this.state.hostId = this.arrivals[0]!;
  }

  /** Queda sem despedida: o boneco fica ausente e a vaga, reservada (conta no limite de 5). */
  onDrop(client: Client): void {
    this.world.setAway(client.sessionId, true);
    const seat = this.seats.get(client.sessionId);
    if (seat) seat.queue = [];
    const net = this.state.players.get(client.sessionId);
    if (net) net.away = true;
    this.allowReconnection(client, this.reconnectSeconds);
  }

  onReconnect(client: Client): void {
    this.world.setAway(client.sessionId, false);
  }

  /** Saída definitiva: por vontade própria ou fim do prazo de reconexão. */
  onLeave(client: Client): void {
    this.world.removePlayer(client.sessionId);
    this.seats.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.arrivals = this.arrivals.filter((id) => id !== client.sessionId);
    processMetrics.players--;
    this.state.hostId = this.arrivals[0] ?? '';
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
    for (const report of this.world.takeReports()) {
      // Métricas de playtest: uma linha JSON por arena no log do servidor e o mesmo relatório para a sala.
      console.log(JSON.stringify({ relatorio: 'arena', sala: this.roomId, ...report }));
      this.broadcast(MSG_REPORT, report);
    }
  }

  /** Copia o mundo para o estado sincronizado. */
  private sync(): void {
    const w = this.world;
    const s = this.state;
    s.arenaId = w.arena.id;
    s.arenaIndex = w.arenaIndex;
    s.arenaCount = w.chapter.length;
    s.waveTime = w.waveTime;
    s.hurry = w.hurry;
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
  net.away = p.away;
}
