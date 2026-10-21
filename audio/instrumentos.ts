// A "banda da mesa de desenho": pizzicato, contrabaixo, piano de brinquedo, marimba, glockenspiel,
// clarinete e uma bateria de vassourinha. Os mesmos timbres tocam a trilha e as vinhetas, para
// que tudo pareça vir do mesmo lugar.

import { RATE, applyEnv, buffer, curve, decay, filter, fmBell, midiHz, mix, modes, noise, osc, pluck, thump } from './dsp.ts';

export type Instrument = (midi: number, beats: number, vel: number, rand: () => number, spb: number) => Float32Array;

/** Cordas em pizzicato: o acompanhamento nos contratempos. */
export const pizz: Instrument = (m, _b, vel, r) => {
  const x = pluck(midiHz(m), 0.6, r, 0.5 + vel * 0.2, 0.62);
  const body = filter(x, 'peak', 420, 1.2, 4);
  return applyEnv(filter(body, 'lowpass', 3200), decay(0.002, 0.16));
};

/** Contrabaixo dedilhado: corda + fundamental para dar peso em caixinhas pequenas. */
export const baixo: Instrument = (m, beats, vel, r, spb) => {
  const len = Math.min(1.2, beats * spb + 0.15);
  const f = midiHz(m);
  const x = pluck(f, len, r, 0.3 + vel * 0.15, 0.7);
  mix(x, applyEnv(osc(len, f), decay(0.006, 0.25)), 0, 0.55);
  // A segunda harmônica aparece em alto-falante de notebook, onde a fundamental some.
  mix(x, applyEnv(osc(len, f * 2), decay(0.004, 0.12)), 0, 0.18);
  const out = filter(x, 'lowpass', 1400);
  return applyEnv(out, (t) => (t < len - 0.08 ? 1 : Math.max(0, (len - t) / 0.08)));
};

/** Piano de brinquedo: FM inarmônica, ataque de lâmina batida. É a voz da melodia. */
export const piano: Instrument = (m, beats, vel, _r, spb) => {
  const f = midiHz(m);
  const len = Math.min(1.4, beats * spb + 0.5);
  const x = fmBell(f, len, { ratio: 3.51, index: 1.4 + vel, indexTau: 0.05, tau: 0.32 });
  mix(x, fmBell(f * 2, len, { ratio: 1, index: 0.3, tau: 0.12 }), 0, 0.25);
  return applyEnv(x, (t) => (t < len - 0.05 ? 1 : Math.max(0, (len - t) / 0.05)));
};

/** Marimba: três modos de madeira e o toque da baqueta. */
export const marimba: Instrument = (m, _b, vel, r) => {
  const f = midiHz(m);
  const tau = 0.18 * Math.min(1.6, 440 / f + 0.4);
  const x = modes(0.7, [
    [f, 1, tau],
    [f * 3.93, 0.25 * vel, tau * 0.22],
    [f * 9.2, 0.06 * vel, tau * 0.06],
  ]);
  mix(x, applyEnv(filter(noise(0.01, r), 'bandpass', 2400, 1), decay(0.0003, 0.002)), 0, 0.15 * vel);
  return x;
};

/** Glockenspiel: brilho dos acertos e das vinhetas. */
export const glock: Instrument = (m, _b, vel) => {
  const f = midiHz(m);
  return modes(1.2, [
    [f, 1, 0.5],
    [f * 2.76, 0.35 * vel, 0.16],
    [f * 5.4, 0.15 * vel, 0.05],
  ], 0.0004);
};

/** Clarinete: ímpares filtrados e vibrato que entra depois do ataque. */
export const clarinete: Instrument = (m, beats, vel, _r, spb) => {
  const f = midiHz(m);
  const len = beats * spb;
  const x = osc(len + 0.1, (t) => f * (1 + 0.004 * Math.min(1, Math.max(0, t - 0.18) / 0.2) * Math.sin(2 * Math.PI * 5.2 * t)), 'square');
  const tone = filter(filter(x, 'lowpass', 1600 + vel * 900, 0.8), 'peak', 1300, 1, 3);
  return applyEnv(tone, (t) => Math.min(1, t / 0.035) * (t < len ? 1 : Math.max(0, 1 - (t - len) / 0.08)) * 0.5);
};

export const bumbo: Instrument = (_m, _b, _vel, r) => {
  const x = thump(0.3, 115, 48, 0.09, 0.02);
  mix(x, applyEnv(filter(noise(0.01, r), 'lowpass', 2500), decay(0.0005, 0.003)), 0, 0.3);
  return x;
};

/** Caixa de vassourinha: ruído aberto com um arrasto que some devagar. */
export const vassoura: Instrument = (_m, _b, _vel, r) => {
  const n = noise(0.3, r);
  const hit = applyEnv(filter(n, 'bandpass', 2600, 0.6), decay(0.002, 0.05));
  const drag = applyEnv(filter(noise(0.3, r), 'bandpass', curve([[0, 4500], [0.25, 2500]]), 0.9), curve([[0, 0], [0.02, 0.35], [0.25, 0]]));
  mix(hit, drag, 0, 1);
  mix(hit, applyEnv(osc(0.1, 190), decay(0.001, 0.02)), 0, 0.25);
  return hit;
};

export const chimbal: Instrument = (_m, _b, vel, r) => applyEnv(filter(noise(0.08, r), 'highpass', 7000, 0.8), decay(0.0005, 0.018 + vel * 0.012));

/** Palmas: três estalos de ruído quase juntos. */
export const palma: Instrument = (_m, _b, _vel, r) => {
  const x = buffer(0.25);
  for (const at of [0, 0.009, 0.019]) mix(x, applyEnv(filter(noise(0.04, r), 'bandpass', 1300, 1.4), decay(0.0004, 0.006)), at, 0.7);
  mix(x, applyEnv(filter(noise(0.25, r), 'bandpass', 1200, 1), decay(0.001, 0.05)), 0.019, 0.5);
  return x;
};

/** Ganzá: o chacoalhar em semicolcheias da camada de intensidade. */
export const ganza: Instrument = (_m, _b, _vel, r) => applyEnv(filter(noise(0.08, r), 'highpass', 5200, 0.7), curve([[0, 0], [0.012, 1], [0.06, 0]]));

/** Caixinha de música: lâmina de pente, fundamental forte e um tique no ataque. Voz da capa. */
export const caixinha: Instrument = (m, _b, vel, r) => {
  const f = midiHz(m);
  const x = modes(1.6, [
    [f, 1, 0.7],
    [f * 3.01, 0.18 * vel, 0.18],
    [f * 5.8, 0.07 * vel, 0.04],
  ], 0.0003);
  mix(x, applyEnv(filter(noise(0.006, r), 'highpass', 4000), decay(0.0002, 0.0015)), 0, 0.2);
  return x;
};

/** Celesta: sino quase harmônico, macio. */
export const celesta: Instrument = (m, beats, _vel, _r, spb) => {
  const f = midiHz(m);
  const len = Math.min(1.6, beats * spb + 0.8);
  const x = fmBell(f, len, { ratio: 1, index: 0.7, indexTau: 0.08, tau: 0.55 });
  mix(x, fmBell(f * 4, len, { ratio: 1, index: 0.2, tau: 0.08 }), 0, 0.15);
  return x;
};

/** Sanfona: duas palhetas levemente desafinadas, o fole tremulando e a caixa filtrando. */
export const sanfona: Instrument = (m, beats, vel, _r, spb) => {
  const f = midiHz(m);
  const len = beats * spb;
  const total = len + 0.1;
  const x = osc(total, f * 1.0035, 'saw');
  mix(x, osc(total, f * 0.9965, 'saw', 0.3), 0, 1);
  mix(x, osc(total, f / 2, 'square'), 0, 0.18);
  const tone = filter(filter(x, 'lowpass', 1800 + vel * 1200, 0.7), 'peak', 1100, 1.2, 4);
  return applyEnv(tone, (t) => Math.min(1, t / 0.035) * (t < len ? 1 : Math.max(0, 1 - (t - len) / 0.1)) * (1 - 0.1 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 5.5 * t))) * 0.3);
};

/** Assobio: seno com escorregão de entrada, vibrato tardio e um sopro de ar. */
export const assobio: Instrument = (m, beats, _vel, r, spb) => {
  const f = midiHz(m);
  const len = beats * spb;
  const total = len + 0.08;
  const x = osc(total, (t) => f * (1 - 0.055 * Math.exp(-t / 0.025)) * (1 + 0.006 * Math.min(1, Math.max(0, t - 0.12) / 0.15) * Math.sin(2 * Math.PI * 5.6 * t)));
  mix(x, filter(noise(total, r), 'bandpass', f, 6), 0, 0.12);
  return applyEnv(x, (t) => Math.min(1, t / 0.045) * (t < len ? 1 : Math.max(0, 1 - (t - len) / 0.07)) * 0.6);
};

/** Tuba: dente de serra com o filtro abrindo no ataque (o "bufo" do metal) e o fundamental por baixo. */
export const tuba: Instrument = (m, beats, vel, _r, spb) => {
  const f = midiHz(m);
  const len = Math.max(0.12, beats * spb - 0.03);
  const total = len + 0.12;
  const x = osc(total, f, 'saw');
  const bright = filter(x, 'lowpass', (t) => 220 + vel * 700 * Math.exp(-t / 0.08) + 180, 0.9);
  mix(bright, osc(total, f), 0, 0.5);
  return applyEnv(bright, (t) => Math.min(1, t / 0.025) * (t < len ? 1 - 0.15 * Math.min(1, t / 0.3) : Math.max(0, 1 - (t - len) / 0.1)) * 0.7);
};

/** Tímpano: modos de pele com a altura assentando depois da baqueta. */
export const timpano: Instrument = (m, _b, vel, r) => {
  const f = midiHz(m);
  const x = buffer(1.6);
  [[1, 1, 0.55], [1.5, 0.45, 0.35], [1.98, 0.3, 0.25], [2.44, 0.18, 0.15]].forEach(([k, a, tau]) => {
    mix(x, applyEnv(osc(1.6, (t) => f * k! * (1 + 0.02 * Math.exp(-t / 0.04))), decay(0.002, tau!)), 0, a!);
  });
  mix(x, applyEnv(filter(noise(0.04, r), 'lowpass', 900), decay(0.001, 0.01)), 0, 0.4 * vel);
  return x;
};

/** Bloco de madeira: o tique-taque do chefe e a contagem. */
export const bloco: Instrument = (m, _b, _vel, r) => {
  const f = midiHz(m);
  const x = modes(0.12, [[f, 1, 0.025], [f * 2.71, 0.45, 0.012], [f * 4.9, 0.15, 0.005]]);
  mix(x, applyEnv(filter(noise(0.005, r), 'highpass', 3000), decay(0.0002, 0.001)), 0, 0.3);
  return x;
};

export const INSTRUMENTS = {
  pizz, baixo, piano, marimba, glock, clarinete, bumbo, vassoura, chimbal, palma, ganza,
  caixinha, celesta, sanfona, assobio, tuba, timpano, bloco,
} as const;
export type InstrumentName = keyof typeof INSTRUMENTS;

/** Nota de um arranjo: tempo em batidas, duração em batidas. */
export interface Note {
  at: number;
  beats: number;
  inst: InstrumentName;
  midi: number;
  vel: number;
  pan: number;
}

/** Atraso dos contratempos (swing) em fração de batida. */
export function swingAt(beat: number, swing: number): number {
  const whole = Math.floor(beat);
  const f = beat - whole;
  const s = f <= 0.5 ? (f / 0.5) * (0.5 + swing) : 0.5 + swing + ((f - 0.5) / 0.5) * (0.5 - swing);
  return whole + s;
}

/** Toca as notas em estéreo; `RATE` amostras por segundo, `spb` segundos por batida. */
export function render(notes: Note[], seconds: number, spb: number, rand: () => number, swing = 0, lead = 0): [Float32Array, Float32Array] {
  const L = buffer(seconds);
  const R = buffer(seconds);
  for (const n of notes) {
    const x = INSTRUMENTS[n.inst](n.midi, n.beats, n.vel, rand, spb);
    // Humanização leve: até 4 ms de folga.
    const at = lead + swingAt(n.at, swing) * spb + (rand() - 0.5) * 0.008;
    const a = ((n.pan + 1) * Math.PI) / 4;
    mix(L, x, at, Math.cos(a) * n.vel);
    mix(R, x, at, Math.sin(a) * n.vel);
  }
  return [L, R];
}

export { RATE };
