import * as Phaser from 'phaser';
import { ARENAS, arenaHeight, arenaWidth, type Arena } from '@riscote/shared';
import { ArenaScene } from './ArenaScene';
import { el } from './dom';
import type { InputSource } from './input';
import { Metrics, summary } from './metrics';
import { loadParams, mountTuning } from './tuning';

const ARENA_KEY = 'riscote.arena.v1';

function loadArenaIndex(): number {
  try {
    const saved = localStorage.getItem(ARENA_KEY);
    const i = Number(saved);
    if (saved !== null && Number.isInteger(i) && i >= 0 && i < ARENAS.length) return i;
  } catch {
    // Sem armazenamento.
  }
  return 1;
}

/** Modo local (etapa 1): sentir e ajustar o movimento, sem rede. */
export function bootLocal(input: InputSource): void {
  el('panel-local').hidden = false;
  el('game-placeholder').remove();

  const params = loadParams();
  const metrics = new Metrics();
  let arenaIndex = loadArenaIndex();
  const currentArena = (): Arena => ARENAS[arenaIndex]!;

  const scene = new ArenaScene({ params, input, metrics, arena: currentArena });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: arenaWidth(currentArena()),
    height: arenaHeight(currentArena()),
    backgroundColor: '#e7dfcc',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene,
  });

  const arenaButtons = el<HTMLDivElement>('arenas');
  ARENAS.forEach((arena, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${i + 1} · ${arena.name}`;
    button.addEventListener('click', () => selectArena(i));
    arenaButtons.append(button);
  });

  function selectArena(i: number): void {
    arenaIndex = i;
    try {
      localStorage.setItem(ARENA_KEY, String(i));
    } catch {
      // Conveniência apenas.
    }
    [...arenaButtons.children].forEach((b, j) => b.classList.toggle('active', j === i));
    game.scale.setGameSize(arenaWidth(currentArena()), arenaHeight(currentArena()));
    scene.scene.restart();
  }
  [...arenaButtons.children].forEach((b, j) => b.classList.toggle('active', j === arenaIndex));

  const resetParams = mountTuning(el('sliders'), params);
  el('reset-params').addEventListener('click', () => resetParams());
  el('respawn').addEventListener('click', () => scene.respawn());
  el('copy').addEventListener('click', () => {
    const report = {
      arena: currentArena().id,
      params,
      travessia: metrics.crossings,
      topoAteTubo: metrics.tubeRuns,
    };
    void navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
  });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= ARENAS.length) selectArena(n - 1);
    if (e.code === 'KeyR') scene.respawn();
  });

  const crossingOut = el('m-crossing');
  const tubeOut = el('m-tube');
  const speedOut = el('m-speed');
  setInterval(() => {
    crossingOut.textContent = summary(metrics.crossings);
    tubeOut.textContent = summary(metrics.tubeRuns);
    const s = scene.state;
    if (s) speedOut.textContent = `${(Math.abs(s.vx) / 20).toFixed(1)} células/s · ${s.onGround ? 'no chão' : 'no ar'}`;
  }, 100);

  // Acesso para inspeção e testes automatizados no navegador, só em desenvolvimento.
  if (import.meta.env.DEV) Object.assign(window, { riscote: { game, scene, params, metrics } });
}
