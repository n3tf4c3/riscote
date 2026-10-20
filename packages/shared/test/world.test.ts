import { beforeEach, describe, expect, it } from 'vitest';
import {
  ARENAS,
  BTN_ATTACK,
  BTN_RIGHT,
  ENEMY_SALTADOR,
  ENEMY_TRACA,
  MODE_BALL,
  MODE_ROLL,
  MODE_WALK,
  PHASE_CLEAR,
  PHASE_PLAYING,
  PHASE_RESTART,
  RULES,
  TICK_DT,
  TILE,
  World,
  parseArena,
  type Enemy,
} from '../src/index.ts';

// Chão na linha 7; plataforma na linha 3; tubos nos cantos; 5 surgimentos de jogador.
const TEST = parseArena('teste', 'Teste', [
  '#..................#',
  '#..................#',
  '#..................#',
  '#....=====.........#',
  '#..................#',
  '#..................#',
  '#T.P.P.P.P.P......T#',
  '####################',
]);

const ticks = (s: number) => Math.round(s / TICK_DT);

function setup(players = 1) {
  const world = new World(TEST, 1, { waves: false });
  for (let i = 0; i < players; i++) world.addPlayer(`p${i}`, i);
  return world;
}

/** Inimigos presos no lugar (alvos de teste): x fixo depois de cada tick. */
const pinned = new Map<Enemy, number>();

function run(world: World, n: number, buttons: Record<string, number> = {}) {
  for (let i = 0; i < n; i++) {
    for (const id of world.players.keys()) world.applyInput(id, buttons[id] ?? 0);
    world.step();
    for (const [e, x] of pinned) {
      e.body.x = x;
      e.body.vx = 0;
    }
  }
}

function pin(e: Enemy) {
  e.aiTimer = 1e9;
  pinned.set(e, e.body.x);
}

/** Aperta e solta um botão (o ataque reage à borda do aperto). */
function tap(world: World, id: string, button: number) {
  run(world, 1, { [id]: button });
  run(world, 1);
}

function freeze(e: Enemy) {
  e.aiTimer = 1e9;
}

beforeEach(() => pinned.clear());

describe('tinta', () => {
  it('cada tiro gasta uma gota; sem tinta, não atira', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    tap(world, 'p0', BTN_ATTACK);
    expect(p.ink).toBe(RULES.tankSize - 1);
    expect(world.drops.size).toBe(1);

    p.ink = 0.5;
    run(world, ticks(1));
    tap(world, 'p0', BTN_ATTACK);
    expect(world.drops.size).toBe(0);
  });

  it('segurar o botão não dispara de novo; a cadência limita os tiros', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    run(world, 30, { p0: BTN_ATTACK });
    expect(p.ink).toBe(RULES.tankSize - 1);
    run(world, 1);
    tap(world, 'p0', BTN_ATTACK);
    expect(p.ink).toBe(RULES.tankSize - 2);
    tap(world, 'p0', BTN_ATTACK); // ainda na cadência
    expect(p.ink).toBe(RULES.tankSize - 2);
  });

  it('o tubo recarrega o tanque em cerca de 1 s; longe do tubo, não', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    p.ink = 0;
    run(world, ticks(1));
    expect(p.ink).toBe(0);
    p.body.x = 1 * TILE + 2;
    run(world, ticks(1) + 1);
    expect(p.ink).toBe(RULES.tankSize);
  });
});

describe('encharcar e rolar', () => {
  function enemyAhead(world: World, col: number): Enemy {
    const e = world.spawnEnemy(ENEMY_TRACA, { col, row: 6 });
    pin(e);
    return e;
  }

  it(`${RULES.soakToBall} acertos viram bola; sem novos acertos, a bola se desfaz`, () => {
    const world = setup();
    world.players.get('p0')!.invuln = 1e9;
    const e = enemyAhead(world, 6);
    for (let i = 0; i < RULES.soakToBall; i++) {
      expect(e.mode).toBe(MODE_WALK);
      tap(world, 'p0', BTN_ATTACK);
      run(world, ticks(RULES.shotCooldown) + 1);
    }
    expect(e.soak).toBe(RULES.soakToBall);
    expect(e.mode).toBe(MODE_BALL);
    run(world, ticks(RULES.ballTime) + 1);
    expect(e.mode).toBe(MODE_WALK);
    expect(e.soak).toBe(0);
  });

  it('o encharcado perde tinta com o tempo', () => {
    const world = setup();
    world.players.get('p0')!.invuln = 1e9;
    const e = enemyAhead(world, 6);
    tap(world, 'p0', BTN_ATTACK);
    run(world, ticks(RULES.shotCooldown) + 1);
    tap(world, 'p0', BTN_ATTACK);
    run(world, 10);
    expect(e.soak).toBe(2);
    run(world, ticks(RULES.soakDecay) + 1);
    expect(e.soak).toBe(1);
  });

  it('chutar a bola não gasta tinta; ela rola, derruba quem está no caminho e estoura', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    p.invuln = 1e9;
    const ball = world.spawnEnemy(ENEMY_TRACA, { col: 6, row: 6 });
    ball.mode = MODE_BALL;
    ball.ballTime = 99;
    const victim = world.spawnEnemy(ENEMY_TRACA, { col: 14, row: 6 });
    freeze(victim);
    run(world, 2);
    p.body.x = ball.body.x - 15;
    p.body.facing = 1;

    tap(world, 'p0', BTN_ATTACK);
    expect(ball.mode).toBe(MODE_ROLL);
    expect(p.ink).toBe(RULES.tankSize);

    run(world, ticks(RULES.rollMaxTime) + 1);
    expect(world.enemies.has(victim.id)).toBe(false);
    expect(world.enemies.has(ball.id)).toBe(false);
    expect(p.kills).toBe(2);
    expect(world.score).toBe(RULES.scorePerEnemy * 2);
  });

  it('ao estourar, a bola respinga e encharca quem está perto (diferencial)', () => {
    const world = setup();
    world.players.get('p0')!.invuln = 1e9;
    const ball = world.spawnEnemy(ENEMY_TRACA, { col: 17, row: 6 });
    const near = world.spawnEnemy(ENEMY_SALTADOR, { col: 16, row: 6 });
    pin(near);
    pin(ball);
    run(world, 2);
    pinned.delete(ball);
    ball.mode = MODE_ROLL;
    ball.dir = 1;
    ball.bounces = RULES.rollMaxBounces - 1;
    run(world, 30);
    expect(world.enemies.has(ball.id)).toBe(false);
    expect(near.soak).toBe(RULES.burstSoak);
  });
});

describe('derrubada, resgate e vidas', () => {
  function knockDown(world: World, id: string) {
    const p = world.players.get(id)!;
    p.invuln = 0;
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 1, row: 6 });
    freeze(e);
    e.body.x = p.body.x;
    e.body.y = p.body.y;
    run(world, 1);
    world.enemies.delete(e.id);
    expect(p.down).toBe(true);
    return p;
  }

  it('encostar num inimigo andando derruba; um aliado encostado por ~1 s revive sem gastar vida', () => {
    const world = setup(2);
    const down = knockDown(world, 'p0');
    const ally = world.players.get('p1')!;
    ally.body.x = down.body.x + 4;
    run(world, ticks(RULES.rescueTime) + 1);
    expect(down.down).toBe(false);
    expect(down.invuln).toBeGreaterThan(0);
    expect(world.lives).toBe(RULES.teamLives);
  });

  it('sem resgate, renasce sozinho em ~5 s gastando uma vida da equipe e com o tanque cheio', () => {
    const world = setup(2);
    const down = knockDown(world, 'p0');
    down.ink = 0;
    run(world, ticks(RULES.respawnTime) - 2);
    expect(down.down).toBe(true);
    run(world, 3);
    expect(down.down).toBe(false);
    expect(world.lives).toBe(RULES.teamLives - 1);
    expect(down.ink).toBe(RULES.tankSize);
  });

  it('invulnerável (recém-chegado ou recém-revivido) não é derrubado', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    expect(p.invuln).toBe(RULES.invulnTime);
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 3, row: 6 });
    pin(e);
    run(world, ticks(RULES.invulnTime) - 2);
    expect(p.down).toBe(false);
    run(world, 3);
    expect(p.down).toBe(true);
  });

  it('renasce no ponto mais longe dos inimigos, não em cima de quem o esperava', () => {
    const world = setup(1);
    const down = knockDown(world, 'p0');
    const spawn = TEST.playerSpawns[0]!;
    const camper = world.spawnEnemy(ENEMY_TRACA, spawn);
    pin(camper);
    run(world, ticks(RULES.respawnTime) + 1);
    expect(down.down).toBe(false);
    expect(Math.abs(down.body.x - camper.body.x)).toBeGreaterThan(5 * TILE);
  });

  it('derrubado não se move nem atira', () => {
    const world = setup();
    const p = knockDown(world, 'p0');
    const { x, y } = p.body;
    run(world, 30, { p0: BTN_RIGHT | BTN_ATTACK });
    expect(p.body.x).toBe(x);
    expect(p.body.y).toBe(y);
    expect(world.drops.size).toBe(0);
  });

  it('todos derrubados e sem vidas: a arena recomeça com a reserva cheia', () => {
    const world = setup(2);
    world.lives = 0;
    knockDown(world, 'p0');
    knockDown(world, 'p1');
    run(world, 1);
    expect(world.phase).toBe(PHASE_RESTART);
    run(world, ticks(RULES.restartDelay) + 1);
    expect(world.phase).toBe(PHASE_PLAYING);
    expect(world.lives).toBe(RULES.teamLives);
    expect([...world.players.values()].every((p) => !p.down)).toBe(true);
  });
});

describe('ondas', () => {
  const arena = ARENAS[1]!;

  it.each([
    [1, 6, RULES.soakToBall],
    [3, 9, RULES.soakToBall],
    [5, 12, RULES.soakToBallBigTeam],
  ])('%i jogador(es): %i inimigos, %i acertos para virar bola', (players, total, soak) => {
    const world = new World(arena, 7);
    for (let i = 0; i < players; i++) world.addPlayer(`p${i}`, i);
    world.step();
    expect(world.enemiesLeft).toBe(total);
    expect(world.enemies.size).toBeLessThanOrEqual(RULES.maxEnemiesOnScreen);
    expect(world.soakToBall).toBe(soak);
  });

  it('arena limpa: pausa curta e nova onda', () => {
    const world = new World(arena, 7);
    world.addPlayer('p0', 0);
    world.step();
    world.enemies.clear();
    (world as unknown as { spawnQueue: number }).spawnQueue = 0;
    run(world, 1);
    expect(world.phase).toBe(PHASE_CLEAR);
    run(world, ticks(RULES.clearDelay) + 1);
    expect(world.phase).toBe(PHASE_PLAYING);
    expect(world.wave).toBe(2);
    expect(world.enemiesLeft).toBeGreaterThan(0);
  });

  it('inimigos se espalham pela arena e ninguém atravessa as paredes', () => {
    const world = new World(arena, 3);
    world.addPlayer('p0', 0).invuln = 1e9;
    run(world, ticks(20));
    for (const e of world.enemies.values()) {
      expect(e.body.x).toBeGreaterThanOrEqual(TILE);
      expect(e.body.x).toBeLessThanOrEqual((arena.cols - 1) * TILE);
      expect(e.body.y).toBeLessThan((arena.rows - 1) * TILE);
    }
  });

  it('é determinístico: mesma semente e mesmos comandos, mesma partida', () => {
    const snapshot = (seed: number) => {
      const world = new World(arena, seed);
      world.addPlayer('p0', 0);
      world.addPlayer('p1', 1);
      for (let t = 0; t < ticks(15); t++) {
        world.applyInput('p0', [BTN_RIGHT, BTN_ATTACK, 0][Math.floor(t / 20) % 3]!);
        world.applyInput('p1', t % 40 < 20 ? BTN_ATTACK : 0);
        world.step();
      }
      return JSON.stringify({
        players: [...world.players.values()],
        enemies: [...world.enemies.values()],
        score: world.score,
        lives: world.lives,
      });
    };
    expect(snapshot(42)).toBe(snapshot(42));
    expect(snapshot(42)).not.toBe(snapshot(43));
  });
});
