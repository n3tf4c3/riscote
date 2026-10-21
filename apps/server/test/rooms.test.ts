import { createServer } from 'node:http';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import {
  ARENAS,
  BTN_ATTACK,
  BTN_JUMP,
  BTN_LEFT,
  BTN_RIGHT,
  DEFAULT_PARAMS,
  ENEMY_FIANDEIRA,
  Interpolator,
  TILE,
  MAX_PLAYERS,
  MSG_INPUT,
  MSG_REPORT,
  MSG_START,
  PHASE_LOBBY,
  PHASE_PLAYING,
  Predictor,
  ROOM_NAME,
  ITEM_AGILIDADE,
  TOO_MANY_JOINS,
  movementParams,
  parseDifficulty,
  seededRandom,
  createPlayer,
  describeJoinError,
  normalizeRoomCode,
  stepPlayer,
} from '@riscote/shared';
import { ArenaRoom } from '../src/ArenaRoom.ts';
import { AttemptLimiter, limitJoins, markPeerAddress } from '../src/joinLimit.ts';

const ROOM_WITH_ENEMIES = 'arena-com-inimigos';
/** Regras da 1ª fase do capítulo 1, onde as salas de teste começam. */
const margem = ARENAS.find((a) => a.id === 'margem')!.stage!;

/** Sala sem inimigos: isola os testes de rede e autoridade do movimento. */
class QuietRoom extends ArenaRoom {
  protected override readonly waves = false;
}

/** Prazo de reconexão curto para testar a expiração da vaga reservada. */
class FastReconnectRoom extends QuietRoom {
  protected override readonly reconnectSeconds = 1;
}
const ROOM_FAST_RECONNECT = 'arena-reconexao-rapida';

let t: ColyseusTestServer;

beforeAll(async () => {
  const http = createServer();
  markPeerAddress(http);
  const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false, gracefullyShutdown: false });
  server.define(ROOM_NAME, QuietRoom);
  server.define(ROOM_WITH_ENEMIES, ArenaRoom);
  server.define(ROOM_FAST_RECONNECT, FastReconnectRoom);
  t = await boot(server);
});
afterEach(async () => {
  await t.cleanup();
});
afterAll(async () => {
  await t.shutdown();
});

async function until(cond: () => boolean, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('tempo esgotado esperando a condição');
    await new Promise((r) => setTimeout(r, 1));
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function newRoom(arenaId = 'margem'): Promise<ArenaRoom> {
  return (await t.createRoom(ROOM_NAME, { arenaId })) as unknown as ArenaRoom;
}

async function joinError(roomId: string): Promise<string> {
  try {
    await t.sdk.joinById(roomId);
  } catch (e) {
    return describeJoinError(e);
  }
  throw new Error('a entrada deveria ter sido recusada');
}

describe('salas', () => {
  it('cria a sala com código legível e o capítulo da arena escolhida, a partir da 1ª fase', async () => {
    const room = await newRoom('mapa');
    expect(normalizeRoomCode(room.roomId)).toBe(room.roomId);
    expect(room.state.arenaId).toBe('partitura');
    expect((await newRoom('inexistente')).state.arenaId).toBe('margem');
  });

  it('a dificuldade escolhida vale para a sala; valor desconhecido vira médio', async () => {
    const hard = (await t.createRoom(ROOM_NAME, { difficulty: 'dificil' })) as unknown as ArenaRoom;
    expect(hard.state.difficulty).toBe('dificil');
    expect((hard as any).world.limitedInk).toBe(true);
    const odd = (await t.createRoom(ROOM_NAME, { difficulty: 'impossivel' })) as unknown as ArenaRoom;
    expect(odd.state.difficulty).toBe('medio');
    expect((odd as any).world.limitedInk).toBe(false);
  });

  it(`${MAX_PLAYERS} jogadores entram; o seguinte recebe "sala cheia"; quem sai libera a vaga`, async () => {
    const room = await newRoom();
    const clients = [];
    for (let i = 0; i < MAX_PLAYERS; i++) clients.push(await t.connectTo(room));
    expect(room.clients.length).toBe(MAX_PLAYERS);
    const slots = [...room.state.players.values()].map((p) => p.slot).sort();
    expect(slots).toEqual([0, 1, 2, 3, 4]);

    expect(await joinError(room.roomId)).toBe('Sala cheia: o limite é de 5 jogadores.');
    expect(room.clients.length).toBe(MAX_PLAYERS);

    const leaving = clients[2]!;
    await leaving.leave();
    await until(() => room.clients.length === MAX_PLAYERS - 1);
    const replacement = await t.connectTo(room);
    expect(room.state.players.get(replacement.sessionId)?.slot).toBe(2);
  });

  it('código inexistente recebe mensagem clara', async () => {
    expect(await joinError('ZZZZZZ')).toBe('Nenhuma sala com esse código.');
  });

  it('duas salas não compartilham jogadores nem estado', async () => {
    const roomA = await newRoom();
    const roomB = await newRoom();
    expect(roomA.roomId).not.toBe(roomB.roomId);
    const a = await t.connectTo(roomA);
    const b = await t.connectTo(roomB);
    const bStart = roomB.state.players.get(b.sessionId)!.x;

    for (let seq = 1; seq <= 8; seq++) a.send(MSG_INPUT, { seq, buttons: BTN_RIGHT });
    await until(() => roomA.state.players.get(a.sessionId)!.ack === 8);

    expect([...roomA.state.players.keys()]).toEqual([a.sessionId]);
    expect([...roomB.state.players.keys()]).toEqual([b.sessionId]);
    expect(roomA.state.players.get(a.sessionId)!.x).toBeGreaterThan(bStart);
    expect(roomB.state.players.get(b.sessionId)!.x).toBe(bStart);
    expect(roomB.state.players.get(b.sessionId)!.ack).toBe(0);
  });
});

describe('autoridade do servidor', () => {
  it('ignora mensagens fora do formato, inclusive posição enviada pelo cliente', async () => {
    const room = await newRoom();
    const c = await t.connectTo(room);
    const start = room.state.players.get(c.sessionId)!.x;

    for (const bad of [
      { seq: 1, buttons: 999 },
      { seq: 1, x: 500 },
      { seq: 1, buttons: BTN_RIGHT, x: 500 }, // campos extras são descartados: só seq e botões contam
      'oi',
      { seq: -1, buttons: BTN_RIGHT },
      { seq: 1.5, buttons: BTN_RIGHT },
    ]) {
      c.send(MSG_INPUT, bad);
    }
    await sleep(100);
    const net = room.state.players.get(c.sessionId)!;
    // Só a mensagem válida (seq 1, direita) contou; o x enviado foi ignorado.
    expect(net.ack).toBe(1);
    expect(net.x).toBeLessThan(start + 10);

    // Comando repetido ou antigo não é reaplicado.
    const afterValid = net.x;
    for (let i = 0; i < 5; i++) c.send(MSG_INPUT, { seq: 1, buttons: BTN_LEFT });
    await sleep(100);
    expect(room.state.players.get(c.sessionId)!.x).toBeGreaterThanOrEqual(afterValid);
  });

  it('o estado do servidor é a simulação compartilhada aplicada aos comandos, e os clientes convergem para ele', async () => {
    const room = await newRoom();
    const mover = await t.connectTo(room);
    const watcher = await t.connectTo(room);
    const arena = ARENAS.find((x) => x.id === 'margem')!;
    const params = { ...DEFAULT_PARAMS };
    const local = createPlayer(arena.playerSpawns[0]!, params);

    // 90 comandos a ~60 Hz, alternando correr, pular e voltar.
    const pattern = [BTN_RIGHT, BTN_RIGHT | BTN_JUMP, BTN_LEFT, 0, BTN_LEFT | BTN_JUMP];
    const total = 90;
    for (let seq = 1; seq <= total; seq++) {
      const buttons = pattern[Math.floor(seq / 12) % pattern.length]!;
      mover.send(MSG_INPUT, { seq, buttons });
      stepPlayer(local, buttons, arena, params);
      await sleep(1000 / 60);
    }
    await until(() => room.state.players.get(mover.sessionId)!.ack === total);
    const net = room.state.players.get(mover.sessionId)!;
    expect(net.x).toBe(local.x);
    expect(net.y).toBe(local.y);
    expect(net.vy).toBe(local.vy);

    // Os dois clientes recebem o mesmo estado autoritativo do jogador que se moveu.
    const view = (c: typeof mover) => c.state.players.get(mover.sessionId);
    await until(() => view(mover)?.ack === total && view(watcher)?.ack === total);
    expect(view(mover)!.x).toBe(net.x);
    expect(view(watcher)!.x).toBe(net.x);
    expect(view(watcher)!.y).toBe(net.y);
  }, 10000);
});

/**
 * Atraso variável de 0 a jitter ms no envio, sem trocar a ordem (como no TCP): cada comando
 * sai no mínimo junto com o anterior. Sequência pseudoaleatória fixa para o teste ser reproduzível.
 */
const jitterRandom = seededRandom(2026);
let lastRelease = 0;
function sendWithJitter(room: { send(type: string, msg: unknown): void }, input: unknown, jitter: number) {
  if (jitter === 0) return room.send(MSG_INPUT, input);
  const release = Math.max(performance.now() + jitterRandom() * jitter, lastRelease);
  lastRelease = release;
  setTimeout(() => room.send(MSG_INPUT, input), release - performance.now());
}

describe('previsão e interpolação sob latência (critério da etapa 2)', () => {
  afterEach(() => {
    t.server.simulateLatency(0);
  });

  it.each([
    [0, 0],
    [100, 0],
    [200, 0],
    [100, 30],
  ])('%i ms de ida e volta, jitter de até %i ms: previsão sem correções e os outros veem movimento sem recuos', async (rtt, jitter) => {
    t.server.simulateLatency(rtt);
    await sleep(20);
    const room = await newRoom();
    const mover = await t.connectTo(room);
    const watcher = await t.connectTo(room);
    const arena = ARENAS.find((x) => x.id === 'margem')!;

    const predictor = new Predictor(arena, { ...DEFAULT_PARAMS }, mover.state.players.get(mover.sessionId)!);
    mover.onStateChange((s: any) => predictor.reconcile(s.players.get(mover.sessionId)));

    const seen = new Interpolator();
    watcher.onStateChange((s: any) => {
      const p = s.players.get(mover.sessionId);
      seen.push(performance.now(), [{ id: mover.sessionId, slot: p.slot, x: p.x, y: p.y, facing: p.facing }]);
    });

    // Só para a direita, com pulos: a posição exibida aos outros nunca deveria recuar.
    const samples: number[] = [];
    // Termina parado (botões soltos) para comparar sem o servidor ainda desacelerando o boneco.
    for (let tick = 0; tick < 120; tick++) {
      const buttons = tick >= 90 ? 0 : tick % 30 < 8 ? BTN_RIGHT | BTN_JUMP : BTN_RIGHT;
      sendWithJitter(mover, predictor.tick(buttons), jitter);
      const v = seen.sample(performance.now())[0];
      if (v) samples.push(v.x);
      await sleep(1000 / 60);
    }
    await until(() => predictor.pendingCount === 0, 3000);

    const server = room.state.players.get(mover.sessionId)!;
    // Correção só acontece quando o servidor passa >166 ms sem comandos e anda sozinho. Aqui servidor e
    // clientes dividem o mesmo processo de teste, e pausas do sistema às vezes causam isso: tolerância de 2.
    // O que não pode falhar é a convergência: no fim, previsão e servidor são idênticos.
    expect(predictor.corrections).toBeLessThanOrEqual(2);
    expect(predictor.state.x).toBe(server.x);
    expect(predictor.state.y).toBe(server.y);
    expect(samples.length).toBeGreaterThan(30);
    for (let i = 1; i < samples.length; i++) expect(samples[i]!).toBeGreaterThanOrEqual(samples[i - 1]!);
  }, 15000);
});

/** Resumo textual do estado decodificado por um cliente: tudo o que a partida tem de autoritativo. */
function digest(state: any): string {
  const sorted = (m: any) => {
    const out: Array<[string, any]> = [];
    m.forEach((v: any, k: string) => out.push([k, v]));
    return out.sort(([a], [b]) => (a < b ? -1 : 1));
  };
  const rows = [`t${state.tick} f${state.phase} v${state.lives} s${state.score} e${state.enemiesLeft}`];
  for (const [k, p] of sorted(state.players)) rows.push(`P${k}:${p.x},${p.y},${p.ack},${p.ink},${p.down},${p.kills}`);
  for (const [k, e] of sorted(state.enemies)) rows.push(`E${k}:${e.kind},${e.mode},${e.x},${e.y},${e.soak}`);
  for (const [k, d] of sorted(state.drops)) rows.push(`D${k}:${d.x},${d.y}`);
  return rows.join("|");
}

describe("partida com inimigos (etapa 3)", () => {
  it("dois clientes decodificam exatamente o mesmo estado autoritativo a cada tick", async () => {
    const room = (await t.createRoom(ROOM_WITH_ENEMIES, {})) as unknown as ArenaRoom;
    const a = await t.connectTo(room);
    const b = await t.connectTo(room);
    a.send(MSG_START);
    await until(() => (a.state as any).enemies.size > 0 && (b.state as any).enemies.size > 0);
    expect((a.state as any).enemiesLeft).toBe(Math.round(margem.base + margem.perPlayer * 2));

    let seqA = 0;
    let seqB = 0;
    let compared = 0;
    for (let tick = 0; tick < 120; tick++) {
      a.send(MSG_INPUT, { seq: ++seqA, buttons: tick % 20 < 2 ? BTN_ATTACK : BTN_RIGHT });
      b.send(MSG_INPUT, { seq: ++seqB, buttons: tick % 30 < 2 ? BTN_ATTACK | BTN_JUMP : BTN_LEFT });
      await sleep(1000 / 60);
      const sa = a.state as any;
      const sb = b.state as any;
      if (sa.tick === sb.tick) {
        expect(digest(sa)).toBe(digest(sb));
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(20);
  }, 15000);

  it('o cliente não altera pontos, vidas, tinta, abates nem a fase; tipo de mensagem desconhecido derruba o cliente', async () => {
    const room = (await t.createRoom(ROOM_WITH_ENEMIES, {})) as unknown as ArenaRoom;
    const c = await t.connectTo(room);
    c.send(MSG_START);
    c.send(MSG_INPUT, { seq: 1, buttons: 0, score: 99999, lives: 99, ink: 99, kills: 50, phase: 1 });
    c.send(MSG_INPUT, { seq: 2, buttons: 0, down: false, invuln: 999 });
    await sleep(150);
    const s = room.state;
    const me = s.players.get(c.sessionId)!;
    expect(s.tick).toBeGreaterThan(0);
    expect(s.score).toBe(0);
    expect(s.lives).toBe(5);
    expect(s.phase).toBe(0);
    expect(me.kills).toBe(0);
    expect(me.ink).toBe(12);
    expect(me.invuln).toBeLessThan(2);
    expect(me.ack).toBe(2);

    // Fora do modo de desenvolvimento, o Colyseus derruba quem manda um tipo não registrado.
    c.send('score', { score: 99999 });
    await until(() => room.clients.length === 0);
    expect(s.score).toBe(0);
  });
});

describe('progressão entre arenas (etapa 4)', () => {
  it('arena limpa: os clientes recebem o relatório e passam juntos para a próxima arena', async () => {
    const room = (await t.createRoom(ROOM_WITH_ENEMIES, { arenaId: 'margem' })) as unknown as ArenaRoom;
    const a = await t.connectTo(room);
    const b = await t.connectTo(room);
    const reports: any[] = [];
    a.onMessage(MSG_REPORT, (r: any) => reports.push(r));
    expect((a.state as any).arenaId).toBe('margem');
    expect((a.state as any).arenaCount).toBe(5); // as 4 fases do capítulo da arena escolhida, com o chefe no fim
    a.send(MSG_START);
    await until(() => (a.state as any).enemiesLeft > 0);

    // Atalho de teste: derrota todos os inimigos direto no mundo do servidor.
    const world = (room as any).world;
    world.enemies.clear();
    world.spawnQueue = 0;

    await until(() => reports.length === 1, 2000);
    expect(reports[0]).toMatchObject({ arena: 'margem', position: 1, outcome: 'limpa', players: 2 });
    await until(() => (a.state as any).arenaId === 'escadaria' && (b.state as any).arenaId === 'escadaria', 8000);
    expect((b.state as any).arenaIndex).toBe(1);
    const stage = ARENAS.find((x) => x.id === 'escadaria')!.stage!;
    expect((b.state as any).enemiesLeft).toBe(Math.round(stage.base + stage.perPlayer * 2));
  }, 15000);

  it('a fiandeira chega com o ponto do fio e o cuspe do tinteiro aparece para os clientes', async () => {
    const room = await newRoom();
    const c = await t.connectTo(room);
    const world = (room as any).world;
    // Margem: plataforma da linha 12 nas colunas 1 a 9.
    world.spawnEnemy(ENEMY_FIANDEIRA, { col: 5, row: 13 });
    world.spits.set(9001, { id: 9001, x: 10 * TILE, y: 14 * TILE, vx: 0, life: 5 });
    await until(() => (c.state as any).spits.size === 1 && (c.state as any).enemies.size === 1);
    let anchorY = 0;
    (c.state as any).enemies.forEach((e: any) => (anchorY = e.anchorY));
    expect(anchorY).toBe(13 * TILE);
    world.spits.clear();
    await until(() => (c.state as any).spits.size === 0);
  });

  it('depois da virada de página o servidor segue aceitando os comandos da previsão nova', async () => {
    const room = (await t.createRoom(ROOM_WITH_ENEMIES, { arenaId: 'margem' })) as unknown as ArenaRoom;
    const c = await t.connectTo(room);
    const me = () => (c.state as any).players.get(c.sessionId);
    const params = (level: number) => movementParams(parseDifficulty((c.state as any).difficulty), level);
    let predictor = new Predictor(ARENAS.find((a) => a.id === 'margem')!, params, me());
    c.send(MSG_START);
    for (let i = 0; i < 30; i++) c.send(MSG_INPUT, predictor.tick(0));
    await until(() => me().ack === 30);

    const world = (room as any).world;
    world.enemies.clear();
    world.spawnQueue = 0;
    await until(() => (c.state as any).arenaId === 'escadaria', 8000);

    // Como o cliente faz ao virar a página: previsão nova na arena nova, continuando a numeração.
    predictor = new Predictor(ARENAS.find((a) => a.id === 'escadaria')!, params, me(), predictor.lastSeq);
    for (let i = 0; i < 10; i++) c.send(MSG_INPUT, predictor.tick(0));
    await until(() => me().ack === 40, 2000);
  }, 15000);
});
describe('aquecimento e anfitrião', () => {
  it('só o anfitrião começa; se ele sair, o próximo a ter chegado assume', async () => {
    const room = (await t.createRoom(ROOM_WITH_ENEMIES, {})) as unknown as ArenaRoom;
    const host = await t.connectTo(room);
    const guest = await t.connectTo(room);
    const third = await t.connectTo(room);
    expect(room.state.hostId).toBe(host.sessionId);
    expect(room.state.phase).toBe(PHASE_LOBBY);

    guest.send(MSG_START);
    await sleep(100);
    expect(room.state.phase).toBe(PHASE_LOBBY);
    expect(room.state.enemies.size).toBe(0);

    await host.leave();
    await until(() => room.state.hostId === guest.sessionId);
    guest.send(MSG_START);
    await until(() => room.state.phase === PHASE_PLAYING);
    // Dois jogadores na sala ao começar: a arena é dimensionada para eles.
    expect(room.state.enemiesLeft).toBe(Math.round(margem.base + margem.perPlayer * 2));
    // Os outros clientes recebem o novo anfitrião no patch seguinte.
    await until(() => (third.state as any).hostId === guest.sessionId);
  });
});
describe('queda de conexão e reconexão (etapa 5)', () => {
  /** Derruba a conexão sem despedida, como uma rede que cai. */
  async function drop(c: any) {
    c.reconnection.enabled = false;
    await c.leave(false);
  }

  it('quem cai fica ausente com a vaga reservada; o 6º continua recusado; quem caiu volta ao mesmo boneco', async () => {
    const room = await newRoom();
    const clients = [];
    for (let i = 0; i < MAX_PLAYERS; i++) clients.push(await t.connectTo(room));
    const dropped = clients[3]!;
    const id = dropped.sessionId;
    const token = dropped.reconnectionToken;
    const slot = room.state.players.get(id)!.slot;

    await drop(dropped);
    await until(() => room.state.players.get(id)?.away === true);
    expect(room.state.players.size).toBe(MAX_PLAYERS);
    expect(await joinError(room.roomId)).toBe('Sala cheia: o limite é de 5 jogadores.');

    const back = await t.sdk.reconnect(token);
    expect(back.sessionId).toBe(id);
    await until(() => room.state.players.get(id)?.away === false);
    expect(room.state.players.get(id)!.slot).toBe(slot);

    // Os comandos voltam a valer depois da reconexão.
    const x = room.state.players.get(id)!.x;
    for (let seq = 1000; seq < 1010; seq++) back.send(MSG_INPUT, { seq, buttons: BTN_RIGHT });
    await until(() => room.state.players.get(id)!.x > x);
  });

  it('sem reconexão dentro do prazo, a vaga é liberada', async () => {
    const room = (await t.createRoom(ROOM_FAST_RECONNECT, {})) as unknown as ArenaRoom;
    const stays = await t.connectTo(room);
    const leaves = await t.connectTo(room);
    const id = leaves.sessionId;
    await drop(leaves);
    await until(() => room.state.players.get(id)?.away === true);
    await until(() => !room.state.players.has(id), 3000);
    expect([...room.state.players.keys()]).toEqual([stays.sessionId]);
  });
});
describe('limite de tentativas de entrada (etapa 5)', () => {
  it('acima do limite, o mesmo endereço recebe HTTP 429 com mensagem clara, mesmo forjando cabeçalhos de IP', async () => {
    const undo = limitJoins(new AttemptLimiter(3, 60_000));
    try {
      for (let i = 0; i < 3; i++) expect(await joinError('ZZZZZZ')).toBe('Nenhuma sala com esse código.');
      expect(await joinError('ZZZZZZ')).toBe(TOO_MANY_JOINS);

      const port = (t.server as any).port;
      for (const forged of ['1.2.3.4', '5.6.7.8']) {
        const res = await fetch(`http://127.0.0.1:${port}/matchmake/joinById/ZZZZZZ`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': forged, 'x-real-ip': forged, 'x-riscote-peer': forged },
          body: '{}',
        });
        expect(res.status).toBe(429);
      }
    } finally {
      undo();
    }
    expect(await joinError('ZZZZZZ')).toBe('Nenhuma sala com esse código.');
  });

  it('o limitador conta por chave e libera na janela seguinte', () => {
    let now = 0;
    const limiter = new AttemptLimiter(2, 1000, () => now);
    expect([limiter.allow('a'), limiter.allow('a'), limiter.allow('a')]).toEqual([true, true, false]);
    expect(limiter.allow('b')).toBe(true);
    now = 1000;
    expect(limiter.allow('a')).toBe(true);
  });
});
describe('modo fácil na rede', () => {
  it('a previsão usa a velocidade do modo: sem correções e mesmo estado final do servidor', async () => {
    const room = (await t.createRoom(ROOM_NAME, { difficulty: 'facil' })) as unknown as ArenaRoom;
    const c = await t.connectTo(room);
    const arena = ARENAS.find((x) => x.id === 'margem')!;
    const predictor = new Predictor(arena, movementParams(parseDifficulty((c.state as any).difficulty)), c.state.players.get(c.sessionId)!);
    c.onStateChange((s: any) => predictor.reconcile(s.players.get(c.sessionId)));
    for (let tick = 0; tick < 90; tick++) {
      c.send(MSG_INPUT, predictor.tick(tick < 60 ? BTN_RIGHT : 0));
      await sleep(1000 / 60);
    }
    await until(() => predictor.pendingCount === 0, 3000);
    const server = room.state.players.get(c.sessionId)!;
    expect(predictor.corrections).toBeLessThanOrEqual(2);
    expect(predictor.state.x).toBe(server.x);
    expect(server.hp).toBe(2);
  }, 10000);
});
describe('itens na rede', () => {
  it('itens aparecem para os clientes; quem pega ganha o nível e todos veem', async () => {
    const room = (await t.createRoom(ROOM_NAME, {})) as unknown as ArenaRoom;
    const a = await t.connectTo(room);
    const b = await t.connectTo(room);
    const world = (room as any).world;
    const me = world.players.get(a.sessionId);
    // Atalho de teste: item de agilidade no chão, sob o jogador A.
    world.spawnItem(ITEM_AGILIDADE, { col: Math.floor((me.body.x + 8) / 20), row: world.arena.rows - 1 });
    await until(() => room.state.players.get(a.sessionId)!.speed === 1);
    await until(() => (b.state as any).players.get(a.sessionId)?.speed === 1);
    expect(room.state.items.size).toBe(0);
  });

  it('o cliente não forja níveis de item nem invencibilidade', async () => {
    const room = (await t.createRoom(ROOM_NAME, {})) as unknown as ArenaRoom;
    const c = await t.connectTo(room);
    c.send(MSG_INPUT, { seq: 1, buttons: 0, strength: 3, speed: 3, rate: 3, range: 3, star: 99 });
    await sleep(150);
    const me = room.state.players.get(c.sessionId)!;
    expect([me.strength, me.speed, me.rate, me.range, me.star]).toEqual([0, 0, 0, 0, 0]);
  });
});