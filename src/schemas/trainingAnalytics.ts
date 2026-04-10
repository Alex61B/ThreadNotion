import { z } from 'zod';
import { SalesSkillSchema } from './coaching';

export const SimulationModeAnalyticsSchema = z.enum(['generic', 'adaptive', 'drill']);

export const SkillAnalyticsSchema = z.object({
  skill: SalesSkillSchema,
  averageScore: z.number(),
  recentAverageScore: z.number(),
  improvementRate: z.number(),
  weaknessFrequency: z.number(),
  /** Sessions since this skill was in the bottom tier (0 = most recent graded run). */
  lastSeenWeakness: z.number().optional(),
  /** Last few session scores for this skill (for sparkline), oldest→newest within window. */
  trendScores: z.array(z.number()).optional(),
});

export const ModeAnalyticsSchema = z.object({
  mode: SimulationModeAnalyticsSchema,
  sessionCount: z.number().int().min(0),
  averageScoreImprovement: z.number().optional(),
});

export const TrainingAnalyticsSchema = z.object({
  skills: z.array(SkillAnalyticsSchema),
  modes: z.array(ModeAnalyticsSchema),
  strongestSkill: SalesSkillSchema.optional(),
  weakestSkill: SalesSkillSchema.optional(),
  mostImprovedSkill: SalesSkillSchema.optional(),
  persistentWeakness: SalesSkillSchema.optional(),
  sessionsAnalyzed: z.number().int().min(0),
});

export type SkillAnalytics = z.infer<typeof SkillAnalyticsSchema>;
export type ModeAnalytics = z.infer<typeof ModeAnalyticsSchema>;
export type TrainingAnalytics = z.infer<typeof TrainingAnalyticsSchema>;
