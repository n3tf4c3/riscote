import { schema, t, type SchemaType } from '@colyseus/schema';

// Espelha NetPlayer (@riscote/shared): os campos de movimento viajam em float64
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
    ink: t.float32(),
    down: t.boolean(),
    rescue: t.float32(),
    invuln: t.float32(),
    kills: t.uint16(),
  },
  'Player',
);
export type PlayerSchema = SchemaType<typeof PlayerSchema>;

// Inimigos e gotas não são previstos no cliente, só exibidos: float32 basta.
export const EnemySchema = schema(
  {
    kind: t.uint8(),
    mode: t.uint8(),
    x: t.float32(),
    y: t.float32(),
    facing: t.int8(),
    soak: t.uint8(),
  },
  'Enemy',
);
export type EnemySchema = SchemaType<typeof EnemySchema>;

export const DropSchema = schema(
  {
    slot: t.uint8(),
    x: t.float32(),
    y: t.float32(),
  },
  'Drop',
);
export type DropSchema = SchemaType<typeof DropSchema>;

export const GameState = schema(
  {
    arenaId: t.string(),
    tick: t.uint32(),
    phase: t.uint8(),
    phaseTime: t.float32(),
    wave: t.uint16(),
    lives: t.uint8(),
    score: t.uint32(),
    enemiesLeft: t.uint8(),
    soakToBall: t.uint8(),
    players: t.map(PlayerSchema),
    enemies: t.map(EnemySchema),
    drops: t.map(DropSchema),
  },
  'GameState',
);
export type GameState = SchemaType<typeof GameState>;
