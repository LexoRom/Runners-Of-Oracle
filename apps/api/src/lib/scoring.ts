// Calcul du score d'un défi (§4.3) — fonction pure, testable sans BDD.
export interface ScoreInput {
  basePoints: number;
  difficulty: number;
  perfMax: number;
  tOpt: number | null;
  tMax: number | null;
  cpuTimeMs: number;
  allTestsPassed: boolean;
}

export interface ScoreResult {
  base: number;
  perf: number;
  total: number;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function computeScore(input: ScoreInput): ScoreResult {
  const base = input.basePoints * input.difficulty;
  if (!input.allTestsPassed) return { base: 0, perf: 0, total: 0 };

  let perf = 0;
  if (input.tOpt != null && input.tMax != null && input.tMax > input.tOpt) {
    const ratio = clamp(1 - (input.cpuTimeMs - input.tOpt) / (input.tMax - input.tOpt), 0, 1);
    perf = Math.round(input.perfMax * ratio);
  }
  return { base, perf, total: base + perf };
}

// Médiane de N mesures (§4.3 : 5 exécutions, on retient la médiane).
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
