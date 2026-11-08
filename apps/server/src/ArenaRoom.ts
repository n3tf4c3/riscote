import { randomInt } from 'node:crypto';
import { ErrorCode, Room, ServerError, matchMaker, type Client } from '@colyseus/core';
import {
  CLOSE_LOBBY_IDLE,
  LOBBY_IDLE_MINUTES,
  MSG_GIVE_UP,
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
  TICK_DT,
  TICK_RATE,
  campaignFrom,
  chapterPage,
  PHASE_LOBBY,
  ONLINE_FULL,
  ROOM_FULL,
  World,
  isBossArena,
  parseDifficulty,
  parseInput,
  parseCharacter,
  parseLocalKey,
  parseRecordName,
  parseSeats,
  placeholderName,
  type CreateRoomOptions,
  type InputMessage,
  type JoinOptions,
  type RecordsMessage,
  type RoomSummary,
  type RunEnd,
  type WorldPlayer,
} from '@riscote/shared';
import { recordTick, processMetrics } from './metrics.ts';
import { RecordBook } from './records.ts';
import { BossSchema, DropSchema, EnemySchema, GameState, HazardSchema, ItemSchema, PlayerSchema, SpitSchema, SproutSchema, StainSchema } from './state.ts';

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
  /** Salas abertas neste processo, para a lista da capa (`summary`). */
  static rooms = new Set<ArenaRoom>();
  /** Ondas automáticas de inimigos. Só subclasses de teste desligam; nunca vem do cliente. */
  protected readonly waves: boolean = true;
  /** Segundos de vaga reservada depois de uma queda de conexão (plano, seção 4.4). */
  protected readonly reconnectSeconds: number = 30;
  /** Segundos no aquecimento sem comando de ninguém até a sala fechar: uma sala esquecida (ou de robô) não ocupa vaga para sempre. */
  protected readonly lobbyIdleSeconds: number = LOBBY_IDLE_MINUTES * 60;
  /** Ticks seguidos no aquecimento sem nenhum comando aplicado. */
  private idleTicks = 0;
  private world!: World;
  private seats = new Map<string, Seat>();
  /** Ordem de chegada: o primeiro é o anfitrião; se ele sair, o seguinte assume. */
  private arrivals: string[] = [];
  private pending: PendingRecord | null = null;
  /** Nomes escolhidos na entrada; quem não escolheu fica de fora e aparece como "Jogador N". */
  private names = new Map<string, string>();
  /** Aberta: código e nomes na lista da capa. Privada: só a contagem. */
  private open = false;
  /** Vagas do computador que criou a sala e da internet (pedido do usuário em 2026-11-01). */
  private seatsLocal = 1;
  private seatsOnline = 0;
  /** Chave de quem joga no computador que criou a sala; null depois que todos eles saem. */
  private localKey: string | null = null;
  /** Que vaga cada um ocupa, desde a autorização (antes do onJoin) até a saída definitiva. */
  private kinds = new Map<string, 'local' | 'online'>();
  /** Alguém já entrou: o primeiro é quem criou a sala. */
  private joinedOnce = false;

  async onCreate(options: CreateRoomOptions = {}): Promise<void> {
    let code = randomCode();
    while ((await matchMaker.query({ roomId: code })).length > 0) code = randomCode();
    this.roomId = code;

    const seats = parseSeats(options.local, options.online);
    this.seatsLocal = seats.local;
    this.seatsOnline = seats.online;
    this.localKey = parseLocalKey(options.localKey);
    // O Colyseus tranca a sala sozinho ao chegar aqui; a divisão entre as vagas fica no onAuth.
    this.maxClients = seats.local + seats.online;
    // 60 comandos/s mais folga; acima disso o cliente é desconectado.
    this.maxMessagesPerSecond = 120;
    // Campanha a partir do capítulo da arena escolhida, sempre da 1ª fase: cada capítulo fecha com o
    // chefe dele e, vencido, segue para o próximo com os pontos e as vidas (2026-11-04), até o último.
    const campaign = campaignFrom(options.arenaId);
    // Só `true` abre a sala: cliente antigo, sem o campo, continua com sala privada.
    this.open = options.open === true;
    // A privada fica fora do matchmaking por nome (join/joinOrCreate): só entra pelo código (joinById),
    // como a capa promete (auditoria de 2026-11-06, achado 8).
    await this.setPrivate(!this.open);
    const difficulty = parseDifficulty(options.difficulty);
    this.world = new World(campaign.arenas, randomInt(2 ** 31), { waves: this.waves, difficulty, chapterEnds: campaign.chapterEnds });

    const state = new GameState();
    state.tick = 0;
    state.difficulty = difficulty;
    state.hostId = '';
    state.boss = new BossSchema();
    state.capacity = this.maxClients;
    state.seatsLocal = this.seatsLocal;
    state.seatsOnline = this.seatsOnline;
    this.state = state;
    this.sync();
    this.patchRate = PATCH_RATE_MS;

    this.onMessage(MSG_INPUT, (client, raw) => this.receiveInput(client, raw));
    // Só o anfitrião encerra o aquecimento; de outro jogador, a mensagem é ignorada.
    this.onMessage(MSG_START, (client) => {
      if (client.sessionId === this.state.hostId) this.world.start();
    });
    // Desistir também é só do anfitrião: a partida inteira vira fim de jogo.
    this.onMessage(MSG_GIVE_UP, (client) => {
      if (client.sessionId === this.state.hostId) this.world.giveUp();
    });
    this.onMessage(MSG_NAME, (client, raw) => this.receiveName(client, raw));
    this.setFixedTimestep(() => {
      const started = performance.now();
      this.step();
      recordTick(performance.now() - started);
    }, TICK_RATE);
    processMetrics.rooms++;
    ArenaRoom.rooms.add(this);
  }

  onDispose(): void {
    processMetrics.rooms--;
    ArenaRoom.rooms.delete(this);
  }

  /** Lista da capa: abertas primeiro, depois as mais cheias. */
  static list(): RoomSummary[] {
    return [...ArenaRoom.rooms].map((r) => r.summary()).sort((a, b) => Number(!!b.code) - Number(!!a.code) || b.players - a.players);
  }

  /** A sala na lista da capa; a privada não revela código nem nomes. */
  summary(): RoomSummary {
    const s = this.state;
    const names = this.arrivals.map((id) => s.players.get(id)?.name ?? '').filter(Boolean);
    const where = chapterPage(this.world.arena.id);
    return {
      code: this.open ? this.roomId : null,
      players: this.world.players.size,
      capacity: this.maxClients,
      vacant: Math.max(0, Math.min(this.seatsOnline - this.count('online'), this.maxClients - this.kinds.size)),
      names: this.open ? names : [],
      // O capítulo e a página em que a equipe está agora (a campanha passa de um capítulo para o outro).
      chapter: where?.chapter ?? 0,
      difficulty: this.world.difficulty,
      playing: this.world.phase !== PHASE_LOBBY,
      page: (where?.page ?? 1) - 1,
      pages: where?.pages ?? this.world.chapter.length,
    };
  }

  private count(kind: 'local' | 'online'): number {
    let n = 0;
    for (const k of this.kinds.values()) if (k === kind) n++;
    return n;
  }

  /**
   * Divide as vagas: quem criou a sala e quem entra com a chave dela ocupam as do computador; os
   * outros, as da internet. Com as locais cheias, quem tem a chave ainda pode usar uma da internet.
   * A vaga é contada já aqui, antes do onJoin, para duas entradas ao mesmo tempo não passarem juntas.
   */
  onAuth(client: Client, options: JoinOptions = {}): true {
    const creator = !this.joinedOnce;
    this.joinedOnce = true;
    const keyed = creator || (this.localKey !== null && parseLocalKey(options?.localKey) === this.localKey);
    let kind: 'local' | 'online';
    if (keyed && this.count('local') < this.seatsLocal) kind = 'local';
    else if (this.count('online') < this.seatsOnline) kind = 'online';
    else throw new ServerError(ErrorCode.AUTH_FAILED, keyed ? ROOM_FULL : ONLINE_FULL);
    this.kinds.set(client.sessionId, kind);
    return true;
  }

  onJoin(client: Client, options: JoinOptions = {}): void {
    const used = new Set([...this.world.players.values()].map((p) => p.slot));
    // O personagem escolhido na capa, se ninguém da sala já estiver com ele; senão, o primeiro livre.
    const wanted = parseCharacter(options?.character);
    let slot = wanted !== null && !used.has(wanted) ? wanted : 0;
    while (used.has(slot)) slot++;

    const player = this.world.addPlayer(client.sessionId, slot);
    this.seats.set(client.sessionId, { queue: [], lastSeq: -1, starved: 0 });
    const net = new PlayerSchema();
    net.slot = slot;
    net.ack = 0;
    const name = parseRecordName(options?.name);
    if (name) this.names.set(client.sessionId, name);
    net.name = name ?? placeholderName(slot);
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
    this.releaseSeat(client.sessionId);
    // Saiu entre a autorização e a entrada: não chegou a ganhar boneco.
    if (!this.seats.has(client.sessionId)) return;
    this.world.removePlayer(client.sessionId);
    this.seats.delete(client.sessionId);
    this.names.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.arrivals = this.arrivals.filter((id) => id !== client.sessionId);
    processMetrics.players--;
    this.state.hostId = this.arrivals[0] ?? '';
    // Quem saiu fica com o nome provisório.
    if (this.pending?.message.waiting.includes(client.sessionId)) this.settleName(client.sessionId);
  }

  /** Libera a vaga; sem ninguém do computador que criou a sala, as vagas reservadas a ele passam para a internet. */
  private releaseSeat(id: string): void {
    this.kinds.delete(id);
    if (this.localKey === null && this.seatsLocal === 0) return;
    if (this.count('local') > 0) return;
    this.localKey = null;
    this.seatsLocal = 0;
    this.seatsOnline = this.maxClients;
    this.state.seatsLocal = 0;
    this.state.seatsOnline = this.maxClients;
  }

  /** Fim de jogo com pontos: a partida entra no placar com nomes provisórios, que cada um troca pelo seu. */
  private openRecords(run: RunEnd): void {
    const book = ArenaRoom.records;
    const difficulty = this.world.difficulty;
    const players = run.players.filter((id) => this.world.players.has(id));
    // Quem entrou com nome já vai com ele; os outros ficam provisórios até escrever.
    const names = players.map((id) => this.names.get(id) ?? placeholderName(this.world.players.get(id)!.slot));
    const unnamed = players.filter((id) => !this.names.has(id));
    const entryId = book.add(difficulty, { score: run.score, names, reason: run.reason, arena: run.arena });
    this.pending = {
      message: {
        difficulty, entries: book.list(difficulty), entryId, score: run.score, reason: run.reason, waiting: entryId ? unnamed : [], saved: book.saved,
      },
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
    message.saved = ArenaRoom.records.saved;
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
    let active = false;
    for (const [sessionId, seat] of this.seats) {
      const net = this.state.players.get(sessionId);
      if (!net) continue;
      // Cada comando é aplicado exatamente uma vez, na ordem: é o que o cliente previu.
      const steps = seat.queue.length > CATCH_UP_QUEUE ? 2 : 1;
      for (let i = 0; i < steps; i++) {
        const input = seat.queue.shift();
        if (input) {
          active = true;
          seat.starved = 0;
          this.world.applyInput(sessionId, input.buttons);
          net.ack = input.seq;
        } else if (++seat.starved > STARVE_TICKS) {
          this.world.applyInput(sessionId, 0);
        }
      }
    }
    // Uma aba aberta manda comando a cada quadro, mesmo sem tecla; só a sala parada no aquecimento fecha.
    if (active || this.world.phase !== PHASE_LOBBY) this.idleTicks = 0;
    else if (++this.idleTicks >= this.lobbyIdleSeconds * TICK_RATE) {
      this.idleTicks = 0;
      void this.disconnect(CLOSE_LOBBY_IDLE);
      return;
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
      net.targetY = live.targetY;
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
        hazards.set(key, h);
      }
      // O tamanho também muda: a água da enxurrada sobe e escoa.
      h.w = z.w;
      h.h = z.h;
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
      net.aimX = e.aimX;
      net.aimY = e.aimY;
    }

    for (const id of [...s.spits.keys()]) if (!w.spits.has(Number(id))) s.spits.delete(id);
    for (const spit of w.spits.values()) {
      const key = String(spit.id);
      let net = s.spits.get(key);
      if (!net) {
        net = new SpitSchema();
        net.kind = spit.kind;
        s.spits.set(key, net);
      }
      net.x = spit.x;
      net.y = spit.y;
    }

    for (const id of [...s.sprouts.keys()]) if (!w.sprouts.has(Number(id))) s.sprouts.delete(id);
    for (const sprout of w.sprouts.values()) {
      const key = String(sprout.id);
      let net = s.sprouts.get(key);
      if (!net) {
        net = new SproutSchema();
        net.x = sprout.x;
        net.y = sprout.y;
        s.sprouts.set(key, net);
      }
      net.age = sprout.age;
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
        net.big = d.big;
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
  net.charge = p.chargeTicks * TICK_DT;
}
