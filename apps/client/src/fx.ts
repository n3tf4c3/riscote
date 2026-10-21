import type * as Phaser from 'phaser';
import type { ArtLayer } from './art/layer';

// Efeitos de tinta só do cliente: respingos, gotinhas, poeira e riscos de velocidade.
// Semitransparentes, de vida curta (< 1 s) e com limite de partículas (plano, seção 3).

const MAX_PARTICLES = 220;
const GRAVITY = 520;

interface Particle {
  /** Textura (respingo, poeira) ou, sem textura, uma gotinha redonda ou um risco. */
  key?: string;
  line?: boolean;
  front: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  color: number;
  alpha: number;
  angle: number;
}

/** Sorteio barato e fixo para os efeitos (a simulação não usa nada disto). */
let seed = 1;
function rnd(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

/** Onda da pancada do saltador: duas cristas de tinta correndo rente ao chão. */
interface Wave {
  x: number;
  y: number;
  left: number;
  right: number;
  reach: number;
  age: number;
  life: number;
}

export class Effects {
  private parts: Particle[] = [];
  private waves: Wave[] = [];
  /** Pedido de chacoalhar a tela, atendido pela cena: [duração em ms, intensidade]. */
  shakeRequest: [number, number] | null = null;

  private add(p: Partial<Particle> & Pick<Particle, 'x' | 'y' | 'life'>): void {
    if (this.parts.length >= MAX_PARTICLES) this.parts.shift();
    this.parts.push({ front: false, vx: 0, vy: 0, gravity: 0, age: 0, size: 1, grow: 0, color: 0x141414, alpha: 1, angle: 0, ...p });
  }

  shake(ms: number, intensity: number): void {
    if (!this.shakeRequest || this.shakeRequest[1] < intensity) this.shakeRequest = [ms, intensity];
  }

  /** Gotinhas espirrando a partir de (x, y), em leque na direção `dir` (radianos). */
  droplets(x: number, y: number, color: number, count: number, speed: number, dir = -Math.PI / 2, spread = Math.PI, front = false): void {
    for (let i = 0; i < count; i++) {
      const a = dir + (rnd() - 0.5) * spread;
      const v = speed * (0.45 + rnd() * 0.75);
      this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: GRAVITY, life: 0.35 + rnd() * 0.35, size: 0.8 + rnd() * 1.4, color, front });
    }
  }

  /** Mancha que abre e some, com gotinhas em volta. */
  splat(x: number, y: number, blue: boolean, size: number, color: number): void {
    const key = `respingo-${blue ? 'azul' : 'tinta'}-${rnd() < 0.5 ? 0 : 1}`;
    this.add({ key, x, y, life: 0.55, size: size * 0.6, grow: size * 0.7, alpha: 0.85, angle: rnd() * 360 });
    this.droplets(x, y, color, Math.round(5 + size * 5), 90 + size * 60, -Math.PI / 2, Math.PI * 1.6);
  }

  /** Poeira de pincel seco nos pés, para os dois lados. */
  dust(x: number, y: number, power: number): void {
    for (const side of [-1, 1]) {
      this.add({ key: 'poeira', x: x + side * 4, y: y - 1, vx: side * (22 + power * 30), life: 0.4, size: 0.5 + power * 0.3, grow: 0.5, alpha: 0.75, angle: side * 4 });
    }
    for (let i = 0; i < 3 + Math.round(power * 4); i++) {
      this.add({ x: x + (rnd() - 0.5) * 12, y: y - 1, vx: (rnd() - 0.5) * 60, vy: -20 - rnd() * 40, gravity: 120, life: 0.3 + rnd() * 0.2, size: 0.7 + rnd() * 0.6, color: 0x8f8169, alpha: 0.8 });
    }
  }

  /** Riscos de velocidade saindo de (x, y), na frente de tudo. */
  streaks(x: number, y: number, dir: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = (dir > 0 ? Math.PI : 0) + (rnd() - 0.5) * 0.7;
      this.add({ line: true, front: true, x: x + (rnd() - 0.5) * 6, y: y + (rnd() - 0.5) * 12, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.18 + rnd() * 0.1, size: 6 + rnd() * 6, color: 0x141414, alpha: 0.85 });
    }
  }

  /** Brilhos em volta de (x, y): item pego, aliado revivido, capítulo concluído. */
  sparkle(x: number, y: number, color: number, count: number, radius: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rnd() * 0.5;
      const v = radius * (2 + rnd() * 2);
      this.add({ line: true, front: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: 40, life: 0.3 + rnd() * 0.2, size: 3 + rnd() * 2, color, alpha: 1 });
    }
  }

  /** Onda que sai de `x` para os dois lados, na altura `y` do chão, até `reach` em `life` s, sem passar de [left, right]. */
  wave(x: number, y: number, left: number, right: number, reach: number, life: number): void {
    this.waves.push({ x, y, left, right, reach, age: 0, life });
  }

  private waveFront(w: Wave, side: number): number | null {
    const px = w.x + side * w.reach * Math.min(1, w.age / w.life);
    return px < w.left || px > w.right ? null : px;
  }

  step(dt: number): void {
    for (const w of this.waves) {
      w.age += dt;
      for (const side of [-1, 1]) {
        const px = this.waveFront(w, side);
        if (px !== null && rnd() < 0.7) this.droplets(px, w.y - 2, 0x141414, 1, 90, side > 0 ? -1.1 : -2, 0.5, true);
      }
    }
    this.waves = this.waves.filter((w) => w.age < w.life + 0.15);
    for (const p of this.parts) {
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - Math.min(1, dt * (p.key ? 6 : 1.5));
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
  }

  /** Texturas pela camada de arte; gotinhas e riscos nos dois `Graphics` (atrás das plataformas e na frente). */
  draw(art: ArtLayer | null, back: Phaser.GameObjects.Graphics, front: Phaser.GameObjects.Graphics, depthBack: number, depthFront: number): void {
    back.clear();
    front.clear();
    for (const p of this.parts) {
      const t = p.age / p.life;
      const alpha = p.alpha * (1 - t * t);
      if (p.key) {
        const s = p.size + p.grow * Math.sqrt(t);
        art?.draw(p.key, p.x, p.y, p.front ? depthFront : depthBack, { alpha, sx: s, sy: s * (p.key === 'poeira' ? 1 - t * 0.4 : 1), angle: p.angle, still: true });
        continue;
      }
      const g = p.front ? front : back;
      if (p.line) {
        const len = Math.hypot(p.vx, p.vy) || 1;
        const k = (p.size * (1 - t)) / len;
        g.lineStyle(1.6, p.color, alpha).lineBetween(p.x, p.y, p.x - p.vx * k, p.y - p.vy * k);
      } else g.fillStyle(p.color, alpha).fillCircle(p.x, p.y, p.size * (1 - t * 0.5));
    }
    for (const w of this.waves) {
      const fade = w.age > w.life ? 1 - (w.age - w.life) / 0.15 : 1;
      for (const side of [-1, 1]) {
        const px = this.waveFront(w, side);
        if (px === null) continue;
        // Rastro raso atrás da crista e a crista em pé, inclinada para fora.
        front.fillStyle(0x141414, 0.3 * fade).fillRect(Math.min(w.x, px), w.y - 3, Math.abs(px - w.x), 3);
        front.fillStyle(0x141414, 0.9 * fade).fillTriangle(px - side * 18, w.y, px - side * 4, w.y - 15, px + side * 3, w.y);
        front.lineStyle(1.6, 0x2f6fd6, 0.8 * fade).lineBetween(px - side * 15, w.y - 1, px - side * 4, w.y - 13);
      }
    }
  }
}
