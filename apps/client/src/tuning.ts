import { DEFAULT_PARAMS, type MovementParams } from '@riscote/shared';

interface Slider {
  key: keyof MovementParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: Slider[] = [
  { key: 'runSpeed', label: 'Corrida (células/s)', min: 4, max: 14, step: 0.5 },
  { key: 'groundAccel', label: 'Aceleração no chão', min: 20, max: 200, step: 5 },
  { key: 'groundDecel', label: 'Frenagem no chão', min: 20, max: 200, step: 5 },
  { key: 'airAccel', label: 'Controle no ar', min: 10, max: 150, step: 5 },
  { key: 'jumpHeight', label: 'Altura do pulo (células)', min: 2.5, max: 6, step: 0.1 },
  { key: 'timeToApex', label: 'Tempo até o ápice (s)', min: 0.2, max: 0.6, step: 0.01 },
  { key: 'fallGravityMult', label: 'Gravidade na queda (×)', min: 1, max: 3, step: 0.05 },
  { key: 'jumpCutMult', label: 'Corte do pulo curto', min: 0.2, max: 1, step: 0.05 },
  { key: 'maxFallSpeed', label: 'Queda máxima (células/s)', min: 10, max: 40, step: 1 },
  { key: 'coyoteTime', label: 'Tolerância na borda (s)', min: 0, max: 0.2, step: 0.01 },
  { key: 'jumpBuffer', label: 'Memória do pulo (s)', min: 0, max: 0.2, step: 0.01 },
  { key: 'playerWidth', label: 'Largura do boneco (células)', min: 0.5, max: 1, step: 0.05 },
  { key: 'playerHeight', label: 'Altura do boneco (células)', min: 0.8, max: 1.9, step: 0.05 },
];

const STORAGE_KEY = 'riscote.params.v1';

export function loadParams(): MovementParams {
  const params = { ...DEFAULT_PARAMS };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<MovementParams>;
    for (const s of SLIDERS) {
      const v = saved[s.key];
      if (typeof v === 'number' && v >= s.min && v <= s.max) params[s.key] = v;
    }
  } catch {
    // Sem armazenamento: segue com os valores padrão.
  }
  return params;
}

function saveParams(params: MovementParams): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // Conveniência apenas.
  }
}

/** Painel de ajuste em tempo real: altera `params` no lugar, que a simulação lê a cada tick. */
export function mountTuning(container: HTMLElement, params: MovementParams): () => void {
  const inputs = new Map<keyof MovementParams, { input: HTMLInputElement; out: HTMLOutputElement }>();
  for (const s of SLIDERS) {
    const row = document.createElement('label');
    row.className = 'slider';
    const name = document.createElement('span');
    name.textContent = s.label;
    const out = document.createElement('output');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(s.min);
    input.max = String(s.max);
    input.step = String(s.step);
    input.addEventListener('input', () => {
      params[s.key] = Number(input.value);
      out.textContent = input.value;
      saveParams(params);
    });
    input.addEventListener('pointerup', () => input.blur());
    row.append(name, out, input);
    container.append(row);
    inputs.set(s.key, { input, out });
  }

  const refresh = () => {
    for (const [key, { input, out }] of inputs) {
      input.value = String(params[key]);
      out.textContent = String(params[key]);
    }
  };
  refresh();
  return () => {
    Object.assign(params, DEFAULT_PARAMS);
    saveParams(params);
    refresh();
  };
}
