import { describe, expect, it } from 'vitest';
import {
  ARENAS,
  BTN_DOWN,
  BTN_JUMP,
  BTN_LEFT,
  BTN_RIGHT,
  CHAPTERS,
  DEFAULT_PARAMS,
  DIFFICULTIES,
  EMPTY,
  ENEMY_BORRACHA,
  ENEMY_FIANDEIRA,
  ENEMY_GRAMPO,
  ENEMY_SALTADOR,
  ENEMY_SIZE,
  ENEMY_TINTEIRO,
  ENEMY_TRACA,
  GREYBOX,
  RULES,
  TICK_DT,
  TILE,
  cellAt,
  chapterFrom,
  createPlayer,
  movementParams,
  stepPlayer,
  touchesTube,
  warnTimes,
  type Arena,
  type MovementParams,
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

const key = (col: number, row: number) => `${col},${row}`;

/** Onde dá para ficar de pé: célula cheia com duas livres em cima (o boneco tem 1,3 célula). */
function standing(arena: Arena): Set<string> {
  const out = new Set<string>();
  for (let row = 2; row < arena.rows; row++) {
    for (let col = 1; col < arena.cols - 1; col++) {
      if (cellAt(arena, col, row) !== EMPTY && cellAt(arena, col, row - 1) === EMPTY && cellAt(arena, col, row - 2) === EMPTY) out.add(key(col, row));
    }
  }
  return out;
}

/** Sequências de botões que um jogador faria: andar, pular junto, pular e depois andar, andar e pular, descer. */
function maneuvers(onOneWay: boolean): Array<(tick: number) => number> {
  const out: Array<(tick: number) => number> = [];
  for (const dir of [BTN_LEFT, BTN_RIGHT]) {
    out.push(() => dir);
    out.push((t) => dir | (t < 30 ? BTN_JUMP : 0));
    for (const k of [8, 16, 24]) out.push((t) => (t < 30 ? BTN_JUMP : 0) | (t >= k ? dir : 0));
    for (const k of [6, 12, 20]) out.push((t) => dir | (t >= k && t < k + 30 ? BTN_JUMP : 0));
    if (onOneWay) for (const k of [0, 10]) out.push((t) => (t === 0 ? BTN_DOWN | BTN_JUMP : 0) | (t >= k ? dir : 0));
  }
  out.push((t) => (t < 30 ? BTN_JUMP : 0));
  return out;
}

/** Células cheias sob os pés de quem está no chão. */
function feetCells(arena: Arena, x: number, y: number, params: MovementParams): string[] {
  const row = Math.round((y + params.playerHeight * TILE) / TILE);
  const c0 = Math.floor(x / TILE);
  const c1 = Math.floor((x + params.playerWidth * TILE - 0.001) / TILE);
  const out = [];
  for (let c = c0; c <= c1; c++) if (cellAt(arena, c, row) !== EMPTY) out.push(key(c, row));
  return out;
}

/** Busca a partir dos surgimentos de jogador: tudo onde dá para pisar com manobras comuns. */
function reachable(arena: Arena, params: MovementParams): Set<string> {
  const seen = new Set<string>();
  const queue: string[] = [];
  const visit = (k: string) => {
    if (!seen.has(k)) {
      seen.add(k);
      queue.push(k);
    }
  };
  for (const s of arena.playerSpawns) visit(key(s.col, s.row + 1));
  while (queue.length > 0) {
    const [col, row] = queue.shift()!.split(',').map(Number) as [number, number];
    if (cellAt(arena, col, row - 1) !== EMPTY) continue;
    const start = createPlayer({ col, row: row - 1 }, params);
    stepPlayer(start, 0, arena, params);
    if (!start.onGround) continue;
    for (const move of maneuvers(start.onOneWay)) {
      const s = { ...start };
      for (let t = 0; t < 90; t++) {
        stepPlayer(s, move(t), arena, params);
        if (s.onGround) for (const k of feetCells(arena, s.x, s.y, params)) visit(k);
      }
    }
  }
  return seen;
}

describe('layouts das fases', () => {
  it.each(ARENAS)('$name: toda plataforma é alcançável a partir dos surgimentos, no médio e no fácil', (arena) => {
    for (const difficulty of ['medio', 'facil'] as const) {
      const seen = reachable(arena, movementParams(difficulty));
      const missing = [...standing(arena)].filter((k) => !seen.has(k));
      expect(missing, `${difficulty}: células sem acesso (coluna,linha)`).toEqual([]);
    }
  });

  it.each(ARENAS)('$name: os inimigos pousam onde os jogadores alcançam', (arena) => {
    const seen = reachable(arena, movementParams('medio'));
    const enemy = { ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE };
    for (const spawn of arena.enemySpawns) {
      const s = createPlayer(spawn, enemy);
      for (let t = 0; t < 120 && !s.onGround; t++) stepPlayer(s, 0, arena, enemy);
      const landed = feetCells(arena, s.x, s.y, enemy);
      expect(landed.some((k) => seen.has(k)), `surgimento ${spawn.col},${spawn.row}`).toBe(true);
    }
  });

  it.each(ARENAS)('$name: cada ponto de fio fica sob uma célula cheia, com um chão alcançável a até $threadReach células', (arena) => {
    const seen = reachable(arena, movementParams('medio'));
    for (const a of arena.anchors) {
      expect(cellAt(arena, a.col, a.row), `ponto ${a.col},${a.row} livre`).toBe(EMPTY);
      expect(cellAt(arena, a.col, a.row - 1), `ponto ${a.col},${a.row} preso em cima`).not.toBe(EMPTY);
      let floor = a.row + 1;
      while (cellAt(arena, a.col, floor) === EMPTY) floor++;
      // O fio desce até perto desse chão: quem está nele acerta a fiandeira com um tiro reto.
      expect(floor - a.row, `ponto ${a.col},${a.row}`).toBeLessThanOrEqual(RULES.threadReach + 1);
      expect(seen.has(key(a.col, floor)), `chão sob o ponto ${a.col},${a.row}`).toBe(true);
    }
  });

  it.each(ARENAS)('$name: espaço para 5 — surgimentos separados, de pé e com chão largo', (arena) => {
    const spots = new Set(arena.playerSpawns.map((s) => key(s.col, s.row + 1)));
    expect(spots.size).toBe(5);
    const stand = standing(arena);
    for (const s of spots) expect(stand.has(s)).toBe(true);
    // Pelo menos 12 células de chão por jogador.
    expect(stand.size).toBeGreaterThanOrEqual(5 * 12);
  });

  it('nenhuma fase é uma pequena variação de outra do mesmo tamanho (nem do greybox)', () => {
    const all = [...ARENAS, ...GREYBOX];
    const filled = (a: Arena) => new Set([...a.cells.keys()].filter((i) => a.cells[i] !== EMPTY && i >= a.cols && i < a.cells.length - a.cols && i % a.cols > 0 && i % a.cols < a.cols - 1));
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const [a, b] = [all[i]!, all[j]!];
        if (a.cols !== b.cols || a.rows !== b.rows) continue;
        const [fa, fb] = [filled(a), filled(b)];
        const common = [...fa].filter((c) => fb.has(c)).length;
        const jaccard = common / (fa.size + fb.size - common);
        expect(jaccard, `${a.id} × ${b.id}`).toBeLessThan(0.5);
      }
    }
  });
});

describe('progressão do capítulo', () => {
  const SIMPLE = [ENEMY_TRACA, ENEMY_GRAMPO, ENEMY_SALTADOR];

  it.each(CHAPTERS.map((c, i) => [i + 1, c] as const))('capítulo %i: 4 fases em ordem, do simples à combinação', (_, chapter) => {
    expect(chapter.map((a) => a.stage!.step)).toEqual([1, 2, 3, 4]);
    const [s1, s2, s3, s4] = chapter.map((a) => a.stage!);
    // Fase 1: inimigos simples, sem habilidade, com as dicas de tiro, bola e chute.
    expect(s1!.roster.every((k) => SIMPLE.includes(k))).toBe(true);
    expect(s1!.skills).toEqual([]);
    expect(s1!.hints).toBe(true);
    // Fase 2: mais variedade de inimigos simples, ainda sem habilidade.
    expect(new Set(s2!.roster).size).toBeGreaterThan(new Set(s1!.roster).size);
    expect(s2!.skills).toEqual([]);
    // Fase 3: as primeiras habilidades e o tinteiro.
    expect(s3!.skills.length).toBeGreaterThan(0);
    expect(s3!.roster).toContain(ENEMY_TINTEIRO);
    // Fase 4: junta tudo o que veio antes e traz a borracha, que pede cooperação.
    const before = new Set([...s1!.roster, ...s2!.roster, ...s3!.roster]);
    for (const k of before) expect(s4!.roster).toContain(k);
    expect(s4!.roster).toContain(ENEMY_BORRACHA);
    for (const k of s3!.skills) expect(s4!.skills).toContain(k);
    expect(s4!.skills.length).toBeGreaterThan(s3!.skills.length);
  });

  it.each(CHAPTERS.map((c, i) => [i + 1, c] as const))('capítulo %i: cada fase traz no máximo 3 novidades (tipos ou habilidades)', (_, chapter) => {
    const known = new Set<string>();
    for (const arena of chapter) {
      const now = [...arena.stage!.roster.map((k) => `tipo ${k}`), ...arena.stage!.skills.map((k) => `habilidade ${k}`)];
      const fresh = new Set(now.filter((n) => !known.has(n)));
      expect(fresh.size, arena.id).toBeLessThanOrEqual(3);
      for (const n of now) known.add(n);
    }
  });

  it.each(CHAPTERS.map((c, i) => [i + 1, c] as const))('capítulo %i: a pressão não diminui de uma fase para a outra, com 1 a 5 jogadores', (_, chapter) => {
    for (let n = 1; n <= 5; n++) {
      const counts = chapter.map((a) => Math.round(a.stage!.base + a.stage!.perPlayer * n));
      for (let i = 1; i < counts.length; i++) expect(counts[i]!, `${n} jogador(es), fase ${i + 1}`).toBeGreaterThanOrEqual(counts[i - 1]!);
    }
    const screen = chapter.map((a) => a.stage!.maxOnScreen);
    for (let i = 1; i < screen.length; i++) expect(screen[i]!).toBeGreaterThanOrEqual(screen[i - 1]!);
    for (const arena of chapter) expect(arena.stage!.maxOnScreen).toBeLessThanOrEqual(RULES.maxEnemiesOnScreen);
  });

  it('fase com fiandeira tem pontos de fio', () => {
    for (const arena of ARENAS) if (arena.stage!.roster.includes(ENEMY_FIANDEIRA)) expect(arena.anchors.length, arena.id).toBeGreaterThanOrEqual(2);
  });

  it('toda habilidade perigosa avisa com pelo menos 0,6 s; no fácil, 0,85 s', () => {
    for (const difficulty of DIFFICULTIES) {
      const min = difficulty === 'facil' ? 0.85 : 0.6;
      for (const [name, t] of Object.entries(warnTimes(difficulty))) expect(t, `${difficulty}: ${name}`).toBeGreaterThanOrEqual(min);
    }
  });
});

describe('capítulos', () => {
  const ids = (arenaId: unknown) => chapterFrom(arenaId).map((a) => a.id);

  it('a sala joga o capítulo da arena escolhida, sempre a partir da primeira fase', () => {
    expect(ids('andaime')).toEqual(['margem', 'escadaria', 'poco', 'andaime']);
    expect(ids('mapa')).toEqual(['partitura', 'quadriculada', 'mapa', 'calendario']);
  });

  it('arena desconhecida, ou um id antigo do greybox, começa pelo capítulo 1', () => {
    expect(ids(undefined)).toEqual(['margem', 'escadaria', 'poco', 'andaime']);
    expect(ids('nanquim')).toEqual(ids('margem'));
    expect(ids('padrao')).toEqual(ids('margem'));
  });
});
