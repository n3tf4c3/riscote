import { el } from '../dom';
import { som } from './som';

/**
 * Controles do painel: volume da música e dos efeitos, um botão para ligar e desligar cada um
 * (separados) e o botão de silenciar tudo.
 */
export function bindSoundControls(): void {
  const groups = [
    { slider: 'som-musica', toggle: 'som-musica-liga', volume: 'music', on: 'musicOn', labels: ['Música ligada', 'Música desligada'] },
    { slider: 'som-efeitos', toggle: 'som-efeitos-liga', volume: 'sfx', on: 'sfxOn', labels: ['Efeitos ligados', 'Efeitos desligados'] },
  ] as const;
  for (const g of groups) {
    const input = el<HTMLInputElement>(g.slider);
    const out = el(`${g.slider}-valor`);
    const toggle = el<HTMLButtonElement>(g.toggle);
    const show = () => {
      const on = som.settings[g.on];
      out.textContent = on ? `${input.value}%` : 'desligado';
      input.disabled = !on;
      toggle.textContent = g.labels[on ? 0 : 1];
      toggle.setAttribute('aria-pressed', String(on));
      toggle.classList.toggle('active', !on);
    };
    input.value = String(Math.round(som.settings[g.volume] * 100));
    show();
    input.addEventListener('input', () => {
      som.setVolumes({ [g.volume]: Number(input.value) / 100 });
      show();
    });
    toggle.addEventListener('click', () => {
      som.setVolumes({ [g.on]: !som.settings[g.on] });
      show();
      // Devolve o teclado ao jogo.
      toggle.blur();
    });
  }
  const mute = el<HTMLButtonElement>('som-mudo');
  const showMute = () => {
    mute.classList.toggle('active', som.settings.muted);
    mute.setAttribute('aria-pressed', String(som.settings.muted));
  };
  showMute();
  mute.addEventListener('click', () => {
    som.setVolumes({ muted: !som.settings.muted });
    showMute();
    mute.blur();
  });
}
