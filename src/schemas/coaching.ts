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
  strengths: z.array(coachingSkillLine).max(6),
  improvementAreas: z.array(coachingSkillLine).min(1).max(6),
  keyMoments: z.array(keyMomentSchema).max(6),
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

const SKILL_ALIASES: Record<string, SalesSkill> = {
  rapport_building:           'empathy',
  active_listening:           'empathy',
  listening:                  'empathy',
  trust_building:             'empathy',
  needs_assessment:           'discovery_questions',
  questioning:                'discovery_questions',
  discovery:                  'discovery_questions',
  handling_objections:        'objection_handling',
  objections:                 'objection_handling',
  product_knowledge_display:  'product_knowledge',
  product:                    'product_knowledge',
  upselling:                  'closing',
  trial_close:                'closing',
  close:                      'closing',
  narrative:                  'storytelling',
  story:                      'storytelling',
};

function coerceSkill(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if ((SALES_SKILLS as readonly string[]).includes(value)) return value;
  const lower = value.toLowerCase().replace(/-/g, '_');
  return SKILL_ALIASES[lower] ?? value;
}

function normalizeCoachingItem(item: unknown): unknown {
  if (!item || typeof item !== 'object') return item;
  const entry = item as Record<string, unknown>;
  return { ...entry, skill: coerceSkill(entry.skill) };
}

function isValidSkill(item: unknown): boolean {
  return (
    !!item &&
    typeof item === 'object' &&
    (SALES_SKILLS as readonly string[]).includes(
      (item as Record<string, unknown>).skill as string
    )
  );
}

function normalizeCoachingBlock(coaching: unknown): unknown {
  if (!coaching || typeof coaching !== 'object') return coaching;
  const result = { ...(coaching as Record<string, unknown>) };

  for (const field of ['strengths', 'improvementAreas'] as const) {
    if (Array.isArray(result[field])) {
      result[field] = (result[field] as unknown[])
        .map(normalizeCoachingItem)
        .filter(isValidSkill);
    }
  }

  if (Array.isArray(result.keyMoments)) {
    const mapped = (result.keyMoments as unknown[]).map(normalizeCoachingItem);
    const valid = mapped.filter(isValidSkill);
    result.keyMoments = valid.length >= 2 ? valid : mapped;
  }

  return result;
}

/**
 * Pre-validation normalizer. Strips markdown fences and coerces coaching skill strings
 * to valid enum values before Zod validation. Returns unknown — caller must still safeParse.
 */
export function normalizeRawEvaluatorOutput(raw: unknown): unknown {
  if (typeof raw === 'string') {
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    try {
      raw = JSON.parse(stripped);
    } catch {
      return raw;
    }
  }

  if (!raw || typeof raw !== 'object') return raw;

  const obj = raw as Record<string, unknown>;
  if (obj.coaching !== undefined) {
    return { ...obj, coaching: normalizeCoachingBlock(obj.coaching) };
  }
  return raw;
}

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
