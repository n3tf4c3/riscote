// Gera os masters do áudio (WAV 48 kHz, 24 bits) em audio/masters/, o catálogo que o cliente usa
// e um relatório de verificação (pico, nível médio, silêncio no começo, saturação e emenda do loop).
//
//   node audio/gerar.ts            todos os sons
//   node audio/gerar.ts tiro pulo  só os nomes indicados (o catálogo sai completo do mesmo jeito)
//
// Depois, `bash audio/codificar.sh` converte os masters para OGG e MP3 em apps/client/public/audio/.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RATE, db, normalize, peak, rms, fades, trimTail, rng } from './dsp.ts';
import { SFX } from './sfx.ts';
import { TRACKS, renderTrack } from './musica.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const MASTERS = join(ROOT, 'masters');
const CATALOG = join(ROOT, '..', 'apps', 'client', 'src', 'audio', 'catalogo.ts');
const only = new Set(process.argv.slice(2));

/** WAV PCM de 24 bits, intercalando os canais. */
function writeWav(path: string, channels: Float32Array[]): void {
  const frames = channels[0]!.length;
  const bytes = frames * channels.length * 3;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels.length, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * channels.length * 3, 28);
  buf.writeUInt16LE(channels.length * 3, 32);
  buf.writeUInt16LE(24, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (const ch of channels) {
      const v = Math.max(-1, Math.min(1, ch[i]!));
      buf.writeIntLE(Math.round(v * 8388607), o, 3);
      o += 3;
    }
  }
  writeFileSync(path, buf);
}

const dbfs = (v: number) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf');

/** Tempo até o som passar de -40 dBFS: atraso perceptível se for grande. */
function leadMs(x: Float32Array): number {
  const floor = db(-40);
  let i = 0;
  while (i < x.length && Math.abs(x[i]!) < floor) i++;
  return (i / RATE) * 1000;
}

const report: string[] = [];
mkdirSync(join(MASTERS, 'sfx'), { recursive: true });
mkdirSync(join(MASTERS, 'musica'), { recursive: true });

/**
 * Emenda de um loop: o salto entre a última e a primeira amostra, na posição que ocupa entre
 * todos os saltos do próprio som. Abaixo de ~99% é um passo comum, não um estalo.
 */
function seamPercentile(ch: Float32Array): number {
  const seam = Math.abs(ch[0]! - ch[ch.length - 1]!);
  let below = 0;
  for (let i = 1; i < ch.length; i++) if (Math.abs(ch[i]! - ch[i - 1]!) < seam) below++;
  return (100 * below) / (ch.length - 1);
}

for (const s of SFX) {
  for (let v = 0; v < s.variations; v++) {
    if (only.size && !only.has(s.name)) continue;
    // Semente fixa por nome e variação: o mesmo código refaz o mesmo arquivo.
    const seed = [...s.name].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) + v * 7919;
    const raw = s.build(rng(seed), v);
    const clipped = raw.reduce((k, x) => k + (Math.abs(x) > 1 ? 1 : 0), 0);
    let x: Float32Array;
    let extra: string;
    if (s.loopSeconds) {
      // Som contínuo: o que passa do comprimento volta para o começo.
      const loop = new Float32Array(Math.round(s.loopSeconds * RATE));
      for (let i = 0; i < raw.length; i++) loop[i % loop.length]! += raw[i]!;
      x = normalize(loop, -1);
      extra = `loop, emenda no percentil ${seamPercentile(x).toFixed(1)}`;
    } else {
      x = fades(trimTail(normalize(raw, -1)), 0.5, 0);
      extra = `início ${leadMs(x).toFixed(1)} ms`;
    }
    writeWav(join(MASTERS, 'sfx', `${s.name}-${v + 1}.wav`), [x]);
    report.push(
      `${`${s.name}-${v + 1}`.padEnd(18)} ${(x.length / RATE).toFixed(3)} s  pico ${dbfs(peak(x))} dBFS  RMS ${dbfs(rms(x))} dBFS  ` +
        `${extra}  acima de 0 dBFS antes de normalizar: ${clipped}`,
    );
  }
}

const tracks: Record<string, { loopSeconds: number; layers: boolean }> = {};
for (const t of TRACKS) {
  const layers = t.stems.camada !== undefined;
  if (only.size && !only.has(t.name)) {
    tracks[t.name] = { loopSeconds: Math.round(((t.bars * 4 * 60) / t.bpm) * RATE) / RATE, layers };
    continue;
  }
  const r = renderTrack(t, rng(0x5eed + t.bpm));
  tracks[t.name] = { loopSeconds: r.loopSeconds, layers };
  // As camadas recebem o mesmo ganho. A base de toda trilha fica no mesmo nível médio (-19 dBFS RMS),
  // para a troca de trilha não mudar o volume, desde que a soma das camadas não passe de -1 dBFS.
  const camada = r.stems.camada;
  const sum = camada ? r.stems.base.map((ch, i) => ch.map((v, k) => v + camada[i]![k]!)) : r.stems.base;
  const baseRms = Math.sqrt((rms(r.stems.base[0]) ** 2 + rms(r.stems.base[1]) ** 2) / 2);
  const g = Math.min(db(-1) / Math.max(peak(sum[0]!), peak(sum[1]!)), db(-19) / baseRms);
  for (const stem of ['base', 'camada'] as const) {
    const pair = r.stems[stem];
    if (!pair) continue;
    const chans = pair.map((ch) => ch.map((v) => v * g));
    writeWav(join(MASTERS, 'musica', `${t.name}-${stem}.wav`), chans);
    report.push(
      `${`${t.name}-${stem}`.padEnd(18)} ${r.loopSeconds.toFixed(3)} s  pico ${dbfs(Math.max(peak(chans[0]!), peak(chans[1]!)))} dBFS  ` +
        `RMS ${dbfs(rms(chans[0]!))} dBFS  emenda no percentil ${chans.map((ch) => seamPercentile(ch).toFixed(1)).join(' / ')} dos saltos`,
    );
  }
}

const sons = SFX.map((s) => `  '${s.name}': { variations: ${s.variations}, volume: ${s.volume}, gapMs: ${s.gapMs}, loop: ${s.loopSeconds !== undefined} },`).join('\n');
const musicas = Object.entries(tracks)
  .map(([name, m]) => `  '${name}': { loopSeconds: ${m.loopSeconds.toFixed(6)}, layers: ${m.layers} },`)
  .join('\n');
mkdirSync(dirname(CATALOG), { recursive: true });
writeFileSync(
  CATALOG,
  `// Gerado por audio/gerar.ts a partir de audio/sfx.ts e audio/musica.ts; não edite à mão.\n\n` +
    `export const SONS = {\n${sons}\n} as const;\n\nexport const MUSICAS = {\n${musicas}\n} as const;\n\n` +
    `export type SomNome = keyof typeof SONS;\nexport type MusicaNome = keyof typeof MUSICAS;\n`,
);
console.log(report.join('\n'));
