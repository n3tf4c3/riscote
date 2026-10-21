// Gerado por audio/gerar.ts a partir de audio/sfx.ts e audio/musica.ts; não edite à mão.

export const SONS = {
  'tiro': { variations: 4, volume: 0.55, gapMs: 40, loop: false },
  'encharcar': { variations: 3, volume: 0.5, gapMs: 45, loop: false },
  'bola': { variations: 2, volume: 0.6, gapMs: 60, loop: false },
  'chute': { variations: 2, volume: 0.7, gapMs: 50, loop: false },
  'estouro': { variations: 3, volume: 0.65, gapMs: 0, loop: false },
  'pulo': { variations: 3, volume: 0.32, gapMs: 60, loop: false },
  'pouso': { variations: 3, volume: 0.38, gapMs: 60, loop: false },
  'item': { variations: 1, volume: 0.55, gapMs: 80, loop: false },
  'derrubado': { variations: 1, volume: 0.65, gapMs: 100, loop: false },
  'resgate': { variations: 1, volume: 0.6, gapMs: 100, loop: false },
  'pagina': { variations: 1, volume: 0.6, gapMs: 200, loop: false },
  'arena-limpa': { variations: 1, volume: 0.7, gapMs: 1000, loop: false },
  'tinta-vazia': { variations: 2, volume: 0.45, gapMs: 90, loop: false },
  'recarga': { variations: 1, volume: 0.4, gapMs: 0, loop: true },
  'protecao': { variations: 1, volume: 0.55, gapMs: 150, loop: false },
  'escapou': { variations: 2, volume: 0.5, gapMs: 80, loop: false },
  'chegada': { variations: 2, volume: 0.45, gapMs: 120, loop: false },
  'aviso': { variations: 1, volume: 0.5, gapMs: 150, loop: false },
  'pancada': { variations: 1, volume: 0.7, gapMs: 200, loop: false },
  'cuspe': { variations: 2, volume: 0.55, gapMs: 120, loop: false },
  'apagar': { variations: 2, volume: 0.55, gapMs: 80, loop: false },
  'borrao': { variations: 1, volume: 0.7, gapMs: 1000, loop: false },
  'mancha': { variations: 2, volume: 0.5, gapMs: 70, loop: false },
  'chefe-entrada': { variations: 1, volume: 0.85, gapMs: 1000, loop: false },
  'chefe-carimbo': { variations: 2, volume: 0.75, gapMs: 200, loop: false },
  'chefe-aviso': { variations: 1, volume: 0.6, gapMs: 300, loop: false },
  'chefe-golpe': { variations: 2, volume: 0.75, gapMs: 100, loop: false },
  'chefe-pesado': { variations: 1, volume: 0.6, gapMs: 500, loop: false },
  'chefe-derrota': { variations: 1, volume: 0.8, gapMs: 2000, loop: false },
  'capitulo': { variations: 1, volume: 0.75, gapMs: 2000, loop: false },
  'fim-de-jogo': { variations: 1, volume: 0.55, gapMs: 2000, loop: false },
  'comecar': { variations: 1, volume: 0.8, gapMs: 1000, loop: false },
} as const;

export const MUSICAS = {
  'caderno': { loopSeconds: 28.235292, layers: true },
  'partituras': { loopSeconds: 27.428563, layers: true },
  'chefe': { loopSeconds: 25.600000, layers: true },
  'capa': { loopSeconds: 40.000000, layers: false },
} as const;

export type SomNome = keyof typeof SONS;
export type MusicaNome = keyof typeof MUSICAS;
