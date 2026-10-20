import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import {
  ARENAS,
  BTN_JUMP,
  BTN_LEFT,
  BTN_RIGHT,
  DEFAULT_PARAMS,
  Interpolator,
  MAX_PLAYERS,
  MSG_INPUT,
  Predictor,
  ROOM_NAME,
  createPlayer,
  describeJoinError,
  normalizeRoomCode,
  stepPlayer,
} from '@riscote/shared';
import { ArenaRoom } from '../src/ArenaRoom.ts';

let t: ColyseusTestServer;

beforeAll(async () => {
  const server = new Server({ transport: new WebSocketTransport(), greet: false, gracefullyShutdown: false });
  server.define(ROOM_NAME, ArenaRoom);
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

async function newRoom(arenaId = 'padrao'): Promise<ArenaRoom> {
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
  it('cria a sala com código legível e a arena escolhida', async () => {
    const room = await newRoom('ampla');
    expect(normalizeRoomCode(room.roomId)).toBe(room.roomId);
    expect(room.state.arenaId).toBe('ampla');
    expect((await newRoom('inexistente')).state.arenaId).toBe('padrao');
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
    const arena = ARENAS.find((x) => x.id === 'padrao')!;
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

describe('previsão e interpolação sob latência (critério da etapa 2)', () => {
  afterEach(() => {
    t.server.simulateLatency(0);
  });

  it.each([0, 100, 200])('%i ms de ida e volta: previsão sem correções e os outros veem movimento sem recuos', async (rtt) => {
    t.server.simulateLatency(rtt);
    await sleep(20);
    const room = await newRoom();
    const mover = await t.connectTo(room);
    const watcher = await t.connectTo(room);
    const arena = ARENAS.find((x) => x.id === 'padrao')!;

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
      mover.send(MSG_INPUT, predictor.tick(buttons));
      const v = seen.sample(performance.now())[0];
      if (v) samples.push(v.x);
      await sleep(1000 / 60);
    }
    await until(() => predictor.pendingCount === 0, 3000);

    const server = room.state.players.get(mover.sessionId)!;
    expect(predictor.corrections).toBe(0);
    expect(predictor.state.x).toBe(server.x);
    expect(predictor.state.y).toBe(server.y);
    expect(samples.length).toBeGreaterThan(30);
    for (let i = 1; i < samples.length; i++) expect(samples[i]!).toBeGreaterThanOrEqual(samples[i - 1]!);
  }, 15000);
});
