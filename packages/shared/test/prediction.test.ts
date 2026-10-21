import { describe, expect, it } from 'vitest';
import {
  ARENAS,
  BTN_DOWN,
  BTN_JUMP,
  BTN_LEFT,
  BTN_RIGHT,
  DEFAULT_PARAMS,
  Interpolator,
  Predictor,
  createPlayer,
  movementParams,
  stepPlayer,
  type InputMessage,
  type NetPlayer,
  type PlayerState,
} from '../src/index.ts';

const arena = ARENAS[1]!;
const params = { ...DEFAULT_PARAMS };

function net(s: PlayerState, ack: number, down = false): NetPlayer {
  return { ...s, slot: 0, ack, ink: 12, down, rescue: 0, invuln: 0, kills: 0, away: false, hp: 1, strength: 0, speed: 0, rate: 0, range: 0, star: 0 };
}

/** Servidor em memória: aplica cada comando uma vez, na ordem, com atraso fixo em ticks nos dois sentidos. */
function simulate(latencyTicks: number, ticks: number, buttonsAt: (t: number) => number, starveAt?: number) {
  const server = createPlayer(arena.playerSpawns[0]!, params);
  let ack = 0;
  const predictor = new Predictor(arena, params, net(server, 0));
  const toServer: Array<{ at: number; input: InputMessage }> = [];
  const toClient: Array<{ at: number; state: NetPlayer }> = [];

  for (let t = 0; t < ticks + 4 * latencyTicks + 4; t++) {
    if (t < ticks) toServer.push({ at: t + latencyTicks, input: predictor.tick(buttonsAt(t)) });
    while (toServer[0] && toServer[0].at <= t) {
      const { input } = toServer.shift()!;
      stepPlayer(server, input.buttons, arena, params);
      ack = input.seq;
    }
    // Passo do servidor sem comando (cliente "faminto"): a previsão não tinha como saber.
    if (t === starveAt) stepPlayer(server, 0, arena, params);
    if (t % 2 === 0) toClient.push({ at: t + latencyTicks, state: net({ ...server }, ack) });
    while (toClient[0] && toClient[0].at <= t) predictor.reconcile(toClient.shift()!.state);
  }
  return { predictor, server };
}

const pattern = (t: number) =>
  [BTN_RIGHT, BTN_RIGHT | BTN_JUMP, 0, BTN_LEFT, BTN_LEFT | BTN_JUMP, BTN_DOWN | BTN_JUMP][Math.floor(t / 15) % 6]!;

describe('Predictor', () => {
  it.each([0, 3, 6, 12])('sem perdas, %i ticks de atraso: nenhuma correção e mesmo estado final', (latency) => {
    const { predictor, server } = simulate(latency, 400, pattern);
    expect(predictor.corrections).toBe(0);
    expect(predictor.pendingCount).toBe(0);
    expect(predictor.state).toEqual(server);
  });

  it('previsão nova (troca de arena, aba recarregada) continua a numeração dos comandos', () => {
    const start = createPlayer(arena.playerSpawns[0]!, params);
    const old = new Predictor(arena, params, net(start, 0));
    for (let i = 0; i < 40; i++) old.tick(BTN_RIGHT);
    // Troca de arena: o servidor já viu até o 40 e descartaria seq menor ou igual.
    expect(new Predictor(arena, params, net(start, 37), old.lastSeq).tick(0).seq).toBe(41);
    // Aba recarregada: só há o ack do servidor.
    expect(new Predictor(arena, params, net(start, 37)).tick(0).seq).toBe(38);
  });

  it('derrubado no servidor: a previsão para de mover o boneco', () => {
    const start = createPlayer(arena.playerSpawns[0]!, params);
    const predictor = new Predictor(arena, params, net(start, 0));
    predictor.tick(BTN_RIGHT);
    predictor.reconcile(net(start, 1, true));
    const x = predictor.state.x;
    for (let i = 0; i < 30; i++) predictor.tick(BTN_RIGHT);
    expect(predictor.state.x).toBe(x);
    expect(predictor.state.prevButtons).toBe(BTN_RIGHT);
  });

  it('agilidade pega no servidor: a previsão passa a usar a velocidade nova, sem correções depois', () => {
    const fast = movementParams('medio', 2);
    const start = createPlayer(arena.playerSpawns[0]!, params);
    const predictor = new Predictor(arena, (level) => movementParams('medio', level), net(start, 0));
    const server = { ...start };
    // O servidor anda com a velocidade de nível 2 desde o comando 1.
    for (let seq = 1; seq <= 30; seq++) {
      predictor.tick(BTN_RIGHT);
      stepPlayer(server, BTN_RIGHT, arena, fast);
    }
    predictor.reconcile({ ...net(server, 30), speed: 2 });
    const corrections = predictor.corrections;
    for (let seq = 31; seq <= 60; seq++) {
      predictor.tick(BTN_RIGHT);
      stepPlayer(server, BTN_RIGHT, arena, fast);
    }
    predictor.reconcile({ ...net(server, 60), speed: 2 });
    expect(predictor.corrections).toBe(corrections);
    expect(predictor.state).toEqual(server);
  });
  it('passo extra do servidor gera correção e a previsão converge para o estado autoritativo', () => {
    const { predictor, server } = simulate(6, 200, (t) => (t < 100 ? BTN_RIGHT : 0), 40);
    expect(predictor.corrections).toBeGreaterThan(0);
    expect(predictor.state).toEqual(server);
  });
});

describe('Interpolator', () => {
  const view = (id: string, x: number) => ({ id, slot: 0, x, y: 0, facing: 1 });

  it('exibe o passado recente interpolado entre os dois estados vizinhos', () => {
    const it = new Interpolator(100);
    it.push(1000, [view('a', 0)]);
    it.push(1100, [view('a', 10)]);
    expect(it.sample(1150)[0]!.x).toBeCloseTo(5);
  });

  it('não extrapola além do último estado nem recua antes do primeiro', () => {
    const it = new Interpolator(100);
    it.push(1000, [view('a', 0)]);
    it.push(1100, [view('a', 10)]);
    expect(it.sample(5000)[0]!.x).toBe(10);
    expect(it.sample(900)[0]!.x).toBe(0);
  });

  it('jogador recém-chegado aparece sem interpolar', () => {
    const it = new Interpolator(100);
    it.push(1000, [view('a', 0)]);
    it.push(1100, [view('a', 10), view('b', 50)]);
    const out = it.sample(1150);
    expect(out.find((v) => v.id === 'b')!.x).toBe(50);
  });

  it('sem estados, nada para desenhar', () => {
    expect(new Interpolator().sample(0)).toEqual([]);
  });
});
