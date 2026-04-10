import { describe, expect, it } from 'vitest';
import { computeRollingScore } from './rollingScore';

describe('computeRollingScore', () => {
  it('uses simulation score when no prior aggregate', () => {
    expect(computeRollingScore(null, 8)).toBe(8);
  });

  it('applies 0.7/0.3 blend', () => {
    expect(computeRollingScore(10, 0)).toBeCloseTo(7, 5);
    expect(computeRollingScore(0, 10)).toBeCloseTo(3, 5);
    expect(computeRollingScore(5, 8)).toBeCloseTo(5 * 0.7 + 8 * 0.3, 5);
  });
});
