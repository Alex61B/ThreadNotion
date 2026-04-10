import { describe, it, expect } from 'vitest';
import { TrainingAnalyticsSchema } from './trainingAnalytics';

/** Shapes the Roleplay TrainingInsightsSection tolerates (optional fields omitted). */
describe('TrainingAnalyticsSchema UI-safe payloads', () => {
  it('accepts empty analytics with modes and no notables', () => {
    const data = {
      skills: [],
      modes: [
        { mode: 'generic' as const, sessionCount: 0 },
        { mode: 'adaptive' as const, sessionCount: 0 },
        { mode: 'drill' as const, sessionCount: 0 },
      ],
      sessionsAnalyzed: 0,
    };
    const parsed = TrainingAnalyticsSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.strongestSkill).toBeUndefined();
      expect(parsed.data.skills).toEqual([]);
    }
  });

  it('accepts per-skill rows without trendScores or lastSeenWeakness', () => {
    const data = {
      skills: [
        {
          skill: 'closing' as const,
          averageScore: 6.2,
          recentAverageScore: 6,
          improvementRate: 0,
          weaknessFrequency: 0.25,
        },
      ],
      modes: [
        { mode: 'generic' as const, sessionCount: 1, averageScoreImprovement: undefined },
        { mode: 'adaptive' as const, sessionCount: 0 },
        { mode: 'drill' as const, sessionCount: 0 },
      ],
      sessionsAnalyzed: 1,
      strongestSkill: 'closing' as const,
    };
    const parsed = TrainingAnalyticsSchema.safeParse(data);
    expect(parsed.success).toBe(true);
  });

  it('accepts modes without averageScoreImprovement (next-session delta absent)', () => {
    const data = {
      skills: [],
      modes: [
        { mode: 'generic' as const, sessionCount: 1 },
        { mode: 'adaptive' as const, sessionCount: 0 },
        { mode: 'drill' as const, sessionCount: 0 },
      ],
      sessionsAnalyzed: 1,
    };
    expect(TrainingAnalyticsSchema.safeParse(data).success).toBe(true);
  });
});
