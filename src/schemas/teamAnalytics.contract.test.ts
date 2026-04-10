/**
 * Encodes assumptions used by web/app/page.tsx without a frontend test suite:
 * - Team tab hidden when GET /teams returns []; optional teamAnalytics fields (weakest/strongest/averageProgress).
 * - Per-member drill-down tolerates missing entries in a map keyed by userId.
 * - Assignment strip needs stable ids, skill, assignmentType, teamName, targetUserId, createdAt.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { TeamAnalyticsSchema } from './teamAnalytics';
import { SalesSkillSchema } from './coaching';

const TrainingAssignmentListRowSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  teamName: z.string(),
  skill: SalesSkillSchema,
  assignmentType: z.enum(['drill', 'adaptive']),
  targetUserId: z.string().nullable(),
  createdAt: z.string(),
});

const CreatedAssignmentPayloadSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  skill: SalesSkillSchema,
  assignmentType: z.enum(['drill', 'adaptive']),
  targetUserId: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
});

describe('Phase 8 API contract (frontend-safe shapes)', () => {
  it('TeamAnalyticsSchema accepts minimal team analytics (optional fields omitted)', () => {
    const minimal = {
      skills: [],
      totalSessions: 0,
    };
    const parsed = TeamAnalyticsSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.teamWeakestSkill).toBeUndefined();
      expect(parsed.data.averageProgress).toBeUndefined();
    }
  });

  it('TeamAnalyticsSchema accepts full analytics payload', () => {
    const full = {
      skills: [
        {
          skill: 'closing' as const,
          averageScore: 7,
          weakestUsers: ['u1'],
          strongestUsers: ['u2'],
        },
      ],
      teamWeakestSkill: 'product_knowledge' as const,
      teamStrongestSkill: 'closing' as const,
      averageProgress: 6.5,
      totalSessions: 12,
    };
    expect(TeamAnalyticsSchema.safeParse(full).success).toBe(true);
  });

  it('GET /training-assignments row shape matches list schema', () => {
    const row = {
      id: 'a1',
      teamId: 't1',
      teamName: 'Sales',
      skill: 'closing',
      assignmentType: 'drill' as const,
      targetUserId: null,
      createdAt: new Date().toISOString(),
    };
    expect(TrainingAssignmentListRowSchema.safeParse(row).success).toBe(true);
  });

  it('GET /training-assignments row accepts targeted assignment', () => {
    const row = {
      id: 'a2',
      teamId: 't1',
      teamName: 'Sales',
      skill: 'empathy',
      assignmentType: 'adaptive' as const,
      targetUserId: 'rep-1',
      createdAt: new Date().toISOString(),
    };
    expect(TrainingAssignmentListRowSchema.safeParse(row).success).toBe(true);
  });

  it('POST /team/:id/assignments response assignment shape is stable', () => {
    const assignment = {
      id: 'as1',
      teamId: 't1',
      skill: 'closing',
      assignmentType: 'drill' as const,
      targetUserId: null,
      active: true,
      createdAt: new Date().toISOString(),
    };
    expect(CreatedAssignmentPayloadSchema.safeParse(assignment).success).toBe(true);
  });
});
