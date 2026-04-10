"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressSnapshotSchema = exports.SkillProgressSchema = exports.TrendDirectionSchema = void 0;
const zod_1 = require("zod");
const coaching_1 = require("./coaching");
exports.TrendDirectionSchema = zod_1.z.enum(['improving', 'declining', 'stable']);
exports.SkillProgressSchema = zod_1.z.object({
    skill: coaching_1.SalesSkillSchema,
    currentScore: zod_1.z.number(),
    trendDirection: exports.TrendDirectionSchema,
    latestSimulationScore: zod_1.z.number().int().min(1).max(10).optional(),
    previousSimulationScore: zod_1.z.number().int().min(1).max(10).optional(),
    /** Latest minus previous simulation score, only when both exist. */
    latestDelta: zod_1.z.number().optional(),
});
exports.ProgressSnapshotSchema = zod_1.z.object({
    skills: zod_1.z.array(exports.SkillProgressSchema),
    lowestSkills: zod_1.z.array(coaching_1.SalesSkillSchema),
    recommendedFocusSkills: zod_1.z.array(coaching_1.SalesSkillSchema),
    recommendedFocusMessage: zod_1.z.string().optional(),
    overallProgressSummary: zod_1.z.string(),
});
//# sourceMappingURL=progressSnapshot.js.map