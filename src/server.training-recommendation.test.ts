import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./services/trainingOrchestrationService', () => ({
  getOrchestratedRecommendationForUser: vi.fn(),
}));

import { app } from './server';
import { getOrchestratedRecommendationForUser } from './services/trainingOrchestrationService';

const mockOrch = vi.mocked(getOrchestratedRecommendationForUser);

describe('GET /training-recommendation', () => {
  beforeEach(() => {
    mockOrch.mockReset();
  });

  it('returns 400 without userId', async () => {
    const res = await request(app).get('/training-recommendation');
    expect(res.status).toBe(400);
  });

  it('returns recommendation payload', async () => {
    mockOrch.mockResolvedValue({
      recommendedMode: 'drill',
      targetSkills: ['objection_handling'],
      rationale: 'Manager assigned (Team A): focused Objections drill.',
      difficultyLevel: 'hard',
      source: 'manager_assignment',
      confidence: 'high',
      sourceFactors: ['Manager assignment', 'Team A'],
    });

    const res = await request(app).get('/training-recommendation').query({ userId: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.recommendation.recommendedMode).toBe('drill');
    expect(res.body.recommendation.targetSkills).toEqual(['objection_handling']);
    expect(mockOrch).toHaveBeenCalledWith('u1');
  });
});
