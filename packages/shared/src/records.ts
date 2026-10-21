import type { Difficulty } from './protocol.ts';

/** Recordes guardados por dificuldade. */
export const RECORDS_MAX = 15;
/** Letras (contando acentos) por nome no placar. */
export const RECORD_NAME_MAX = 12;
/** Tentativas de nome por jogador e por fim de jogo; depois disso o servidor ignora. */
export const RECORD_NAME_TRIES = 5;

/** Mensagem cliente → servidor: `{ name }` para a linha desta partida. Só o nome; a pontuação é do servidor. */
export const MSG_NAME = 'nome';
/** Mensagem servidor → sala: o placar da dificuldade da sala no fim de jogo (RecordsMessage). */
export const MSG_RECORDS = 'recordes';

/** Como a partida acabou: capítulo concluído, equipe sem vidas ou desistência (pedida pelo anfitrião). */
export type RunEndReason = 'capitulo' | 'sem-vidas' | 'desistencia';

export interface RecordEntry {
  id: string;
  score: number;
  /** Um nome por jogador da equipe, na ordem de chegada à sala. */
  names: string[];
  reason: RunEndReason;
  /** Arena onde a partida acabou. */
  arena: string;
  /** Dia (AAAA-MM-DD, UTC). */
  date: string;
}

export interface RecordsMessage {
  difficulty: Difficulty;
  entries: RecordEntry[];
  /** Linha desta partida no placar; null se não ficou entre os 15. */
  entryId: string | null;
  score: number;
  reason: RunEndReason;
  /** Jogadores (sessionId) que ainda podem escrever o nome. */
  waiting: string[];
}

/** Nome provisório de quem não escreveu o próprio. */
export function placeholderName(slot: number): string {
  return `Jogador ${slot + 1}`;
}

// Letras e números de qualquer alfabeto, espaço, ponto, hífen e sublinhado. Sem <, >, &, aspas
// ou marcas soltas: o nome aparece para todos e nunca deve virar HTML.
const NAME_CHARS = /^[\p{L}\p{N} ._-]+$/u;
const HAS_WORD = /[\p{L}\p{N}]/u;

/** Valida o nome vindo da rede ou do campo de texto; devolve a forma guardada ou null. */
export function parseRecordName(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 64) return null;
  const name = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  if ([...name].length > RECORD_NAME_MAX || !NAME_CHARS.test(name) || !HAS_WORD.test(name)) return null;
  return name;
}
