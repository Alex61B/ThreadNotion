/**
 * Rolling aggregate: newCurrent = oldCurrent * 0.7 + newSimulationScore * 0.3
 */
export function computeRollingScore(oldCurrent: number | null, newSimulationScore: number): number {
  if (oldCurrent === null || oldCurrent === undefined) {
    return newSimulationScore;
  }
  return oldCurrent * 0.7 + newSimulationScore * 0.3;
}
