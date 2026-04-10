import type { SalesSkill } from '../../schemas/coaching';
/**
 * Merge LLM tips with deterministic templates for top weaknesses.
 * Dedupes by normalized string; caps length.
 */
export declare function mergeRecommendedTips(args: {
    llmTips: string[];
    weaknesses: SalesSkill[];
}): string[];
//# sourceMappingURL=mergeRecommendedTips.d.ts.map