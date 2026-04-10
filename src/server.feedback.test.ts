import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { EvaluationError } from './errors/evaluationErrors';
import { SalesEvaluationLLMSchema } from './schemas/coaching';
import { validEvaluatorOutput } from './test-helpers/evaluationFixtures';

vi.mock('./services/simulationEvaluationService', () => ({
  evaluateConversation: vi.fn(),
  getEvaluationForConversation: vi.fn(),
}));

vi.mock('./services/trainingRecommendationService', () => ({
  buildTrainingRecommendationBundle: vi.fn(),
}));

vi.mock('./services/userTrainingFocusService', () => ({
  decrementTrainingFocusSessionIfAny: vi.fn().mockResolvedValue(undefined),
  clearTrainingFocus: vi.fn(),
  getTrainingFocusForUser: vi.fn(),
  upsertTrainingFocus: vi.fn(),
}));

import { app } from './server';
import { evaluateConversation } from './services/simulationEvaluationService';
import { buildTrainingRecommendationBundle } from './services/trainingRecommendationService';
import { decrementTrainingFocusSessionIfAny } from './services/userTrainingFocusService';

const mockEvaluate = vi.mocked(evaluateConversation);
const mockBuildBundle = vi.mocked(buildTrainingRecommendationBundle);
const mockDecrementFocus = vi.mocked(decrementTrainingFocusSessionIfAny);

function coachingResult() {
  const raw = validEvaluatorOutput();
  return {
    conversationId: 'c1',
    summary: {
      id: 'sid',
      conversationId: 'c1',
      userId: null as string | null,
      questionCount: 1,
      avgMessageLength: 10,
      talkRatio: 0.5,
      weaknesses: ['closing'],
      recommendedTips: ['tip'],
      rawEvaluatorOutput: raw as object,
      createdAt: new Date(),
    },
    skillScores: [
      {
        id: 'sc1',
        skill: 'closing' as const,
        score: 5,
        reasoning: 'r',
        createdAt: new Date(),
      },
    ],
    weaknessProfile: [] as [],
  };
}

const minimalProgressSnapshot = {
  skills: [],
  lowestSkills: [] as const,
  recommendedFocusSkills: [] as const,
  overallProgressSummary: 'Summary.',
};

const minimalBundle = {
  progressSnapshot: minimalProgressSnapshot,
  trainingRecommendation: {
    recommendedMode: 'generic' as const,
    rationale: 'Test.',
    sourceFactors: [] as string[],
  },
  drillSuggestion: { primarySkill: 'closing' as const, rationale: 'Drill.' },
  trainingFocusRow: null,
  orchestratedRecommendation: {
    recommendedMode: 'generic' as const,
    targetSkills: [] as const,
    rationale: 'Test.',
    source: 'generic_fallback' as const,
    sourceFactors: [] as string[],
  },
};

describe('POST /feedback', () => {
  beforeEach(() => {
    mockEvaluate.mockReset();
    mockBuildBundle.mockReset();
    mockDecrementFocus.mockClear();
  });

  it('returns 200 with coachingEvaluation payload', async () => {
    mockEvaluate.mockResolvedValue(coachingResult() as any);
    const res = await request(app).post('/feedback').send({ conversationId: 'c1' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.coachingEvaluation.conversationId).toBe('c1');
    expect(res.body.coachingEvaluation.skillScores).toHaveLength(1);
    expect(res.body.coachingEvaluation.summary.coachingFeedback?.overallCoachingSummary).toBeDefined();
    expect(mockBuildBundle).not.toHaveBeenCalled();
    expect(mockDecrementFocus).not.toHaveBeenCalled();
    expect(res.body.progressSnapshot).toBeUndefined();
  });

  it('includes progressSnapshot when evaluation summary has userId', async () => {
    mockEvaluate.mockResolvedValue({
      ...coachingResult(),
      summary: { ...coachingResult().summary, userId: 'user-1' },
    } as any);
    mockBuildBundle.mockResolvedValue(minimalBundle as any);
    const res = await request(app).post('/feedback').send({ conversationId: 'c1' });
    expect(res.status).toBe(200);
    expect(mockBuildBundle).toHaveBeenCalledWith('user-1');
    expect(res.body.progressSnapshot).toEqual(minimalProgressSnapshot);
    expect(res.body.trainingRecommendation).toEqual(minimalBundle.trainingRecommendation);
    expect(res.body.drillSuggestion).toEqual(minimalBundle.drillSuggestion);
    expect(res.body.orchestratedRecommendation).toEqual(minimalBundle.orchestratedRecommendation);
    expect(mockDecrementFocus).toHaveBeenCalledWith('user-1');
  });

  it('returns 404 when conversation is not found', async () => {
    mockEvaluate.mockRejectedValue(new Error('conversation not found'));
    const res = await request(app).post('/feedback').send({ conversationId: 'missing' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('conversation not found');
  });

  it('returns 400 when body validation fails (missing conversationId)', async () => {
    const res = await request(app).post('/feedback').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 evaluator_malformed_json for EVALUATOR_PARSE', async () => {
    mockEvaluate.mockRejectedValue(
      new EvaluationError('Evaluator returned malformed JSON', 'EVALUATOR_PARSE')
    );
    const res = await request(app).post('/feedback').send({ conversationId: 'c1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('evaluator_malformed_json');
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 evaluator_validation_failed with details for EVALUATOR_VALIDATION', async () => {
    const fail = SalesEvaluationLLMSchema.safeParse({ invalid: true });
    expect(fail.success).toBe(false);
    if (fail.success) throw new Error('expected parse fail');
    mockEvaluate.mockRejectedValue(
      new EvaluationError('Evaluator output failed validation', 'EVALUATOR_VALIDATION', fail.error)
    );
    const res = await request(app).post('/feedback').send({ conversationId: 'c1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('evaluator_validation_failed');
    expect(res.body.details).toBeDefined();
  });

  it('returns 200 with empty weaknessProfile when conversation has no user linkage', async () => {
    mockEvaluate.mockResolvedValue({
      ...coachingResult(),
      weaknessProfile: [],
    } as any);
    const res = await request(app).post('/feedback').send({ conversationId: 'c1' });
    expect(res.status).toBe(200);
    expect(res.body.coachingEvaluation.weaknessProfile).toEqual([]);
  });
});
