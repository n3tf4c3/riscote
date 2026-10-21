import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ROOM_NAME } from '@riscote/shared';
import { ArenaRoom } from './ArenaRoom.ts';
import { AttemptLimiter, limitJoins, limitRooms, markPeerAddress } from './joinLimit.ts';
import { processMetrics, startMetricsLog } from './metrics.ts';
import { RecordBook } from './records.ts';

// Variáveis de ambiente:
// - PORT: porta do servidor (padrão 2567).
// - COLYSEUS_LATENCY=<ms>: latência simulada de ida e volta, para testes.
// - RISCOTE_IP_HEADER: cabeçalho com o IP do jogador garantido por um proxy confiável
//   (ex.: cf-connecting-ip). Sem proxy, vale o endereço do socket.
// - RISCOTE_JOIN_LIMIT: tentativas de criar/entrar em sala por minuto por endereço (padrão 20;
//   0 desliga, só para teste de carga local).
// - RISCOTE_MAX_ROOMS: salas abertas ao mesmo tempo (padrão 40 = 200 jogadores; 0 desliga, só para
//   teste de carga). Acima disso, criar sala responde 503; entrar pelo código continua valendo.
//   O padrão vem da carga de 2026-10-21 (docs/docker.md, seção Capacidade).
// - RISCOTE_METRICS=1: uma linha JSON de métricas do processo a cada 10 s.
// - RISCOTE_HOST: interface de escuta (padrão: todas). Com túnel, use 127.0.0.1: só o túnel
//   alcança o servidor e o cabeçalho de IP do proxy fica confiável.
// - RISCOTE_DATA_DIR: pasta do placar de recordes (recordes.json). Padrão apps/server/dados;
//   no Docker, o volume em /dados.
const port = Number(process.env.PORT ?? 2567);
const host = process.env.RISCOTE_HOST || undefined;

ArenaRoom.records = new RecordBook(process.env.RISCOTE_DATA_DIR || fileURLToPath(new URL('../dados/', import.meta.url)));

const http = createServer();
markPeerAddress(http, process.env.RISCOTE_IP_HEADER || undefined);
const joinLimit = Number(process.env.RISCOTE_JOIN_LIMIT ?? 20);
if (joinLimit > 0) limitJoins(new AttemptLimiter(joinLimit, 60_000));
const maxRooms = Number(process.env.RISCOTE_MAX_ROOMS ?? 40);
if (maxRooms > 0) limitRooms(maxRooms, () => processMetrics.rooms);
if (process.env.RISCOTE_METRICS === '1') startMetricsLog();

const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false });
server.define(ROOM_NAME, ArenaRoom);
await server.listen(port, host);
console.log(`Riscote: servidor de partidas em ws://${host ?? 'localhost'}:${port}`);
