"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratedTrainingRecommendationSchema = exports.DifficultyLevelSchema = exports.OrchestrationSourceSchema = void 0;
exports.toLegacyTrainingRecommendation = toLegacyTrainingRecommendation;
const zod_1 = require("zod");
const coaching_1 = require("./coaching");
const trainingRecommendation_1 = require("./trainingRecommendation");
exports.OrchestrationSourceSchema = zod_1.z.enum([
    'manager_assignment',
    'training_focus',
    'weakness_engine',
    'spaced_repetition',
    'mastery_adjustment',
    'generic_fallback',
]);
exports.DifficultyLevelSchema = zod_1.z.enum(['easy', 'medium', 'hard']);
exports.OrchestratedTrainingRecommendationSchema = zod_1.z.object({
    recommendedMode: trainingRecommendation_1.SimulationModeRecommendationSchema,
    targetSkills: zod_1.z.array(coaching_1.SalesSkillSchema),
    rationale: zod_1.z.string().min(1),
    difficultyLevel: exports.DifficultyLevelSchema.optional(),
    source: exports.OrchestrationSourceSchema.optional(),
    confidence: trainingRecommendation_1.ConfidenceSchema.optional(),
    sourceFactors: zod_1.z.array(zod_1.z.string()).default([]),
});
function toLegacyTrainingRecommendation(orch) {
    return {
        recommendedMode: orch.recommendedMode,
        primarySkill: orch.targetSkills[0],
        secondarySkill: orch.targetSkills[1],
        rationale: orch.rationale,
        confidence: orch.confidence,
        sourceFactors: orch.sourceFactors ?? [],
    };
}
//# sourceMappingURL=trainingOrchestration.js.map