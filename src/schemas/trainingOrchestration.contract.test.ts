import { describe, it, expect } from 'vitest';
import {
  OrchestratedTrainingRecommendationSchema,
  toLegacyTrainingRecommendation,
} from './trainingOrchestration';

describe('trainingOrchestration contract', () => {
  it('OrchestratedTrainingRecommendationSchema accepts full payload', () => {
    const row = {
      recommendedMode: 'drill' as const,
      targetSkills: ['closing' as const, 'empathy' as const],
      rationale: 'Practice.',
      difficultyLevel: 'medium' as const,
      source: 'weakness_engine' as const,
      confidence: 'high' as const,
      sourceFactors: ['A', 'B'],
    };
    const p = OrchestratedTrainingRecommendationSchema.safeParse(row);
    expect(p.success).toBe(true);
  });

  it('toLegacyTrainingRecommendation maps targetSkills to primary and secondary', () => {
    const orch = {
      recommendedMode: 'adaptive' as const,
      targetSkills: ['objection_handling' as const, 'closing' as const],
      rationale: 'R',
      sourceFactors: ['x'],
    };
    const legacy = toLegacyTrainingRecommendation(orch);
    expect(legacy.recommendedMode).toBe('adaptive');
    expect(legacy.primarySkill).toBe('objection_handling');
    expect(legacy.secondarySkill).toBe('closing');
    expect(legacy.rationale).toBe('R');
    expect(legacy.sourceFactors).toEqual(['x']);
  });

  it('toLegacy omits secondary when only one target skill', () => {
    const legacy = toLegacyTrainingRecommendation({
      recommendedMode: 'generic',
      targetSkills: [],
      rationale: 'Balanced.',
      sourceFactors: [],
    });
    expect(legacy.primarySkill).toBeUndefined();
    expect(legacy.secondarySkill).toBeUndefined();
  });
});
