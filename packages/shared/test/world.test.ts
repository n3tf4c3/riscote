import { beforeEach, describe, expect, it } from 'vitest';
import {
  ARENAS,
  BTN_ATTACK,
  BTN_RIGHT,
  DEFAULT_PARAMS,
  ENEMY_SALTADOR,
  ENEMY_SIZE,
  ENEMY_TRACA,
  ITEM_AGILIDADE,
  ITEM_ALCANCE,
  ITEM_FORCA,
  ITEM_INVENCIVEL,
  ITEM_TIRO_AGIL,
  POWER_MAX_LEVEL,
  SPEED_PER_LEVEL,
  cellAt,
  MODE_BALL,
  MODE_ROLL,
  MODE_WALK,
  BTN_DOWN,
  BTN_JUMP,
  BTN_LEFT,
  ENEMY_BORRAO,
  SKILL_ACT,
  SKILL_NONE,
  SKILL_REST,
  SKILL_WARN,
  floorSpan,
  PHASE_CHAPTER,
  PHASE_CLEAR,
  PHASE_LOBBY,
  PHASE_PLAYING,
  PHASE_RESTART,
  PHASE_TURN,
  touchesTube,
  RULES,
  TICK_DT,
  TILE,
  World,
  parseArena,
  type Arena,
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
  // Modo difícil: as regras de tinta e tubos valem.
  const world = new World(TEST, 1, { waves: false, difficulty: 'dificil' });
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
  e.skillCd = 1e9;
  pinned.set(e, e.body.x);
}

/** Aperta e solta um botão (o ataque reage à borda do aperto). */
function tap(world: World, id: string, button: number) {
  run(world, 1, { [id]: button });
  run(world, 1);
}

function freeze(e: Enemy) {
  e.aiTimer = 1e9;
  e.skillCd = 1e9;
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
    world.start();
    world.step();
    expect(world.enemiesLeft).toBe(total);
    expect(world.enemies.size).toBeLessThanOrEqual(RULES.maxEnemiesOnScreen);
    expect(world.soakToBall).toBe(soak);
  });

  it('inimigos se espalham pela arena e ninguém atravessa as paredes', () => {
    const world = new World(arena, 3);
    world.addPlayer('p0', 0).invuln = 1e9;
    world.start();
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
      world.start();
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
    world.start();
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
    // Com pontos, o capítulo pausa para o placar; com todos os nomes escritos, a pausa encurta.
    world.closeRecords();
    run(world, ticks(RULES.recordShow) + 1);
    expect(world.arena.id).toBe('padrao');
    expect(world.score).toBe(0);
    expect(world.lives).toBe(RULES.teamLives);
  });

  it(`depois de ${RULES.hurryTime} s na arena, o borrão aparece, persegue, não toma tinta e não conta como inimigo restante`, () => {
    const world = new World(compacta, 5);
    const p = world.addPlayer('p0', 0);
    world.start();
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
    world.start();
    a.invuln = 1e9;
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
    world.start();
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
    world.start();
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

describe('aquecimento e início (etapa 4)', () => {
  it('antes de começar: ninguém some, nenhum inimigo, nenhuma métrica, nenhum borrão', () => {
    const world = new World(ARENAS[1]!, 4);
    world.addPlayer('p0', 0);
    run(world, ticks(RULES.hurryTime + 5), { p0: BTN_RIGHT | BTN_ATTACK });
    expect(world.phase).toBe(PHASE_LOBBY);
    expect(world.enemies.size).toBe(0);
    expect(world.hurry).toBe(false);
    expect(world.takeReports()).toEqual([]);
  });

  it('começar dimensiona a primeira arena com quem está na sala nesse momento', () => {
    const world = new World(ARENAS[1]!, 4);
    world.addPlayer('p0', 0);
    run(world, 30);
    world.addPlayer('p1', 1);
    world.addPlayer('p2', 2);
    expect(world.start()).toBe(true);
    expect(world.phase).toBe(PHASE_PLAYING);
    expect(world.enemiesLeft).toBe(Math.round(4 + 1.5 * 3));
    expect(world.start()).toBe(false);
  });

  it('sala vazia não começa', () => {
    expect(new World(ARENAS[1]!, 4).start()).toBe(false);
  });
});
describe('ausência por queda de conexão (etapa 5)', () => {
  it('ausente não é derrubado nem perseguido; ao voltar, fica invulnerável por um tempo', () => {
    const world = setup(2);
    const away = world.players.get('p0')!;
    const other = world.players.get('p1')!;
    away.invuln = 0;
    other.invuln = 1e9;
    world.setAway('p0', true);
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 3, row: 6 });
    pin(e);
    e.body.x = away.body.x;
    run(world, 30);
    expect(away.down).toBe(false);

    // Ausente mais perto, à esquerda; presente à direita.
    away.body.x = 13 * TILE + 2;
    other.body.x = 18 * TILE + 2;
    const saltador = world.spawnEnemy(ENEMY_SALTADOR, { col: 15, row: 6 });
    saltador.aiTimer = 1e9;
    run(world, 3); // pousa
    saltador.aiTimer = 0;
    run(world, 1);
    // O saltador mira o jogador presente, não o ausente.
    expect(saltador.dir).toBe(1);

    world.setAway('p0', false);
    expect(away.invuln).toBe(RULES.invulnTime);
  });
});
describe('modos de dificuldade', () => {
  it.each(['facil', 'medio'] as const)('no modo %s a tinta não acaba', (difficulty) => {
    const world = new World(TEST, 1, { waves: false, difficulty });
    const p = world.addPlayer('p0', 0);
    for (let i = 0; i < 40; i++) {
      tap(world, 'p0', BTN_ATTACK);
      run(world, ticks(RULES.shotCooldown) + 1);
    }
    expect(p.ink).toBe(RULES.tankSize);
    expect(world.limitedInk).toBe(false);
  });

  it('no modo difícil a tinta acaba e o tiro para', () => {
    const world = new World(TEST, 1, { waves: false, difficulty: 'dificil' });
    const p = world.addPlayer('p0', 0);
    for (let i = 0; i < RULES.tankSize + 5; i++) {
      tap(world, 'p0', BTN_ATTACK);
      run(world, ticks(RULES.shotCooldown) + 1);
    }
    expect(p.ink).toBeLessThan(1);
    expect(world.limitedInk).toBe(true);
  });

  it('no fácil o boneco aguenta um toque a mais; no médio e no difícil, cai no primeiro', () => {
    for (const [difficulty, toques] of [['facil', 2], ['medio', 1], ['dificil', 1]] as const) {
      const world = new World(TEST, 1, { waves: false, difficulty });
      const p = world.addPlayer('p0', 0);
      p.invuln = 0;
      const e = world.spawnEnemy(ENEMY_TRACA, { col: 3, row: 6 });
      pin(e);
      let hits = 0;
      for (let t = 0; t < ticks(5) && !p.down; t++) {
        const before = p.hp;
        run(world, 1);
        if (p.hp < before || p.down) hits++;
      }
      expect(p.down).toBe(true);
      expect(hits).toBe(toques);
      pinned.clear();
    }
  });

  it('ao renascer, a proteção do fácil volta', () => {
    const world = new World(TEST, 1, { waves: false, difficulty: 'facil' });
    const p = world.addPlayer('p0', 0);
    p.hp = 1;
    p.invuln = 0;
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 3, row: 6 });
    e.body.x = p.body.x;
    run(world, 1);
    world.enemies.delete(e.id);
    expect(p.down).toBe(true);
    run(world, ticks(RULES.respawnTime) + 1);
    expect(p.down).toBe(false);
    expect(p.hp).toBe(2);
  });

  it('no fácil o boneco corre 15% mais rápido', () => {
    const speed = (difficulty: 'facil' | 'medio') => {
      const world = new World(TEST, 1, { waves: false, difficulty });
      const p = world.addPlayer('p0', 0);
      run(world, 30, { p0: BTN_RIGHT });
      return p.body.vx / TILE;
    };
    expect(speed('medio')).toBeCloseTo(DEFAULT_PARAMS.runSpeed, 6);
    expect(speed('facil')).toBeCloseTo(DEFAULT_PARAMS.runSpeed * 1.15, 6);
  });

  it('sem escolha, o mundo usa o modo médio', () => {
    expect(new World(TEST, 1).difficulty).toBe('medio');
  });
});
describe('itens que fortalecem o boneco', () => {
  /** Item no chão, colado no jogador p0 (célula da coluna dele, sobre o chão da arena de teste). */
  function give(world: World, kind: number, id = 'p0') {
    const p = world.players.get(id)!;
    const col = Math.floor((p.body.x + 8) / TILE);
    world.spawnItem(kind, { col, row: 7 });
    run(world, 1);
  }

  it('força: cada gota encharca 1 a mais por nível', () => {
    const world = setup();
    world.players.get('p0')!.invuln = 1e9;
    give(world, ITEM_FORCA);
    expect(world.players.get('p0')!.strength).toBe(1);
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 6, row: 6 });
    pin(e);
    tap(world, 'p0', BTN_ATTACK);
    run(world, 10);
    expect(e.soak).toBe(2);
  });

  it('agilidade: corre 12% mais rápido por nível', () => {
    const world = setup();
    give(world, ITEM_AGILIDADE);
    give(world, ITEM_AGILIDADE);
    const p = world.players.get('p0')!;
    run(world, 30, { p0: BTN_RIGHT });
    expect(p.body.vx / TILE).toBeCloseTo(DEFAULT_PARAMS.runSpeed * (1 + 2 * SPEED_PER_LEVEL), 6);
  });

  it('tiro ágil: a cadência cai 25% por nível', () => {
    const world = setup();
    give(world, ITEM_TIRO_AGIL);
    const p = world.players.get('p0')!;
    tap(world, 'p0', BTN_ATTACK);
    expect(p.cooldown).toBeCloseTo(RULES.shotCooldown * RULES.ratePerLevel - 2 * TICK_DT, 6);
  });

  it('alcance: a gota vive 35% mais por nível', () => {
    const world = setup();
    give(world, ITEM_ALCANCE);
    run(world, 1, { p0: BTN_ATTACK });
    const drop = [...world.drops.values()][0]!;
    expect(drop.life).toBeCloseTo(RULES.dropLife * (1 + RULES.rangePerLevel) - TICK_DT, 6);
  });

  it('os níveis acumulam até o teto e zeram quando o boneco é derrubado', () => {
    const world = setup();
    for (let i = 0; i < POWER_MAX_LEVEL + 2; i++) give(world, ITEM_FORCA);
    give(world, ITEM_ALCANCE);
    const p = world.players.get('p0')!;
    expect(p.strength).toBe(POWER_MAX_LEVEL);
    expect(p.range).toBe(1);
    p.invuln = 0;
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 1, row: 1 });
    e.body.x = p.body.x;
    e.body.y = p.body.y;
    run(world, 1);
    expect(p.down).toBe(true);
    expect([p.strength, p.speed, p.rate, p.range]).toEqual([0, 0, 0, 0]);
  });

  it('invencível: 6 s sem dano; pegar outro renova o tempo, não acumula', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    give(world, ITEM_INVENCIVEL);
    p.invuln = 0;
    const e = world.spawnEnemy(ENEMY_TRACA, { col: 3, row: 6 });
    pin(e);
    e.body.x = p.body.x;
    run(world, ticks(RULES.invincibleTime) - 5);
    expect(p.down).toBe(false);
    give(world, ITEM_INVENCIVEL);
    expect(p.star).toBe(RULES.invincibleTime);
    run(world, ticks(RULES.invincibleTime) + 2);
    expect(p.down).toBe(true);
  });

  it('derrubado ou ausente não pega item; item some depois do prazo', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    p.away = true;
    give(world, ITEM_FORCA);
    expect(p.strength).toBe(0);
    expect(world.items.size).toBe(1);
    run(world, ticks(RULES.itemLife));
    expect(world.items.size).toBe(0);
  });

  it('aparecem com o tempo, sobre plataformas, no máximo 2 por vez', () => {
    const arena = ARENAS[1]!;
    const world = new World(arena, 13);
    world.addPlayer('p0', 0).away = true;
    world.start();
    run(world, ticks(RULES.itemFirstAt) - 2);
    expect(world.items.size).toBe(0);
    run(world, 3);
    expect(world.items.size).toBe(1);
    run(world, ticks(RULES.itemEvery * 3));
    expect(world.items.size).toBeLessThanOrEqual(RULES.maxItemsOnScreen);
    for (const item of world.items.values()) {
      const col = Math.floor((item.x + 8) / TILE);
      const below = Math.round((item.y + RULES.itemSize * TILE) / TILE);
      expect(cellAt(arena, col, below)).not.toBe(0);
    }
  });
});
describe('habilidades dos inimigos', () => {
  const FLOOR = 7 * TILE; // altura dos pés no chão da arena de teste

  function traca(world: World, col: number, dir: 1 | -1) {
    const e = world.spawnEnemy(ENEMY_TRACA, { col, row: 6 });
    e.dir = dir;
    e.aiTimer = 1e9;
    return e;
  }

  it('traça: vê alguém à frente no mesmo andar, para no aviso, dá o bote rápido, cansa e espera', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    p.invuln = 1e9;
    p.body.x = 10 * TILE;
    const e = traca(world, 5, 1);
    run(world, 2);
    expect(e.skill).toBe(SKILL_WARN);
    const x0 = e.body.x;
    run(world, ticks(RULES.dashWarn) - 3);
    expect(Math.abs(e.body.x - x0)).toBeLessThan(TILE / 2);

    run(world, 6);
    expect(e.skill).toBe(SKILL_ACT);
    let fastest = 0;
    for (let i = 0; i < ticks(RULES.dashTime) - 7; i++) {
      run(world, 1);
      fastest = Math.max(fastest, Math.abs(e.body.vx));
    }
    expect(fastest).toBeGreaterThan(3.5 * TILE * (RULES.dashSpeedMult - 0.2));

    run(world, ticks(RULES.dashRest) + 10);
    expect(e.skill).toBe(SKILL_NONE);
    expect(e.skillCd).toBeGreaterThan(RULES.dashCooldown - 0.3);
  });

  it('traça: jogador atrás dela, em outro andar, longe ou do outro lado da parede não provoca o bote', () => {
    const WALLED = parseArena('parede', 'Parede', [
      '#..........#',
      '#.....#....#',
      '#.P...#..P.#',
      '############',
    ]);
    const cases: Array<[Arena, number, number, number]> = [
      // [arena, coluna da traça, coluna do jogador, linha dos pés do jogador]
      [TEST, 9, 5, 7], // atrás
      [TEST, 4, 7, 3], // na plataforma de cima
      [TEST, 2, 2 + RULES.dashSight + 3, 7], // longe demais
      [WALLED, 2, 8, 3], // depois da parede
    ];
    for (const [arena, col, playerCol, feetRow] of cases) {
      const world = new World(arena, 1, { waves: false });
      const p = world.addPlayer('p0', 0);
      p.invuln = 1e9;
      p.body.x = playerCol * TILE;
      p.body.y = feetRow * TILE - world.params.playerHeight * TILE;
      const e = traca(world, col, 1);
      for (let i = 0; i < 15; i++) {
        run(world, 1);
        expect(e.skill).toBe(SKILL_NONE);
      }
    }
  });

  it('saltador: a cada tantos saltos agacha no aviso, salta mais alto e, ao cair, solta a onda', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    p.invuln = 1e9;
    p.body.x = 10 * TILE;
    const e = world.spawnEnemy(ENEMY_SALTADOR, { col: 12, row: 6 });
    run(world, 3);
    e.hops = RULES.slamEvery - 1;
    e.aiTimer = 0;
    run(world, 1);
    expect(e.skill).toBe(SKILL_WARN);
    const top = e.body.y;
    run(world, ticks(RULES.slamWarn) - 2);
    expect(e.body.y).toBe(top);
    expect(e.body.vx).toBe(0);

    let highest = top;
    let landedShock = 0;
    for (let i = 0; i < ticks(3) && e.skill !== SKILL_REST; i++) {
      run(world, 1);
      highest = Math.min(highest, e.body.y);
      landedShock = world.shocks.length;
    }
    expect(e.skill).toBe(SKILL_REST);
    expect(top - highest).toBeGreaterThan((RULES.slamJumpHeight - 0.5) * TILE);
    expect(landedShock).toBe(1);
    expect(world.shocks[0]!.y).toBeCloseTo(e.body.y + ENEMY_SIZE * TILE, 5);
    run(world, ticks(RULES.slamWaveTime) + 1);
    expect(world.shocks.length).toBe(0);
    expect(e.hops).toBe(0);
  });

  it('saltador: a onda derruba quem está de pé no chão, dentro do alcance; quem pulou, quem está longe ou em outro andar escapa', () => {
    const world = setup(4);
    const [grounded, jumper, far, upstairs] = ['p0', 'p1', 'p2', 'p3'].map((id) => world.players.get(id)!);
    for (const p of [grounded, jumper, far, upstairs]) p.invuln = 0;
    run(world, 2);
    const x = 9 * TILE;
    grounded.body.x = x + 2 * TILE;
    jumper.body.x = x - 2 * TILE;
    far.body.x = x + (RULES.slamRadius + 1.5) * TILE;
    upstairs.body.x = 7 * TILE;
    upstairs.body.y = 3 * TILE - world.params.playerHeight * TILE;
    run(world, 2);
    expect(upstairs.body.onGround).toBe(true);
    const [left, right] = floorSpan(world.arena, x, FLOOR, RULES.slamRadius);
    world.shocks.push({ x, y: FLOOR, left, right, age: 0 });
    run(world, 1, { p1: BTN_JUMP });
    run(world, ticks(RULES.slamWaveTime));
    expect(grounded.down).toBe(true);
    expect(jumper.down).toBe(false);
    expect(far.down).toBe(false);
    expect(upstairs.down).toBe(false);
  });

  it('a onda só corre pelo chão contínuo: para no vão e na parede', () => {
    // Plataforma da linha 3 vai da coluna 5 à 9.
    expect(floorSpan(TEST, 7.5 * TILE, 3 * TILE, 3)).toEqual([5 * TILE, 10 * TILE]);
    // No chão, perto da parede esquerda: para na coluna 1.
    expect(floorSpan(TEST, 2.5 * TILE, FLOOR, 3)).toEqual([TILE, 5.5 * TILE]);
  });

  it('borrão: contrai no aviso, solta uma mancha que primeiro não machuca, depois derruba e some', () => {
    const world = setup();
    const p = world.players.get('p0')!;
    p.invuln = 1e9;
    const borrao = world.spawnBorrao();
    run(world, ticks(RULES.stainEvery - RULES.stainWarnLead) + 1);
    expect(borrao.skill).toBe(SKILL_WARN);
    expect(world.stains.size).toBe(0);
    run(world, ticks(RULES.stainWarnLead));
    expect(world.stains.size).toBe(1);
    expect(borrao.skill).toBe(SKILL_NONE);
    world.enemies.delete(borrao.id);

    const stain = [...world.stains.values()][0]!;
    stain.x = p.body.x;
    stain.y = p.body.y;
    p.invuln = 0;
    run(world, ticks(RULES.stainWarn) - 3);
    expect(p.down).toBe(false);
    run(world, 4);
    expect(p.down).toBe(true);
    run(world, ticks(RULES.stainLife));
    expect(world.stains.size).toBe(0);
  });

  it('borrão: não deixa mancha dentro da parede e nunca passa do máximo', () => {
    const world = setup();
    world.players.get('p0')!.invuln = 1e9;
    const borrao = world.spawnBorrao();
    borrao.body.x = TEST.cols * TILE; // dentro da parede direita, fora do alcance do jogador
    borrao.body.y = 4 * TILE;
    borrao.skillCd = 0;
    pinned.set(borrao, borrao.body.x);
    run(world, 1);
    expect(world.stains.size).toBe(0);
    pinned.delete(borrao);
    for (let i = 0; i < RULES.maxStains + 2; i++) world.stains.set(1000 + i, { id: 1000 + i, x: 0, y: 0, age: 0 });
    world.stains.delete(1000);
    world.stains.delete(1001);
    borrao.body.x = 10 * TILE;
    borrao.skillCd = 0;
    run(world, 1);
    expect(world.stains.size).toBe(RULES.maxStains);
  });

  it('continua determinístico com bote, pancada e manchas', () => {
    const snapshot = (seed: number) => {
      const world = new World(ARENAS[1]!, seed);
      world.addPlayer('p0', 0);
      world.addPlayer('p1', 1);
      world.start();
      let skills = 0;
      for (let t = 0; t < ticks(RULES.hurryTime + 15); t++) {
        world.applyInput('p0', [BTN_RIGHT, BTN_ATTACK, BTN_LEFT | BTN_JUMP][Math.floor(t / 25) % 3]!);
        world.applyInput('p1', t % 40 < 20 ? BTN_ATTACK : BTN_LEFT);
        world.step();
        for (const e of world.enemies.values()) if (e.skill === SKILL_ACT) skills++;
      }
      return { skills, json: JSON.stringify({ enemies: [...world.enemies.values()], stains: [...world.stains.values()], shocks: world.shocks, players: [...world.players.values()] }) };
    };
    const a = snapshot(9);
    expect(a.skills).toBeGreaterThan(0);
    expect(snapshot(9).json).toBe(a.json);
  });
});
