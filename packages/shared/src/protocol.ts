import { BTN_ALL } from './input.ts';
import { DEFAULT_PARAMS, type MovementParams } from './params.ts';
import type { PlayerState } from './physics.ts';

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

export interface InputMessage {
  seq: number;
  buttons: number;
}

/** Modos de dificuldade. Só no difícil a tinta acaba e é preciso recarregar nos tubos. */
export const DIFFICULTIES = ['facil', 'medio', 'dificil'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_NAMES: Record<Difficulty, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

/** O que muda entre os modos (valores iniciais, a ajustar em playtest). */
export const DIFFICULTY_RULES: Record<Difficulty, { limitedInk: boolean; hitsToDown: number; speedMult: number }> = {
  facil: { limitedInk: false, hitsToDown: 2, speedMult: 1.15 },
  medio: { limitedInk: false, hitsToDown: 1, speedMult: 1 },
  dificil: { limitedInk: true, hitsToDown: 1, speedMult: 1 },
};

/** Parâmetros de movimento do modo. Servidor e previsão do cliente precisam usar os mesmos. */
export function movementParams(difficulty: Difficulty): MovementParams {
  return { ...DEFAULT_PARAMS, runSpeed: DEFAULT_PARAMS.runSpeed * DIFFICULTY_RULES[difficulty].speedMult };
}

/** Valida a escolha vinda do cliente; qualquer outra coisa vira o modo médio. */
export function parseDifficulty(raw: unknown): Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(raw) ? (raw as Difficulty) : 'medio';
}

export interface CreateRoomOptions {
  arenaId?: string;
  difficulty?: Difficulty;
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

/**
 * Traduz a recusa do matchmaking em mensagem para o jogador. A sala só fica trancada
 * ao atingir MAX_PLAYERS (o servidor não tranca por outro motivo), então "locked" = cheia.
 */
/** Recusa por excesso de tentativas de criar ou entrar em sala (HTTP 429). */
export const TOO_MANY_JOINS = 'Muitas tentativas de entrar em sala. Espere um minuto e tente de novo.';

export function describeJoinError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(TOO_MANY_JOINS)) return TOO_MANY_JOINS;
  if (/is locked/.test(message)) return `Sala cheia: o limite é de ${MAX_PLAYERS} jogadores.`;
  if (/not found/.test(message)) return 'Nenhuma sala com esse código.';
  return 'Não foi possível entrar na sala. Tente de novo.';
}

/** Normaliza o que a pessoa digitou ("ab-cd 23" → "ABCD23"); devolve null se não for um código válido. */
export function normalizeRoomCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return null;
  for (const ch of code) if (!ROOM_CODE_ALPHABET.includes(ch)) return null;
  return code;
}
