"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrillPlanStoredSchema = void 0;
exports.parseDrillPlanStored = parseDrillPlanStored;
exports.safeParseDrillPlanStored = safeParseDrillPlanStored;
const zod_1 = require("zod");
const coaching_1 = require("./coaching");
const adaptiveScenarioPlan_1 = require("./adaptiveScenarioPlan");
/** Persisted on Conversation.drillPlan; includes the prompt-ready plan for reload fidelity. */
exports.DrillPlanStoredSchema = zod_1.z.object({
    mode: zod_1.z.literal('drill'),
    primarySkill: coaching_1.SalesSkillSchema,
    secondarySkill: coaching_1.SalesSkillSchema.optional(),
    /** Catalog pressure id or composite variant key for diversity debugging. */
    variantKey: zod_1.z.string().min(1),
    coachingFocusSummary: zod_1.z.string().min(1),
    drillObjective: zod_1.z.string().min(1),
    promptPlan: adaptiveScenarioPlan_1.AdaptiveScenarioPlanSchema,
});
function parseDrillPlanStored(json) {
    return exports.DrillPlanStoredSchema.parse(json);
}
function safeParseDrillPlanStored(json) {
    return exports.DrillPlanStoredSchema.safeParse(json);
}
//# sourceMappingURL=drillPlan.js.map