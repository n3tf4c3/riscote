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
    away: t.boolean(),
    hp: t.uint8(),
    strength: t.uint8(),
    speed: t.uint8(),
    rate: t.uint8(),
    range: t.uint8(),
    star: t.float32(),
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
    /** Fase da habilidade (SKILL_*): o cliente desenha o aviso antes de ela acontecer. */
    skill: t.uint8(),
  },
  'Enemy',
);
export type EnemySchema = SchemaType<typeof EnemySchema>;

/** Mancha do borrão; `age` abaixo de RULES.stainWarn ainda não machuca. */
export const StainSchema = schema(
  {
    x: t.float32(),
    y: t.float32(),
    age: t.float32(),
  },
  'Stain',
);
export type StainSchema = SchemaType<typeof StainSchema>;

export const DropSchema = schema(
  {
    slot: t.uint8(),
    x: t.float32(),
    y: t.float32(),
  },
  'Drop',
);
export type DropSchema = SchemaType<typeof DropSchema>;

export const ItemSchema = schema(
  {
    kind: t.uint8(),
    x: t.float32(),
    y: t.float32(),
    ttl: t.float32(),
  },
  'Item',
);
export type ItemSchema = SchemaType<typeof ItemSchema>;

export const GameState = schema(
  {
    arenaId: t.string(),
    arenaIndex: t.uint8(),
    arenaCount: t.uint8(),
    /** facil | medio | dificil: só no difícil a tinta acaba. */
    difficulty: t.string(),
    /** Sessão do anfitrião: quem pode encerrar o aquecimento. */
    hostId: t.string(),
    tick: t.uint32(),
    waveTime: t.float32(),
    hurry: t.boolean(),
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
    items: t.map(ItemSchema),
    stains: t.map(StainSchema),
  },
  'GameState',
);
export type GameState = SchemaType<typeof GameState>;
