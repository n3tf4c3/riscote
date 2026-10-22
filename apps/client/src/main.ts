import { bindSoundControls } from './audio/controles';
import { el } from './dom';
import { InputSource, bindKeyControls } from './input';
import { bootLocal } from './local';
import { bootOnline } from './online';

// ?local abre o modo de ajuste de movimento (etapa 1); o padrão é jogar online.
const input = new InputSource();
bindSoundControls();
bindKeyControls(input);
// Devolve o teclado ao jogo; senão o Espaço do pulo abriria e fecharia as configurações.
el('config').querySelector('summary')?.addEventListener('click', (e) => (e.currentTarget as HTMLElement).blur());
if (new URLSearchParams(location.search).has('local')) bootLocal(input);
else bootOnline(input);
