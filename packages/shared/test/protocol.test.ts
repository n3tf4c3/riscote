import { describe, expect, it } from 'vitest';
import { BTN_ALL, BTN_RIGHT, describeJoinError, normalizeRoomCode, parseDifficulty, parseInput, parseRoomList } from '../src/index.ts';

describe('parseInput', () => {
  it('aceita seq inteiro e botões dentro da máscara, descartando outros campos', () => {
    expect(parseInput({ seq: 3, buttons: BTN_RIGHT, x: 999 })).toEqual({ seq: 3, buttons: BTN_RIGHT });
    expect(parseInput({ seq: 0, buttons: BTN_ALL })).toEqual({ seq: 0, buttons: BTN_ALL });
  });

  it.each([
    null,
    'texto',
    42,
    {},
    { seq: 1 },
    { buttons: 1 },
    { seq: -1, buttons: 1 },
    { seq: 1.5, buttons: 1 },
    { seq: '1', buttons: 1 },
    { seq: 2 ** 31, buttons: 1 },
    { seq: 1, buttons: BTN_ALL + 1 },
    { seq: 1, buttons: -1 },
    { seq: 1, buttons: 0.5 },
  ])('rejeita %j', (raw) => {
    expect(parseInput(raw)).toBeNull();
  });
});

describe('normalizeRoomCode', () => {
  it('ignora caixa, espaços e hífens', () => {
    expect(normalizeRoomCode(' ab-cd 23 ')).toBe('ABCD23');
  });

  it('rejeita tamanho errado e caracteres ambíguos', () => {
    expect(normalizeRoomCode('ABC23')).toBeNull();
    expect(normalizeRoomCode('ABCD0O')).toBeNull();
    expect(normalizeRoomCode('ABCD1I')).toBeNull();
  });
});

describe('describeJoinError', () => {
  it('traduz as recusas do matchmaking', () => {
    expect(describeJoinError(new Error('room "ABCDEF" is locked'))).toMatch(/Sala cheia/);
    expect(describeJoinError(new Error('room "ABCDEF" not found'))).toMatch(/Nenhuma sala/);
    expect(describeJoinError(new Error('ECONNREFUSED'))).toMatch(/Não foi possível/);
  });
});

describe('parseDifficulty', () => {
  it('aceita só os modos conhecidos; o resto vira médio', () => {
    expect(parseDifficulty('facil')).toBe('facil');
    expect(parseDifficulty('dificil')).toBe('dificil');
    for (const raw of [undefined, null, 'DIFICIL', 'impossivel', 3, {}]) expect(parseDifficulty(raw)).toBe('medio');
  });
});
describe('parseRoomList', () => {
  const open = { code: 'ABCD23', players: 2, names: ['netface', 'Ana'], chapter: 0, difficulty: 'medio', playing: true, page: 1, pages: 5 };

  it('aceita a sala aberta com código e nomes, e a privada sem eles', () => {
    const closed = { ...open, code: null, names: ['escondido'] };
    expect(parseRoomList([open, closed])).toEqual([open, { ...closed, names: [] }]);
  });

  it('descarta entradas fora do formato e nomes que não passariam no placar', () => {
    const odd = [
      null,
      'ABCD23',
      { ...open, code: 'abc' },
      { ...open, code: undefined },
      { ...open, players: 6 },
      { ...open, players: -1 },
      { ...open, difficulty: 'impossivel' },
      { ...open, page: 1.5 },
    ];
    expect(parseRoomList(odd)).toEqual([]);
    expect(parseRoomList({ rooms: [open] })).toEqual([]);
    expect(parseRoomList([{ ...open, names: ['<b>x</b>', 'Bia', 3] }])[0]!.names).toEqual(['Bia']);
  });
});
