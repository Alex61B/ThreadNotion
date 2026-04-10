import { z } from 'zod';

export const SALES_SKILLS = [
  'discovery_questions',
  'objection_handling',
  'product_knowledge',
  'closing',
  'storytelling',
  'empathy',
] as const;

export type SalesSkill = (typeof SALES_SKILLS)[number];

export const SalesSkillSchema = z.enum(SALES_SKILLS);

const skillScoreEntry = z.object({
  score: z.coerce.number().int().min(1).max(10),
  reasoning: z.string().min(1),
});

const coachingSkillLine = z.object({
  skill: SalesSkillSchema,
  explanation: z.string().min(1).max(2000),
});

const keyMomentSchema = z.object({
  skill: SalesSkillSchema,
  customerMessage: z.string().max(2000).optional(),
  userMessage: z.string().max(2000).optional(),
  whyItMatters: z.string().min(1).max(2000),
  suggestedApproach: z.string().min(1).max(2000),
});

/** Transcript-grounded coaching narrative (Phase 3). */
export const CoachingFeedbackBlockSchema = z.object({
  strengths: z.array(coachingSkillLine).min(1).max(6),
  improvementAreas: z.array(coachingSkillLine).min(1).max(6),
  keyMoments: z.array(keyMomentSchema).min(2).max(6),
  nextTimeFocus: z.array(z.string().min(1)).min(1).max(5),
  overallCoachingSummary: z.string().min(1).max(4000),
});

export type CoachingFeedback = z.infer<typeof CoachingFeedbackBlockSchema>;

/**
 * Strict LLM output for new evaluations (Phase 3).
 */
export const SalesEvaluationLLMSchema = z.object({
  skills: z.object({
    discovery_questions: skillScoreEntry,
    objection_handling: skillScoreEntry,
    product_knowledge: skillScoreEntry,
    closing: skillScoreEntry,
    storytelling: skillScoreEntry,
    empathy: skillScoreEntry,
  }),
  topWeaknesses: z.array(SalesSkillSchema).length(3),
  recommendedTips: z.array(z.string().min(1)).min(1).max(8),
  coaching: CoachingFeedbackBlockSchema,
});

export type SalesEvaluationLLM = z.infer<typeof SalesEvaluationLLMSchema>;

/**
 * Extract validated coaching block from persisted raw evaluator output (backward compatible).
 */
export function extractCoachingFeedbackFromRaw(raw: unknown): CoachingFeedback | null {
  if (!raw || typeof raw !== 'object') return null;
  const coaching = (raw as Record<string, unknown>).coaching;
  if (coaching === undefined || coaching === null) return null;
  const parsed = CoachingFeedbackBlockSchema.safeParse(coaching);
  return parsed.success ? parsed.data : null;
}
