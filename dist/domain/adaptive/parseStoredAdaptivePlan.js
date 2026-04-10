"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStoredAdaptivePlan = parseStoredAdaptivePlan;
const adaptiveScenarioPlan_1 = require("../../schemas/adaptiveScenarioPlan");
/**
 * Parse `Conversation.adaptiveScenarioPlan` from DB JSON. Never throws.
 * Invalid or drifted shapes are treated as absent; chat and list stay up.
 */
function parseStoredAdaptivePlan(raw, ctx) {
    if (raw == null)
        return null;
    const parsed = (0, adaptiveScenarioPlan_1.safeParseAdaptiveScenarioPlan)(raw);
    if (parsed.success) {
        const plan = parsed.data;
        // We only persist plans with ≥1 weakness; empty means bad/corrupt row—fall back silently.
        if (plan.targetWeaknesses.length === 0)
            return null;
        return plan;
    }
    const suffix = ctx.conversationId ? ` conversationId=${ctx.conversationId}` : '';
    console.warn(`[adaptiveScenarioPlan] invalid stored JSON (${ctx.where})${suffix}`);
    return null;
}
//# sourceMappingURL=parseStoredAdaptivePlan.js.map