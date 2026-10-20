import { describe, expect, it } from 'vitest';
import {
  ARENAS,
  BTN_DOWN,
  BTN_JUMP,
  BTN_LEFT,
  BTN_RIGHT,
  DEFAULT_PARAMS,
  SOLID,
  TICK_DT,
  TILE,
  cellAt,
  createPlayer,
  parseArena,
  stepPlayer,
  touchesTube,
  type Arena,
  type PlayerState,
} from '../src/index';

const p = { ...DEFAULT_PARAMS };
const h = p.playerHeight * TILE;

// Chão na linha 7 (superfície y = 140), plataforma atravessável na linha 4 (3 células acima),
// bloco sólido na linha 3 sobre a coluna 9, parede à direita.
const TEST = parseArena('teste', 'Teste', [
  '#............#',
  '#............#',
  '#............#',
  '#........#...#',
  '#...====.....#',
  '#............#',
  '#....P...T...#',
  '##############',
]);

function run(s: PlayerState, arena: Arena, buttons: number, ticks: number): void {
  for (let i = 0; i < ticks; i++) stepPlayer(s, buttons, arena, p);
}

function spawned(arena: Arena = TEST): PlayerState {
  const s = createPlayer(arena.playerSpawns[0]!, p);
  run(s, arena, 0, 5);
  return s;
}

describe('arenas', () => {
  it.each(ARENAS)('$name: fechada, com 5 surgimentos e tubos nos cantos inferiores', (arena) => {
    const groundRow = arena.rows - 1;
    for (let c = 0; c < arena.cols; c++) expect(cellAt(arena, c, groundRow)).toBe(SOLID);
    for (let r = 0; r < arena.rows; r++) {
      expect(cellAt(arena, 0, r)).toBe(SOLID);
      expect(cellAt(arena, arena.cols - 1, r)).toBe(SOLID);
    }
    expect(arena.playerSpawns).toHaveLength(5);
    expect(arena.tubes).toEqual([
      { col: 1, row: groundRow - 1 },
      { col: arena.cols - 2, row: groundRow - 1 },
    ]);
  });

  it.each(ARENAS)('$name: andares a no máximo 3 células, alcançáveis com o pulo padrão', (arena) => {
    const floorRows = new Set<number>();
    for (let r = 0; r < arena.rows - 1; r++) {
      for (let c = 1; c < arena.cols - 1; c++) if (cellAt(arena, c, r) !== 0) floorRows.add(r);
    }
    const rows = [...floorRows, arena.rows - 1].sort((a, b) => a - b);
    for (let i = 1; i < rows.length; i++) expect(rows[i]! - rows[i - 1]!).toBeLessThan(p.jumpHeight);
  });

  it('rejeita linhas de larguras diferentes e caracteres desconhecidos', () => {
    expect(() => parseArena('x', 'x', ['###', '##'])).toThrow(/colunas/);
    expect(() => parseArena('x', 'x', ['#?#'])).toThrow(/desconhecido/);
  });
});

describe('movimento', () => {
  it('cai e pousa no chão', () => {
    const s = spawned();
    expect(s.onGround).toBe(true);
    expect(s.y + h).toBeCloseTo(7 * TILE, 6);
  });

  it('atinge a velocidade de corrida e para na parede', () => {
    const s = spawned();
    run(s, TEST, BTN_RIGHT, 30);
    expect(s.vx).toBeCloseTo(p.runSpeed * TILE, 6);
    run(s, TEST, BTN_RIGHT, 120);
    expect(s.x + p.playerWidth * TILE).toBeCloseTo(13 * TILE, 6);
    expect(s.vx).toBe(0);
  });

  it('o pulo segurado chega à altura configurada; o pulo curto fica mais baixo', () => {
    const full = spawned();
    // Fora da plataforma e do bloco: coluna 11.
    full.x = 11 * TILE;
    run(full, TEST, 0, 5);
    const ground = full.y;
    let apexFull = ground;
    for (let i = 0; i < 60; i++) {
      stepPlayer(full, BTN_JUMP, TEST, p);
      apexFull = Math.min(apexFull, full.y);
    }
    expect((ground - apexFull) / TILE).toBeCloseTo(p.jumpHeight, 1);

    const tap = spawned();
    tap.x = 11 * TILE;
    run(tap, TEST, 0, 5);
    let apexTap = tap.y;
    run(tap, TEST, BTN_JUMP, 3);
    for (let i = 0; i < 60; i++) {
      stepPlayer(tap, 0, TEST, p);
      apexTap = Math.min(apexTap, tap.y);
    }
    expect(ground - apexTap).toBeLessThan((ground - apexFull) * 0.6);
  });

  it('atravessa a plataforma por baixo e pousa em cima dela', () => {
    const s = spawned();
    run(s, TEST, BTN_JUMP, 60);
    expect(s.onGround).toBe(true);
    expect(s.onOneWay).toBe(true);
    expect(s.y + h).toBeCloseTo(4 * TILE, 6);
  });

  it('baixo + pulo desce da plataforma atravessável', () => {
    const s = spawned();
    run(s, TEST, BTN_JUMP, 60);
    run(s, TEST, 0, 2);
    run(s, TEST, BTN_DOWN | BTN_JUMP, 1);
    run(s, TEST, BTN_DOWN, 60);
    expect(s.onGround).toBe(true);
    expect(s.onOneWay).toBe(false);
    expect(s.y + h).toBeCloseTo(7 * TILE, 6);
  });

  it('baixo + pulo no chão sólido não atravessa o chão', () => {
    const s = spawned();
    run(s, TEST, BTN_DOWN | BTN_JUMP, 1);
    run(s, TEST, BTN_DOWN, 90);
    expect(s.y + h).toBeCloseTo(7 * TILE, 6);
  });

  it('bloco sólido barra o pulo por baixo', () => {
    const s = spawned();
    s.x = 9 * TILE + 2;
    run(s, TEST, 0, 5);
    let minY = s.y;
    for (let i = 0; i < 60; i++) {
      stepPlayer(s, BTN_JUMP, TEST, p);
      minY = Math.min(minY, s.y);
    }
    expect(minY).toBeCloseTo(4 * TILE, 6);
  });

  it('o pulo apertado pouco antes de pousar é lembrado (buffer)', () => {
    const s = spawned();
    s.y -= 2 * TILE;
    s.onGround = false;
    // Cai até ficar a poucos ticks do chão e aperta o pulo.
    while (s.y + h < 7 * TILE - 6) stepPlayer(s, 0, TEST, p);
    stepPlayer(s, BTN_JUMP, TEST, p);
    run(s, TEST, BTN_JUMP, 10);
    expect(s.vy).toBeLessThan(0);
  });

  it('encostar no tubo é detectado', () => {
    const s = spawned();
    expect(touchesTube(s, TEST, p)).toBe(false);
    run(s, TEST, BTN_RIGHT, 30);
    expect(touchesTube(s, TEST, p)).toBe(true);
  });

  it('é determinístico: mesma sequência de comandos, mesmo estado', () => {
    const seq = Array.from({ length: 600 }, (_, i) =>
      [BTN_RIGHT, BTN_RIGHT | BTN_JUMP, 0, BTN_LEFT, BTN_LEFT | BTN_JUMP, BTN_DOWN | BTN_JUMP][(i >> 4) % 6]!,
    );
    const arena = ARENAS[1]!;
    const a = createPlayer(arena.playerSpawns[0]!, p);
    const b = createPlayer(arena.playerSpawns[0]!, p);
    for (const btn of seq) {
      stepPlayer(a, btn, arena, p, TICK_DT);
      stepPlayer(b, btn, arena, p, TICK_DT);
    }
    expect(a).toEqual(b);
  });
});
