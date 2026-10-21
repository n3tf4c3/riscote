import { randomInt } from 'node:crypto';
import { Room, matchMaker, type Client } from '@colyseus/core';
import {
  MAX_PLAYERS,
  MSG_INPUT,
  MSG_NAME,
  MSG_RECORDS,
  MSG_REPORT,
  MSG_START,
  PHASE_CHAPTER,
  PHASE_RESTART,
  RECORD_NAME_TRIES,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  TICK_RATE,
  World,
  chapterFrom,
  isBossArena,
  withBoss,
  parseDifficulty,
  parseInput,
  parseRecordName,
  placeholderName,
  type CreateRoomOptions,
  type InputMessage,
  type RecordsMessage,
  type RunEnd,
  type WorldPlayer,
} from '@riscote/shared';
import { recordTick, processMetrics } from './metrics.ts';
import { RecordBook } from './records.ts';
import { BossSchema, DropSchema, EnemySchema, GameState, HazardSchema, ItemSchema, PlayerSchema, SpitSchema, StainSchema } from './state.ts';

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

/** Fim de jogo esperando os nomes: a linha do placar e quem ainda pode escrever. */
interface PendingRecord {
  message: RecordsMessage;
  /** Posição de cada jogador na lista de nomes da linha. */
  index: Map<string, number>;
  tries: Map<string, number>;
}

function randomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  return code;
}

export class ArenaRoom extends Room<{ state: GameState }> {
  /** Placar de recordes do servidor, comum a todas as salas (index.ts liga a pasta de dados). */
  static records = new RecordBook(null);
  /** Ondas automáticas de inimigos. Só subclasses de teste desligam; nunca vem do cliente. */
  protected readonly waves: boolean = true;
  /** Segundos de vaga reservada depois de uma queda de conexão (plano, seção 4.4). */
  protected readonly reconnectSeconds: number = 30;
  private world!: World;
  private seats = new Map<string, Seat>();
  /** Ordem de chegada: o primeiro é o anfitrião; se ele sair, o seguinte assume. */
  private arrivals: string[] = [];
  private pending: PendingRecord | null = null;

  async onCreate(options: CreateRoomOptions = {}): Promise<void> {
    let code = randomCode();
    while ((await matchMaker.query({ roomId: code })).length > 0) code = randomCode();
    this.roomId = code;

    this.maxClients = MAX_PLAYERS;
    // 60 comandos/s mais folga; acima disso o cliente é desconectado.
    this.maxMessagesPerSecond = 120;
    // Capítulo da arena escolhida na criação da sala, sempre da 1ª fase; o chefe fecha o capítulo.
    const arenas = chapterFrom(options.arenaId);
    const chapter = withBoss(arenas, arenas.length);
    const difficulty = parseDifficulty(options.difficulty);
    this.world = new World(chapter, randomInt(2 ** 31), { waves: this.waves, difficulty });

    const state = new GameState();
    state.tick = 0;
    state.difficulty = difficulty;
    state.hostId = '';
    state.boss = new BossSchema();
    this.state = state;
    this.sync();
    this.patchRate = PATCH_RATE_MS;

    this.onMessage(MSG_INPUT, (client, raw) => this.receiveInput(client, raw));
    // Só o anfitrião encerra o aquecimento; de outro jogador, a mensagem é ignorada.
    this.onMessage(MSG_START, (client) => {
      if (client.sessionId === this.state.hostId) this.world.start();
    });
    this.onMessage(MSG_NAME, (client, raw) => this.receiveName(client, raw));
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
    // A mensagem do placar pode ter saído durante a queda.
    if (this.pending) client.send(MSG_RECORDS, this.pending.message);
  }

  /** Saída definitiva: por vontade própria ou fim do prazo de reconexão. */
  onLeave(client: Client): void {
    this.world.removePlayer(client.sessionId);
    this.seats.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.arrivals = this.arrivals.filter((id) => id !== client.sessionId);
    processMetrics.players--;
    this.state.hostId = this.arrivals[0] ?? '';
    // Quem saiu fica com o nome provisório.
    if (this.pending?.message.waiting.includes(client.sessionId)) this.settleName(client.sessionId);
  }

  /** Fim de jogo com pontos: a partida entra no placar com nomes provisórios, que cada um troca pelo seu. */
  private openRecords(run: RunEnd): void {
    const book = ArenaRoom.records;
    const difficulty = this.world.difficulty;
    const players = run.players.filter((id) => this.world.players.has(id));
    const names = players.map((id) => placeholderName(this.world.players.get(id)!.slot));
    const entryId = book.add(difficulty, { score: run.score, names, reason: run.reason, arena: run.arena });
    this.pending = {
      message: { difficulty, entries: book.list(difficulty), entryId, score: run.score, reason: run.reason, waiting: entryId ? players : [] },
      index: new Map(players.map((id, i) => [id, i])),
      tries: new Map(),
    };
    console.log(JSON.stringify({ recorde: run.reason, sala: this.roomId, dificuldade: difficulty, pontos: run.score, entrou: entryId !== null }));
    this.broadcast(MSG_RECORDS, this.pending.message);
    if (this.pending.message.waiting.length === 0) this.world.closeRecords();
  }

  /** Só o nome vem do navegador; uma vez por jogador e por fim de jogo, com tentativas limitadas. */
  private receiveName(client: Client, raw: unknown): void {
    const pending = this.pending;
    const id = client.sessionId;
    const entryId = pending?.message.entryId;
    if (!pending || !entryId || !pending.message.waiting.includes(id)) return;
    const tries = (pending.tries.get(id) ?? 0) + 1;
    pending.tries.set(id, tries);
    if (tries > RECORD_NAME_TRIES) return;
    const name = parseRecordName(typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).name : undefined);
    if (!name) return;
    ArenaRoom.records.rename(this.world.difficulty, entryId, pending.index.get(id)!, name);
    this.settleName(id);
  }

  /** Mais um nome resolvido: a sala recebe o placar atualizado; com todos resolvidos, a pausa encurta. */
  private settleName(id: string): void {
    const pending = this.pending!;
    const message = pending.message;
    message.waiting = message.waiting.filter((w) => w !== id);
    message.entries = ArenaRoom.records.list(message.difficulty);
    this.broadcast(MSG_RECORDS, message);
    if (message.waiting.length === 0) this.world.closeRecords();
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
    for (const run of this.world.takeRunEnds()) this.openRecords(run);
    // A pausa do placar acabou: nomes que chegarem depois disso são ignorados.
    if (this.pending && this.world.phase !== PHASE_RESTART && this.world.phase !== PHASE_CHAPTER) this.pending = null;
  }

  /** O chefe e os perigos dele; fora da página do chefe (ou depois da queda), `maxHp` 0. */
  private syncBoss(): void {
    const b = this.world.boss;
    const net = this.state.boss!;
    const hazards = this.state.hazards;
    const live = b && !b.gone ? b : null;
    net.maxHp = live ? live.maxHp : 0;
    if (live) {
      net.state = live.state;
      net.attack = live.attack;
      net.x = live.x;
      net.y = live.y;
      net.dir = live.dir;
      net.hp = live.hp;
      net.soak = live.soak;
      net.soakMax = live.soakMax;
      net.timer = live.timer;
      net.targetX = live.targetX;
      net.impacts = live.impacts;
      net.hits = live.hits;
    }
    for (const id of [...hazards.keys()]) if (!live?.hazards.has(Number(id))) hazards.delete(id);
    for (const z of live?.hazards.values() ?? []) {
      const key = String(z.id);
      let h = hazards.get(key);
      if (!h) {
        h = new HazardSchema();
        h.kind = z.kind;
        h.w = z.w;
        h.h = z.h;
        hazards.set(key, h);
      }
      h.x = z.x;
      h.y = z.y;
      h.wait = Math.max(0, z.wait);
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
    const next = w.chapter[w.arenaIndex + 1];
    s.bossNext = next !== undefined && isBossArena(next);
    this.syncBoss();

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
      net.skill = e.skill;
      net.anchorY = e.anchorY;
    }

    for (const id of [...s.spits.keys()]) if (!w.spits.has(Number(id))) s.spits.delete(id);
    for (const spit of w.spits.values()) {
      const key = String(spit.id);
      let net = s.spits.get(key);
      if (!net) {
        net = new SpitSchema();
        s.spits.set(key, net);
      }
      net.x = spit.x;
      net.y = spit.y;
    }

    for (const id of [...s.stains.keys()]) if (!w.stains.has(Number(id))) s.stains.delete(id);
    for (const stain of w.stains.values()) {
      const key = String(stain.id);
      let net = s.stains.get(key);
      if (!net) {
        net = new StainSchema();
        net.x = stain.x;
        net.y = stain.y;
        s.stains.set(key, net);
      }
      net.age = stain.age;
    }

    for (const id of [...s.items.keys()]) if (!w.items.has(Number(id))) s.items.delete(id);
    for (const item of w.items.values()) {
      const key = String(item.id);
      let net = s.items.get(key);
      if (!net) {
        net = new ItemSchema();
        net.kind = item.kind;
        net.x = item.x;
        net.y = item.y;
        s.items.set(key, net);
      }
      net.ttl = item.ttl;
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
  net.hp = p.hp;
  net.strength = p.strength;
  net.speed = p.speed;
  net.rate = p.rate;
  net.range = p.range;
  net.star = p.star;
}
