import { z } from 'zod';
import { SalesSkillSchema } from './coaching';
import { SimulationModeRecommendationSchema, ConfidenceSchema } from './trainingRecommendation';
import type { TrainingRecommendation } from './trainingRecommendation';

export const OrchestrationSourceSchema = z.enum([
  'manager_assignment',
  'training_focus',
  'weakness_engine',
  'spaced_repetition',
  'mastery_adjustment',
  'generic_fallback',
]);

export type OrchestrationSource = z.infer<typeof OrchestrationSourceSchema>;

export const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard']);

export const OrchestratedTrainingRecommendationSchema = z.object({
  recommendedMode: SimulationModeRecommendationSchema,
  targetSkills: z.array(SalesSkillSchema),
  rationale: z.string().min(1),
  difficultyLevel: DifficultyLevelSchema.optional(),
  source: OrchestrationSourceSchema.optional(),
  confidence: ConfidenceSchema.optional(),
  sourceFactors: z.array(z.string()).default([]),
});

export type OrchestratedTrainingRecommendation = z.infer<typeof OrchestratedTrainingRecommendationSchema>;

export function toLegacyTrainingRecommendation(
  orch: OrchestratedTrainingRecommendation
): TrainingRecommendation {
  return {
    recommendedMode: orch.recommendedMode,
    primarySkill: orch.targetSkills[0],
    secondarySkill: orch.targetSkills[1],
    rationale: orch.rationale,
    confidence: orch.confidence,
    sourceFactors: orch.sourceFactors ?? [],
  };
}
