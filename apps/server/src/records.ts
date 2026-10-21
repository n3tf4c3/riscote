import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIFFICULTIES,
  MAX_PLAYERS,
  RECORDS_MAX,
  parseRecordName,
  type Difficulty,
  type RecordEntry,
  type RunEndReason,
} from '@riscote/shared';

export const RECORDS_FILE = 'recordes.json';

type Ranking = Record<Difficulty, RecordEntry[]>;

const REASONS: readonly unknown[] = ['capitulo', 'sem-vidas'] satisfies RunEndReason[];

function emptyRanking(): Ranking {
  return { facil: [], medio: [], dificil: [] };
}

/** Maior pontuação primeiro; no empate, quem chegou antes fica na frente (sort estável). */
function rank(entries: RecordEntry[]): RecordEntry[] {
  return entries.sort((a, b) => b.score - a.score).slice(0, RECORDS_MAX);
}

/** Confere uma linha lida do disco: o arquivo pode ter sido editado à mão ou estar truncado. */
function parseEntry(raw: unknown): RecordEntry | null {
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

/**
 * Placar de recordes: os RECORDS_MAX melhores de cada dificuldade, de todas as salas do servidor.
 * Grava num arquivo JSON (troca atômica por rename) a cada mudança; sem pasta, fica só na memória.
 */
export class RecordBook {
  private ranking: Ranking = emptyRanking();
  private readonly file: string | null;

  constructor(dir: string | null) {
    if (!dir) {
      this.file = null;
      return;
    }
    this.file = join(dir, RECORDS_FILE);
    mkdirSync(dir, { recursive: true });
    let text: string;
    try {
      text = readFileSync(this.file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }
    try {
      const data = JSON.parse(text) as { ranking?: Partial<Record<Difficulty, unknown>> };
      for (const d of DIFFICULTIES) {
        const list = data.ranking?.[d];
        if (!Array.isArray(list)) continue;
        this.ranking[d] = rank(list.map(parseEntry).filter((e): e is RecordEntry => e !== null));
      }
    } catch {
      // Arquivo ilegível: guarda a cópia para inspeção e recomeça vazio, sem apagar nada.
      const kept = `${this.file}.ilegivel-${Date.now()}`;
      renameSync(this.file, kept);
      console.error(JSON.stringify({ recordes: 'arquivo ilegível', guardado: kept }));
    }
  }

  list(difficulty: Difficulty): RecordEntry[] {
    return this.ranking[difficulty].map((e) => ({ ...e, names: [...e.names] }));
  }

  /** Põe a partida no placar; devolve o id da linha, ou null se não ficou entre os melhores. */
  add(difficulty: Difficulty, run: { score: number; names: string[]; reason: RunEndReason; arena: string }, now = new Date()): string | null {
    const list = this.ranking[difficulty];
    if (!Number.isSafeInteger(run.score) || run.score <= 0) return null;
    if (list.length >= RECORDS_MAX && run.score <= list[list.length - 1]!.score) return null;
    const entry: RecordEntry = {
      id: randomBytes(6).toString('hex'),
      score: run.score,
      names: run.names.slice(0, MAX_PLAYERS),
      reason: run.reason,
      arena: run.arena,
      date: now.toISOString().slice(0, 10),
    };
    list.push(entry);
    this.ranking[difficulty] = rank(list);
    this.save();
    return entry.id;
  }

  /** Troca o nome provisório de um jogador da linha. O nome já chega validado por parseRecordName. */
  rename(difficulty: Difficulty, id: string, index: number, name: string): boolean {
    const entry = this.ranking[difficulty].find((e) => e.id === id);
    if (!entry || index < 0 || index >= entry.names.length) return false;
    entry.names[index] = name;
    this.save();
    return true;
  }

  private save(): void {
    if (!this.file) return;
    const tmp = `${this.file}.tmp`;
    try {
      writeFileSync(tmp, `${JSON.stringify({ version: 1, ranking: this.ranking }, null, 2)}\n`);
      renameSync(tmp, this.file);
    } catch (err) {
      // Disco cheio ou sem permissão: o placar continua na memória; a sala não cai por isso.
      console.error(JSON.stringify({ recordes: 'não gravou', erro: String(err) }));
    }
  }
}
