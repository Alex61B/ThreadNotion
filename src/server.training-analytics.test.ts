import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./services/userTrainingAnalyticsService', () => ({
  buildUserTrainingAnalytics: vi.fn(),
}));

import { app } from './server';
import { buildUserTrainingAnalytics } from './services/userTrainingAnalyticsService';

const mockBuild = vi.mocked(buildUserTrainingAnalytics);

describe('GET /user-training-analytics', () => {
  beforeEach(() => {
    mockBuild.mockReset();
  });

  it('returns analytics payload', async () => {
    mockBuild.mockResolvedValue({
      skills: [],
      modes: [
        { mode: 'generic', sessionCount: 0 },
        { mode: 'adaptive', sessionCount: 0 },
        { mode: 'drill', sessionCount: 0 },
      ],
      sessionsAnalyzed: 0,
    });

    const res = await request(app).get('/user-training-analytics').query({ userId: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.analytics.sessionsAnalyzed).toBe(0);
  });

  it('returns 400 without userId', async () => {
    const res = await request(app).get('/user-training-analytics');
    expect(res.status).toBe(400);
  });

  it('returns stable JSON shape when analytics omits optional notables and mode deltas', async () => {
    mockBuild.mockResolvedValue({
      skills: [
        {
          skill: 'empathy',
          averageScore: 5,
          recentAverageScore: 5,
          improvementRate: 0,
          weaknessFrequency: 0,
        },
      ],
      modes: [
        { mode: 'generic', sessionCount: 1 },
        { mode: 'adaptive', sessionCount: 0 },
        { mode: 'drill', sessionCount: 0 },
      ],
      sessionsAnalyzed: 1,
    } as any);

    const res = await request(app).get('/user-training-analytics').query({ userId: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.analytics.sessionsAnalyzed).toBe(1);
    expect(Array.isArray(res.body.analytics.skills)).toBe(true);
    expect(Array.isArray(res.body.analytics.modes)).toBe(true);
    expect(res.body.analytics.skills[0].trendScores).toBeUndefined();
    expect(res.body.analytics.modes[0].averageScoreImprovement).toBeUndefined();
  });
});
