import { TILE } from './params';

export const EMPTY = 0;
export const SOLID = 1;
export const ONE_WAY = 2;
export type CellKind = typeof EMPTY | typeof SOLID | typeof ONE_WAY;

export interface CellPos {
  col: number;
  row: number;
}

export interface Arena {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cells: Uint8Array;
  playerSpawns: CellPos[];
  enemySpawns: CellPos[];
  tubes: CellPos[];
  /** Linha do andar mais alto (plataforma fora das paredes e do chão). */
  topFloorRow: number;
}

/**
 * Legenda: `#` sólido, `=` plataforma atravessável por baixo, `.` vazio,
 * `P` surgimento de jogador, `E` surgimento de inimigo, `T` tubo de tinta.
 * `P`, `E` e `T` ocupam células vazias e ficam apoiados na célula de baixo.
 */
export function parseArena(id: string, name: string, layout: readonly string[]): Arena {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  if (rows === 0 || cols === 0) throw new Error(`arena ${id}: layout vazio`);

  const cells = new Uint8Array(cols * rows);
  const playerSpawns: CellPos[] = [];
  const enemySpawns: CellPos[] = [];
  const tubes: CellPos[] = [];
  let topFloorRow = rows - 1;

  layout.forEach((line, row) => {
    if (line.length !== cols) {
      throw new Error(`arena ${id}: linha ${row} tem ${line.length} colunas, esperado ${cols}`);
    }
    for (let col = 0; col < cols; col++) {
      const ch = line[col];
      const pos = { col, row };
      switch (ch) {
        case '#':
          cells[row * cols + col] = SOLID;
          break;
        case '=':
          cells[row * cols + col] = ONE_WAY;
          break;
        case '.':
          break;
        case 'P':
          playerSpawns.push(pos);
          break;
        case 'E':
          enemySpawns.push(pos);
          break;
        case 'T':
          tubes.push(pos);
          break;
        default:
          throw new Error(`arena ${id}: caractere desconhecido '${ch}' em ${col},${row}`);
      }
      const isPlatform = ch === '=' || (ch === '#' && col > 0 && col < cols - 1);
      if (isPlatform && row < rows - 1) topFloorRow = Math.min(topFloorRow, row);
    }
  });

  return { id, name, cols, rows, cells, playerSpawns, enemySpawns, tubes, topFloorRow };
}

/** Fora dos limites conta como sólido: a arena é fechada. */
export function cellAt(arena: Arena, col: number, row: number): CellKind {
  if (col < 0 || row < 0 || col >= arena.cols || row >= arena.rows) return SOLID;
  return arena.cells[row * arena.cols + col] as CellKind;
}

export function arenaWidth(arena: Arena): number {
  return arena.cols * TILE;
}

export function arenaHeight(arena: Arena): number {
  return arena.rows * TILE;
}

/** Retângulo do tubo de tinta: uma célula de largura e duas de altura, apoiado no chão. */
export function tubeRect(tube: CellPos): { x: number; y: number; w: number; h: number } {
  return { x: tube.col * TILE, y: (tube.row - 1) * TILE, w: TILE, h: TILE * 2 };
}
