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
  stepPlayer,
  type InputMessage,
  type NetPlayer,
  type PlayerState,
} from '../src/index.ts';

const arena = ARENAS[1]!;
const params = { ...DEFAULT_PARAMS };

function net(s: PlayerState, ack: number): NetPlayer {
  return { ...s, slot: 0, ack };
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
