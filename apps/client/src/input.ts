import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_UP } from '@riscote/shared';
import { el } from './dom';
import { TouchPad } from './toque';

/** Modos de teclas do painel: o padrão junta setas, WASD e os botões; o ASD deixa a mão direita no J/K. */
export const KEY_MODES = ['padrao', 'asd'] as const;
export type KeyMode = (typeof KEY_MODES)[number];

const KEYMAPS: Record<KeyMode, Record<string, number>> = {
  padrao: {
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
  },
  // Decisão do usuário em 2026-10-21: J pula e K atira (o inverso do padrão); setas, Z e X ficam de fora.
  asd: {
    KeyA: BTN_LEFT,
    KeyD: BTN_RIGHT,
    KeyW: BTN_UP,
    KeyS: BTN_DOWN,
    KeyJ: BTN_JUMP,
    Space: BTN_JUMP,
    KeyK: BTN_ATTACK,
  },
};

const KEY_MODE_KEY = 'riscote.teclas.v1';

function loadKeyMode(): KeyMode {
  try {
    const saved = localStorage.getItem(KEY_MODE_KEY);
    return KEY_MODES.find((m) => m === saved) ?? 'padrao';
  } catch {
    return 'padrao';
  }
}

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement && target.type !== 'range';
}

/** Teclado, gamepad e toque viram a mesma máscara de bits que a simulação recebe. */
export class InputSource {
  private keys = 0;
  private keyMode = loadKeyMode();
  private readonly touch = new TouchPad();

  constructor() {
    document.body.dataset.teclas = this.keyMode;
    window.addEventListener('keydown', (e) => {
      const bit = KEYMAPS[this.keyMode][e.code];
      if (bit === undefined || isTextField(e.target)) return;
      e.preventDefault();
      // Um controle deslizante focado não deve roubar as setas do jogo.
      if (e.target instanceof HTMLInputElement) e.target.blur();
      // Quem passou a jogar no teclado não precisa dos controles de toque por cima da arena.
      this.touch.setVisible(false);
      this.keys |= bit;
    });
    window.addEventListener('keyup', (e) => {
      const bit = KEYMAPS[this.keyMode][e.code];
      if (bit !== undefined) this.keys &= ~bit;
    });
    window.addEventListener('blur', () => {
      this.keys = 0;
    });
  }

  get mode(): KeyMode {
    return this.keyMode;
  }

  /** Troca o modo de teclas e guarda a escolha neste navegador. */
  setKeyMode(mode: KeyMode): void {
    this.keyMode = mode;
    // Uma tecla segurada na troca não teria mais o keyup correspondente.
    this.keys = 0;
    document.body.dataset.teclas = mode;
    try {
      localStorage.setItem(KEY_MODE_KEY, mode);
    } catch {
      // Sem armazenamento: vale só nesta página.
    }
  }

  /** Os controles de toque estão na tela. */
  get touchVisible(): boolean {
    return this.touch.visible;
  }

  /** Como atirar, para as dicas na tela: o botão de toque ou as teclas do modo escolhido. */
  attackName(): string {
    if (this.touch.visible) return 'botão Atirar';
    return this.keyMode === 'asd' ? 'K' : 'X ou J';
  }

  buttons(): number {
    return this.keys | readGamepad() | this.touch.buttons();
  }
}

/** Botões do painel que escolhem o modo de teclas. */
export function bindKeyControls(input: InputSource): void {
  const group = el('teclas-modos');
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('button[data-modo]')];
  const show = () => {
    for (const b of buttons) {
      const on = b.dataset.modo === input.mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };
  show();
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const mode = KEY_MODES.find((m) => m === b.dataset.modo);
      if (mode) input.setKeyMode(mode);
      show();
      // Devolve o teclado ao jogo.
      b.blur();
    });
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
