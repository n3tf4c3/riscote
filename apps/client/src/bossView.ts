import * as Phaser from 'phaser';
import {
  ATTACK_RAIN,
  ATTACK_STAMP,
  ATTACK_WAVE,
  BOSS_DEFEATED,
  BOSS_HEAVY,
  BOSS_INTRO,
  BOSS_ROAM,
  BOSS_RULES,
  BOSS_STAMP,
  BOSS_WINDUP,
  EMPTY,
  HAZARD_WAVE,
  TILE,
  cellAt,
  type Arena,
} from '@riscote/shared';
import { type BossPose } from './art/boss';
import type { ArtLayer } from './art/layer';
import { RES } from './art/textures';
import { INK, INK_BLUE } from './draw';
import type { Effects } from './fx';

// O chefe na tela: sprite e poses, avisos dos ataques, barra de vida, letreiro de entrada
// e os efeitos de impacto. Só lê o estado que chega do servidor; nada aqui muda regra.

const WARN = 0xc8402a;
const PAPER = 0xf1ead9;
const BAR_RED = 0x8f2a1c;

/** O que o servidor manda do chefe (espelha `BossSchema`). */
export interface BossSnapshot {
  state: number;
  attack: number;
  x: number;
  y: number;
  dir: number;
  hp: number;
  maxHp: number;
  soak: number;
  soakMax: number;
  timer: number;
  targetX: number;
  impacts: number;
  hits: number;
}

export interface HazardSnapshot {
  id: string;
  kind: number;
  x: number;
  y: number;
  w: number;
  h: number;
  wait: number;
}

export interface BossDepths {
  boss: number;
  hazard: number;
  text: number;
}

const ease = (t: number) => (t >= 1 ? 0 : (1 - t) * (1 - t));

export class BossView {
  private readonly w = BOSS_RULES.width * TILE;
  private readonly h = BOSS_RULES.height * TILE;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private readonly heavyText: Phaser.GameObjects.Text;
  private seen = false;
  private impacts = 0;
  private hits = 0;
  private state = -1;
  private landAt = -Infinity;
  private hitAt = -Infinity;
  private shownHp = 0;
  private barFill = 0;
  private lastDrip = 0;
  private lastDust = 0;
  private titleShown = false;
  private hazards = new Map<string, HazardSnapshot>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    private readonly arena: Arena,
    private readonly depths: BossDepths,
  ) {
    const text = (size: number, color: string, stroke = 6) =>
      scene.add
        .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, color, fontStyle: 'bold', stroke: '#f1ead9', strokeThickness: stroke, align: 'center' })
        .setOrigin(0.5)
        .setResolution(RES)
        .setDepth(depths.text)
        .setVisible(false);
    const width = arena.cols * TILE;
    this.title = text(34, '#141414', 8).setPosition(width / 2, arena.rows * TILE * 0.36).setText('MATA-BORRÃO');
    this.subtitle = text(13, '#7d2219', 5).setPosition(width / 2, arena.rows * TILE * 0.36 + 28).setText('ele quer secar a página!');
    this.label = text(9, '#141414', 4).setOrigin(1, 0.5).setPosition(width * 0.25 - 4, 9).setText('MATA-BORRÃO');
    this.heavyText = text(11, '#2f6fd6', 4).setText('PESADO! bolas ×2');
  }

  /**
   * Um quadro: `back` recebe sombras e avisos no chão (atrás dos bonecos), `front` os avisos de
   * perigo e a barra de vida (na frente de tudo).
   */
  draw(art: ArtLayer | null, back: Phaser.GameObjects.Graphics, front: Phaser.GameObjects.Graphics, boss: BossSnapshot | null, hazards: HazardSnapshot[], now: number, dt: number): void {
    if (!boss || boss.maxHp === 0) {
      this.hide();
      return;
    }
    this.react(boss, hazards, now);
    this.drawWarnings(back, front, boss, hazards, now);
    this.drawHazards(art, front, hazards, now);
    this.drawBoss(art, front, boss, now);
    this.drawBar(front, boss, now, dt);
    this.drawTexts(boss, now);
  }

  hide(): void {
    for (const t of [this.title, this.subtitle, this.label, this.heavyText]) t.setVisible(false);
  }

  /** Efeitos disparados por mudanças: batida no chão, golpe levado, peso, derrota, borrões estourando. */
  private react(b: BossSnapshot, hazards: HazardSnapshot[], now: number): void {
    const cx = b.x + this.w / 2;
    const floor = b.y + this.h;
    if (!this.seen) {
      this.seen = true;
      this.impacts = b.impacts;
      this.hits = b.hits;
      this.state = b.state;
      this.shownHp = b.hp;
      this.barFill = b.state === BOSS_INTRO ? 0 : 1;
    }
    if (b.impacts > this.impacts) {
      const first = this.impacts === 0;
      this.impacts = b.impacts;
      this.landAt = now;
      this.fx.shake(first ? 520 : 300, first ? 0.018 : 0.01);
      this.fx.dust(b.x + this.w * 0.15, floor, 1);
      this.fx.dust(b.x + this.w * 0.85, floor, 1);
      this.fx.splat(cx, floor - 4, false, first ? 2.4 : 1.4, INK);
      this.fx.droplets(cx, floor - 6, 0x8f8169, first ? 24 : 12, 260, -Math.PI / 2, Math.PI * 1.2);
    }
    if (b.hits > this.hits) {
      this.hits = b.hits;
      this.hitAt = now;
      this.fx.splat(cx, b.y + this.h * 0.55, true, 2, INK_BLUE);
      this.fx.droplets(cx, b.y + this.h * 0.4, INK_BLUE, 18, 240);
      this.fx.sparkle(cx, b.y + this.h * 0.4, 0xe8b400, 10, 14);
      this.fx.shake(220, 0.008);
    }
    if (b.state !== this.state) {
      if (b.state === BOSS_HEAVY) {
        this.fx.splat(cx, b.y + this.h * 0.7, true, 2.2, INK_BLUE);
        this.fx.droplets(cx, b.y + this.h * 0.5, INK_BLUE, 20, 200, -Math.PI / 2, Math.PI * 1.5);
      } else if (b.state === BOSS_DEFEATED) {
        for (let i = 0; i < 5; i++) {
          this.fx.splat(b.x + this.w * (0.1 + i * 0.2), b.y + this.h * (0.3 + (i % 2) * 0.4), i % 2 === 0, 2.2, i % 2 === 0 ? INK_BLUE : INK);
        }
        this.fx.sparkle(cx, b.y + this.h / 2, 0xe8b400, 24, 24);
        this.fx.shake(700, 0.02);
      } else if (b.state === BOSS_STAMP) {
        this.fx.dust(cx, floor, 0.8);
        this.fx.streaks(cx, floor - 10, 0, 6);
      }
      this.state = b.state;
    }
    if (b.state === BOSS_HEAVY && now - this.lastDrip > 120) {
      this.lastDrip = now;
      this.fx.droplets(b.x + this.w * (0.2 + 0.6 * ((now / 97) % 1)), floor - 4, INK_BLUE, 1, 30, Math.PI / 2, 0.5);
    }

    const seen = new Set<string>();
    for (const z of hazards) {
      seen.add(z.id);
      const old = this.hazards.get(z.id);
      if (z.kind === HAZARD_WAVE && now - this.lastDust > 60) {
        this.lastDust = now;
        this.fx.droplets(z.x + z.w / 2, z.y + z.h, 0x8f8169, 1, 40, -Math.PI / 2, 1.2);
      }
      if (z.kind !== HAZARD_WAVE && old && old.wait > 0 && z.wait <= 0) this.fx.droplets(z.x + z.w / 2, z.y, INK, 4, 60, Math.PI / 2, 0.8);
      this.hazards.set(z.id, z);
    }
    for (const [id, z] of this.hazards) {
      if (seen.has(id)) continue;
      this.hazards.delete(id);
      // Borrão que chegou ao chão ou a uma plataforma: estoura em nanquim.
      if (z.kind !== HAZARD_WAVE && z.wait <= 0 && b.state !== BOSS_DEFEATED) this.fx.splat(z.x + z.w / 2, z.y + z.h, false, 1.1, INK);
    }
  }

  /** Avisos legíveis: sombra onde a carimbada cai, setas da onda, marcas da chuva e o "!" sobre o chefe. */
  private drawWarnings(back: Phaser.GameObjects.Graphics, front: Phaser.GameObjects.Graphics, b: BossSnapshot, hazards: HazardSnapshot[], now: number): void {
    const floor = (this.arena.rows - 1) * TILE;
    const blink = Math.floor(now / 110) % 2 === 0;
    if ((b.state === BOSS_WINDUP && b.attack === ATTACK_STAMP) || b.state === BOSS_STAMP) {
      const p = b.state === BOSS_STAMP ? 1 : 1 - b.timer / BOSS_RULES.stampWindup;
      const cx = b.targetX + this.w / 2;
      const rw = this.w * (0.55 + 0.5 * p);
      back.fillStyle(INK, 0.18 + 0.25 * p).fillEllipse(cx, floor - 2, rw, 8);
      back.lineStyle(2, WARN, blink ? 0.95 : 0.5).strokeEllipse(cx, floor - 2, rw + 6, 12);
      this.mark(front, cx, floor - this.h - 14, blink);
    }
    if (b.state === BOSS_WINDUP && b.attack === ATTACK_WAVE) {
      const p = 1 - b.timer / BOSS_RULES.waveWindup;
      const left = TILE;
      const right = (this.arena.cols - 1) * TILE;
      const alpha = blink ? 0.9 : 0.45;
      // Setas rente ao chão, saindo do chefe para os dois lados.
      for (const dir of [-1, 1]) {
        const start = dir < 0 ? b.x : b.x + this.w;
        for (let x = start + dir * 8; dir < 0 ? x > left : x < right; x += dir * TILE * 1.5) {
          const d = Math.abs(x - start) / TILE;
          if (d > 2 + p * 26) break;
          back.lineStyle(2.5, WARN, alpha).beginPath().moveTo(x - dir * 4, floor - 9).lineTo(x + dir * 2, floor - 5).lineTo(x - dir * 4, floor - 1).strokePath();
        }
      }
    }
    // Na carimbada o "!" fica sobre a sombra, onde ele vai cair.
    if (b.state === BOSS_WINDUP && b.attack !== ATTACK_STAMP) this.mark(front, b.x + this.w / 2, b.y - 26, blink);

    for (const z of hazards) {
      if (z.kind === HAZARD_WAVE || z.wait <= 0) continue;
      const cx = z.x + z.w / 2;
      const col = Math.floor(cx / TILE);
      let row = Math.floor((z.y + z.h) / TILE);
      while (row < this.arena.rows - 1 && cellAt(this.arena, col, row) === EMPTY) row++;
      const bottom = row * TILE;
      // Coluna tracejada até onde o borrão vai estourar, com a marca no fim.
      const p = 1 - z.wait / BOSS_RULES.rainWindup;
      for (let y = z.y + z.h + 4; y < bottom - 4; y += 10) back.lineStyle(1.5, WARN, 0.25 + 0.45 * p).lineBetween(cx, y, cx, Math.min(y + 5, bottom - 4));
      back.lineStyle(2, WARN, blink ? 0.9 : 0.5).strokeEllipse(cx, bottom - 2, z.w * (0.8 + 0.6 * p), 6);
      this.mark(front, cx, z.y - 6, blink);
    }
  }

  /** "!" de tinta vermelha com contorno de papel: o sinal de todo ataque que vem. */
  private mark(g: Phaser.GameObjects.Graphics, x: number, y: number, on: boolean): void {
    const s = on ? 1.15 : 1;
    g.lineStyle(6, PAPER, 1).lineBetween(x, y - 9 * s, x, y - 2 * s);
    g.fillStyle(PAPER, 1).fillCircle(x, y + 3 * s, 3.2);
    g.lineStyle(3.5, WARN, 1).lineBetween(x, y - 9 * s, x, y - 2 * s);
    g.fillStyle(WARN, 1).fillCircle(x, y + 3 * s, 2);
  }

  private drawHazards(art: ArtLayer | null, g: Phaser.GameObjects.Graphics, hazards: HazardSnapshot[], now: number): void {
    for (const z of hazards) {
      if (z.kind === HAZARD_WAVE) {
        const flip = this.waveDir(z) < 0;
        if (art) art.draw('chefe-onda', z.x + z.w / 2, z.y + z.h, this.depths.hazard, { flip, sy: 1 + 0.1 * Math.sin(now / 40) });
        else g.fillStyle(0xd8c39c).fillTriangle(z.x, z.y + z.h, z.x + z.w, z.y + z.h, z.x + z.w / 2, z.y);
        continue;
      }
      const waiting = z.wait > 0;
      const jitter = waiting ? Math.sin(now / 30) * 1.2 : 0;
      const alpha = waiting ? 0.55 : 1;
      const sy = waiting ? 1 : 1.15;
      if (art) art.draw('chefe-borrao', z.x + z.w / 2 + jitter, z.y + z.h / 2, this.depths.hazard, { alpha, sx: 1 / sy, sy });
      else g.fillStyle(INK, alpha).fillCircle(z.x + z.w / 2, z.y + z.h / 2, z.w / 2);
    }
  }

  private waveDir(z: HazardSnapshot): number {
    const old = this.hazards.get(z.id);
    return old && old.x !== z.x ? Math.sign(z.x - old.x) : z.x < this.arena.cols * TILE / 2 ? -1 : 1;
  }

  private drawBoss(art: ArtLayer | null, g: Phaser.GameObjects.Graphics, b: BossSnapshot, now: number): void {
    const land = ease((now - this.landAt) / 260);
    const hurt = now - this.hitAt < BOSS_RULES.hurtTime * 1000 + 60;
    let pose: BossPose = 'parado';
    let sx = 1;
    let sy = 1;
    let angle = 0;
    let dx = 0;
    let alpha = 1;
    switch (b.state) {
      case BOSS_INTRO:
        pose = this.impacts === 0 ? 'salto' : 'grito';
        if (this.impacts === 0) {
          sx = 0.9;
          sy = 1.12;
        }
        break;
      case BOSS_ROAM:
        // Balança sobre a base curva, como um mata-borrão de verdade.
        angle = Math.sin(now / 200) * 7;
        break;
      case BOSS_WINDUP: {
        pose = b.attack === ATTACK_RAIN ? 'grito' : 'raiva';
        dx = Math.sin(now / 22) * 1.5;
        const p = 1 - b.timer / (b.attack === ATTACK_STAMP ? BOSS_RULES.stampWindup : b.attack === ATTACK_WAVE ? BOSS_RULES.waveWindup : BOSS_RULES.rainWindup);
        if (b.attack === ATTACK_STAMP) {
          sx = 1 + 0.14 * p;
          sy = 1 - 0.16 * p;
        } else if (b.attack === ATTACK_WAVE) {
          sy = 1 + 0.12 * p;
          sx = 1 - 0.06 * p;
          angle = -b.dir * 6 * p;
        }
        break;
      }
      case BOSS_STAMP:
        pose = 'salto';
        sx = 0.9;
        sy = 1.12;
        break;
      case BOSS_HEAVY:
        pose = 'pesado';
        angle = Math.sin(now / 520) * 3;
        sx = 1 + 0.04 * Math.sin(now / 300);
        sy = 1 - 0.04 * Math.sin(now / 300);
        break;
      case BOSS_DEFEATED: {
        pose = 'derrota';
        const t = 1 - b.timer / BOSS_RULES.defeatTime;
        angle = b.dir * 28 * Math.min(1, t * 2);
        sy = 1 - 0.3 * t;
        alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
        break;
      }
    }
    if (land > 0) {
      sx *= 1 + 0.22 * land;
      sy *= 1 - 0.2 * land;
    }
    if (hurt && b.state !== BOSS_DEFEATED) {
      pose = 'golpe';
      dx += Math.sin(now / 15) * 2.5;
    }
    const x = b.x + this.w / 2 + dx;
    const y = b.y + this.h;
    if (art) art.draw(`chefe-${pose}`, x, y, this.depths.boss, { flip: b.dir < 0, sx, sy, angle, alpha });
    else g.fillStyle(0x8a5a34, alpha).fillRoundedRect(b.x, b.y, this.w, this.h, 12);
  }

  /** Barra de vida no alto: enche na entrada, pisca no golpe, marca as fases e o medidor de encharcado. */
  private drawBar(g: Phaser.GameObjects.Graphics, b: BossSnapshot, now: number, dt: number): void {
    const width = this.arena.cols * TILE;
    const x = width * 0.25;
    const w = width * 0.5;
    const y = 5;
    const h = 8;
    this.barFill = b.state === BOSS_INTRO && this.impacts === 0 ? 0 : Math.min(1, this.barFill + dt / 0.9);
    // O pedaço perdido fica claro um instante e encolhe atrás da vida atual.
    this.shownHp = now - this.hitAt < 350 ? this.shownHp : Math.max(b.hp, this.shownHp - dt * b.maxHp * 0.8);
    if (b.hp > this.shownHp) this.shownHp = b.hp;
    const frac = (b.hp / b.maxHp) * this.barFill;
    const lost = (this.shownHp / b.maxHp) * this.barFill;
    g.fillStyle(PAPER, 1).fillRect(x - 2, y - 2, w + 4, h + 8);
    g.fillStyle(0xe8c9b8, 1).fillRect(x, y, w * lost, h);
    const flash = now - this.hitAt < 120;
    g.fillStyle(flash ? 0xffffff : BAR_RED, 1).fillRect(x, y, w * frac, h);
    g.lineStyle(1.6, INK, 1).strokeRect(x, y, w, h);
    for (const f of [BOSS_RULES.phase2At, BOSS_RULES.phase3At]) g.lineStyle(1.2, INK, 0.8).lineBetween(x + w * f, y - 1, x + w * f, y + h + 1);
    // Medidor de encharcado, fino, logo abaixo.
    const soak = b.state === BOSS_HEAVY ? b.timer / BOSS_RULES.heavyTime : b.soak / Math.max(1, b.soakMax);
    g.fillStyle(INK_BLUE, b.state === BOSS_HEAVY && Math.floor(now / 150) % 2 === 0 ? 0.6 : 1).fillRect(x, y + h + 2, w * soak, 3);
    g.lineStyle(1, INK, 0.7).strokeRect(x, y + h + 2, w, 3);
  }

  private drawTexts(b: BossSnapshot, now: number): void {
    this.label.setVisible(true);
    const showTitle = b.state === BOSS_INTRO && this.impacts > 0;
    if (showTitle && !this.titleShown) {
      this.titleShown = true;
      for (const t of [this.title, this.subtitle]) {
        this.scene.tweens.killTweensOf(t);
        t.setVisible(true).setAlpha(1).setScale(2.2).setAngle(-6);
        this.scene.tweens.add({ targets: t, scale: 1, angle: -2, duration: 380, ease: 'Back.Out' });
      }
    } else if (!showTitle && this.titleShown) {
      this.titleShown = false;
      for (const t of [this.title, this.subtitle]) {
        this.scene.tweens.killTweensOf(t);
        this.scene.tweens.add({ targets: t, alpha: 0, scale: 0.8, duration: 260, onComplete: () => t.setVisible(false) });
      }
    }
    const heavy = b.state === BOSS_HEAVY;
    this.heavyText.setVisible(heavy);
    if (heavy) this.heavyText.setPosition(b.x + this.w / 2, b.y - 14 + Math.sin(now / 160) * 2);
  }
}

/**
 * Virada para a página do chefe: a folha nova chega já manchada, com o nanquim escorrendo do alto
 * e o papel tremendo. Desenha por cima de `drawPageTurn`.
 */
export function drawBossTurn(g: Phaser.GameObjects.Graphics, fx: Effects, width: number, height: number, progress: number, now: number): void {
  const p = Math.max(0, Math.min(1, progress));
  const edge = width * (1 - p);
  if (p < 0.15) fx.shake(260, 0.004);
  // Escorridos de nanquim descendo pela folha nova.
  for (let i = 0; i < 9; i++) {
    const x = edge + (width - edge) * ((i * 0.37 + 0.11) % 1);
    if (x <= edge + 4) continue;
    const len = height * Math.min(1, p * (0.6 + ((i * 7) % 5) * 0.12));
    g.fillStyle(INK, 0.75).fillRect(x - 2, 0, 4 + (i % 3), len);
    g.fillCircle(x, len, 4 + (i % 3));
  }
  // Mancha grande no meio da página, crescendo, com o "!" de aviso.
  const cx = Math.max(edge + 40, width / 2);
  const r = 18 + 40 * p + Math.sin(now / 60) * 2;
  g.fillStyle(INK, 0.85 * p).fillCircle(cx, height / 2, r);
  g.fillStyle(INK, 0.6 * p).fillCircle(cx - r * 0.8, height / 2 + r * 0.5, r * 0.35).fillCircle(cx + r * 0.9, height / 2 - r * 0.3, r * 0.28);
  if (p > 0.4) {
    g.lineStyle(9, WARN, 1).lineBetween(cx, height / 2 - r * 0.55, cx, height / 2 + r * 0.1);
    g.fillStyle(WARN, 1).fillCircle(cx, height / 2 + r * 0.38, 5);
  }
}
