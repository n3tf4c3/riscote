import { describe, expect, it } from 'vitest';
import {
  BTN_ATTACK,
  CORETO_ARENA,
  ENEMY_BESOURO,
  ENEMY_CHAFARIZ,
  ENEMY_SAPO,
  ENEMY_SINO,
  ENEMY_SIZE,
  ENEMY_SOMBRINHA,
  ENEMY_VAGALUME,
  PHASE_PLAYING,
  RULES,
  SKILL_ACT,
  SKILL_NONE,
  SKILL_REST,
  SKILL_WARN,
  SPIT_BOLHA,
  SPIT_GOTINHA,
  SPIT_ORVALHO,
  TICK_DT,
  TILE,
  World,
  geyserBox,
  parseArena,
  warnTimes,
  type Enemy,
} from '../src/index.ts';

// Os poderes das criaturas do Jardim das Lanternas (2026-11-01): cada um com aviso antes e um jeito de
// escapar. Chão na linha 7; plataforma na linha 3 (colunas 5 a 9); ponto de fio na 4.
const ARENA = parseArena('jardim-teste', 'Teste do Jardim', [
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

/** Avança até `done` (ou o limite) e devolve os ticks gastos. */
function until(world: World, seconds: number, done: () => boolean): number {
  let n = 0;
  while (n < ticks(seconds) && !done()) {
    run(world, 1);
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

describe('poderes do Jardim', () => {
  it('todos os avisos novos duram pelo menos 0,6 s (0,85 s no fácil)', () => {
    for (const [mode, min] of [['medio', 0.6], ['facil', 0.85]] as const) {
      const w = warnTimes(mode);
      for (const t of [w.flash, w.bubble, w.dew, w.swing, w.geyser, w.parasol]) expect(t).toBeGreaterThanOrEqual(min);
    }
  });

  it('vaga-lume: com alguém perto acende parado (aviso) e o clarão derruba quem ficou no círculo', () => {
    const world = setup();
    const p = stand(world, 'p0', 9 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_VAGALUME, { col: 7, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const x = e.body.x;
    p.invuln = 0;
    let downInWarn = false;
    const warned = until(world, 2, () => {
      if (p.down && e.skill === SKILL_WARN) downInWarn = true;
      return e.skill !== SKILL_WARN;
    });
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.flash - 2 * TICK_DT);
    expect(downInWarn).toBe(false);
    expect(Math.abs(e.body.x - x)).toBeLessThan(2);
    run(world, 2);
    expect(p.down).toBe(true);
  });

  it('vaga-lume: quem sai do círculo durante o aviso escapa do clarão', () => {
    const world = setup();
    const p = stand(world, 'p0', 9 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_VAGALUME, { col: 7, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    stand(world, 'p0', center(e) + (RULES.flashRadius + 1.5) * TILE, FLOOR);
    p.invuln = 0;
    until(world, 2, () => e.skill === SKILL_REST);
    expect(e.skill).toBe(SKILL_REST);
    expect(p.down).toBe(false);
  });

  it('sapo: incha as bochechas (aviso) e sopra uma bolha que persegue devagar quem está mais perto', () => {
    const world = setup();
    const p = stand(world, 'p0', 15 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_SAPO, { col: 4, row: 6 });
    until(world, 15, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const warned = until(world, 2, () => world.spits.size > 0);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.bubble - 2 * TICK_DT);
    const bubble = [...world.spits.values()][0]!;
    expect(bubble.kind).toBe(SPIT_BOLHA);
    // Persegue: o jogador sobe para a plataforma e a bolha vai atrás, sem passar da velocidade dela.
    stand(world, 'p0', 7 * TILE, PLATFORM);
    const half = (RULES.spitSize * TILE) / 2;
    const dist = () => Math.hypot(p.body.x + pw(world) / 2 - (bubble.x + half), p.body.y + (world.params.playerHeight * TILE) / 2 - (bubble.y + half));
    const before = dist();
    run(world, ticks(0.5));
    expect(dist()).toBeLessThan(before);
    expect(Math.hypot(bubble.vx, bubble.vy)).toBeCloseTo(RULES.bubbleSpeed * TILE, 3);
    p.invuln = 0;
    until(world, RULES.bubbleLife, () => p.down);
    expect(p.down).toBe(true);
    expect(world.spits.has(bubble.id)).toBe(false);
  });

  it('sapo: um tiro de tinta estoura a bolha', () => {
    const world = setup();
    const shooter = stand(world, 'p0', 15 * TILE, FLOOR);
    const id = 999;
    world.spits.set(id, { id, kind: SPIT_BOLHA, x: 11 * TILE, y: FLOOR - TILE, vx: 0, vy: 0, life: 5 });
    shooter.body.facing = -1;
    tap(world, 'p0', BTN_ATTACK);
    until(world, 1, () => !world.spits.has(id));
    expect(world.spits.has(id)).toBe(false);
  });

  it('besouro: vendo alguém à frente, para (aviso) e chuta uma gota que rola rente ao chão e derruba', () => {
    const world = setup();
    const p = stand(world, 'p0', 13 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_BESOURO, { col: 3, row: 6 });
    e.dir = 1;
    until(world, 4, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const warned = until(world, 2, () => world.spits.size > 0);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.dew - 2 * TICK_DT);
    const dew = [...world.spits.values()][0]!;
    expect(dew.kind).toBe(SPIT_ORVALHO);
    expect(dew.y + RULES.spitSize * TILE).toBeCloseTo(FLOOR, 5);
    expect(dew.vx).toBeGreaterThan(0);
    p.invuln = 0;
    until(world, 2, () => p.down);
    expect(p.down).toBe(true);
  });

  it('besouro: a gota cai pelo fim da plataforma até o chão de baixo e estoura na parede', () => {
    const world = setup();
    stand(world, 'p0', 9.5 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_BESOURO, { col: 5, row: 2 });
    e.dir = 1;
    until(world, 4, () => world.spits.size > 0);
    const dew = [...world.spits.values()][0]!;
    expect(dew.y + RULES.spitSize * TILE).toBeCloseTo(PLATFORM, 5);
    let lowest = 0;
    until(world, RULES.dewLife, () => {
      if (!world.spits.has(dew.id)) return true;
      lowest = Math.max(lowest, dew.y + RULES.spitSize * TILE);
      return false;
    });
    expect(lowest).toBeCloseTo(FLOOR, 5);
    expect(world.spits.has(dew.id)).toBe(false);
    expect(dew.x + RULES.spitSize * TILE).toBeGreaterThan(17 * TILE);
  });

  it('sino: com alguém embaixo, treme (aviso) e balança como pêndulo, derruba e volta ao lugar no fio', () => {
    const world = setup();
    const e = world.spawnEnemy(ENEMY_SINO, { col: 7, row: 4 });
    const p = stand(world, 'p0', center(e) + 2 * TILE, FLOOR);
    until(world, 3, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const start = { x: e.body.x, y: e.body.y };
    p.invuln = 0;
    const warned = until(world, 2, () => e.skill !== SKILL_WARN);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.swing - 2 * TICK_DT);
    // No aviso ele só desce no fio, até o fim dele; não sai para os lados.
    expect(e.body.x).toBeCloseTo(start.x, 5);
    expect(e.body.y).toBeGreaterThanOrEqual(start.y);
    const hang = { x: e.body.x, y: e.body.y };
    let left = Infinity;
    let right = -Infinity;
    until(world, RULES.swingPeriod * RULES.swingCount + 0.2, () => {
      left = Math.min(left, e.body.x);
      right = Math.max(right, e.body.x);
      return e.skill !== SKILL_ACT;
    });
    // Balançou para os dois lados, preso no mesmo ponto do fio.
    expect(left).toBeLessThan(start.x - TILE);
    expect(right).toBeGreaterThan(start.x + TILE);
    expect(p.down).toBe(true);
    expect(e.body.x).toBeCloseTo(hang.x, 3);
    expect(e.body.y).toBeCloseTo(hang.y, 3);
    expect(e.anchorY).toBeGreaterThanOrEqual(0);
  });

  it('chafariz: marca o chão de quem está em outro andar (aviso) e o jato sobe dali e derruba', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_CHAFARIZ, { col: 12, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.aimX).toBeCloseTo(p.body.x + pw(world) / 2, 3);
    expect(e.aimY).toBeCloseTo(PLATFORM, 3);
    const box = geyserBox(ARENA, e.aimX, e.aimY);
    expect(box.y + box.h).toBeCloseTo(PLATFORM, 3);
    expect(box.h).toBeCloseTo(RULES.geyserHeight * TILE, 3);
    p.invuln = 0;
    let downInWarn = false;
    const warned = until(world, 2, () => {
      if (p.down && e.skill === SKILL_WARN) downInWarn = true;
      return e.skill !== SKILL_WARN;
    });
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.geyser - 2 * TICK_DT);
    expect(downInWarn).toBe(false);
    run(world, 2);
    expect(p.down).toBe(true);
  });

  it('chafariz: quem sai da marca durante o aviso escapa do jato', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_CHAFARIZ, { col: 12, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    stand(world, 'p0', 3 * TILE, FLOOR);
    p.invuln = 0;
    until(world, 2, () => e.skill === SKILL_REST);
    expect(e.skill).toBe(SKILL_REST);
    expect(p.down).toBe(false);
  });

  it('sombrinha: aberta, barra a tinta de frente; fechando (aviso), encharca; abre espirrando gotinhas para cima', () => {
    const world = setup(2);
    const front = stand(world, 'p0', 11 * TILE, FLOOR);
    const back = stand(world, 'p1', 2.5 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_SOMBRINHA, { col: 7, row: 6 });
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

    // Outro mundo: fechando, a tinta de frente pega; depois do aviso, as gotinhas.
    const w2 = setup(1);
    const shooter = stand(w2, 'p0', 11 * TILE, FLOOR);
    const umbrella = w2.spawnEnemy(ENEMY_SOMBRINHA, { col: 7, row: 6 });
    until(w2, 2, () => umbrella.skill === SKILL_WARN);
    expect(umbrella.skill).toBe(SKILL_WARN);
    shooter.body.facing = -1;
    tap(w2, 'p0', BTN_ATTACK);
    until(w2, 0.5, () => umbrella.soak > 0);
    expect(umbrella.soak).toBeGreaterThan(0);
    until(w2, 2, () => w2.spits.size > 0);
    const drops = [...w2.spits.values()];
    expect(drops).toHaveLength(RULES.parasolDrops);
    for (const s of drops) {
      expect(s.kind).toBe(SPIT_GOTINHA);
      expect(s.vy).toBeLessThan(0);
    }
    expect(drops.some((s) => s.vx < 0) && drops.some((s) => s.vx > 0)).toBe(true);
    // Elas sobem, caem e somem no chão.
    until(w2, 3, () => drops.every((s) => !w2.spits.has(s.id)));
    expect(drops.every((s) => !w2.spits.has(s.id))).toBe(true);
  });

  it('sem o poder da fase, vaga-lume, sapo, besouro, chafariz e sino só andam', () => {
    for (const kind of [ENEMY_VAGALUME, ENEMY_SAPO, ENEMY_BESOURO, ENEMY_CHAFARIZ, ENEMY_SINO]) {
      const world = setup();
      stand(world, 'p0', 9 * TILE, FLOOR);
      const e = world.spawnEnemy(kind, kind === ENEMY_SINO ? { col: 7, row: 4 } : { col: 4, row: 6 }, false);
      for (let t = 0; t < ticks(8); t++) {
        run(world, 1);
        expect(e.skill, String(kind)).toBe(SKILL_NONE);
      }
      expect(world.spits.size, String(kind)).toBe(0);
    }
  });

  it('os fiapos do Regador são vaga-lumes e besouros', () => {
    const world = new World([CORETO_ARENA], 5, { difficulty: 'medio' });
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
    for (const k of kinds) expect([ENEMY_VAGALUME, ENEMY_BESOURO]).toContain(k);
  });
});
