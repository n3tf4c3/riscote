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
