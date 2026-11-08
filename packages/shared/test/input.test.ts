import { describe, expect, it } from 'vitest';
import { BTN_ATTACK, BTN_JUMP, BTN_LEFT, BTN_RIGHT, HeldKeys } from '../src/index.ts';

/** Recorte do mapa padrão do cliente: duas teclas para andar à direita e duas para atirar. */
const KEYMAP = { KeyD: BTN_RIGHT, ArrowRight: BTN_RIGHT, KeyA: BTN_LEFT, KeyX: BTN_ATTACK, KeyJ: BTN_ATTACK, Space: BTN_JUMP };
/** O modo ASD não usa as setas nem o X. */
const ASD = { KeyA: BTN_LEFT, KeyD: BTN_RIGHT, Space: BTN_JUMP, KeyJ: BTN_JUMP, KeyK: BTN_ATTACK };

describe('HeldKeys (achado 11 da auditoria de 2026-11-06)', () => {
  it('soltar D com a seta para a direita ainda apertada não para o boneco', () => {
    const keys = new HeldKeys();
    keys.press('KeyD');
    keys.press('ArrowRight');
    keys.release('KeyD');
    expect(keys.buttons(KEYMAP)).toBe(BTN_RIGHT);
    keys.release('ArrowRight');
    expect(keys.buttons(KEYMAP)).toBe(0);
  });

  it('soltar X com o J ainda apertado não interrompe a carga do tiro', () => {
    const keys = new HeldKeys();
    keys.press('KeyX');
    keys.press('KeyJ');
    keys.release('KeyX');
    expect(keys.buttons(KEYMAP) & BTN_ATTACK).toBe(BTN_ATTACK);
    keys.release('KeyJ');
    expect(keys.buttons(KEYMAP) & BTN_ATTACK).toBe(0);
  });

  it('controle: tecla única, soltar outra ação, repetição de keydown, limpeza e o mapa do modo', () => {
    const keys = new HeldKeys();
    keys.press('KeyD');
    expect(keys.buttons(KEYMAP)).toBe(BTN_RIGHT);
    keys.press('KeyD'); // repetição automática do teclado
    keys.press('Space');
    keys.release('Space');
    expect(keys.buttons(KEYMAP)).toBe(BTN_RIGHT);
    keys.release('KeyD');
    expect(keys.buttons(KEYMAP)).toBe(0);
    keys.press('ArrowRight');
    keys.press('KeyA');
    expect(keys.buttons(KEYMAP)).toBe(BTN_RIGHT | BTN_LEFT);
    // Tecla fora do modo não conta.
    expect(keys.buttons(ASD)).toBe(BTN_LEFT);
    keys.clear();
    expect(keys.buttons(KEYMAP)).toBe(0);
  });
});
