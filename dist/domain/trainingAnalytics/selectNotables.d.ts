import { type SalesSkill } from '../../schemas/coaching';
import type { SkillAnalytics } from '../../schemas/trainingAnalytics';
/**
 * Deterministic tie-breakers: higher metric wins; on tie, lower SALES_SKILLS index wins.
 * Persistent weakness: higher weaknessFrequency, then lower averageScore, then lower skill index.
 */
export declare function selectNotables(skills: SkillAnalytics[]): {
    strongestSkill?: SalesSkill;
    weakestSkill?: SalesSkill;
    mostImprovedSkill?: SalesSkill;
    persistentWeakness?: SalesSkill;
};
//# sourceMappingURL=selectNotables.d.ts.map