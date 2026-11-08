// Comando do jogador como máscara de bits: é tudo o que o cliente poderá enviar ao servidor.
export const BTN_LEFT = 1 << 0;
export const BTN_RIGHT = 1 << 1;
export const BTN_UP = 1 << 2;
export const BTN_DOWN = 1 << 3;
export const BTN_JUMP = 1 << 4;
export const BTN_ATTACK = 1 << 5;

export const BTN_ALL = BTN_LEFT | BTN_RIGHT | BTN_UP | BTN_DOWN | BTN_JUMP | BTN_ATTACK;

/**
 * Teclas seguradas e a máscara delas. Várias teclas dão o mesmo botão (setas e WASD, X e J): soltar uma
 * não solta o botão enquanto outra equivalente continua apertada (auditoria de 2026-11-06, achado 11).
 */
export class HeldKeys {
  private readonly held = new Set<string>();

  press(code: string): void {
    this.held.add(code);
  }

  release(code: string): void {
    this.held.delete(code);
  }

  /** Perda de foco ou troca de modo: nenhuma tecla teria mais o keyup correspondente. */
  clear(): void {
    this.held.clear();
  }

  /** A máscara das teclas seguradas no mapa de teclas dado. */
  buttons(keymap: Readonly<Record<string, number>>): number {
    let bits = 0;
    for (const code of this.held) bits |= keymap[code] ?? 0;
    return bits;
  }
}
