import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { matchMaker, ServerError } from '@colyseus/core';
import { TOO_MANY_JOINS } from '@riscote/shared';

/**
 * Cabeçalho interno com o endereço de quem fez a requisição. É sempre sobrescrito pelo
 * servidor: o Colyseus confia em X-Forwarded-For/X-Real-IP vindos do cliente, que são forjáveis.
 */
export const PEER_HEADER = 'x-riscote-peer';

/** Janela fixa por chave. Chaves vencidas são descartadas para o mapa não crescer sem limite. */
export class AttemptLimiter {
  private hits = new Map<string, { start: number; count: number }>();
  readonly max: number;
  readonly windowMs: number;
  private readonly now: () => number;

  constructor(max: number, windowMs: number, now: () => number = Date.now) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
  }

  allow(key: string): boolean {
    const t = this.now();
    let hit = this.hits.get(key);
    if (!hit || t - hit.start >= this.windowMs) {
      hit = { start: t, count: 0 };
      this.hits.set(key, hit);
    }
    hit.count++;
    if (this.hits.size > 10_000) {
      for (const [k, h] of this.hits) if (t - h.start >= this.windowMs) this.hits.delete(k);
    }
    return hit.count <= this.max;
  }
}

/**
 * Marca cada requisição HTTP com o endereço real do socket ou, atrás de um proxy confiável
 * (ex.: `cf-connecting-ip` na Cloudflare), com o cabeçalho que esse proxy garante.
 * Intercepta o próprio `emit('request')`: o Colyseus registra o roteador com
 * `prependListener` no `listen()`, então um listener nosso rodaria tarde demais.
 */
export function markPeerAddress(server: HttpServer, trustedHeader?: string): void {
  const emit = server.emit as (this: HttpServer, event: string | symbol, ...args: unknown[]) => boolean;
  server.emit = function (this: HttpServer, event: string | symbol, ...args: unknown[]): boolean {
    if (event === 'request') {
      const req = args[0] as IncomingMessage;
      const raw = trustedHeader ? req.headers[trustedHeader.toLowerCase()] : undefined;
      const fromProxy = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim();
      req.headers[PEER_HEADER] = fromProxy || req.socket.remoteAddress || 'desconhecido';
    }
    return emit.call(this, event, ...args);
  } as typeof server.emit;
}

const LIMITED_METHODS = new Set(['create', 'join', 'joinById', 'joinOrCreate']);

/**
 * Limita as tentativas de criar ou entrar em sala por endereço (contra força bruta de código
 * e abuso de criação de salas). Acima do limite, responde HTTP 429 antes de procurar a sala.
 * Devolve a função que desfaz a instalação.
 */
export function limitJoins(limiter: AttemptLimiter): () => void {
  const controller = matchMaker.controller;
  const original = controller.invokeMethod;
  controller.invokeMethod = async function (method, roomName, clientOptions, auth) {
    if (LIMITED_METHODS.has(method)) {
      const key = auth?.headers.get(PEER_HEADER) ?? 'desconhecido';
      if (!limiter.allow(key)) throw new ServerError(429, TOO_MANY_JOINS);
    }
    return original.call(this, method, roomName, clientOptions, auth);
  };
  return () => {
    controller.invokeMethod = original;
  };
}
