import type { SalesSkill } from '../../schemas/coaching';
import { catalogPressureOptionsForSkill } from '../adaptive/weaknessPressureCatalog';
import { hashStringToIndex } from '../simulationRealism/hash';

/**
 * Deterministic variant index for catalog rotation from a stable seed (userId, conv id, etc.).
 */
export function drillVariantIndexFromSeed(seed: string, skill: SalesSkill, salt = ''): number {
  const opts = catalogPressureOptionsForSkill(skill);
  return hashStringToIndex(`${seed}:${skill}:${salt}`, opts.length);
}
