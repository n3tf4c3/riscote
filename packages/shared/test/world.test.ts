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
  BTN_DOWN,
  BTN_JUMP,
  BTN_LEFT,
  ENEMY_BORRAO,
  PHASE_CHAPTER,
  PHASE_CLEAR,
  PHASE_PLAYING,
  PHASE_RESTART,
  PHASE_TURN,
  touchesTube,
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

/** Encerra a arena atual como se todos os inimigos tivessem sido derrotados. */
function clearArena(world: World) {
  for (const e of [...world.enemies.values()]) if (e.kind !== ENEMY_BORRAO) world.enemies.delete(e.id);
  (world as unknown as { spawnQueue: number }).spawnQueue = 0;
}

describe('progressão, pressão de tempo e métricas (etapa 4)', () => {
  const [compacta, padrao, ampla] = [ARENAS[0]!, ARENAS[1]!, ARENAS[2]!];

  it('arena limpa → pausa → virada de página → próxima arena; depois da última, resumo e volta à primeira', () => {
    const world = new World([padrao, ampla], 7);
    world.addPlayer('p0', 0);
    world.addPlayer('p1', 1);
    run(world, ticks(3));
    world.score = 500;
    clearArena(world);
    run(world, 1);
    expect(world.phase).toBe(PHASE_CLEAR);
    run(world, ticks(RULES.clearDelay) + 1);
    expect(world.phase).toBe(PHASE_TURN);
    run(world, ticks(RULES.turnDelay) + 1);
    expect(world.phase).toBe(PHASE_PLAYING);
    expect(world.arena.id).toBe('ampla');
    expect(world.enemiesLeft).toBe(Math.round(4 + 1.5 * 2));
    const p1 = world.players.get('p1')!;
    expect(Math.round(p1.body.x / TILE)).toBe(ampla.playerSpawns[1]!.col);
    expect(world.score).toBe(500);

    clearArena(world);
    run(world, 1 + ticks(RULES.clearDelay) + 1);
    expect(world.phase).toBe(PHASE_CHAPTER);
    world.lives = 1;
    run(world, ticks(RULES.chapterDelay) + 1);
    expect(world.arena.id).toBe('padrao');
    expect(world.score).toBe(0);
    expect(world.lives).toBe(RULES.teamLives);
  });

  it(`depois de ${RULES.hurryTime} s na arena, o borrão aparece, persegue, não toma tinta e não conta como inimigo restante`, () => {
    const world = new World(compacta, 5);
    const p = world.addPlayer('p0', 0);
    p.invuln = 1e9;
    run(world, ticks(RULES.hurryTime) - 5);
    expect(world.hurry).toBe(false);
    const before = world.enemiesLeft;
    run(world, 10);
    expect(world.hurry).toBe(true);
    const borrao = [...world.enemies.values()].find((e) => e.kind === ENEMY_BORRAO)!;
    expect(borrao).toBeDefined();
    expect(world.enemiesLeft).toBeLessThanOrEqual(before);

    const dist = () => Math.hypot(borrao.body.x - p.body.x, borrao.body.y - p.body.y);
    const d0 = dist();
    run(world, ticks(1));
    expect(dist()).toBeLessThan(d0);

    // Na frente do jogador, os tiros o atravessam.
    borrao.body.x = p.body.x + 2 * TILE;
    borrao.body.y = p.body.y;
    p.body.facing = 1;
    tap(world, 'p0', BTN_ATTACK);
    run(world, 5);
    expect(borrao.soak).toBe(0);
    expect(borrao.mode).toBe(MODE_WALK);

    // Encostar derruba quem não está invulnerável.
    p.invuln = 0;
    run(world, ticks(1));
    expect(p.down).toBe(true);
  });

  it('cada arena encerrada gera um relatório com as métricas do plano', () => {
    const world = new World(padrao, 9);
    const a = world.addPlayer('p0', 0);
    world.addPlayer('p1', 1).invuln = 1e9;
    a.invuln = 1e9;
    run(world, 1); // a onda começa no primeiro tick e zera as métricas
    for (let i = 0; i < 3; i++) {
      tap(world, 'p0', BTN_ATTACK);
      run(world, ticks(RULES.shotCooldown) + 1);
    }
    a.invuln = 0;
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 1, row: 1 });
    e.body.x = a.body.x;
    e.body.y = a.body.y;
    run(world, 1);
    world.enemies.delete(e.id);
    expect(a.down).toBe(true);
    const elapsed = world.waveTime;
    clearArena(world);
    run(world, 1);

    const [report, ...rest] = world.takeReports();
    expect(rest).toEqual([]);
    expect(report).toMatchObject({ arena: 'padrao', position: 1, arenas: 1, players: 2, outcome: 'limpa', downs: 1, hurry: false });
    expect(report!.seconds).toBeCloseTo(elapsed, 1);
    const mine = report!.perPlayer.find((s) => s.slot === 0)!;
    expect(mine.shots).toBe(3);
    expect(mine.downSeconds).toBeGreaterThan(0);
    expect(report!.spreadCells).toBeGreaterThan(0);
    expect(world.takeReports()).toEqual([]);
  });

  it('todos caídos sem vidas: relatório de recomeço e a mesma arena volta', () => {
    const world = new World([padrao, ampla], 9);
    const p = world.addPlayer('p0', 0);
    run(world, 2);
    world.lives = 0;
    p.invuln = 0;
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 1, row: 1 });
    e.body.x = p.body.x;
    e.body.y = p.body.y;
    run(world, 2);
    expect(world.phase).toBe(PHASE_RESTART);
    expect(world.takeReports()[0]?.outcome).toBe('recomeço');
    run(world, ticks(RULES.restartDelay) + 1);
    expect(world.arena.id).toBe('padrao');
    expect(world.lives).toBe(RULES.teamLives);
  });

  /** Robô simples: persegue o inimigo mais próximo, atira, pula e recarrega quando a tinta acaba. */
  function botButtons(world: World, id: string, t: number): number {
    const p = world.players.get(id)!;
    if (p.down) return 0;
    const b = p.body;
    let targetX: number | null = null;
    let targetY = b.y;
    if (p.ink < 1) {
      const tube = world.arena.tubes.reduce((a, c) => (Math.abs(c.col * TILE - b.x) < Math.abs(a.col * TILE - b.x) ? c : a));
      targetX = tube.col * TILE;
      targetY = tube.row * TILE;
    } else {
      let best = Infinity;
      for (const e of world.enemies.values()) {
        if (e.kind === ENEMY_BORRAO) continue;
        const d = Math.abs(e.body.x - b.x) + Math.abs(e.body.y - b.y);
        if (d < best) {
          best = d;
          targetX = e.body.x;
          targetY = e.body.y;
        }
      }
    }
    let buttons = 0;
    if (targetX !== null) buttons |= targetX > b.x + 4 ? BTN_RIGHT : targetX < b.x - 4 ? BTN_LEFT : 0;
    if (targetY < b.y - 1.5 * TILE && t % 40 === 0) buttons |= BTN_JUMP;
    if (targetY > b.y + 1.5 * TILE && b.onOneWay && t % 40 === 0) buttons |= BTN_DOWN | BTN_JUMP;
    if (t % 10 === 0) buttons |= BTN_ATTACK;
    return buttons;
  }

  it.each([1, 3, 5])('%i robô(s) jogando 4 minutos: nada trava, ninguém sai da arena, relatórios saem', (bots) => {
    const world = new World(ARENAS, 11);
    for (let i = 0; i < bots; i++) world.addPlayer(`b${i}`, i);
    const reports = [];
    const phases = new Set<number>();
    for (let t = 0; t < ticks(240); t++) {
      for (let i = 0; i < bots; i++) world.applyInput(`b${i}`, botButtons(world, `b${i}`, t + i * 7));
      world.step();
      phases.add(world.phase);
      reports.push(...world.takeReports());
      const w = world.arena.cols * TILE;
      const h = world.arena.rows * TILE;
      for (const p of world.players.values()) {
        expect(Number.isFinite(p.body.x) && Number.isFinite(p.body.y)).toBe(true);
        expect(p.body.x).toBeGreaterThanOrEqual(TILE - 0.001);
        expect(p.body.x).toBeLessThanOrEqual(w - TILE);
        expect(p.body.y).toBeLessThan(h - TILE);
        expect(p.ink).toBeGreaterThanOrEqual(0);
      }
      expect(world.enemies.size).toBeLessThanOrEqual(RULES.maxEnemiesOnScreen + 1);
    }
    expect(reports.length).toBeGreaterThan(0);
    for (const r of reports) {
      expect(r.players).toBe(bots);
      expect(r.perPlayer).toHaveLength(bots);
    }
    expect(phases.has(PHASE_PLAYING)).toBe(true);
  });

  it('o robô de teste chega a recarregar no tubo', () => {
    const world = new World(padrao, 3, { waves: false });
    const p = world.addPlayer('b0', 0);
    p.ink = 0;
    let touched = false;
    for (let t = 0; t < ticks(6) && !touched; t++) {
      world.applyInput('b0', botButtons(world, 'b0', t));
      world.step();
      touched = touchesTube(p.body, world.arena, world.params);
    }
    expect(touched).toBe(true);
  });
});