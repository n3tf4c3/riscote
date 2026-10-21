// Trilhas provisórias, compostas nota a nota e tocadas pela banda de `instrumentos.ts`.
// Cada trilha tem duas camadas sincronizadas e do mesmo comprimento: `base` (sempre tocando) e
// `camada` (entra quando a pressão sobe: o borrão chegou). O loop é exato: a cauda que passa do fim
// é somada de volta ao começo, então a emenda não tem corte nem silêncio.

import { RATE, reverb } from './dsp.ts';
import { render, type InstrumentName, type Note } from './instrumentos.ts';

export interface Track {
  name: string;
  bpm: number;
  swing: number;
  bars: number;
  /** `camada` é opcional: a capa toca só a base. */
  stems: { base: Note[]; camada?: Note[] };
}

const n = (at: number, beats: number, inst: InstrumentName, midi: number, vel: number, pan = 0): Note => ({ at, beats, inst, midi, vel, pan });

/** Acorde de um compasso (ou meio compasso): baixo, quinta e as três vozes do pizzicato. */
interface Chord {
  root: number;
  fifth: number;
  voices: [number, number, number];
}

const C = (root: number, fifth: number, voices: [number, number, number]): Chord => ({ root, fifth, voices });
const F = C(41, 48, [57, 60, 65]);
const Dm = C(38, 45, [57, 62, 65]);
const Bb = C(46, 41, [58, 62, 65]);
const C7 = C(36, 43, [58, 60, 64]);
const Gm7 = C(43, 50, [58, 62, 65]);
const Bbm = C(46, 41, [58, 61, 65]);
const D7 = C(38, 45, [57, 60, 66]);
const Gm = C(43, 50, [58, 62, 67]);
const Am7 = C(45, 40, [55, 60, 64]);

/** 16 compassos; dois acordes no compasso dividem as batidas 1–2 e 3–4. */
const CADERNO_HARMONIA: Chord[][] = [
  [F], [Dm], [Bb], [C7], [F], [Dm], [Gm7, C7], [F],
  [Bb], [Bbm], [F], [D7], [Gm], [C7], [Am7, D7], [Gm7, C7],
];

/** Melodia do piano de brinquedo: [batida no compasso, duração, nota]. */
const CADERNO_MELODIA: Array<Array<[number, number, number]>> = [
  [[0, 0.5, 72], [0.5, 0.5, 77], [1, 1, 81], [2, 0.5, 79], [2.5, 0.5, 77], [3, 1, 81]],
  [[0, 0.5, 81], [0.5, 0.5, 79], [1, 1, 77], [2, 1.5, 74]],
  [[0, 0.5, 74], [0.5, 0.5, 77], [1, 1, 82], [2, 0.5, 81], [2.5, 0.5, 79], [3, 1, 77]],
  [[0, 1, 76], [1, 0.5, 79], [1.5, 1.5, 84], [3, 1, 82]],
  [[0, 0.5, 81], [0.5, 0.5, 84], [1, 0.5, 81], [1.5, 0.5, 77], [2, 1, 84], [3, 1, 81]],
  [[0, 0.5, 86], [0.5, 0.5, 84], [1, 1, 81], [2, 0.5, 77], [2.5, 0.5, 74], [3, 1, 77]],
  [[0, 0.5, 79], [0.5, 0.5, 82], [1, 1, 86], [2, 0.5, 84], [2.5, 0.5, 82], [3, 0.5, 79], [3.5, 0.5, 76]],
  [[0, 1.5, 77], [2, 0.5, 81], [2.5, 0.5, 84], [3, 1, 86]],
  [[0, 1, 86], [1, 0.5, 84], [1.5, 0.5, 82], [2, 0.5, 77], [2.5, 0.5, 79], [3, 1, 82]],
  [[0, 1, 85], [1, 0.5, 84], [1.5, 0.5, 82], [2, 2, 77]],
  [[0, 0.5, 81], [0.5, 0.5, 84], [1, 1, 89], [2, 0.5, 88], [2.5, 0.5, 86], [3, 1, 84]],
  [[0, 0.5, 78], [0.5, 0.5, 81], [1, 1, 84], [2, 0.5, 86], [2.5, 0.5, 84], [3, 1, 81]],
  [[0, 1, 82], [1, 0.5, 81], [1.5, 0.5, 79], [2, 1, 74], [3, 1, 79]],
  [[0, 0.5, 84], [0.5, 0.5, 82], [1, 0.5, 79], [1.5, 0.5, 76], [2, 1, 79], [3, 1, 72]],
  [[0, 0.5, 76], [0.5, 0.5, 79], [1, 1, 84], [2, 0.5, 81], [2.5, 0.5, 78], [3, 1, 84]],
  [[0, 1, 82], [1, 1, 79], [2, 0.5, 76], [2.5, 0.5, 79], [3, 1, 84]],
];

type Melody = Array<Array<[number, number, number]>>;

/**
 * O arranjo saltitante dos capítulos: baixo na tônica e na quinta, acompanhamento nos contratempos,
 * melodia por cima e vassourinha. A camada soma marimba, a terça sustentada, ganzá e palmas.
 */
function bouncy(o: {
  name: string;
  bpm: number;
  harmony: Chord[][];
  melody: Melody;
  lead: InstrumentName;
  leadVel: number;
  comp: InstrumentName;
  compVel: number;
  hold: InstrumentName;
}): Track {
  const base: Note[] = [];
  const camada: Note[] = [];
  o.harmony.forEach((chords, bar) => {
    const b0 = bar * 4;
    chords.forEach((ch, half) => {
      const span = 4 / chords.length;
      const at = b0 + half * span;
      // Baixo saltitante: tônica no 1, quinta no 3; pizzicato nos contratempos 2 e 4.
      for (let beat = 0; beat < span; beat++) {
        const t = at + beat;
        const even = (t - b0) % 2 === 0;
        if (even) base.push(n(t, 0.9, 'baixo', (t - b0) % 4 === 0 ? ch.root : ch.fifth, 0.95));
        else ch.voices.forEach((v, i) => base.push(n(t, 0.5, o.comp, v, o.compVel, -0.35 + i * 0.1)));
      }
      // Camada: marimba em colcheias percorrendo o acorde e uma voz segurando a terça.
      const arp = [ch.voices[0] + 12, ch.voices[1] + 12, ch.voices[2] + 12, ch.voices[1] + 12];
      for (let k = 0; k < span * 2; k++) camada.push(n(at + k * 0.5, 0.5, 'marimba', arp[k % arp.length]!, k % 2 ? 0.45 : 0.6, 0.45));
      camada.push(n(at, span - 0.1, o.hold, ch.voices[1], 0.32, -0.4));
    });
    for (const [beat, beats, midi] of o.melody[bar]!) base.push(n(b0 + beat, beats, o.lead, midi, o.leadVel, 0.1));
    // Bateria de vassourinha: bumbo leve no 1 e 3, caixa no 2 e 4, chimbal em colcheias com swing.
    for (let beat = 0; beat < 4; beat++) {
      const t = b0 + beat;
      if (beat % 2 === 0) base.push(n(t, 1, 'bumbo', 0, 0.6));
      else base.push(n(t, 1, 'vassoura', 0, 0.5, 0.15));
      base.push(n(t, 0.5, 'chimbal', 0, 0.3, 0.3), n(t + 0.5, 0.5, 'chimbal', 0, 0.18, 0.3));
      // Camada: ganzá em semicolcheias e palmas no 2 e 4.
      for (let s = 0; s < 4; s++) camada.push(n(t + s * 0.25, 0.25, 'ganza', 0, s === 0 ? 0.32 : 0.2, -0.25));
      if (beat % 2 === 1) camada.push(n(t, 1, 'palma', 0, 0.42, 0.05));
    }
    // Viradinha da caixa no fim de cada frase de 4 compassos.
    if (bar % 4 === 3) for (const s of [3, 3.25, 3.5, 3.75]) camada.push(n(b0 + s, 0.25, 'vassoura', 0, 0.3 + (s - 3) * 0.4, 0.15));
  });
  return { name: o.name, bpm: o.bpm, swing: 0.08, bars: o.harmony.length, stems: { base, camada } };
}

/** Capítulo 1 (Caderno): piano de brinquedo e pizzicato, em Fá. */
const caderno = () =>
  bouncy({ name: 'caderno', bpm: 136, harmony: CADERNO_HARMONIA, melody: CADERNO_MELODIA, lead: 'piano', leadVel: 0.62, comp: 'pizz', compVel: 0.42, hold: 'clarinete' });

const G = C(43, 50, [59, 62, 67]);
const Em = C(40, 47, [59, 64, 67]);
const Cmaj = C(48, 43, [60, 64, 67]);
const D7g = C(38, 45, [60, 62, 66]);
const Am7g = C(45, 40, [60, 64, 67]);
const Cm = C(48, 43, [60, 63, 67]);
const E7 = C(40, 47, [59, 62, 68]);
const Am = C(45, 40, [60, 64, 69]);
const Bm7 = C(47, 42, [57, 62, 66]);

/**
 * Capítulo 2 (Partituras e mapas): o mesmo tema, em Sol, com assobio na melodia e sanfona no
 * lugar do pizzicato. Um pouco mais rápido: é o capítulo da viagem.
 */
const partituras = () =>
  bouncy({
    name: 'partituras',
    bpm: 140,
    harmony: [[G], [Em], [Cmaj], [D7g], [G], [Em], [Am7g, D7g], [G], [Cmaj], [Cm], [G], [E7], [Am], [D7g], [Bm7, E7], [Am7g, D7g]],
    melody: [
      [[0, 0.5, 74], [0.5, 0.5, 79], [1, 1, 83], [2, 0.5, 81], [2.5, 0.5, 79], [3, 1, 83]],
      [[0, 0.5, 83], [0.5, 0.5, 81], [1, 1, 79], [2, 1.5, 76]],
      [[0, 0.5, 76], [0.5, 0.5, 79], [1, 1, 84], [2, 0.5, 83], [2.5, 0.5, 81], [3, 1, 79]],
      [[0, 1, 78], [1, 0.5, 81], [1.5, 1.5, 86], [3, 1, 84]],
      [[0, 0.5, 83], [0.5, 0.5, 86], [1, 0.5, 83], [1.5, 0.5, 79], [2, 1, 86], [3, 1, 83]],
      [[0, 0.5, 88], [0.5, 0.5, 86], [1, 1, 83], [2, 0.5, 79], [2.5, 0.5, 76], [3, 1, 79]],
      [[0, 0.5, 81], [0.5, 0.5, 84], [1, 1, 88], [2, 0.5, 86], [2.5, 0.5, 84], [3, 0.5, 81], [3.5, 0.5, 78]],
      [[0, 1.5, 79], [2, 0.5, 83], [2.5, 0.5, 86], [3, 1, 88]],
      [[0, 1, 88], [1, 0.5, 86], [1.5, 0.5, 84], [2, 0.5, 79], [2.5, 0.5, 81], [3, 1, 84]],
      [[0, 1, 87], [1, 0.5, 86], [1.5, 0.5, 84], [2, 2, 79]],
      [[0, 0.5, 83], [0.5, 0.5, 86], [1, 1, 91], [2, 0.5, 90], [2.5, 0.5, 88], [3, 1, 86]],
      [[0, 0.5, 80], [0.5, 0.5, 83], [1, 1, 86], [2, 0.5, 88], [2.5, 0.5, 86], [3, 1, 83]],
      [[0, 1, 84], [1, 0.5, 83], [1.5, 0.5, 81], [2, 1, 76], [3, 1, 81]],
      [[0, 0.5, 86], [0.5, 0.5, 84], [1, 0.5, 81], [1.5, 0.5, 78], [2, 1, 81], [3, 1, 74]],
      [[0, 0.5, 78], [0.5, 0.5, 81], [1, 1, 86], [2, 0.5, 83], [2.5, 0.5, 80], [3, 1, 86]],
      [[0, 1, 84], [1, 1, 81], [2, 0.5, 78], [2.5, 0.5, 81], [3, 1, 86]],
    ],
    lead: 'assobio',
    leadVel: 0.5,
    comp: 'sanfona',
    compVel: 0.32,
    hold: 'celesta',
  });

const Am_ = C(45, 40, [57, 60, 64]);
const Cc = C(36, 43, [55, 60, 64]);
const Gm_ = C(43, 50, [55, 58, 62]);

/**
 * Capa: o tema devagar na caixinha de música, com celesta em arpejo e um baixo de mínimas.
 * Sem bateria e sem camada; é a página em branco antes de começar.
 */
function capa(): Track {
  const harmony = [F, Am_, Bb, Cc, F, Am_, Gm_, Cc, Dm, Am_, Bb, F, Gm_, Cc, F, C7];
  const melody: Melody = [
    [[0, 1, 81], [1, 1, 84], [2, 2, 89]],
    [[0, 1.5, 88], [1.5, 0.5, 84], [2, 2, 81]],
    [[0, 1, 86], [1, 1, 84], [2, 1, 82], [3, 1, 86]],
    [[0, 2, 84], [2, 1, 88], [3, 1, 91]],
    [[0, 1.5, 89], [1.5, 0.5, 88], [2, 2, 84]],
    [[0, 1, 84], [1, 1, 88], [2, 2, 93]],
    [[0, 1, 91], [1, 1, 89], [2, 1, 86], [3, 1, 82]],
    [[0, 4, 84]],
    [[0, 1, 86], [1, 1, 89], [2, 2, 93]],
    [[0, 1, 91], [1, 1, 88], [2, 2, 84]],
    [[0, 1.5, 89], [1.5, 0.5, 86], [2, 2, 82]],
    [[0, 1, 81], [1, 1, 84], [2, 2, 89]],
    [[0, 1, 82], [1, 1, 86], [2, 1, 91], [3, 1, 89]],
    [[0, 2, 88], [2, 1, 86], [3, 1, 84]],
    [[0, 2, 81], [2, 2, 84]],
    [[0, 2, 82], [2, 1, 79], [3, 1, 84]],
  ];
  const base: Note[] = [];
  harmony.forEach((ch, bar) => {
    const b0 = bar * 4;
    base.push(n(b0, 1.9, 'baixo', ch.root, 0.7), n(b0 + 2, 1.9, 'baixo', ch.fifth, 0.55));
    // Arpejo de celesta em semínimas, subindo e voltando.
    [0, 1, 2, 1].forEach((v, k) => base.push(n(b0 + k, 1, 'celesta', ch.voices[v]! + 12, k === 0 ? 0.36 : 0.26, -0.3)));
    base.push(n(b0 + 1, 0.5, 'pizz', ch.voices[2], 0.22, 0.35), n(b0 + 3, 0.5, 'pizz', ch.voices[1], 0.2, 0.35));
    for (const [beat, beats, midi] of melody[bar]!) base.push(n(b0 + beat, beats, 'caixinha', midi, 0.55, 0.1));
  });
  return { name: 'capa', bpm: 96, swing: 0.04, bars: 16, stems: { base } };
}

const DmB = C(38, 45, [53, 57, 62]);
const BbB = C(34, 41, [53, 58, 62]);
const A7B = C(33, 40, [55, 61, 64]);
const GmB = C(31, 38, [55, 58, 62]);
const EbB = C(39, 46, [55, 58, 63]);

/**
 * Chefe (Mata-Borrão): marcha de vilão engraçado em ré menor. Tuba e tímpano no chão, pizzicato
 * grave em colcheias, clarinete grave na melodia, bloco de madeira nos contratempos e o piano de
 * brinquedo espetando. A camada (da 2ª fase dele em diante) traz marimba nervosa, ganzá, palmas
 * e rufos de tímpano.
 */
function chefe(): Track {
  const harmony: Chord[][] = [
    [DmB], [DmB], [BbB], [A7B], [DmB], [GmB], [BbB, A7B], [DmB],
    [GmB], [DmB], [EbB], [A7B], [DmB], [BbB], [GmB, A7B], [A7B],
  ];
  const melody: Melody = [
    [[0, 0.5, 62], [0.5, 0.5, 65], [1, 1, 69], [2, 0.5, 68], [2.5, 0.5, 69], [3, 1, 65]],
    [[0, 0.5, 64], [0.5, 0.5, 65], [1, 2, 62]],
    [[0, 0.5, 70], [0.5, 0.5, 69], [1, 0.5, 67], [1.5, 0.5, 65], [2, 1, 67], [3, 1, 62]],
    [[0, 1, 61], [1, 1, 64], [2, 1, 69], [3, 1, 67]],
    [[0, 0.5, 74], [0.5, 0.5, 72], [1, 1, 69], [2, 0.5, 65], [2.5, 0.5, 69], [3, 1, 74]],
    [[0, 1, 70], [1, 0.5, 69], [1.5, 0.5, 67], [2, 2, 62]],
    [[0, 0.5, 65], [0.5, 0.5, 67], [1, 1, 70], [2, 1, 69], [3, 1, 73]],
    [[0, 2, 74], [2, 1, 69], [3, 1, 62]],
    [[0, 1, 67], [1, 1, 70], [2, 1, 74], [3, 0.5, 72], [3.5, 0.5, 70]],
    [[0, 1, 69], [1, 1, 65], [2, 2, 62]],
    [[0, 1, 67], [1, 1, 70], [2, 1, 75], [3, 1, 74]],
    [[0, 0.5, 73], [0.5, 0.5, 74], [1, 1, 76], [2, 1, 73], [3, 1, 69]],
    [[0, 1, 77], [1, 0.5, 76], [1.5, 0.5, 74], [2, 2, 69]],
    [[0, 1, 74], [1, 1, 70], [2, 1, 65], [3, 1, 70]],
    [[0, 0.5, 67], [0.5, 0.5, 70], [1, 1, 74], [2, 1, 73], [3, 1, 76]],
    [[0, 0.5, 69], [0.5, 0.5, 73], [1, 0.5, 76], [1.5, 0.5, 79], [2, 1, 81]],
  ];
  const base: Note[] = [];
  const camada: Note[] = [];
  harmony.forEach((chords, bar) => {
    const b0 = bar * 4;
    chords.forEach((ch, half) => {
      const span = 4 / chords.length;
      const at = b0 + half * span;
      for (let beat = 0; beat < span; beat++) {
        const t = at + beat;
        // Marcha: tuba no 1 e 3 (tônica, quinta), piano de brinquedo espetando no 2 e 4.
        if ((t - b0) % 2 === 0) base.push(n(t, 0.8, 'tuba', (t - b0) % 4 === 0 ? ch.root : ch.fifth, 0.9, -0.1));
        else ch.voices.forEach((v) => base.push(n(t + 0.5, 0.25, 'piano', v + 12, 0.18, 0.3)));
        // Pizzicato grave em colcheias.
        base.push(n(t, 0.5, 'pizz', ch.root + 12, 0.32, -0.3), n(t + 0.5, 0.5, 'pizz', ch.root + 12, 0.22, -0.3));
      }
      // Camada: marimba em semicolcheias, nervosa, no acorde.
      const arp = [ch.voices[0] + 12, ch.voices[2] + 12, ch.voices[1] + 12, ch.voices[2] + 12];
      for (let k = 0; k < span * 4; k++) camada.push(n(at + k * 0.25, 0.25, 'marimba', arp[k % 4]!, k % 4 === 0 ? 0.5 : 0.32, 0.45));
    });
    for (const [beat, beats, midi] of melody[bar]!) base.push(n(b0 + beat, beats, 'clarinete', midi, 0.75, 0.05));
    for (let beat = 0; beat < 4; beat++) {
      const t = b0 + beat;
      if (beat === 0) base.push(n(t, 1, 'timpano', harmony[bar]![0]!.root + 12, 0.7, -0.15));
      if (beat % 2 === 1) base.push(n(t, 1, 'vassoura', 0, 0.55, 0.15));
      else base.push(n(t, 1, 'bumbo', 0, 0.55));
      base.push(n(t + 0.5, 0.5, 'bloco', 84, 0.3, 0.35));
      for (let s = 0; s < 4; s++) camada.push(n(t + s * 0.25, 0.25, 'ganza', 0, s === 0 ? 0.3 : 0.18, -0.25));
      if (beat % 2 === 1) camada.push(n(t, 1, 'palma', 0, 0.4, 0.05));
    }
    // Rufo de tímpano no fim de cada frase.
    if (bar % 4 === 3) for (let s = 0; s < 8; s++) camada.push(n(b0 + 2 + s * 0.25, 0.25, 'timpano', 45, 0.25 + s * 0.06, -0.15));
  });
  return { name: 'chefe', bpm: 150, swing: 0, bars: 16, stems: { base, camada } };
}

export const TRACKS: Track[] = [caderno(), partituras(), chefe(), capa()];

export interface RenderedTrack {
  loopSeconds: number;
  stems: { base: [Float32Array, Float32Array]; camada?: [Float32Array, Float32Array] };
}

/** Toca cada camada, aplica o reverb da sala e dobra a cauda para o começo (loop sem emenda). */
export function renderTrack(track: Track, rand: () => number): RenderedTrack {
  const spb = 60 / track.bpm;
  const loopSeconds = track.bars * 4 * spb;
  const loopLen = Math.round(loopSeconds * RATE);
  const tail = 2.5;
  // Pré-rolagem: a nota adiantada pela humanização não perde o ataque; ela vai para o fim do loop.
  const lead = 0.05;
  const leadLen = Math.round(lead * RATE);
  const out = {} as RenderedTrack['stems'];
  for (const stem of ['base', 'camada'] as const) {
    const notes = track.stems[stem];
    if (!notes) continue;
    const [L, R] = render(notes, lead + loopSeconds + tail, spb, rand, track.swing, lead);
    const chans = [L, R].map((ch, i) => {
      const wet = reverb(ch, { size: 0.55 + i * 0.04, damp: 0.45, wet: 0.16, tail: 0 });
      const loop = new Float32Array(loopLen);
      for (let k = 0; k < wet.length; k++) loop[(((k - leadLen) % loopLen) + loopLen) % loopLen]! += wet[k]!;
      return loop;
    }) as [Float32Array, Float32Array];
    out[stem] = chans;
  }
  return { loopSeconds: loopLen / RATE, stems: out };
}
