import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ROOM_NAME } from '@riscote/shared';
import { ArenaRoom } from './ArenaRoom.ts';

// Latência simulada para testes: COLYSEUS_LATENCY=<ms de ida e volta>.
const port = Number(process.env.PORT ?? 2567);

const server = new Server({ transport: new WebSocketTransport(), greet: false });
server.define(ROOM_NAME, ArenaRoom);
await server.listen(port);
console.log(`Riscote: servidor de partidas em ws://localhost:${port}`);
