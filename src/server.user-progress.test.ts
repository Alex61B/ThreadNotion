import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./services/trainingRecommendationService', () => ({
  buildTrainingRecommendationBundle: vi.fn(),
}));

import { app } from './server';
import { buildTrainingRecommendationBundle } from './services/trainingRecommendationService';

const mockBundle = vi.mocked(buildTrainingRecommendationBundle);

const minimalProgressSnapshot = {
  skills: [],
  lowestSkills: [] as const,
  recommendedFocusSkills: [] as const,
  overallProgressSummary: 'Summary.',
};

describe('GET /user-progress', () => {
  beforeEach(() => {
    mockBundle.mockReset();
  });

  it('returns trainingRecommendation and drillSuggestion', async () => {
    mockBundle.mockResolvedValue({
      progressSnapshot: minimalProgressSnapshot,
      trainingRecommendation: {
        recommendedMode: 'adaptive' as const,
        primarySkill: 'closing' as const,
        rationale: 'Next.',
        sourceFactors: ['Profile weaknesses'],
      },
      drillSuggestion: { primarySkill: 'closing' as const, rationale: 'Practice.' },
      trainingFocusRow: null,
      orchestratedRecommendation: {
        recommendedMode: 'adaptive' as const,
        targetSkills: ['closing' as const],
        rationale: 'Next.',
        source: 'weakness_engine',
        sourceFactors: ['Profile weaknesses'],
      },
    } as any);

    const res = await request(app).get('/user-progress').query({ userId: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.progressSnapshot).toEqual(minimalProgressSnapshot);
    expect(res.body.trainingRecommendation.recommendedMode).toBe('adaptive');
    expect(res.body.drillSuggestion.primarySkill).toBe('closing');
    expect(res.body.orchestratedRecommendation?.targetSkills).toEqual(['closing']);
  });

  it('returns 400 without userId', async () => {
    const res = await request(app).get('/user-progress');
    expect(res.status).toBe(400);
  });

  it('omits orchestratedRecommendation when bundle has no field (backward compatible)', async () => {
    mockBundle.mockResolvedValue({
      progressSnapshot: minimalProgressSnapshot,
      trainingRecommendation: {
        recommendedMode: 'generic' as const,
        rationale: 'Legacy.',
        sourceFactors: [],
      },
      drillSuggestion: { primarySkill: 'closing' as const, rationale: 'D.' },
      trainingFocusRow: null,
    } as any);

    const res = await request(app).get('/user-progress').query({ userId: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body.orchestratedRecommendation).toBeUndefined();
    expect(res.body.trainingRecommendation.rationale).toBe('Legacy.');
  });
});
