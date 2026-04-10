import type { SimulationMode } from '../../../generated/prisma';

/** User turns (count) since last shown suggestion before another may appear. */
export const MIN_USER_TURNS_BETWEEN_SUGGESTIONS = 2;

/** Cap suggestions per conversation. */
export const MAX_SUGGESTIONS_PER_CONVERSATION = 5;

/** Do not suggest a kind if it appears in this many most recent suggestion kinds. */
export const DEDUPE_RECENT_KINDS_WINDOW = 3;

export type LiveCoachingConfidence = 'low' | 'medium' | 'high';

const CONF_RANK: Record<LiveCoachingConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/** Minimum effective confidence rank required to show a tip (1=low, 3=high). */
export function minConfidenceRankForMode(mode: SimulationMode): number {
  if (mode === 'generic') return CONF_RANK.high;
  if (mode === 'adaptive' || mode === 'drill') return CONF_RANK.medium;
  return CONF_RANK.medium;
}

export function confidenceMeetsFloor(
  conf: LiveCoachingConfidence,
  mode: SimulationMode
): boolean {
  return CONF_RANK[conf] >= minConfidenceRankForMode(mode);
}

export function bumpConfidence(
  conf: LiveCoachingConfidence
): LiveCoachingConfidence {
  if (conf === 'low') return 'medium';
  if (conf === 'medium') return 'high';
  return 'high';
}
