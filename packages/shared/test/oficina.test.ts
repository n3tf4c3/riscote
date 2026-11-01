import { describe, expect, it } from 'vitest';
import {
  BANCADA_ARENA,
  BTN_ATTACK,
  ENEMY_COMPASSO,
  ENEMY_FURADEIRA,
  ENEMY_IMA,
  ENEMY_MARTELO,
  ENEMY_MOLA,
  ENEMY_PRUMO,
  ENEMY_SIZE,
  PHASE_PLAYING,
  RULES,
  SKILL_ACT,
  SKILL_NONE,
  SKILL_REST,
  SKILL_WARN,
  SPIT_BROCA,
  SPIT_PARAFUSO,
  TICK_DT,
  TILE,
  World,
  parseArena,
  warnTimes,
  type Enemy,
} from '../src/index.ts';

// Os poderes das criaturas da Oficina Mágica (2026-11-01): cada um com aviso antes e um jeito de
// escapar. Chão na linha 7; plataforma na linha 3 (colunas 5 a 9); ponto de fio na 4.
const ARENA = parseArena('oficina-teste', 'Teste da Oficina', [
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

function until(world: World, seconds: number, done: () => boolean): number {
  let n = 0;
  while (n < ticks(seconds) && !done()) {
    run(world, 1);
    n++;
  }
  return n;
}

function stand(world: World, id: string, cx: number, feetY: number) {
  const p = world.players.get(id)!;
  p.body.x = cx - (world.params.playerWidth * TILE) / 2;
  p.body.y = feetY - world.params.playerHeight * TILE;
  p.body.vx = 0;
  p.body.vy = 0;
  run(world, 2);
  return p;
}

/** Avança o aviso inteiro e confere que ele durou o tempo combinado sem derrubar ninguém. */
function warnPasses(world: World, e: Enemy, warn: number, p?: { down: boolean }) {
  let downInWarn = false;
  const n = until(world, 3, () => {
    if (p?.down && e.skill === SKILL_WARN) downInWarn = true;
    return e.skill !== SKILL_WARN;
  });
  expect(n * TICK_DT).toBeGreaterThanOrEqual(warn - 2 * TICK_DT);
  expect(downInWarn).toBe(false);
}

describe('poderes da Oficina', () => {
  it('todos os avisos novos duram pelo menos 0,6 s (0,85 s no fácil)', () => {
    for (const [mode, min] of [['medio', 0.6], ['facil', 0.85]] as const) {
      const w = warnTimes(mode);
      for (const t of [w.compass, w.spring, w.magnet, w.plumb, w.drill, w.hammer]) expect(t).toBeGreaterThanOrEqual(min);
    }
  });

  it('compasso: crava a ponta (aviso) e gira a perna uma volta inteira, derrubando quem está no raio', () => {
    const world = setup();
    const p = stand(world, 'p0', 9 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_COMPASSO, { col: 7, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    p.invuln = 0;
    warnPasses(world, e, world.warn.compass, p);
    const cx = center(e);
    const cy = e.body.y + size / 2;
    let up = Infinity;
    let left = Infinity;
    let right = -Infinity;
    until(world, RULES.compassTime + 0.1, () => {
      expect(Math.hypot(e.aimX - cx, e.aimY - cy)).toBeCloseTo(RULES.compassReach * TILE, 3);
      up = Math.min(up, e.aimY);
      left = Math.min(left, e.aimX);
      right = Math.max(right, e.aimX);
      return e.skill !== SKILL_ACT;
    });
    // Uma volta inteira: passou por cima e pelos dois lados.
    expect(up).toBeLessThan(cy - 2 * TILE);
    expect(left).toBeLessThan(cx - 2 * TILE);
    expect(right).toBeGreaterThan(cx + 2 * TILE);
    expect(p.down).toBe(true);
  });

  it('compasso: quem sai do raio durante o aviso escapa', () => {
    const world = setup();
    const p = stand(world, 'p0', 9 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_COMPASSO, { col: 7, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    stand(world, 'p0', center(e) + (RULES.compassReach + 1.5) * TILE, FLOOR);
    p.invuln = 0;
    until(world, 3, () => e.skill === SKILL_REST);
    expect(e.skill).toBe(SKILL_REST);
    expect(p.down).toBe(false);
  });

  it('molinha: encolhe (aviso) e dispara reta, ricocheteando, sem sair da arena', () => {
    const world = setup();
    stand(world, 'p0', 15 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_MOLA, { col: 4, row: 6 });
    until(world, 15, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const x = e.body.x;
    warnPasses(world, e, world.warn.spring);
    expect(Math.abs(e.body.x - x)).toBeLessThan(2);
    expect(Math.hypot(e.fromX, e.fromY)).toBeCloseTo(RULES.springSpeed * TILE, 3);
    let flips = 0;
    let last = [Math.sign(e.fromX), Math.sign(e.fromY)];
    until(world, RULES.springTime + 0.1, () => {
      const now = [Math.sign(e.fromX), Math.sign(e.fromY)];
      if (now[0] !== last[0] || now[1] !== last[1]) flips++;
      last = now;
      expect(e.body.x).toBeGreaterThanOrEqual(TILE - 0.01);
      expect(e.body.x + size).toBeLessThanOrEqual(19 * TILE + 0.01);
      return e.skill !== SKILL_ACT;
    });
    expect(flips).toBeGreaterThan(0);
  });

  it('ímã: marca os dois lados (aviso) e os parafusos deslizam pelo chão até ele, derrubando quem está no caminho', () => {
    const world = setup();
    const p = stand(world, 'p0', 12 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_IMA, { col: 8, row: 6 });
    e.dir = 1;
    until(world, 4, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.aimX).toBeLessThan(center(e));
    expect(e.aimY).toBeGreaterThan(center(e));
    p.invuln = 0;
    warnPasses(world, e, world.warn.magnet, p);
    const screws = [...world.spits.values()].filter((s) => s.kind === SPIT_PARAFUSO);
    expect(screws).toHaveLength(2);
    for (const s of screws) {
      expect(s.y + RULES.spitSize * TILE).toBeCloseTo(FLOOR, 5);
      expect(Math.sign(s.vx)).toBe(Math.sign(center(e) - (s.x + (RULES.spitSize * TILE) / 2)));
    }
    until(world, 2, () => p.down);
    expect(p.down).toBe(true);
  });

  it('prumo: com alguém embaixo, treme (aviso), despenca no chão com uma onda e volta ao fio', () => {
    const world = setup();
    const e = world.spawnEnemy(ENEMY_PRUMO, { col: 7, row: 4 });
    const p = stand(world, 'p0', center(e) + TILE, FLOOR);
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.aimY).toBeCloseTo(FLOOR, 3);
    const start = e.body.y;
    p.invuln = 0;
    warnPasses(world, e, world.warn.plumb, p);
    until(world, 1, () => e.skill === SKILL_REST);
    expect(e.body.y + size).toBeCloseTo(FLOOR, 3);
    expect(world.shocks.length).toBeGreaterThan(0);
    // A onda chega a quem está ao lado.
    until(world, 1, () => p.down);
    expect(p.down).toBe(true);
    until(world, 3, () => e.skill === SKILL_NONE);
    expect(e.body.y).toBeCloseTo(start, 3);
    expect(e.anchorY).toBeGreaterThanOrEqual(0);
  });

  it('furadeira: vai para baixo de quem está no andar de cima, avisa e a broca sobe e derruba', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_FURADEIRA, { col: 11, row: 6 });
    until(world, 6, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(Math.abs(center(e) - 7 * TILE)).toBeLessThanOrEqual(RULES.drillAlign * TILE + 1);
    p.invuln = 0;
    warnPasses(world, e, world.warn.drill, p);
    const bit = [...world.spits.values()].find((s) => s.kind === SPIT_BROCA)!;
    expect(bit.vy).toBeLessThan(0);
    expect(bit.vx).toBe(0);
    until(world, 2, () => p.down);
    expect(p.down).toBe(true);
  });

  it('martelo: a cabeça barra a tinta; erguido (aviso), encharca; a batida derruba quem está de pé no chão dele e não quem está no ar', () => {
    const world = setup(2);
    const front = stand(world, 'p0', 11 * TILE, FLOOR);
    const back = stand(world, 'p1', 2.5 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_MARTELO, { col: 7, row: 6 });
    e.skillCd = 100;
    run(world, 2);
    expect(e.dir).toBe(1);
    front.body.facing = -1;
    tap(world, 'p0', BTN_ATTACK);
    run(world, 12);
    expect(e.soak).toBe(0);
    back.body.facing = 1;
    tap(world, 'p1', BTN_ATTACK);
    until(world, 1, () => e.soak > 0);
    expect(e.soak).toBeGreaterThan(0);

    const w2 = setup(2);
    const shooter = stand(w2, 'p0', 11 * TILE, FLOOR);
    const jumper = stand(w2, 'p1', 15 * TILE, FLOOR);
    const hammer = w2.spawnEnemy(ENEMY_MARTELO, { col: 7, row: 6 });
    until(w2, 2, () => hammer.skill === SKILL_WARN);
    expect(hammer.skill).toBe(SKILL_WARN);
    shooter.body.facing = -1;
    tap(w2, 'p0', BTN_ATTACK);
    until(w2, 0.5, () => hammer.soak > 0);
    expect(hammer.soak).toBeGreaterThan(0);
    shooter.invuln = 0;
    jumper.invuln = 0;
    // Um no chão, o outro no ar enquanto o chão treme.
    until(w2, 2, () => {
      jumper.body.y = FLOOR - w2.params.playerHeight * TILE - 2 * TILE;
      jumper.body.vy = 0;
      jumper.body.onGround = false;
      return hammer.skill === SKILL_REST;
    });
    expect(shooter.down).toBe(true);
    expect(jumper.down).toBe(false);
  });

  it('sem o poder da fase, compasso, molinha, ímã, prumo e furadeira só andam', () => {
    for (const kind of [ENEMY_COMPASSO, ENEMY_MOLA, ENEMY_IMA, ENEMY_PRUMO, ENEMY_FURADEIRA]) {
      const world = setup();
      stand(world, 'p0', 9 * TILE, FLOOR);
      const e = world.spawnEnemy(kind, kind === ENEMY_PRUMO ? { col: 7, row: 4 } : { col: 4, row: 6 }, false);
      for (let t = 0; t < ticks(8); t++) {
        run(world, 1);
        expect(e.skill, String(kind)).toBe(SKILL_NONE);
      }
      expect(world.spits.size + world.shocks.length, String(kind)).toBe(0);
    }
  });

  it('os fiapos da Lapiseira são compassos e ímãs', () => {
    const world = new World([BANCADA_ARENA], 5, { difficulty: 'medio' });
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
    for (const k of kinds) expect([ENEMY_COMPASSO, ENEMY_IMA]).toContain(k);
  });
});
