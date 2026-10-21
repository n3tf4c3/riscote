import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ColyseusTestServer } from '@colyseus/testing';
import {
  MSG_INPUT,
  MSG_NAME,
  MSG_RECORDS,
  MSG_START,
  PHASE_LOBBY,
  PHASE_RESTART,
  RECORDS_MAX,
  RECORD_NAME_TRIES,
  ROOM_NAME,
  RULES,
  parseRecordName,
  type RecordsMessage,
  type World,
} from '@riscote/shared';
import { ArenaRoom } from '../src/ArenaRoom.ts';
import { RECORDS_FILE, RecordBook } from '../src/records.ts';

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'riscote-recordes-'));
  dirs.push(dir);
  return dir;
}

const run = (score: number) => ({ score, names: ['Jogador 1'], reason: 'sem-vidas' as const, arena: 'padrao' });

describe('nome no placar', () => {
  it.each([
    ['Ana', 'Ana'],
    ['  João   da  Sé ', 'João da Sé'],
    ['x_y-z.9', 'x_y-z.9'],
    ['Zoë', 'Zoë'],
    // "e" + acento combinado vira "é" (NFC) e passa.
    ['José', 'José'],
    ['ABCDEFGHIJKL', 'ABCDEFGHIJKL'],
  ])('aceita %j como %j', (raw, name) => {
    expect(parseRecordName(raw)).toBe(name);
  });

  it.each([
    [''],
    ['    '],
    ['ABCDEFGHIJKLM'],
    ['<b>oi</b>'],
    ['<script>'],
    ['a&b'],
    ['"aspas"'],
    ["d'água"],
    ['a/b'],
    ['---'],
    ['🙂'],
    ['a̶b̶'],
    ['x'.repeat(65)],
  ])('recusa %j', (raw) => {
    expect(parseRecordName(raw)).toBeNull();
  });

  it('recusa o que não é texto', () => {
    for (const raw of [undefined, null, 42, {}, ['Ana'], { name: 'Ana' }]) expect(parseRecordName(raw)).toBeNull();
  });
});

describe('placar', () => {
  afterAll(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  it('ordena do maior para o menor; no empate, quem chegou antes fica na frente', () => {
    const book = new RecordBook(null);
    const a = book.add('medio', run(300))!;
    const b = book.add('medio', run(900))!;
    const c = book.add('medio', run(300))!;
    expect(book.list('medio').map((e) => e.id)).toEqual([b, a, c]);
    expect(book.list('facil')).toEqual([]);
  });

  it(`guarda só os ${RECORDS_MAX} melhores de cada dificuldade`, () => {
    const book = new RecordBook(null);
    for (let i = 1; i <= RECORDS_MAX; i++) expect(book.add('dificil', run(i * 100))).not.toBeNull();
    // Empatar com o último não basta para entrar.
    expect(book.add('dificil', run(100))).toBeNull();
    expect(book.add('dificil', run(50))).toBeNull();
    const top = book.add('dificil', run(10_000));
    const list = book.list('dificil');
    expect(list).toHaveLength(RECORDS_MAX);
    expect(list[0]!.id).toBe(top);
    expect(list.at(-1)!.score).toBe(200);
  });

  it('não guarda pontuação zero, negativa ou quebrada', () => {
    const book = new RecordBook(null);
    for (const score of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(book.add('medio', run(score))).toBeNull();
    expect(book.list('medio')).toEqual([]);
  });

  it('sobrevive a reinício: o arquivo guarda linhas e nomes trocados', () => {
    const dir = tempDir();
    const book = new RecordBook(dir);
    const id = book.add('facil', { ...run(500), names: ['Jogador 1', 'Jogador 2'] })!;
    book.add('medio', run(800));
    expect(book.rename('facil', id, 1, 'Bia')).toBe(true);
    expect(book.rename('facil', id, 5, 'Fora')).toBe(false);

    const again = new RecordBook(dir);
    expect(again.list('facil')).toEqual(book.list('facil'));
    expect(again.list('facil')[0]!.names).toEqual(['Jogador 1', 'Bia']);
    expect(again.list('medio')[0]!.score).toBe(800);
    // Gravação atômica: sobra só o arquivo final.
    expect(readdirSync(dir)).toEqual([RECORDS_FILE]);
  });

  it('linhas adulteradas no arquivo são descartadas ao carregar', () => {
    const dir = tempDir();
    const good = { id: 'abc123', score: 400, names: ['Ana'], reason: 'capitulo', arena: 'padrao', date: '2026-10-20' };
    const ranking = {
      medio: [
        good,
        { ...good, id: 'bad1', names: ['<img src=x onerror=alert(1)>'] },
        { ...good, id: 'bad2', score: '999999' },
        { ...good, id: 'bad3', reason: 'trapaça' },
        { ...good, id: 'bad4', names: [] },
      ],
      dificil: 'nada',
    };
    writeFileSync(join(dir, RECORDS_FILE), JSON.stringify({ version: 1, ranking }));
    const book = new RecordBook(dir);
    expect(book.list('medio')).toEqual([good]);
    expect(book.list('dificil')).toEqual([]);
  });

  it('arquivo ilegível é guardado à parte e o placar recomeça vazio', () => {
    const dir = tempDir();
    writeFileSync(join(dir, RECORDS_FILE), '{"ranking": [');
    const book = new RecordBook(dir);
    expect(book.list('medio')).toEqual([]);
    const kept = readdirSync(dir).find((f) => f.startsWith(`${RECORDS_FILE}.ilegivel-`));
    expect(kept && readFileSync(join(dir, kept), 'utf8')).toBe('{"ranking": [');
  });
});

describe('placar na sala', () => {
  let t: ColyseusTestServer;
  let dataDir: string;

  beforeAll(async () => {
    dataDir = tempDir();
    ArenaRoom.records = new RecordBook(dataDir);
    const http = createServer();
    const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false, gracefullyShutdown: false });
    server.define(ROOM_NAME, ArenaRoom);
    // Porta própria: os testes de rooms.test.ts usam a 2568 em paralelo, e boot() ignora a porta pedida para um Server.
    await server.listen(2569);
    t = new ColyseusTestServer(server);
  });
  afterEach(async () => {
    await t.cleanup();
  });
  afterAll(async () => {
    await t.shutdown();
  });

  async function until(cond: () => boolean, ms = 3000): Promise<void> {
    const end = Date.now() + ms;
    while (!cond()) {
      if (Date.now() > end) throw new Error('tempo esgotado esperando a condição');
      await new Promise((r) => setTimeout(r, 1));
    }
  }

  /** Sala com inimigos, partida começada e dois jogadores ouvindo o placar. */
  async function playing() {
    const room = (await t.createRoom(ROOM_NAME, {})) as unknown as ArenaRoom;
    const world = (room as unknown as { world: World }).world;
    const clients = [await t.connectTo(room), await t.connectTo(room)];
    const inbox = clients.map(() => [] as RecordsMessage[]);
    clients.forEach((c, i) => c.onMessage(MSG_RECORDS, (m: RecordsMessage) => inbox[i]!.push(m)));
    clients[0]!.send(MSG_START);
    await until(() => world.phase !== PHASE_LOBBY);
    return { room, world, clients, inbox };
  }

  /**
   * Barreira: as mensagens de um cliente são tratadas na ordem; quando o comando `seq` foi aplicado,
   * tudo o que esse cliente mandou antes já passou pelo servidor.
   */
  async function flush(room: ArenaRoom, client: { sessionId: string; send: (type: string, msg: unknown) => void }, seq: number) {
    client.send(MSG_INPUT, { seq, buttons: 0 });
    await until(() => room.state.players.get(client.sessionId)?.ack === seq);
  }

  /** O servidor encerra a partida: equipe sem vidas e todos derrubados. */
  function gameOver(world: World, score: number) {
    world.score = score;
    world.lives = 0;
    for (const p of world.players.values()) {
      p.down = true;
      p.invuln = 0;
    }
  }

  it('a pontuação é a do servidor: o que o navegador manda junto com o nome é ignorado', async () => {
    const { room, world, clients, inbox } = await playing();
    // Antes do fim de jogo, nome nenhum é aceito, e o comando não carrega pontos.
    clients[0]!.send(MSG_NAME, { name: 'Cedo', score: 999_999 });
    clients[0]!.send(MSG_INPUT, { seq: 1, buttons: 0, score: 999_999 });
    await flush(room, clients[0]!, 2);
    gameOver(world, 700);
    await until(() => inbox.every((box) => box.length === 1));
    const first = inbox[0]![0]!;
    expect(world.phase).toBe(PHASE_RESTART);
    expect(first.score).toBe(700);
    expect(first.difficulty).toBe('medio');
    expect(first.waiting).toHaveLength(2);
    const line = first.entries.find((e) => e.id === first.entryId)!;
    expect(line.score).toBe(700);
    expect(line.names).toEqual(['Jogador 1', 'Jogador 2']);

    clients[0]!.send(MSG_NAME, { name: 'Ana', score: 999_999, entryId: 'outro' });
    await until(() => inbox[1]!.length === 2);
    const after = inbox[1]![1]!;
    expect(after.waiting).toEqual([clients[1]!.sessionId]);
    expect(after.entries.find((e) => e.id === first.entryId)).toMatchObject({ score: 700, names: ['Ana', 'Jogador 2'] });
    expect(after.entries.some((e) => e.score === 999_999)).toBe(false);

    // Só um nome por jogador: o segundo é ignorado.
    clients[0]!.send(MSG_NAME, { name: 'Outra' });
    clients[1]!.send(MSG_NAME, { name: 'Bia' });
    await until(() => inbox[0]!.length === 3);
    expect(inbox[0]![2]!.entries.find((e) => e.id === first.entryId)!.names).toEqual(['Ana', 'Bia']);
    expect(inbox[0]![2]!.waiting).toEqual([]);
    // Todos escreveram: a pausa encurta.
    expect(world.phaseTime).toBeLessThanOrEqual(RULES.recordShow);

    // Persistido: um servidor novo lendo a mesma pasta vê a mesma linha.
    expect(new RecordBook(dataDir).list('medio').find((e) => e.id === first.entryId)!.names).toEqual(['Ana', 'Bia']);
  });

  it('nome inválido não entra e as tentativas são limitadas', async () => {
    const { room, world, clients, inbox } = await playing();
    gameOver(world, 300);
    await until(() => inbox[0]!.length === 1);
    const entryId = inbox[0]![0]!.entryId!;
    for (let i = 0; i < RECORD_NAME_TRIES; i++) clients[0]!.send(MSG_NAME, { name: '<b>x</b>' });
    clients[0]!.send(MSG_NAME, { name: 'Tarde' });
    await flush(room, clients[0]!, 1);
    expect(inbox[0]).toHaveLength(1);
    clients[1]!.send(MSG_NAME, { name: 'Bia' });
    await until(() => inbox[0]!.length === 2);
    const msg = inbox[0]![1]!;
    expect(msg.waiting).toEqual([clients[0]!.sessionId]);
    expect(msg.entries.find((e) => e.id === entryId)!.names).toEqual(['Jogador 1', 'Bia']);
  });

  it('quem chega depois do fim de jogo não escreve na linha da partida', async () => {
    const { room, world, clients, inbox } = await playing();
    gameOver(world, 200);
    await until(() => inbox[0]!.length === 1);
    const entryId = inbox[0]![0]!.entryId!;
    const late = await t.connectTo(room);
    late.send(MSG_NAME, { name: 'Intruso' });
    await flush(room, late, 1);
    expect(inbox[0]).toHaveLength(1);
    clients[0]!.send(MSG_NAME, { name: 'Ana' });
    await until(() => inbox[0]!.length === 2);
    expect(inbox[0]![1]!.entries.find((e) => e.id === entryId)!.names).toEqual(['Ana', 'Jogador 2']);
    // Quem sai fica com o nome provisório e não segura a pausa.
    await clients[1]!.leave();
    await until(() => inbox[0]!.length === 3);
    expect(inbox[0]![2]!.waiting).toEqual([]);
  });
});
