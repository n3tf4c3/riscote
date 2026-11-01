import { describe, expect, it } from 'vitest';
import {
  ATRIL_ARENA,
  BTN_ATTACK,
  ENEMY_CORUJA,
  ENEMY_DICIONARIO,
  ENEMY_ENCICLOPEDIA,
  ENEMY_MARCADOR,
  ENEMY_MORCEGO,
  ENEMY_PERGAMINHO,
  ENEMY_SIZE,
  PHASE_PLAYING,
  RULES,
  SKILL_ACT,
  SKILL_NONE,
  SKILL_REST,
  SKILL_WARN,
  SPIT_LETRA,
  SPIT_PAGINA,
  TICK_DT,
  TILE,
  World,
  beamLine,
  parseArena,
  unrollBox,
  warnTimes,
  type Enemy,
} from '../src/index.ts';

// Os poderes das criaturas da Biblioteca dos Sonhos (decisões do usuário em 2026-11-01): cada um com
// aviso antes e um jeito de escapar. Chão na linha 7; plataforma na linha 3 (colunas 5 a 9); ponto de fio na 4.
const ARENA = parseArena('biblioteca-teste', 'Teste da Biblioteca', [
  '#..................#',
  '#..................#',
  '#..................#',
  '#....=====.........#',
  '#......A...........#',
  '#..................#',
  '#T.P.P.P.P.P......T#',
  '####################',
]);
// Uma pilha de livros no meio, do teto ao chão: a coruja não enxerga através dela.
const PAREDE = parseArena('biblioteca-parede', 'Teste da Biblioteca com parede', [
  '#..................#',
  '#.........#........#',
  '#.........#........#',
  '#.........#........#',
  '#.........#........#',
  '#.........#........#',
  '#T.P.P.P.P#P......T#',
  '####################',
]);
const FLOOR = 7 * TILE;
const PLATFORM = 3 * TILE;
const ticks = (s: number) => Math.round(s / TICK_DT);
const size = ENEMY_SIZE * TILE;
const center = (e: Enemy) => e.body.x + size / 2;
const feet = (e: Enemy) => e.body.y + size;

function setup(players = 1, arena = ARENA) {
  const world = new World(arena, 1, { waves: false, difficulty: 'dificil' });
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

describe('poderes da Biblioteca', () => {
  it('todos os avisos novos duram pelo menos 0,6 s (0,85 s no fácil)', () => {
    for (const [mode, min] of [['medio', 0.6], ['facil', 0.85]] as const) {
      const w = warnTimes(mode);
      for (const t of [w.warp, w.pages, w.unroll, w.dive, w.beam, w.letters]) expect(t).toBeGreaterThanOrEqual(min);
    }
  });

  it('marca-página: marca um ponto ao lado de quem está longe, some parado (aviso) e aparece lá, mesmo em outro andar', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_MARCADOR, { col: 15, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const px = p.body.x + pw(world) / 2;
    expect(e.aimY).toBeCloseTo(PLATFORM, 3);
    expect(Math.abs(e.aimX - px)).toBeGreaterThanOrEqual(1.5 * TILE);
    expect(Math.abs(e.aimX - px)).toBeLessThanOrEqual((RULES.warpGap + 1.5) * TILE);
    const x = e.body.x;
    const warned = until(world, 3, () => e.skill !== SKILL_WARN);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.warp - 2 * TICK_DT);
    expect(e.skill).toBe(SKILL_REST);
    expect(x).toBeGreaterThan(14 * TILE);
    run(world, 3);
    // Apareceu na marca, de pé na plataforma e virado para quem ele foi buscar.
    expect(feet(e)).toBeCloseTo(PLATFORM, 3);
    expect(Math.abs(center(e) - e.aimX)).toBeLessThan(1);
    expect(e.dir).toBe(px > center(e) ? 1 : -1);
    until(world, 2, () => e.skill === SKILL_NONE);
    expect(e.skillCd).toBeGreaterThan(0);
  });

  it('marca-página: quem chegou na marca durante o aviso é derrubado quando ele aparece', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_MARCADOR, { col: 15, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    stand(world, 'p0', e.aimX, e.aimY);
    p.invuln = 0;
    until(world, 2, () => p.down);
    expect(p.down).toBe(true);
    expect(e.skill).not.toBe(SKILL_WARN);
  });

  it('dicionário: treme parado (aviso), salta alto e solta páginas que caem devagar, balançando', () => {
    const world = setup();
    stand(world, 'p0', 17 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_DICIONARIO, { col: 12, row: 6 });
    until(world, 15, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const x = e.body.x;
    const warned = until(world, 2, () => e.skill !== SKILL_WARN);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.pages - 2 * TICK_DT);
    // Parado (só termina de frear o pulinho de antes).
    expect(Math.abs(e.body.x - x)).toBeLessThan(1);
    expect(world.spits.size).toBe(0);
    until(world, 2, () => world.spits.size > 0);
    const pages = [...world.spits.values()];
    expect(pages).toHaveLength(RULES.pagesCount);
    for (const s of pages) expect(s.kind).toBe(SPIT_PAGINA);
    expect(new Set(pages.map((s) => s.vx)).size).toBe(RULES.pagesCount);
    // Saíram lá do alto do salto.
    expect(pages[0]!.y).toBeLessThan(FLOOR - 2 * TILE);
    const page = pages[1]!;
    let lastY = page.y;
    let maxFall = 0;
    const xs = new Set<number>();
    until(world, RULES.pagesLife, () => {
      if (!world.spits.has(page.id)) return true;
      maxFall = Math.max(maxFall, (page.y - lastY) / TICK_DT);
      lastY = page.y;
      xs.add(Math.round(page.x));
      return false;
    });
    expect(maxFall).toBeLessThanOrEqual(RULES.pagesFall * TILE + 1e-6);
    // A do meio não tem velocidade para os lados, mas balança.
    expect(xs.size).toBeGreaterThan(3);
    // Caiu até o chão e sumiu.
    expect(world.spits.has(page.id)).toBe(false);
    expect(lastY).toBeGreaterThan(FLOOR - 2 * TILE);
  });

  it('pergaminho: vendo alguém à frente, para (aviso) e desenrola um tapete rente ao chão que derruba', () => {
    const world = setup();
    const p = stand(world, 'p0', 13 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_PERGAMINHO, { col: 3, row: 6 });
    e.dir = 1;
    until(world, 4, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    const x = e.body.x;
    p.invuln = 0;
    const warned = until(world, 2, () => e.skill !== SKILL_WARN);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.unroll - 2 * TICK_DT);
    expect(p.down).toBe(false);
    until(world, RULES.unrollGrow + 0.1, () => p.down);
    expect(p.down).toBe(true);
    // Parado desde o aviso (só terminou de frear).
    expect(Math.abs(e.body.x - x)).toBeLessThan(4);
    const box = unrollBox({ x: e.body.x, y: e.body.y, dir: e.dir, aimX: e.aimX });
    expect(box.y + box.h).toBeCloseTo(FLOOR, 3);
    expect(box.h).toBeCloseTo(RULES.unrollHeight * TILE, 3);
    expect(box.x).toBeCloseTo(e.body.x + size, 3);
    until(world, 3, () => e.skill === SKILL_NONE);
    expect(e.skillCd).toBeGreaterThan(0);
  });

  it('pergaminho: quem pula por cima do tapete passa', () => {
    const world = setup();
    const p = stand(world, 'p0', 13 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_PERGAMINHO, { col: 3, row: 6 });
    e.dir = 1;
    until(world, 4, () => e.skill === SKILL_ACT);
    // Fica no ar acima do tapete enquanto ele está aberto.
    p.invuln = 0;
    until(world, RULES.unrollTime, () => {
      p.body.y = FLOOR - world.params.playerHeight * TILE - TILE;
      p.body.vy = 0;
      return e.skill !== SKILL_ACT;
    });
    expect(p.down).toBe(false);
  });

  it('morcego: com alguém embaixo, abre as asas (aviso), mergulha até a marca, derruba e volta para o fio', () => {
    const world = setup();
    const e = world.spawnEnemy(ENEMY_MORCEGO, { col: 7, row: 4 });
    const p = stand(world, 'p0', center(e) + 2 * TILE, FLOOR);
    until(world, 1, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.aimY).toBeCloseTo(FLOOR, 3);
    const start = { x: e.body.x, y: e.body.y };
    p.invuln = 0;
    const warned = until(world, 2, () => e.skill !== SKILL_WARN);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.dive - 2 * TICK_DT);
    expect(e.body.y).toBeCloseTo(start.y, 5);
    expect(p.down).toBe(false);
    let lowest = 0;
    until(world, RULES.diveTime + 0.2, () => {
      lowest = Math.max(lowest, feet(e));
      return e.skill !== SKILL_ACT;
    });
    expect(lowest).toBeGreaterThan(FLOOR - TILE);
    expect(p.down).toBe(true);
    // De volta ao ponto de onde saiu, ainda no fio.
    expect(e.body.x).toBeCloseTo(start.x, 3);
    expect(e.body.y).toBeCloseTo(start.y, 3);
    expect(e.anchorY).toBeGreaterThanOrEqual(0);
  });

  it('coruja: marca a linha até alguém em outro andar (aviso) e o facho derruba quem ficou nela', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_CORUJA, { col: 12, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    expect(e.skill).toBe(SKILL_WARN);
    expect(e.aimX).toBeCloseTo(p.body.x + pw(world) / 2, 3);
    expect(e.aimY).toBeCloseTo(p.body.y + (world.params.playerHeight * TILE) / 2, 3);
    p.invuln = 0;
    let downInWarn = false;
    const warned = until(world, 2, () => {
      if (p.down && e.skill === SKILL_WARN) downInWarn = true;
      return e.skill !== SKILL_WARN;
    });
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.beam - 2 * TICK_DT);
    expect(downInWarn).toBe(false);
    expect(e.skill).toBe(SKILL_ACT);
    run(world, 2);
    expect(p.down).toBe(true);
  });

  it('coruja: quem sai da linha durante o aviso escapa do facho', () => {
    const world = setup();
    const p = stand(world, 'p0', 7 * TILE, PLATFORM);
    const e = world.spawnEnemy(ENEMY_CORUJA, { col: 12, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    stand(world, 'p0', 3 * TILE, FLOOR);
    p.invuln = 0;
    until(world, 2, () => e.skill === SKILL_REST);
    expect(p.down).toBe(false);
  });

  it('coruja: não enxerga através de um bloco, e o facho para no bloco', () => {
    const world = setup(1, PAREDE);
    stand(world, 'p0', 5 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_CORUJA, { col: 14, row: 6 });
    for (let t = 0; t < ticks(4); t++) {
      run(world, 1);
      expect(e.skill).toBe(SKILL_NONE);
    }
    const line = beamLine(PAREDE, { x: 14 * TILE, y: FLOOR - size, aimX: 3 * TILE, aimY: FLOOR - size });
    expect(line.x1).toBeGreaterThanOrEqual(11 * TILE - 1);
    expect(line.x1).toBeLessThan(12 * TILE);
  });

  it('enciclopédia: fechada, a capa barra a tinta de frente; abre (aviso), atira três letras em leque e aberta encharca', () => {
    const world = setup(2);
    const front = stand(world, 'p0', 11 * TILE, FLOOR);
    const back = stand(world, 'p1', 2.5 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_ENCICLOPEDIA, { col: 7, row: 6 });
    e.skillCd = 100;
    run(world, 2);
    expect(e.dir).toBe(1);
    // Fechada: a tinta de frente não pega...
    front.body.facing = -1;
    tap(world, 'p0', BTN_ATTACK);
    run(world, 12);
    expect(e.soak).toBe(0);
    // ...e a de trás pega.
    back.body.facing = 1;
    tap(world, 'p1', BTN_ATTACK);
    until(world, 1, () => e.soak > 0);
    expect(e.soak).toBeGreaterThan(0);

    // Outro mundo: aberta, a tinta de frente pega; depois do aviso, as letras.
    const w2 = setup(1);
    const shooter = stand(w2, 'p0', 11 * TILE, FLOOR);
    const book = w2.spawnEnemy(ENEMY_ENCICLOPEDIA, { col: 7, row: 6 });
    until(w2, 2, () => book.skill === SKILL_WARN);
    expect(book.skill).toBe(SKILL_WARN);
    expect(book.dir).toBe(1);
    shooter.body.facing = -1;
    tap(w2, 'p0', BTN_ATTACK);
    until(w2, 0.5, () => book.soak > 0);
    expect(book.soak).toBeGreaterThan(0);
    const warned = until(w2, 2, () => w2.spits.size > 0);
    expect(warned * TICK_DT).toBeLessThanOrEqual(w2.warn.letters);
    const letters = [...w2.spits.values()];
    expect(letters).toHaveLength(3);
    for (const s of letters) {
      expect(s.kind).toBe(SPIT_LETRA);
      expect(s.vx).toBeGreaterThan(0);
    }
    expect(letters.map((s) => (s.vy < -1 ? -1 : 0))).toEqual([0, -1, -1]);
  });

  it('enciclopédia: o aviso das letras dura o tempo todo, e elas derrubam quem está na frente', () => {
    const world = setup();
    const p = stand(world, 'p0', 11 * TILE, FLOOR);
    const e = world.spawnEnemy(ENEMY_ENCICLOPEDIA, { col: 7, row: 6 });
    until(world, 2, () => e.skill === SKILL_WARN);
    const warned = until(world, 2, () => world.spits.size > 0);
    expect(warned * TICK_DT).toBeGreaterThanOrEqual(world.warn.letters - 2 * TICK_DT);
    p.invuln = 0;
    until(world, 2, () => p.down);
    expect(p.down).toBe(true);
  });

  it('sem o poder da fase, marca-página, dicionário, pergaminho, morcego e coruja só andam', () => {
    for (const kind of [ENEMY_MARCADOR, ENEMY_DICIONARIO, ENEMY_PERGAMINHO, ENEMY_CORUJA, ENEMY_MORCEGO]) {
      const world = setup();
      stand(world, 'p0', 9 * TILE, FLOOR);
      const e = world.spawnEnemy(kind, kind === ENEMY_MORCEGO ? { col: 7, row: 4 } : { col: 4, row: 6 }, false);
      for (let t = 0; t < ticks(8); t++) {
        run(world, 1);
        expect(e.skill, String(kind)).toBe(SKILL_NONE);
      }
      expect(world.spits.size, String(kind)).toBe(0);
    }
  });

  it('os fiapos do Calhamaço são marca-páginas e pergaminhos', () => {
    const world = new World([ATRIL_ARENA], 5, { difficulty: 'medio' });
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
    for (const k of kinds) expect([ENEMY_MARCADOR, ENEMY_PERGAMINHO]).toContain(k);
  });
});
