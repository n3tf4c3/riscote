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
    /** Nome para os outros verem (o escolhido na entrada ou "Jogador N"); fora da simulação. */
    name: t.string(),
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
    /** Fiandeira: y onde o fio se prende, para o cliente desenhar o fio; -1 = solta. */
    anchorY: t.float32(),
  },
  'Enemy',
);
export type EnemySchema = SchemaType<typeof EnemySchema>;

/** Gota cuspida pelo tinteiro (machuca desde que sai: o aviso é o tinteiro inclinado antes). */
export const SpitSchema = schema(
  {
    x: t.float32(),
    y: t.float32(),
  },
  'Spit',
);
export type SpitSchema = SchemaType<typeof SpitSchema>;

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

/** O Mata-Borrão (espelha `Boss` de @riscote/shared); `maxHp` 0 = sem chefe nesta página. */
export const BossSchema = schema(
  {
    state: t.uint8(),
    attack: t.uint8(),
    x: t.float32(),
    y: t.float32(),
    dir: t.int8(),
    hp: t.uint8(),
    maxHp: t.uint8(),
    soak: t.float32(),
    soakMax: t.uint8(),
    /** Segundos restantes no estado: o cliente mede o aviso por aqui. */
    timer: t.float32(),
    targetX: t.float32(),
    /** Contadores: batidas no chão e golpes levados (o cliente reage quando sobem). */
    impacts: t.uint16(),
    hits: t.uint16(),
  },
  'Boss',
);
export type BossSchema = SchemaType<typeof BossSchema>;

/** Onda ou borrão do chefe; `wait` acima de 0 é aviso e ainda não machuca. */
export const HazardSchema = schema(
  {
    kind: t.uint8(),
    x: t.float32(),
    y: t.float32(),
    w: t.float32(),
    h: t.float32(),
    wait: t.float32(),
  },
  'Hazard',
);
export type HazardSchema = SchemaType<typeof HazardSchema>;

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
    boss: t.ref(BossSchema),
    hazards: t.map(HazardSchema),
    /** A próxima página é a do chefe: a virada ganha aviso. */
    bossNext: t.boolean(),
    spits: t.map(SpitSchema),
  },
  'GameState',
);
export type GameState = SchemaType<typeof GameState>;
