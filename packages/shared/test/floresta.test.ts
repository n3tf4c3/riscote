import { describe, expect, it } from 'vitest';
import {
  BOSQUE_ARENA,
  BTN_ATTACK,
  ENEMY_CARACOL,
  ENEMY_CESTO,
  ENEMY_GRILO,
  ENEMY_LAGARTA,
  ENEMY_OURICO,
  ENEMY_PINHA,
  ENEMY_SIZE,
  MODE_BALL,
  PHASE_PLAYING,
  RULES,
  SKILL_ACT,
  SKILL_NONE,
  SKILL_REST,
  SKILL_WARN,
  SPIT_GRAVETO,
  SPIT_SEIVA,
  TICK_DT,
  TILE,
  World,
  parseArena,
  sproutBox,
  warnTimes,
  type Enemy,
} from '../src/index.ts';

// Os poderes das criaturas da Floresta (decisões do usuário em 2026-11-01): cada um com aviso antes
// e um jeito de escapar. Chão na linha 7; plataforma na linha 3 (colunas 5 a 9); ponto de fio na 4.
const ARENA = parseArena('floresta-teste', 'Teste da Floresta', [
  '#..................#',
  '#..................#',
  '#..................#',
  '#....=====.........#',
  '#......A...........#',
  '#..................#',
  '#T.P.P.P.P.P......T#',
  '####################',
]);
const FLOOR = 7 * TILE;
const PLATFORM = 3 * TILE;
const ticks = (s: number) => Math.round(s / TICK_DT);
const size = ENEMY_SIZE * TILE;
const center = (e: Enemy) => e.body.x + size / 2;
const feet = (e: Enemy) => e.body.y + size;

function setup(players = 1) {
  const world = new World(ARENA, 1, { waves: false, difficulty: 'dificil' });
  for (let i = 0; i < players; i++) world.addPlayer(`p${i}`, i);
  for (const p of world.players.values()) p.invuln = 1e9;
  return world;
}

function run(world: World, n: number, buttons: Record<string, number> = {}) {
  for (let i = 0; i < n; i++) {
    for (const id of world.players.keys()) world.applyInput(id, buttons[id] ?? 0);
    world.step();
  }
}

function tap(world: World, id: string, button: number) {
  run(world, 1, { [id]: button });
  run(world, 1);
}

/** Avança até `done` (ou o limite) e devolve os ticks gastos. */
function until(world: World, seconds: number, done: () => boolean, buttons: Record<string, number> = {}): number {
  let n = 0;
  while (n < ticks(seconds) && !done()) {
    run(world, 1, buttons);
    n++;
  }
  return n;
}

/** Põe o jogador de pé em (x do meio, altura dos pés) e deixa a física assentar. */
function stand(world: World, id: string, cx: number, feetY: number) {
  const p = world.players.get(id)!;
  p.body.x = cx - (world.params.playerWidth * TILE) / 2;
  p.body.y = feetY - world.params.playerHeight * TILE;
  p.body.vx = 0;
  p.body.vy = 0;
  run(world, 2);
  return p;
}

const pw = (world: World) => world.params.playerWidth * TILE;

describe('poderes da Floresta', () => {
  it('todos os avisos novos duram pelo menos 0,6 s (0,85 s no fácil)', () => {
    for (const [mode, min] of [['medio', 0.6], ['facil', 0.85]] as const) {
      const w = warnTimes(mode);
      for (const t of [w.cocoon, w.leap, w.sprout, w.twig, w.lob, w.roll]) expect(t).toBeGreaterThanOrEqual(min);
    }
  });

  it('lagarta: com alguém perto vira casulo (parada), sai borboleta voando atrás dele e depois pousa', () => {
    const world = setup();
    stand(world, 'p0', 15 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_LAGARTA, { col: 12, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const x = e.body.x;
    const warned = until(world, 3, () => e.skill !== SKILL_WARN);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.cocoon - 2 * TICK_DT);
    expect(e.body.x).toBeCloseTo(x, 5);
    expect(e.skill).toBe(SKILL_ACT);
    let highest = Infinity;
    run(world, 1);
    until(world, RULES.flyTime + 1, () => {
      highest = Math.min(highest, feet(e));
      if (e.skill === SKILL_ACT) expect(e.body.onGround).toBe(false);
      return e.skill !== SKILL_ACT;
    });
    // Voou acima do chão, por perto de quem estava ali.
    expect(highest).toBeLessThan(FLOOR - TILE);
    expect(Math.abs(center(e) - 15 * TILE)).toBeLessThan(3 * TILE);
    until(world, 3, () => e.skill === SKILL_NONE);
    expect(e.skill).toBe(SKILL_NONE);
    expect(e.body.onGround).toBe(true);
    expect(e.skillCd).toBeGreaterThan(0);
  });

  it('borboleta encharcada cai como bola', () => {
    const world = setup();
    stand(world, 'p0', 15 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_LAGARTA, { col: 12, row: 6 });
    until(world, 4, () => e.skill === SKILL_ACT && feet(e) < FLOOR - TILE);
    (world as unknown as { soak(e: Enemy, n: number): void }).soak(e, 10);
    expect(e.mode).toBe(MODE_BALL);
    until(world, 2, () => e.body.onGround);
    expect(feet(e)).toBeCloseTo(FLOOR, 3);
  });

  it('grilo: marca onde a pessoa está, avisa e salta em arco até lá, mesmo em outro andar', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    expect(p.body.onGround).toBe(true);
    const e = world.spawnEnemy(ENEMY_GRILO, { col: 15, row: 6 });
    until(world, 12, () => e.skill === SKILL_WARN, {});
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.aimX).toBeCloseTo(p.body.x + pw(world) / 2, 3);
    expect(e.aimY).toBeCloseTo(PLATFORM, 3);
    const warned = until(world, 2, () => e.skill !== SKILL_WARN);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.leap - 2 * TICK_DT);
    until(world, 2, () => e.skill !== SKILL_ACT);
    // Caiu na marca, em cima da plataforma.
    run(world, 2);
    expect(feet(e)).toBeCloseTo(PLATFORM, 3);
    expect(Math.abs(center(e) - e.aimX)).toBeLessThan(1);
  });

  it('pinha: correndo, larga pinhões; o broto só machuca depois de brotar; um tiro o arranca', () => {
    const world = setup();
    world.players.get('p0')!.away = true;
    const e = world.spawnEnemy(ENEMY_PINHA, { col: 4, row: 6 });
    e.dir = 1;
    until(world, 4, () => world.sprouts.size > 0);
    const s = [...world.sprouts.values()][0]!;
    expect(s.y + RULES.sproutHeight * TILE).toBeCloseTo(FLOOR, 3);
    world.enemies.delete(e.id);

    // Em cima do broto: brotando, não derruba; brotado, derruba.
    const p = world.players.get('p0')!;
    p.away = false;
    p.invuln = 0;
    s.age = 0;
    stand(world, 'p0', s.x + (RULES.sproutWidth * TILE) / 2, FLOOR);
    expect(p.down).toBe(false);
    until(world, 2, () => p.down);
    expect(p.down).toBe(true);
    expect(s.age).toBeGreaterThanOrEqual(world.warn.sprout - TICK_DT);

    // Outro mundo: o tiro de tinta arranca o broto.
    const w2 = setup();
    const id = 999;
    w2.sprouts.set(id, { id, x: 12 * TILE, y: FLOOR - RULES.sproutHeight * TILE, age: 0 });
    const shooter = stand(w2, 'p0', 9 * TILE, FLOOR);
    shooter.body.facing = 1;
    tap(w2, 'p0', BTN_ATTACK);
    until(w2, 1, () => !w2.sprouts.has(id));
    expect(w2.sprouts.has(id)).toBe(false);
    expect(sproutBox({ x: 0, y: 0 }).w).toBeCloseTo(RULES.sproutWidth * TILE);
  });

  it('bicho-cesto: com alguém embaixo, treme parado (aviso) e solta um graveto que cai reto e derruba', () => {
    const world = setup();
    const e = world.spawnEnemy(ENEMY_CESTO, { col: 7, row: 4 });
    const p = stand(world, 'p0', center(e), FLOOR);
    until(world, 1, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const y = e.body.y;
    const warned = until(world, 2, () => world.spits.size > 0);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.twig - 2 * TICK_DT);
    expect(e.body.y).toBeCloseTo(y, 5);
    const twig = [...world.spits.values()][0]!;
    expect(twig.kind).toBe(SPIT_GRAVETO);
    expect(twig.x + (RULES.spitSize * TILE) / 2).toBeCloseTo(center(e), 3);
    p.invuln = 0;
    until(world, 1, () => p.down);
    expect(p.down).toBe(true);
    expect(world.spits.has(twig.id)).toBe(false);
  });

  it('caracol: marca onde a pessoa está, avisa e a seiva cai ali em arco, passando pela plataforma', () => {
    const world = setup();
    const p = stand(world, 'p0', 11 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_CARACOL, { col: 3, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.aimX).toBeCloseTo(11 * TILE, 3);
    expect(e.aimY).toBeCloseTo(FLOOR, 3);
    const warned = until(world, 2, () => world.spits.size > 0);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.lob - 2 * TICK_DT);
    const lob = [...world.spits.values()][0]!;
    expect(lob.kind).toBe(SPIT_SEIVA);
    p.invuln = 0;
    let top = Infinity;
    let last = { x: lob.x, y: lob.y };
    until(world, 2, () => {
      if (!world.spits.has(lob.id)) return true;
      top = Math.min(top, lob.y);
      last = { x: lob.x, y: lob.y };
      return false;
    });
    // Subiu acima da plataforma e caiu perto da marca, derrubando quem estava lá.
    expect(top).toBeLessThan(PLATFORM + TILE);
    expect(Math.abs(last.x + (RULES.spitSize * TILE) / 2 - e.aimX)).toBeLessThan(TILE);
    expect(p.down).toBe(true);
  });

  it('ouriço: enrola (aviso, imune), rola até cansar e fica tonto; tonto, a tinta pega de qualquer lado', () => {
    const world = setup(2);
    const front = stand(world, 'p0', 12 * TILE, FLOOR);
    const back = stand(world, 'p1', 2.5 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_OURICO, { col: 7, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.dir).toBe(1);
    // Enrolando: a tinta de trás estoura.
    back.body.facing = 1;
    tap(world, 'p1', BTN_ATTACK);
    run(world, 10);
    expect(e.soak).toBe(0);
    until(world, 2, () => e.skill === SKILL_ACT);
    expect(e.skill).toBe(SKILL_ACT);
    // Rolando: a de frente também estoura.
    front.body.facing = -1;
    tap(world, 'p0', BTN_ATTACK);
    run(world, 6);
    expect(e.soak).toBe(0);
    until(world, 3, () => e.skill === SKILL_REST);
    expect(e.skill).toBe(SKILL_REST);
    // Tonto: pega de qualquer lado.
    const shooter = e.body.x > front.body.x ? front : back;
    const id = shooter === front ? 'p0' : 'p1';
    shooter.body.facing = e.body.x > shooter.body.x ? 1 : -1;
    stand(world, id, center(e) - shooter.body.facing * 4 * TILE, FLOOR);
    shooter.body.facing = e.body.x > shooter.body.x ? 1 : -1;
    tap(world, id, BTN_ATTACK);
    until(world, 1, () => e.soak > 0);
    expect(e.soak).toBeGreaterThan(0);
  });

  it('sem o poder da fase, lagarta, grilo, pinha, cesto e caracol só andam', () => {
    for (const kind of [ENEMY_LAGARTA, ENEMY_GRILO, ENEMY_PINHA, ENEMY_CARACOL, ENEMY_CESTO]) {
      const world = setup();
      stand(world, 'p0', 9 * TILE, FLOOR);
      const e = world.spawnEnemy(kind, kind === ENEMY_CESTO ? { col: 7, row: 4 } : { col: 4, row: 6 }, false);
      for (let t = 0; t < ticks(8); t++) {
        run(world, 1);
        expect(e.skill, String(kind)).toBe(SKILL_NONE);
      }
      expect(world.spits.size + world.sprouts.size, String(kind)).toBe(0);
    }
  });

  it('os fiapos do Apontador são lagartas e pinhas', () => {
    const world = new World([BOSQUE_ARENA], 5, { difficulty: 'medio' });
    world.addPlayer('p0', 0);
    world.players.get('p0')!.invuln = 1e9;
    world.start();
    expect(world.phase).toBe(PHASE_PLAYING);
    const kinds = new Set<number>();
    until(world, 30, () => {
      for (const e of world.enemies.values()) kinds.add(e.kind);
      return false;
    });
    expect(kinds.size).toBeGreaterThan(0);
    for (const k of kinds) expect([ENEMY_LAGARTA, ENEMY_PINHA]).toContain(k);
  });
});
