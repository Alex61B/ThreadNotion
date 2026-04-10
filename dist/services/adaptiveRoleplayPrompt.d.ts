import type { AdaptiveScenarioPlan } from '../schemas/adaptiveScenarioPlan';
/**
 * Fashion / apparel base block (persona + product) without adaptive sections.
 * Caller supplies the same base they use today for generic roleplay.
 */
export declare function buildRoleplaySystemPrompt(args: {
    baseFashionBlock: string;
    plan: AdaptiveScenarioPlan | null;
    /** Drill uses the same plan shape but distinct copy so the model treats it as a short skill rep, not full adaptive play. */
    practiceKind?: 'adaptive' | 'drill';
}): string;
//# sourceMappingURL=adaptiveRoleplayPrompt.d.ts.map