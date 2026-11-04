import { describe, expect, it } from 'vitest';
import {
  BTN_ATTACK,
  CHARGE_TICKS,
  ENEMY_BORRACHA,
  ENEMY_TRACA,
  MODE_BALL,
  MODE_WALK,
  RULES,
  TICK_DT,
  World,
  parseArena,
} from '../src/index.ts';

// Tiro carregado (pedido do usuário em 2026-11-04): segurar o ataque por RULES.chargeTime e soltar dispara
// a tinta concentrada, que vira em bola quem toca (mesmo de escudo de frente) e atravessa vários.
// Chão na linha 7; o jogador 0 surge na coluna 2, olhando para a direita.
const ARENA = parseArena('carga-teste', 'Teste da carga', [
  '#..........................#',
  '#..........................#',
  '#..........................#',
  '#..........................#',
  '#..........................#',
  '#..........................#',
  '#TPPPPP...................T#',
  '############################',
]);

function setup(difficulty: 'medio' | 'dificil' = 'medio') {
  const world = new World(ARENA, 1, { waves: false, difficulty });
  const p = world.addPlayer('p0', 0);
  p.invuln = 1e9;
  p.body.facing = 1;
  return { world, p };
}

function hold(world: World, ticks: number) {
  for (let i = 0; i < ticks; i++) {
    world.applyInput('p0', BTN_ATTACK);
    world.step();
  }
}

function release(world: World, ticks = 1) {
  for (let i = 0; i < ticks; i++) {
    world.applyInput('p0', 0);
    world.step();
  }
}

const bigDrops = (world: World) => [...world.drops.values()].filter((d) => d.big);

describe('tiro carregado', () => {
  it('soltar antes da carga cheia só deixa o tiro normal do aperto', () => {
    const { world } = setup();
    hold(world, CHARGE_TICKS - 1);
    release(world);
    expect(bigDrops(world)).toEqual([]);
  });

  it('carga cheia: soltar dispara a tinta concentrada para o lado em que o boneco olha', () => {
    const { world, p } = setup();
    hold(world, CHARGE_TICKS);
    expect(p.chargeTicks).toBe(CHARGE_TICKS);
    // Segurar mais não passa da carga cheia.
    hold(world, 30);
    expect(p.chargeTicks).toBe(CHARGE_TICKS);
    release(world);
    const [d] = bigDrops(world);
    expect(d).toBeDefined();
    expect(d!.vx).toBeGreaterThan(0);
    expect(d!.x).toBeGreaterThan(p.body.x);
    expect(p.chargeTicks).toBe(0);
    // A carga vale o tempo da regra.
    expect(CHARGE_TICKS * TICK_DT).toBeCloseTo(RULES.chargeTime, 6);
  });

  it('vira em bola, de uma vez, quem toca, mesmo a borracha de frente, e atravessa os dois', () => {
    const { world } = setup();
    hold(world, CHARGE_TICKS);
    // Os bichos chegam só agora, para não andarem durante a carga.
    const traca = world.spawnEnemy(ENEMY_TRACA, { col: 7, row: 6 }, false);
    const borracha = world.spawnEnemy(ENEMY_BORRACHA, { col: 11, row: 6 }, false);
    borracha.dir = -1;
    traca.aiTimer = borracha.aiTimer = 1e9;
    release(world);
    let atravessou = false;
    for (let i = 0; i < 60 && bigDrops(world).length > 0; i++) {
      release(world);
      if (traca.mode === MODE_BALL && bigDrops(world).length > 0) atravessou = true;
    }
    expect(traca.mode).toBe(MODE_BALL);
    expect(borracha.mode).toBe(MODE_BALL);
    expect(atravessou).toBe(true);
  });

  it('a gota normal continua parando no escudo da borracha (controle)', () => {
    const { world } = setup();
    const borracha = world.spawnEnemy(ENEMY_BORRACHA, { col: 6, row: 6 }, false);
    borracha.dir = -1;
    borracha.aiTimer = 1e9;
    hold(world, 1);
    release(world, 30);
    expect(borracha.mode).toBe(MODE_WALK);
    expect(borracha.soak).toBe(0);
  });

  it('ser derrubado zera a carga', () => {
    const { world, p } = setup();
    hold(world, CHARGE_TICKS);
    p.invuln = 0;
    (world as unknown as { knockDown(p: unknown): void }).knockDown(p);
    hold(world, 1);
    expect(p.chargeTicks).toBe(0);
    p.down = false;
    release(world);
    expect(bigDrops(world)).toEqual([]);
  });

  it(`no difícil gasta ${RULES.chargeInk} de tinta; sem ela, não sai`, () => {
    const { world, p } = setup('dificil');
    hold(world, CHARGE_TICKS);
    const ink = p.ink;
    release(world);
    expect(bigDrops(world).length).toBe(1);
    expect(p.ink).toBeCloseTo(ink - RULES.chargeInk, 6);

    const other = setup('dificil');
    hold(other.world, CHARGE_TICKS);
    other.p.ink = RULES.chargeInk - 0.5;
    release(other.world);
    expect(bigDrops(other.world)).toEqual([]);
  });
});
