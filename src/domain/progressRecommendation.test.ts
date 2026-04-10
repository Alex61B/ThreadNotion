import { describe, it, expect } from 'vitest';
import {
  pickRecommendedFocusSkills,
  buildRecommendedFocusMessage,
  buildOverallProgressSummary,
  type ProfileRow,
} from './progressRecommendation';

describe('pickRecommendedFocusSkills', () => {
  it('prefers lowest skills first, then declining, then fills from SALES_SKILLS order', () => {
    const profilesBySkill = new Map([
      ['discovery_questions', 'stable'],
      ['objection_handling', 'declining'],
      ['product_knowledge', 'stable'],
      ['closing', 'stable'],
      ['storytelling', 'stable'],
      ['empathy', 'stable'],
    ] as const);
    const out = pickRecommendedFocusSkills({
      lowestSkills: ['closing', 'empathy'],
      profilesBySkill,
      maxSkills: 3,
    });
    expect(out[0]).toBe('closing');
    expect(out[1]).toBe('empathy');
    expect(out[2]).toBe('objection_handling');
  });
});

describe('buildRecommendedFocusMessage', () => {
  it('mentions declining overlap when focus includes declining skills', () => {
    const msg = buildRecommendedFocusMessage(['closing', 'objection_handling'], ['objection_handling']);
    expect(msg).toContain('Focus next on');
    expect(msg).toContain('Objections');
    expect(msg).toMatch(/trending down/);
  });

  it('returns generic copy when focus is empty', () => {
    expect(buildRecommendedFocusMessage([], [])).toContain('Keep practicing');
  });
});

describe('buildOverallProgressSummary', () => {
  const baseProfiles = (): ProfileRow[] => [
    { skill: 'discovery_questions', currentScore: 5, trendDirection: 'improving' },
    { skill: 'objection_handling', currentScore: 5, trendDirection: 'stable' },
    { skill: 'product_knowledge', currentScore: 5, trendDirection: 'stable' },
    { skill: 'closing', currentScore: 4, trendDirection: 'stable' },
    { skill: 'storytelling', currentScore: 5, trendDirection: 'stable' },
    { skill: 'empathy', currentScore: 5, trendDirection: 'stable' },
  ];

  it('mentions two-simulation comparison when hasTwoSimulations', () => {
    const s = buildOverallProgressSummary({
      lowestSkills: ['closing'],
      profiles: baseProfiles(),
      hasTwoSimulations: true,
    });
    expect(s).toMatch(/compared to your previous graded run/i);
  });

  it('prompts for another simulation when only one graded run', () => {
    const s = buildOverallProgressSummary({
      lowestSkills: ['closing'],
      profiles: baseProfiles(),
      hasTwoSimulations: false,
    });
    expect(s).toMatch(/another graded simulation/i);
  });
});
