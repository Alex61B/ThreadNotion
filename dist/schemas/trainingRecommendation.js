"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingRecommendationSchema = exports.ConfidenceSchema = exports.SimulationModeRecommendationSchema = void 0;
const zod_1 = require("zod");
const coaching_1 = require("./coaching");
exports.SimulationModeRecommendationSchema = zod_1.z.enum(['generic', 'adaptive', 'drill']);
exports.ConfidenceSchema = zod_1.z.enum(['high', 'medium', 'low']);
exports.TrainingRecommendationSchema = zod_1.z.object({
    recommendedMode: exports.SimulationModeRecommendationSchema,
    primarySkill: coaching_1.SalesSkillSchema.optional(),
    secondarySkill: coaching_1.SalesSkillSchema.optional(),
    rationale: zod_1.z.string().min(1),
    confidence: exports.ConfidenceSchema.optional(),
    sourceFactors: zod_1.z.array(zod_1.z.string()).default([]),
});
//# sourceMappingURL=trainingRecommendation.js.map