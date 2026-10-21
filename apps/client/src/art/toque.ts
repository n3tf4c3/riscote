import { INK, PAPER, stroke, svgDoc } from './svg';

// Controles de toque desenhados a pincel: o direcional, a alavanca e os botões Pular e Atirar.
// Saem como SVG em texto e entram como fundo pelo CSS (toque.css), como o pincel dos botões da capa.

const AZUL = '#2f6fd6';

/** Círculo de mão: miolo de papel translúcido, anel de pincel e um segundo traço falhado por dentro. */
function ring(c: number, r: number, color: string, fill: string, fillOpacity: number): string {
  return (
    `<circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" fill-opacity="${fillOpacity}" filter="url(#tinta)"/>` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="3.4" filter="url(#tinta)"/>` +
    `<circle cx="${c + 1.5}" cy="${c - 1}" r="${r - 4}" fill="none" stroke="${color}" stroke-width="1.4" ` +
    `stroke-dasharray="${(r * 1.7).toFixed(1)} ${(r * 0.8).toFixed(1)}" opacity="0.4" filter="url(#tinta)"/>`
  );
}

/** Ponta de seta de pincel em (x, y), virada `rot` graus (0 = para baixo). */
function arrow(x: number, y: number, rot: number, size: number, color: string, opacity = 1): string {
  const s = size;
  return (
    `<path d="M${-s} ${-s * 0.55} L0 ${s * 0.7} L${s} ${-s * 0.55} Q0 ${-s * 0.05} ${-s} ${-s * 0.55} Z" ` +
    `transform="translate(${x} ${y}) rotate(${rot})" fill="${color}" opacity="${opacity}" filter="url(#tinta)"/>`
  );
}

/** Base do direcional: setas só para os lados e para baixo, as direções que o jogo usa. */
function baseSvg(): string {
  return svgDoc(
    '0 0 140 140',
    ring(70, 63, INK, PAPER, 0.5) +
      stroke(36, 34, -62, 1.1, 0.75, INK, 'seco', 0.07) +
      arrow(20, 70, 90, 7, INK, 0.75) +
      arrow(120, 70, -90, 7, INK, 0.75) +
      arrow(70, 120, 0, 7, INK, 0.75),
  );
}

/** Alavanca: um pingo de nanquim com o brilho de papel no alto. */
function knobSvg(): string {
  return svgDoc(
    '0 0 64 64',
    `<circle cx="32" cy="32" r="26" fill="${INK}" filter="url(#tinta)"/>` +
      `<circle cx="32" cy="32" r="17" fill="none" stroke="${PAPER}" stroke-width="1.2" stroke-dasharray="14 9" opacity="0.25" filter="url(#tinta)"/>` +
      `<path d="M17 27 Q21 16 32 14" fill="none" stroke="${PAPER}" stroke-width="3.5" stroke-linecap="round" opacity="0.5" filter="url(#tinta)"/>`,
  );
}

/** Gota de tinta, o ícone de Atirar. */
function drop(color: string, shine: string): string {
  return (
    `<path d="M42 15 Q55 31 53 40 A11 11 0 0 1 31 40 Q29 31 42 15 Z" fill="${color}" filter="url(#tinta)"/>` +
    `<path d="M36 36 Q36 30 40 26" fill="none" stroke="${shine}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>`
  );
}

/** Seta dupla para cima, o ícone de Pular. */
function hop(color: string): string {
  return arrow(42, 24, 180, 10, color) + arrow(42, 38, 180, 7, color, 0.6);
}

/** Botão solto (papel e anel de cor) ou apertado (cheio de tinta, ícone em papel). */
function buttonSvg(kind: 'pular' | 'atirar', down: boolean): string {
  const color = kind === 'atirar' ? AZUL : INK;
  const icon = kind === 'atirar' ? drop(down ? PAPER : AZUL, down ? AZUL : PAPER) : hop(down ? PAPER : INK);
  return svgDoc('0 0 84 84', ring(42, 37, color, down ? color : PAPER, down ? 0.88 : 0.55) + icon);
}

export interface TouchArt {
  base: string;
  knob: string;
  jump: string;
  jumpDown: string;
  shoot: string;
  shootDown: string;
}

export function touchArt(): TouchArt {
  return {
    base: baseSvg(),
    knob: knobSvg(),
    jump: buttonSvg('pular', false),
    jumpDown: buttonSvg('pular', true),
    shoot: buttonSvg('atirar', false),
    shootDown: buttonSvg('atirar', true),
  };
}
