// Primitivas de síntese para os sons do Riscote: ruído com semente, filtros, envelopes, cordas
// dedilhadas, sinos, modos de madeira, bolhas e um reverb pequeno. Tudo determinístico: a mesma
// semente gera o mesmo arquivo, para o master poder ser refeito a partir deste código.

export const RATE = 48000;

export type Mono = Float32Array;

export function buffer(seconds: number): Mono {
  return new Float32Array(Math.max(1, Math.round(seconds * RATE)));
}

/** Sorteio com semente (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const midiHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);
export const db = (d: number): number => 10 ** (d / 20);

/** Soma `src` em `dst` a partir de `at` segundos, com ganho. */
export function mix(dst: Mono, src: Mono, at = 0, gain = 1): Mono {
  const o = Math.round(at * RATE);
  for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i]! += src[i]! * gain;
  return dst;
}

/** Curva por pontos [tempo s, valor], com interpolação linear (ou exponencial, se `exp`). */
export function curve(points: Array<[number, number]>, exp = false): (t: number) => number {
  return (t) => {
    if (t <= points[0]![0]) return points[0]![1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i]!;
      const [t0, v0] = points[i - 1]!;
      if (t <= t1) {
        const k = (t - t0) / Math.max(1e-9, t1 - t0);
        if (exp && v0 > 0 && v1 > 0) return v0 * (v1 / v0) ** k;
        return v0 + (v1 - v0) * k;
      }
    }
    return points[points.length - 1]![1];
  };
}

/** Envelope de ataque curto e queda exponencial (tau em segundos). */
export function decay(attack: number, tau: number): (t: number) => number {
  return (t) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));
}

export function applyEnv(x: Mono, env: (t: number) => number): Mono {
  for (let i = 0; i < x.length; i++) x[i]! *= env(i / RATE);
  return x;
}

export function noise(seconds: number, rand: () => number): Mono {
  const x = buffer(seconds);
  for (let i = 0; i < x.length; i++) x[i] = rand() * 2 - 1;
  return x;
}

/** Ruído com picos esparsos: estalos de papel e farelo. `density` = estalos por segundo. */
export function crackle(seconds: number, density: number, rand: () => number): Mono {
  const x = buffer(seconds);
  for (let i = 0; i < x.length; i++) {
    if (rand() < density / RATE) {
      const amp = 0.3 + rand() * 0.7;
      const len = 8 + Math.floor(rand() * 40);
      for (let k = 0; k < len && i + k < x.length; k++) x[i + k]! += (rand() * 2 - 1) * amp * (1 - k / len);
    }
  }
  return x;
}

export type FilterKind = 'lowpass' | 'highpass' | 'bandpass' | 'peak';

/**
 * Biquad (fórmulas de Robert Bristow-Johnson) com frequência e Q que podem variar no tempo.
 * Os coeficientes são recalculados a cada 16 amostras.
 */
export function filter(x: Mono, kind: FilterKind, freq: number | ((t: number) => number), q: number | ((t: number) => number) = 0.707, gainDb = 0): Mono {
  const f = typeof freq === 'number' ? () => freq : freq;
  const qf = typeof q === 'number' ? () => q : q;
  const out = new Float32Array(x.length);
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % 16 === 0) {
      const t = i / RATE;
      const w = (2 * Math.PI * Math.min(RATE * 0.45, Math.max(10, f(t)))) / RATE;
      const cw = Math.cos(w);
      const alpha = Math.sin(w) / (2 * Math.max(0.05, qf(t)));
      let c0: number, c1: number, c2: number, d0: number, d1: number, d2: number;
      if (kind === 'lowpass') {
        c0 = (1 - cw) / 2; c1 = 1 - cw; c2 = c0; d0 = 1 + alpha; d1 = -2 * cw; d2 = 1 - alpha;
      } else if (kind === 'highpass') {
        c0 = (1 + cw) / 2; c1 = -(1 + cw); c2 = c0; d0 = 1 + alpha; d1 = -2 * cw; d2 = 1 - alpha;
      } else if (kind === 'bandpass') {
        c0 = alpha; c1 = 0; c2 = -alpha; d0 = 1 + alpha; d1 = -2 * cw; d2 = 1 - alpha;
      } else {
        const A = 10 ** (gainDb / 40);
        c0 = 1 + alpha * A; c1 = -2 * cw; c2 = 1 - alpha * A; d0 = 1 + alpha / A; d1 = -2 * cw; d2 = 1 - alpha / A;
      }
      b0 = c0 / d0; b1 = c1 / d0; b2 = c2 / d0; a1 = d1 / d0; a2 = d2 / d0;
    }
    const xi = x[i]!;
    const y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

/** Oscilador com frequência variável no tempo. */
export function osc(seconds: number, freq: number | ((t: number) => number), shape: 'sine' | 'tri' | 'square' | 'saw' = 'sine', phase = 0): Mono {
  const f = typeof freq === 'number' ? () => freq : freq;
  const x = buffer(seconds);
  let p = phase;
  for (let i = 0; i < x.length; i++) {
    p += f(i / RATE) / RATE;
    const ph = p - Math.floor(p);
    if (shape === 'sine') x[i] = Math.sin(2 * Math.PI * ph);
    else if (shape === 'tri') x[i] = 1 - 4 * Math.abs(ph - 0.5);
    else if (shape === 'square') x[i] = ph < 0.5 ? 1 : -1;
    else x[i] = 2 * ph - 1;
  }
  return x;
}

/**
 * Bolha (ressonância de Minnaert): seno curto cuja altura sobe enquanto decai. É o "plic"
 * das gotas e o que dá cara de líquido aos respingos.
 */
export function bubble(f0: number, seconds: number, rise = 0.12): Mono {
  const tau = seconds / 4;
  const x = osc(seconds, (t) => f0 * (1 + (rise * t) / tau));
  return applyEnv(x, decay(0.0008, tau));
}

/**
 * Corda dedilhada (Karplus-Strong), para o pizzicato, o contrabaixo e o fio da fiandeira.
 * `bright` (0–1) é o quanto o ataque começa aberto; `damp` (0–1) apaga os agudos a cada volta.
 */
export function pluck(freq: number, seconds: number, rand: () => number, bright = 0.6, damp = 0.5): Mono {
  const x = buffer(seconds);
  // O filtro de média atrasa meia amostra; o resto fracionário vai num passa-tudo, para afinar.
  const period = RATE / freq - 0.5;
  const n = Math.max(2, Math.floor(period));
  const frac = Math.max(0.05, period - n);
  const c = (1 - frac) / (1 + frac);
  const line = new Float32Array(n);
  // Ruído suavizado: quanto menos brilho, mais filtrado o ataque.
  let prev = 0;
  for (let i = 0; i < n; i++) {
    prev += (rand() * 2 - 1 - prev) * (0.15 + bright * 0.85);
    line[i] = prev;
  }
  let mean = 0;
  for (let i = 0; i < n; i++) mean += line[i]! / n;
  for (let i = 0; i < n; i++) line[i]! -= mean;
  // Peso do vizinho: 0,5 apaga mais os agudos; perto de 0 a corda soa mais longa e brilhante.
  const w = 0.5 - (1 - damp) * 0.42;
  const loss = 0.9992 - damp * 0.004;
  let idx = 0;
  let apX = 0;
  let apY = 0;
  for (let i = 0; i < x.length; i++) {
    const cur = line[idx]!;
    const next = line[(idx + 1) % n]!;
    const avg = (cur * (1 - w) + next * w) * loss;
    const y = c * avg + apX - c * apY;
    apX = avg;
    apY = y;
    line[idx] = y;
    x[i] = cur;
    idx = (idx + 1) % n;
  }
  return x;
}

/** Sino de FM (2 operadores): celesta, caixinha de música, kalimba e piano de brinquedo. */
export function fmBell(freq: number, seconds: number, opts: { ratio?: number; index?: number; tau?: number; indexTau?: number; attack?: number } = {}): Mono {
  const { ratio = 3.5, index = 2.5, tau = 0.35, indexTau = 0.12, attack = 0.002 } = opts;
  const x = buffer(seconds);
  for (let i = 0; i < x.length; i++) {
    const t = i / RATE;
    const idx = index * Math.exp(-t / indexTau);
    const m = Math.sin(2 * Math.PI * freq * ratio * t) * idx;
    x[i] = Math.sin(2 * Math.PI * freq * t + m) * (t < attack ? t / attack : Math.exp(-(t - attack) / tau));
  }
  return x;
}

/** Soma de modos que decaem: madeira, marimba, metal do grampo e o carimbo. */
export function modes(seconds: number, list: Array<[freq: number, amp: number, tau: number]>, attack = 0.0005): Mono {
  const x = buffer(seconds);
  for (const [f, a, tau] of list) {
    for (let i = 0; i < x.length; i++) {
      const t = i / RATE;
      x[i]! += Math.sin(2 * Math.PI * f * t) * a * (t < attack ? t / attack : Math.exp(-(t - attack) / tau));
    }
  }
  return x;
}

/** Pancada grave: seno com a altura caindo (bumbo, pouso, carimbo). */
export function thump(seconds: number, from: number, to: number, tau: number, drop = 0.03): Mono {
  const x = osc(seconds, (t) => to + (from - to) * Math.exp(-t / drop));
  return applyEnv(x, decay(0.001, tau));
}

/** Saturação suave. */
export function saturate(x: Mono, drive = 1.5): Mono {
  const k = Math.tanh(drive);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i]! * drive) / k;
  return x;
}

export function gain(x: Mono, g: number): Mono {
  for (let i = 0; i < x.length; i++) x[i]! *= g;
  return x;
}

export function peak(x: Mono): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]!));
  return p;
}

export function rms(x: Mono): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s / Math.max(1, x.length));
}

/** Pico em `targetDb` dBFS. */
export function normalize(x: Mono, targetDb: number): Mono {
  const p = peak(x);
  return p > 0 ? gain(x, db(targetDb) / p) : x;
}

/** Rampa de entrada e saída (ms), contra estalos nas pontas. */
export function fades(x: Mono, inMs: number, outMs: number): Mono {
  const ni = Math.round((inMs / 1000) * RATE);
  const no = Math.round((outMs / 1000) * RATE);
  for (let i = 0; i < ni && i < x.length; i++) x[i]! *= i / ni;
  for (let i = 0; i < no && i < x.length; i++) x[x.length - 1 - i]! *= i / no;
  return x;
}

/** Corta o silêncio do fim (abaixo de `floorDb`), deixando uma rampa curta. */
export function trimTail(x: Mono, floorDb = -60): Mono {
  const floor = db(floorDb);
  let end = x.length;
  while (end > 1 && Math.abs(x[end - 1]!) < floor) end--;
  const out = x.slice(0, Math.min(x.length, end + Math.round(0.01 * RATE)));
  return fades(out, 0, 8);
}

/**
 * Reverb pequeno (Schroeder: 4 pentes em paralelo e 2 passa-tudo). Sala de mesa de desenho:
 * curta e opaca, só para colar os sons no mesmo lugar.
 */
export function reverb(x: Mono, opts: { size?: number; damp?: number; wet?: number; tail?: number } = {}): Mono {
  const { size = 0.6, damp = 0.4, wet = 0.15, tail = 0.6 } = opts;
  const out = new Float32Array(x.length + Math.round(tail * RATE));
  out.set(x);
  const wetBuf = new Float32Array(out.length);
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(d * (0.6 + size * 0.6) * (RATE / 44100)));
  for (const d of combs) {
    const line = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    const fb = 0.7 + size * 0.12;
    for (let i = 0; i < out.length; i++) {
      const y = line[idx]!;
      lp = y * (1 - damp) + lp * damp;
      line[idx] = (i < x.length ? x[i]! : 0) + lp * fb;
      idx = (idx + 1) % d;
      wetBuf[i]! += y * 0.25;
    }
  }
  for (const d of [225, 556].map((v) => Math.round(v * (RATE / 44100)))) {
    const line = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < wetBuf.length; i++) {
      const bufOut = line[idx]!;
      const inp = wetBuf[i]!;
      line[idx] = inp + bufOut * 0.5;
      wetBuf[i] = bufOut - inp;
      idx = (idx + 1) % d;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = out[i]! * (1 - wet * 0.5) + wetBuf[i]! * wet;
  return out;
}
