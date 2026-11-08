import { describe, expect, it } from 'vitest';
import { BTN_ALL, adoptRoom, BTN_RIGHT, MAX_PLAYERS, ONLINE_FULL, ROOM_FULL, describeJoinError, normalizeRoomCode, normalizeServerUrl, parseDifficulty, parseInput, parseLocalKey, parseRoomList, parseSeats, seatForServer } from '../src/index.ts';

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
    expect(describeJoinError(new Error(ONLINE_FULL))).toBe(ONLINE_FULL);
    expect(describeJoinError(new Error(ROOM_FULL))).toBe(ROOM_FULL);
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
  const open = { code: 'ABCD23', players: 2, capacity: 4, vacant: 1, names: ['netface', 'Ana'], chapter: 0, difficulty: 'medio', playing: true, page: 1, pages: 5 };

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

describe('seatForServer', () => {
  const seat = { server: normalizeServerUrl('wss://play.riscote.win'), code: 'ABCD23', token: 'ABCD23:tok' };

  it('devolve a vaga só para o servidor que a emitiu, tolerando barra no fim e maiúsculas', () => {
    expect(seatForServer(seat, 'wss://play.riscote.win')).toEqual(seat);
    expect(seatForServer(seat, ' WSS://Play.Riscote.Win/ ')).toEqual(seat);
  });

  it('não entrega o token a outro servidor, nem a vaga de versão antiga sem servidor', () => {
    expect(seatForServer(seat, 'wss://atacante.example')).toBeNull();
    expect(seatForServer(seat, 'wss://play.riscote.win.atacante.example')).toBeNull();
    expect(seatForServer({ code: 'ABCD23', token: 'ABCD23:tok' }, 'wss://play.riscote.win')).toBeNull();
    for (const odd of [null, 'texto', { ...seat, token: '' }, { ...seat, token: 5 }, { ...seat, server: 1 }]) {
      expect(seatForServer(odd, 'wss://play.riscote.win')).toBeNull();
    }
  });
});

describe('vagas da sala', () => {
  it('parseSeats aceita as vagas dentro do limite; fora dele, 1 local e o resto pela internet', () => {
    expect(parseSeats(3, 2)).toEqual({ local: 3, online: 2 });
    expect(parseSeats(2, 0)).toEqual({ local: 2, online: 0 });
    expect(parseSeats(1, 0)).toEqual({ local: 1, online: 0 });
    expect(parseSeats(undefined, undefined)).toEqual({ local: 1, online: MAX_PLAYERS - 1 });
    // Mais que o limite somado, fração, texto ou zero local: o que não vale volta ao padrão.
    expect(parseSeats(3, 3)).toEqual({ local: 3, online: 2 });
    expect(parseSeats(6, 0)).toEqual({ local: 1, online: 0 });
    expect(parseSeats(0, 2)).toEqual({ local: 1, online: 2 });
    expect(parseSeats(2.5, '1')).toEqual({ local: 1, online: 4 });
  });

  it('parseLocalKey só aceita a chave no formato sorteado pelo navegador', () => {
    expect(parseLocalKey('Ab-_0123456789abcdefXY')).toBe('Ab-_0123456789abcdefXY');
    expect(parseLocalKey('curta')).toBeNull();
    expect(parseLocalKey('x'.repeat(65))).toBeNull();
    expect(parseLocalKey('chave com espaço 0123456')).toBeNull();
    expect(parseLocalKey(1234567890123456)).toBeNull();
  });

  it('a lista de servidor antigo, sem capacidade, vale sala de 5 toda pela internet; números incoerentes são limitados', () => {
    const base = { code: null, players: 2, names: [], chapter: 0, difficulty: 'medio', playing: false, page: 0, pages: 5 };
    expect(parseRoomList([base])[0]).toMatchObject({ capacity: MAX_PLAYERS, vacant: MAX_PLAYERS - 2 });
    expect(parseRoomList([{ ...base, capacity: 1, vacant: 4 }])[0]).toMatchObject({ capacity: 2, vacant: 0 });
    expect(parseRoomList([{ ...base, capacity: 4, vacant: 9 }])[0]).toMatchObject({ capacity: 4, vacant: 2 });
  });

  it('a vaga guardada leva a chave das vagas locais só no formato válido', () => {
    const seat = { server: 'wss://play.riscote.win', code: 'ABCD23', token: 't' };
    const key = 'Ab-_0123456789abcdefXY';
    expect(seatForServer({ ...seat, localKey: key, local: 3 }, 'wss://play.riscote.win')).toEqual({ ...seat, localKey: key, local: 3 });
    expect(seatForServer({ ...seat, localKey: key, local: 9 }, 'wss://play.riscote.win')).toEqual({ ...seat, localKey: key, local: 1 });
    expect(seatForServer({ ...seat, localKey: '<x>', local: 3 }, 'wss://play.riscote.win')).toEqual(seat);
  });
});

describe('adoptRoom (achado 10 da auditoria de 2026-11-06)', () => {
  /** Sala de mentira: conta as saídas; `failLeave` faz a própria saída falhar. */
  function fakeRoom(failLeave = false) {
    const room = {
      leaves: 0,
      leave(): Promise<number> {
        room.leaves++;
        return failLeave ? Promise.reject(new Error('já fechada')) : Promise.resolve(1000);
      },
    };
    return room;
  }

  it('estado inicial que não chega depois de conectar: a sala sai de vez e o erro segue', async () => {
    const room = fakeRoom();
    const timeout = new Error('estado inicial não chegou');
    await expect(adoptRoom(Promise.resolve(room), async () => Promise.reject(timeout))).rejects.toBe(timeout);
    expect(room.leaves).toBe(1);
  });

  it('erro síncrono ao montar a sessão: a sala sai de vez, e a falha ao sair não esconde o erro original', async () => {
    const room = fakeRoom(true);
    const boom = new Error('sessão');
    await expect(
      adoptRoom(Promise.resolve(room), () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
    expect(room.leaves).toBe(1);
  });

  it('controle: sessão assumida não sai, e recusa antes de conectar não tem sala a fechar', async () => {
    const room = fakeRoom();
    expect(await adoptRoom(Promise.resolve(room), async (r) => (r === room ? 'ok' : 'outra'))).toBe('ok');
    expect(room.leaves).toBe(0);
    const refused = new Error('sala cheia');
    let adopted = false;
    await expect(
      adoptRoom(Promise.reject(refused) as Promise<typeof room>, () => {
        adopted = true;
      }),
    ).rejects.toBe(refused);
    expect(adopted).toBe(false);
  });
});
