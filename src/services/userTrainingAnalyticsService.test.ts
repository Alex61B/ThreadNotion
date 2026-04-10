import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SALES_SKILLS, type SalesSkill } from '../schemas/coaching';
import { TrainingAnalyticsSchema } from '../schemas/trainingAnalytics';
import { computeTrainingAnalyticsFromSessions, buildUserTrainingAnalytics } from './userTrainingAnalyticsService';
import type { GradedSessionScores } from '../domain/trainingAnalytics/types';

vi.mock('../db', () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../db';

const mockFindMany = vi.mocked(prisma.conversation.findMany);

function fullScores(overrides: Partial<Record<SalesSkill, number>>): Record<SalesSkill, number> {
  const out = {} as Record<SalesSkill, number>;
  for (const s of SALES_SKILLS) {
    out[s] = overrides[s] ?? 6;
  }
  return out;
}

function skillScoreRows(
  conversationId: string,
  scores: Record<SalesSkill, number>
): Array<{ skill: SalesSkill; score: number }> {
  return SALES_SKILLS.map((skill) => ({ skill, score: scores[skill]! }));
}

describe('computeTrainingAnalyticsFromSessions', () => {
  it('returns empty skills and zero sessions when no graded runs', () => {
    const a = computeTrainingAnalyticsFromSessions([]);
    expect(a.sessionsAnalyzed).toBe(0);
    expect(a.skills).toEqual([]);
    expect(a.modes.every((m) => m.sessionCount === 0)).toBe(true);
    expect(TrainingAnalyticsSchema.safeParse(a).success).toBe(true);
    expect(a.strongestSkill).toBeUndefined();
  });

  it('includes notables for non-empty history', () => {
    const s: GradedSessionScores = {
      conversationId: 'c1',
      gradedAt: '2025-01-01T12:00:00.000Z',
      mode: 'generic',
      scores: fullScores({ discovery_questions: 9, empathy: 2 }),
    };
    const a = computeTrainingAnalyticsFromSessions([s]);
    expect(a.sessionsAnalyzed).toBe(1);
    expect(a.strongestSkill).toBeDefined();
    expect(a.weakestSkill).toBeDefined();
    expect(TrainingAnalyticsSchema.safeParse(a).success).toBe(true);
  });

  it('Zod validates output for exactly one session', () => {
    const s: GradedSessionScores = {
      conversationId: 'c1',
      gradedAt: '2025-01-01T12:00:00.000Z',
      mode: 'drill',
      scores: fullScores({}),
    };
    const a = computeTrainingAnalyticsFromSessions([s]);
    expect(a.sessionsAnalyzed).toBe(1);
    expect(a.skills).toHaveLength(6);
    expect(TrainingAnalyticsSchema.safeParse(a).success).toBe(true);
  });
});

describe('buildUserTrainingAnalytics', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it('returns empty analytics when there are no graded conversations', async () => {
    mockFindMany.mockResolvedValue([]);
    const a = await buildUserTrainingAnalytics('user-1');
    expect(a.sessionsAnalyzed).toBe(0);
    expect(a.skills).toEqual([]);
    expect(TrainingAnalyticsSchema.safeParse(a).success).toBe(true);
  });

  it('skips conversations missing any of the six skill score rows', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'bad',
        createdAt: new Date('2025-01-01'),
        simulationMode: 'generic',
        evaluationSummary: { createdAt: new Date('2025-01-01') },
        skillScores: skillScoreRows('bad', fullScores({})).slice(0, 5),
      },
      {
        id: 'good',
        createdAt: new Date('2025-01-02'),
        simulationMode: 'adaptive',
        evaluationSummary: { createdAt: new Date('2025-01-02') },
        skillScores: skillScoreRows('good', fullScores({ discovery_questions: 3 })),
      },
    ] as any);

    const a = await buildUserTrainingAnalytics('user-1');
    expect(a.sessionsAnalyzed).toBe(1);
    expect(a.modes.find((m) => m.mode === 'adaptive')?.sessionCount).toBe(1);
    expect(TrainingAnalyticsSchema.safeParse(a).success).toBe(true);
  });

  it('orders sessions by evaluationSummary.createdAt when building rows', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'second',
        createdAt: new Date('2025-01-05'),
        simulationMode: 'generic',
        evaluationSummary: { createdAt: new Date('2025-01-02') },
        skillScores: skillScoreRows('second', fullScores({ closing: 8 })),
      },
      {
        id: 'first',
        createdAt: new Date('2025-01-01'),
        simulationMode: 'generic',
        evaluationSummary: { createdAt: new Date('2025-01-01') },
        skillScores: skillScoreRows('first', fullScores({ closing: 4 })),
      },
    ] as any);

    const a = await buildUserTrainingAnalytics('user-1');
    expect(a.sessionsAnalyzed).toBe(2);
    const closing = a.skills.find((s) => s.skill === 'closing')!;
    expect(closing.trendScores).toEqual([4, 8]);
  });

  it('falls back to empty analytics on prisma failure without throwing', async () => {
    mockFindMany.mockRejectedValue(new Error('db down'));
    const a = await buildUserTrainingAnalytics('user-1');
    expect(a.sessionsAnalyzed).toBe(0);
    expect(a.skills).toEqual([]);
    expect(TrainingAnalyticsSchema.safeParse(a).success).toBe(true);
  });
});
