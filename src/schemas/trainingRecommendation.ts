import { z } from 'zod';
import { SalesSkillSchema } from './coaching';

export const SimulationModeRecommendationSchema = z.enum(['generic', 'adaptive', 'drill']);

export const ConfidenceSchema = z.enum(['high', 'medium', 'low']);

export const TrainingRecommendationSchema = z.object({
  recommendedMode: SimulationModeRecommendationSchema,
  primarySkill: SalesSkillSchema.optional(),
  secondarySkill: SalesSkillSchema.optional(),
  rationale: z.string().min(1),
  confidence: ConfidenceSchema.optional(),
  sourceFactors: z.array(z.string()).default([]),
});

export type TrainingRecommendation = z.infer<typeof TrainingRecommendationSchema>;
