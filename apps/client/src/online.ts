import * as Phaser from 'phaser';
import { CloseCode, ColyseusSDK, type Room } from '@colyseus/sdk';
import {
  ARENAS,
  MAX_PLAYERS,
  PHASE_LOBBY,
  ROOM_NAME,
  RULES,
  TICK_DT,
  arenaHeight,
  arenaWidth,
  describeJoinError,
  normalizeRoomCode,
  type Arena,
  type ArenaReport,
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

/** Vaga na sala guardada por aba: recarregar a página volta ao mesmo boneco enquanto a vaga estiver reservada. */
const SEAT_KEY = 'riscote.vaga.v1';

function saveSeat(room: Room): void {
  try {
    sessionStorage.setItem(SEAT_KEY, JSON.stringify({ code: room.roomId, token: room.reconnectionToken }));
  } catch {
    // Sem armazenamento: só não haverá retomada após recarregar.
  }
}

function loadSeat(): { code: string; token: string } | null {
  try {
    const seat = JSON.parse(sessionStorage.getItem(SEAT_KEY) ?? 'null') as { code?: unknown; token?: unknown } | null;
    return typeof seat?.code === 'string' && typeof seat.token === 'string' ? { code: seat.code, token: seat.token } : null;
  } catch {
    return null;
  }
}

function clearSeat(): void {
  try {
    sessionStorage.removeItem(SEAT_KEY);
  } catch {
    // Nada a limpar.
  }
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
  // Recarregar ou fechar a aba derruba a conexão: a vaga guardada precisa sobreviver a isso.
  let unloading = false;
  window.addEventListener('pagehide', () => {
    unloading = true;
  });

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

  async function enter(joining: Promise<Room>, failure?: string): Promise<void> {
    setBusy(true);
    statusOut.textContent = 'Conectando…';
    try {
      const room = await joining;
      await firstState(room);
      const current = new OnlineSession(room);
      current.onArenaChange = (arena) => startGame(arena);
      session = current;
      saveSeat(room);
      // Queda de rede: o SDK tenta reconectar sozinho; a vaga fica reservada no servidor.
      room.onDrop(() => {
        if (session === current) current.reconnecting = true;
      });
      room.onReconnect(() => {
        if (session !== current) return;
        current.reconnecting = false;
        saveSeat(room);
      });
      room.onLeave((code: number) => {
        if (session !== current) return;
        session = null;
        if (unloading) return;
        clearSeat();
        showLobby(code === CloseCode.CONSENTED ? '' : 'A conexão com a sala caiu.');
      });
      startGame(current.arena);
      lobby.hidden = true;
      inRoom.hidden = false;
      el('room-code').textContent = current.code;
      statusOut.textContent = '';
    } catch (error) {
      if (failure) clearSeat();
      statusOut.textContent = failure ?? describeJoinError(error);
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

  el('start').addEventListener('click', () => session?.start());
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Enter' || e.target instanceof HTMLInputElement) return;
    if (session?.isHost && session.state.phase === PHASE_LOBBY) session.start();
  });

  el('copy-reports').addEventListener('click', () => {
    if (session) void navigator.clipboard?.writeText(JSON.stringify(session.reports, null, 2));
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
  const saved = loadSeat();
  if (invited && invited !== saved?.code) {
    codeInput.value = invited;
    void enter(sdk.joinById(invited));
  } else if (saved) {
    // Página recarregada: volta ao mesmo boneco se a vaga ainda estiver reservada.
    codeInput.value = saved.code;
    void enter(sdk.reconnect(saved.token), 'A vaga na sala anterior expirou. Entre de novo pelo código.');
  }

  const hud = {
    arena: el('g-arena'),
    time: el('g-time'),
    last: el('g-last'),
    enemies: el('g-enemies'),
    lives: el('g-lives'),
    score: el('g-score'),
    ink: el('g-ink'),
    kills: el('g-kills'),
  };
  const lobbyStart = el('lobby-start');
  const startButton = el<HTMLButtonElement>('start');
  const startHint = el('start-hint');
  const playersOut = el('r-players');
  const correctionsOut = el('r-corrections');
  const pendingOut = el('r-pending');
  setInterval(() => {
    if (!session) return;
    const state = session.state;
    const me = session.me;
    lobbyStart.hidden = state.phase !== PHASE_LOBBY;
    startButton.disabled = !session.isHost;
    startHint.textContent = session.isHost
      ? 'Você é o anfitrião. Comece (ou aperte Enter) quando todos tiverem entrado: a primeira arena é dimensionada para quem estiver na sala.'
      : 'Aquecimento: aguardando o anfitrião começar a partida.';
    hud.arena.textContent = `${session.arena.name} (${state.arenaIndex + 1}/${state.arenaCount})`;
    const secs = Math.floor(state.waveTime);
    hud.time.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}${state.hurry ? ' · borrão!' : ''}`;
    const last = session.reports[session.reports.length - 1];
    if (last) hud.last.textContent = describeReport(last, session.reports.length);
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

function describeReport(r: ArenaReport, count: number): string {
  const kills = r.perPlayer.map((p) => p.kills).join('/');
  const idle = r.perPlayer.length ? Math.max(...r.perPlayer.map((p) => (p.idleSeconds + p.downSeconds) / Math.max(1, r.seconds))) : 0;
  return (
    `${count} arena(s) encerrada(s). Última: ${r.arena}, ${r.outcome}, ${Math.round(r.seconds)} s, ` +
    `abates por jogador ${kills}, quedas ${r.downs}, resgates ${r.rescues}, combos ${r.combos}, ` +
    `distância média ${r.spreadCells} células, maior tempo sem agir ${Math.round(idle * 100)}%.`
  );
}