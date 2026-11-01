import type { BossPose } from './boss';
import { borraoGotaSvg, mataBorraoSvg, ondaSvg } from './boss';
import {
  borrachaSoakSvg,
  borrachaSvg,
  cuspeSvg,
  fiandeiraSoakSvg,
  fiandeiraSvg,
  grampoSoakSvg,
  grampoSvg,
  saltadorSoakSvg,
  saltadorSvg,
  tinteiroSoakSvg,
  tinteiroSvg,
  tracaSoakSvg,
  tracaSvg,
} from './enemies';

// Pele: a roupa dos inimigos e do chefe de cada capítulo (decisão do usuário em 2026-11-01).
// As regras são as mesmas em todos os capítulos; muda só o desenho. Cada pele desenha os seis
// tipos no mesmo quadro (viewBox), com o mesmo ponto de apoio e o mesmo tamanho dos originais em
// `enemies.ts`, para a caixa de colisão continuar batendo com o desenho. A bola, o borrão, a mancha,
// a gota e os respingos são do caderno e iguais em todos os capítulos.

/** Os seis inimigos de um capítulo, cada um com as mesmas poses dos originais. */
export interface Pele {
  /** Prefixo das texturas (o caderno usa as chaves sem prefixo). */
  id: string;
  /** Anda; `frame` de 0 a 2. `alert`: aviso do bote. */
  traca(frame: number, variant: number, alert: boolean): string;
  tracaTinta(variant: number): string;
  /** Parado ou no ar; `charge`: aviso da pancada. */
  saltador(air: boolean, variant: number, charge: boolean): string;
  saltadorTinta(variant: number): string;
  /** Corre; `frame` de 0 a 2. */
  grampo(frame: number, variant: number): string;
  grampoTinta(variant: number): string;
  /** Pendurada no fio ou andando; `frame` 0 ou 1. */
  fiandeira(frame: number, variant: number): string;
  fiandeiraTinta(variant: number): string;
  /** Anda; `frame` 0 ou 1. `charge`: aviso do cuspe. */
  tinteiro(frame: number, variant: number, charge: boolean): string;
  tinteiroTinta(variant: number): string;
  /** A frente (que apaga a tinta) olha para a direita. */
  borracha(variant: number): string;
  borrachaTinta(variant: number): string;
  /** O que o tinteiro cospe, correndo para a direita. */
  cuspe(variant: number): string;
}

/** O chefe de um capítulo: as poses e os desenhos dos perigos. */
export interface PeleChefe {
  id: string;
  /** Nome no letreiro ("O Mata-Borrão foi derrotado!"). */
  nome: string;
  /** Título grande da entrada e da barra de vida. */
  titulo: string;
  /** Frase embaixo do título. */
  frase: string;
  /** Cor do respingo quando o que cai na chuva bate no chão. */
  respingo: number;
  chefe(pose: BossPose, variant: number): string;
  /** Onda rente ao chão, correndo para a direita. */
  onda(variant: number): string;
  /** O que cai na chuva. */
  chuva(variant: number): string;
  /** O golpe próprio do chefe (sem ele, o chefe só tem os golpes do Mata-Borrão). */
  golpe?(variant: number): string;
}

export const PELE_CADERNO: Pele = {
  id: 'caderno',
  traca: tracaSvg,
  tracaTinta: tracaSoakSvg,
  saltador: saltadorSvg,
  saltadorTinta: saltadorSoakSvg,
  grampo: grampoSvg,
  grampoTinta: grampoSoakSvg,
  fiandeira: fiandeiraSvg,
  fiandeiraTinta: fiandeiraSoakSvg,
  tinteiro: tinteiroSvg,
  tinteiroTinta: tinteiroSoakSvg,
  borracha: borrachaSvg,
  borrachaTinta: borrachaSoakSvg,
  cuspe: cuspeSvg,
};

export const CHEFE_MATA_BORRAO: PeleChefe = {
  id: 'caderno',
  nome: 'O Mata-Borrão',
  titulo: 'MATA-BORRÃO',
  frase: 'ele quer secar a página!',
  respingo: 0x1f2433,
  chefe: mataBorraoSvg,
  onda: ondaSvg,
  chuva: borraoGotaSvg,
};
