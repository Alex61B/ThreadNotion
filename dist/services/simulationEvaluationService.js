"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateConversation = evaluateConversation;
exports.getEvaluationForConversation = getEvaluationForConversation;
const coaching_1 = require("../schemas/coaching");
const evaluationErrors_1 = require("../errors/evaluationErrors");
const db_1 = require("../db");
const weaknessSelection_1 = require("../domain/weaknessSelection");
const mergeRecommendedTips_1 = require("../domain/coaching/mergeRecommendedTips");
const transcriptMetrics_1 = require("./transcriptMetrics");
const llm_1 = require("./llm");
const weaknessProfileService_1 = require("./weaknessProfileService");
function scoresFromParsed(parsed) {
    const out = {};
    for (const s of coaching_1.SALES_SKILLS) {
        out[s] = parsed.skills[s].score;
    }
    return out;
}
async function evaluateConversation(conversationId) {
    const convo = await db_1.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            messages: { orderBy: { createdAt: 'asc' } },
            persona: true,
        },
    });
    if (!convo) {
        throw new Error('conversation not found');
    }
    if (convo.messages.length === 0) {
        throw new Error('no messages to evaluate');
    }
    const metrics = (0, transcriptMetrics_1.computeTranscriptMetrics)(convo.messages);
    const transcript = (0, transcriptMetrics_1.formatTranscriptNumbered)(convo.messages);
    const raw = await llm_1.llm.evaluateSalesSkills({
        transcript,
        personaName: convo.persona?.name ?? '',
        metrics,
    });
    const parseResult = coaching_1.SalesEvaluationLLMSchema.safeParse(raw);
    if (!parseResult.success) {
        if (process.env.VITEST !== 'true') {
            console.error('[evaluateConversation] Evaluator output failed schema validation');
        }
        throw new evaluationErrors_1.EvaluationError('Evaluator output failed validation', 'EVALUATOR_VALIDATION', parseResult.error);
    }
    const parsed = parseResult.data;
    const skillScores = scoresFromParsed(parsed);
    const weaknesses = (0, weaknessSelection_1.selectTopWeaknesses)(skillScores);
    const mergedTips = (0, mergeRecommendedTips_1.mergeRecommendedTips)({
        llmTips: parsed.recommendedTips,
        weaknesses,
    });
    const storedEvaluator = {
        ...parsed,
        recommendedTips: mergedTips,
    };
    const rawJson = storedEvaluator;
    await db_1.prisma.$transaction(async (tx) => {
        await tx.simulationSkillScore.deleteMany({ where: { conversationId } });
        await tx.simulationEvaluationSummary.upsert({
            where: { conversationId },
            create: {
                userId: convo.userId,
                conversationId,
                questionCount: metrics.questionCount,
                avgMessageLength: metrics.avgMessageLength,
                talkRatio: metrics.talkRatio,
                weaknesses: weaknesses,
                recommendedTips: mergedTips,
                rawEvaluatorOutput: rawJson,
            },
            update: {
                userId: convo.userId,
                questionCount: metrics.questionCount,
                avgMessageLength: metrics.avgMessageLength,
                talkRatio: metrics.talkRatio,
                weaknesses: weaknesses,
                recommendedTips: mergedTips,
                rawEvaluatorOutput: rawJson,
            },
        });
        await tx.simulationSkillScore.createMany({
            data: coaching_1.SALES_SKILLS.map((skill) => ({
                userId: convo.userId,
                conversationId,
                skill: skill,
                score: skillScores[skill],
                reasoning: parsed.skills[skill].reasoning,
            })),
        });
    });
    if (convo.userId) {
        await (0, weaknessProfileService_1.updateProfilesAfterSimulation)({
            userId: convo.userId,
            conversationId,
            skillScores,
        });
    }
    const summary = await db_1.prisma.simulationEvaluationSummary.findUnique({
        where: { conversationId },
    });
    const scores = await db_1.prisma.simulationSkillScore.findMany({
        where: { conversationId },
        orderBy: { skill: 'asc' },
    });
    const profiles = convo.userId
        ? await db_1.prisma.userWeaknessProfile.findMany({
            where: { userId: convo.userId },
            orderBy: { skill: 'asc' },
        })
        : [];
    return {
        conversationId,
        summary: summary,
        skillScores: scores,
        weaknessProfile: profiles,
    };
}
async function getEvaluationForConversation(conversationId) {
    const summary = await db_1.prisma.simulationEvaluationSummary.findUnique({
        where: { conversationId },
    });
    const skillScores = await db_1.prisma.simulationSkillScore.findMany({
        where: { conversationId },
        orderBy: { skill: 'asc' },
    });
    if (!summary)
        return null;
    return { summary, skillScores };
}
//# sourceMappingURL=simulationEvaluationService.js.map