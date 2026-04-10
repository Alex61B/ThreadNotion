import { describe, expect, it } from 'vitest';
import { computeTrendDirection } from './trend';

describe('computeTrendDirection', () => {
  it('is stable when no prior score', () => {
    expect(computeTrendDirection(null, 7)).toBe('stable');
  });

  it('detects improving', () => {
    expect(computeTrendDirection(5, 6)).toBe('improving');
  });

  it('detects declining', () => {
    expect(computeTrendDirection(8, 7)).toBe('declining');
  });

  it('is stable within epsilon', () => {
    expect(computeTrendDirection(5, 5.02)).toBe('stable');
  });
});
