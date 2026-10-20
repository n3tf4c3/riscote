import { BTN_ALL } from './input.ts';
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

export interface InputMessage {
  seq: number;
  buttons: number;
}

export interface CreateRoomOptions {
  arenaId?: string;
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
export function describeJoinError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
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
