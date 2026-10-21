import { describe, expect, it } from 'vitest';
import {
  ARENAS,
  BTN_DOWN,
  BTN_JUMP,
  BTN_LEFT,
  BTN_RIGHT,
  DEFAULT_PARAMS,
  EMPTY,
  TICK_DT,
  TILE,
  cellAt,
  chapterFrom,
  createPlayer,
  stepPlayer,
  touchesTube,
  type Arena,
} from '../src/index';

const p = { ...DEFAULT_PARAMS };

/**
 * Robô simples: anda para o lado do tubo mais próximo e desce de toda plataforma
 * atravessável em que pousa. Mede uma rota realista, não a ótima.
 */
function timeToTube(arena: Arena, col: number, surfaceRow: number): number {
  const s = createPlayer({ col, row: surfaceRow - 1 }, p);
  stepPlayer(s, 0, arena, p);
  const dir = s.x < (arena.cols * TILE) / 2 ? BTN_LEFT : BTN_RIGHT;
  let dropped = false;
  for (let t = TICK_DT; t < 10; t += TICK_DT) {
    let buttons = dir;
    if (s.onGround && s.onOneWay && !dropped) {
      buttons |= BTN_DOWN | BTN_JUMP;
      dropped = true;
    } else {
      dropped = false;
    }
    stepPlayer(s, buttons, arena, p);
    if (touchesTube(s, arena, p)) return t;
  }
  return Infinity;
}

function standableCells(arena: Arena): Array<{ col: number; row: number }> {
  const cells = [];
  for (let row = 1; row < arena.rows - 1; row++) {
    for (let col = 1; col < arena.cols - 1; col++) {
      if (cellAt(arena, col, row) !== EMPTY && cellAt(arena, col, row - 1) === EMPTY) cells.push({ col, row });
    }
  }
  return cells;
}

describe('acesso aos tubos de tinta (plano, seção 2.2)', () => {
  it.each(ARENAS)('$name: de qualquer plataforma, um tubo em até 3 s', (arena) => {
    const times = standableCells(arena).map(({ col, row }) => ({ col, row, t: timeToTube(arena, col, row) }));
    const worst = times.reduce((a, b) => (b.t > a.t ? b : a));
    expect(worst.t, `pior caso a partir da coluna ${worst.col}, linha ${worst.row}`).toBeLessThanOrEqual(3);
  });
});

describe('capítulos', () => {
  const ids = (arenaId: unknown) => chapterFrom(arenaId).map((a) => a.id);

  it('a sala joga só o capítulo da arena escolhida, começando por ela', () => {
    expect(ids('ampla')).toEqual(['ampla', 'compacta', 'padrao']);
    expect(ids('partitura')).toEqual(['partitura', 'mapa', 'quadriculada']);
  });

  it('arena desconhecida começa pela Padrão', () => {
    expect(ids(undefined)).toEqual(['padrao', 'ampla', 'compacta']);
    expect(ids('nanquim')).toEqual(['padrao', 'ampla', 'compacta']);
  });
});
