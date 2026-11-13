import { describe, it, expect } from 'vitest';
import { computeScore, median, clamp } from '../src/lib/scoring';

describe('computeScore', () => {
  it('renvoie 0 si tous les tests ne passent pas', () => {
    const r = computeScore({
      basePoints: 100, difficulty: 2, perfMax: 50, tOpt: 0.5, tMax: 5, cpuTimeMs: 1, allTestsPassed: false,
    });
    expect(r).toEqual({ base: 0, perf: 0, total: 0 });
  });

  it('donne base + perf max si temps optimal', () => {
    const r = computeScore({
      basePoints: 100, difficulty: 2, perfMax: 50, tOpt: 0.5, tMax: 5, cpuTimeMs: 0.5, allTestsPassed: true,
    });
    expect(r.base).toBe(200);
    expect(r.perf).toBe(50);
    expect(r.total).toBe(250);
  });

  it('donne base seul si temps au-delà de tMax', () => {
    const r = computeScore({
      basePoints: 100, difficulty: 1, perfMax: 50, tOpt: 0.5, tMax: 5, cpuTimeMs: 10, allTestsPassed: true,
    });
    expect(r.base).toBe(100);
    expect(r.perf).toBe(0);
    expect(r.total).toBe(100);
  });

  it('interpole la perf entre tOpt et tMax', () => {
    const r = computeScore({
      basePoints: 100, difficulty: 1, perfMax: 50, tOpt: 0, tMax: 10, cpuTimeMs: 5, allTestsPassed: true,
    });
    expect(r.perf).toBe(25);
  });

  it('gère tOpt/tMax null (pas de bonus perf)', () => {
    const r = computeScore({
      basePoints: 100, difficulty: 3, perfMax: 50, tOpt: null, tMax: null, cpuTimeMs: 1, allTestsPassed: true,
    });
    expect(r.base).toBe(300);
    expect(r.perf).toBe(0);
  });
});

describe('median', () => {
  it('médiane impaire', () => {
    expect(median([1, 2, 3, 4, 5])).toBe(3);
  });
  it('médiane paire', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('tableau vide', () => {
    expect(median([])).toBe(0);
  });
});

describe('clamp', () => {
  it('borne les valeurs', () => {
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(-0.5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
