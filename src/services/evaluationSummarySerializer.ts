import type { SimulationEvaluationSummary } from '../../generated/prisma';
import { extractCoachingFeedbackFromRaw } from '../schemas/coaching';
import { parseMomentCoachingEntries } from '../schemas/momentCoaching';

/** API-safe summary row including optional Phase 3 coaching narrative and moment coaching. */
export function serializeCoachingSummary(summary: SimulationEvaluationSummary) {
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
    coachingFeedback: extractCoachingFeedbackFromRaw(summary.rawEvaluatorOutput),
    momentCoaching: parseMomentCoachingEntries(summary.momentCoachingEntries),
  };
}
