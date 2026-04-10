"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStoredDrillPlan = parseStoredDrillPlan;
const drillPlan_1 = require("../../schemas/drillPlan");
/**
 * Parse `Conversation.drillPlan` from DB JSON. Never throws.
 */
function parseStoredDrillPlan(json, ctx) {
    if (json == null)
        return null;
    const parsed = (0, drillPlan_1.safeParseDrillPlanStored)(json);
    if (parsed.success)
        return parsed.data;
    console.warn(`[drillPlan] invalid stored JSON (${ctx.where}) conversationId=${ctx.conversationId}`);
    return null;
}
//# sourceMappingURL=parseStoredDrillPlan.js.map