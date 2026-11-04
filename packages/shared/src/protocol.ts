import { BTN_ALL } from './input.ts';
import { DEFAULT_PARAMS, type MovementParams } from './params.ts';
import type { PlayerState } from './physics.ts';
import { parseRecordName } from './records.ts';

export const ROOM_NAME = 'arena';
export const MAX_PLAYERS = 5;

// Sem 0/O, 1/I/L: o código é ditado e digitado por pessoas.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

/** Mensagem cliente → servidor: só botões, nunca posição, dano ou pontuação. */
export const MSG_INPUT = 'i';
/** Mensagem servidor → sala: relatório de métricas de uma arena encerrada (ArenaReport). */
export const MSG_REPORT = 'relatorio';

/** Mensagem cliente → servidor: o anfitrião encerra o aquecimento. Ignorada se vier de outro jogador. */
export const MSG_START = 'comecar';

/** Mensagem cliente → servidor: o anfitrião desiste da partida (fim de jogo). Ignorada se vier de outro jogador. */
export const MSG_GIVE_UP = 'desistir';

export interface InputMessage {
  seq: number;
  buttons: number;
}

/** Modos de dificuldade. Só no difícil a tinta acaba e é preciso recarregar nos tubos. */
export const DIFFICULTIES = ['facil', 'medio', 'dificil'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_NAMES: Record<Difficulty, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

export interface DifficultyRules {
  limitedInk: boolean;
  hitsToDown: number;
  speedMult: number;
  /** Multiplica o aviso das habilidades dos inimigos e das manchas do borrão. */
  warnMult: number;
  /** Multiplica o intervalo entre habilidades (soma-se ao da fase). */
  skillCdMult: number;
  /** Inimigos a menos por fase (nunca abaixo de 3). */
  fewerEnemies: number;
  /** O borrão nunca chega antes disto, em segundos. */
  minHurry: number;
}

/**
 * O que muda entre os modos (valores iniciais, a ajustar em playtest). A progressão entre as fases
 * existe dentro de cada modo; o modo só desloca a curva inteira.
 */
export const DIFFICULTY_RULES: Record<Difficulty, DifficultyRules> = {
  facil: { limitedInk: false, hitsToDown: 2, speedMult: 1.15, warnMult: 1.42, skillCdMult: 1.5, fewerEnemies: 1, minHurry: 90 },
  medio: { limitedInk: false, hitsToDown: 1, speedMult: 1, warnMult: 1, skillCdMult: 1, fewerEnemies: 0, minHurry: 0 },
  dificil: { limitedInk: true, hitsToDown: 1, speedMult: 1, warnMult: 1, skillCdMult: 0.85, fewerEnemies: 0, minHurry: 0 },
};

/** Item de agilidade: +12% de corrida por nível (até POWER_MAX_LEVEL). */
export const SPEED_PER_LEVEL = 0.12;
/** Teto de acúmulo dos itens: acima disso a velocidade passaria do limite da física. */
export const POWER_MAX_LEVEL = 3;

/**
 * Parâmetros de movimento do modo e do nível de agilidade do jogador. Servidor e previsão
 * do cliente precisam usar exatamente esta função para chegar aos mesmos números.
 */
export function movementParams(difficulty: Difficulty, speedLevel = 0): MovementParams {
  const mult = DIFFICULTY_RULES[difficulty].speedMult * (1 + SPEED_PER_LEVEL * speedLevel);
  return { ...DEFAULT_PARAMS, runSpeed: DEFAULT_PARAMS.runSpeed * mult };
}

/** Valida a escolha vinda do cliente; qualquer outra coisa vira o modo médio. */
export function parseDifficulty(raw: unknown): Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(raw) ? (raw as Difficulty) : 'medio';
}

/** Opções de quem entra (ao criar ou ao entrar pelo código). O nome passa por `parseRecordName`. */
export interface JoinOptions {
  name?: string;
  /**
   * Personagem escolhido na capa (pedido do usuário em 2026-11-04): a vaga que a pessoa prefere, de 0 a
   * MAX_PLAYERS − 1. A vaga decide o boneco inteiro (cor, rosto, cabelo e acessório); ocupada, a pessoa
   * fica com a primeira livre. Validado por `parseCharacter`.
   */
  character?: number;
  /** Chave das vagas do computador que criou a sala (ver `CreateRoomOptions.localKey`). */
  localKey?: string;
}

export interface CreateRoomOptions extends JoinOptions {
  arenaId?: string;
  difficulty?: Difficulty;
  /** Sala aberta: aparece com código e nomes na lista da capa. Sem o campo, a sala é privada. */
  open?: boolean;
  /** Vagas para quem joga no computador que cria a sala (o teclado e um controle por jogador a mais). */
  local?: number;
  /** Vagas para quem entra pela internet. A sala comporta `local + online` (`parseSeats`). */
  online?: number;
  /**
   * Segredo sorteado pelo navegador de quem cria a sala: só quem entra com ela ocupa as vagas locais.
   * Nunca vai para o estado sincronizado nem para a lista de salas.
   */
  localKey?: string;
}

/** Vagas da sala: as do computador que a criou (com quem criou) e as da internet. */
export interface Seats {
  local: number;
  online: number;
}

/** Valida as vagas pedidas na criação; sem o campo (cliente antigo) ou fora do limite, 1 local e o resto pela internet. */
export function parseSeats(local: unknown, online: unknown): Seats {
  const l = typeof local === 'number' && Number.isInteger(local) && local >= 1 && local <= MAX_PLAYERS ? local : 1;
  const o = typeof online === 'number' && Number.isInteger(online) && online >= 0 && online <= MAX_PLAYERS - l ? online : MAX_PLAYERS - l;
  return { local: l, online: o };
}

const LOCAL_KEY = /^[A-Za-z0-9_-]{16,64}$/;

/** Valida o personagem escolhido (a vaga preferida); qualquer outra coisa vira null (a primeira livre). */
export function parseCharacter(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw < MAX_PLAYERS ? raw : null;
}

/** Valida a chave das vagas locais; qualquer outra coisa vira null (entra pelas vagas da internet). */
export function parseLocalKey(raw: unknown): string | null {
  return typeof raw === 'string' && LOCAL_KEY.test(raw) ? raw : null;
}

/** Caminho HTTP do servidor com a lista das salas (`RoomSummary[]`). */
export const ROOM_LIST_PATH = '/salas';

/** Uma sala na lista da capa. A privada não revela código nem nomes. */
export interface RoomSummary {
  /** Código para entrar; null na sala privada. */
  code: string | null;
  players: number;
  /** Quantos cabem na sala (vagas locais mais as da internet). */
  capacity: number;
  /** Vagas pela internet ainda livres: 0 é sala cheia para quem vem de fora. */
  vacant: number;
  /** Nomes na ordem de chegada; vazio na sala privada. */
  names: string[];
  /** Índice em CHAPTERS. */
  chapter: number;
  difficulty: Difficulty;
  /** false = aquecimento. */
  playing: boolean;
  /** Página atual (a partir de 0) e total, com a do chefe. */
  page: number;
  pages: number;
}

const MAX_LISTED_ROOMS = 100;

/** Valida a lista vinda do servidor; entradas fora do formato são descartadas. */
export function parseRoomList(raw: unknown): RoomSummary[] {
  if (!Array.isArray(raw)) return [];
  const rooms: RoomSummary[] = [];
  for (const item of raw.slice(0, MAX_LISTED_ROOMS)) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const count = (v: unknown, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : null);
    const code = r.code === null ? null : typeof r.code === 'string' ? (normalizeRoomCode(r.code) ?? undefined) : undefined;
    const players = count(r.players, MAX_PLAYERS);
    const chapter = count(r.chapter, 99);
    const page = count(r.page, 99);
    const pages = count(r.pages, 99);
    if (code === undefined || players === null || chapter === null || page === null || pages === null) continue;
    if (!(DIFFICULTIES as readonly unknown[]).includes(r.difficulty)) continue;
    const names = code && Array.isArray(r.names) ? r.names.filter((n): n is string => parseRecordName(n) === n).slice(0, MAX_PLAYERS) : [];
    // Servidor antigo, sem os campos: sala de MAX_PLAYERS, toda pela internet.
    const capacity = Math.max(players, count(r.capacity, MAX_PLAYERS) ?? MAX_PLAYERS);
    const vacant = Math.min(capacity - players, count(r.vacant, MAX_PLAYERS) ?? capacity - players);
    rooms.push({ code, players, capacity, vacant, names, chapter, difficulty: r.difficulty as Difficulty, playing: r.playing === true, page, pages });
  }
  return rooms;
}

/** Estado de um jogador como o servidor sincroniza: a simulação completa mais o último comando aplicado. */
export interface NetPlayer extends Omit<PlayerState, 'facing'> {
  /** Na rede é um inteiro qualquer; copyNetPlayer normaliza para 1 | -1. */
  facing: number;
  slot: number;
  ack: number;
  ink: number;
  down: boolean;
  rescue: number;
  invuln: number;
  kills: number;
  away: boolean;
  /** Toques que ainda aguenta antes de cair (2 no fácil). */
  hp: number;
  /** Níveis dos itens acumulados (0 a POWER_MAX_LEVEL); zeram quando o boneco é derrubado. */
  strength: number;
  speed: number;
  rate: number;
  range: number;
  /** Segundos restantes do item de invencibilidade. */
  star: number;
}

const MAX_SEQ = 2 ** 31 - 1;

/** Valida a mensagem de entrada vinda da rede. Qualquer outro formato é descartado. */
export function parseInput(raw: unknown): InputMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { seq, buttons } = raw as Record<string, unknown>;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0 || seq > MAX_SEQ) return null;
  if (typeof buttons !== 'number' || !Number.isInteger(buttons) || buttons < 0) return null;
  if ((buttons & ~BTN_ALL) !== 0) return null;
  return { seq, buttons };
}

/** Recusa por excesso de tentativas de criar ou entrar em sala (HTTP 429). */
export const TOO_MANY_JOINS = 'Muitas tentativas de entrar em sala. Espere um minuto e tente de novo.';

/** Recusa por limite de salas abertas no servidor (HTTP 503); entrar por código numa sala existente continua valendo. */
export const SERVER_FULL = 'O servidor está cheio agora: tente criar a sala de novo em alguns minutos ou entre numa sala pelo código.';

/** Salas criadas por um mesmo endereço que podem estar abertas ao mesmo tempo (sem isso, um só endereço lotava o servidor). */
export const ROOMS_PER_ADDRESS = 3;

/** Recusa a quem já tem `ROOMS_PER_ADDRESS` salas abertas criadas do mesmo endereço (HTTP 429). */
export const TOO_MANY_ROOMS = `Já há ${ROOMS_PER_ADDRESS} salas abertas criadas da sua rede: saia de uma ou entre numa sala pelo código.`;

/** Código de fechamento da sala que ficou parada no aquecimento, sem comando de ninguém. */
export const CLOSE_LOBBY_IDLE = 4100;

/** Minutos sem nenhum comando no aquecimento até a sala fechar. */
export const LOBBY_IDLE_MINUTES = 10;

export const LOBBY_IDLE_TEXT = `A sala fechou depois de ${LOBBY_IDLE_MINUTES} minutos parada no aquecimento.`;

/** Recusa de quem não tem mais vaga na sala. */
export const ROOM_FULL = 'Sala cheia: todas as vagas estão ocupadas.';

/** Recusa a quem vem pela internet quando só sobram as vagas reservadas ao computador que criou a sala. */
export const ONLINE_FULL = 'As vagas pela internet desta sala estão ocupadas: as que sobram são de quem joga no computador que a criou.';

/**
 * Traduz a recusa do matchmaking em mensagem para o jogador. A sala só fica trancada
 * ao atingir a capacidade dela (o servidor não tranca por outro motivo), então "locked" = cheia.
 */
export function describeJoinError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(TOO_MANY_JOINS)) return TOO_MANY_JOINS;
  if (message.includes(SERVER_FULL)) return SERVER_FULL;
  if (message.includes(TOO_MANY_ROOMS)) return TOO_MANY_ROOMS;
  if (message.includes(ONLINE_FULL)) return ONLINE_FULL;
  if (message.includes(ROOM_FULL) || /is locked/.test(message)) return ROOM_FULL;
  if (/not found/.test(message)) return 'Nenhuma sala com esse código.';
  return 'Não foi possível entrar na sala. Tente de novo.';
}

/** Vaga guardada no navegador para voltar ao mesmo boneco depois de recarregar a página. */
export interface SavedSeat {
  /** Servidor que emitiu o token (normalizeServerUrl). */
  server: string;
  code: string;
  token: string;
  /** Quem criou a sala: a chave das vagas locais e quantos jogam neste computador. */
  localKey?: string;
  local?: number;
}

/** Endereço do servidor na forma guardada e comparada: sem espaços, sem barra no fim, em minúsculas. */
export function normalizeServerUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').toLowerCase();
}

/**
 * A vaga guardada, se ela foi emitida pelo servidor atual. O token dá acesso ao boneco: nunca vai
 * para outro servidor (um link com `?servidor=` trocado o entregaria). Vaga de outro servidor, sem
 * servidor (versão antiga) ou fora do formato: null, e o chamador apaga a vaga.
 */
export function seatForServer(raw: unknown, server: string): SavedSeat | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const seat = raw as Record<string, unknown>;
  if (typeof seat.server !== 'string' || typeof seat.code !== 'string' || typeof seat.token !== 'string') return null;
  if (seat.server !== normalizeServerUrl(server) || !seat.token) return null;
  const saved: SavedSeat = { server: seat.server, code: seat.code, token: seat.token };
  const localKey = parseLocalKey(seat.localKey);
  if (localKey) saved.localKey = localKey;
  if (localKey) saved.local = parseSeats(seat.local, 0).local;
  return saved;
}

/** Normaliza o que a pessoa digitou ("ab-cd 23" → "ABCD23"); devolve null se não for um código válido. */
export function normalizeRoomCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return null;
  for (const ch of code) if (!ROOM_CODE_ALPHABET.includes(ch)) return null;
  return code;
}
