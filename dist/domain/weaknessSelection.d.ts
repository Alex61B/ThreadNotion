import type { SalesSkill } from '../schemas/coaching';
/**
 * Top 3 weaknesses: include all skills with score < 5; if fewer than 3, fill with lowest scores overall.
 * If 3+ skills are below 5, take the 3 lowest scores.
 */
export declare function selectTopWeaknesses(scores: Record<SalesSkill, number>): SalesSkill[];
//# sourceMappingURL=weaknessSelection.d.ts.map