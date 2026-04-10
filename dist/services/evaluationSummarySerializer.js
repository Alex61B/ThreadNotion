"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeCoachingSummary = serializeCoachingSummary;
const coaching_1 = require("../schemas/coaching");
/** API-safe summary row including optional Phase 3 coaching narrative. */
function serializeCoachingSummary(summary) {
    return {
        id: summary.id,
        conversationId: summary.conversationId,
        userId: summary.userId,
        questionCount: summary.questionCount,
        avgMessageLength: summary.avgMessageLength,
        talkRatio: summary.talkRatio,
        weaknesses: summary.weaknesses,
        recommendedTips: summary.recommendedTips,
        createdAt: summary.createdAt.toISOString(),
        coachingFeedback: (0, coaching_1.extractCoachingFeedbackFromRaw)(summary.rawEvaluatorOutput),
    };
}
//# sourceMappingURL=evaluationSummarySerializer.js.map