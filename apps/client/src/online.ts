import * as Phaser from 'phaser';
import { CloseCode, ColyseusSDK, type Room } from '@colyseus/sdk';
import {
  CHAPTERS,
  CHAPTER_NAMES,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  MAX_PLAYERS,
  PHASE_LOBBY,
  PHASE_PLAYING,
  ROOM_NAME,
  RULES,
  TICK_DT,
  arenaHeight,
  arenaWidth,
  describeJoinError,
  normalizeRoomCode,
  parseDifficulty,
  type Arena,
  type ArenaReport,
  type CreateRoomOptions,
  type Difficulty,
} from '@riscote/shared';
import { el } from './dom';
import type { InputSource } from './input';
import { OnlineSession, type NetState } from './net';
import { OnlineScene } from './OnlineScene';
import { bindRecords } from './records';
import { RES, commonSpecs, prepareArt } from './art/textures';
import { PLAYER_COLORS } from './draw';
import { setCover } from './capa';
import { som } from './audio/som';

const INITIAL_STATE_TIMEOUT_MS = 5000;
/** Tempo para o segundo clique em Desistir confirmar. */
const GIVE_UP_CONFIRM_MS = 4000;
/** Carregamentos mais curtos que isso não mostram o pote de tinta. */
const LOADER_DELAY_MS = 150;

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  facil: 'Cada riscote aguenta 2 toques e corre um pouco mais; os inimigos avisam com mais tempo e vêm em menor número. Tinta infinita.',
  medio: 'Um toque derruba. Tinta infinita.',
  dificil: 'Um toque derruba e a tinta acaba: recarregue nos tubos dos cantos.',
};

/** Marca a escolha de um grupo de botões (visual e leitor de tela). */
function choose(group: HTMLElement, chosen: HTMLButtonElement): void {
  group.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b === chosen);
    b.setAttribute('aria-pressed', String(b === chosen));
  });
}

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
  setCover(true);
  // A trilha da capa começa no primeiro gesto (regra de autoplay dos navegadores).
  som.music('capa');
  const query = new URLSearchParams(location.search);
  // Em riscote.win o servidor de partidas fica em play.riscote.win (túnel nomeado da Cloudflare).
  const defaultServer =
    location.hostname === 'riscote.win' ? 'wss://play.riscote.win' : `ws://${location.hostname}:2567`;
  const sdk = new ColyseusSDK(query.get('servidor') ?? defaultServer);

  let session: OnlineSession | null = null;
  let game: Phaser.Game | null = null;
  // Pote de tinta enchendo enquanto a arte da arena carrega. Na virada de página, que costuma ser
  // rápida, só aparece se demorar um pouco.
  const loader = el('carregando');
  const loaderPot = loader.querySelector<HTMLElement>('.pote')!;
  const loaderPct = el('carregando-pct');
  let loaderTimer: ReturnType<typeof setTimeout> | undefined;
  function showLoading(done: number, total: number, now = false): void {
    const level = total > 0 ? Math.min(1, done / total) : 1;
    clearTimeout(loaderTimer);
    loaderTimer = undefined;
    if (level >= 1) {
      loader.hidden = true;
      return;
    }
    loaderPot.style.setProperty('--nivel', `${Math.round(level * 100)}%`);
    loaderPct.textContent = `${Math.round(level * 100)}%`;
    if (now) loader.hidden = false;
    else if (loader.hidden) loaderTimer = setTimeout(() => (loader.hidden = false), LOADER_DELAY_MS);
  }
  const scene = new OnlineScene({ session: () => session, input, loading: showLoading });
  // A sala joga o capítulo inteiro a partir da 1ª fase: o menu escolhe o capítulo pela arena de abertura.
  let arenaId = CHAPTERS[0]![0]!.id;
  let difficulty: Difficulty = 'medio';
  // Recarregar ou fechar a aba derruba a conexão: a vaga guardada precisa sobreviver a isso.
  let unloading = false;
  window.addEventListener('pagehide', () => {
    unloading = true;
  });
  // Enquanto a capa está na tela, os bonecos e inimigos já vão sendo rasterizados (variação 0 primeiro).
  const common = commonSpecs(PLAYER_COLORS);
  void prepareArt([...common.filter((s) => !s.key.includes('~')), ...common.filter((s) => s.key.includes('~'))]).catch(
    (err: unknown) => console.warn('arte não adiantou; a cena carrega na entrada', err),
  );

  const lobby = el('lobby');
  const inRoom = el('in-room');
  const statusOut = el('lobby-status');
  const codeInput = el<HTMLInputElement>('join-code');
  const createButton = el<HTMLButtonElement>('create');
  const joinButton = el<HTMLButtonElement>('join');

  const arenaButtons = el('online-arenas');
  CHAPTERS.forEach((chapter, i) => {
    const first = chapter[0]!;
    const button = document.createElement('button');
    button.type = 'button';
    // "Capítulo 1 · Caderno" em cima; as fases, pelo nome sem o tamanho, miúdas embaixo.
    button.textContent = `Capítulo ${i + 1} · ${CHAPTER_NAMES[i] ?? ''}`;
    const phases = chapter.map((a) => /^(.*?)(?:\s+\d+×\d+)?$/.exec(a.name)?.[1] ?? a.name);
    button.append(Object.assign(document.createElement('small'), { textContent: `${phases.join(', ')} e o chefe` }));
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      arenaId = first.id;
      choose(arenaButtons, button);
    });
    arenaButtons.append(button);
    if (first.id === arenaId) choose(arenaButtons, button);
  });

  const difficultyButtons = el('online-difficulty');
  for (const mode of DIFFICULTIES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = DIFFICULTY_NAMES[mode];
    button.setAttribute('aria-pressed', 'false');
    const pick = () => {
      difficulty = mode;
      choose(difficultyButtons, button);
      el('difficulty-hint').textContent = DIFFICULTY_HINTS[mode];
    };
    button.addEventListener('click', pick);
    difficultyButtons.append(button);
    if (mode === difficulty) pick();
  }

  function setBusy(busy: boolean): void {
    createButton.disabled = busy;
    joinButton.disabled = busy;
  }

  function showLobby(message: string): void {
    lobby.hidden = false;
    inRoom.hidden = true;
    statusOut.textContent = message;
    showLoading(1, 1);
    setCover(true);
    som.music('capa');
    som.localSlot = -1;
  }

  function startGame(arena: Arena): void {
    // No celular em pé, a área do canvas segue a proporção da arena e os controles de toque ficam logo abaixo.
    el('tela').style.setProperty('--tela-aspecto', `${arenaWidth(arena)} / ${arenaHeight(arena)}`);
    if (!game) {
      // O Phaser leva um instante para subir: o pote já aparece vazio.
      showLoading(0, 1, true);
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'tela',
        width: arenaWidth(arena) * RES,
        height: arenaHeight(arena) * RES,
        // Transparente: até o primeiro quadro aparece o papel da página, não o preto do WebGL.
        transparent: true,
        // O som é do módulo audio/som.ts; o Phaser não precisa abrir outro contexto de áudio.
        audio: { noAudio: true },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene,
      });
      // Inspeção pelo console: em desenvolvimento ou com ?debug (só dados deste cliente).
      if (import.meta.env.DEV || query.has('debug')) Object.assign(window, { riscote: { game, scene, session: () => session } });
    } else {
      game.scale.setGameSize(arenaWidth(arena) * RES, arenaHeight(arena) * RES);
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
      setCover(false);
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
    const options: CreateRoomOptions = { arenaId, difficulty };
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
    // Na capa, Enter cria a sala; com o foco num botão ou link, vale o clique dele.
    const focused = e.target instanceof Element && e.target.closest('button, a, input, select, textarea');
    if (!session && !lobby.hidden && !focused && !e.repeat && !createButton.disabled) createButton.click();
  });

  el('copy-reports').addEventListener('click', () => {
    if (session) void navigator.clipboard?.writeText(JSON.stringify(session.reports, null, 2));
  });

  el('leave').addEventListener('click', () => {
    void session?.room.leave();
  });

  // Desistir encerra a partida de todos: o primeiro clique só pede confirmação.
  const giveUpButton = el<HTMLButtonElement>('give-up');
  let giveUpArmed: ReturnType<typeof setTimeout> | undefined;
  function disarmGiveUp(): void {
    clearTimeout(giveUpArmed);
    giveUpArmed = undefined;
    giveUpButton.textContent = 'Desistir';
    giveUpButton.classList.remove('active');
  }
  giveUpButton.addEventListener('click', () => {
    if (!session?.isHost) return;
    if (giveUpArmed === undefined) {
      giveUpButton.textContent = 'Confirmar: desistir';
      giveUpButton.classList.add('active');
      giveUpArmed = setTimeout(disarmGiveUp, GIVE_UP_CONFIRM_MS);
      return;
    }
    disarmGiveUp();
    session.giveUp();
    // Devolve o teclado ao jogo.
    giveUpButton.blur();
  });

  el('copy-invite').addEventListener('click', () => {
    if (!session) return;
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('sala', session.code);
    // Fora do padrão (ex.: túnel de playtest), o convite leva junto o endereço do servidor.
    const server = query.get('servidor');
    if (server) url.searchParams.set('servidor', server);
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
    mode: el('g-mode'),
    arena: el('g-arena'),
    time: el('g-time'),
    last: el('g-last'),
    enemies: el('g-enemies'),
    lives: el('g-lives'),
    score: el('g-score'),
    ink: el('g-ink'),
    kills: el('g-kills'),
    powers: el('g-powers'),
  };
  const lobbyStart = el('lobby-start');
  const startButton = el<HTMLButtonElement>('start');
  const startHint = el('start-hint');
  const playersOut = el('r-players');
  const correctionsOut = el('r-corrections');
  const pendingOut = el('r-pending');
  const updateRecords = bindRecords(() => session);
  setInterval(() => {
    updateRecords();
    if (!session) return;
    const state = session.state;
    const me = session.me;
    lobbyStart.hidden = state.phase !== PHASE_LOBBY;
    startButton.disabled = !session.isHost;
    giveUpButton.hidden = state.phase !== PHASE_PLAYING;
    giveUpButton.disabled = !session.isHost;
    giveUpButton.title = session.isHost ? 'Encerra a partida para toda a equipe' : 'Só o anfitrião pode desistir';
    if (giveUpButton.hidden && giveUpArmed !== undefined) disarmGiveUp();
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
    const limitedInk = state.difficulty === 'dificil';
    hud.mode.textContent = DIFFICULTY_NAMES[parseDifficulty(state.difficulty)];
    hud.ink.textContent = !me ? '—' : limitedInk ? `${Math.floor(me.ink)}/${RULES.tankSize}` : '∞';
    hud.kills.textContent = me ? String(me.kills) : '—';
    hud.powers.textContent = me ? describePowers(me) : '—';
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
/** Poderes acumulados por itens, como aparecem no painel. */
function describePowers(me: { strength: number; speed: number; rate: number; range: number; star: number }): string {
  const parts = [
    me.strength && `força ${me.strength}`,
    me.speed && `agilidade ${me.speed}`,
    me.rate && `tiro ágil ${me.rate}`,
    me.range && `alcance ${me.range}`,
    me.star > 0 && `invencível ${Math.ceil(me.star)} s`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'nenhum';
}
