import { z } from 'zod';
import type { SalesSkill } from './coaching';

export const MOMENT_TYPES = [
  'price_hesitation',
  'fit_sizing_uncertainty',
  'styling_request',
  'product_comparison',
  'quality_material_concern',
  'occasion_recommendation',
  'closing_opportunity',
  'reassurance_empathy_moment',
] as const;

export type MomentType = (typeof MOMENT_TYPES)[number];

export const MomentTypeSchema = z.enum(MOMENT_TYPES);

// --- LLM classification output ---

export const DetectedMomentSchema = z.object({
  momentType: MomentTypeSchema,
  customerTurnIndex: z.number().int().min(1),
  associateTurnIndex: z.number().int().min(1),
  customerExcerpt: z.string().max(500),
  associateExcerpt: z.string().max(500),
  confidence: z.enum(['high', 'medium']),
});

export type DetectedMoment = z.infer<typeof DetectedMomentSchema>;

export const MomentClassificationLLMSchema = z.object({
  detectedMoments: z.array(DetectedMomentSchema).max(6),
});

export type MomentClassificationLLM = z.infer<typeof MomentClassificationLLMSchema>;

// --- LLM rubric evaluation output ---

const StepResultLLMSchema = z.object({
  stepNumber: z.number().int().min(1),
  addressed: z.boolean(),
  observation: z.string().min(1).max(500),
});

const MomentEvaluationLLMSchema = z.object({
  momentType: MomentTypeSchema,
  overallHandling: z.enum(['strong', 'partial', 'missed']),
  stepResults: z.array(StepResultLLMSchema).min(1).max(8),
  missedStepNumbers: z.array(z.number().int()),
  betterResponseExample: z.string().min(1).max(1000),
  coachingSummary: z.string().min(1).max(1000),
});

export const MomentRubricLLMSchema = z.object({
  momentEvaluations: z.array(MomentEvaluationLLMSchema).min(1).max(6),
});

export type MomentRubricLLM = z.infer<typeof MomentRubricLLMSchema>;
export type MomentEvaluationLLM = z.infer<typeof MomentEvaluationLLMSchema>;

// --- Final coaching entry shape (stored + returned) ---

export type MomentCoachingEntry = {
  momentType: MomentType;
  label: string;
  skillMappings: SalesSkill[];
  customerExcerpt: string;
  associateExcerpt: string;
  customerTurnIndex: number;
  associateTurnIndex: number;
  overallHandling: 'strong' | 'partial' | 'missed';
  stepResults: Array<{
    stepNumber: number;
    description: string;
    addressed: boolean;
    observation: string;
  }>;
  missedStepNumbers: number[];
  betterResponseExample: string;
  coachingSummary: string;
};

export type MomentCoachingResult = {
  entries: MomentCoachingEntry[];
  detectedMomentCount: number;
};

const MomentCoachingEntrySchema = z.object({
  momentType: MomentTypeSchema,
  label: z.string(),
  skillMappings: z.array(z.string()),
  customerExcerpt: z.string(),
  associateExcerpt: z.string(),
  customerTurnIndex: z.number().int(),
  associateTurnIndex: z.number().int(),
  overallHandling: z.enum(['strong', 'partial', 'missed']),
  stepResults: z.array(
    z.object({
      stepNumber: z.number().int(),
      description: z.string(),
      addressed: z.boolean(),
      observation: z.string(),
    })
  ),
  missedStepNumbers: z.array(z.number().int()),
  betterResponseExample: z.string(),
  coachingSummary: z.string(),
});

const MomentCoachingResultSchema = z.object({
  entries: z.array(MomentCoachingEntrySchema),
  detectedMomentCount: z.number().int(),
});

export function parseMomentCoachingEntries(raw: unknown): MomentCoachingResult | null {
  if (raw === null || raw === undefined) return null;
  const result = MomentCoachingResultSchema.safeParse(raw);
  return result.success ? (result.data as MomentCoachingResult) : null;
}
