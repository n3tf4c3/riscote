import * as Phaser from 'phaser';
import {
  BORRAO_SIZE,
  BTN_ATTACK,
  ENEMY_BORRAO,
  ENEMY_SALTADOR,
  ENEMY_SIZE,
  MAX_PLAYERS,
  MODE_WALK,
  PHASE_CHAPTER,
  PHASE_CLEAR,
  PHASE_LOBBY,
  PHASE_RESTART,
  PHASE_TURN,
  RULES,
  TICK_DT,
  TILE,
  tubeRect,
} from '@riscote/shared';
import { ArtLayer } from './art/layer';
import type { Pose } from './art/riscote';
import { RES, arenaSpec, artSize, commonSpecs, loadArt, riscoteKey } from './art/textures';
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
import type { InputSource } from './input';
import type { OnlineSession } from './net';

const MAX_FRAME = 0.25;
const GREY = 0x888888;
/** Quanto tempo a pose de tiro fica na tela depois do disparo. */
const SHOT_POSE_MS = 160;
/** Passada da corrida: troca de quadro a cada tantos pixels percorridos. */
const STRIDE = 11;

const DEPTH_ARENA = 0;
const DEPTH_ITEM = 1;
const DEPTH_ENEMY = 2;
const DEPTH_PLAYER = 3;
const DEPTH_OVERLAY = 4;
const DEPTH_BANNER = 5;

interface Motion {
  x: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

function pickPose(m: Motion, down: boolean, shooting: boolean): Pose {
  if (down) return 'derrubado';
  if (!m.onGround) return m.vy < 0 ? 'pulando' : 'caindo';
  if (shooting) return 'atirando';
  if (Math.abs(m.vx) > 20) return Math.floor(m.x / STRIDE) % 2 === 0 ? 'correA' : 'correB';
  return 'parado';
}

/** Modo online: o próprio boneco é previsto; inimigos, gotas e os outros chegam interpolados do servidor. */
export class OnlineScene extends Phaser.Scene {
  private acc = 0;
  private prevX = 0;
  private prevY = 0;
  private prevButtons = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;
  /** Arte de pincel; enquanto as texturas não ficam prontas, a cena desenha o greybox. */
  private art: ArtLayer | null = null;
  private generation = 0;
  /** Último disparo visto de cada jogador (por slot), para a pose de tiro. */
  private shotAt: number[] = [];

  constructor(private readonly ctx: { session: () => OnlineSession | null; input: InputSource }) {
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
    this.acc = 0;
    this.prevX = session.local.x;
    this.prevY = session.local.y;
    this.shotAt = [];

    this.art = null;
    const generation = ++this.generation;
    const common = commonSpecs(PLAYER_COLORS);
    const ground = arenaSpec(arena);
    loadArt(this.textures, [...common, ground])
      .then(() => {
        // A cena pode ter recomeçado (outra arena) enquanto as texturas carregavam.
        if (generation !== this.generation) return;
        greybox.destroy();
        this.add.image(0, 0, ground.key).setOrigin(0).setDisplaySize(w, h).setDepth(DEPTH_ARENA);
        const tube = common.find((s) => s.key === 'tubo');
        for (const t of showTubes && tube ? arena.tubes : []) {
          if (!tube) break;
          const size = artSize(tube);
          const r = tubeRect(t);
          this.add
            .image(r.x + r.w / 2, r.y + r.h, 'tubo')
            .setOrigin(tube.ox, tube.oy)
            .setDisplaySize(size.w, size.h)
            .setDepth(DEPTH_ARENA);
        }
        this.art = new ArtLayer(this, common);
      })
      .catch((err: unknown) => console.warn('arte não carregou; seguindo no greybox', err));
  }

  update(_time: number, deltaMs: number): void {
    const session = this.ctx.session();
    if (!session || !this.gfx) return;

    const now = performance.now();
    this.acc = Math.min(this.acc + deltaMs / 1000, MAX_FRAME);
    const buttons = this.ctx.input.buttons();
    if (buttons & BTN_ATTACK && !(this.prevButtons & BTN_ATTACK)) this.shotAt[session.slot] = now;
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
    const remotes = session.remotePlayers(now);
    const drops = session.dropViews(now);
    const me = session.me;
    const alpha = this.acc / TICK_DT;
    const local = session.local;
    const localX = this.prevX + (local.x - this.prevX) * alpha;
    const localY = this.prevY + (local.y - this.prevY) * alpha;
    const localLook: PlayerLook | null = me
      ? { facing: local.facing, ink: me.ink, down: me.down, rescue: me.rescue, invuln: me.invuln, inkGauge, hp: me.hp, star: me.star }
      : null;

    const art = this.art;
    if (art) {
      this.noteShots(remotes, drops, now);
      art.begin();
      state.items.forEach((item) => {
        if (item.ttl < 3 && Math.floor(now / 150) % 2 === 0) return;
        const s = RULES.itemSize * TILE;
        art.draw(`item-${item.kind}`, item.x + s / 2, item.y + s + Math.sin(now / 220) * 1.5, DEPTH_ITEM);
      });
      for (const e of session.enemyViews(now)) {
        const flip = e.facing < 0;
        if (e.kind === ENEMY_BORRAO) {
          const size = BORRAO_SIZE * TILE;
          art.draw('borrao', e.x + size / 2, e.y + size / 2, DEPTH_ENEMY, { flip });
          continue;
        }
        const size = ENEMY_SIZE * TILE;
        if (e.mode !== MODE_WALK) {
          // Bola de tinta; rolando, gira com o deslocamento.
          art.draw('bola', e.x + size / 2, e.y + size / 2, DEPTH_ENEMY, { angle: ((e.x / (size / 2)) * 180) / Math.PI });
          continue;
        }
        const key = e.kind === ENEMY_SALTADOR ? 'saltador' : 'traca';
        art.draw(key, e.x + size / 2, e.y + size, DEPTH_ENEMY, { flip });
        const soaked = Math.min(1, e.soak / Math.max(1, state.soakToBall));
        if (soaked > 0) art.draw(`${key}-tinta`, e.x + size / 2, e.y + size, DEPTH_ENEMY, { flip, alpha: 0.35 + 0.65 * soaked });
      }
      for (const r of remotes) {
        this.drawRiscote(art, r.slot, r.x, r.y, { ...r, inkGauge }, r, now, DEPTH_PLAYER, false);
      }
      if (localLook) {
        this.drawRiscote(art, session.slot, localX, localY, localLook, { x: localX, vx: local.vx, vy: local.vy, onGround: local.onGround }, now, DEPTH_PLAYER + 0.5, true);
      }
      art.end();
    } else {
      state.items.forEach((item) => drawItem(g, item.x, item.y, item.kind, item.ttl, now));
      for (const e of session.enemyViews(now)) drawEnemy(g, e.x, e.y, e, state.soakToBall);
      for (const r of remotes) drawPlayerFull(g, r.x, r.y, session.params, { ...r, inkGauge }, PLAYER_COLORS[r.slot] ?? GREY, false, now);
      if (localLook) drawPlayerFull(g, localX, localY, session.params, localLook, PLAYER_COLORS[session.slot] ?? GREY, true, now);
    }
    for (const d of drops) drawDrop(g, d.x, d.y, PLAYER_COLORS[d.slot] ?? INK);

    if (state.phase === PHASE_TURN) {
      const arena = session.arena;
      drawPageTurn(g, arena.cols * TILE, arena.rows * TILE, 1 - state.phaseTime / RULES.turnDelay);
    }
    this.banner.setText(bannerText(session));
  }

  private drawRiscote(art: ArtLayer, slot: number, x: number, y: number, look: PlayerLook, motion: Motion, now: number, depth: number, isLocal: boolean): void {
    const params = this.ctx.session()?.params;
    if (!params) return;
    const w = params.playerWidth * TILE;
    const h = params.playerHeight * TILE;
    const shooting = now - (this.shotAt[slot] ?? -Infinity) < SHOT_POSE_MS;
    const pose = pickPose(motion, look.down, shooting);
    art.draw(riscoteKey(slot, pose), x + w / 2, y + h, depth, { flip: look.facing < 0, alpha: playerAlpha(look, now) });
    drawPlayerOverlay(this.gfx, x, y, params, look, PLAYER_COLORS[slot] ?? GREY, isLocal, now);
  }

  /** Gota nova junto de um jogador remoto: ele acabou de atirar. */
  private noteShots(remotes: Array<{ slot: number; x: number; y: number }>, drops: Array<{ slot: number; x: number; y: number }>, now: number): void {
    for (const d of drops) {
      const r = remotes.find((p) => p.slot === d.slot);
      if (r && Math.abs(d.x - r.x) < TILE * 1.3 && Math.abs(d.y - r.y) < TILE * 1.3) this.shotAt[d.slot] = now;
    }
  }
}

function bannerText(session: OnlineSession): string {
  const state = session.state;
  if (session.reconnecting) return 'A conexão caiu: reconectando…';
  switch (state.phase) {
    case PHASE_LOBBY:
      return `Aquecimento: ${state.players.size}/${MAX_PLAYERS} na sala\n${session.isHost ? 'Aperte Enter para começar' : 'O anfitrião começa quando todos entrarem'}`;
    case PHASE_CLEAR:
      return state.arenaIndex + 1 < state.arenaCount ? 'Arena limpa!' : 'Última arena limpa!';
    case PHASE_CHAPTER:
      return `Capítulo concluído!\n${state.score} pontos`;
    case PHASE_RESTART:
      return 'Sem vidas: recomeçando a arena…';
    case PHASE_TURN:
      return '';
  }
  if (state.hurry && state.waveTime < RULES.hurryTime + 3) return 'O borrão chegou: depressa!';
  return '';
}
