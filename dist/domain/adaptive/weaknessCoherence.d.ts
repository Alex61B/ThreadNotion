import type { SalesSkill } from '../../schemas/coaching';
export type CoherenceResult = {
    /** Max 3 skills, ordered by input priority. */
    skills: SalesSkill[];
    /** When two skills are merged into one stance, set theme; otherwise undefined. */
    scenarioTheme?: string;
    /** Skill ids dropped because merged with another (subset of input). */
    droppedSkills: SalesSkill[];
};
/**
 * Deterministic trimming and merging:
 * - Cap at 3 weaknesses.
 * - Merge known pairs into a single "theme" so we do not stack redundant pressures.
 */
export declare function mergeWeaknessesForScenario(orderedWeaknesses: SalesSkill[]): CoherenceResult;
//# sourceMappingURL=weaknessCoherence.d.ts.map