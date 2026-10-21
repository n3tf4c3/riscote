// Receitas dos efeitos do Riscote. Cada som é montado em camadas (ataque, corpo, cauda) a partir
// do material da mesa de desenho: tinta molhada, papel, pincel, bico de pena, madeira e metal pequeno.
// Variações usam outra semente e pequenos desvios de altura, para tiros e passos não soarem iguais.

import {
  applyEnv,
  bubble,
  buffer,
  crackle,
  curve,
  decay,
  filter,
  fmBell,
  midiHz,
  mix,
  modes,
  noise,
  osc,
  pluck,
  reverb,
  thump,
  type Mono,
} from './dsp.ts';
import { render, type InstrumentName, type Note } from './instrumentos.ts';

export interface Sfx {
  /** Nome do arquivo (sem número de variação nem extensão). */
  name: string;
  /** Quantas variações sorteadas o jogo alterna. */
  variations: number;
  /** Ganho no jogo (0–1), aplicado sobre o barramento de efeitos. */
  volume: number;
  /** Mínimo entre dois disparos do mesmo som, em ms (evita metralhadora com 5 jogadores). */
  gapMs: number;
  /** Som contínuo: o arquivo tem exatamente este comprimento e a cauda é dobrada para o começo. */
  loopSeconds?: number;
  build: (rand: () => number, variation: number) => Mono;
}

/** Sala pequena e seca: a mesa de desenho. */
const room = (x: Mono, wet = 0.08, tail = 0.25) => reverb(x, { size: 0.35, damp: 0.5, wet, tail });

/** Respingo molhado: ruído que fecha o filtro depressa, com bolhas por cima. */
function splat(rand: () => number, len: number, bright: number, size: number): Mono {
  const x = buffer(len);
  const body = applyEnv(filter(noise(len, rand), 'lowpass', curve([[0, bright], [len * 0.5, bright * 0.2]], true), 1.1), decay(0.0015, 0.02 + 0.03 * size));
  mix(x, body, 0, 1);
  const bubbles = Math.round(2 + size * 4);
  for (let i = 0; i < bubbles; i++) {
    const f = 280 + rand() * (500 + 400 * (1 - size));
    mix(x, bubble(f, 0.03 + rand() * 0.04, 0.1 + rand() * 0.1), 0.005 + rand() * 0.06 * (0.6 + size), 0.25 + rand() * 0.2);
  }
  return x;
}

/** Brilho de papel picado: estalinhos agudos que somem. */
function shimmer(rand: () => number, len: number, density = 140): Mono {
  return applyEnv(filter(crackle(len, density, rand), 'highpass', 6500, 0.7), decay(0.02, len / 3));
}

const tiro: Sfx = {
  name: 'tiro',
  variations: 4,
  volume: 0.55,
  gapMs: 40,
  build: (r) => {
    const k = 0.92 + r() * 0.16;
    const x = buffer(0.24);
    // Clique do bico de pena.
    mix(x, modes(0.02, [[3200 * k, 0.4, 0.004], [5100 * k, 0.25, 0.003]]), 0, 0.6);
    // O jato: ruído estreito que desce de tom.
    const jet = filter(noise(0.12, r), 'bandpass', curve([[0, 3400 * k], [0.1, 1300 * k]], true), 1.3);
    mix(x, applyEnv(jet, decay(0.004, 0.03)), 0.002, 1.3);
    mix(x, applyEnv(filter(noise(0.05, r), 'highpass', 5500), decay(0.001, 0.012)), 0, 0.25);
    // O "plic" da gota saindo.
    mix(x, bubble((750 + r() * 300) * k, 0.05, 0.16), 0.022, 0.5);
    mix(x, bubble((1150 + r() * 250) * k, 0.035, 0.12), 0.05, 0.22);
    return room(x);
  },
};

const encharcar: Sfx = {
  name: 'encharcar',
  variations: 3,
  volume: 0.5,
  gapMs: 45,
  build: (r) => {
    const x = buffer(0.25);
    mix(x, thump(0.09, 230 + r() * 40, 95, 0.025), 0, 0.6);
    mix(x, splat(r, 0.16, 2600 + r() * 600, 0.4), 0.002, 0.9);
    mix(x, applyEnv(filter(crackle(0.08, 350, r), 'highpass', 3000), decay(0.002, 0.02)), 0.004, 0.15);
    return room(x);
  },
};

const bola: Sfx = {
  name: 'bola',
  variations: 2,
  volume: 0.6,
  gapMs: 60,
  build: (r) => {
    const x = buffer(0.48);
    // Glup: a tinta fecha em volta do bicho e sobe de tom, com um tremido de líquido.
    const pitch = curve([[0, 140], [0.2, 390 + r() * 40]], true);
    const glup = osc(0.26, (t) => pitch(t) * (1 + 0.06 * Math.sin(2 * Math.PI * 17 * t)), 'tri');
    const shaped = filter(filter(glup, 'lowpass', 1300), 'bandpass', curve([[0, 500], [0.22, 1100]]), 2.5);
    mix(x, applyEnv(shaped, curve([[0, 0], [0.015, 1], [0.18, 0.8], [0.26, 0]])), 0, 1.6);
    [300, 420, 560, 700, 900].forEach((f, i) => mix(x, bubble(f * (0.95 + r() * 0.1), 0.045, 0.14), 0.02 + i * 0.035, 0.28));
    // Fecha com um "plop".
    mix(x, bubble(950 + r() * 100, 0.06, 0.2), 0.25, 0.6);
    mix(x, thump(0.06, 420, 200, 0.015, 0.01), 0.25, 0.35);
    return room(x, 0.1);
  },
};

const chute: Sfx = {
  name: 'chute',
  variations: 2,
  volume: 0.7,
  gapMs: 50,
  build: (r) => {
    const k = 0.94 + r() * 0.12;
    const x = buffer(0.45);
    // Pancada oca de madeira (o bico da bota de nanquim na bola) e o grave do impacto.
    mix(x, modes(0.15, [[210 * k, 0.8, 0.06], [560 * k, 0.5, 0.035], [1240 * k, 0.3, 0.018], [2600 * k, 0.15, 0.008]]), 0, 0.9);
    mix(x, thump(0.16, 170, 60, 0.05), 0, 0.8);
    mix(x, applyEnv(filter(noise(0.012, r), 'highpass', 2000), decay(0.0005, 0.002)), 0, 0.5);
    // Zunido da bola saindo.
    const whoosh = filter(noise(0.36, r), 'bandpass', curve([[0, 450], [0.26, 3300 * k]], true), 1.6);
    mix(x, applyEnv(whoosh, curve([[0, 0], [0.06, 0.6], [0.2, 0.35], [0.34, 0]])), 0.02, 0.8);
    return room(x, 0.1);
  },
};

const estouro: Sfx = {
  name: 'estouro',
  variations: 3,
  volume: 0.65,
  gapMs: 0,
  build: (r) => {
    const x = buffer(0.85);
    mix(x, thump(0.03, 1100, 260, 0.01, 0.005), 0, 0.6);
    mix(x, splat(r, 0.3, 5000, 1), 0, 1.1);
    mix(x, applyEnv(filter(noise(0.2, r), 'bandpass', 900, 2), decay(0.002, 0.04)), 0, 0.35);
    // Pingos caindo de volta no papel.
    mix(x, applyEnv(filter(crackle(0.3, 60, r), 'bandpass', 2500, 1.5), decay(0, 0.09)), 0.05, 0.5);
    // Recompensa: três notas de sino subindo (a altura varia entre variações).
    const base = [84, 86, 88][Math.floor(r() * 3)]!;
    [0, 4, 7].forEach((step, i) => mix(x, fmBell(midiHz(base + step), 0.5, { ratio: 3.5, index: 1.2, indexTau: 0.04, tau: 0.22 }), 0.08 + i * 0.055, 0.2));
    return room(x, 0.12, 0.4);
  },
};

const pulo: Sfx = {
  name: 'pulo',
  variations: 3,
  volume: 0.32,
  gapMs: 60,
  build: (r) => {
    const k = 0.9 + r() * 0.2;
    const x = buffer(0.2);
    const env = curve([[0, 0], [0.025, 1], [0.08, 0.45], [0.15, 0]]);
    // Pincelada para cima: ruído estreito subindo e as cerdas raspando.
    mix(x, applyEnv(filter(noise(0.16, r), 'bandpass', curve([[0, 700 * k], [0.12, 3800 * k]], true), 1.8), env), 0, 0.9);
    mix(x, applyEnv(filter(crackle(0.16, 900, r), 'highpass', 4000), env), 0, 0.18);
    mix(x, applyEnv(osc(0.12, curve([[0, 330 * k], [0.12, 660 * k]], true)), decay(0.005, 0.04)), 0, 0.14);
    return x;
  },
};

const pouso: Sfx = {
  name: 'pouso',
  variations: 3,
  volume: 0.38,
  gapMs: 60,
  build: (r) => {
    const x = buffer(0.14);
    mix(x, thump(0.12, 130 + r() * 20, 55, 0.03, 0.015), 0, 0.9);
    mix(x, applyEnv(filter(noise(0.02, r), 'bandpass', 2600 + r() * 900, 1.5), decay(0.0005, 0.004)), 0, 0.35);
    mix(x, applyEnv(filter(noise(0.08, r), 'lowpass', 1500), decay(0.002, 0.02)), 0.003, 0.3);
    return x;
  },
};

const item: Sfx = {
  name: 'item',
  variations: 1,
  volume: 0.55,
  gapMs: 80,
  build: (r) => {
    const x = buffer(0.9);
    // Kalimba subindo o acorde de Fá e o brilho de papel picado.
    [77, 81, 84, 89].forEach((m, i) => {
      mix(x, fmBell(midiHz(m), 0.6, { ratio: 4, index: 1.6, indexTau: 0.03, tau: 0.28 }), i * 0.06, 0.32);
    });
    mix(x, shimmer(r, 0.5), 0.05, 0.25);
    return room(x, 0.2, 0.5);
  },
};

const derrubado: Sfx = {
  name: 'derrubado',
  variations: 1,
  volume: 0.65,
  gapMs: 100,
  build: (r) => {
    const x = buffer(0.8);
    mix(x, splat(r, 0.25, 3000, 0.8), 0, 1);
    mix(x, thump(0.16, 180, 60, 0.05), 0, 0.7);
    // Murchando: um apito que desce (sem drama; o amigo pode levantar você).
    const slide = curve([[0, 620], [0.5, 170]], true);
    const s = osc(0.56, (t) => slide(t) * (1 + 0.03 * Math.sin(2 * Math.PI * 7 * t)), 'tri');
    mix(x, applyEnv(filter(s, 'lowpass', 1800), curve([[0, 0], [0.04, 0.5], [0.4, 0.35], [0.56, 0]])), 0.08, 0.5);
    mix(x, applyEnv(filter(crackle(0.35, 400, r), 'bandpass', 2500, 0.8), decay(0.01, 0.12)), 0.02, 0.3);
    return room(x, 0.12, 0.4);
  },
};

const resgate: Sfx = {
  name: 'resgate',
  variations: 1,
  volume: 0.6,
  gapMs: 100,
  build: (r) => {
    const x = buffer(0.9);
    [65, 69, 72, 77, 81].forEach((m, i) => mix(x, pluck(midiHz(m), 0.5, r, 0.75, 0.45), i * 0.05, 0.35));
    mix(x, fmBell(midiHz(89), 0.6, { ratio: 3.5, index: 1, tau: 0.3 }), 0.25, 0.25);
    mix(x, shimmer(r, 0.5), 0.2, 0.25);
    return room(x, 0.2, 0.5);
  },
};

const pagina: Sfx = {
  name: 'pagina',
  variations: 1,
  volume: 0.6,
  gapMs: 200,
  build: (r) => {
    const x = buffer(1);
    const env = curve([[0, 0], [0.12, 0.35], [0.35, 1], [0.6, 0.4], [0.85, 0]]);
    // A folha deslizando, os estalos do papel e o ar da página assentando.
    mix(x, applyEnv(filter(noise(0.9, r), 'bandpass', curve([[0, 1200], [0.35, 3500], [0.8, 1800]], true), 0.7), env), 0, 0.5);
    mix(x, applyEnv(filter(crackle(0.9, 220, r), 'bandpass', 3500, 1), env), 0, 0.4);
    mix(x, applyEnv(filter(noise(0.5, r), 'lowpass', 350), curve([[0, 0], [0.25, 0], [0.45, 1], [0.7, 0]])), 0.2, 0.9);
    mix(x, applyEnv(filter(noise(0.015, r), 'bandpass', 1800, 1.5), decay(0.0005, 0.006)), 0.62, 0.3);
    return room(x, 0.1, 0.3);
  },
};

/** Vinheta com a banda da trilha (mesmos instrumentos, outro sorteio). */
function jingle(notes: Note[], seconds: number, bpm: number, rand: () => number): Mono {
  const [L, R] = render(notes, seconds, 60 / bpm, rand, 0);
  const out = new Float32Array(L.length);
  for (let i = 0; i < out.length; i++) out[i] = (L[i]! + R[i]!) * 0.7;
  return reverb(out, { size: 0.55, damp: 0.45, wet: 0.18, tail: 0.6 });
}

const n = (at: number, beats: number, inst: InstrumentName, midi: number, vel = 0.8): Note => ({ at, beats, inst, midi, vel, pan: 0 });

const arenaLimpa: Sfx = {
  name: 'arena-limpa',
  variations: 1,
  volume: 0.7,
  gapMs: 1000,
  build: (r) => {
    // Fá maior, 150 bpm: subida em tercinas no piano de brinquedo e o acorde final com glockenspiel.
    const t3 = 1 / 3;
    const notes: Note[] = [
      ...[72, 77, 81, 84, 89].map((m, i) => n(i * t3, t3, 'piano', m, 0.75)),
      n(5 * t3, 2, 'piano', 93, 0.85),
      n(5 * t3, 2, 'glock', 89, 0.5),
      n(5 * t3, 2, 'glock', 93, 0.35),
      n(0, 1, 'baixo', 41, 0.9),
      n(5 * t3, 2, 'baixo', 41, 1),
      n(5 * t3, 1, 'pizz', 65, 0.6),
      n(5 * t3, 1, 'pizz', 69, 0.6),
      n(5 * t3, 1, 'pizz', 72, 0.6),
      ...[0, 0.25, 0.5, 0.75, 1, 1.25].map((at) => n(at, 0.25, 'vassoura', 0, 0.25 + at * 0.25)),
      n(5 * t3, 1, 'vassoura', 0, 0.9),
      n(5 * t3, 1, 'bumbo', 0, 0.9),
    ];
    return jingle(notes, 2.2, 150, r);
  },
};

// ---------------------------------------------------------------- P1: jogadores

const tintaVazia: Sfx = {
  name: 'tinta-vazia',
  variations: 2,
  volume: 0.45,
  gapMs: 90,
  build: (r) => {
    // Caneta sem carga: dois cliques de plástico e um sopro seco, sem nenhuma bolha.
    const k = 0.95 + r() * 0.1;
    const x = buffer(0.16);
    const click = () => modes(0.03, [[2700 * k, 0.6, 0.004], [4300 * k, 0.4, 0.0025], [6900 * k, 0.2, 0.0015]]);
    mix(x, click(), 0, 0.8);
    mix(x, click(), 0.045, 0.45);
    mix(x, applyEnv(filter(noise(0.08, r), 'bandpass', 1800, 0.8), curve([[0, 0], [0.01, 0.4], [0.07, 0]])), 0.01, 0.3);
    return x;
  },
};

const recarga: Sfx = {
  name: 'recarga',
  variations: 1,
  volume: 0.4,
  gapMs: 0,
  loopSeconds: 1.2,
  build: (r) => {
    // Tinta subindo no pote: bolhas de alturas sorteadas, uma sucção abafada e o gorgolejo.
    const len = 1.6;
    const x = buffer(len);
    const suck = filter(noise(len, r), 'lowpass', 380, 0.9);
    mix(x, applyEnv(suck, (t) => 0.5 + 0.25 * Math.sin(2 * Math.PI * 2.5 * t)), 0, 0.5);
    for (let t = 0; t < len - 0.08; t += 0.035 + r() * 0.06) mix(x, bubble(220 + r() * 480, 0.04 + r() * 0.05, 0.18), t, 0.25 + r() * 0.25);
    return x;
  },
};

const protecao: Sfx = {
  name: 'protecao',
  variations: 1,
  volume: 0.55,
  gapMs: 150,
  build: (r) => {
    // A bolha de proteção estoura: "plop" agudo, ar escapando e dois toques de vidro descendo.
    const x = buffer(0.6);
    mix(x, applyEnv(osc(0.02, curve([[0, 1800], [0.02, 3200]], true)), decay(0.0005, 0.005)), 0, 0.7);
    mix(x, applyEnv(filter(noise(0.15, r), 'highpass', 3500), decay(0.001, 0.03)), 0, 0.45);
    mix(x, fmBell(midiHz(93), 0.4, { ratio: 2.4, index: 0.8, tau: 0.12 }), 0.03, 0.3);
    mix(x, fmBell(midiHz(88), 0.4, { ratio: 2.4, index: 0.8, tau: 0.14 }), 0.11, 0.25);
    mix(x, shimmer(r, 0.3, 200), 0.02, 0.2);
    return room(x, 0.12, 0.35);
  },
};

// ---------------------------------------------------------------- P1: inimigos

const escapou: Sfx = {
  name: 'escapou',
  variations: 2,
  volume: 0.5,
  gapMs: 80,
  build: (r) => {
    // Sacudida de cachorro molhado: três respingos rápidos e um "boing" de quem se livrou.
    const x = buffer(0.45);
    [0, 0.06, 0.12].forEach((at, i) => mix(x, splat(r, 0.1, 2200 + i * 500, 0.25), at, 0.7 - i * 0.12));
    mix(x, applyEnv(osc(0.16, (t) => (300 + 450 * Math.min(1, t / 0.1)) * (1 + 0.04 * Math.sin(2 * Math.PI * 22 * t)), 'tri'), curve([[0, 0], [0.02, 0.6], [0.16, 0]])), 0.14, 0.4);
    return room(x);
  },
};

const chegada: Sfx = {
  name: 'chegada',
  variations: 2,
  volume: 0.45,
  gapMs: 120,
  build: (r) => {
    // Pingo grande caindo do alto da página: um assobio curto descendo e o "ploc" no papel.
    const k = 0.92 + r() * 0.16;
    const x = buffer(0.45);
    mix(x, applyEnv(osc(0.12, curve([[0, 1300 * k], [0.12, 520 * k]], true)), curve([[0, 0], [0.03, 0.3], [0.12, 0.15]])), 0, 1);
    mix(x, thump(0.12, 260, 85, 0.03), 0.12, 0.7);
    mix(x, splat(r, 0.18, 2400, 0.5), 0.12, 0.8);
    return room(x);
  },
};

const aviso: Sfx = {
  name: 'aviso',
  variations: 1,
  volume: 0.5,
  gapMs: 150,
  build: () => {
    // Caneta batendo no papel, acelerando e subindo: "vai acontecer alguma coisa aqui".
    const x = buffer(0.65);
    [0, 0.2, 0.34, 0.44, 0.51].forEach((at, i) => mix(x, modes(0.05, [[1700 * (1 + i * 0.05), 0.7, 0.012], [3900 * (1 + i * 0.05), 0.35, 0.005]]), at, 0.5 + i * 0.12));
    return x;
  },
};

const pancada: Sfx = {
  name: 'pancada',
  variations: 1,
  volume: 0.7,
  gapMs: 200,
  build: (r) => {
    // O saltador cai de barriga: baque grave com madeira e a onda de tinta correndo pelo chão.
    const x = buffer(1);
    mix(x, thump(0.4, 95, 34, 0.12, 0.03), 0, 1);
    mix(x, modes(0.3, [[120, 0.6, 0.08], [310, 0.35, 0.04], [690, 0.15, 0.02]]), 0, 0.6);
    mix(x, splat(r, 0.25, 2200, 0.9), 0.005, 0.7);
    const wave = filter(noise(0.7, r), 'lowpass', curve([[0, 2200], [0.6, 600]], true), 1.4);
    mix(x, applyEnv(wave, curve([[0, 0], [0.05, 0.7], [0.4, 0.45], [0.7, 0]])), 0.04, 0.55);
    return room(x, 0.1, 0.35);
  },
};

const cuspe: Sfx = {
  name: 'cuspe',
  variations: 2,
  volume: 0.55,
  gapMs: 120,
  build: (r) => {
    // Tinteiro de vidro: o tilintar do pote, o gole de nanquim e a cuspida.
    const k = 0.94 + r() * 0.12;
    const x = buffer(0.5);
    mix(x, modes(0.2, [[2350 * k, 0.5, 0.05], [3720 * k, 0.3, 0.035], [5260 * k, 0.15, 0.02]]), 0, 0.45);
    [180, 240, 300].forEach((f, i) => mix(x, bubble(f * k, 0.06, 0.2), 0.02 + i * 0.04, 0.45));
    mix(x, applyEnv(filter(noise(0.1, r), 'bandpass', curve([[0, 2600], [0.08, 900]], true), 1.2), decay(0.002, 0.025)), 0.14, 0.9);
    mix(x, splat(r, 0.12, 1800, 0.3), 0.15, 0.5);
    return room(x);
  },
};

const apagar: Sfx = {
  name: 'apagar',
  variations: 2,
  volume: 0.55,
  gapMs: 80,
  build: (r) => {
    // Borracha esfregando: dois traços de vai e vem, o rangido da borracha e o farelo caindo.
    const k = 0.92 + r() * 0.16;
    const x = buffer(0.5);
    for (const [at, len] of [[0, 0.11], [0.13, 0.13]] as const) {
      const rub = filter(noise(len, r), 'bandpass', 1400 * k, 0.9);
      const squeak = filter(noise(len, r), 'bandpass', (t) => 850 * k * (1 + 0.15 * Math.sin(2 * Math.PI * 30 * t)), 12);
      mix(rub, squeak, 0, 2.5);
      mix(x, applyEnv(rub, curve([[0, 0], [0.02, 1], [len - 0.03, 0.8], [len, 0]])), at, 0.6);
    }
    mix(x, applyEnv(filter(crackle(0.2, 260, r), 'bandpass', 3200, 1), decay(0.01, 0.06)), 0.26, 0.35);
    return x;
  },
};

const borrao: Sfx = {
  name: 'borrao',
  variations: 1,
  volume: 0.7,
  gapMs: 1000,
  build: (r) => {
    // O borrão chega: uma mancha grave se espalhando, bolhas fundas e o clarinete descendo devagar.
    const len = 2.2;
    const x = buffer(len);
    const rumble = filter(noise(len, r), 'lowpass', curve([[0, 120], [1, 260], [2.2, 140]]), 1.6);
    mix(x, applyEnv(rumble, curve([[0, 0], [0.5, 1], [1.6, 0.7], [2.2, 0]])), 0, 1.4);
    for (let t = 0.1; t < 1.8; t += 0.07 + r() * 0.12) mix(x, bubble(110 + r() * 160, 0.09, 0.15), t, 0.3);
    mix(x, splat(r, 0.3, 1500, 1), 0, 0.6);
    const line = filter(osc(1.7, curve([[0, midiHz(50)], [0.6, midiHz(50)], [1.5, midiHz(45)]], true), 'square'), 'lowpass', 900, 0.8);
    mix(x, applyEnv(line, curve([[0, 0], [0.15, 0.28], [1.3, 0.22], [1.7, 0]])), 0.2, 0.6);
    return room(x, 0.15, 0.6);
  },
};

const mancha: Sfx = {
  name: 'mancha',
  variations: 2,
  volume: 0.5,
  gapMs: 70,
  build: (r) => {
    // Pingo pesado de nanquim batendo no papel.
    const x = buffer(0.35);
    mix(x, bubble(380 + r() * 120, 0.05, 0.12), 0, 0.5);
    mix(x, thump(0.1, 210, 70, 0.03), 0, 0.7);
    mix(x, splat(r, 0.16, 1700 + r() * 500, 0.5), 0.003, 0.8);
    return room(x);
  },
};

// ---------------------------------------------------------------- P1: chefe

/** Carimbo de madeira com feltro na mesa: grave, oco e com o papel tremendo. */
function stamp(r: () => number, size: number): Mono {
  const len = 0.6 + size * 0.9;
  const x = buffer(len);
  mix(x, thump(len, 75, 28, 0.12 + size * 0.15, 0.04), 0, 1);
  mix(x, modes(len, [[82, 0.7, 0.15 + size * 0.1], [196, 0.45, 0.07], [415, 0.25, 0.035], [870, 0.1, 0.015]]), 0, 0.8);
  mix(x, applyEnv(filter(noise(0.2, r), 'lowpass', 900), decay(0.002, 0.03)), 0, 0.7);
  mix(x, applyEnv(filter(crackle(len, 300, r), 'bandpass', 2600, 0.8), decay(0.01, 0.1 + size * 0.25)), 0.02, 0.25 + size * 0.2);
  return x;
}

const chefeEntrada: Sfx = {
  name: 'chefe-entrada',
  variations: 1,
  volume: 0.85,
  gapMs: 1000,
  build: (r) => {
    const x = buffer(1.8);
    mix(x, stamp(r, 1), 0, 1);
    // Um acorde grave da banda por baixo: ele chegou.
    mix(x, jingle([n(0, 3, 'tuba', 38, 0.9), n(0, 3, 'tuba', 45, 0.6), n(0, 1, 'timpano', 50, 0.9), n(0, 3, 'clarinete', 50, 0.4)], 1.7, 150, r), 0.03, 0.5);
    return room(x, 0.14, 0.6);
  },
};

const chefeCarimbo: Sfx = {
  name: 'chefe-carimbo',
  variations: 2,
  volume: 0.75,
  gapMs: 200,
  build: (r) => room(stamp(r, 0.4 + r() * 0.15), 0.12, 0.45),
};

const chefeAviso: Sfx = {
  name: 'chefe-aviso',
  variations: 1,
  volume: 0.6,
  gapMs: 300,
  build: (r) => {
    // Madeira rangendo cada vez mais rápido e mais aguda: ele está tomando impulso.
    const len = 0.75;
    const x = buffer(len);
    let t = 0;
    while (t < len - 0.05) {
      const p = t / len;
      mix(x, modes(0.04, [[(520 + 700 * p) * (0.97 + r() * 0.06), 0.6, 0.008], [(1300 + 1500 * p), 0.25, 0.004]]), t, 0.35 + 0.5 * p);
      t += 0.045 * (1 - 0.7 * p) + r() * 0.006;
    }
    mix(x, applyEnv(filter(noise(len, r), 'bandpass', curve([[0, 500], [len, 1300]], true), 4), curve([[0, 0], [len * 0.8, 0.3], [len, 0]])), 0, 0.5);
    return x;
  },
};

const chefeGolpe: Sfx = {
  name: 'chefe-golpe',
  variations: 2,
  volume: 0.75,
  gapMs: 100,
  build: (r) => {
    // A bola acerta o feltro: pancada molhada, abafada, e um sino de recompensa.
    const x = buffer(0.9);
    mix(x, thump(0.25, 170, 58, 0.06), 0, 0.9);
    mix(x, splat(r, 0.3, 3000, 1), 0, 0.9);
    mix(x, applyEnv(filter(noise(0.15, r), 'lowpass', 700), decay(0.002, 0.04)), 0, 0.5);
    mix(x, fmBell(midiHz([88, 91][Math.floor(r() * 2)]!), 0.6, { ratio: 3.5, index: 1.2, tau: 0.25 }), 0.05, 0.3);
    return room(x, 0.12, 0.4);
  },
};

const chefePesado: Sfx = {
  name: 'chefe-pesado',
  variations: 1,
  volume: 0.6,
  gapMs: 500,
  build: (r) => {
    // Encharcado demais: afunda com um gemido que desce e bolhas grossas subindo.
    const x = buffer(1.2);
    const groan = osc(1, (t) => curve([[0, 300], [0.9, 85]], true)(t) * (1 + 0.05 * Math.sin(2 * Math.PI * 6 * t)), 'tri');
    mix(x, applyEnv(filter(groan, 'lowpass', 900), curve([[0, 0], [0.06, 0.6], [0.8, 0.4], [1, 0]])), 0, 0.8);
    for (let t = 0.05; t < 0.9; t += 0.06 + r() * 0.08) mix(x, bubble(120 + r() * 200, 0.08, 0.2), t, 0.35);
    mix(x, splat(r, 0.3, 1400, 1), 0, 0.6);
    return room(x, 0.15, 0.5);
  },
};

const chefeDerrota: Sfx = {
  name: 'chefe-derrota',
  variations: 1,
  volume: 0.8,
  gapMs: 2000,
  build: (r) => {
    // Respingos em cascata e o acorde da banda inteira em Fá: o Mata-Borrão se desmancha.
    const x = buffer(3);
    for (let i = 0; i < 6; i++) mix(x, splat(r, 0.3, 3500 - i * 300, 1), i * 0.11, 0.8 - i * 0.07);
    mix(x, stamp(r, 0.5), 0, 0.5);
    const t3 = 1 / 3;
    mix(x, jingle([
      ...[72, 77, 81, 84].map((m, i) => n(2 + i * t3, t3, 'piano', m, 0.7)),
      n(2 + 4 * t3, 3, 'glock', 89, 0.5),
      n(2 + 4 * t3, 3, 'piano', 89, 0.8),
      n(2 + 4 * t3, 3, 'baixo', 41, 1),
      ...[65, 69, 72].map((m) => n(2 + 4 * t3, 1, 'pizz', m, 0.6)),
      ...Array.from({ length: 8 }, (_, s) => n(2 + s * 0.17, 0.25, 'timpano', 53, 0.3 + s * 0.08)),
      n(2 + 4 * t3, 2, 'timpano', 41, 1),
    ], 3, 160, r), 0, 0.85);
    return x;
  },
};

// ---------------------------------------------------------------- P1: vinhetas

const capitulo: Sfx = {
  name: 'capitulo',
  variations: 1,
  volume: 0.75,
  gapMs: 2000,
  build: (r) => {
    // Fanfarra da banda inteira: subida, pergunta e resposta, e o acorde final com rufo e sinos.
    const notes: Note[] = [
      ...[[0, 72], [0.5, 77], [1, 81], [1.5, 84]].map(([at, m]) => n(at!, 0.5, 'piano', m!, 0.7)),
      n(2, 1, 'piano', 89, 0.8), n(3, 0.5, 'piano', 88, 0.7), n(3.5, 0.5, 'piano', 86, 0.7),
      n(4, 1, 'piano', 84, 0.75), n(5, 0.5, 'piano', 86, 0.7), n(5.5, 0.5, 'piano', 88, 0.7),
      n(6, 3, 'piano', 89, 0.85), n(6, 3, 'glock', 89, 0.55), n(6, 3, 'glock', 93, 0.4), n(6, 3, 'clarinete', 81, 0.45),
      ...[[0, 41], [1, 48], [2, 46], [3, 45], [4, 43], [5, 48]].map(([at, m]) => n(at!, 0.9, 'baixo', m!, 0.9)),
      n(6, 3, 'baixo', 41, 1),
      ...[1, 3, 5].flatMap((at) => [65, 69, 72].map((m) => n(at + 0.5, 0.5, 'pizz', m, 0.45))),
      ...[60, 65, 69, 72].map((m) => n(6, 2, 'pizz', m, 0.6)),
      ...[0, 1, 2, 3, 4, 5].map((at) => n(at, 1, at % 2 ? 'vassoura' : 'bumbo', 0, 0.6)),
      ...Array.from({ length: 8 }, (_, s) => n(5 + s * 0.125, 0.125, 'vassoura', 0, 0.2 + s * 0.07)),
      ...Array.from({ length: 10 }, (_, s) => n(6 + s * 0.12, 0.12, 'timpano', 41, 0.35 - s * 0.02)),
      n(6, 2, 'bumbo', 0, 1),
    ];
    return jingle(notes, 4.6, 132, r);
  },
};

const fimDeJogo: Sfx = {
  name: 'fim-de-jogo',
  variations: 1,
  volume: 0.55,
  gapMs: 2000,
  build: (r) => {
    // "Não foi dessa vez": quatro notas descendo em cromático, a última tremendo, e um ploc de pizzicato.
    const notes: Note[] = [
      ...[69, 68, 67].map((m, i) => n(i, 0.9, 'clarinete', m, 0.8)),
      ...[45, 44, 43].map((m, i) => n(i, 0.9, 'tuba', m, 0.7)),
      n(3, 2.2, 'clarinete', 66, 0.85),
      n(3, 2.2, 'tuba', 42, 0.75),
      n(5.5, 0.5, 'pizz', 50, 0.9),
      n(5.5, 0.5, 'pizz', 38, 0.9),
      n(5.5, 0.5, 'bumbo', 0, 0.7),
    ];
    const x = jingle(notes, 3.3, 150, r);
    return x;
  },
};

const comecar: Sfx = {
  name: 'comecar',
  variations: 1,
  volume: 0.8,
  gapMs: 1000,
  build: (r) => {
    // Contagem de bloco de madeira (três toques subindo) e o acorde de largada.
    const notes: Note[] = [
      n(0, 0.5, 'bloco', 79, 0.8), n(1, 0.5, 'bloco', 84, 0.8), n(2, 0.5, 'bloco', 91, 0.9),
      n(3, 2, 'piano', 89, 0.8), n(3, 2, 'glock', 93, 0.45),
      ...[65, 69, 72].map((m) => n(3, 1, 'pizz', m, 0.6)),
      n(3, 2, 'baixo', 41, 1), n(3, 1, 'bumbo', 0, 0.9), n(3, 1, 'vassoura', 0, 0.6),
    ];
    return jingle(notes, 2.6, 140, r);
  },
};

export const SFX: Sfx[] = [
  tiro, encharcar, bola, chute, estouro, pulo, pouso, item, derrubado, resgate, pagina, arenaLimpa,
  tintaVazia, recarga, protecao, escapou, chegada, aviso, pancada, cuspe, apagar, borrao, mancha,
  chefeEntrada, chefeCarimbo, chefeAviso, chefeGolpe, chefePesado, chefeDerrota, capitulo, fimDeJogo, comecar,
];

