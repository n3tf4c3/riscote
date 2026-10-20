import * as Phaser from 'phaser';
import { CloseCode, ColyseusSDK, type Room } from '@colyseus/sdk';
import {
  ARENAS,
  MAX_PLAYERS,
  ROOM_NAME,
  RULES,
  TICK_DT,
  arenaHeight,
  arenaWidth,
  describeJoinError,
  normalizeRoomCode,
  type Arena,
  type CreateRoomOptions,
} from '@riscote/shared';
import { el } from './dom';
import type { InputSource } from './input';
import { OnlineSession, type NetState } from './net';
import { OnlineScene } from './OnlineScene';

const INITIAL_STATE_TIMEOUT_MS = 5000;

/** Espera o primeiro estado em que o próprio jogador já aparece. */
function firstState(room: Room): Promise<void> {
  return new Promise((resolve, reject) => {
    const ready = () => (room.state as NetState | undefined)?.players?.get(room.sessionId) !== undefined;
    const check = () => {
      if (!ready()) return;
      room.onStateChange.remove(check);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      room.onStateChange.remove(check);
      reject(new Error('estado inicial não chegou'));
    }, INITIAL_STATE_TIMEOUT_MS);
    room.onStateChange(check);
    check();
  });
}

/** Modo online (etapa 2): criar sala, entrar por código e jogar com até 5. */
export function bootOnline(input: InputSource): void {
  el('panel-online').hidden = false;
  const query = new URLSearchParams(location.search);
  const sdk = new ColyseusSDK(query.get('servidor') ?? `ws://${location.hostname}:2567`);

  let session: OnlineSession | null = null;
  let game: Phaser.Game | null = null;
  const scene = new OnlineScene({ session: () => session, input });
  let arenaId = 'padrao';

  const lobby = el('lobby');
  const inRoom = el('in-room');
  const statusOut = el('lobby-status');
  const codeInput = el<HTMLInputElement>('join-code');
  const createButton = el<HTMLButtonElement>('create');
  const joinButton = el<HTMLButtonElement>('join');

  const arenaButtons = el('online-arenas');
  for (const arena of ARENAS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = arena.name;
    button.classList.toggle('active', arena.id === arenaId);
    button.addEventListener('click', () => {
      arenaId = arena.id;
      [...arenaButtons.children].forEach((b) => b.classList.toggle('active', b === button));
    });
    arenaButtons.append(button);
  }

  function setBusy(busy: boolean): void {
    createButton.disabled = busy;
    joinButton.disabled = busy;
  }

  function showLobby(message: string): void {
    lobby.hidden = false;
    inRoom.hidden = true;
    statusOut.textContent = message;
  }

  function startGame(arena: Arena): void {
    if (!game) {
      el('game-placeholder').remove();
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game',
        width: arenaWidth(arena),
        height: arenaHeight(arena),
        backgroundColor: '#e7dfcc',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene,
      });
      if (import.meta.env.DEV) Object.assign(window, { riscote: { game, scene, session: () => session } });
    } else {
      game.scale.setGameSize(arenaWidth(arena), arenaHeight(arena));
      scene.scene.restart();
    }
  }

  async function enter(joining: Promise<Room>): Promise<void> {
    setBusy(true);
    statusOut.textContent = 'Conectando…';
    try {
      const room = await joining;
      await firstState(room);
      const current = new OnlineSession(room);
      session = current;
      room.onLeave((code: number) => {
        if (session !== current) return;
        session = null;
        showLobby(code === CloseCode.CONSENTED ? '' : 'A conexão com a sala caiu.');
      });
      startGame(current.arena);
      lobby.hidden = true;
      inRoom.hidden = false;
      el('room-code').textContent = current.code;
      statusOut.textContent = '';
    } catch (error) {
      statusOut.textContent = describeJoinError(error);
    } finally {
      setBusy(false);
    }
  }

  createButton.addEventListener('click', () => {
    const options: CreateRoomOptions = { arenaId };
    void enter(sdk.create(ROOM_NAME, options));
  });

  el('join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = normalizeRoomCode(codeInput.value);
    if (!code) {
      statusOut.textContent = 'O código tem 6 letras ou números.';
      return;
    }
    void enter(sdk.joinById(code));
  });

  el('leave').addEventListener('click', () => {
    void session?.room.leave();
  });

  el('copy-invite').addEventListener('click', () => {
    if (!session) return;
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('sala', session.code);
    void navigator.clipboard?.writeText(url.toString());
  });

  // Convite por link: ?sala=CODIGO já entra direto.
  const invited = normalizeRoomCode(query.get('sala') ?? '');
  if (invited) {
    codeInput.value = invited;
    void enter(sdk.joinById(invited));
  }

  const hud = {
    wave: el('g-wave'),
    enemies: el('g-enemies'),
    lives: el('g-lives'),
    score: el('g-score'),
    ink: el('g-ink'),
    kills: el('g-kills'),
  };
  const playersOut = el('r-players');
  const correctionsOut = el('r-corrections');
  const pendingOut = el('r-pending');
  setInterval(() => {
    if (!session) return;
    const state = session.state;
    const me = session.me;
    hud.wave.textContent = String(state.wave);
    hud.enemies.textContent = String(state.enemiesLeft);
    hud.lives.textContent = String(state.lives);
    hud.score.textContent = String(state.score);
    hud.ink.textContent = me ? `${Math.floor(me.ink)}/${RULES.tankSize}` : '—';
    hud.kills.textContent = me ? String(me.kills) : '—';
    playersOut.textContent = `${state.players.size}/${MAX_PLAYERS}`;
    correctionsOut.textContent = String(session.corrections);
    pendingOut.textContent = `${session.pendingCount} (~${Math.round(session.pendingCount * TICK_DT * 1000)} ms)`;
  }, 200);
}
