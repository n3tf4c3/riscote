import './toque.css';
import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT } from '@riscote/shared';
import { touchArt } from './art/toque';
import { el } from './dom';

/** Fração do raio do direcional a partir da qual a alavanca anda para o lado. */
const SIDE_DEAD = 0.3;
/** Para baixo só conta quando a alavanca desce além disso e mais do que vai para o lado. */
const DOWN_DEAD = 0.5;
/** Duração mínima de um toque nos botões, em ms (3 ticks): o aperto mais curto ainda chega à simulação. */
const MIN_TAP_MS = 50;

/**
 * Direcional e botões na tela para quem joga por toque. Cada dedo é um ponteiro próprio, então andar,
 * pular e atirar juntos funcionam; segurar Pular pula mais alto, como segurar a tecla. O resultado é a
 * mesma máscara de bits do teclado.
 */
export class TouchPad {
  private stickBits = 0;
  private stickId: number | null = null;
  /** Botões apertados, por ponteiro. */
  private held = new Map<number, number>();
  /** Até quando cada botão conta como apertado depois do toque: um toque rápido não se perde entre ticks. */
  private tapUntil = new Map<number, number>();
  private readonly stick = el('toque-direcional');
  private readonly knob = el('toque-alavanca');

  constructor() {
    // Os desenhos de pincel entram como fundo pelo CSS.
    const art = touchArt();
    const bg = (svg: string) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
    const root = el('toque').style;
    root.setProperty('--toque-base', bg(art.base));
    root.setProperty('--toque-alavanca', bg(art.knob));
    root.setProperty('--toque-pular', bg(art.jump));
    root.setProperty('--toque-pular-apertado', bg(art.jumpDown));
    root.setProperty('--toque-atirar', bg(art.shoot));
    root.setProperty('--toque-atirar-apertado', bg(art.shootDown));

    this.setVisible(window.matchMedia('(pointer: coarse)').matches);
    // Um toque em qualquer lugar mostra os controles (ex.: notebook com tela de toque).
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.setVisible(true);
    }, true);

    this.stick.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      e.preventDefault();
      this.stickId = e.pointerId;
      this.stick.setPointerCapture(e.pointerId);
      this.moveStick(e);
    });
    this.stick.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) this.moveStick(e);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      this.stick.addEventListener(type, (e) => {
        if (e.pointerId === this.stickId) this.releaseStick();
      });
    }

    for (const button of document.querySelectorAll<HTMLElement>('.toque-botao')) {
      const bit = button.dataset.botao === 'pular' ? BTN_JUMP : BTN_ATTACK;
      const show = () => button.classList.toggle('apertado', [...this.held.values()].includes(bit));
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.held.set(e.pointerId, bit);
        this.tapUntil.set(bit, performance.now() + MIN_TAP_MS);
        show();
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        button.addEventListener(type, (e) => {
          this.held.delete(e.pointerId);
          show();
        });
      }
    }
    // Segurar o dedo não abre menu nem seleciona texto.
    el('toque').addEventListener('contextmenu', (e) => e.preventDefault());
    const reset = () => {
      this.releaseStick();
      this.held.clear();
      this.tapUntil.clear();
      document.querySelectorAll('.toque-botao').forEach((b) => b.classList.remove('apertado'));
    };
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) reset();
    });
  }

  /** Mostra ou esconde os controles na partida (a capa nunca os mostra). */
  setVisible(on: boolean): void {
    document.body.classList.toggle('toque', on);
  }

  get visible(): boolean {
    return document.body.classList.contains('toque');
  }

  buttons(): number {
    let bits = this.stickBits;
    for (const bit of this.held.values()) bits |= bit;
    const now = performance.now();
    for (const [bit, until] of this.tapUntil) {
      if (now < until) bits |= bit;
      else this.tapUntil.delete(bit);
    }
    return bits;
  }

  private moveStick(e: PointerEvent): void {
    const rect = this.stick.getBoundingClientRect();
    // Até onde a alavanca anda, em pixels: ela não sai do círculo.
    const reach = rect.width * 0.32;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > reach) {
      dx *= reach / len;
      dy *= reach / len;
    }
    const nx = dx / reach;
    const ny = dy / reach;
    let bits = 0;
    if (nx < -SIDE_DEAD) bits |= BTN_LEFT;
    if (nx > SIDE_DEAD) bits |= BTN_RIGHT;
    if (ny > DOWN_DEAD && ny > Math.abs(nx)) bits |= BTN_DOWN;
    this.stickBits = bits;
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private releaseStick(): void {
    this.stickId = null;
    this.stickBits = 0;
    this.knob.style.transform = '';
  }
}
