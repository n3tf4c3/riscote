import * as Phaser from 'phaser';
import {
  ARENAS,
  BOSS_ARENA,
  BORRAO_SIZE,
  BTN_ATTACK,
  ENEMY_BORRAO,
  ENEMY_SIZE,
  MAX_PLAYERS,
  MODE_WALK,
  PHASE_CHAPTER,
  PHASE_CLEAR,
  PHASE_LOBBY,
  PHASE_PLAYING,
  PHASE_RESTART,
  PHASE_TURN,
  RULES,
  TICK_DT,
  TILE,
  tubeRect,
} from '@riscote/shared';
import { DropWatcher, EnemyAnimator, RiscoteAnimator, type Motion } from './anim';
import { bossSpecs } from './art/boss';
import { ITEM_LIQUIDS } from './art/items';
import { ArtLayer } from './art/layer';
import { RES, arenaSpecs, artSize, commonSpecs, loadArt, riscoteKey, type ArtSpec } from './art/textures';
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
import { BossView, drawBossTurn } from './bossView';
import { Effects } from './fx';
import type { InputSource } from './input';
import type { OnlineSession } from './net';

const MAX_FRAME = 0.25;
const GREY = 0x888888;
/** Quanto tempo a pose de tiro fica na tela depois do disparo. */
const SHOT_POSE_MS = 160;

const DEPTH_ARENA = 0;
/** Efeitos atrás do contorno das plataformas e dos perigos (plano, seção 3). */
const DEPTH_FX = 0.5;
const DEPTH_PLATFORMS = 0.8;
const DEPTH_ITEM = 1;
const DEPTH_ENEMY = 2;
const DEPTH_PLAYER = 3;
const DEPTH_FX_FRONT = 3.8;
const DEPTH_OVERLAY = 4;
const DEPTH_BANNER = 5;

/** Modo online: o próprio boneco é previsto; inimigos, gotas e os outros chegam interpolados do servidor. */
export class OnlineScene extends Phaser.Scene {
  private acc = 0;
  private prevX = 0;
  private prevY = 0;
  private prevButtons = 0;
  private lastFrame = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private fxBack!: Phaser.GameObjects.Graphics;
  private fxFront!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;
  private bannerShown = '';
  /** Arte de pincel; enquanto as texturas não ficam prontas, a cena desenha o greybox. */
  private art: ArtLayer | null = null;
  /** Só na página do chefe. */
  private bossView: BossView | null = null;
  private generation = 0;
  /** Último disparo visto de cada jogador (por slot), para a pose de tiro. */
  private shotAt: number[] = [];
  private fx = new Effects();
  private riscotes = new RiscoteAnimator(this.fx);
  private enemyAnim = new EnemyAnimator(this.fx, ENEMY_SIZE * TILE, BORRAO_SIZE * TILE, ARENAS[0]!);
  private dropWatch = new DropWatcher(this.fx, RULES.dropSize * TILE);
  /** Idade de cada mancha no quadro anterior: respingo ao surgir e ao ficar perigosa. */
  private stainAges = new Map<string, number>();
  /** Itens na tela no quadro anterior, para o brilho de quando alguém pega. */
  private items = new Map<string, { x: number; y: number; kind: number; ttl: number }>();

  constructor(
    private readonly ctx: {
      session: () => OnlineSession | null;
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
    this.banner = this.add
      // Contorno da cor do papel: legível sobre qualquer coisa sem uma caixa cobrindo as plataformas.
      .text(w / 2, TILE * 1.5, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#1f1d1a',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#f1ead9',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setResolution(RES)
      .setDepth(DEPTH_BANNER);
    this.bannerShown = '';
    this.acc = 0;
    this.prevX = session.local.x;
    this.prevY = session.local.y;
    this.lastFrame = performance.now();
    this.shotAt = [];
    this.fx = new Effects();
    this.riscotes = new RiscoteAnimator(this.fx);
    this.enemyAnim = new EnemyAnimator(this.fx, ENEMY_SIZE * TILE, BORRAO_SIZE * TILE, arena);
    this.stainAges.clear();
    this.dropWatch = new DropWatcher(this.fx, RULES.dropSize * TILE);
    this.items.clear();
    const bossPage = arena.id === BOSS_ARENA.id;
    this.bossView = bossPage ? new BossView(this, this.fx, arena, { boss: DEPTH_ENEMY - 0.2, hazard: DEPTH_ENEMY + 0.4, text: DEPTH_BANNER }) : null;

    this.art = null;
    const generation = ++this.generation;
    const common = [...commonSpecs(PLAYER_COLORS), ...(bossPage ? bossSpecs() : [])];
    // Primeiro a variação 0 de cada desenho; as outras da linha viva carregam depois, sem segurar o jogo.
    const first = common.filter((s) => !s.key.includes('~'));
    const later = common.filter((s) => s.key.includes('~'));
    const ground = arenaSpecs(arena);
    // A arena vem antes dos bonecos: é ela que tira a tela do greybox.
    loadArt(this.textures, [ground.fundo, ground.plataformas, ...first], (done, total) => {
      if (generation === this.generation) this.ctx.loading?.(done, total);
    })
      .then(() => {
        // A cena pode ter recomeçado (outra arena) enquanto as texturas carregavam.
        if (generation !== this.generation) return;
        greybox.destroy();
        this.add.image(0, 0, ground.fundo.key).setOrigin(0).setDisplaySize(w, h).setDepth(DEPTH_ARENA);
        this.add.image(0, 0, ground.plataformas.key).setOrigin(0).setDisplaySize(w, h).setDepth(DEPTH_PLATFORMS);
        const tube = common.find((s) => s.key === 'tubo');
        for (const t of showTubes && tube ? arena.tubes : []) this.placeTube(tube as ArtSpec, tubeRect(t));
        this.art = new ArtLayer(this, common);
        return loadArt(this.textures, later);
      })
      .catch((err: unknown) => {
        console.warn('arte não carregou; seguindo no greybox', err);
        if (generation === this.generation) this.ctx.loading?.(1, 1);
      });
  }

  private placeTube(tube: ArtSpec, r: { x: number; y: number; w: number; h: number }): void {
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
    while (this.acc >= TICK_DT) {
      this.prevX = session.local.x;
      this.prevY = session.local.y;
      session.tick(buttons);
      this.acc -= TICK_DT;
    }

    const state = session.state;
    const g = this.gfx.clear();
    const inkGauge = state.difficulty === 'dificil';
    const live = state.phase === PHASE_PLAYING || state.phase === PHASE_CLEAR;
    const remotes = session.remotePlayers(now);
    const drops = session.dropViews(now);
    const enemies = session.enemyViews(now);
    const me = session.me;
    const alpha = this.acc / TICK_DT;
    const local = session.local;
    const localX = this.prevX + (local.x - this.prevX) * alpha;
    const localY = this.prevY + (local.y - this.prevY) * alpha;
    const localLook: PlayerLook | null = me
      ? { facing: local.facing, ink: me.ink, down: me.down, rescue: me.rescue, invuln: me.invuln, inkGauge, hp: me.hp, star: me.star }
      : null;
    if (pressed && localLook && !localLook.down) this.shotSplash(session.slot, localX, localY, localLook.facing);

    this.fx.step(dt);
    this.watchItems(state, live);
    this.watchStains(state, live);
    const enemyFrames = this.enemyAnim.frames(enemies, now, dt, live);
    const dropDirs = this.dropWatch.dirs(drops, now);

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
        const look = stainLook(stain.age, now);
        const half = (RULES.stainSize * TILE) / 2;
        art.draw('mancha', stain.x + half, stain.y + half, DEPTH_ITEM, { alpha: look.alpha, sx: look.scale, sy: look.scale });
      });
      for (const e of enemies) {
        const f = enemyFrames.get(e.id);
        if (!f) continue;
        const flip = e.facing < 0;
        if (e.kind === ENEMY_BORRAO) {
          const size = BORRAO_SIZE * TILE;
          art.draw(f.key, e.x + size / 2, e.y + size / 2, DEPTH_ENEMY, { flip, sx: f.sx, sy: f.sy });
          continue;
        }
        const size = ENEMY_SIZE * TILE;
        if (e.mode !== MODE_WALK) {
          art.draw(f.key, e.x + size / 2, e.y + size / 2, DEPTH_ENEMY, { angle: f.angle, sx: f.sx, sy: f.sy });
          continue;
        }
        art.draw(f.key, e.x + size / 2, e.y + size, DEPTH_ENEMY, { flip, sx: f.sx, sy: f.sy, angle: f.angle });
        const soaked = Math.min(1, e.soak / Math.max(1, state.soakToBall));
        const soakKey = f.key.startsWith('traca') ? 'traca-tinta' : 'saltador-tinta';
        if (soaked > 0) art.draw(soakKey, e.x + size / 2, e.y + size, DEPTH_ENEMY, { flip, alpha: 0.35 + 0.65 * soaked, sx: f.sx, sy: f.sy, angle: f.angle });
      }
      const dropSize = RULES.dropSize * TILE;
      for (const d of drops) {
        const dir = dropDirs.get(d.id) ?? 1;
        art.draw('gota', d.x + dropSize / 2, d.y + dropSize / 2, DEPTH_ENEMY + 0.5, { flip: dir < 0 });
        g.lineStyle(1.2, PLAYER_COLORS[d.slot] ?? INK, 0.9).strokeCircle(d.x + dropSize / 2 + dir * 1.5, d.y + dropSize / 2, 4);
      }
      for (const r of remotes) {
        this.drawRiscote(art, r.slot, r.x, r.y, { ...r, inkGauge }, r, now, DEPTH_PLAYER, false);
      }
      if (localLook) {
        this.drawRiscote(art, session.slot, localX, localY, localLook, { x: localX, y: localY, vx: local.vx, vy: local.vy, onGround: local.onGround }, now, DEPTH_PLAYER + 0.5, true);
      }
      this.bossView?.draw(art, this.fxBack, g, session.bossView(now), session.hazardViews(now), now, dt);
      art.end();
    } else {
      state.items.forEach((item) => drawItem(g, item.x, item.y, item.kind, item.ttl, now));
      state.stains.forEach((stain) => {
        const half = (RULES.stainSize * TILE) / 2;
        const look = stainLook(stain.age, now);
        g.fillStyle(INK, look.alpha).fillCircle(stain.x + half, stain.y + half, half * look.scale);
      });
      for (const e of enemies) drawEnemy(g, e.x, e.y, e, state.soakToBall);
      for (const r of remotes) drawPlayerFull(g, r.x, r.y, session.params, { ...r, inkGauge }, PLAYER_COLORS[r.slot] ?? GREY, false, now);
      if (localLook) drawPlayerFull(g, localX, localY, session.params, localLook, PLAYER_COLORS[session.slot] ?? GREY, true, now);
      for (const d of drops) drawDrop(g, d.x, d.y, PLAYER_COLORS[d.slot] ?? INK);
      this.fx.draw(null, this.fxBack, this.fxFront, DEPTH_FX, DEPTH_FX_FRONT);
      this.bossView?.draw(null, this.fxBack, g, session.bossView(now), session.hazardViews(now), now, dt);
    }

    if (this.fx.shakeRequest) {
      this.cameras.main.shake(this.fx.shakeRequest[0], this.fx.shakeRequest[1]);
      this.fx.shakeRequest = null;
    }
    if (state.phase === PHASE_TURN) {
      const arena = session.arena;
      drawPageTurn(g, arena.cols * TILE, arena.rows * TILE, 1 - state.phaseTime / RULES.turnDelay);
      if (state.bossNext) drawBossTurn(g, this.fx, arena.cols * TILE, arena.rows * TILE, 1 - state.phaseTime / RULES.turnDelay, now);
    }
    this.showBanner(bannerText(session), state.phase);
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
    }
    art.draw(riscoteKey(slot, f.pose), x + w / 2, y + h, depth, { flip: look.facing < 0, alpha: playerAlpha(look, now), sx: f.sx, sy: f.sy });
    drawPlayerOverlay(this.gfx, x, y, params, look, color, isLocal, now);
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
      if (now - (this.shotAt[d.slot] ?? -Infinity) > SHOT_POSE_MS && !r.down) this.shotSplash(r.slot, r.x, r.y, r.facing);
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
    }
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
      if (live && prev === undefined) this.fx.splat(cx, cy, false, 0.9, INK);
      else if (live && prev !== undefined && prev < RULES.stainWarn && stain.age >= RULES.stainWarn) {
        this.fx.droplets(cx, cy, INK, 8, 110);
      }
      this.stainAges.set(id, stain.age);
    });
    for (const id of this.stainAges.keys()) if (!seen.has(id)) this.stainAges.delete(id);
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
function stainLook(age: number, now: number): { alpha: number; scale: number } {
  if (age < RULES.stainWarn) {
    const t = age / RULES.stainWarn;
    return { alpha: 0.2 + 0.25 * t + 0.1 * Math.sin(now / 45), scale: 0.45 + 0.5 * t };
  }
  const left = RULES.stainWarn + RULES.stainLife - age;
  return { alpha: 0.95 * Math.min(1, left / 0.5), scale: 1 + 0.03 * Math.sin(now / 200) };
}

function bannerText(session: OnlineSession): string {
  const state = session.state;
  if (session.reconnecting) return 'A conexão caiu: reconectando…';
  switch (state.phase) {
    case PHASE_LOBBY:
      return `Aquecimento: ${state.players.size}/${MAX_PLAYERS} na sala\n${session.isHost ? 'Aperte Enter para começar' : 'O anfitrião começa quando todos entrarem'}`;
    case PHASE_CLEAR:
      if (state.arenaId === BOSS_ARENA.id) return 'O Mata-Borrão foi derrotado!';
      return state.arenaIndex + 1 < state.arenaCount ? 'Arena limpa!' : 'Última arena limpa!';
    case PHASE_CHAPTER:
      return `Capítulo concluído!\n${state.score} pontos`;
    case PHASE_RESTART:
      // Com pontos é fim de jogo: o placar aparece por cima e a arena recomeça do zero.
      return session.records ? 'Fim de jogo!' : 'Sem vidas: recomeçando a arena…';
    case PHASE_TURN:
      return state.bossNext ? 'Cuidado: o Mata-Borrão!' : '';
  }
  if (state.hurry && state.waveTime < RULES.hurryTime + 3) return 'O borrão chegou: depressa!';
  return '';
}
