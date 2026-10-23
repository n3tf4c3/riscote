import { DIFFICULTIES, MAX_PLAYERS, type Difficulty } from './protocol.ts';

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
  /**
   * O placar desta mensagem está gravado no servidor. Falso: ficou só na memória e pode se perder
   * num reinício. Servidor antigo não manda o campo.
   */
  saved?: boolean;
}

/** Caminho HTTP do servidor com o placar de todas as dificuldades (`RecordsBoard`), para a capa. */
export const RECORDS_PATH = '/recordes';

/** Os melhores de cada dificuldade, do maior para o menor. */
export type RecordsBoard = Record<Difficulty, RecordEntry[]>;

const REASONS: readonly unknown[] = ['capitulo', 'sem-vidas', 'desistencia'] satisfies RunEndReason[];

/** Confere uma linha do placar vinda do disco ou da rede; devolve null se estiver fora do formato. */
export function parseRecordEntry(raw: unknown): RecordEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { id, score, names, reason, arena, date } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[0-9a-f]{1,32}$/.test(id)) return null;
  if (typeof score !== 'number' || !Number.isSafeInteger(score) || score <= 0) return null;
  if (!Array.isArray(names) || names.length === 0 || names.length > MAX_PLAYERS) return null;
  const parsed = names.map(parseRecordName);
  if (parsed.some((n) => n === null)) return null;
  if (!REASONS.includes(reason)) return null;
  if (typeof arena !== 'string' || !/^[a-z0-9-]{1,32}$/.test(arena)) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { id, score, names: parsed as string[], reason: reason as RunEndReason, arena, date };
}

/** Valida o placar vindo do servidor; linhas fora do formato são descartadas. */
export function parseRecordsBoard(raw: unknown): RecordsBoard {
  const data = typeof raw === 'object' && raw !== null ? (raw as Partial<Record<Difficulty, unknown>>) : {};
  const board = {} as RecordsBoard;
  for (const d of DIFFICULTIES) {
    const list = data[d];
    board[d] = Array.isArray(list)
      ? list.slice(0, RECORDS_MAX).map(parseRecordEntry).filter((e): e is RecordEntry => e !== null)
      : [];
  }
  return board;
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
