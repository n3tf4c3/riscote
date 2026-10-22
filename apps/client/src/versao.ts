import { IN_APP } from './app';

/** Versão deste build, definida em vite.config.ts. */
declare const __RISCOTE_VERSAO__: string;

/** De quanto em quanto tempo a aba pergunta se saiu versão nova. */
const CHECK_MS = 2 * 60_000;
/** Versão para a qual esta aba já recarregou uma vez (sessionStorage). */
const TRIED_KEY = 'riscote.versao.tentada';

/**
 * Recarrega a aba quando sai uma versão nova do cliente, mas só quando `canReload` deixa (fora de
 * sala, sem ninguém digitando). Até lá a versão nova fica pendente; `retry` tenta de novo, por exemplo
 * ao voltar para a capa. Em desenvolvimento não faz nada: o Vite já recarrega sozinho. No app também
 * não: lá o jogo vem embutido e se atualiza com o app.
 */
export function watchNewVersion(canReload: () => boolean): { retry(): void } {
  /** A versão nova encontrada no servidor; null enquanto esta for a mais recente. */
  let pending: string | null = null;
  const retry = () => {
    if (!pending || !canReload()) return;
    // Uma tentativa por versão: se a página voltar velha (cache no caminho), não fica recarregando.
    try {
      if (sessionStorage.getItem(TRIED_KEY) === pending) return;
      sessionStorage.setItem(TRIED_KEY, pending);
    } catch {
      return;
    }
    // Sem ?sala: o convite já foi usado, e a aba nova não deve entrar de novo na sala sozinha.
    const url = new URL(location.href);
    url.searchParams.delete('sala');
    history.replaceState(history.state, '', url);
    // reload revalida o index.html com o servidor; uma navegação comum poderia usar o do cache.
    location.reload();
  };
  if (import.meta.env.DEV || IN_APP) return { retry };
  let checking = false;
  const check = async () => {
    if (checking) return;
    if (!pending) {
      checking = true;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}versao.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { versao } = (await res.json()) as { versao?: unknown };
        if (typeof versao === 'string' && versao !== __RISCOTE_VERSAO__) pending = versao;
      } catch {
        return;
      } finally {
        checking = false;
      }
    }
    retry();
  };
  setInterval(() => void check(), CHECK_MS);
  document.addEventListener('visibilitychange', () => void check());
  return { retry };
}
