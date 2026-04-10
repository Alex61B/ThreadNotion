"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveScenarioPlanSchema = exports.PressureTacticSchema = void 0;
exports.parseAdaptiveScenarioPlan = parseAdaptiveScenarioPlan;
exports.safeParseAdaptiveScenarioPlan = safeParseAdaptiveScenarioPlan;
const zod_1 = require("zod");
const coaching_1 = require("./coaching");
const types_1 = require("../domain/simulationRealism/types");
/** One pressure tactic the customer can apply (no raw skill enum in customer-facing copy). */
exports.PressureTacticSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    /** Short label for debugging / API; not shown to the model as a skill name. */
    label: zod_1.z.string().min(1),
    /** Instruction line for the roleplay prompt (customer behavior). */
    customerLine: zod_1.z.string().min(1),
});
exports.AdaptiveScenarioPlanSchema = zod_1.z.object({
    targetWeaknesses: zod_1.z.array(coaching_1.SalesSkillSchema).max(3),
    /** One line: who the shopper is in this run. */
    personaSummary: zod_1.z.string().min(1),
    /** Store / situation framing. */
    customerContext: zod_1.z.string().min(1),
    /** What success looks like for the associate in this scenario. */
    scenarioGoal: zod_1.z.string().min(1),
    pressureTactics: zod_1.z.array(exports.PressureTacticSchema).min(0).max(8),
    conversationConstraints: zod_1.z.array(zod_1.z.string().min(1)),
    /** Shown in UI as "Scenario focus". */
    coachingFocusSummary: zod_1.z.string().min(1),
    /** Why these pressures were chosen (inspection, debugging). */
    scenarioRationale: zod_1.z.string().min(1),
    /** Optional merged theme when coherence combines skills (e.g. discovery + empathy). */
    scenarioTheme: zod_1.z.string().optional(),
    /** Phase 6: deterministic realism envelope for richer behavior. */
    simulationRealism: types_1.SimulationRealismSchema.optional(),
});
function parseAdaptiveScenarioPlan(json) {
    return exports.AdaptiveScenarioPlanSchema.parse(json);
}
function safeParseAdaptiveScenarioPlan(json) {
    return exports.AdaptiveScenarioPlanSchema.safeParse(json);
}
//# sourceMappingURL=adaptiveScenarioPlan.js.map