// Comando do jogador como máscara de bits: é tudo o que o cliente poderá enviar ao servidor.
export const BTN_LEFT = 1 << 0;
export const BTN_RIGHT = 1 << 1;
export const BTN_UP = 1 << 2;
export const BTN_DOWN = 1 << 3;
export const BTN_JUMP = 1 << 4;
export const BTN_ATTACK = 1 << 5;

export const BTN_ALL = BTN_LEFT | BTN_RIGHT | BTN_UP | BTN_DOWN | BTN_JUMP | BTN_ATTACK;
