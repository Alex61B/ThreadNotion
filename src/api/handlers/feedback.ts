import { z } from 'zod';
import { isEvaluationError } from '../../errors/evaluationErrors';
import { evaluateConversation } from '../../services/simulationEvaluationService';
import { serializeCoachingSummary } from '../../services/evaluationSummarySerializer';
import { buildTrainingRecommendationBundle } from '../../services/trainingRecommendationService';
import { decrementTrainingFocusSessionIfAny } from '../../services/userTrainingFocusService';
import type { JsonHandlerResult } from '../httpTypes';
import { zodErrorResult } from '../zodHttp';

const FeedbackReq = z.object({ conversationId: z.string() });

export async function postFeedback(rawBody: unknown): Promise<JsonHandlerResult> {
  let parsed: z.infer<typeof FeedbackReq>;
  try {
    parsed = FeedbackReq.parse(rawBody);
  } catch (e) {
    if (e instanceof z.ZodError) return zodErrorResult(e);
    throw e;
  }
  const { conversationId } = parsed;

  try {
    const result = await evaluateConversation(conversationId);
    if (result.summary.userId) {
      await decrementTrainingFocusSessionIfAny(result.summary.userId);
    }
    let progressBundle: Awaited<ReturnType<typeof buildTrainingRecommendationBundle>> | undefined;
    if (result.summary.userId != null) {
      progressBundle = await buildTrainingRecommendationBundle(result.summary.userId);
    }

    return {
      status: 200,
      body: {
        ok: true,
        coachingEvaluation: {
          conversationId: result.conversationId,
          summary: serializeCoachingSummary(result.summary),
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
          momentCoaching: result.momentCoaching ?? null,
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'conversation not found') {
      return { status: 404, body: { error: 'conversation not found' } };
    }
    if (msg === 'no messages to evaluate') {
      return { status: 400, body: { error: 'no messages to evaluate' } };
    }
    if (isEvaluationError(e)) {
      const body: Record<string, unknown> = {
        error:
          e.code === 'EVALUATOR_PARSE' ? 'evaluator_malformed_json' : 'evaluator_validation_failed',
        message: e.message,
      };
      if (e.code === 'EVALUATOR_VALIDATION' && e.cause instanceof z.ZodError) {
        body.details = e.cause.flatten();
      }
      return { status: 400, body };
    }
    throw e;
  }
}
