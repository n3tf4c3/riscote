import { bindSoundControls } from './audio/controles';
import { InputSource } from './input';
import { bootLocal } from './local';
import { bootOnline } from './online';

// ?local abre o modo de ajuste de movimento (etapa 1); o padrão é jogar online.
const input = new InputSource();
bindSoundControls();
if (new URLSearchParams(location.search).has('local')) bootLocal(input);
else bootOnline(input);
