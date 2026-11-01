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
    // Pedido do usuário em 2026-10-23: a seta para cima também pula (o jogo não usa o BTN_UP).
    ArrowUp: BTN_JUMP,
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

/**
 * Teclado, gamepad e toque viram a mesma máscara de bits que a simulação recebe. Com mais jogadores na
 * mesma tela (pedido do usuário em 2026-11-01), cada um a mais fica com um controle só dele
 * (`claimed`), que deixa de entrar nos botões do primeiro; o teclado e o toque ficam com o primeiro.
 */
export class InputSource {
  private keys = 0;
  /** Controles que são de outro jogador nesta tela. */
  private readonly claimed = new Set<number>();
  /** Esperando um controle para o próximo jogador: quem apertar um botão primeiro fica com ele. */
  private claim: ((pad: number) => void) | null = null;
  /** Botões apertados no quadro anterior, por controle: só conta o aperto novo. */
  private readonly padWasDown = new Map<number, boolean>();
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
    this.pollClaim();
    let pads = 0;
    for (const pad of connectedPads()) if (!this.claimed.has(pad.index)) pads |= padBits(pad);
    return this.keys | pads | this.touch.buttons();
  }

  /** Botões do controle de um jogador a mais. */
  padButtons(index: number): number {
    const pad = connectedPads().find((p) => p.index === index);
    return pad ? padBits(pad) : 0;
  }

  /** Está esperando um controle para um jogador novo. */
  get claiming(): boolean {
    return this.claim !== null;
  }

  /** O próximo controle livre que apertar um botão (aperto novo, não um segurado) fica para `take`. */
  armClaim(take: (pad: number) => void): void {
    this.claim = take;
    for (const pad of connectedPads()) this.padWasDown.set(pad.index, anyFace(pad));
  }

  cancelClaim(): void {
    this.claim = null;
  }

  /** O controle volta a ser do primeiro jogador (o jogador a mais saiu). */
  release(index: number): void {
    this.claimed.delete(index);
  }

  private pollClaim(): void {
    for (const pad of connectedPads()) {
      const down = anyFace(pad);
      const was = this.padWasDown.get(pad.index) ?? false;
      this.padWasDown.set(pad.index, down);
      if (!this.claim || this.claimed.has(pad.index) || !down || was) continue;
      this.claimed.add(pad.index);
      const take = this.claim;
      this.claim = null;
      take(pad.index);
    }
  }
}

function connectedPads(): Gamepad[] {
  return [...(navigator.getGamepads?.() ?? [])].filter((p): p is Gamepad => !!p?.connected);
}

/** Algum dos quatro botões da frente ou o Start apertado. */
function anyFace(pad: Gamepad): boolean {
  return [0, 1, 2, 3, 9].some((i) => pad.buttons[i]?.pressed ?? false);
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

/** Botões de um controle: direcional ou analógico esquerdo, A pula, X atira. */
function padBits(pad: Gamepad): number {
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
