// Sonda temporária: mede o atraso entre enviar um comando e recebê-lo confirmado (ack).
// Uso: node scripts/sonda-rede.ts <ws(s)://servidor>
import { ColyseusSDK } from '@colyseus/sdk';
import { BTN_RIGHT, MSG_INPUT, ROOM_NAME } from '@riscote/shared';

const endpoint = process.argv[2] ?? 'ws://127.0.0.1:2567';
const room = await new ColyseusSDK(endpoint).create(ROOM_NAME, {});
room.reconnection.enabled = false;
const sentAt = new Map<number, number>();
const delays: number[] = [];
let lastAck = 0;
let patches = 0;
room.onStateChange((s: any) => {
  patches++;
  const ack = s.players.get(room.sessionId)?.ack ?? 0;
  for (let seq = lastAck + 1; seq <= ack; seq++) {
    const t = sentAt.get(seq);
    if (t !== undefined) delays.push(performance.now() - t);
  }
  lastAck = Math.max(lastAck, ack);
});

const total = 300;
let seq = 0;
await new Promise<void>((resolve) => {
  const timer = setInterval(() => {
    seq++;
    sentAt.set(seq, performance.now());
    room.send(MSG_INPUT, { seq, buttons: seq % 60 < 30 ? BTN_RIGHT : 0 });
    if (seq >= total) {
      clearInterval(timer);
      resolve();
    }
  }, 1000 / 60);
});
await new Promise((r) => setTimeout(r, 3000));
delays.sort((a, b) => a - b);
const pct = (p: number) => Math.round(delays[Math.floor((delays.length - 1) * p)] ?? -1);
console.log(
  JSON.stringify({ endpoint, enviados: total, confirmados: delays.length, ultimoAck: lastAck, patchesPorSegundo: Math.round(patches / ((total / 60) + 3)), atrasoMsP50: pct(0.5), atrasoMsP90: pct(0.9), atrasoMsMax: pct(1) }),
);
await room.leave();
process.exit(0);
