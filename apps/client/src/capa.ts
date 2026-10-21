import './capa.css';
import '@fontsource/bebas-neue/latin.css';
import { GROUND, LEDGES, STAGE_H, STAGE_W, logoSvg, palcoSvg, pincelSvg } from './art/capa';
import { POSES, runPose, type Pose } from './art/riscote';
import { INK, BOIL } from './art/svg';
import { artSize, boilKey, commonSpecs, riscoteKey, tracaKey, type ArtSpec } from './art/textures';
import { el } from './dom';
import { PLAYER_COLORS } from './draw';

// Capa: a tela antes de entrar numa sala. Só enfeite; nenhuma regra do jogo passa por aqui.
// A cena reaproveita os desenhos do jogo e roda num ciclo fixo: o riscote vermelho encharca a traça
// até ela virar bola e chuta; os outros pulam, correm e piscam nas plataformas.

/** Unidades do palco por pixel do mundo: os desenhos ficam ~3× maiores que no jogo. */
const SCALE = 3.6;
const CYCLE = 10.5;
const SHOTS = [3.2, 4.2, 5.2, 6.2];
const SHOT_FLIGHT = 0.45;
const SHOOTER_X = 150;
const TRACA_X = 470;
/** Altura da mão do riscote atirando acima dos pés, em unidades do palco. */
const HAND = 83;

interface Look {
  key: string;
  x: number;
  y: number;
  flip?: boolean;
  rot?: number;
  opacity?: number;
  scale?: number;
}

type Actor = (t: number) => Look | null;

const lerp = (a: number, b: number, p: number) => a + (b - a) * Math.min(1, Math.max(0, p));

/** Pose parada com piscada de vez em quando (cada boneco num compasso próprio). */
function idle(t: number, offset: number): Pose {
  return (t + offset) % 3.7 < 0.14 ? 'piscando' : 'parado';
}

/** Riscote que atira na traça, corre para chutar a bola e volta. */
const shooter: Actor = (t) => {
  const c = t % CYCLE;
  const key = (pose: Pose) => riscoteKey(0, pose);
  if (c >= 6.8 && c < 7.5) return { key: key(runPose(Math.floor(c * 12))), x: lerp(SHOOTER_X, 390, (c - 6.8) / 0.7), y: GROUND };
  if (c >= 7.5 && c < 7.9) return { key: key('atirando'), x: 390, y: GROUND };
  if (c >= 7.9 && c < 8.9) return { key: key(runPose(Math.floor(c * 12))), x: lerp(390, SHOOTER_X, c - 7.9), y: GROUND, flip: true };
  const shooting = SHOTS.some((s) => c >= s - 0.1 && c < s + 0.35);
  return { key: key(shooting ? 'atirando' : idle(t, 0.4)), x: SHOOTER_X, y: GROUND };
};

const hitsAt = (c: number) => SHOTS.filter((s) => c >= s + SHOT_FLIGHT).length;

const traca: Actor = (t) => {
  const c = t % CYCLE;
  if (c >= 6.7) return null;
  if (c < 3) return { key: tracaKey(Math.floor(c * 9)), x: lerp(STAGE_W + 80, TRACA_X, c / 3), y: GROUND, flip: true };
  // Encharcada, anda cada vez mais devagar.
  return { key: tracaKey(Math.floor(c * (4 - hitsAt(c)))), x: TRACA_X, y: GROUND, flip: true };
};

const tracaSoak: Actor = (t) => {
  const c = t % CYCLE;
  const hits = hitsAt(c);
  if (c >= 6.7 || hits === 0) return null;
  return { key: 'traca-tinta', x: TRACA_X, y: GROUND, flip: true, opacity: hits * 0.24 };
};

const gota: Actor = (t) => {
  const c = t % CYCLE;
  const shot = SHOTS.find((s) => c >= s && c < s + SHOT_FLIGHT);
  if (shot === undefined) return null;
  const p = (c - shot) / SHOT_FLIGHT;
  return { key: 'gota', x: lerp(SHOOTER_X + 58, TRACA_X - 70, p), y: GROUND - HAND + 6 * p * p, scale: 0.6 };
};

const splash: Actor = (t) => {
  const c = t % CYCLE;
  const shot = SHOTS.findIndex((s) => c >= s + SHOT_FLIGHT && c < s + SHOT_FLIGHT + 0.3);
  if (shot >= 0) {
    const p = (c - SHOTS[shot]! - SHOT_FLIGHT) / 0.3;
    return { key: `respingo-azul-${shot % 2}`, x: TRACA_X - 66, y: GROUND - HAND + 8, opacity: 1 - p, scale: 0.7 + 0.5 * p };
  }
  if (c >= 6.7 && c < 7.1) {
    const p = (c - 6.7) / 0.4;
    return { key: 'respingo-azul-1', x: TRACA_X, y: GROUND - 45, opacity: 1 - p, scale: 1.2 + p };
  }
  return null;
};

const bola: Actor = (t) => {
  const c = t % CYCLE;
  if (c < 6.7 || c >= 9.4) return null;
  if (c < 7.5) return { key: 'bola', x: TRACA_X, y: GROUND - 45, rot: 6 * Math.sin(c * 20) };
  const x = lerp(TRACA_X, STAGE_W + 120, (c - 7.5) / 1.9);
  return { key: 'bola', x, y: GROUND - 45, rot: ((x - TRACA_X) / 40) * (180 / Math.PI) };
};

/** Pulinho no lugar: sobe com a pose de pulo e desce com a de queda. */
function hopper(slot: number, x: number, y: number, period: number, offset: number): Actor {
  return (t) => {
    const c = (t + offset) % period;
    if (c >= 0.8) return { key: riscoteKey(slot, 'parado'), x, y };
    const p = c / 0.8;
    return { key: riscoteKey(slot, p < 0.5 ? 'pulando' : 'caindo'), x, y: y - 280 * p * (1 - p) };
  };
}

/** Vai e volta na plataforma, com uma pausa em cada ponta. */
function pacer(slot: number, x0: number, x1: number, y: number): Actor {
  const run = 1.4;
  const rest = 1.1;
  return (t) => {
    const c = t % (2 * (run + rest));
    const going = c < run + rest;
    const k = going ? c : c - run - rest;
    if (k >= run) return { key: riscoteKey(slot, idle(t, slot)), x: going ? x1 : x0, y, flip: going };
    return { key: riscoteKey(slot, runPose(Math.floor(t * 12))), x: going ? lerp(x0, x1, k / run) : lerp(x1, x0, k / run), y, flip: !going };
  };
}

const standing = (slot: number, x: number, y: number, flip: boolean, offset: number): Actor => (t) => ({
  key: riscoteKey(slot, idle(t, offset)),
  x,
  y,
  flip,
});

const saltador: Actor = (t) => {
  const c = t % 1.5;
  const x = 520;
  const y = LEDGES.meio.y;
  if (c >= 0.7) return { key: 'saltador', x, y, flip: true };
  const p = c / 0.7;
  return { key: 'saltador-ar', x, y: y - 180 * p * (1 - p), flip: true };
};

const pote: Actor = (t) => ({ key: 'item-1', x: 432, y: LEDGES.meio.y - 4 - 4 * Math.abs(Math.sin(t * 2.2)) });

const borrao: Actor = (t) => ({
  key: 'borrao',
  x: 890 + 14 * Math.sin(t * 0.6),
  y: 48 + 8 * Math.sin(t * 1.1),
  opacity: 0.92,
});

const ACTORS: Actor[] = [
  borrao,
  saltador,
  pote,
  standing(2, 120, LEDGES.esquerda.y, false, 1.7),
  hopper(3, 250, LEDGES.esquerda.y, 1.9, 0),
  pacer(1, 800, 920, LEDGES.direita.y),
  standing(4, 720, LEDGES.direita.y, true, 2.6),
  traca,
  tracaSoak,
  shooter,
  bola,
  gota,
  splash,
];

/** Os quadros usados pela cena, para carregar antes de começar. */
function usedKeys(): string[] {
  const base = ['traca-tinta', 'gota', 'bola', 'saltador', 'saltador-ar', 'item-1', 'borrao', 'respingo-azul-0', 'respingo-azul-1'];
  for (let f = 0; f < 3; f++) base.push(tracaKey(f));
  for (let slot = 0; slot < PLAYER_COLORS.length; slot++) for (const pose of POSES) base.push(riscoteKey(slot, pose));
  return base;
}

interface Sprite {
  img: HTMLImageElement;
  src: string;
}

let running = false;
let frame = 0;
let render: ((t: number) => void) | null = null;

/** Monta a capa uma vez: logotipo, palco e bonecos; o pincel dos botões vai para o CSS. */
function mount(): void {
  el('logo-arte').innerHTML = logoSvg();
  const root = document.documentElement.style;
  const bg = (svg: string) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg preserveAspectRatio="none" '))}")`;
  root.setProperty('--pincel-tinta', bg(pincelSvg(INK)));
  root.setProperty('--pincel-azul', bg(pincelSvg('#2f6fd6')));

  const stage = el('palco');
  const floor = new Image();
  floor.className = 'palco-fundo';
  floor.alt = '';
  floor.src = svgUrl(palcoSvg());
  stage.append(floor);

  const specs = new Map<string, ArtSpec>(commonSpecs(PLAYER_COLORS).map((s) => [s.key, s]));
  const urls = new Map<string, string>();
  const url = (key: string): { src: string; spec: ArtSpec } | null => {
    const spec = specs.get(key);
    if (!spec) return null;
    let src = urls.get(key);
    if (!src) {
      src = svgUrl(spec.svg);
      urls.set(key, src);
    }
    return { src, spec };
  };
  // Pré-carrega todas as variações para a troca de quadro não piscar.
  for (const key of usedKeys()) for (let v = 0; v < BOIL; v++) {
    const art = url(boilKey(key, v)) ?? url(key);
    if (art) new Image().src = art.src;
  }

  const sprites: Sprite[] = ACTORS.map(() => {
    const img = new Image();
    img.alt = '';
    img.className = 'ator';
    img.decoding = 'async';
    stage.append(img);
    return { img, src: '' };
  });

  render = (t) => {
    // Linha viva: a mesma troca de variação do jogo, ~9 por segundo.
    const v = Math.floor(t * 9) % BOIL;
    ACTORS.forEach((actor, i) => {
      const sprite = sprites[i]!;
      const look = actor(t);
      const art = look && (url(boilKey(look.key, v)) ?? url(look.key));
      if (!look || !art) {
        sprite.img.hidden = true;
        return;
      }
      sprite.img.hidden = false;
      if (sprite.src !== art.src) {
        sprite.img.src = art.src;
        sprite.src = art.src;
      }
      const size = artSize(art.spec);
      const s = look.scale ?? 1;
      const w = size.w * SCALE * s;
      const h = size.h * SCALE * s;
      const ox = look.flip ? 1 - art.spec.ox : art.spec.ox;
      const style = sprite.img.style;
      style.width = `${(w / STAGE_W) * 100}%`;
      style.left = `${((look.x - ox * w) / STAGE_W) * 100}%`;
      style.top = `${((look.y - art.spec.oy * h) / STAGE_H) * 100}%`;
      style.opacity = look.opacity === undefined ? '' : String(look.opacity);
      style.transform = `${look.flip ? 'scaleX(-1) ' : ''}${look.rot ? `rotate(${look.rot}deg)` : ''}`;
    });
  };
}

/** Endereço curto (blob) para o SVG; cada quadro ganha o seu uma vez e a troca reaproveita a imagem já decodificada. */
function svgUrl(svg: string): string {
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop(now: number): void {
  if (!running) return;
  render?.(now / 1000);
  frame = requestAnimationFrame(loop);
}

/** Liga a capa (fora de sala) ou desliga (dentro da partida); desligada, a animação para. */
export function setCover(on: boolean): void {
  document.body.classList.toggle('inicio', on);
  if (on && !render) mount();
  if (on === running) return;
  running = on;
  if (!on) {
    cancelAnimationFrame(frame);
    return;
  }
  if (reducedMotion()) {
    // Sem animação: um quadro parado no meio da ação.
    running = false;
    render?.(5.5);
    return;
  }
  frame = requestAnimationFrame(loop);
}
