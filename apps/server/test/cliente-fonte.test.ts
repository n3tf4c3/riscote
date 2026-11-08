import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Invariantes do cliente lidos da fonte. O cliente (Vite + DOM) não tem runner de testes; a lógica fica
 * em @riscote/shared, testada lá, e estes testes cobram que o cliente a usa em todos os caminhos.
 * Ficam neste pacote porque ele tem os tipos do Node.
 */
const source = (file: string) => readFileSync(new URL(`../../client/src/${file}`, import.meta.url), 'utf8');

describe('cliente: sala provisória (achado 10 da auditoria de 2026-11-06)', () => {
  it('toda entrada que conecta passa por adoptRoom antes de esperar o estado inicial', () => {
    const online = source('online.ts');
    // Nenhuma sala conectada fica numa variável solta antes de a sessão assumir.
    expect(online).not.toMatch(/=\s*await\s+(joining|sdk\.)/);
    const adopts = online.match(/await adoptRoom\(/g) ?? [];
    const waits = online.match(/await firstState\(/g) ?? [];
    // A entrada principal (criar, código, convite, reconexão) e o jogador a mais.
    expect(adopts.length).toBeGreaterThanOrEqual(2);
    expect(waits.length).toBe(adopts.length);
  });
});

describe('cliente: teclas com o mesmo botão (achado 11 da auditoria de 2026-11-06)', () => {
  it('o teclado guarda as teclas seguradas em HeldKeys, e o keyup nunca apaga o bit da ação inteira', () => {
    const input = source('input.ts');
    expect(input).toMatch(/new HeldKeys\(\)/);
    expect(input).toMatch(/keyup[^\n]*\.release\(e\.code\)/);
    expect(input).toMatch(/blur[\s\S]{0,60}\.clear\(\)/);
    // A máscara do teclado não é mais um número alterado bit a bit pelos eventos.
    expect(input).not.toMatch(/this\.keys\s*(\|=|&=)/);
  });
});
