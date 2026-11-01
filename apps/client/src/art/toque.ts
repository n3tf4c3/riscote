import { INK, PALETTE, WHITE, shine, svgDoc } from './svg';

// Controles de toque em cartum: o direcional, a alavanca e os botões Pular e Atirar.
// Saem como SVG em texto e entram como fundo pelo CSS (toque.css), que põe a sombra dura deslocada.

const AZUL = PALETTE.azul;
const AMARELO = PALETTE.amarelo;

/** Círculo com contorno marinho grosso e miolo translúcido (a arena aparece por baixo). */
function ring(c: number, r: number, fill: string, fillOpacity: number, ringColor = INK, w = 5): string {
  return (
    `<circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${ringColor}" stroke-width="${w}"/>`
  );
}

/** Seta chapada de pontas arredondadas em (x, y), virada `rot` graus (0 = para baixo). */
function arrow(x: number, y: number, rot: number, size: number, color: string, opacity = 1): string {
  const s = size;
  return (
    `<path d="M${-s} ${-s * 0.5} L0 ${s * 0.7} L${s} ${-s * 0.5} Z" transform="translate(${x} ${y}) rotate(${rot})" ` +
    `fill="${color}" stroke="${color}" stroke-width="${(s * 0.5).toFixed(1)}" stroke-linejoin="round" opacity="${opacity}"/>`
  );
}

/** Base do direcional: setas só para os lados e para baixo, as direções que o jogo usa. */
function baseSvg(): string {
  return svgDoc(
    '0 0 140 140',
    ring(70, 64, WHITE, 0.55) +
      `<circle cx="70" cy="70" r="40" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="6 8" stroke-linecap="round" opacity="0.3"/>` +
      arrow(20, 70, 90, 8, INK, 0.85) +
      arrow(120, 70, -90, 8, INK, 0.85) +
      arrow(70, 120, 0, 8, INK, 0.85),
  );
}

/** Alavanca: bolota marinho com brilho branco no alto. */
function knobSvg(): string {
  return svgDoc(
    '0 0 64 64',
    `<circle cx="32" cy="32" r="26" fill="${INK}" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="32" cy="32" r="16" fill="none" stroke="#3a4258" stroke-width="3"/>` +
      shine('M17 27 Q20 17 30 14', 4.5, 0.75),
  );
}

/** Gota de tinta, o ícone de Atirar. */
function drop(color: string, outline: string): string {
  return (
    `<path d="M42 17 Q55 32 53 41 A11 11 0 0 1 31 41 Q29 32 42 17 Z" fill="${color}" stroke="${outline}" stroke-width="3.5" stroke-linejoin="round"/>` +
    shine('M36 38 Q36 32 40 28', 2.8, 0.75)
  );
}

/** Seta dupla para cima, o ícone de Pular. */
function hop(color: string): string {
  return arrow(42, 26, 180, 10, color) + arrow(42, 41, 180, 7, color, 0.6);
}

/** Botão solto (miolo translúcido, anel e ícone na cor dele) ou apertado (cheio da cor). */
function buttonSvg(kind: 'pular' | 'atirar', down: boolean): string {
  const color = kind === 'atirar' ? AZUL : AMARELO;
  const icon = kind === 'atirar' ? `<g transform="translate(42 30) scale(0.8) translate(-42 -30)">${drop(down ? WHITE : AZUL, INK)}</g>` : hop(INK);
  const body = down ? ring(42, 37, color, 1) : ring(42, 37, WHITE, 0.6) + `<circle cx="42" cy="42" r="31" fill="none" stroke="${color}" stroke-width="7"/>`;
  return svgDoc('0 0 84 84', body + icon + (down ? '' : shine('M18 34 Q20 22 30 16', 3.5, 0.8)));
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
