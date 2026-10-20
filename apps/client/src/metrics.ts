import { TILE, touchesTube, type Arena, type MovementParams, type PlayerState } from '@riscote/shared';

const KEEP = 5;

/**
 * Medições da etapa 1: tempo de travessia de parede a parede e tempo do andar mais alto
 * até um tubo de tinta (meta do plano: 3–4 s e ≤ 3 s).
 */
export class Metrics {
  crossings: number[] = [];
  tubeRuns: number[] = [];
  private zone: 'L' | 'R' | null = null;
  private zoneTime = 0;
  private topTime: number | null = null;

  reset(): void {
    this.crossings = [];
    this.tubeRuns = [];
    this.zone = null;
    this.topTime = null;
  }

  update(t: number, s: PlayerState, arena: Arena, p: MovementParams): void {
    const cx = s.x + (p.playerWidth * TILE) / 2;
    // Zonas de 2 células junto às paredes; o tempo conta da saída de uma até a chegada na outra.
    if (cx <= 2 * TILE) {
      if (this.zone === 'R') push(this.crossings, t - this.zoneTime);
      this.zone = 'L';
      this.zoneTime = t;
    } else if (cx >= (arena.cols - 2) * TILE) {
      if (this.zone === 'L') push(this.crossings, t - this.zoneTime);
      this.zone = 'R';
      this.zoneTime = t;
    }

    const feetRow = Math.round((s.y + p.playerHeight * TILE) / TILE);
    if (s.onGround && feetRow <= arena.topFloorRow) this.topTime = t;
    if (this.topTime !== null && touchesTube(s, arena, p)) {
      push(this.tubeRuns, t - this.topTime);
      this.topTime = null;
    }
  }
}

function push(list: number[], value: number): void {
  list.push(value);
  if (list.length > KEEP) list.shift();
}

export function summary(list: number[]): string {
  if (list.length === 0) return '—';
  const last = list[list.length - 1]!;
  const mean = list.reduce((a, b) => a + b, 0) / list.length;
  return `${last.toFixed(2)} s (média ${mean.toFixed(2)} s, n=${list.length})`;
}
