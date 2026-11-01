import { CHAPTERS, CHAPTER_BOSSES } from '@riscote/shared';
import { CHEFE_APONTADOR } from './chefe-apontador';
import { CHEFE_CALHAMACO } from './chefe-calhamaco';
import { CHEFE_REGADOR } from './chefe-regador';
import { CHEFE_LAPISEIRA } from './chefe-lapiseira';
import { CHEFE_DRAGAO } from './chefe-dragao';
import { CHEFE_MATA_BORRAO, PELE_CADERNO, type Pele, type PeleChefe } from './pele';
import { PELE_BIBLIOTECA } from './pele-biblioteca';
import { PELE_FLORESTA } from './pele-floresta';
import { PELE_JARDIM } from './pele-jardim';
import { PELE_OFICINA } from './pele-oficina';
import { PELE_CASTELO } from './pele-castelo';
import { poderesBibliotecaSpecs, poderesCasteloSpecs, poderesFlorestaSpecs, poderesJardimSpecs, poderesOficinaSpecs, type ArtSpec } from './textures';

// O visual de cada capítulo (decisões do usuário em 2026-11-01): o tema do cenário, a pele dos
// inimigos e o chefe. Mesma ordem de `CHAPTERS`. As regras não mudam; só o desenho.

export interface VisualCapitulo {
  /** Tema do cenário em todas as páginas (sem tema, cada página usa o dela: o caderno). */
  tema?: string;
  pele: Pele;
  chefe: PeleChefe;
  /** Desenhos dos poderes das criaturas próprias do capítulo. */
  poderes?: () => ArtSpec[];
}

const CAPITULOS: readonly VisualCapitulo[] = [
  { pele: PELE_CADERNO, chefe: CHEFE_MATA_BORRAO },
  { tema: 'floresta', pele: PELE_FLORESTA, chefe: CHEFE_APONTADOR, poderes: poderesFlorestaSpecs },
  { tema: 'biblioteca', pele: PELE_BIBLIOTECA, chefe: CHEFE_CALHAMACO, poderes: poderesBibliotecaSpecs },
  { tema: 'jardim', pele: PELE_JARDIM, chefe: CHEFE_REGADOR, poderes: poderesJardimSpecs },
  { tema: 'oficina', pele: PELE_OFICINA, chefe: CHEFE_LAPISEIRA, poderes: poderesOficinaSpecs },
  { tema: 'castelo', pele: PELE_CASTELO, chefe: CHEFE_DRAGAO, poderes: poderesCasteloSpecs },
];

/** Capítulo de uma página (fases e página do chefe); página desconhecida, o primeiro. */
export function capituloDe(arenaId: string): number {
  const i = CHAPTERS.findIndex((c, k) => c.some((a) => a.id === arenaId) || CHAPTER_BOSSES[k]?.id === arenaId);
  return Math.max(0, i);
}

export function visualDe(arenaId: string): VisualCapitulo {
  return CAPITULOS[capituloDe(arenaId)] ?? CAPITULOS[0]!;
}
