import * as Phaser from 'phaser';
import {
  ARENAS,
  BOSS_ARENAS,
  BOSS_RULES,
  BORRAO_SIZE,
  BTN_ATTACK,
  EMPTY,
  SOLID,
  ENEMY_BORRACHA,
  ENEMY_CARACOL,
  ENEMY_CESTO,
  ENEMY_GRILO,
  ENEMY_OURICO,
  ENEMY_CORUJA,
  ENEMY_DICIONARIO,
  ENEMY_ENCICLOPEDIA,
  ENEMY_MARCADOR,
  ENEMY_MORCEGO,
  ENEMY_PERGAMINHO,
  ENEMY_BESOURO,
  ENEMY_CHAFARIZ,
  ENEMY_SAPO,
  ENEMY_SINO,
  ENEMY_SOMBRINHA,
  ENEMY_VAGALUME,
  ENEMY_AVIAO,
  ENEMY_BALAO,
  ENEMY_COMPASSO,
  ENEMY_CORNETA,
  ENEMY_FURADEIRA,
  ENEMY_IMA,
  ENEMY_MARTELO,
  ENEMY_MOBILE,
  ENEMY_MOLA,
  ENEMY_PRUMO,
  ENEMY_RAPOSA,
  ENEMY_TORREAO,
  SPIT_BOLHA,
  SPIT_GOTINHA,
  SPIT_ORVALHO,
  SPIT_BROCA,
  SPIT_ESTILHACO,
  SPIT_ESTRELA,
  SPIT_FLECHA,
  SPIT_NOTA,
  SPIT_PARAFUSO,
  towerSpots,
  geyserBox,
  SPIT_GRAVETO,
  SPIT_LETRA,
  SPIT_PAGINA,
  SPIT_SEIVA,
  beamLine,
  floorSpan,
  unrollBox,
  cellAt,
  enemyRole,
  ENEMY_BORRAO,
  ENEMY_FIANDEIRA,
  ENEMY_GRAMPO,
  ENEMY_SALTADOR,
  ENEMY_SIZE,
  ENEMY_TINTEIRO,
  MODE_ROLL,
  MODE_WALK,
  SKILL_ACT,
  SKILL_NONE,
  SKILL_REST,
  SKILL_WARN,
  PHASE_CHAPTER,
  PHASE_CLEAR,
  PHASE_LOBBY,
  PHASE_PLAYING,
  PHASE_RESTART,
  PHASE_TURN,
  ITEM_INVENCIVEL,
  POWER_MAX_LEVEL,
  RULES,
  TICK_DT,
  TILE,
  tubeRect,
  warnTimes,
  type WarnTimes,
} from '@riscote/shared';
import { DropWatcher, EnemyAnimator, RiscoteAnimator, type EraserFront, type Motion } from './anim';
import { bossSpecs } from './art/boss';
import { PERGAMINHO as PERGAMINHO_CSS, PERGAMINHO_SOMBRA as PERGAMINHO_SOMBRA_CSS } from './art/biblioteca-poderes';
import { AGUA as AGUA_CSS, AGUA_SOMBRA as AGUA_SOMBRA_CSS, ESPUMA as ESPUMA_CSS } from './art/jardim-poderes';
import { METAL as METAL_CSS, METAL_SOMBRA as METAL_SOMBRA_CSS } from './art/oficina-poderes';
import { capituloDe, visualDe } from './art/capitulos';
import { Ambiente } from './ambiente';
import { ITEM_LIQUIDS } from './art/items';
import { ArtLayer } from './art/layer';
import { RES, arenaSpecs, artSize, commonSpecs, loadArt, protecaoKey, riscoteKey, type ArtSpec } from './art/textures';
import { ROUNDED } from './art/capa';
import {
  INK,
  PLAYER_COLORS,
  drawArena,
  drawDrop,
  drawEnemy,
  drawItem,
  drawPageTurn,
  drawPlayerFull,
  drawPlayerOverlay,
  playerAlpha,
  type PlayerLook,
} from './draw';
import { som } from './audio/som';
import type { MusicaNome } from './audio/catalogo';
import { BossView, drawBossTurn } from './bossView';
import { Effects } from './fx';
import type { InputSource } from './input';
import type { LocalGuest, OnlineSession, PlayerView } from './net';

const MAX_FRAME = 0.25;
const GREY = 0x888888;
/** Quanto tempo a pose de tiro fica na tela depois do disparo. */
const SHOT_POSE_MS = 160;
/** Centro das auras acima dos pés: o meio do desenho do riscote, que é mais alto que a caixa. */
const AURA_CENTER = 22;
const STAR_GOLD = 0xe8b400;

const DEPTH_ARENA = 0;
/** Efeitos atrás do contorno das plataformas e dos perigos (plano, seção 3). */
const DEPTH_FX = 0.5;
const DEPTH_PLATFORMS = 0.8;
/** Camadas de parallax: longe e meio atrás dos efeitos; a frente sobre as paredes, atrás de itens e bonecos. */
const DEPTH_LONGE = 0.1;
const DEPTH_MEIO = 0.2;
/** Folhas, poeira e vaga-lumes: na frente do meio, atrás dos efeitos e das plataformas. */
const DEPTH_AMBIENTE = 0.3;
const DEPTH_FRENTE = 0.85;
/** Quão depressa as camadas alcançam a equipe (por segundo). */
const PARALLAX_RATE = 1.6;
/**
 * Na virada de página as camadas da folha que sai correm para a esquerda em velocidades diferentes
 * (fração da largura no fim da virada): o fundo devagar, a frente depressa. A folha nova, chegando
 * pela direita, cobre sempre mais do que elas andaram.
 */
/**
 * Trilha de cada capítulo, na ordem de `CHAPTERS` (2026-11-04): Caderno, Floresta Encantada,
 * Biblioteca dos Sonhos, Jardim das Lanternas, Oficina Mágica e Castelo das Nuvens. A `partituras`
 * fica no catálogo sem capítulo (era a do antigo capítulo 2, Partituras e mapas).
 */
const TRILHAS: readonly MusicaNome[] = ['caderno', 'floresta', 'biblioteca', 'jardim', 'oficina', 'castelo'];

const VIRADA: Record<string, number> = { longe: 0.18, meio: 0.32, frente: 0.55 };
const DEPTH_ITEM = 1;
const DEPTH_ENEMY = 2;
const DEPTH_PLAYER = 3;
const DEPTH_FX_FRONT = 3.8;
const DEPTH_OVERLAY = 4;
const DEPTH_BANNER = 5;

/** Tapete do pergaminho, nas cores da ponta enrolada (`biblioteca-poderes.ts`), e o facho da coruja (o miolo e o brilho em volta). */
const PERGAMINHO = parseInt(PERGAMINHO_CSS.slice(1), 16);
const PERGAMINHO_SOMBRA = parseInt(PERGAMINHO_SOMBRA_CSS.slice(1), 16);
const FACHO = 0xfff6c8;
const FACHO_BRILHO = 0xffd84a;
/** Placar do alto: o coração das vidas e o papel das etiquetas e dos pontos vazios. */
const HEART = 0xe0313f;
const PAPER_HUD = 0xfffaf0;
/** A água do Jardim (jato do chafariz, gotas): as cores de `jardim-poderes.ts`. */
const AGUA = parseInt(AGUA_CSS.slice(1), 16);
const AGUA_SOMBRA = parseInt(AGUA_SOMBRA_CSS.slice(1), 16);
const ESPUMA = parseInt(ESPUMA_CSS.slice(1), 16);
/** O clarão do vaga-lume. */
const CLARAO = 0xfff3a0;
/** O braço do compasso e as faíscas de parafuso e broca: as cores de `oficina-poderes.ts`. */
const METAL = parseInt(METAL_CSS.slice(1), 16);
const METAL_SOMBRA = parseInt(METAL_SOMBRA_CSS.slice(1), 16);
/** O que sobra de uma página ou letra que se desfaz. */
const PAPEL_PICADO = 0xfff6e0;

/** Desenho da tinta subindo no corpo de cada tipo (a opacidade acompanha o encharcamento). */
const SOAK_KEYS: Record<number, string> = {
  [ENEMY_SALTADOR]: 'saltador-tinta',
  [ENEMY_GRAMPO]: 'grampo-tinta',
  [ENEMY_FIANDEIRA]: 'fiandeira-tinta',
  [ENEMY_TINTEIRO]: 'tinteiro-tinta',
  [ENEMY_BORRACHA]: 'borracha-tinta',
};

/** Dicas da primeira fase de cada capítulo: uma por vez, até a equipe chutar a primeira bola. */
const HINTS = [
  (attack: string) => `Atire tinta (${attack}) até o bicho virar bola`,
  () => 'Encoste na bola e atire de novo: é o chute!',
] as const;

/** Página de chefe (de qualquer capítulo). */
function isBossPage(arenaId: string): boolean {
  return BOSS_ARENAS.some((a) => a.id === arenaId);
}

/** Modo online: o próprio boneco é previsto; inimigos, gotas e os outros chegam interpolados do servidor. */
export class OnlineScene extends Phaser.Scene {
  private acc = 0;
  /** Posição prevista no tick anterior de cada jogador a mais nesta tela (para suavizar entre ticks). */
  private readonly guestPrev = new WeakMap<OnlineSession, { x: number; y: number }>();
  private prevX = 0;
  private prevY = 0;
  private prevButtons = 0;
  private lastFrame = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private fxBack!: Phaser.GameObjects.Graphics;
  private fxFront!: Phaser.GameObjects.Graphics;
  /** Tapete do pergaminho e facho da coruja: atrás de inimigos e bonecos, na frente das plataformas. */
  private poderes!: Phaser.GameObjects.Graphics;
  /** Vidas mostradas no placar do quadro anterior (-1: placar escondido). */
  private hudLives = -1;
  private banner!: Phaser.GameObjects.Text;
  private bannerShown = '';
  /** Arte de pincel; enquanto as texturas não ficam prontas, a cena desenha o greybox. */
  private art: ArtLayer | null = null;
  /** Só na página do chefe. */
  private bossView: BossView | null = null;
  private generation = 0;
  /** Último disparo visto de cada jogador (por slot), para a pose de tiro. */
  private shotAt: number[] = [];
  /** Último brilho da aura dourada de cada jogador (por slot). */
  private sparkAt: number[] = [];
  private fx = new Effects();
  private riscotes = new RiscoteAnimator(this.fx);
  private warn: WarnTimes = warnTimes('medio');
  private enemyAnim = new EnemyAnimator(this.fx, ENEMY_SIZE * TILE, BORRAO_SIZE * TILE, ARENAS[0]!, this.warn);
  private dropWatch = new DropWatcher(this.fx, RULES.dropSize * TILE);
  /** Idade de cada mancha no quadro anterior: respingo ao surgir e ao ficar perigosa. */
  private stainAges = new Map<string, number>();
  /** Cuspes do tinteiro no quadro anterior: direção do desenho e o respingo quando somem. */
  /** `bits`: cor do que sobra quando some (papel ou água); 0 = respingo de nanquim. */
  private spits = new Map<string, { x: number; y: number; dir: number; bits: number; angle: number }>();
  private hint!: Phaser.GameObjects.Text;
  /** Próxima dica da fase 1 (HINTS.length = já chutaram; sem dicas). */
  private hintStep: number = HINTS.length;
  /** Itens na tela no quadro anterior, para o brilho de quando alguém pega. */
  private items = new Map<string, { x: number; y: number; kind: number; ttl: number }>();
  /** Fase no quadro anterior, para as vinhetas de arena limpa e a virada de página. */
  private shownPhase = -1;
  /** Camadas de parallax do cenário (só nos temas com profundidade) e o deslocamento suavizado (−1 a 1). */
  private camadas: Array<{ img: Phaser.GameObjects.Image; amp: number; x0: number; y0: number; virada: number }> = [];
  private ambiente: Ambiente | null = null;
  private parallax = { x: 0, y: 0 };
  /** Proteção de cada jogador (por slot) no quadro anterior: o som de quando ela quebra. */
  private hpSeen: number[] = [];
  /** Tinta do próprio jogador no quadro anterior e quando ela subiu pela última vez (recarga no tubo). */
  private inkSeen = 0;
  private inkRiseAt = -Infinity;

  constructor(
    private readonly ctx: {
      session: () => OnlineSession | null;
      /** Jogadores a mais nesta tela, cada um com o seu controle. */
      guests?: () => readonly LocalGuest[];
      input: InputSource;
      /** Progresso da arte que a arena precisa para sair do greybox. */
      loading?: (done: number, total: number) => void;
    },
  ) {
    super('online');
  }

  create(): void {
    const session = this.ctx.session();
    if (!session) return;
    const arena = session.arena;
    const w = arena.cols * TILE;
    const h = arena.rows * TILE;
    // Mundo em pixels do jogo; a tela tem RES vezes mais pixels para a arte sair nítida.
    this.cameras.main.setZoom(RES).centerOn(w / 2, h / 2);
    const showTubes = session.state.difficulty === 'dificil';
    const greybox = drawArena(this, arena, showTubes).setDepth(DEPTH_ARENA);
    this.gfx = this.add.graphics().setDepth(DEPTH_OVERLAY);
    this.fxBack = this.add.graphics().setDepth(DEPTH_FX);
    this.fxFront = this.add.graphics().setDepth(DEPTH_FX_FRONT);
    this.poderes = this.add.graphics().setDepth(DEPTH_ITEM + 0.1);
    this.banner = this.add
      // Contorno branco, como as etiquetas da interface: legível sobre qualquer coisa sem uma caixa cobrindo as plataformas.
      .text(w / 2, TILE * 1.5, '', {
        fontFamily: ROUNDED,
        fontSize: '20px',
        color: '#1f2433',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#ffffff',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setResolution(RES)
      .setDepth(DEPTH_BANNER);
    this.hint = this.add
      .text(w / 2, h - TILE * 0.35, '', {
        fontFamily: ROUNDED,
        fontSize: '12px',
        color: '#1f2433',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#ffffff',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setResolution(RES)
      .setDepth(DEPTH_BANNER);
    this.hintStep = arena.stage?.hints ? 0 : HINTS.length;
    this.bannerShown = '';
    this.acc = 0;
    this.prevX = session.local.x;
    this.prevY = session.local.y;
    this.lastFrame = performance.now();
    this.shotAt = [];
    this.fx = new Effects();
    this.riscotes = new RiscoteAnimator(this.fx);
    this.warn = warnTimes(session.difficulty);
    this.enemyAnim = new EnemyAnimator(this.fx, ENEMY_SIZE * TILE, BORRAO_SIZE * TILE, arena, this.warn);
    this.stainAges.clear();
    this.spits.clear();
    this.dropWatch = new DropWatcher(this.fx, RULES.dropSize * TILE);
    this.items.clear();
    this.shownPhase = session.state.phase;
    this.hpSeen = [];
    this.inkSeen = session.me?.ink ?? 0;
    this.inkRiseAt = -Infinity;
    som.releaseHolds();
    som.setArena(w);
    som.localSlot = session.slot;
    // Cenário, inimigos e chefe vestem a roupa do capítulo; as regras são as mesmas.
    const visual = visualDe(arena.id);
    const bossPage = isBossPage(arena.id);
    this.bossView = bossPage ? new BossView(this, this.fx, arena, { boss: DEPTH_ENEMY - 0.2, hazard: DEPTH_ENEMY + 0.4, text: DEPTH_BANNER }, visual.chefe) : null;

    this.art = null;
    const generation = ++this.generation;
    const common = [...commonSpecs(PLAYER_COLORS, visual.pele), ...(visual.poderes?.() ?? []), ...(bossPage ? bossSpecs(visual.chefe) : [])];
    // Primeiro a variação 0 de cada desenho; as outras da linha viva carregam depois, sem segurar o jogo.
    const first = common.filter((s) => !s.key.includes('~'));
    const later = common.filter((s) => s.key.includes('~'));
    // `?tema=floresta` veste a arena com outro tema (para ver os cenários novos); só muda o desenho.
    const temaPedido = new URLSearchParams(location.search).get('tema') ?? visual.tema;
    const ground = arenaSpecs(arena, temaPedido);
    this.camadas = [];
    this.parallax = { x: 0, y: 0 };
    this.ambiente = new Ambiente(this, ground.camadas.length > 0 ? (temaPedido ?? '') : '', w, h, DEPTH_AMBIENTE);
    const baseTubo = showTubes ? ground.baseTubo : null;
    // A arena vem antes dos bonecos: é ela que tira a tela do greybox.
    loadArt(this.textures, [ground.fundo, ground.plataformas, ...ground.camadas.map((c) => c.spec), ...(baseTubo ? [baseTubo] : []), ...first], (done, total) => {
      if (generation === this.generation) this.ctx.loading?.(done, total);
    })
      .then(() => {
        // A cena pode ter recomeçado (outra arena) enquanto as texturas carregavam.
        if (generation !== this.generation) return;
        greybox.destroy();
        this.add.image(0, 0, ground.fundo.key).setOrigin(0).setDisplaySize(w, h).setDepth(DEPTH_ARENA);
        this.add.image(0, 0, ground.plataformas.key).setOrigin(0).setDisplaySize(w, h).setDepth(DEPTH_PLATFORMS);
        this.camadas = ground.camadas.map((c) => {
          const size = artSize(c.spec);
          const depth = c.nome === 'frente' ? DEPTH_FRENTE : c.nome === 'meio' ? DEPTH_MEIO : DEPTH_LONGE;
          const img = this.add.image(-c.margem, -c.margem, c.spec.key).setOrigin(0).setDisplaySize(size.w, size.h).setDepth(depth);
          return { img, amp: c.amp, x0: -c.margem, y0: -c.margem, virada: VIRADA[c.nome] ?? 0 };
        });
        const tube = common.find((s) => s.key === 'tubo');
        for (const t of showTubes && tube ? arena.tubes : []) this.placeTube(tube as ArtSpec, tubeRect(t), baseTubo);
        this.art = new ArtLayer(this, common);
        return loadArt(this.textures, later);
      })
      .catch((err: unknown) => {
        console.warn('arte não carregou; seguindo no greybox', err);
        if (generation === this.generation) this.ctx.loading?.(1, 1);
      });
  }

  /**
   * Parallax com a câmera parada: as camadas seguem, suavizado, o centro de quem está na sala.
   * O longe acompanha a equipe e a frente vai contra; a arena jogável nunca se move.
   */
  private moveParallax(session: OnlineSession, remotes: readonly PlayerView[], local: { x: number; y: number } | null, dt: number, turn: number): void {
    if (this.camadas.length === 0) return;
    const team = remotes.filter((p) => !p.away).map((p) => ({ x: p.x, y: p.y }));
    if (local) team.push(local);
    const w = session.arena.cols * TILE;
    const h = session.arena.rows * TILE;
    let tx = 0;
    let ty = 0;
    if (team.length > 0) {
      const cx = team.reduce((s, p) => s + p.x, 0) / team.length;
      const cy = team.reduce((s, p) => s + p.y, 0) / team.length;
      tx = Phaser.Math.Clamp((cx - w / 2) / (w / 2), -1, 1);
      ty = Phaser.Math.Clamp((cy - h / 2) / (h / 2), -1, 1);
    }
    const k = 1 - Math.exp(-dt * PARALLAX_RATE);
    this.parallax.x += (tx - this.parallax.x) * k;
    this.parallax.y += (ty - this.parallax.y) * k;
    // Meio pixel do mundo é um pixel da tela (RES 2): sem tremido de subpixel.
    const snap = (v: number) => Math.round(v * RES) / RES;
    for (const c of this.camadas) {
      c.img.setPosition(snap(c.x0 + this.parallax.x * c.amp - turn * w * c.virada), snap(c.y0 + this.parallax.y * c.amp * 0.5));
    }
  }

  private placeTube(tube: ArtSpec, r: { x: number; y: number; w: number; h: number }, base: ArtSpec | null): void {
    if (base) {
      const b = artSize(base);
      this.add.image(r.x + r.w / 2, r.y + r.h, base.key).setOrigin(base.ox, base.oy).setDisplaySize(b.w, b.h).setDepth(DEPTH_PLATFORMS - 0.01);
    }
    const size = artSize(tube);
    this.add
      .image(r.x + r.w / 2, r.y + r.h, 'tubo')
      .setOrigin(tube.ox, tube.oy)
      .setDisplaySize(size.w, size.h)
      .setDepth(DEPTH_PLATFORMS);
  }

  update(_time: number, deltaMs: number): void {
    const session = this.ctx.session();
    if (!session || !this.gfx) return;

    const now = performance.now();
    const dt = Math.min(MAX_FRAME, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.acc = Math.min(this.acc + deltaMs / 1000, MAX_FRAME);
    const buttons = this.ctx.input.buttons();
    const pressed = buttons & BTN_ATTACK && !(this.prevButtons & BTN_ATTACK);
    if (pressed) this.shotAt[session.slot] = now;
    this.prevButtons = buttons;
    // Jogadores a mais nesta tela: cada um com o controle dele, no mesmo passo fixo do primeiro.
    const guests = this.ctx.guests?.() ?? [];
    const guestButtons = guests.map((guest) => this.ctx.input.padButtons(guest.pad));
    while (this.acc >= TICK_DT) {
      this.prevX = session.local.x;
      this.prevY = session.local.y;
      session.tick(buttons);
      guests.forEach((guest, i) => {
        this.guestPrev.set(guest.session, { x: guest.session.local.x, y: guest.session.local.y });
        guest.session.tick(guestButtons[i]!);
      });
      this.acc -= TICK_DT;
    }

    const state = session.state;
    const g = this.gfx.clear();
    this.poderes.clear();
    const inkGauge = state.difficulty === 'dificil';
    const live = state.phase === PHASE_PLAYING || state.phase === PHASE_CLEAR;
    const alpha = this.acc / TICK_DT;
    // Os jogadores desta tela aparecem pela previsão deles, sem o atraso de quem está longe.
    const here = new Map(guests.map((guest) => [guest.session.room.sessionId, guest.session]));
    const remotes = session.remotePlayers(now).map((r) => {
      const own = here.get(r.id);
      if (!own) return r;
      const st = own.local;
      const prev = this.guestPrev.get(own) ?? st;
      return { ...r, x: prev.x + (st.x - prev.x) * alpha, y: prev.y + (st.y - prev.y) * alpha, facing: st.facing, vx: st.vx, vy: st.vy, onGround: st.onGround };
    });
    const drops = session.dropViews(now);
    const enemies = session.enemyViews(now);
    const me = session.me;
    const local = session.local;
    const localX = this.prevX + (local.x - this.prevX) * alpha;
    const localY = this.prevY + (local.y - this.prevY) * alpha;
    const localLook: PlayerLook | null = me
      ? { facing: local.facing, ink: me.ink, down: me.down, rescue: me.rescue, invuln: me.invuln, inkGauge, hp: me.hp, star: me.star }
      : null;
    if (pressed && localLook && !localLook.down) {
      this.shotSplash(session.slot, localX, localY, localLook.facing);
      // Sem tinta no difícil o tiro não sai: no lugar do jato, a caneta seca.
      som.play(!inkGauge || localLook.ink >= 1 ? 'tiro' : 'tinta-vazia', { x: localX, slot: session.slot });
    }
    const turn = state.phase === PHASE_TURN ? Phaser.Math.Clamp(1 - state.phaseTime / RULES.turnDelay, 0, 1) : 0;
    this.moveParallax(session, remotes, me && !me.away ? { x: localX, y: localY } : null, dt, turn);
    this.watchPhase(state, session.bossView(now));
    this.watchPlayers(remotes, localLook, session.slot, localX, inkGauge, now);

    this.fx.step(dt);
    this.ambiente?.step(dt, now);
    this.watchItems(state, live);
    this.watchStains(state, live);
    const enemyFrames = this.enemyAnim.frames(enemies, now, dt, live);
    const size = ENEMY_SIZE * TILE;
    // A frente das borrachas que estão apagando (girando, não apagam): a gota que some ali vira farelo.
    const erasers: EraserFront[] = enemies
      .filter((e) => enemyRole(e.kind) === ENEMY_BORRACHA && e.kind !== ENEMY_ENCICLOPEDIA && e.kind !== ENEMY_SOMBRINHA && e.kind !== ENEMY_MARTELO && e.kind !== ENEMY_TORREAO && e.mode === MODE_WALK && (e.kind === ENEMY_OURICO ? e.skill === SKILL_NONE : e.skill !== SKILL_WARN))
      .map((e) => ({ x: e.x + size / 2 + (e.facing * size) / 2, y: e.y + size / 2 }));
    const dropDirs = this.dropWatch.dirs(drops, now, erasers);
    const spits = session.spitViews(now);
    const spitDirs = this.watchSpits(spits, live);
    this.updateHint(state.phase, enemies);
    const spitHalf = (RULES.spitSize * TILE) / 2;

    const art = this.art;
    if (art) {
      this.noteShots(remotes, drops, now);
      art.begin(now);
      // Antes dos bonecos: eles desenham a sombra no mesmo Graphics de trás.
      this.fx.draw(art, this.fxBack, this.fxFront, DEPTH_FX, DEPTH_FX_FRONT);
      state.items.forEach((item) => {
        if (item.ttl < 3 && Math.floor(now / 150) % 2 === 0) return;
        const s = RULES.itemSize * TILE;
        const bob = Math.sin(now / 220);
        art.draw(`item-${item.kind}`, item.x + s / 2, item.y + s + bob * 1.5, DEPTH_ITEM, { angle: bob * 4 });
      });
      state.stains.forEach((stain) => {
        const look = stainLook(stain.age, now, this.warn.stain);
        const half = (RULES.stainSize * TILE) / 2;
        art.draw('mancha', stain.x + half, stain.y + half, DEPTH_ITEM, { alpha: look.alpha, sx: look.scale, sy: look.scale });
      });
      for (const e of enemies) {
        const f = enemyFrames.get(e.id);
        if (!f) continue;
        const flip = f.flip ?? e.facing < 0;
        if (e.kind === ENEMY_BORRAO) {
          const big = BORRAO_SIZE * TILE;
          art.draw(f.key, e.x + big / 2, e.y + big / 2, DEPTH_ENEMY, { flip, sx: f.sx, sy: f.sy });
          continue;
        }
        if (e.mode !== MODE_WALK) {
          art.draw(f.key, e.x + size / 2, e.y + size / 2, DEPTH_ENEMY, { angle: f.angle, sx: f.sx, sy: f.sy });
          continue;
        }
        const soaked = Math.min(1, e.soak / Math.max(1, state.soakToBall));
        const soakKey = SOAK_KEYS[enemyRole(e.kind)] ?? 'traca-tinta';
        this.drawPowerWarning(g, e, now);
        this.drawPowerEffect(this.poderes, art, e, now);
        if (f.center) {
          // Borboleta e bola de espinhos: apoiadas pelo meio do corpo.
          art.draw(f.key, e.x + size / 2, e.y + size / 2, DEPTH_ENEMY, { flip, sx: f.sx, sy: f.sy, angle: f.angle });
          continue;
        }
        if (enemyRole(e.kind) === ENEMY_FIANDEIRA) {
          // Desenhada pelo centro; pendurada, o fio de nanquim sai de baixo da plataforma.
          // No mergulho o morcego solta o fio (e volta para ele depois).
          // O sino balançando: o fio sai do ponto onde se prende (`aimX`) até ele.
          const threadX = e.kind === ENEMY_SINO && e.skill === SKILL_ACT ? e.aimX : e.x + size / 2;
          if (e.anchorY >= 0 && !(e.kind === ENEMY_MORCEGO && e.skill === SKILL_ACT)) this.fxBack.lineStyle(1.2, INK, 0.85).lineBetween(threadX, e.anchorY, e.x + size / 2, e.y + size / 2);
          art.draw(f.key, e.x + size / 2, e.y + size / 2, DEPTH_ENEMY, { flip, sx: f.sx, sy: f.sy, angle: f.angle, alpha: f.alpha ?? 1 });
          if (soaked > 0) art.draw(soakKey, e.x + size / 2, e.y + size / 2, DEPTH_ENEMY, { flip, alpha: (0.35 + 0.65 * soaked) * (f.alpha ?? 1), sx: f.sx, sy: f.sy, angle: f.angle });
          continue;
        }
        art.draw(f.key, e.x + size / 2, e.y + size, DEPTH_ENEMY, { flip, sx: f.sx, sy: f.sy, angle: f.angle, alpha: f.alpha ?? 1 });
        if (soaked > 0) art.draw(soakKey, e.x + size / 2, e.y + size, DEPTH_ENEMY, { flip, alpha: (0.35 + 0.65 * soaked) * (f.alpha ?? 1), sx: f.sx, sy: f.sy, angle: f.angle });
        if (e.kind === ENEMY_TINTEIRO && e.skill === SKILL_WARN) drawSpitWarning(g, e.x + size / 2, e.y + size, e.facing, now);
      }
      for (const s of spits) {
        const dir = spitDirs.get(s.id) ?? 1;
        if (s.kind === SPIT_GRAVETO) art.draw('graveto', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4);
        else if (s.kind === SPIT_SEIVA) art.draw('seiva-arco', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { flip: dir < 0, angle: Math.sin(now / 80) * 10 });
        // A página cai balançando; as letras voam tremendo, cada uma com o seu desenho.
        else if (s.kind === SPIT_PAGINA) art.draw('pagina-solta', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { angle: 24 * Math.sin(now / 160 + Number(s.id)) });
        // Bolha balançando, orvalho girando no sentido em que rola, gotinha apontando para onde vai.
        // Oficina e Castelo: parafuso deslizando, broca subindo, lasca apontando para onde voa, estrela girando,
        // nota balançando e flecha caindo.
        else if (s.kind === SPIT_PARAFUSO) art.draw('parafuso', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { flip: dir < 0 });
        else if (s.kind === SPIT_BROCA) art.draw('broca', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { angle: 6 * Math.sin(now / 30) });
        else if (s.kind === SPIT_ESTILHACO) art.draw('estilhaco', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { angle: ((this.spits.get(s.id)?.angle ?? 0) * 180) / Math.PI });
        else if (s.kind === SPIT_ESTRELA) art.draw('estrela', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { angle: (dir * now * 0.6) % 360 });
        else if (s.kind === SPIT_NOTA) art.draw('nota', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { flip: dir < 0, angle: 10 * Math.sin(now / 90) });
        else if (s.kind === SPIT_FLECHA) art.draw('flecha', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4);
        else if (s.kind === SPIT_BOLHA) art.draw('bolha', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { sx: 1 + 0.06 * Math.sin(now / 90), sy: 1 - 0.06 * Math.sin(now / 90) });
        else if (s.kind === SPIT_ORVALHO) art.draw('orvalho', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { angle: ((s.x / spitHalf) * 180) / Math.PI });
        else if (s.kind === SPIT_GOTINHA) art.draw('gotinha', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { angle: dir * 25 });
        else if (s.kind === SPIT_LETRA) art.draw(`letra-${Number(s.id) % 3}`, s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { angle: 8 * Math.sin(now / 50 + Number(s.id)) });
        else art.draw('cuspe', s.x + spitHalf, s.y + spitHalf, DEPTH_ENEMY + 0.4, { flip: dir < 0 });
      }
      // Brotos da pinha: pinhão brotando (aviso) e, depois, o broto de espinho.
      const sw = RULES.sproutWidth * TILE;
      const sh = RULES.sproutHeight * TILE;
      state.sprouts?.forEach((s) => {
        const ripe = s.age >= this.warn.sprout;
        const grow = ripe ? 1 : 0.6 + 0.4 * (s.age / this.warn.sprout);
        art.draw(ripe ? 'broto-1' : 'broto-0', s.x + sw / 2, s.y + sh, DEPTH_ITEM, { sx: grow, sy: grow, angle: ripe ? 0 : 4 * Math.sin(now / 40) });
      });
      const dropSize = RULES.dropSize * TILE;
      for (const d of drops) {
        const dir = dropDirs.get(d.id) ?? 1;
        art.draw('gota', d.x + dropSize / 2, d.y + dropSize / 2, DEPTH_ENEMY + 0.5, { flip: dir < 0 });
        g.lineStyle(1.2, PLAYER_COLORS[d.slot] ?? INK, 0.9).strokeCircle(d.x + dropSize / 2 + dir * 1.5, d.y + dropSize / 2, 4);
      }
      for (const r of remotes) {
        this.drawRiscote(art, r.slot, r.x, r.y, { ...r, inkGauge }, r, now, DEPTH_PLAYER, here.has(r.id));
      }
      if (localLook) {
        this.drawRiscote(art, session.slot, localX, localY, localLook, { x: localX, y: localY, vx: local.vx, vy: local.vy, onGround: local.onGround }, now, DEPTH_PLAYER + 0.5, true);
      }
      this.bossView?.draw(art, this.fxBack, g, session.bossView(now), session.hazardViews(now), now, dt);
      this.drawHud(g, art, state.phase, state.lives, me, now);
      art.end();
    } else {
      state.items.forEach((item) => drawItem(g, item.x, item.y, item.kind, item.ttl, now));
      state.stains.forEach((stain) => {
        const half = (RULES.stainSize * TILE) / 2;
        const look = stainLook(stain.age, now, this.warn.stain);
        g.fillStyle(INK, look.alpha).fillCircle(stain.x + half, stain.y + half, half * look.scale);
      });
      for (const e of enemies) {
        drawEnemy(g, e.x, e.y, e, state.soakToBall);
        if (e.kind === ENEMY_TINTEIRO && e.skill === SKILL_WARN && e.mode === MODE_WALK) drawSpitWarning(g, e.x + size / 2, e.y + size, e.facing, now);
      }
      for (const s of spits) g.fillStyle(INK).fillEllipse(s.x + spitHalf, s.y + spitHalf * 1.2, spitHalf * 2.4, spitHalf * 1.4);
      state.sprouts?.forEach((s) => g.fillStyle(0x2f6e12, s.age >= this.warn.sprout ? 1 : 0.4).fillTriangle(s.x, s.y + RULES.sproutHeight * TILE, s.x + RULES.sproutWidth * TILE, s.y + RULES.sproutHeight * TILE, s.x + (RULES.sproutWidth * TILE) / 2, s.y));
      for (const e of enemies) {
        if (e.mode !== MODE_WALK) continue;
        this.drawPowerWarning(g, e, now);
        this.drawPowerEffect(this.poderes, null, e, now);
      }
      for (const r of remotes) drawPlayerFull(g, r.x, r.y, session.params, { ...r, inkGauge }, PLAYER_COLORS[r.slot] ?? GREY, here.has(r.id), now);
      if (localLook) drawPlayerFull(g, localX, localY, session.params, localLook, PLAYER_COLORS[session.slot] ?? GREY, true, now);
      for (const d of drops) drawDrop(g, d.x, d.y, PLAYER_COLORS[d.slot] ?? INK);
      this.fx.draw(null, this.fxBack, this.fxFront, DEPTH_FX, DEPTH_FX_FRONT);
      this.bossView?.draw(null, this.fxBack, g, session.bossView(now), session.hazardViews(now), now, dt);
      this.drawHud(g, null, state.phase, state.lives, me, now);
    }

    if (this.fx.shakeRequest) {
      this.cameras.main.shake(this.fx.shakeRequest[0], this.fx.shakeRequest[1]);
      // O cenário sente o tranco: folhas voam, vaga-lumes se espalham.
      this.ambiente?.agitar(Math.min(2, this.fx.shakeRequest[1] * 80));
      this.fx.shakeRequest = null;
    }
    if (state.phase === PHASE_TURN) {
      const arena = session.arena;
      drawPageTurn(g, arena.cols * TILE, arena.rows * TILE, 1 - state.phaseTime / RULES.turnDelay);
      if (state.bossNext) drawBossTurn(g, this.fx, arena.cols * TILE, arena.rows * TILE, 1 - state.phaseTime / RULES.turnDelay, now);
    }
    this.showBanner(bannerText(session, this.ctx.input.touchVisible), state.phase);
  }

  private drawRiscote(art: ArtLayer, slot: number, x: number, y: number, look: PlayerLook, motion: Motion, now: number, depth: number, isLocal: boolean): void {
    const params = this.ctx.session()?.params;
    if (!params) return;
    const w = params.playerWidth * TILE;
    const h = params.playerHeight * TILE;
    const color = PLAYER_COLORS[slot] ?? GREY;
    const shooting = now - (this.shotAt[slot] ?? -Infinity) < SHOT_POSE_MS;
    const f = this.riscotes.frame(slot, motion, w, h, look.down, shooting, color, now);
    if (!look.away) {
      // Sombra de aguada no chão: ancora o boneco e encolhe no ar.
      const lift = motion.onGround || look.down ? 1 : 0.6;
      this.fxBack.fillStyle(0x6d665a, 0.18 * lift).fillEllipse(x + w / 2, y + h, w * 1.3 * lift * f.sx, 3);
      if (!look.down) this.drawAuras(art, slot, x + w / 2, y + h - AURA_CENTER, look, now, depth - 0.2);
    }
    art.draw(riscoteKey(slot, f.pose), x + w / 2, y + h, depth, { flip: look.facing < 0, alpha: playerAlpha(look, now), sx: f.sx, sy: f.sy });
    drawPlayerOverlay(this.gfx, x, y, params, look, color, isLocal, now, false);
  }

  /**
   * Auras atrás do boneco: o halo dourado da invencibilidade (pulsa, solta brilhos e pisca no
   * último segundo e meio) e a bolha de proteção do fácil, na cor do jogador, respirando devagar.
   */
  private drawAuras(art: ArtLayer, slot: number, cx: number, cy: number, look: PlayerLook, now: number, depth: number): void {
    const star = look.star ?? 0;
    if (star > 0) {
      const beat = Math.sin(now / 110);
      const ending = star < 1.5 && Math.floor(now / 120) % 2 === 0;
      art.draw('aura-estrela', cx, cy, depth, { alpha: ending ? 0.25 : 0.8 + 0.2 * beat, sx: 1 + 0.05 * beat, sy: 1 + 0.04 * beat });
      if (now - (this.sparkAt[slot] ?? 0) > 220) {
        this.sparkAt[slot] = now;
        const a = Math.random() * Math.PI * 2;
        this.fx.sparkle(cx + Math.cos(a) * 14, cy + Math.sin(a) * 19, STAR_GOLD, 3, 5);
      }
    }
    if ((look.hp ?? 1) > 1) {
      const breath = Math.sin(now / 420 + slot);
      art.draw(protecaoKey(slot), cx, cy, depth - 0.05, { alpha: 0.9, sx: 1 + 0.03 * breath, sy: 1 - 0.02 * breath });
    }
  }

  /** Esguicho de tinta saindo da mão de quem atirou. */
  private shotSplash(slot: number, x: number, y: number, facing: number): void {
    const params = this.ctx.session()?.params;
    if (!params) return;
    const w = params.playerWidth * TILE;
    const h = params.playerHeight * TILE;
    const hx = x + w / 2 + facing * w * 0.95;
    const hy = y + h * 0.35;
    this.fx.droplets(hx, hy, 0x2f6fd6, 5, 120, facing > 0 ? -0.2 : Math.PI + 0.2, 0.9, true);
    this.fx.droplets(hx, hy, PLAYER_COLORS[slot] ?? INK, 2, 80, facing > 0 ? 0 : Math.PI, 0.8, true);
  }

  /** Gota nova junto de um jogador remoto: ele acabou de atirar. */
  private noteShots(remotes: Array<{ slot: number; x: number; y: number; facing: number; down: boolean }>, drops: Array<{ slot: number; x: number; y: number }>, now: number): void {
    for (const d of drops) {
      const r = remotes.find((p) => p.slot === d.slot);
      if (!r || Math.abs(d.x - r.x) >= TILE * 1.3 || Math.abs(d.y - r.y) >= TILE * 1.3) continue;
      if (now - (this.shotAt[d.slot] ?? -Infinity) > SHOT_POSE_MS && !r.down) {
        this.shotSplash(r.slot, r.x, r.y, r.facing);
        som.play('tiro', { x: r.x, slot: r.slot });
      }
      this.shotAt[d.slot] = now;
    }
  }

  /** Item que sumiu antes de vencer foi pego: brilho na cor do líquido. */
  private watchItems(state: OnlineSession['state'], live: boolean): void {
    const seen = new Set<string>();
    const s = RULES.itemSize * TILE;
    state.items.forEach((item, id) => {
      seen.add(id);
      this.items.set(id, { x: item.x, y: item.y, kind: item.kind, ttl: item.ttl });
    });
    for (const [id, item] of this.items) {
      if (seen.has(id)) continue;
      this.items.delete(id);
      if (!live || item.ttl < 0.3) continue;
      const color = parseInt((ITEM_LIQUIDS[item.kind] ?? '#141414').slice(1), 16);
      this.fx.sparkle(item.x + s / 2, item.y + s / 2, color, 12, 12);
      this.fx.droplets(item.x + s / 2, item.y + s / 2, color, 8, 120);
      som.play('item', { x: item.x + s / 2 });
    }
  }

  /**
   * Música e vinhetas a partir da fase: a trilha toca na sala inteira (aquecimento incluído), a
   * camada de intensidade entra com o borrão e na página do chefe, e a música abaixa nas vinhetas.
   */
  private watchPhase(state: OnlineSession['state'], boss: { hp: number; maxHp: number } | null): void {
    const phase = state.phase;
    const bossPage = isBossPage(state.arenaId);
    if (phase !== this.shownPhase) {
      // Na página do chefe, a derrota dele já traz o acorde da banda.
      if (phase === PHASE_CLEAR && !bossPage) som.play('arena-limpa');
      else if (phase === PHASE_CHAPTER) som.play('capitulo');
      else if (phase === PHASE_TURN) som.play('pagina');
      else if (phase === PHASE_RESTART) som.play('fim-de-jogo');
      else if (phase === PHASE_PLAYING && this.shownPhase === PHASE_LOBBY) som.play('comecar');
      this.shownPhase = phase;
    }
    // Uma trilha por capítulo e a do chefe na página dele; o aquecimento já toca a do capítulo.
    som.music(bossPage ? 'chefe' : (TRILHAS[capituloDe(state.arenaId)] ?? 'caderno'));
    // Camada: o borrão chegou, ou o chefe passou para a 2ª fase.
    const bossAngry = bossPage && boss !== null && boss.hp <= boss.maxHp * BOSS_RULES.phase2At;
    som.intensity(phase === PHASE_PLAYING && (state.hurry || bossAngry));
    som.duck(phase === PHASE_CLEAR || phase === PHASE_CHAPTER || phase === PHASE_RESTART);
  }

  /** Proteção do fácil quebrando (todos) e o gorgolejo da recarga no tubo (só o próprio jogador). */
  private watchPlayers(remotes: Array<{ slot: number; x: number; hp: number; down: boolean }>, me: PlayerLook | null, slot: number, x: number, inkGauge: boolean, now: number): void {
    const all = me ? [...remotes, { slot, x, hp: me.hp ?? 1, down: me.down }] : remotes;
    for (const p of all) {
      const prev = this.hpSeen[p.slot];
      if (prev !== undefined && p.hp < prev && !p.down) som.play('protecao', { x: p.x, slot: p.slot });
      this.hpSeen[p.slot] = p.hp;
    }
    const ink = me?.ink ?? 0;
    if (ink > this.inkSeen + 1e-6 && ink < RULES.tankSize) this.inkRiseAt = now;
    this.inkSeen = ink;
    // A tinta chega a cada atualização do servidor, não a cada quadro: um respiro evita que o som pisque.
    som.hold('recarga', 'recarga', inkGauge && !!me && !me.down && now - this.inkRiseAt < 220, { x, slot });
  }

  /** Mancha nova: pingo de nanquim caindo do borrão; ao ficar perigosa, espirra. */
  private watchStains(state: OnlineSession['state'], live: boolean): void {
    const seen = new Set<string>();
    const half = (RULES.stainSize * TILE) / 2;
    state.stains.forEach((stain, id) => {
      seen.add(id);
      const prev = this.stainAges.get(id);
      const cx = stain.x + half;
      const cy = stain.y + half;
      if (live && prev === undefined) {
        // O pingo caindo é o aviso: mais leve e mais agudo que o da mancha firme.
        this.fx.splat(cx, cy, false, 0.9, INK);
        som.play('mancha', { x: cx, volume: 0.45, rate: 1.25 });
      } else if (live && prev !== undefined && prev < this.warn.stain && stain.age >= this.warn.stain) {
        this.fx.droplets(cx, cy, INK, 8, 110);
        som.play('mancha', { x: cx });
      }
      this.stainAges.set(id, stain.age);
    });
    for (const id of this.stainAges.keys()) if (!seen.has(id)) this.stainAges.delete(id);
  }

  /** Cuspe do tinteiro: direção do desenho, um rastro de pingos e o respingo de nanquim quando some. */
  private watchSpits(spits: Array<{ id: string; kind: number; x: number; y: number }>, live: boolean): Map<string, number> {
    const out = new Map<string, number>();
    const half = (RULES.spitSize * TILE) / 2;
    const seen = new Set<string>();
    for (const s of spits) {
      seen.add(s.id);
      const prev = this.spits.get(s.id);
      const dir = prev && s.x !== prev.x ? (s.x > prev.x ? 1 : -1) : (prev?.dir ?? 1);
      // Página e letras são de papel, e bolha, orvalho e gotinha são de água: não pingam nanquim e, ao
      // sumir, se desfazem em papel picado ou em respingos d'água.
      const paper = s.kind === SPIT_PAGINA || s.kind === SPIT_LETRA || s.kind === SPIT_ESTILHACO || s.kind === SPIT_ESTRELA || s.kind === SPIT_NOTA || s.kind === SPIT_FLECHA;
      const water = s.kind === SPIT_BOLHA || s.kind === SPIT_ORVALHO || s.kind === SPIT_GOTINHA;
      const metal = s.kind === SPIT_PARAFUSO || s.kind === SPIT_BROCA;
      const bits = paper ? PAPEL_PICADO : water ? AGUA : metal ? METAL : 0;
      // Direção do voo (a lasca aponta para onde vai).
      const angle = prev && (s.x !== prev.x || s.y !== prev.y) ? Math.atan2(s.y - prev.y, s.x - prev.x) : (prev?.angle ?? 0);
      if (live && !bits && prev && Math.floor(s.x / 6) !== Math.floor(prev.x / 6)) this.fx.droplets(s.x + half - dir * half, s.y + half * 1.6, INK, 1, 20, Math.PI / 2, 0.5);
      this.spits.set(s.id, { x: s.x, y: s.y, dir, bits, angle });
      out.set(s.id, dir);
    }
    for (const [id, s] of this.spits) {
      if (seen.has(id)) continue;
      this.spits.delete(id);
      if (live && s.bits) this.fx.droplets(s.x + half, s.y + half, s.bits, 7, 70, -Math.PI / 2, Math.PI * 2);
      else if (live) this.fx.splat(s.x + half, s.y + half, false, 0.6, INK);
    }
    return out;
  }

  /**
   * Avisos dos poderes, por cima de tudo. Floresta: a marca no chão onde o grilo vai cair e onde a seiva
   * do caracol vai bater (com o "!"), e a linha tracejada sob o cesto que vai soltar o graveto.
   * Biblioteca: a marca onde o marca-página vai aparecer e onde o morcego vai mergulhar, o trecho de chão
   * que o tapete do pergaminho vai cobrir, a linha do facho da coruja e o leque das letras.
   */
  private drawPowerWarning(g: Phaser.GameObjects.Graphics, e: { kind: number; skill: number; x: number; y: number; facing: number; aimX: number; aimY: number; anchorY: number }, now: number): void {
    if (e.skill !== SKILL_WARN) return;
    const blink = Math.floor(now / 110) % 2 === 0;
    const red = 0xc8402a;
    const size = ENEMY_SIZE * TILE;
    const arena = this.ctx.session()?.arena;
    if (e.kind === ENEMY_GRILO || e.kind === ENEMY_CARACOL || e.kind === ENEMY_MARCADOR || e.kind === ENEMY_MORCEGO) {
      const w = e.kind === ENEMY_CARACOL ? RULES.spitSize * TILE * 1.8 : size * 1.3;
      if (e.kind === ENEMY_MORCEGO) {
        // O caminho do mergulho, tracejado do morcego até a marca.
        const x0 = e.x + size / 2;
        const y0 = e.y + size / 2;
        const len = Math.hypot(e.aimX - x0, e.aimY - y0);
        for (let d = size / 2; d < len - 6; d += 8) {
          const a = d / len;
          const b = Math.min(1, (d + 4) / len);
          g.lineStyle(1.4, red, blink ? 0.8 : 0.4).lineBetween(x0 + (e.aimX - x0) * a, y0 + (e.aimY - y0) * a, x0 + (e.aimX - x0) * b, y0 + (e.aimY - y0) * b);
        }
      }
      g.fillStyle(INK, 0.16).fillEllipse(e.aimX, e.aimY - 1, w, 5);
      g.lineStyle(1.6, red, blink ? 0.95 : 0.5).strokeEllipse(e.aimX, e.aimY - 1, w + 5, 8);
      // O marca-página: um contorno do tamanho dele, de pé na marca, onde vai aparecer.
      if (e.kind === ENEMY_MARCADOR) g.lineStyle(1.2, red, blink ? 0.7 : 0.35).strokeRoundedRect(e.aimX - size / 2, e.aimY - size, size, size, 4);
      warningMark(g, e.aimX, e.aimY - (e.kind === ENEMY_MARCADOR ? size + 10 : 16), blink);
    } else if (e.kind === ENEMY_PERGAMINHO && arena) {
      // O trecho de chão que o tapete vai cobrir, tracejado.
      const front = e.facing > 0 ? e.x + size : e.x;
      const feet = e.y + size;
      const [left, right] = floorSpan(arena, front, feet, RULES.unrollReach);
      const end = e.facing > 0 ? Math.min(right, front + RULES.unrollReach * TILE) : Math.max(left, front - RULES.unrollReach * TILE);
      const h = RULES.unrollHeight * TILE;
      const x0 = Math.min(front, end);
      const x1 = Math.max(front, end);
      g.fillStyle(red, blink ? 0.16 : 0.08).fillRect(x0, feet - h, x1 - x0, h);
      for (let x = x0; x < x1; x += 7) g.lineStyle(1.4, red, blink ? 0.9 : 0.45).lineBetween(x, feet - h, Math.min(x + 4, x1), feet - h);
      warningMark(g, (x0 + x1) / 2, feet - h - 10, blink);
    } else if (e.kind === ENEMY_CORUJA && arena) {
      // A linha por onde o facho vai passar, tracejada até onde ele para.
      const l = beamLine(arena, e);
      const len = Math.hypot(l.x1 - l.x0, l.y1 - l.y0) || 1;
      for (let d = 4; d < len; d += 9) {
        const a = d / len;
        const b = Math.min(1, (d + 5) / len);
        g.lineStyle(2.2, red, blink ? 0.95 : 0.55).lineBetween(l.x0 + (l.x1 - l.x0) * a, l.y0 + (l.y1 - l.y0) * a, l.x0 + (l.x1 - l.x0) * b, l.y0 + (l.y1 - l.y0) * b);
      }
      warningMark(g, e.aimX, e.aimY - 18, blink);
    } else if (e.kind === ENEMY_ENCICLOPEDIA) {
      // O leque das três letras, saindo da frente.
      const x0 = e.facing > 0 ? e.x + size : e.x;
      const y0 = e.y + size * 0.45;
      for (const angle of [0, 0.35, 0.7]) {
        const dx = Math.cos(angle) * e.facing;
        const dy = -Math.sin(angle);
        for (let d = 4; d < 2.5 * TILE; d += 8) g.lineStyle(1.4, red, blink ? 0.9 : 0.45).lineBetween(x0 + dx * d, y0 + dy * d, x0 + dx * (d + 4), y0 + dy * (d + 4));
      }
      warningMark(g, e.x + size / 2, e.y - 10, blink);
    } else if (e.kind === ENEMY_COMPASSO) {
      // O círculo por onde a perna vai girar.
      const cx = e.x + size / 2;
      const cy = e.y + size / 2;
      const r = RULES.compassReach * TILE;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) g.lineStyle(1.6, red, blink ? 0.9 : 0.45).beginPath().arc(cx, cy, r, a, a + Math.PI / 24).strokePath();
      warningMark(g, cx, e.y - 10, blink);
    } else if (e.kind === ENEMY_IMA) {
      // As duas marcas no chão, de onde saem os parafusos, e o caminho deles até o ímã.
      const feet = e.y + size;
      const cx = e.x + size / 2;
      for (const x of [e.aimX, e.aimY]) {
        g.lineStyle(1.6, red, blink ? 0.95 : 0.5).strokeEllipse(x, feet - 1, 12, 7);
        for (let d = Math.min(x, cx) + 3; d < Math.max(x, cx) - 3; d += 8) g.lineStyle(1.3, red, blink ? 0.8 : 0.4).lineBetween(d, feet - 4, d + 4, feet - 4);
        warningMark(g, x, feet - 14, blink);
      }
    } else if (e.kind === ENEMY_PRUMO) {
      // A queda: tracejado até o chão e a marca onde ele vai bater.
      const cx = e.x + size / 2;
      for (let y = e.y + size + 3; y < e.aimY - 4; y += 8) g.lineStyle(1.4, red, blink ? 0.85 : 0.4).lineBetween(cx, y, cx, Math.min(y + 4, e.aimY - 4));
      g.lineStyle(1.6, red, blink ? 0.95 : 0.5).strokeEllipse(cx, e.aimY - 1, size * 1.8, 8);
    } else if (e.kind === ENEMY_FURADEIRA && arena) {
      // A broca vai subir reto até bater num bloco: o caminho tracejado e o "!" na altura do alvo.
      const cx = e.x + size / 2;
      let top = e.y - 2;
      while (top > e.y - RULES.drillRange * TILE && cellAt(arena, Math.floor(cx / TILE), Math.floor((top - 1) / TILE)) !== SOLID) top -= TILE / 4;
      for (let y = e.y - 4; y > top + 4; y -= 8) g.lineStyle(1.6, red, blink ? 0.9 : 0.45).lineBetween(cx, y, cx, Math.max(y - 4, top + 4));
      warningMark(g, cx, e.aimY - 30, blink);
    } else if (e.kind === ENEMY_MARTELO) {
      // O trecho de chão que vai tremer: quem estiver de pé ali tem de pular.
      const feet = e.y + size;
      g.fillStyle(red, blink ? 0.14 : 0.06).fillRect(e.aimX, feet - 5, e.aimY - e.aimX, 5);
      for (let x = e.aimX; x < e.aimY; x += 8) g.lineStyle(1.6, red, blink ? 0.9 : 0.45).lineBetween(x, feet - 5, Math.min(x + 4, e.aimY), feet - 5);
      warningMark(g, e.x + size / 2, e.y - 14, blink);
    } else if (e.kind === ENEMY_RAPOSA || e.kind === ENEMY_AVIAO) {
      // A raposa: quem ela vai seguir; o avião: a linha do voo, até a marca.
      const x0 = e.x + size / 2;
      const y0 = e.y + size / 2;
      const len = Math.hypot(e.aimX - x0, e.aimY - y0) || 1;
      for (let d = size / 2; d < len; d += 9) {
        const a = d / len;
        const b = Math.min(1, (d + 5) / len);
        g.lineStyle(1.6, red, blink ? 0.85 : 0.4).lineBetween(x0 + (e.aimX - x0) * a, y0 + (e.aimY - y0) * a, x0 + (e.aimX - x0) * b, y0 + (e.aimY - y0) * b);
      }
      warningMark(g, e.aimX, e.aimY - (e.kind === ENEMY_RAPOSA ? 34 : 22), blink);
    } else if (e.kind === ENEMY_BALAO) {
      // Os oito raios das lascas.
      const cx = e.x + size / 2;
      const cy = e.y + size / 2;
      for (let i = 0; i < RULES.shardCount; i++) {
        const a = (2 * Math.PI * i) / RULES.shardCount;
        for (let d = size * 0.7; d < 2 * TILE; d += 8) g.lineStyle(1.3, red, blink ? 0.85 : 0.4).lineBetween(cx + Math.cos(a) * d, cy + Math.sin(a) * d, cx + Math.cos(a) * (d + 4), cy + Math.sin(a) * (d + 4));
      }
      warningMark(g, cx, e.y - 12, blink);
    } else if (e.kind === ENEMY_MOBILE) {
      // A altura por onde as estrelas vão passar, para os dois lados.
      const cx = e.x + size / 2;
      const cy = e.y + size / 2;
      const reach = RULES.starRange * TILE;
      for (let d = size; d < reach; d += 9) {
        g.lineStyle(1.4, red, blink ? 0.85 : 0.4).lineBetween(cx + d, cy, cx + d + 5, cy).lineBetween(cx - d, cy, cx - d - 5, cy);
      }
      warningMark(g, cx, e.y + size + 12, blink);
    } else if (e.kind === ENEMY_CORNETA) {
      // O caminho em onda das notas.
      const x0 = e.facing > 0 ? e.x + size : e.x;
      const y0 = e.y + size * 0.4;
      for (let d = 0; d < RULES.noteRange * TILE; d += 6) {
        const t = d / (RULES.noteSpeed * TILE);
        const y = y0 + Math.sin(t * RULES.noteFreq) * RULES.noteWave * TILE;
        g.fillStyle(red, blink ? 0.8 : 0.4).fillCircle(x0 + e.facing * d, y, 1.1);
      }
      warningMark(g, e.x + size / 2, e.y - 10, blink);
    } else if (e.kind === ENEMY_TORREAO && arena) {
      // As três marcas no chão onde as flechas vão cair, com o tracejado de cima.
      const feet = Math.round((e.y + size) / TILE) * TILE;
      for (const x of towerSpots(arena, { x: e.x, y: e.y, dir: e.facing })) {
        g.fillStyle(INK, 0.16).fillEllipse(x, feet - 1, 14, 5);
        g.lineStyle(1.6, red, blink ? 0.95 : 0.5).strokeEllipse(x, feet - 1, 18, 8);
        for (let y = feet - RULES.arrowDrop * TILE; y < feet - 6; y += 9) g.lineStyle(1.2, red, blink ? 0.7 : 0.35).lineBetween(x, y, x, y + 4);
      }
      warningMark(g, e.x + size / 2, e.y - 10, blink);
    } else if (e.kind === ENEMY_DICIONARIO || e.kind === ENEMY_SAPO || e.kind === ENEMY_BESOURO || e.kind === ENEMY_MOLA) {
      warningMark(g, e.x + size / 2, e.y - 10, blink);
    } else if (e.kind === ENEMY_VAGALUME) {
      // O círculo do clarão, tracejado em volta dele.
      const cx = e.x + size / 2;
      const cy = e.y + size / 2;
      const r = RULES.flashRadius * TILE;
      g.fillStyle(CLARAO, blink ? 0.16 : 0.08).fillCircle(cx, cy, r);
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) g.lineStyle(1.6, red, blink ? 0.9 : 0.45).beginPath().arc(cx, cy, r, a, a + Math.PI / 24).strokePath();
      warningMark(g, cx, e.y - 10, blink);
    } else if (e.kind === ENEMY_CHAFARIZ && arena) {
      // A marca no chão onde o jato vai subir, com bolhas, e o contorno do jato tracejado.
      const box = geyserBox(arena, e.aimX, e.aimY);
      g.fillStyle(AGUA, 0.25).fillEllipse(e.aimX, e.aimY - 1, box.w * 1.6, 5);
      g.lineStyle(1.6, red, blink ? 0.95 : 0.5).strokeEllipse(e.aimX, e.aimY - 1, box.w * 1.6 + 5, 8);
      for (let y = box.y; y < box.y + box.h - 2; y += 7) {
        g.lineStyle(1.2, red, blink ? 0.7 : 0.35).lineBetween(box.x, y, box.x, y + 3).lineBetween(box.x + box.w, y, box.x + box.w, y + 3);
      }
      const t = now / 160;
      for (let i = 0; i < 3; i++) g.fillStyle(ESPUMA, 0.9).fillCircle(e.aimX + Math.sin(t + i * 2.1) * box.w * 0.4, e.aimY - 2 - ((t * 4 + i * 3) % 7), 1.4);
      warningMark(g, e.aimX, box.y - 8, blink);
    } else if (e.kind === ENEMY_SINO && e.anchorY >= 0) {
      // O arco do balanço, tracejado, com o fio inteiro.
      const px = e.x + size / 2;
      const len = e.y + size / 2 - e.anchorY;
      const steps = 16;
      for (let i = 0; i < steps; i += 2) {
        const a0 = -RULES.swingAngle + (2 * RULES.swingAngle * i) / steps;
        const a1 = -RULES.swingAngle + (2 * RULES.swingAngle * (i + 1)) / steps;
        g.lineStyle(1.6, red, blink ? 0.9 : 0.45).lineBetween(px + Math.sin(a0) * len, e.anchorY + Math.cos(a0) * len, px + Math.sin(a1) * len, e.anchorY + Math.cos(a1) * len);
      }
      warningMark(g, px, e.y + size + 10, blink);
    } else if (e.kind === ENEMY_SOMBRINHA) {
      // O leque das gotinhas, para cima.
      const x0 = e.x + size / 2;
      const y0 = e.y;
      for (let i = 0; i < RULES.parasolDrops; i++) {
        const a = -Math.PI * (5 / 6) + (i / (RULES.parasolDrops - 1)) * (Math.PI * (2 / 3));
        for (let d = 4; d < 2 * TILE; d += 8) g.lineStyle(1.4, red, blink ? 0.9 : 0.45).lineBetween(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d, x0 + Math.cos(a) * (d + 4), y0 + Math.sin(a) * (d + 4));
      }
      warningMark(g, x0, e.y - 2.4 * TILE, blink);
    } else if (e.kind === ENEMY_CESTO) {
      const size = ENEMY_SIZE * TILE;
      const cx = e.x + size / 2;
      const arena = this.ctx.session()?.arena;
      if (!arena) return;
      let row = Math.floor((e.y + size) / TILE);
      while (row < arena.rows - 1 && cellAt(arena, Math.floor(cx / TILE), row) === EMPTY) row++;
      for (let y = e.y + size + 3; y < row * TILE - 3; y += 8) g.lineStyle(1.4, red, blink ? 0.8 : 0.4).lineBetween(cx, y, cx, Math.min(y + 4, row * TILE - 3));
    }
  }

  /**
   * Poderes da Biblioteca valendo: o tapete do pergaminho (aberto e, depois, enrolando de volta) e o facho
   * da coruja, desenhados nas caixas da simulação (`unrollBox`, `beamLine`), atrás dos bonecos.
   */
  private drawPowerEffect(g: Phaser.GameObjects.Graphics, art: ArtLayer | null, e: { kind: number; skill: number; x: number; y: number; facing: number; aimX: number; aimY: number }, now: number): void {
    if (e.kind === ENEMY_PERGAMINHO && (e.skill === SKILL_ACT || e.skill === SKILL_REST)) {
      const box = unrollBox({ x: e.x, y: e.y, dir: e.facing, aimX: e.aimX });
      if (box.w < 1) return;
      // Sombra dura, papel com uma faixa mais escura embaixo e contorno marinho.
      g.fillStyle(INK, 0.25).fillRect(box.x + 2, box.y + 2, box.w, box.h);
      g.fillStyle(PERGAMINHO, 1).fillRect(box.x, box.y, box.w, box.h);
      g.fillStyle(PERGAMINHO_SOMBRA, 1).fillRect(box.x, box.y + box.h * 0.6, box.w, box.h * 0.4);
      for (let x = box.x + 5; x < box.x + box.w - 3; x += 6) g.lineStyle(0.8, PERGAMINHO_SOMBRA, 1).lineBetween(x, box.y + 2, x + 2, box.y + 2);
      g.lineStyle(1.2, INK, 1).strokeRect(box.x, box.y, box.w, box.h);
      const endX = e.aimX;
      const endY = box.y + box.h / 2;
      const spin = (e.facing * (endX / 5) * 180) / Math.PI;
      if (art) art.draw('pergaminho-rolo', endX, endY, DEPTH_ITEM + 0.2, { angle: spin });
      else g.fillStyle(PERGAMINHO_SOMBRA, 1).fillCircle(endX, endY, 5).lineStyle(1.2, INK, 1).strokeCircle(endX, endY, 5);
      return;
    }
    if (e.kind === ENEMY_COMPASSO && e.skill === SKILL_ACT) {
      // A perna girando: metal com contorno marinho e a ponta de grafite.
      const cx = e.x + (ENEMY_SIZE * TILE) / 2;
      const cy = e.y + (ENEMY_SIZE * TILE) / 2;
      const w = RULES.compassWidth * TILE;
      g.lineStyle(w + 2.4, INK, 1).lineBetween(cx, cy, e.aimX, e.aimY);
      g.lineStyle(w, METAL, 1).lineBetween(cx, cy, e.aimX, e.aimY);
      g.lineStyle(w * 0.35, METAL_SOMBRA, 1).lineBetween(cx, cy + w * 0.2, e.aimX, e.aimY + w * 0.2);
      g.fillStyle(INK, 1).fillCircle(e.aimX, e.aimY, w * 0.8);
      return;
    }
    if (e.kind === ENEMY_MARTELO && e.skill === SKILL_ACT) {
      // O chão tremendo: riscos curtos pulando no trecho todo.
      const feet = e.y + ENEMY_SIZE * TILE;
      for (let x = e.aimX + 3; x < e.aimY - 3; x += 7) {
        const h = 2 + 3 * Math.abs(Math.sin(x * 0.7 + now / 30));
        g.lineStyle(1.4, INK, 0.9).lineBetween(x, feet - h, x + 2, feet);
      }
      return;
    }
    if (e.kind === ENEMY_VAGALUME && e.skill === SKILL_ACT) {
      // O clarão: disco de luz com borda marinho, o miolo mais forte.
      const cx = e.x + (ENEMY_SIZE * TILE) / 2;
      const cy = e.y + (ENEMY_SIZE * TILE) / 2;
      const r = RULES.flashRadius * TILE;
      g.fillStyle(CLARAO, 0.45).fillCircle(cx, cy, r);
      g.fillStyle(0xffffff, 0.5).fillCircle(cx, cy, r * 0.5);
      g.lineStyle(1.6, INK, 0.9).strokeCircle(cx, cy, r);
      return;
    }
    if (e.kind === ENEMY_CHAFARIZ && e.skill === SKILL_ACT) {
      const arena = this.ctx.session()?.arena;
      if (!arena) return;
      // O jato: coluna d'água com contorno marinho, a sombra de um lado e espuma no alto.
      const box = geyserBox(arena, e.aimX, e.aimY);
      const wob = Math.sin(now / 40) * 1.2;
      g.fillStyle(INK, 0.25).fillRect(box.x + 2, box.y + 2, box.w, box.h);
      g.fillStyle(AGUA, 1).fillRect(box.x + wob, box.y, box.w, box.h);
      g.fillStyle(AGUA_SOMBRA, 1).fillRect(box.x + wob + box.w * 0.62, box.y, box.w * 0.38, box.h);
      g.lineStyle(1.2, INK, 1).strokeRect(box.x + wob, box.y, box.w, box.h);
      g.fillStyle(ESPUMA, 1).fillCircle(e.aimX + wob, box.y, box.w * 0.7).lineStyle(1.2, INK, 1).strokeCircle(e.aimX + wob, box.y, box.w * 0.7);
      return;
    }
    if (e.kind === ENEMY_CORUJA && e.skill === SKILL_ACT) {
      const arena = this.ctx.session()?.arena;
      if (!arena) return;
      const l = beamLine(arena, e);
      const w = RULES.beamWidth * TILE;
      const flicker = 0.85 + 0.15 * Math.sin(now / 25);
      // Brilho largo, contorno marinho e o miolo claro; no fim, um clarão onde o facho bate.
      g.lineStyle(w * 2.6, FACHO_BRILHO, 0.35 * flicker).lineBetween(l.x0, l.y0, l.x1, l.y1);
      g.lineStyle(w + 2.4, INK, 0.9).lineBetween(l.x0, l.y0, l.x1, l.y1);
      g.lineStyle(w, FACHO, flicker).lineBetween(l.x0, l.y0, l.x1, l.y1);
      g.fillStyle(FACHO_BRILHO, 0.5 * flicker).fillCircle(l.x1, l.y1, w * 1.6);
      g.fillStyle(FACHO, 1).fillCircle(l.x1, l.y1, w * 0.8);
    }
  }

  /**
   * Placar no alto da tela (pedido do usuário em 2026-11-01): à esquerda, as vidas da equipe em
   * corações (cheios os que restam); à direita, os poderes do próprio jogador, cada um com o pote do
   * item e um ponto por nível até `POWER_MAX_LEVEL`, e a invencibilidade com o tempo que falta. O meio
   * fica livre para a barra do chefe. No aquecimento não aparece.
   */
  private drawHud(
    g: Phaser.GameObjects.Graphics,
    art: ArtLayer | null,
    phase: number,
    lives: number,
    me: { strength: number; speed: number; rate: number; range: number; star: number } | undefined,
    now: number,
  ): void {
    const arena = this.ctx.session()?.arena;
    if (!arena || phase === PHASE_LOBBY) {
      this.hudLives = -1;
      return;
    }
    const top = 2;
    const h = 23;
    const cy = top + h / 2;

    // Vidas: um coração por vida da equipe; o que se perde estoura num respingo.
    const step = 12;
    const x0 = TILE + 2;
    hudLabel(g, x0, top, RULES.teamLives * step + 6, h);
    const heartX = (i: number) => x0 + 3 + step / 2 + i * step;
    for (let i = 0; i < RULES.teamLives; i++) drawHeart(g, heartX(i), cy, i < lives);
    if (this.hudLives > lives) this.fx.droplets(heartX(lives), cy, HEART, 8, 70, -Math.PI / 2, Math.PI * 2);
    this.hudLives = lives;

    // Poderes: só os que o jogador tem agora.
    if (!me) return;
    const slots: Array<{ kind: number; level: number }> = [];
    [me.strength, me.speed, me.rate, me.range].forEach((level, kind) => {
      if (level > 0) slots.push({ kind, level });
    });
    if (me.star > 0) slots.push({ kind: ITEM_INVENCIVEL, level: 0 });
    if (slots.length === 0) return;
    const slotW = 22;
    const w = slots.length * slotW + 6;
    const left = arena.cols * TILE - TILE - 2 - w;
    hudLabel(g, left, top, w, h);
    slots.forEach(({ kind, level }, i) => {
      const cx = left + 3 + slotW / 2 + i * slotW;
      const liquid = parseInt((ITEM_LIQUIDS[kind] ?? '#1f2433').slice(1), 16);
      // A invencibilidade pisca no fim, como a aura.
      const fading = kind === ITEM_INVENCIVEL && me.star < 1.5 && Math.floor(now / 120) % 2 === 0;
      if (art) art.draw(`item-${kind}`, cx, top + 16, DEPTH_OVERLAY + 0.1, { sx: 0.5, sy: 0.5, alpha: fading ? 0.35 : 1, still: true });
      else g.fillStyle(liquid, fading ? 0.35 : 1).fillRoundedRect(cx - 5, top + 3, 10, 12, 3).lineStyle(1, INK, 1).strokeRoundedRect(cx - 5, top + 3, 10, 12, 3);
      const py = top + 19.5;
      if (kind === ITEM_INVENCIVEL) {
        // Tempo que falta, numa barrinha.
        const bw = 14;
        const left = cx - bw / 2;
        g.fillStyle(PAPER_HUD, 1).fillRect(left, py - 1.5, bw, 3);
        g.fillStyle(liquid, 1).fillRect(left, py - 1.5, (bw * Math.min(me.star, RULES.invincibleTime)) / RULES.invincibleTime, 3);
        g.lineStyle(0.8, INK, 1).strokeRect(left, py - 1.5, bw, 3);
        return;
      }
      for (let k = 0; k < POWER_MAX_LEVEL; k++) {
        const px = cx + (k - (POWER_MAX_LEVEL - 1) / 2) * 5.5;
        g.fillStyle(k < level ? liquid : PAPER_HUD, 1).fillCircle(px, py, 2);
        g.lineStyle(0.8, INK, 1).strokeCircle(px, py, 2);
      }
    });
  }

  /** Dicas da 1ª fase: a primeira some quando aparece uma bola; a segunda, no primeiro chute. */
  private updateHint(phase: number, enemies: Array<{ mode: number }>): void {
    if (phase === PHASE_PLAYING && this.hintStep < HINTS.length) {
      if (this.hintStep === 0 && enemies.some((e) => e.mode !== MODE_WALK)) this.hintStep = 1;
      if (this.hintStep === 1 && enemies.some((e) => e.mode === MODE_ROLL)) this.hintStep = HINTS.length;
    }
    const text = phase === PHASE_PLAYING && this.hintStep < HINTS.length ? HINTS[this.hintStep]!(this.ctx.input.attackName()) : '';
    if (this.hint.text !== text) this.hint.setText(text);
  }

  /** Faixa com entrada de impacto: cresce e assenta quando o texto muda. */
  private showBanner(text: string, phase: number): void {
    if (text === this.bannerShown) return;
    this.bannerShown = text;
    this.banner.setText(text);
    if (!text) return;
    this.tweens.killTweensOf(this.banner);
    this.banner.setScale(1.5).setAngle(-3);
    this.tweens.add({ targets: this.banner, scale: 1, angle: 0, duration: 320, ease: 'Back.Out' });
    const session = this.ctx.session();
    if (!session || (phase !== PHASE_CLEAR && phase !== PHASE_CHAPTER)) return;
    // Arena limpa ou capítulo concluído: confete de tinta nas cores dos jogadores.
    const w = session.arena.cols * TILE;
    for (let i = 0; i < 6; i++) {
      const color = PLAYER_COLORS[i % PLAYER_COLORS.length] ?? INK;
      this.fx.droplets(w * (0.2 + i * 0.12), TILE * 2.5, color, 10, 220, -Math.PI / 2, Math.PI * 0.9, true);
    }
    this.fx.shake(160, 0.004);
  }
}

/**
 * Mancha no aviso: clara, crescendo e piscando (ainda não machuca). Firme: escura e cheia.
 * No último meio segundo, desbota.
 */
function stainLook(age: number, now: number, warn: number): { alpha: number; scale: number } {
  if (age < warn) {
    const t = age / warn;
    return { alpha: 0.2 + 0.25 * t + 0.1 * Math.sin(now / 45), scale: 0.45 + 0.5 * t };
  }
  const left = warn + RULES.stainLife - age;
  return { alpha: 0.95 * Math.min(1, left / 0.5), scale: 1 + 0.03 * Math.sin(now / 200) };
}

/** "!" de tinta vermelha com contorno de papel, como o dos avisos do chefe. */
function warningMark(g: Phaser.GameObjects.Graphics, x: number, y: number, on: boolean): void {
  const s = on ? 1.15 : 1;
  g.lineStyle(5, 0xf6f1e7, 1).lineBetween(x, y - 7 * s, x, y - 1 * s);
  g.fillStyle(0xf6f1e7, 1).fillCircle(x, y + 3 * s, 2.6);
  g.lineStyle(3, 0xc8402a, 1).lineBetween(x, y - 7 * s, x, y - 1 * s);
  g.fillStyle(0xc8402a, 1).fillCircle(x, y + 3 * s, 1.7);
}

/** Etiqueta do placar: papel com contorno marinho e sombra dura, como os cartões da interface. */
function hudLabel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(INK, 0.3).fillRoundedRect(x + 2, y + 2, w, h, 5);
  g.fillStyle(PAPER_HUD, 0.96).fillRoundedRect(x, y, w, h, 5);
  g.lineStyle(1.2, INK, 1).strokeRoundedRect(x, y, w, h, 5);
}

/** Coração de uma vida: cheio (vermelho) ou vazio (só o contorno), centrado em (x, y). */
function drawHeart(g: Phaser.GameObjects.Graphics, x: number, y: number, full: boolean): void {
  const shape = (grow: number, color: number, alpha: number) => {
    g.fillStyle(color, alpha);
    g.fillCircle(x - 2.4, y - 1.4, 2.7 + grow).fillCircle(x + 2.4, y - 1.4, 2.7 + grow);
    g.fillTriangle(x - 5 - grow, y - 0.6, x + 5 + grow, y - 0.6, x, y + 5 + grow * 1.4);
  };
  shape(1, INK, 1);
  shape(0, full ? HEART : PAPER_HUD, 1);
  if (full) g.fillStyle(0xffffff, 0.85).fillCircle(x - 2.6, y - 2.2, 0.9);
}

/** Aviso do cuspe: tracejado vermelho no chão, à frente do tinteiro, piscando. */
function drawSpitWarning(g: Phaser.GameObjects.Graphics, x: number, feet: number, facing: number, now: number): void {
  const x0 = x + facing * TILE * 0.6;
  g.lineStyle(1.6, 0xc8402a, 0.55 + 0.35 * Math.sin(now / 60));
  for (let k = 0; k < 6; k++) {
    const a = x0 + facing * k * 9;
    g.lineBetween(a, feet - 3, a + facing * 5, feet - 3);
  }
}

function bannerText(session: OnlineSession, touch: boolean): string {
  const state = session.state;
  if (session.reconnecting) return 'A conexão caiu: reconectando…';
  switch (state.phase) {
    case PHASE_LOBBY: {
      const start = touch ? 'Toque em “Começar partida” abaixo' : 'Aperte Enter para começar';
      return `Aquecimento: ${state.players.size}/${session.capacity} na sala\n${session.isHost ? start : 'O anfitrião começa quando todos entrarem'}`;
    }
    case PHASE_CLEAR:
      if (isBossPage(state.arenaId)) return `${visualDe(state.arenaId).chefe.nome} foi derrotado!`;
      return state.arenaIndex + 1 < state.arenaCount ? 'Arena limpa!' : 'Última arena limpa!';
    case PHASE_CHAPTER:
      return `Capítulo concluído!\n${state.score} pontos`;
    case PHASE_RESTART:
      // Com pontos é fim de jogo: o placar aparece por cima e a arena recomeça do zero.
      return session.records ? 'Fim de jogo!' : 'Sem vidas: recomeçando a arena…';
    case PHASE_TURN:
      return state.bossNext ? `Cuidado: ${visualDe(state.arenaId).chefe.nome.replace(/^O /, 'o ')}!` : '';
  }
  if (state.hurry && state.waveTime < RULES.hurryTime + 3) return 'O borrão chegou: depressa!';
  return '';
}
