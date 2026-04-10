"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesEvaluationLLMSchema = exports.CoachingFeedbackBlockSchema = exports.SalesSkillSchema = exports.SALES_SKILLS = void 0;
exports.extractCoachingFeedbackFromRaw = extractCoachingFeedbackFromRaw;
const zod_1 = require("zod");
exports.SALES_SKILLS = [
    'discovery_questions',
    'objection_handling',
    'product_knowledge',
    'closing',
    'storytelling',
    'empathy',
];
exports.SalesSkillSchema = zod_1.z.enum(exports.SALES_SKILLS);
const skillScoreEntry = zod_1.z.object({
    score: zod_1.z.coerce.number().int().min(1).max(10),
    reasoning: zod_1.z.string().min(1),
});
const coachingSkillLine = zod_1.z.object({
    skill: exports.SalesSkillSchema,
    explanation: zod_1.z.string().min(1).max(2000),
});
const keyMomentSchema = zod_1.z.object({
    skill: exports.SalesSkillSchema,
    customerMessage: zod_1.z.string().max(2000).optional(),
    userMessage: zod_1.z.string().max(2000).optional(),
    whyItMatters: zod_1.z.string().min(1).max(2000),
    suggestedApproach: zod_1.z.string().min(1).max(2000),
});
/** Transcript-grounded coaching narrative (Phase 3). */
exports.CoachingFeedbackBlockSchema = zod_1.z.object({
    strengths: zod_1.z.array(coachingSkillLine).min(1).max(6),
    improvementAreas: zod_1.z.array(coachingSkillLine).min(1).max(6),
    keyMoments: zod_1.z.array(keyMomentSchema).min(2).max(6),
    nextTimeFocus: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(5),
    overallCoachingSummary: zod_1.z.string().min(1).max(4000),
});
/**
 * Strict LLM output for new evaluations (Phase 3).
 */
exports.SalesEvaluationLLMSchema = zod_1.z.object({
    skills: zod_1.z.object({
        discovery_questions: skillScoreEntry,
        objection_handling: skillScoreEntry,
        product_knowledge: skillScoreEntry,
        closing: skillScoreEntry,
        storytelling: skillScoreEntry,
        empathy: skillScoreEntry,
    }),
    topWeaknesses: zod_1.z.array(exports.SalesSkillSchema).length(3),
    recommendedTips: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(8),
    coaching: exports.CoachingFeedbackBlockSchema,
});
/**
 * Extract validated coaching block from persisted raw evaluator output (backward compatible).
 */
function extractCoachingFeedbackFromRaw(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const coaching = raw.coaching;
    if (coaching === undefined || coaching === null)
        return null;
    const parsed = exports.CoachingFeedbackBlockSchema.safeParse(coaching);
    return parsed.success ? parsed.data : null;
}
//# sourceMappingURL=coaching.js.map