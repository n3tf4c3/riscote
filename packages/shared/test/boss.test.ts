import { describe, expect, it } from 'vitest';
import {
  ATTACK_RAIN,
  ATTACK_STAMP,
  ATTACK_WAVE,
  BOSS_ARENA,
  BOSS_DEFEATED,
  BOSS_HEAVY,
  BOSS_INTRO,
  BOSS_ROAM,
  BOSS_RULES,
  BOSS_STAMP,
  BOSS_WINDUP,
  Boss,
  HAZARD_BLOT,
  HAZARD_WAVE,
  bossMaxHp,
  withBoss,
  type BossHost,
} from '../src/boss.ts';
import {
  ARENAS,
  BTN_DOWN,
  BTN_JUMP,
  BTN_LEFT,
  BTN_RIGHT,
  DEFAULT_PARAMS,
  EMPTY,
  SOLID,
  TICK_DT,
  TILE,
  cellAt,
  createPlayer,
  seededRandom,
  stepPlayer,
  touchesTube,
  type CellPos,
  BTN_ATTACK,
  ENEMY_TRACA,
  MODE_ROLL,
  PHASE_CHAPTER,
  PHASE_CLEAR,
  PHASE_PLAYING,
  RULES,
  World,
} from '../src/index.ts';

const ticks = (s: number) => Math.round(s / TICK_DT);
const arena = BOSS_ARENA;
const floorY = (arena.rows - 1) * TILE - BOSS_RULES.height * TILE;

/** Mundo de mentira: um alvo parado, sorteio com semente e os fiapos anotados. */
function fakeHost(seed = 1, target: { x: number; y: number } | null = { x: 6 * TILE, y: (arena.rows - 2) * TILE }) {
  let id = 1;
  const minions: CellPos[] = [];
  const rng = seededRandom(seed);
  const host: BossHost & { target: typeof target; minionCells: CellPos[] } = {
    target,
    minionCells: minions,
    rng,
    nextId: () => id++,
    nearestTarget: () => host.target,
    minions: () => minions.length,
    spawnMinion: (cell) => minions.push(cell),
  };
  return host;
}

function run(boss: Boss, seconds: number, until?: () => boolean): void {
  for (let i = 0; i < ticks(seconds); i++) {
    boss.step(TICK_DT);
    if (until?.()) return;
  }
}

/** Pula a entrada: o chefe no chão, andando. */
function fighting(players = 1, host = fakeHost()) {
  const boss = new Boss(arena, players, host);
  run(boss, BOSS_RULES.introTime + TICK_DT);
  return { boss, host };
}

const ballAt = (boss: Boss) => ({ x: boss.x + boss.w / 2 - 9, y: boss.y + boss.h - 18, w: 18, h: 18 });

describe('a mesa do chefe segue as regras das arenas', () => {
  it('paredes fechadas, 5 surgimentos e tubos nos dois cantos inferiores', () => {
    for (let row = 0; row < arena.rows; row++) {
      expect(cellAt(arena, 0, row)).toBe(SOLID);
      expect(cellAt(arena, arena.cols - 1, row)).toBe(SOLID);
    }
    for (let col = 0; col < arena.cols; col++) expect(cellAt(arena, col, arena.rows - 1)).toBe(SOLID);
    expect(arena.playerSpawns).toHaveLength(5);
    expect(arena.tubes).toEqual([
      { col: 1, row: arena.rows - 2 },
      { col: arena.cols - 2, row: arena.rows - 2 },
    ]);
  });

  it('andares a menos de jumpHeight células', () => {
    const rows = new Set<number>();
    for (let row = 1; row < arena.rows; row++) {
      for (let col = 1; col < arena.cols - 1; col++) if (cellAt(arena, col, row) !== EMPTY) rows.add(row);
    }
    const sorted = [...rows].sort((a, b) => b - a);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1]! - sorted[i]!).toBeLessThan(DEFAULT_PARAMS.jumpHeight);
  });

  it('de qualquer plataforma, um tubo em até 3 s', () => {
    const p = { ...DEFAULT_PARAMS };
    for (let row = 1; row < arena.rows - 1; row++) {
      for (let col = 1; col < arena.cols - 1; col++) {
        if (cellAt(arena, col, row) === EMPTY || cellAt(arena, col, row - 1) !== EMPTY) continue;
        const s = createPlayer({ col, row: row - 1 }, p);
        const dir = s.x < (arena.cols * TILE) / 2 ? BTN_LEFT : BTN_RIGHT;
        let dropped = false;
        let reached = Infinity;
        for (let t = TICK_DT; t < 10; t += TICK_DT) {
          let buttons = dir;
          if (s.onGround && s.onOneWay && !dropped) {
            buttons |= BTN_DOWN | BTN_JUMP;
            dropped = true;
          } else dropped = false;
          stepPlayer(s, buttons, arena, p);
          if (touchesTube(s, arena, p)) {
            reached = t;
            break;
          }
        }
        expect(reached, `coluna ${col}, linha ${row}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('o chão por onde o chefe anda é livre até a altura dele', () => {
    for (let col = BOSS_RULES.margin; col < arena.cols - BOSS_RULES.margin; col++) {
      for (let r = 1; r <= BOSS_RULES.height; r++) expect(cellAt(arena, col, arena.rows - 1 - r)).toBe(EMPTY);
    }
  });

  it('a página do chefe entra depois da 4ª; capítulo curto, no fim', () => {
    const ids = (c: readonly { id: string }[]) => c.map((a) => a.id);
    const five = [...ARENAS, ...ARENAS].slice(0, 5);
    expect(ids(withBoss(five, 4))).toEqual([...ids(five.slice(0, 4)), 'mesa', five[4]!.id]);
    expect(ids(withBoss(ARENAS.slice(0, 3), 4))).toEqual([...ids(ARENAS.slice(0, 3)), 'mesa']);
  });
});

describe('o Mata-Borrão', () => {
  it('a vida escala com o número de jogadores', () => {
    expect([1, 2, 3, 4, 5].map(bossMaxHp)).toEqual([9, 12, 15, 18, 21]);
    expect(new Boss(arena, 3, fakeHost()).hp).toBe(15);
  });

  it('entra caindo do alto: não machuca nem leva dano até assentar', () => {
    const host = fakeHost();
    const boss = new Boss(arena, 1, host);
    const everything = { x: 0, y: 0, w: arena.cols * TILE, h: arena.rows * TILE };
    let impacts = 0;
    for (let i = 0; i < ticks(BOSS_RULES.introTime) - 1; i++) {
      boss.step(TICK_DT);
      expect(boss.state).toBe(BOSS_INTRO);
      expect(boss.hurts(everything)).toBe(false);
      expect(boss.ballHit(ballAt(boss), 0)).toBe(0);
      impacts = boss.impacts;
    }
    expect(impacts).toBe(1);
    expect(boss.y).toBe(floorY);
    expect(boss.hp).toBe(boss.maxHp);
    run(boss, 2 * TICK_DT);
    expect(boss.state).toBe(BOSS_ROAM);
    expect(host.minionCells).toHaveLength(BOSS_RULES.minionsAtStart);
  });

  it('cada bola que acerta tira 1, mais 1 por inimigo levado no caminho', () => {
    const { boss } = fighting();
    expect(boss.ballHit(ballAt(boss), 0)).toBe(1);
    expect(boss.ballHit(ballAt(boss), 2)).toBe(3);
    expect(boss.hp).toBe(boss.maxHp - 4);
    expect(boss.ballHit({ x: 0, y: 0, w: 4, h: 4 }, 0)).toBe(0);
  });

  it('tinta enche o medidor; cheio, fica pesado: parado, inofensivo e levando o dobro', () => {
    const { boss } = fighting();
    const drop = { x: boss.x + 4, y: boss.y + 4, w: 8, h: 8 };
    for (let i = 0; i < boss.soakMax - 1; i++) expect(boss.soakHit(drop, 1)).toBe(true);
    expect(boss.state).not.toBe(BOSS_HEAVY);
    boss.soakHit(drop, 1);
    expect(boss.state).toBe(BOSS_HEAVY);
    const x = boss.x;
    run(boss, 1);
    expect(boss.x).toBe(x);
    expect(boss.hurts(boss.box)).toBe(false);
    expect(boss.ballHit(ballAt(boss), 0)).toBe(BOSS_RULES.heavyMult);
    run(boss, BOSS_RULES.heavyTime);
    expect(boss.state).not.toBe(BOSS_HEAVY);
    expect(boss.soak).toBe(0);
  });

  it('o medidor seca sozinho quando ninguém atira', () => {
    const { boss } = fighting();
    boss.soakHit({ x: boss.x, y: boss.y, w: 8, h: 8 }, 4);
    run(boss, BOSS_RULES.soakHold + 4 / BOSS_RULES.soakDecay + 0.1);
    expect(boss.soak).toBe(0);
  });

  it('muda de fase aos 60% e aos 25% da vida', () => {
    const { boss } = fighting(5); // 21 de vida
    expect(boss.phase).toBe(1);
    boss.ballHit(ballAt(boss), 8); // 12 → 57%
    expect(boss.phase).toBe(2);
    boss.ballHit(ballAt(boss), 6); // 5 → 24%
    expect(boss.phase).toBe(3);
  });

  it('todo ataque avisa antes: nada machuca longe do corpo durante o preparo', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 12; seed++) {
      const { boss } = fighting(5, fakeHost(seed));
      boss.ballHit(ballAt(boss), 8); // fase 2: os três ataques
      for (let i = 0; i < ticks(30); i++) {
        const before = boss.state;
        boss.step(TICK_DT);
        if (before !== BOSS_WINDUP && boss.state === BOSS_WINDUP) {
          seen.add(boss.attack);
          const warn = boss.timer;
          expect(warn).toBeGreaterThanOrEqual(0.7 - 1e-9);
          const x = boss.x;
          // Ondas de um ataque anterior ainda podem estar correndo; os borrões novos já nascem aqui.
          const old = new Set([...boss.hazards.values()].filter((z) => z.wait <= 0).map((z) => z.id));
          // Durante o aviso: o chefe não sai do lugar, e onda e borrões novos ainda não valem.
          for (let k = 0; k < ticks(warn) - 1; k++) {
            boss.step(TICK_DT);
            expect(boss.x).toBe(x);
            for (const z of boss.hazards.values()) if (!old.has(z.id)) expect(z.wait).toBeGreaterThan(0);
          }
        }
      }
    }
    expect([...seen].sort()).toEqual([ATTACK_STAMP, ATTACK_WAVE, ATTACK_RAIN]);
  });

  it('a carimbada cai onde a sombra marcou', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { boss } = fighting(1, fakeHost(seed));
      run(boss, 10, () => boss.state === BOSS_WINDUP && boss.attack === ATTACK_STAMP);
      if (boss.attack !== ATTACK_STAMP) continue;
      const target = boss.targetX;
      run(boss, 3, () => boss.state !== BOSS_WINDUP && boss.state !== BOSS_STAMP);
      expect(boss.x).toBeCloseTo(target, 6);
      expect(boss.y).toBe(floorY);
      return;
    }
    throw new Error('nenhuma carimbada sorteada');
  });

  it('a onda corre rente ao chão para os dois lados', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { boss } = fighting(1, fakeHost(seed));
      run(boss, 10, () => boss.hazards.size > 0);
      const waves = [...boss.hazards.values()].filter((z) => z.kind === HAZARD_WAVE);
      if (waves.length === 0) continue;
      expect(waves.map((z) => Math.sign(z.vx)).sort()).toEqual([-1, 1]);
      for (const z of waves) expect(z.y + z.h).toBe((arena.rows - 1) * TILE);
      // Baixa: quem pula passa por cima.
      expect(BOSS_RULES.waveHeight).toBeLessThan(DEFAULT_PARAMS.jumpHeight - DEFAULT_PARAMS.playerHeight);
      return;
    }
    throw new Error('nenhuma onda sorteada');
  });

  it('a chuva só vem da fase 2 e os borrões estouram na primeira plataforma', () => {
    const calm = fighting(1, fakeHost(3)).boss;
    run(calm, 30, () => calm.attack === ATTACK_RAIN);
    expect(calm.attack).not.toBe(ATTACK_RAIN);

    for (let seed = 1; seed <= 20; seed++) {
      const { boss } = fighting(5, fakeHost(seed));
      boss.ballHit(ballAt(boss), 8);
      run(boss, 15, () => boss.attack === ATTACK_RAIN);
      if (boss.attack !== ATTACK_RAIN) continue;
      const blots = [...boss.hazards.values()].filter((z) => z.kind === HAZARD_BLOT);
      expect(blots).toHaveLength(BOSS_RULES.rainCount[1]);
      run(boss, 3);
      for (const z of blots) expect(boss.hazards.has(z.id)).toBe(false);
      return;
    }
    throw new Error('nenhuma chuva sorteada');
  });

  it('solta fiapos de tempos em tempos, até o limite', () => {
    const { boss, host } = fighting();
    run(boss, 60);
    expect(host.minionCells.length).toBe(boss.minionMax);
    for (const c of host.minionCells) expect(cellAt(arena, c.col, c.row + 1)).toBe(SOLID);
  });

  it('derrotado, para de atacar, some com os perigos e sai depois da queda', () => {
    const { boss } = fighting();
    run(boss, 5);
    boss.ballHit(ballAt(boss), boss.hp);
    expect(boss.state).toBe(BOSS_DEFEATED);
    expect(boss.hazards.size).toBe(0);
    expect(boss.hurts(boss.box)).toBe(false);
    run(boss, BOSS_RULES.defeatTime - 0.1);
    expect(boss.gone).toBe(false);
    run(boss, 0.2);
    expect(boss.gone).toBe(true);
  });

  it('mesma semente e mesmos alvos: a mesma luta', () => {
    const trace = (seed: number) => {
      const host = fakeHost(seed);
      const boss = new Boss(arena, 3, host);
      const out: number[] = [];
      for (let i = 0; i < ticks(40); i++) {
        host.target = { x: (8 + 14 * Math.abs(Math.sin(i / 90))) * TILE, y: (arena.rows - 2) * TILE };
        boss.step(TICK_DT);
        if (i % 120 === 60) boss.ballHit(ballAt(boss), 0);
        out.push(boss.x, boss.y, boss.state, boss.attack, boss.hazards.size);
      }
      return out;
    };
    expect(trace(7)).toEqual(trace(7));
    expect(trace(7)).not.toEqual(trace(8));
    expect(trace(7)).toContain(BOSS_STAMP);
  });
});

describe('o chefe no mundo', () => {
  const [first, second] = [ARENAS[0]!, ARENAS[1]!];

  function stepWorld(world: World, seconds: number, until?: () => boolean): void {
    for (let i = 0; i < ticks(seconds); i++) {
      for (const id of world.players.keys()) world.applyInput(id, 0);
      world.step();
      if (until?.()) return;
    }
  }

  /** Mundo já na página do chefe, depois da entrada; jogadores invulneráveis salvo pedido. */
  function bossWorld(players = 1, seed = 3) {
    const world = new World([BOSS_ARENA], seed);
    for (let i = 0; i < players; i++) world.addPlayer(`p${i}`, i);
    world.start();
    for (const p of world.players.values()) p.invuln = 1e9;
    stepWorld(world, BOSS_RULES.introTime + 0.1);
    return world;
  }

  function rollInto(world: World, combo = 0) {
    const boss = world.boss!;
    const ball = world.spawnEnemy(ENEMY_TRACA, { col: 3, row: arena.rows - 2 });
    ball.mode = MODE_ROLL;
    ball.kicker = 'p0';
    ball.combo = combo;
    ball.body.x = boss.x - TILE;
    ball.body.y = (arena.rows - 1) * TILE - 0.9 * TILE;
    ball.dir = 1;
    return ball;
  }

  it('o capítulo termina no chefe: a última arena vira a página para a mesa', () => {
    const world = new World(withBoss([first, second], 2), 7);
    world.addPlayer('p0', 0);
    world.addPlayer('p1', 1);
    world.start();
    for (let k = 0; k < 2; k++) {
      for (const e of [...world.enemies.values()]) world.enemies.delete(e.id);
      (world as unknown as { spawnQueue: number }).spawnQueue = 0;
      stepWorld(world, RULES.clearDelay + RULES.turnDelay + 0.2);
    }
    expect(world.arena.id).toBe('mesa');
    expect(world.phase).toBe(PHASE_PLAYING);
    expect(world.boss?.hp).toBe(bossMaxHp(2));
    expect(world.enemiesLeft).toBe(1);
  });

  it('sem borrão de tempo na luta; os fiapos são traças e contam junto com o chefe', () => {
    const world = bossWorld();
    stepWorld(world, RULES.hurryTime + 5);
    expect(world.hurry).toBe(false);
    const kinds = [...world.enemies.values()].map((e) => e.kind);
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds.every((k) => k === ENEMY_TRACA)).toBe(true);
    expect(world.enemiesLeft).toBe(1 + kinds.length);
  });

  it('bola chutada nele tira vida, estoura e dá pontos', () => {
    const world = bossWorld();
    for (const e of [...world.enemies.values()]) world.enemies.delete(e.id);
    const boss = world.boss!;
    const ball = rollInto(world);
    const score = world.score;
    stepWorld(world, 2, () => !world.enemies.has(ball.id));
    expect(world.enemies.has(ball.id)).toBe(false);
    expect(boss.hp).toBe(boss.maxHp - 1);
    expect(world.score).toBe(score + BOSS_RULES.scorePerHit + RULES.scorePerEnemy);
  });

  it('gota de tinta encharca o chefe em vez de passar por ele', () => {
    const world = bossWorld();
    const boss = world.boss!;
    const p = world.players.get('p0')!;
    p.body.x = boss.x - 2 * TILE;
    p.body.y = (arena.rows - 1) * TILE - DEFAULT_PARAMS.playerHeight * TILE;
    p.body.facing = 1;
    world.applyInput('p0', BTN_ATTACK);
    stepWorld(world, 0.3);
    expect(boss.soak).toBeGreaterThan(0);
  });

  it('encostar nele derruba, mas não durante a entrada', () => {
    const world = new World([BOSS_ARENA], 3);
    const p = world.addPlayer('p0', 0);
    world.start();
    p.invuln = 0;
    stepWorld(world, 1, () => world.boss!.impacts > 0);
    p.body.x = world.boss!.x + 20;
    p.body.y = world.boss!.y + 20;
    stepWorld(world, 0.5);
    expect(p.down).toBe(false);
    stepWorld(world, BOSS_RULES.introTime, () => p.down);
    p.body.x = world.boss!.x + 20;
    p.body.y = world.boss!.y + 20;
    stepWorld(world, 0.2, () => p.down);
    expect(p.down).toBe(true);
  });

  it('derrotado: os fiapos secam, a página fica limpa e o capítulo fecha', () => {
    const world = bossWorld();
    const boss = world.boss!;
    stepWorld(world, 7);
    expect(world.enemies.size).toBeGreaterThan(0);
    boss.hp = 1;
    for (const e of [...world.enemies.values()]) world.enemies.delete(e.id);
    world.spawnEnemy(ENEMY_TRACA, { col: 28, row: arena.rows - 2 });
    rollInto(world);
    stepWorld(world, 2, () => !boss.alive);
    expect(boss.alive).toBe(false);
    expect(world.enemies.size).toBe(0);
    expect(world.score).toBeGreaterThanOrEqual(BOSS_RULES.scoreDefeat);
    stepWorld(world, BOSS_RULES.defeatTime + 0.1);
    expect(world.phase).toBe(PHASE_CLEAR);
    stepWorld(world, RULES.clearDelay + 0.1);
    expect(world.phase).toBe(PHASE_CHAPTER);
  });

  it('todos caídos sem vidas: a luta recomeça com o chefe inteiro', () => {
    const world = bossWorld();
    world.boss!.ballHit(ballAt(world.boss!), 2);
    world.lives = 0;
    for (const p of world.players.values()) p.down = true;
    stepWorld(world, RULES.restartDelay + 0.1);
    world.closeRecords();
    stepWorld(world, RULES.recordDelay + 0.1, () => world.phase === PHASE_PLAYING);
    expect(world.phase).toBe(PHASE_PLAYING);
    expect(world.boss!.hp).toBe(world.boss!.maxHp);
    expect(world.boss!.state).toBe(BOSS_INTRO);
  });

  it('mesma semente e mesmos comandos: a mesma luta no mundo', () => {
    const trace = () => {
      const world = new World([BOSS_ARENA], 11, { difficulty: 'medio' });
      world.addPlayer('p0', 0);
      world.addPlayer('p1', 1);
      world.start();
      const out: number[] = [];
      for (let i = 0; i < ticks(30); i++) {
        world.applyInput('p0', i % 40 < 20 ? BTN_RIGHT | (i % 7 === 0 ? BTN_ATTACK : 0) : BTN_LEFT);
        world.applyInput('p1', i % 90 < 10 ? BTN_JUMP : i % 5 === 0 ? BTN_ATTACK : 0);
        world.step();
        const b = world.boss!;
        out.push(b.x, b.y, b.state, b.hp, b.soak, b.hazards.size, world.enemies.size, world.score);
      }
      return out;
    };
    expect(trace()).toEqual(trace());
  });
});
