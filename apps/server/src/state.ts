import { schema, t, type SchemaType } from '@colyseus/schema';

// Espelha NetPlayer (@riscote/shared): todos os campos da simulação viajam em float64
// para que a reconciliação no cliente parta exatamente do estado do servidor.
export const PlayerSchema = schema(
  {
    slot: t.uint8(),
    ack: t.uint32(),
    x: t.float64(),
    y: t.float64(),
    vx: t.float64(),
    vy: t.float64(),
    onGround: t.boolean(),
    onOneWay: t.boolean(),
    coyote: t.float64(),
    jumpBuffer: t.float64(),
    jumpHeld: t.boolean(),
    facing: t.int8(),
    prevButtons: t.uint8(),
  },
  'Player',
);
export type PlayerSchema = SchemaType<typeof PlayerSchema>;

export const GameState = schema(
  {
    arenaId: t.string(),
    tick: t.uint32(),
    players: t.map(PlayerSchema),
  },
  'GameState',
);
export type GameState = SchemaType<typeof GameState>;
