// Unidade de mundo: pixel lógico. Uma célula da grade mede TILE pixels.
export const TILE = 20;
export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE;

/** Parâmetros de movimento, em células e segundos para facilitar o ajuste no protótipo. */
export interface MovementParams {
  runSpeed: number; // células/s
  groundAccel: number; // células/s²
  groundDecel: number; // células/s²
  airAccel: number; // células/s²
  jumpHeight: number; // células
  timeToApex: number; // s
  fallGravityMult: number; // gravidade extra na descida
  jumpCutMult: number; // fator sobre a velocidade de subida ao soltar o pulo
  maxFallSpeed: number; // células/s
  coyoteTime: number; // s após sair da borda em que ainda dá para pular
  jumpBuffer: number; // s em que um pulo apertado antes de pousar é lembrado
  playerWidth: number; // células
  playerHeight: number; // células
}

export const DEFAULT_PARAMS: Readonly<MovementParams> = {
  runSpeed: 8,
  groundAccel: 80,
  groundDecel: 100,
  airAccel: 50,
  jumpHeight: 4,
  timeToApex: 0.38,
  fallGravityMult: 1.6,
  jumpCutMult: 0.45,
  maxFallSpeed: 25,
  coyoteTime: 0.08,
  jumpBuffer: 0.1,
  playerWidth: 0.8,
  playerHeight: 1.3,
};
