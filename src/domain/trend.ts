export type TrendDirection = 'improving' | 'declining' | 'stable';

const EPSILON = 0.05;

export function computeTrendDirection(
  previousScore: number | null,
  newScore: number
): TrendDirection {
  if (previousScore === null || previousScore === undefined) {
    return 'stable';
  }
  if (newScore > previousScore + EPSILON) return 'improving';
  if (newScore < previousScore - EPSILON) return 'declining';
  return 'stable';
}
