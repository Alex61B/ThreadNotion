import type { SimulationMode } from '../../../generated/prisma';
/** User turns (count) since last shown suggestion before another may appear. */
export declare const MIN_USER_TURNS_BETWEEN_SUGGESTIONS = 2;
/** Cap suggestions per conversation. */
export declare const MAX_SUGGESTIONS_PER_CONVERSATION = 5;
/** Do not suggest a kind if it appears in this many most recent suggestion kinds. */
export declare const DEDUPE_RECENT_KINDS_WINDOW = 3;
export type LiveCoachingConfidence = 'low' | 'medium' | 'high';
/** Minimum effective confidence rank required to show a tip (1=low, 3=high). */
export declare function minConfidenceRankForMode(mode: SimulationMode): number;
export declare function confidenceMeetsFloor(conf: LiveCoachingConfidence, mode: SimulationMode): boolean;
export declare function bumpConfidence(conf: LiveCoachingConfidence): LiveCoachingConfidence;
//# sourceMappingURL=liveCoachingPolicy.d.ts.map