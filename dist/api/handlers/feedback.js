"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postFeedback = postFeedback;
const zod_1 = require("zod");
const evaluationErrors_1 = require("../../errors/evaluationErrors");
const simulationEvaluationService_1 = require("../../services/simulationEvaluationService");
const evaluationSummarySerializer_1 = require("../../services/evaluationSummarySerializer");
const trainingRecommendationService_1 = require("../../services/trainingRecommendationService");
const userTrainingFocusService_1 = require("../../services/userTrainingFocusService");
const zodHttp_1 = require("../zodHttp");
const FeedbackReq = zod_1.z.object({ conversationId: zod_1.z.string() });
async function postFeedback(rawBody) {
    let parsed;
    try {
        parsed = FeedbackReq.parse(rawBody);
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError)
            return (0, zodHttp_1.zodErrorResult)(e);
        throw e;
    }
    const { conversationId } = parsed;
    try {
        const result = await (0, simulationEvaluationService_1.evaluateConversation)(conversationId);
        if (result.summary.userId) {
            await (0, userTrainingFocusService_1.decrementTrainingFocusSessionIfAny)(result.summary.userId);
        }
        let progressBundle;
        if (result.summary.userId != null) {
            progressBundle = await (0, trainingRecommendationService_1.buildTrainingRecommendationBundle)(result.summary.userId);
        }
        return {
            status: 200,
            body: {
                ok: true,
                coachingEvaluation: {
                    conversationId: result.conversationId,
                    summary: (0, evaluationSummarySerializer_1.serializeCoachingSummary)(result.summary),
                    skillScores: result.skillScores.map((s) => ({
                        id: s.id,
                        skill: s.skill,
                        score: s.score,
                        reasoning: s.reasoning,
                        createdAt: s.createdAt.toISOString(),
                    })),
                    weaknessProfile: result.weaknessProfile.map((p) => ({
                        id: p.id,
                        userId: p.userId,
                        skill: p.skill,
                        currentScore: p.currentScore,
                        trendDirection: p.trendDirection,
                        lastSimulationId: p.lastSimulationId,
                        createdAt: p.createdAt.toISOString(),
                        updatedAt: p.updatedAt.toISOString(),
                    })),
                },
                ...(progressBundle
                    ? {
                        progressSnapshot: progressBundle.progressSnapshot,
                        trainingRecommendation: progressBundle.trainingRecommendation,
                        drillSuggestion: progressBundle.drillSuggestion,
                        orchestratedRecommendation: progressBundle.orchestratedRecommendation,
                    }
                    : {}),
            },
        };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'conversation not found') {
            return { status: 404, body: { error: 'conversation not found' } };
        }
        if (msg === 'no messages to evaluate') {
            return { status: 400, body: { error: 'no messages to evaluate' } };
        }
        if ((0, evaluationErrors_1.isEvaluationError)(e)) {
            const body = {
                error: e.code === 'EVALUATOR_PARSE' ? 'evaluator_malformed_json' : 'evaluator_validation_failed',
                message: e.message,
            };
            if (e.code === 'EVALUATOR_VALIDATION' && e.cause instanceof zod_1.z.ZodError) {
                body.details = e.cause.flatten();
            }
            return { status: 400, body };
        }
        throw e;
    }
}
//# sourceMappingURL=feedback.js.map