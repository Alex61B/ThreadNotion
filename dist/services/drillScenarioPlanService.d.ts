import type { SalesSkill } from '../schemas/coaching';
import type { AdaptiveScenarioPlan } from '../schemas/adaptiveScenarioPlan';
import type { DrillPlanStored } from '../schemas/drillPlan';
import type { PersonaSlice, ProductSlice } from './adaptiveScenarioPlanService';
/**
 * Deterministic focused drill: explicit skills + catalog rotation via variantSeed.
 * Produces a persisted `DrillPlanStored` and the `AdaptiveScenarioPlan` used for prompting.
 */
export declare function buildDrillScenarioPlan(args: {
    primarySkill: SalesSkill;
    secondarySkill?: SalesSkill;
    persona: PersonaSlice;
    product: ProductSlice;
    variantSeed: string;
    realismSeed?: string;
}): {
    stored: DrillPlanStored;
    promptPlan: AdaptiveScenarioPlan;
};
//# sourceMappingURL=drillScenarioPlanService.d.ts.map