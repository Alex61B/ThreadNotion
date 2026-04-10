import type { DrillPlanStored } from '../../schemas/drillPlan';
/**
 * Parse `Conversation.drillPlan` from DB JSON. Never throws.
 */
export declare function parseStoredDrillPlan(json: unknown, ctx: {
    where: string;
    conversationId: string;
}): DrillPlanStored | null;
//# sourceMappingURL=parseStoredDrillPlan.d.ts.map