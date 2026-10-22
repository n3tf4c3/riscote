/** Rodando dentro do app de Android ou iOS: build com `--mode app`, embutido na WebView (apps/mobile). */
export const IN_APP = import.meta.env.MODE === 'app';
