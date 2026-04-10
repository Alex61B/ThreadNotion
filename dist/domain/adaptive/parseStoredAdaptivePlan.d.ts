import type { AdaptiveScenarioPlan } from '../../schemas/adaptiveScenarioPlan';
export type ParseStoredPlanContext = {
    /** e.g. "GET /conversations", "POST /chat continue" */
    where: string;
    conversationId?: string;
};
/**
 * Parse `Conversation.adaptiveScenarioPlan` from DB JSON. Never throws.
 * Invalid or drifted shapes are treated as absent; chat and list stay up.
 */
export declare function parseStoredAdaptivePlan(raw: unknown, ctx: ParseStoredPlanContext): AdaptiveScenarioPlan | null;
//# sourceMappingURL=parseStoredAdaptivePlan.d.ts.map