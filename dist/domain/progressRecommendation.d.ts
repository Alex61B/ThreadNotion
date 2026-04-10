import type { SalesSkill } from '../schemas/coaching';
export type TrendDir = 'improving' | 'declining' | 'stable';
export type ProfileRow = {
    skill: SalesSkill;
    currentScore: number;
    trendDirection: TrendDir;
};
/**
 * Merge lowest skills with declining trends; cap length; deterministic order.
 */
export declare function pickRecommendedFocusSkills(args: {
    lowestSkills: SalesSkill[];
    profilesBySkill: Map<SalesSkill, TrendDir>;
    maxSkills?: number;
}): SalesSkill[];
export declare function buildRecommendedFocusMessage(focus: SalesSkill[], declining: SalesSkill[]): string;
export declare function buildOverallProgressSummary(args: {
    lowestSkills: SalesSkill[];
    profiles: ProfileRow[];
    hasTwoSimulations: boolean;
}): string;
//# sourceMappingURL=progressRecommendation.d.ts.map