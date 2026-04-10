import { describe, it, expect, vi } from 'vitest';

vi.mock('./userProgressService', () => ({
  buildProgressSnapshot: vi.fn(),
}));

vi.mock('./userTrainingFocusService', () => ({
  getTrainingFocusForUser: vi.fn(),
}));

vi.mock('./recentTrainingContextService', () => ({
  loadRecentGradedSessions: vi.fn(),
}));

vi.mock('./trainingAssignmentService', () => ({
  listActiveAssignmentsForUser: vi.fn().mockResolvedValue([]),
}));

import { toLegacyTrainingRecommendation } from '../schemas/trainingOrchestration';
import { buildTrainingRecommendationBundle } from './trainingRecommendationService';
import { buildProgressSnapshot } from './userProgressService';
import { getTrainingFocusForUser } from './userTrainingFocusService';
import { loadRecentGradedSessions } from './recentTrainingContextService';

const mockProgress = vi.mocked(buildProgressSnapshot);
const mockFocus = vi.mocked(getTrainingFocusForUser);
const mockRecent = vi.mocked(loadRecentGradedSessions);

describe('buildTrainingRecommendationBundle', () => {
  it('returns stable bundle shape with trainingFocusRow and drillSuggestion', async () => {
    mockProgress.mockResolvedValue({
      skills: [
        { skill: 'closing', currentScore: 4, trendDirection: 'stable' },
        { skill: 'empathy', currentScore: 6, trendDirection: 'stable' },
      ],
      lowestSkills: ['closing'],
      recommendedFocusSkills: ['closing'],
      overallProgressSummary: 'Summary.',
    } as any);
    mockFocus.mockResolvedValue({
      userId: 'u1',
      focusSkills: ['empathy'],
      sessionsRemaining: 2,
      source: 'user',
      updatedAt: new Date(),
    } as any);
    mockRecent.mockResolvedValue([
      {
        conversationId: 'c1',
        createdAt: new Date(),
        simulationMode: 'generic',
        adaptiveTargetWeaknesses: [],
      },
    ] as any);

    const bundle = await buildTrainingRecommendationBundle('u1');
    expect(bundle.progressSnapshot).toBeDefined();
    expect(bundle.trainingRecommendation).toBeDefined();
    expect(bundle.orchestratedRecommendation).toBeDefined();
    expect(bundle.orchestratedRecommendation.targetSkills.length).toBeGreaterThan(0);
    expect(bundle.drillSuggestion).toBeDefined();
    expect(bundle.trainingFocusRow?.focusSkills[0]).toBe('empathy');
    const mapped = toLegacyTrainingRecommendation(bundle.orchestratedRecommendation);
    expect(mapped.recommendedMode).toBe(bundle.trainingRecommendation.recommendedMode);
    expect(mapped.primarySkill).toBe(bundle.trainingRecommendation.primarySkill);
    expect(mapped.secondarySkill).toBe(bundle.trainingRecommendation.secondarySkill);
    expect(mapped.rationale).toBe(bundle.trainingRecommendation.rationale);
    if (bundle.trainingRecommendation.recommendedMode === 'drill') {
      expect(bundle.drillSuggestion.primarySkill).toBe(bundle.trainingRecommendation.primarySkill);
    }
  });

  it('works with no focus row and no recent sessions', async () => {
    mockProgress.mockResolvedValue({
      skills: [{ skill: 'closing', currentScore: 4, trendDirection: 'declining', latestDelta: -1 }],
      lowestSkills: ['closing'],
      recommendedFocusSkills: ['closing'],
      overallProgressSummary: 'Summary.',
    } as any);
    mockFocus.mockResolvedValue(null as any);
    mockRecent.mockResolvedValue([] as any);

    const bundle = await buildTrainingRecommendationBundle('u1');
    expect(bundle.trainingRecommendation.recommendedMode).toMatch(/generic|adaptive|drill/);
    expect(bundle.drillSuggestion.primarySkill).toBeDefined();
  });
});

