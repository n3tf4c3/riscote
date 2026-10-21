import { describe, expect, it } from 'vitest';
import { ARENAS, ENEMY_BORRAO, PHASE_CHAPTER, PHASE_LOBBY, PHASE_PLAYING, PHASE_RESTART, RULES, TICK_DT, World } from '../src/index.ts';

const ticks = (s: number) => Math.round(s / TICK_DT);
const chapter = [ARENAS[0]!, ARENAS[1]!];

function run(world: World, n: number) {
  for (let i = 0; i < n; i++) {
    for (const id of world.players.keys()) world.applyInput(id, 0);
    world.step();
  }
}

function started(players = 2) {
  const world = new World(chapter, 5);
  for (let i = 0; i < players; i++) world.addPlayer(`p${i}`, i);
  world.start();
  run(world, 2);
  return world;
}

function teamDown(world: World) {
  world.lives = 0;
  for (const p of world.players.values()) {
    p.down = true;
    p.invuln = 0;
  }
}

function clearArena(world: World) {
  for (const e of [...world.enemies.values()]) if (e.kind !== ENEMY_BORRAO) world.enemies.delete(e.id);
  (world as unknown as { spawnQueue: number }).spawnQueue = 0;
}

describe('fim de jogo para o placar', () => {
  it('sem vidas e com pontos: fim de jogo, pausa do placar e a arena recomeça com os pontos zerados', () => {
    const world = started();
    world.score = 700;
    teamDown(world);
    run(world, 1);
    expect(world.phase).toBe(PHASE_RESTART);
    expect(world.takeRunEnds()).toEqual([{ reason: 'sem-vidas', score: 700, arena: chapter[0]!.id, players: ['p0', 'p1'] }]);
    expect(world.takeRunEnds()).toEqual([]);
    expect(world.phaseTime).toBeCloseTo(RULES.recordDelay, 1);
    // Durante a pausa os pontos continuam na tela.
    expect(world.score).toBe(700);

    world.closeRecords();
    expect(world.phaseTime).toBeLessThanOrEqual(RULES.recordShow);
    run(world, ticks(RULES.recordShow) + 1);
    expect(world.phase).toBe(PHASE_PLAYING);
    expect(world.arena.id).toBe(chapter[0]!.id);
    expect(world.score).toBe(0);
    expect(world.lives).toBe(RULES.teamLives);
  });

  it('sem vidas e sem pontos: recomeço curto, nada vai ao placar', () => {
    const world = started();
    teamDown(world);
    run(world, 1);
    expect(world.phase).toBe(PHASE_RESTART);
    expect(world.takeRunEnds()).toEqual([]);
    expect(world.phaseTime).toBeLessThanOrEqual(RULES.restartDelay);
  });

  it('capítulo concluído com pontos: fim de jogo e pausa do placar', () => {
    const world = started(1);
    clearArena(world);
    run(world, 1 + ticks(RULES.clearDelay) + ticks(RULES.turnDelay) + 2);
    expect(world.arena.id).toBe(chapter[1]!.id);
    world.score = 1200;
    clearArena(world);
    run(world, 1 + ticks(RULES.clearDelay) + 1);
    expect(world.phase).toBe(PHASE_CHAPTER);
    expect(world.takeRunEnds()).toEqual([{ reason: 'capitulo', score: 1200, arena: chapter[1]!.id, players: ['p0'] }]);
    expect(world.phaseTime).toBeGreaterThan(RULES.chapterDelay);
  });

  it('desistência: a equipe cai, os pontos vão ao placar e a arena recomeça', () => {
    const world = started();
    world.score = 500;
    expect(world.giveUp()).toBe(true);
    expect(world.phase).toBe(PHASE_RESTART);
    expect([...world.players.values()].every((p) => p.down)).toBe(true);
    expect(world.takeRunEnds()).toEqual([{ reason: 'desistencia', score: 500, arena: chapter[0]!.id, players: ['p0', 'p1'] }]);
    expect(world.takeReports()[0]?.outcome).toBe('desistência');
    expect(world.phaseTime).toBeCloseTo(RULES.recordDelay, 1);
    // Fora da partida (pausa, aquecimento) desistir não faz nada.
    expect(world.giveUp()).toBe(false);
    run(world, ticks(RULES.recordDelay) + 1);
    expect(world.phase).toBe(PHASE_PLAYING);
    expect(world.score).toBe(0);
    expect(world.lives).toBe(RULES.teamLives);
    expect([...world.players.values()].some((p) => p.down)).toBe(false);
  });

  it('no aquecimento não há o que desistir', () => {
    const world = new World(chapter, 5);
    world.addPlayer('p0', 0);
    expect(world.giveUp()).toBe(false);
    expect(world.phase).toBe(PHASE_LOBBY);
  });

  it('fora da pausa do placar, closeRecords não mexe no tempo', () => {
    const world = started();
    const before = world.phaseTime;
    world.closeRecords();
    expect(world.phaseTime).toBe(before);
    expect(world.phase).toBe(PHASE_PLAYING);
  });
});
