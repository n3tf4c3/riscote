import {
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  RECORD_NAME_MAX,
  parseRecordName,
  parseRecordsBoard,
  type Difficulty,
  type RecordEntry,
  type RecordsBoard,
  type RecordsMessage,
  type RunEndReason,
} from '@riscote/shared';
import { el } from './dom';
import type { OnlineSession } from './net';

const REASON_TEXT: Record<RunEndReason, string> = {
  capitulo: 'Capítulo concluído!',
  'sem-vidas': 'A equipe ficou sem vidas.',
  desistencia: 'A equipe desistiu.',
};

/** Uma linha por recorde, com a desta partida grifada. Os nomes vêm de outros jogadores: só como texto. */
function recordRows(entries: RecordEntry[], mineId: string | null): HTMLLIElement[] {
  const rows = entries.map((entry, i) => {
    const li = document.createElement('li');
    li.classList.toggle('mine', entry.id === mineId);
    const pos = document.createElement('span');
    pos.className = 'pos';
    pos.textContent = `${i + 1}º`;
    const pts = document.createElement('span');
    pts.className = 'pts';
    pts.textContent = String(entry.score);
    const names = document.createElement('span');
    names.className = 'names';
    names.textContent = entry.names.join(' · ');
    li.append(pos, pts, names);
    return li;
  });
  if (rows.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Ainda não há recordes nesta dificuldade.';
    rows.push(li);
  }
  return rows;
}

/**
 * Botão "Ver recordes" da capa: busca o placar de todas as dificuldades a cada abertura e mostra
 * uma por vez, começando pela escolhida no menu.
 */
export function bindRecordsBoard(url: string, chosen: () => Difficulty): void {
  const dialog = el<HTMLDialogElement>('placar');
  const tabs = el('placar-modos');
  const list = el<HTMLOListElement>('placar-lista');
  const status = el('placar-status');
  let board: RecordsBoard | null = null;
  let mode: Difficulty = 'medio';
  let request = 0;

  const buttons = DIFFICULTIES.map((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = DIFFICULTY_NAMES[d];
    b.addEventListener('click', () => show(d));
    return b;
  });
  tabs.replaceChildren(...buttons);

  function show(d: Difficulty): void {
    mode = d;
    buttons.forEach((b, i) => {
      const on = DIFFICULTIES[i] === d;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (board) list.replaceChildren(...recordRows(board[d], null));
  }

  el('ver-recordes').addEventListener('click', async () => {
    const mine = ++request;
    board = null;
    list.replaceChildren();
    status.textContent = 'Buscando os recordes…';
    show(chosen());
    dialog.showModal();
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = parseRecordsBoard(await res.json());
      // Fechou e abriu de novo enquanto esperava: vale a resposta mais nova.
      if (mine !== request) return;
      board = data;
      status.textContent = '';
      show(mode);
    } catch {
      if (mine === request) status.textContent = 'Não deu para buscar os recordes agora. Tente de novo daqui a pouco.';
    }
  });
}

/**
 * Placar do fim de jogo: campo do nome (só para quem jogou a partida) e os recordes da dificuldade.
 * Tudo entra como texto (textContent): os nomes vêm de outros jogadores.
 */
export function bindRecords(session: () => OnlineSession | null): () => void {
  const box = el('records');
  const form = el<HTMLFormElement>('records-form');
  const input = el<HTMLInputElement>('records-name');
  const status = el('records-status');
  const list = el<HTMLOListElement>('records-list');
  const timer = el('records-timer');
  let shown: RecordsMessage | null = null;
  let sent = false;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const current = session();
    if (!current?.mayName || sent) return;
    const name = parseRecordName(input.value);
    if (!name) {
      status.textContent = `Até ${RECORD_NAME_MAX} letras ou números; vale espaço, ponto, hífen e sublinhado.`;
      return;
    }
    current.sendName(name);
    sent = true;
    status.textContent = 'Gravando…';
    // Devolve o teclado ao jogo.
    input.blur();
  });

  function render(r: RecordsMessage): void {
    el('records-why').textContent = REASON_TEXT[r.reason] ?? 'Fim de jogo.';
    el('records-score').textContent = String(r.score);
    el('records-mode').textContent = DIFFICULTY_NAMES[r.difficulty] ?? r.difficulty;
    list.replaceChildren(...recordRows(r.entries, r.entryId));
  }

  return () => {
    const current = session();
    const r = current?.records ?? null;
    if (!current || !r) {
      box.hidden = true;
      shown = null;
      return;
    }
    if (r !== shown) {
      const fresh = shown === null;
      shown = r;
      render(r);
      if (fresh) {
        sent = false;
        input.value = '';
        status.textContent = '';
      }
    }
    const mayName = current.mayName && !sent;
    const opening = box.hidden;
    box.hidden = false;
    form.hidden = !mayName;
    if (mayName && opening) input.focus();
    if (!r.entryId) status.textContent = 'Desta vez a equipe não entrou entre os 15 melhores.';
    // A linha está no placar, mas o servidor não conseguiu gravar: não confirmar como gravada.
    else if (r.saved === false) status.textContent = 'O servidor não conseguiu gravar o placar agora: esta linha pode se perder se ele reiniciar.';
    else if (sent && !current.mayName) status.textContent = 'Nome gravado no placar.';
    else if (!mayName && !sent) status.textContent = '';

    const others = r.waiting.filter((id) => id !== current.room.sessionId).length;
    const secs = Math.ceil(current.state.phaseTime);
    timer.textContent =
      (others > 0 ? `Esperando ${others} ${others === 1 ? 'jogador escrever' : 'jogadores escreverem'} o nome · ` : '') +
      `a partida recomeça em ${secs} s`;
  };
}
