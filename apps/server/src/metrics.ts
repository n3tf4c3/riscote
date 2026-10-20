import { monitorEventLoopDelay } from 'node:perf_hooks';

/**
 * Métricas do processo para o teste de carga (plano, seção 4.5). Estado global de propósito:
 * mede o processo inteiro, não pertence a nenhuma sala e não influencia a partida.
 */
export const processMetrics = {
  rooms: 0,
  players: 0,
  ticks: 0,
  tickMs: 0,
  tickMaxMs: 0,
};

export function recordTick(ms: number): void {
  processMetrics.ticks++;
  processMetrics.tickMs += ms;
  if (ms > processMetrics.tickMaxMs) processMetrics.tickMaxMs = ms;
}

/** Uma linha JSON a cada `intervalMs` no log do servidor. */
export function startMetricsLog(intervalMs = 10_000): void {
  const loop = monitorEventLoopDelay({ resolution: 10 });
  loop.enable();
  let cpu = process.cpuUsage();
  let wall = performance.now();
  setInterval(() => {
    const cpuNow = process.cpuUsage(cpu);
    const wallNow = performance.now();
    const m = processMetrics;
    console.log(
      JSON.stringify({
        metricas: 'processo',
        salas: m.rooms,
        jogadores: m.players,
        tickMedioMs: m.ticks ? Math.round((m.tickMs / m.ticks) * 1000) / 1000 : 0,
        tickMaxMs: Math.round(m.tickMaxMs * 100) / 100,
        loopAtrasoP99Ms: Math.round(loop.percentile(99) / 1e4) / 100,
        cpuPct: Math.round(((cpuNow.user + cpuNow.system) / 1000 / (wallNow - wall)) * 1000) / 10,
        memoriaMB: Math.round(process.memoryUsage().rss / 1e6),
      }),
    );
    m.ticks = 0;
    m.tickMs = 0;
    m.tickMaxMs = 0;
    loop.reset();
    cpu = process.cpuUsage();
    wall = wallNow;
  }, intervalMs).unref();
}
