import { describe, expect, it } from 'vitest';
import {
  BTN_ATTACK,
  ENEMY_AVIAO,
  ENEMY_BALAO,
  ENEMY_CORNETA,
  ENEMY_MOBILE,
  ENEMY_RAPOSA,
  ENEMY_SIZE,
  ENEMY_TORREAO,
  PHASE_PLAYING,
  RULES,
  SKILL_ACT,
  SKILL_NONE,
  SKILL_WARN,
  SPIT_ESTILHACO,
  SPIT_ESTRELA,
  SPIT_FLECHA,
  SPIT_NOTA,
  TICK_DT,
  TILE,
  TORRE_ARENA,
  World,
  parseArena,
  towerSpots,
  warnTimes,
  type Enemy,
} from '../src/index.ts';

// Os poderes das criaturas do Castelo das Nuvens (2026-11-01): cada um com aviso antes e um jeito de
// escapar. Chão na linha 7; plataforma na linha 3 (colunas 5 a 9); ponto de fio na 4.
const ARENA = parseArena('castelo-teste', 'Teste do Castelo', [
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

function warnPasses(world: World, e: Enemy, warn: number, p?: { down: boolean }) {
  let downInWarn = false;
  const n = until(world, 3, () => {
    if (p?.down && e.skill === SKILL_WARN) downInWarn = true;
    return e.skill !== SKILL_WARN;
  });
  expect(n * TICK_DT).toBeGreaterThanOrEqual(warn - 2 * TICK_DT);
  expect(downInWarn).toBe(false);
}

const pw = (world: World) => world.params.playerWidth * TILE;

describe('poderes do Castelo', () => {
  it('todos os avisos novos duram pelo menos 0,6 s (0,85 s no fácil)', () => {
    for (const [mode, min] of [['medio', 0.6], ['facil', 0.85]] as const) {
      const w = warnTimes(mode);
      for (const t of [w.fox, w.balloon, w.plane, w.mobile, w.horn, w.tower]) expect(t).toBeGreaterThanOrEqual(min);
    }
  });

  it('raposa: fareja (aviso) e segue o rastro atrasada, atravessando as plataformas; quem para é alcançado', () => {
    const world = setup();
    const p = stand(world, 'p0', 12 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_RAPOSA, { col: 6, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    warnPasses(world, e, world.warn.fox);
    expect(e.skill).toBe(SKILL_ACT);
    // O jogador sobe para a plataforma: a raposa vai atrás pelo caminho dele, sem chão.
    stand(world, 'p0', 7 * TILE, PLATFORM);
    p.invuln = 0;
    let leftGround = false;
    until(world, RULES.foxTime, () => {
      if (!e.body.onGround && e.skill === SKILL_ACT) leftGround = true;
      return p.down;
    });
    expect(leftGround).toBe(true);
    expect(p.down).toBe(true);
  });

  it('raposa: segue onde a pessoa esteve, e não onde ela está', () => {
    const world = setup();
    const p = stand(world, 'p0', 10 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_RAPOSA, { col: 5, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    warnPasses(world, e, world.warn.fox);
    // A pessoa anda para a direita sem parar; a raposa fica atrás dela.
    let behind = 0;
    for (let i = 0; i < ticks(0.6); i++) {
      p.body.x += 4 * TILE * TICK_DT;
      run(world, 1);
      if (center(e) < p.body.x) behind++;
    }
    expect(behind).toBe(ticks(0.6));
  });

  it('balãozinho: incha (aviso) e estoura em lascas para todos os lados', () => {
    const world = setup();
    stand(world, 'p0', 15 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_BALAO, { col: 6, row: 6 });
    until(world, 15, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    warnPasses(world, e, world.warn.balloon);
    const shards = [...world.spits.values()].filter((s) => s.kind === SPIT_ESTILHACO);
    expect(shards).toHaveLength(RULES.shardCount);
    const angles = new Set(shards.map((s) => Math.round((Math.atan2(s.vy, s.vx) * 180) / Math.PI)));
    expect(angles.size).toBe(RULES.shardCount);
    for (const s of shards) expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(RULES.shardSpeed * TILE, 3);
  });

  it('avião: mira quem está em outro andar (aviso) e voa reto até lá, atravessando a plataforma', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_AVIAO, { col: 13, row: 6 });
    until(world, 4, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.aimX).toBeCloseTo(p.body.x + pw(world) / 2, 3);
    p.invuln = 0;
    warnPasses(world, e, world.warn.plane, p);
    let highest = Infinity;
    until(world, RULES.planeTime, () => {
      highest = Math.min(highest, e.body.y);
      return p.down;
    });
    expect(highest).toBeLessThan(PLATFORM);
    expect(p.down).toBe(true);
  });

  it('móbile: com alguém na altura dele, gira (aviso) e atira uma estrela para cada lado', () => {
    const world = setup();
    const e = world.spawnEnemy(ENEMY_MOBILE, { col: 7, row: 4 });
    const p = stand(world, 'p0', center(e) + 5 * TILE, FLOOR);
    until(world, 4, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    p.invuln = 0;
    warnPasses(world, e, world.warn.mobile, p);
    const stars = [...world.spits.values()].filter((s) => s.kind === SPIT_ESTRELA);
    expect(stars).toHaveLength(2);
    expect(stars.map((s) => Math.sign(s.vx)).sort()).toEqual([-1, 1]);
    for (const s of stars) expect(s.vy).toBe(0);
    until(world, 2, () => p.down);
    expect(p.down).toBe(true);
  });

  it('cornetinha: com alguém no mesmo andar, sopra (aviso) duas notas que avançam em onda', () => {
    const world = setup();
    const p = stand(world, 'p0', 12 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_CORNETA, { col: 5, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    warnPasses(world, e, world.warn.horn);
    const notes = [...world.spits.values()].filter((s) => s.kind === SPIT_NOTA);
    expect(notes).toHaveLength(2);
    const ys = new Set<number>();
    until(world, 0.8, () => {
      for (const s of notes) if (world.spits.has(s.id)) ys.add(Math.round(s.y));
      return false;
    });
    // Sobem e descem: a onda cobre mais de uma célula de altura.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(TILE);
    for (const s of notes) expect(Math.sign(s.vx)).toBe(1);
    p.invuln = 0;
    stand(world, 'p0', 12 * TILE, FLOOR);
    const w2 = setup();
    const q = stand(w2, 'p0', 10 * TILE, FLOOR);
    const horn = w2.spawnEnemy(ENEMY_CORNETA, { col: 5, row: 6 });
    until(w2, 2, () => horn.skill === SKILL_WARN);
    q.invuln = 0;
    until(w2, 4, () => q.down);
    expect(q.down).toBe(true);
  });

  it('torreão: o portão barra a tinta; aberto (aviso), encharca; as flechas caem nas três marcas', () => {
    const world = setup(2);
    const front = stand(world, 'p0', 11 * TILE, FLOOR);
    const back = stand(world, 'p1', 2.5 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_TORREAO, { col: 7, row: 6 });
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

    const w2 = setup(1);
    const shooter = stand(w2, 'p0', 12 * TILE, FLOOR);
    const tower = w2.spawnEnemy(ENEMY_TORREAO, { col: 6, row: 6 });
    until(w2, 2, () => tower.skill === SKILL_WARN);
    expect(tower.skill).toBe(SKILL_WARN);
    const spots = towerSpots(ARENA, { x: tower.body.x, y: tower.body.y, dir: tower.dir });
    expect(spots).toHaveLength(3);
    shooter.body.facing = -1;
    tap(w2, 'p0', BTN_ATTACK);
    until(w2, 0.6, () => tower.soak > 0);
    expect(tower.soak).toBeGreaterThan(0);
    // Quem está numa marca é derrubado pela flecha.
    const target = stand(w2, 'p0', spots[1]!, FLOOR);
    target.invuln = 0;
    until(w2, 2, () => w2.spits.size > 0);
    const arrows = [...w2.spits.values()].filter((s) => s.kind === SPIT_FLECHA);
    expect(arrows.map((s) => s.x + (RULES.spitSize * TILE) / 2)).toEqual(spots);
    until(w2, 2, () => target.down);
    expect(target.down).toBe(true);
  });

  it('sem o poder da fase, raposa, balãozinho, avião, móbile e cornetinha só andam', () => {
    for (const kind of [ENEMY_RAPOSA, ENEMY_BALAO, ENEMY_AVIAO, ENEMY_MOBILE, ENEMY_CORNETA]) {
      const world = setup();
      stand(world, 'p0', 9 * TILE, FLOOR);
      const e = world.spawnEnemy(kind, kind === ENEMY_MOBILE ? { col: 7, row: 4 } : { col: 4, row: 6 }, false);
      for (let t = 0; t < ticks(8); t++) {
        run(world, 1);
        expect(e.skill, String(kind)).toBe(SKILL_NONE);
      }
      expect(world.spits.size, String(kind)).toBe(0);
    }
  });

  it('os fiapos do Dragão-Pipa são raposas e aviões', () => {
    const world = new World([TORRE_ARENA], 5, { difficulty: 'medio' });
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
    for (const k of kinds) expect([ENEMY_RAPOSA, ENEMY_AVIAO]).toContain(k);
  });
});
