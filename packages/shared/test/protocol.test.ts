import { describe, expect, it } from 'vitest';
import { BTN_ALL, BTN_RIGHT, describeJoinError, normalizeRoomCode, parseInput } from '../src/index.ts';

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
