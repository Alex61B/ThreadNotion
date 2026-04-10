import type { SalesSkill } from '../schemas/coaching';
import type { AdaptiveScenarioPlan } from '../schemas/adaptiveScenarioPlan';
export type PersonaSlice = {
    name: string;
    tone: string | null;
    instructions: string;
};
export type ProductSlice = {
    title: string;
    brand: string | null;
    price: number | null;
    description: string | null;
} | null;
/**
 * Build a persisted adaptive plan from top weaknesses + persona/product context.
 * No LLM calls—deterministic catalog + coherence only.
 */
export declare function buildAdaptiveScenarioPlan(args: {
    targetWeaknesses: SalesSkill[];
    persona: PersonaSlice;
    product: ProductSlice;
    realismSeed?: string;
}): AdaptiveScenarioPlan;
//# sourceMappingURL=adaptiveScenarioPlanService.d.ts.map