import type { AdaptiveScenarioPlan } from '../../schemas/adaptiveScenarioPlan';
/**
 * Adds a deterministic realism envelope to an adaptive plan, without changing its core shape.
 * New fields are optional so legacy persisted plans continue to parse.
 */
export declare function enrichAdaptiveScenarioPlanWithRealism(plan: AdaptiveScenarioPlan, seed: string, personaName?: string): AdaptiveScenarioPlan;
//# sourceMappingURL=enrichPlan.d.ts.map