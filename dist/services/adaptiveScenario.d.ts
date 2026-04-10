import type { SalesSkill } from '../schemas/coaching';
/**
 * @deprecated Use Phase 2 adaptive pipeline: `buildAdaptiveScenarioPlan` + `buildRoleplaySystemPrompt`.
 * Kept for tests and emergency fallback.
 *
 * Extra instructions appended to the customer roleplay prompt in adaptive mode.
 * Does not name skills in-character; keeps scenarios plausible.
 */
export declare function buildAdaptiveCustomerGuidance(weaknesses: SalesSkill[]): string;
//# sourceMappingURL=adaptiveScenario.d.ts.map