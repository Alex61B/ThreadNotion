import { z } from 'zod';
import { SalesSkillSchema } from './coaching';

export const TrendDirectionSchema = z.enum(['improving', 'declining', 'stable']);

export const SkillProgressSchema = z.object({
  skill: SalesSkillSchema,
  currentScore: z.number(),
  trendDirection: TrendDirectionSchema,
  latestSimulationScore: z.number().int().min(1).max(10).optional(),
  previousSimulationScore: z.number().int().min(1).max(10).optional(),
  /** Latest minus previous simulation score, only when both exist. */
  latestDelta: z.number().optional(),
});

export type SkillProgress = z.infer<typeof SkillProgressSchema>;

export const ProgressSnapshotSchema = z.object({
  skills: z.array(SkillProgressSchema),
  lowestSkills: z.array(SalesSkillSchema),
  recommendedFocusSkills: z.array(SalesSkillSchema),
  recommendedFocusMessage: z.string().optional(),
  overallProgressSummary: z.string(),
});

export type ProgressSnapshot = z.infer<typeof ProgressSnapshotSchema>;
