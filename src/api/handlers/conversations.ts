import { prisma } from '../../db';
import { parseStoredAdaptivePlan } from '../../domain/adaptive/parseStoredAdaptivePlan';
import { parseStoredDrillPlan } from '../../domain/drill/parseStoredDrillPlan';
import { getEvaluationForConversation } from '../../services/simulationEvaluationService';
import { serializeCoachingSummary } from '../../services/evaluationSummarySerializer';
import type { JsonHandlerResult } from '../httpTypes';

export async function listConversations(userId: string | undefined): Promise<JsonHandlerResult> {
  const whereClause = userId ? { userId } : {};

  const conversations = await prisma.conversation.findMany({
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
    const adaptiveScenarioPlan =
      conv.simulationMode === 'adaptive'
        ? parseStoredAdaptivePlan(conv.adaptiveScenarioPlan, {
            where: 'GET /conversations',
            conversationId: conv.id,
          })
        : null;
    const drillPlan =
      conv.simulationMode === 'drill'
        ? parseStoredDrillPlan(conv.drillPlan, {
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
        role: m.role as 'user' | 'assistant',
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
            summary: serializeCoachingSummary(conv.evaluationSummary),
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

export async function getConversationEvaluationSummary(
  conversationId: string
): Promise<JsonHandlerResult> {
  if (!conversationId) {
    return { status: 400, body: { error: 'conversationId required' } };
  }
  const data = await getEvaluationForConversation(conversationId);
  if (!data) {
    return { status: 404, body: { error: 'evaluation not found' } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      summary: serializeCoachingSummary(data.summary),
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
