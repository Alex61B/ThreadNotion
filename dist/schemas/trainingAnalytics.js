"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingAnalyticsSchema = exports.ModeAnalyticsSchema = exports.SkillAnalyticsSchema = exports.SimulationModeAnalyticsSchema = void 0;
const zod_1 = require("zod");
const coaching_1 = require("./coaching");
exports.SimulationModeAnalyticsSchema = zod_1.z.enum(['generic', 'adaptive', 'drill']);
exports.SkillAnalyticsSchema = zod_1.z.object({
    skill: coaching_1.SalesSkillSchema,
    averageScore: zod_1.z.number(),
    recentAverageScore: zod_1.z.number(),
    improvementRate: zod_1.z.number(),
    weaknessFrequency: zod_1.z.number(),
    /** Sessions since this skill was in the bottom tier (0 = most recent graded run). */
    lastSeenWeakness: zod_1.z.number().optional(),
    /** Last few session scores for this skill (for sparkline), oldest→newest within window. */
    trendScores: zod_1.z.array(zod_1.z.number()).optional(),
});
exports.ModeAnalyticsSchema = zod_1.z.object({
    mode: exports.SimulationModeAnalyticsSchema,
    sessionCount: zod_1.z.number().int().min(0),
    averageScoreImprovement: zod_1.z.number().optional(),
});
exports.TrainingAnalyticsSchema = zod_1.z.object({
    skills: zod_1.z.array(exports.SkillAnalyticsSchema),
    modes: zod_1.z.array(exports.ModeAnalyticsSchema),
    strongestSkill: coaching_1.SalesSkillSchema.optional(),
    weakestSkill: coaching_1.SalesSkillSchema.optional(),
    mostImprovedSkill: coaching_1.SalesSkillSchema.optional(),
    persistentWeakness: coaching_1.SalesSkillSchema.optional(),
    sessionsAnalyzed: zod_1.z.number().int().min(0),
});
//# sourceMappingURL=trainingAnalytics.js.map