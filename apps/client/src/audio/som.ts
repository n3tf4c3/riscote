import { MUSICAS, SONS, type MusicaNome, type SomNome } from './catalogo';

// Áudio do cliente: Web Audio com dois barramentos (música e efeitos) sob um volume geral.
// O navegador só libera o som depois de um gesto (clique ou tecla), então o contexto nasce no
// primeiro gesto e até lá tudo é ignorado em silêncio. Como os efeitos visuais, o som só lê o que a
// simulação já mostrou: nada aqui muda regra, posição ou tempo da partida.

const PREFS_KEY = 'riscote.som.v1';
/** Jogadores remotos soam mais baixo: com 5 na sala, o próprio boneco precisa se destacar. */
const REMOTE_GAIN = 0.55;
/** Quanto do panorama estéreo a posição na arena usa (0 = centro, 1 = um lado inteiro). */
const PAN_WIDTH = 0.6;
const MAX_VOICES = 6;
const MUSIC_FADE = 0.8;
const LAYER_FADE = 1.5;
/** Música enquanto toca uma vinheta ou o fim de jogo. */
const DUCKED = 0.3;

interface Prefs {
  music: number;
  sfx: number;
  /** Música e efeitos podem ser desligados um sem o outro; desligada, a música nem é baixada. */
  musicOn: boolean;
  sfxOn: boolean;
  muted: boolean;
}

const DEFAULT_PREFS: Prefs = { music: 0.5, sfx: 0.8, musicOn: true, sfxOn: true, muted: false };

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<Prefs> | null;
    const num = (v: unknown, d: number) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : d);
    return {
      music: num(raw?.music, DEFAULT_PREFS.music),
      sfx: num(raw?.sfx, DEFAULT_PREFS.sfx),
      musicOn: raw?.musicOn !== false,
      sfxOn: raw?.sfxOn !== false,
      muted: raw?.muted === true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export interface PlayOptions {
  /** Posição horizontal em pixels do mundo, para o panorama. */
  x?: number;
  /** Jogador que causou o som; os de outros jogadores soam mais baixo. */
  slot?: number;
  /** Multiplica o volume do catálogo. */
  volume?: number;
  /** Velocidade de reprodução (1 = original; também muda a altura). */
  rate?: number;
}

interface Playing {
  name: MusicaNome;
  out: GainNode;
  layer: GainNode;
  sources: AudioBufferSourceNode[];
}

class Som {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private lastAt = new Map<string, number>();
  private lastVariation = new Map<SomNome, number>();
  private voices = new Map<SomNome, number>();
  private holds = new Map<string, { src: AudioBufferSourceNode; gain: GainNode } | 'carregando'>();
  private prefs = loadPrefs();
  private readonly ext: 'ogg' | 'mp3';
  private playing: Playing | null = null;
  private wanted: MusicaNome | null = null;
  private layerOn = false;
  private ducked = false;
  /** Largura da arena em pixels do mundo, para o panorama. */
  private width = 0;
  /** Slot do próprio jogador; -1 fora de uma sala. */
  localSlot = -1;

  constructor() {
    const probe = typeof Audio === 'undefined' ? null : new Audio();
    this.ext = probe?.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';
    const unlock = () => {
      if (!this.unlock()) return;
      for (const type of ['pointerdown', 'keydown', 'touchend']) window.removeEventListener(type, unlock, true);
    };
    for (const type of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(type, unlock, true);
    // Aba escondida: o jogo congela junto, então a música também para.
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  get settings(): Readonly<Prefs> {
    return this.prefs;
  }

  /** Cria o contexto dentro do gesto do usuário. Devolve se o som ficou liberado. */
  private unlock(): boolean {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return true;
      const ctx = new Ctx({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.musicBus = ctx.createGain();
      this.sfxBus = ctx.createGain();
      // Compressor suave no fim: cinco jogadores atirando juntos não estouram a saída.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 8;
      limiter.ratio.value = 4;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(limiter).connect(ctx.destination);
      this.applyPrefs(true);
      for (const name of Object.keys(SONS) as SomNome[]) {
        for (let v = 1; v <= SONS[name].variations; v++) void this.load(`sfx/${name}-${v}`);
      }
      if (this.wanted && this.prefs.musicOn) this.startMusic(this.wanted);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
    return this.ctx.state === 'running' || this.ctx.state === 'suspended';
  }

  private load(path: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(path);
    if (!p) {
      const ctx = this.ctx!;
      p = fetch(`${import.meta.env.BASE_URL}audio/${path}.${this.ext}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} em ${path}`))))
        .then((data) => ctx.decodeAudioData(data))
        .catch((err: unknown) => {
          console.warn('som não carregou', path, err);
          return null;
        });
      this.buffers.set(path, p);
    }
    return p;
  }

  private applyPrefs(now = false): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = now ? 0 : 0.05;
    this.master.gain.setTargetAtTime(this.prefs.muted ? 0 : 1, t, ramp);
    // Volume em curva de potência: o meio do controle soa como metade.
    this.musicBus.gain.setTargetAtTime(this.prefs.musicOn ? this.prefs.music ** 2 : 0, t, ramp);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfxOn ? this.prefs.sfx ** 2 : 0, t, ramp);
  }

  setVolumes(change: Partial<Prefs>): void {
    this.prefs = { ...this.prefs, ...change };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      // Sem armazenamento: vale só até recarregar.
    }
    this.applyPrefs();
    // Música desligada para de tocar (e de baixar); religada, volta a que a cena pediu.
    if (change.musicOn === false) this.stopMusic();
    else if (change.musicOn && this.ctx && this.wanted && !this.playing) this.startMusic(this.wanted);
  }

  setArena(widthPx: number): void {
    this.width = widthPx;
  }

  /** Toca um efeito do catálogo; sem som liberado ou ainda carregando, não faz nada. */
  play(name: SomNome, opts: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.prefs.muted || !this.prefs.sfxOn) return;
    const spec = SONS[name];
    const now = performance.now();
    // O intervalo mínimo vale por jogador: o pulo de um amigo não engole o seu.
    const gapKey = opts.slot === undefined ? name : `${name}:${opts.slot}`;
    if (now - (this.lastAt.get(gapKey) ?? -Infinity) < spec.gapMs) return;
    if ((this.voices.get(name) ?? 0) >= MAX_VOICES) return;
    // Sorteia a variação sem repetir a anterior.
    let v = 1 + Math.floor(Math.random() * spec.variations);
    if (spec.variations > 1 && v === this.lastVariation.get(name)) v = (v % spec.variations) + 1;
    this.lastAt.set(gapKey, now);
    this.lastVariation.set(name, v);
    void this.buffers.get(`sfx/${name}-${v}`)?.then((buffer) => {
      // Ainda carregando quando o evento aconteceu: som atrasado confunde mais que silêncio.
      if (!buffer || performance.now() - now > 120) return;
      // Desvio pequeno de altura nos sons repetidos, para não soarem carimbados.
      const { src } = this.voice(ctx, buffer, name, { ...opts, rate: (opts.rate ?? 1) * (spec.variations > 1 ? 0.97 + Math.random() * 0.06 : 1) });
      this.voices.set(name, (this.voices.get(name) ?? 0) + 1);
      src.onended = () => this.voices.set(name, Math.max(0, (this.voices.get(name) ?? 1) - 1));
      src.start();
    });
  }

  /** Fonte → ganho (catálogo, remoto) → panorama → barramento de efeitos. */
  private voice(ctx: AudioContext, buffer: AudioBuffer, name: SomNome, opts: PlayOptions): { src: AudioBufferSourceNode; gain: GainNode } {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = opts.rate ?? 1;
    const gain = ctx.createGain();
    const remote = opts.slot !== undefined && this.localSlot >= 0 && opts.slot !== this.localSlot;
    gain.gain.value = SONS[name].volume * (opts.volume ?? 1) * (remote ? REMOTE_GAIN : 1);
    let node: AudioNode = src.connect(gain);
    if (opts.x !== undefined && this.width > 0 && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, (opts.x / this.width) * 2 - 1)) * PAN_WIDTH;
      node = node.connect(pan);
    }
    node.connect(this.sfxBus);
    return { src, gain };
  }

  /**
   * Som contínuo (recarga no tubo): toca em loop enquanto `on` for verdadeiro, identificado por
   * `key` (um por jogador, por exemplo). Chamar a cada quadro é barato.
   */
  hold(name: SomNome, key: string, on: boolean, opts: PlayOptions = {}): void {
    const ctx = this.ctx;
    const cur = this.holds.get(key);
    if (on === (cur !== undefined)) return;
    if (!on) {
      this.holds.delete(key);
      if (ctx && cur && cur !== 'carregando') {
        cur.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
        cur.src.stop(ctx.currentTime + 0.3);
      }
      return;
    }
    if (!ctx || ctx.state !== 'running' || this.prefs.muted || !this.prefs.sfxOn) return;
    this.holds.set(key, 'carregando');
    void this.buffers.get(`sfx/${name}-1`)?.then((buffer) => {
      if (!buffer || this.holds.get(key) !== 'carregando') return;
      const v = this.voice(ctx, buffer, name, opts);
      v.src.loop = true;
      v.src.start();
      this.holds.set(key, v);
    });
  }

  /** Solta todos os sons contínuos (a cena recomeçou). */
  releaseHolds(): void {
    for (const key of [...this.holds.keys()]) this.hold('recarga', key, false);
  }

  /** Troca a música (null = silêncio), com fade. Chamar a cada quadro é barato. */
  music(name: MusicaNome | null): void {
    if (name === this.wanted) return;
    this.wanted = name;
    const ctx = this.ctx;
    if (!ctx) return;
    this.stopMusic();
    if (name && this.prefs.musicOn) this.startMusic(name);
  }

  /** Camada de intensidade (o borrão chegou, o chefe): entra e sai devagar. */
  intensity(on: boolean): void {
    if (on === this.layerOn) return;
    this.layerOn = on;
    if (this.ctx && this.playing) this.playing.layer.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, LAYER_FADE / 3);
  }

  /** Abaixa a música para uma vinheta ou o fim de jogo. */
  duck(on: boolean): void {
    if (on === this.ducked) return;
    this.ducked = on;
    if (this.ctx && this.playing) this.playing.out.gain.setTargetAtTime(on ? DUCKED : 1, this.ctx.currentTime, 0.25);
  }

  private stopMusic(): void {
    const ctx = this.ctx;
    const old = this.playing;
    if (!ctx || !old) return;
    this.playing = null;
    old.out.gain.cancelScheduledValues(ctx.currentTime);
    old.out.gain.setTargetAtTime(0, ctx.currentTime, MUSIC_FADE / 3);
    for (const s of old.sources) s.stop(ctx.currentTime + MUSIC_FADE * 1.5);
  }

  private startMusic(name: MusicaNome): void {
    const ctx = this.ctx!;
    // A capa não tem camada: nada de pedir um arquivo que não existe.
    const layerLoad = MUSICAS[name].layers ? this.load(`musica/${name}-camada`) : Promise.resolve(null);
    void Promise.all([this.load(`musica/${name}-base`), layerLoad]).then(([base, layerBuf]) => {
      // A música pode ter mudado enquanto carregava.
      if (this.wanted !== name || this.playing || !base || !this.prefs.musicOn) return;
      const out = ctx.createGain();
      const layer = ctx.createGain();
      out.gain.value = 0;
      out.gain.setTargetAtTime(this.ducked ? DUCKED : 1, ctx.currentTime, MUSIC_FADE / 3);
      layer.gain.value = this.layerOn ? 1 : 0;
      out.connect(this.musicBus);
      layer.connect(out);
      // As duas camadas começam juntas e têm o mesmo comprimento: ficam sempre no compasso.
      const when = ctx.currentTime + 0.05;
      const loopEnd = MUSICAS[name].loopSeconds;
      const sources: AudioBufferSourceNode[] = [];
      for (const [buffer, dest] of [[base, out], [layerBuf, layer]] as const) {
        if (!buffer) continue;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.loopStart = 0;
        src.loopEnd = Math.min(loopEnd, buffer.duration);
        src.connect(dest);
        src.start(when);
        sources.push(src);
      }
      this.playing = { name, out, layer, sources };
    });
  }
}

export const som = new Som();
