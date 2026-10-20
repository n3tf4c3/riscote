// Teste de carga (plano, seção 4.5): N salas com 5 robôs cada, comandos a 60 Hz.
// Uso: node scripts/carga.ts --salas 10 --segundos 30 --servidor ws://localhost:2567
// O servidor deve rodar com RISCOTE_METRICS=1 (tick e CPU no log) e RISCOTE_JOIN_LIMIT=0
// (os robôs entram todos do mesmo endereço). Robôs e servidor na mesma máquina disputam CPU:
// o número que vale para produção sai de rodar o servidor sozinho na máquina-alvo.
import { ColyseusSDK, type Room } from '@colyseus/sdk';
import { BTN_ATTACK, BTN_JUMP, BTN_LEFT, BTN_RIGHT, MAX_PLAYERS, MSG_INPUT, MSG_START, ROOM_NAME } from '@riscote/shared';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const rooms = Number(arg('salas', '5'));
const seconds = Number(arg('segundos', '30'));
const endpoint = arg('servidor', 'ws://localhost:2567');
const sdk = new ColyseusSDK(endpoint);

interface Bot {
  room: Room;
  seq: number;
  phase: number;
  patches: number;
}

const bots: Bot[] = [];
let failures = 0;

function track(room: Room, phase: number): Bot {
  const bot = { room, seq: 0, phase, patches: 0 };
  room.onStateChange(() => bot.patches++);
  room.reconnection.enabled = false;
  bots.push(bot);
  return bot;
}

for (let r = 0; r < rooms; r++) {
  try {
    const host = await sdk.create(ROOM_NAME, {});
    track(host, r * MAX_PLAYERS);
    for (let p = 1; p < MAX_PLAYERS; p++) track(await sdk.joinById(host.roomId), r * MAX_PLAYERS + p);
    host.send(MSG_START);
  } catch (error) {
    failures++;
    console.error('falha ao montar sala', r, error instanceof Error ? error.message : error);
  }
}
console.log(`carga: ${bots.length} robôs em ${rooms - failures} salas; ${seconds} s a 60 Hz`);

// Andar de um lado para o outro, pular e atirar em ritmos diferentes por robô.
const pattern = [BTN_RIGHT, BTN_RIGHT | BTN_ATTACK, BTN_RIGHT | BTN_JUMP, BTN_LEFT, BTN_LEFT | BTN_ATTACK, BTN_LEFT | BTN_JUMP];
let tick = 0;
const timer = setInterval(() => {
  tick++;
  for (const bot of bots) {
    const buttons = pattern[Math.floor((tick + bot.phase * 7) / 20) % pattern.length]!;
    bot.room.send(MSG_INPUT, { seq: ++bot.seq, buttons: tick % 2 === 0 ? buttons : buttons & ~BTN_ATTACK });
  }
}, 1000 / 60);

await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
clearInterval(timer);

const rates = bots.map((b) => b.patches / seconds);
const avg = rates.reduce((a, b) => a + b, 0) / Math.max(1, rates.length);
console.log(
  JSON.stringify({
    carga: 'resumo',
    salas: rooms - failures,
    robos: bots.length,
    falhas: failures,
    comandosPorSegundoPorRobo: Math.round(tick / seconds),
    patchesPorSegundoMedio: Math.round(avg * 10) / 10,
    patchesPorSegundoMin: Math.round(Math.min(...rates) * 10) / 10,
  }),
);
await Promise.all(bots.map((b) => b.room.leave().catch(() => undefined)));
process.exit(0);
