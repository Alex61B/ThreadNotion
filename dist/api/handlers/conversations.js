"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listConversations = listConversations;
exports.getConversationEvaluationSummary = getConversationEvaluationSummary;
const db_1 = require("../../db");
const parseStoredAdaptivePlan_1 = require("../../domain/adaptive/parseStoredAdaptivePlan");
const parseStoredDrillPlan_1 = require("../../domain/drill/parseStoredDrillPlan");
const simulationEvaluationService_1 = require("../../services/simulationEvaluationService");
const evaluationSummarySerializer_1 = require("../../services/evaluationSummarySerializer");
async function listConversations(userId) {
    const whereClause = userId ? { userId } : {};
    const conversations = await db_1.prisma.conversation.findMany({
        where: whereClause,
        include: {
            messages: { orderBy: { createdAt: 'asc' } },
            persona: true,
            evaluation: true,
            evaluationSummary: true,
            skillScores: { orderBy: { skill: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
    });
    const transformed = conversations.map((conv) => {
        const adaptiveScenarioPlan = conv.simulationMode === 'adaptive'
            ? (0, parseStoredAdaptivePlan_1.parseStoredAdaptivePlan)(conv.adaptiveScenarioPlan, {
                where: 'GET /conversations',
                conversationId: conv.id,
            })
            : null;
        const drillPlan = conv.simulationMode === 'drill'
            ? (0, parseStoredDrillPlan_1.parseStoredDrillPlan)(conv.drillPlan, {
                where: 'GET /conversations',
                conversationId: conv.id,
            })
            : null;
        return {
            id: conv.id,
            personaId: conv.personaId,
            userId: conv.userId,
            simulationMode: conv.simulationMode,
            adaptiveScenarioPlan,
            drillPlan,
            createdAt: conv.createdAt.toISOString(),
            persona: conv.persona
                ? {
                    id: conv.persona.id,
                    name: conv.persona.name,
                    tone: conv.persona.tone,
                }
                : null,
            messages: conv.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt.toISOString(),
            })),
            evaluation: conv.evaluation
                ? {
                    id: conv.evaluation.id,
                    conversationId: conv.evaluation.conversationId,
                    storytelling: conv.evaluation.storytelling,
                    emotional: conv.evaluation.emotional,
                    persuasion: conv.evaluation.persuasion,
                    productKnow: conv.evaluation.productKnow,
                    total: conv.evaluation.total,
                    strengths: conv.evaluation.strengths,
                    tips: conv.evaluation.tips,
                    createdAt: conv.evaluation.createdAt.toISOString(),
                }
                : null,
            coachingEvaluation: conv.evaluationSummary
                ? {
                    summary: (0, evaluationSummarySerializer_1.serializeCoachingSummary)(conv.evaluationSummary),
                    skillScores: conv.skillScores.map((s) => ({
                        id: s.id,
                        skill: s.skill,
                        score: s.score,
                        reasoning: s.reasoning,
                        createdAt: s.createdAt.toISOString(),
                    })),
                }
                : null,
        };
    });
    return { status: 200, body: { ok: true, conversations: transformed, data: transformed } };
}
async function getConversationEvaluationSummary(conversationId) {
    if (!conversationId) {
        return { status: 400, body: { error: 'conversationId required' } };
    }
    const data = await (0, simulationEvaluationService_1.getEvaluationForConversation)(conversationId);
    if (!data) {
        return { status: 404, body: { error: 'evaluation not found' } };
    }
    return {
        status: 200,
        body: {
            ok: true,
            summary: (0, evaluationSummarySerializer_1.serializeCoachingSummary)(data.summary),
            skillScores: data.skillScores.map((s) => ({
                id: s.id,
                skill: s.skill,
                score: s.score,
                reasoning: s.reasoning,
                createdAt: s.createdAt.toISOString(),
            })),
        },
    };
}
//# sourceMappingURL=conversations.js.map