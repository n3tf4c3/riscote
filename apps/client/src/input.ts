import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_UP } from '@riscote/shared';

const KEYMAP: Record<string, number> = {
  ArrowLeft: BTN_LEFT,
  KeyA: BTN_LEFT,
  ArrowRight: BTN_RIGHT,
  KeyD: BTN_RIGHT,
  ArrowUp: BTN_UP,
  KeyW: BTN_UP,
  ArrowDown: BTN_DOWN,
  KeyS: BTN_DOWN,
  Space: BTN_JUMP,
  KeyZ: BTN_JUMP,
  KeyK: BTN_JUMP,
  KeyX: BTN_ATTACK,
  KeyJ: BTN_ATTACK,
};

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement && target.type !== 'range';
}

/** Teclado e gamepad viram a mesma máscara de bits que a simulação recebe. */
export class InputSource {
  private keys = 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      const bit = KEYMAP[e.code];
      if (bit === undefined || isTextField(e.target)) return;
      e.preventDefault();
      // Um controle deslizante focado não deve roubar as setas do jogo.
      if (e.target instanceof HTMLInputElement) e.target.blur();
      this.keys |= bit;
    });
    window.addEventListener('keyup', (e) => {
      const bit = KEYMAP[e.code];
      if (bit !== undefined) this.keys &= ~bit;
    });
    window.addEventListener('blur', () => {
      this.keys = 0;
    });
  }

  buttons(): number {
    return this.keys | readGamepad();
  }
}

function readGamepad(): number {
  const pads = navigator.getGamepads?.() ?? [];
  for (const pad of pads) {
    if (!pad?.connected) continue;
    const b = (i: number) => pad.buttons[i]?.pressed ?? false;
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    let bits = 0;
    if (ax < -0.4 || b(14)) bits |= BTN_LEFT;
    if (ax > 0.4 || b(15)) bits |= BTN_RIGHT;
    if (ay < -0.6 || b(12)) bits |= BTN_UP;
    if (ay > 0.5 || b(13)) bits |= BTN_DOWN;
    if (b(0)) bits |= BTN_JUMP;
    if (b(2)) bits |= BTN_ATTACK;
    return bits;
  }
  return 0;
}
