import type * as Phaser from 'phaser';

// Ambiente dos cenários com profundidade (2026-11-01): folhas caindo na Floresta, poeira dourada na
// Biblioteca, vaga-lumes e pétalas no Jardim, faíscas na Oficina e fiapos de nuvem no Castelo.
// É só enfeite: pequeno, claro e atrás das plataformas, nunca parecido com item ou inimigo, e não lê
// nem muda nada da simulação. Quando a tela chacoalha (carimbada, bola, chefe), tudo se agita junto.

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Fase do balanço, do giro e do piscar. */
  t: number;
  giro: number;
  tam: number;
  cor: number;
  vida: number;
}

type Tipo = 'folha' | 'semente' | 'poeira' | 'vagalume' | 'petala' | 'faisca' | 'fiapo';

interface Receita {
  tipo: Tipo;
  quantos: number;
  cores: readonly number[];
}

const RECEITAS: Record<string, readonly Receita[]> = {
  floresta: [
    { tipo: 'folha', quantos: 14, cores: [0x9cc77a, 0xc9d98a, 0xe8b86a, 0x7fb069] },
    { tipo: 'semente', quantos: 6, cores: [0xffffff] },
  ],
  biblioteca: [{ tipo: 'poeira', quantos: 26, cores: [0xffe2a0, 0xfff1cf] }],
  jardim: [
    { tipo: 'vagalume', quantos: 12, cores: [0xfff3b0] },
    { tipo: 'petala', quantos: 7, cores: [0xfff0e0, 0xf9d3c0] },
  ],
  oficina: [
    { tipo: 'poeira', quantos: 14, cores: [0xfff6d6] },
    { tipo: 'faisca', quantos: 0, cores: [0xfff6d6, 0xffe08a] },
  ],
  castelo: [{ tipo: 'fiapo', quantos: 7, cores: [0xffffff, 0xf3ecfa] }],
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Ambiente {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly parts: Array<Particula & { tipo: Tipo }> = [];
  private readonly receitas: readonly Receita[];
  private faiscaEm = 0;

  constructor(
    scene: Phaser.Scene,
    tema: string,
    private readonly w: number,
    private readonly h: number,
    depth: number,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.receitas = RECEITAS[tema] ?? [];
    for (const r of this.receitas) for (let i = 0; i < r.quantos; i++) this.parts.push(this.nasce(r, true));
  }

  get ativo(): boolean {
    return this.receitas.length > 0;
  }

  /** A tela chacoalhou: as folhas voam, os vaga-lumes se espalham, a poeira sobe. */
  agitar(forca: number): void {
    for (const p of this.parts) {
      const k = forca * rand(0.6, 1.4);
      p.vx += rand(-1, 1) * 60 * k;
      p.vy -= rand(0.2, 1) * 40 * k;
      p.giro += rand(-1, 1) * 6 * k;
    }
  }

  step(dt: number, now: number): void {
    if (!this.ativo) return;
    // As faíscas da Oficina saem em rajadas da ponta do lápis do Riscador.
    const faisca = this.receitas.find((r) => r.tipo === 'faisca');
    if (faisca && now > this.faiscaEm) {
      this.faiscaEm = now + rand(900, 1800);
      for (let i = 0; i < 6; i++) {
        const p = this.nasce(faisca, false);
        p.x = this.w * 0.46;
        p.y = this.h * 0.22;
        p.vx = rand(-50, 50);
        p.vy = rand(-70, -10);
        p.vida = rand(0.4, 0.8);
        this.parts.push(p);
      }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!;
      p.t += dt;
      this.mover(p, dt);
      const fora = p.y > this.h + 12 || p.y < -20 || p.x < -30 || p.x > this.w + 30;
      if (p.tipo === 'faisca') {
        p.vida -= dt;
        if (p.vida <= 0) this.parts.splice(i, 1);
      } else if (fora) {
        const r = this.receitas.find((x) => x.tipo === p.tipo);
        if (r) this.parts[i] = this.nasce(r, false);
      }
    }
    this.desenhar();
  }

  destroy(): void {
    this.g.destroy();
  }

  private nasce(r: Receita, espalhado: boolean): Particula & { tipo: Tipo } {
    const cor = r.cores[Math.floor(Math.random() * r.cores.length)] ?? 0xffffff;
    const base = { t: rand(0, 10), giro: rand(-2, 2), cor, vida: 1, tipo: r.tipo };
    const y0 = espalhado ? rand(0, this.h) : undefined;
    switch (r.tipo) {
      case 'folha':
      case 'petala':
        return { ...base, x: rand(0, this.w), y: y0 ?? -10, vx: rand(-6, 6), vy: rand(10, 18), tam: r.tipo === 'folha' ? rand(2.4, 3.6) : rand(1.6, 2.4) };
      case 'semente':
        return { ...base, x: rand(0, this.w), y: y0 ?? this.h + 8, vx: rand(-4, 4), vy: rand(-8, -4), tam: 1.6 };
      case 'poeira':
        return { ...base, x: rand(0, this.w), y: y0 ?? rand(0, this.h), vx: rand(-3, 3), vy: rand(-3, 3), tam: rand(0.6, 1.2) };
      case 'vagalume':
        return { ...base, x: rand(this.w * 0.05, this.w * 0.95), y: y0 ?? rand(this.h * 0.3, this.h * 0.85), vx: rand(-8, 8), vy: rand(-5, 5), tam: 1.3 };
      case 'faisca':
        return { ...base, x: 0, y: 0, vx: 0, vy: 0, tam: 1.2 };
      case 'fiapo':
        return { ...base, x: y0 === undefined ? -30 : rand(0, this.w), y: rand(this.h * 0.1, this.h * 0.75), vx: rand(5, 10), vy: 0, tam: rand(10, 18) };
    }
  }

  private mover(p: Particula & { tipo: Tipo }, dt: number): void {
    const amortece = Math.exp(-dt * 1.5);
    switch (p.tipo) {
      case 'folha':
      case 'petala': {
        // Cai balançando de um lado para o outro; o empurrão do chacoalho some aos poucos.
        p.vx *= amortece;
        p.vy = p.vy * amortece + (p.tipo === 'folha' ? 14 : 10) * (1 - amortece);
        p.x += (p.vx + Math.sin(p.t * 1.7) * 14) * dt;
        p.y += p.vy * dt;
        p.giro *= amortece;
        break;
      }
      case 'semente':
        p.x += (p.vx + Math.sin(p.t) * 5) * dt;
        p.y += p.vy * dt;
        break;
      case 'poeira':
        p.vx = p.vx * amortece + Math.sin(p.t * 0.7) * 2 * (1 - amortece);
        p.vy = p.vy * amortece + Math.cos(p.t * 0.5) * 2 * (1 - amortece);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0) p.x += this.w;
        if (p.x > this.w) p.x -= this.w;
        if (p.y < 0) p.y += this.h;
        if (p.y > this.h) p.y -= this.h;
        break;
      case 'vagalume':
        // Passeia devagar e volta para perto de onde estava.
        p.vx = p.vx * amortece + Math.sin(p.t * 0.9) * 8 * (1 - amortece);
        p.vy = p.vy * amortece + Math.cos(p.t * 0.7) * 6 * (1 - amortece);
        p.x = Math.min(this.w - 4, Math.max(4, p.x + p.vx * dt));
        p.y = Math.min(this.h - 8, Math.max(8, p.y + p.vy * dt));
        break;
      case 'faisca':
        p.vy += 160 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        break;
      case 'fiapo':
        p.vx = p.vx * amortece + 7 * (1 - amortece);
        p.x += p.vx * dt;
        p.y += Math.sin(p.t * 0.4) * 2 * dt;
        break;
    }
  }

  private desenhar(): void {
    const g = this.g.clear();
    for (const p of this.parts) {
      switch (p.tipo) {
        case 'folha':
        case 'petala': {
          // Folha: losango achatado que gira (vira de lado e mostra a outra face).
          const a = p.t * (1.2 + p.giro * 0.3);
          const larg = p.tam * Math.abs(Math.cos(a)) + 0.4;
          const c = Math.cos(a * 0.7);
          const s = Math.sin(a * 0.7);
          const pts = [
            [p.tam * 1.6, 0],
            [0, larg],
            [-p.tam * 1.6, 0],
            [0, -larg],
          ].map(([x, y]) => [p.x + x! * c - y! * s, p.y + x! * s + y! * c] as const);
          g.fillStyle(p.cor, 0.85).beginPath();
          pts.forEach(([x, y], k) => (k === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
          g.closePath().fillPath();
          break;
        }
        case 'semente':
          g.lineStyle(0.6, 0xffffff, 0.8);
          for (let k = 0; k < 5; k++) {
            const ang = -Math.PI / 2 + (k - 2) * 0.45;
            g.lineBetween(p.x, p.y, p.x + Math.cos(ang) * 3, p.y + Math.sin(ang) * 3);
          }
          g.lineBetween(p.x, p.y, p.x + 0.6, p.y + 3);
          break;
        case 'poeira':
          g.fillStyle(p.cor, 0.35 + 0.25 * Math.sin(p.t * 2 + p.x)).fillCircle(p.x, p.y, p.tam);
          break;
        case 'vagalume': {
          const brilho = Math.max(0, Math.sin(p.t * 2.2 + p.giro * 3));
          g.fillStyle(p.cor, 0.18 * brilho).fillCircle(p.x, p.y, 4.5);
          g.fillStyle(p.cor, 0.35 + 0.65 * brilho).fillCircle(p.x, p.y, p.tam);
          break;
        }
        case 'faisca':
          g.fillStyle(p.cor, Math.min(1, p.vida * 2)).fillRect(p.x - 0.6, p.y - 0.6, 1.4, 1.4);
          break;
        case 'fiapo':
          g.fillStyle(p.cor, 0.5).fillEllipse(p.x, p.y, p.tam * 2, p.tam * 0.45);
          g.fillStyle(p.cor, 0.35).fillEllipse(p.x + p.tam * 0.6, p.y - 1.5, p.tam, p.tam * 0.35);
          break;
      }
    }
  }
}
