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
  RECORD_NAME_MAX,
  ROOM_LIST_PATH,
  ROOM_NAME,
  RULES,
  TICK_DT,
  arenaHeight,
  arenaWidth,
  describeJoinError,
  normalizeRoomCode,
  parseDifficulty,
  parseRecordName,
  normalizeServerUrl,
  parseRoomList,
  seatForServer,
  type Arena,
  type ArenaReport,
  type CreateRoomOptions,
  type Difficulty,
  type JoinOptions,
  type RoomSummary,
  type SavedSeat,
} from '@riscote/shared';
import { el } from './dom';
import type { InputSource } from './input';
import { OnlineSession, type NetState, type Presence } from './net';
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

const VISIBILITY_HINTS = {
  aberta: 'Aparece em “Salas agora”, com o código e os nomes: qualquer um pode entrar.',
  privada: 'Só entra quem tiver o código; na lista aparece só quantos estão jogando.',
};
const NAME_HINT = `Nome: até ${RECORD_NAME_MAX} letras ou números; vale espaço, ponto, hífen e sublinhado.`;
const PRESENCE_TEXT: Record<Presence['event'], string> = {
  entrou: 'entrou na sala',
  saiu: 'saiu da sala',
  caiu: 'perdeu a conexão',
  voltou: 'voltou para a sala',
};
/** Intervalo entre as consultas da lista de salas, com a capa na tela. */
const ROOM_LIST_MS = 5000;
const NOTICE_MS = 4600;
const MAX_NOTICES = 4;

/** Nome escolhido na capa, lembrado por navegador. */
const NAME_KEY = 'riscote.nome.v1';

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Sem armazenamento: o nome só não fica lembrado.
  }
}

/** Bolinha com a cor do jogador, para reconhecer o boneco na arena. */
function colorDot(slot: number): HTMLSpanElement {
  const dot = document.createElement('span');
  dot.className = 'cor';
  dot.style.background = `#${(PLAYER_COLORS[slot] ?? 0x888888).toString(16).padStart(6, '0')}`;
  return dot;
}

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

function saveSeat(room: Room, server: string): void {
  try {
    const seat: SavedSeat = { server: normalizeServerUrl(server), code: room.roomId, token: room.reconnectionToken };
    sessionStorage.setItem(SEAT_KEY, JSON.stringify(seat));
  } catch {
    // Sem armazenamento: só não haverá retomada após recarregar.
  }
}

/** A vaga guardada, só se for deste servidor; a de outro servidor (ou de versão antiga) é apagada. */
function loadSeat(server: string): SavedSeat | null {
  let raw: unknown = null;
  try {
    raw = JSON.parse(sessionStorage.getItem(SEAT_KEY) ?? 'null');
  } catch {
    // Vaga ilegível: tratada como de outro servidor.
  }
  const seat = seatForServer(raw, server);
  if (!seat && raw !== null) clearSeat();
  return seat;
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
  const serverUrl = query.get('servidor') ?? defaultServer;
  const sdk = new ColyseusSDK(serverUrl);
  const roomListUrl = serverUrl.replace(/^ws/, 'http').replace(/\/+$/, '') + ROOM_LIST_PATH;

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

  let open = true;
  const visibilityButtons = el('online-visibility');
  visibilityButtons.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    const pick = () => {
      open = button.dataset.aberta === '1';
      choose(visibilityButtons, button);
      el('visibility-hint').textContent = open ? VISIBILITY_HINTS.aberta : VISIBILITY_HINTS.privada;
    };
    button.addEventListener('click', pick);
    if (button.dataset.aberta === '1') pick();
  });

  const nameInput = el<HTMLInputElement>('player-name');
  nameInput.value = loadName();
  /** Opções de entrada com o nome do campo; null se o nome não vale (a mensagem já foi para a tela). */
  function joinOptions(): JoinOptions | null {
    const raw = nameInput.value.trim();
    if (!raw) {
      saveName('');
      return {};
    }
    const name = parseRecordName(raw);
    if (!name) {
      statusOut.textContent = NAME_HINT;
      nameInput.focus();
      return null;
    }
    saveName(name);
    return { name };
  }

  function joinRoom(code: string): void {
    const options = joinOptions();
    if (options) void enter(sdk.joinById(code, options));
  }

  function setBusy(busy: boolean): void {
    createButton.disabled = busy;
    joinButton.disabled = busy;
    roomList.querySelectorAll('button').forEach((b) => (b.disabled = busy || b.dataset.cheia === '1'));
  }

  // Salas no servidor: consultadas enquanto a capa está na tela e a aba, visível.
  const roomList = el<HTMLUListElement>('room-list');
  const roomListStatus = el('room-list-status');
  let shownRooms = '';
  function renderRooms(rooms: RoomSummary[]): void {
    const key = JSON.stringify(rooms);
    if (key === shownRooms) return;
    // Só redesenha quando muda: o foco do teclado num botão Entrar não se perde.
    shownRooms = key;
    const items = rooms.map((r) => {
      const li = document.createElement('li');
      li.classList.toggle('privada', !r.code);
      const title = document.createElement('span');
      title.className = 'sala-titulo';
      if (r.code) title.append(Object.assign(document.createElement('code'), { textContent: r.code }));
      title.append(r.code ? `${r.players}/${MAX_PLAYERS}` : `Sala privada · ${r.players}/${MAX_PLAYERS}`);
      const info = document.createElement('span');
      info.className = 'sala-info';
      const where = r.playing ? `jogando, página ${r.page + 1} de ${r.pages}` : 'no aquecimento';
      info.textContent = `Capítulo ${r.chapter + 1} · ${CHAPTER_NAMES[r.chapter] ?? ''} · ${DIFFICULTY_NAMES[r.difficulty]} · ${where}`;
      li.append(title, info);
      if (r.names.length) {
        // Nomes de outros jogadores: só como texto.
        li.append(Object.assign(document.createElement('span'), { className: 'sala-nomes', textContent: r.names.join(', ') }));
      }
      const code = r.code;
      if (code) {
        const full = r.players >= MAX_PLAYERS;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = full ? 'Cheia' : 'Entrar';
        button.dataset.cheia = full ? '1' : '0';
        button.disabled = full || createButton.disabled;
        button.setAttribute('aria-label', full ? `Sala ${code} cheia` : `Entrar na sala ${code}`);
        button.addEventListener('click', () => {
          codeInput.value = code;
          joinRoom(code);
        });
        li.append(button);
      }
      return li;
    });
    if (items.length === 0) {
      items.push(Object.assign(document.createElement('li'), { className: 'vazia', textContent: 'Nenhuma sala agora. Crie a sua e chame alguém!' }));
    }
    roomList.replaceChildren(...items);
    const people = rooms.reduce((n, r) => n + r.players, 0);
    roomListStatus.textContent = rooms.length
      ? `${rooms.length} ${rooms.length === 1 ? 'sala' : 'salas'}, ${people} ${people === 1 ? 'pessoa' : 'pessoas'} jogando.`
      : '';
  }
  let fetchingRooms = false;
  async function refreshRooms(): Promise<void> {
    if (session || lobby.hidden || document.visibilityState !== 'visible' || fetchingRooms) return;
    fetchingRooms = true;
    try {
      const res = await fetch(roomListUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      renderRooms(parseRoomList(await res.json()));
    } catch {
      shownRooms = '';
      roomList.replaceChildren();
      roomListStatus.textContent = 'Não deu para ver as salas agora; o código continua valendo.';
    } finally {
      fetchingRooms = false;
    }
  }
  setInterval(() => void refreshRooms(), ROOM_LIST_MS);
  document.addEventListener('visibilitychange', () => void refreshRooms());
  void refreshRooms();

  // Quem entra, sai, cai ou volta: bilhete no canto da arena.
  const notices = el('avisos');
  function notify(p: Presence): void {
    const note = document.createElement('p');
    note.append(colorDot(p.slot), `${p.name} ${PRESENCE_TEXT[p.event]}`);
    notices.append(note);
    while (notices.childElementCount > MAX_NOTICES) notices.firstElementChild!.remove();
    setTimeout(() => note.remove(), NOTICE_MS);
  }

  function showLobby(message: string): void {
    lobby.hidden = false;
    inRoom.hidden = true;
    statusOut.textContent = message;
    showLoading(1, 1);
    setCover(true);
    som.music('capa');
    som.localSlot = -1;
    notices.replaceChildren();
    void refreshRooms();
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
      current.onPresence = notify;
      session = current;
      saveSeat(room, serverUrl);
      // Queda de rede: o SDK tenta reconectar sozinho; a vaga fica reservada no servidor.
      room.onDrop(() => {
        if (session === current) current.reconnecting = true;
      });
      room.onReconnect(() => {
        if (session !== current) return;
        current.reconnecting = false;
        saveSeat(room, serverUrl);
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
    const join = joinOptions();
    if (!join) return;
    const options: CreateRoomOptions = { ...join, arenaId, difficulty, open };
    void enter(sdk.create(ROOM_NAME, options));
  });

  el('join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = normalizeRoomCode(codeInput.value);
    if (!code) {
      statusOut.textContent = 'O código tem 6 letras ou números.';
      return;
    }
    joinRoom(code);
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
  const saved = loadSeat(serverUrl);
  if (invited && invited !== saved?.code) {
    codeInput.value = invited;
    // Pelo convite entra direto; um nome guardado que não valha mais fica de fora.
    const name = parseRecordName(nameInput.value);
    void enter(sdk.joinById(invited, name ? { name } : {}));
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
  const roomPlayers = el<HTMLUListElement>('room-players');
  let shownPlayers = '';
  /** Quem está na sala, na cor do boneco; só redesenha quando muda. */
  function renderPlayers(current: OnlineSession): void {
    const state = current.state;
    const rows: { slot: number; text: string; away: boolean }[] = [];
    state.players.forEach((p, id) => {
      const tags = [id === current.room.sessionId && 'você', id === state.hostId && 'anfitrião', p.away && 'sem conexão'].filter(Boolean);
      rows.push({ slot: p.slot, text: tags.length ? `${p.name} (${tags.join(', ')})` : p.name, away: p.away });
    });
    rows.sort((a, b) => a.slot - b.slot);
    const key = JSON.stringify(rows);
    if (key === shownPlayers) return;
    shownPlayers = key;
    roomPlayers.replaceChildren(
      ...rows.map((r) => {
        const li = document.createElement('li');
        li.classList.toggle('dim', r.away);
        li.append(colorDot(r.slot), r.text);
        return li;
      }),
    );
  }
  setInterval(() => {
    updateRecords();
    if (!session) return;
    renderPlayers(session);
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
