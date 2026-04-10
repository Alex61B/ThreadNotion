import { z } from 'zod';
import { SalesSkillSchema } from './coaching';

export const TeamSkillAnalyticsSchema = z.object({
  skill: SalesSkillSchema,
  averageScore: z.number(),
  weakestUsers: z.array(z.string()),
  strongestUsers: z.array(z.string()),
});

export const TeamAnalyticsSchema = z.object({
  skills: z.array(TeamSkillAnalyticsSchema),
  teamWeakestSkill: SalesSkillSchema.optional(),
  teamStrongestSkill: SalesSkillSchema.optional(),
  averageProgress: z.number().optional(),
  totalSessions: z.number().int().min(0),
});

export type TeamSkillAnalytics = z.infer<typeof TeamSkillAnalyticsSchema>;
export type TeamAnalytics = z.infer<typeof TeamAnalyticsSchema>;

export const CreateTeamBodySchema = z.object({
  name: z.string().min(1).max(200),
  userId: z.string().min(1),
});

export const AddTeamMemberBodySchema = z.object({
  memberUserId: z.string().min(1),
  role: z.enum(['manager', 'rep']).optional(),
  displayName: z.string().max(200).optional(),
});

export const CreateAssignmentBodySchema = z.object({
  skill: SalesSkillSchema,
  assignmentType: z.enum(['drill', 'adaptive']),
  targetUserId: z.string().min(1).optional(),
  userId: z.string().min(1),
});
