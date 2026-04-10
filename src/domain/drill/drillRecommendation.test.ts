import { describe, it, expect } from 'vitest';
import { suggestDrillTargetFromProgress } from './drillRecommendation';
import type { ProgressSnapshot } from '../../schemas/progressSnapshot';

function baseSnapshot(over: Partial<ProgressSnapshot>): ProgressSnapshot {
  return {
    skills: [],
    lowestSkills: [],
    recommendedFocusSkills: [],
    overallProgressSummary: '',
    ...over,
  };
}

describe('suggestDrillTargetFromProgress', () => {
  it('prefers pinned training focus', () => {
    const s = suggestDrillTargetFromProgress(baseSnapshot({}), {
      focusSkills: ['closing'],
      sessionsRemaining: 2,
    });
    expect(s.primarySkill).toBe('closing');
    expect(s.rationale).toContain('2');
    expect(s.rationale).toContain('Pinned focus');
  });

  it('notes when pinned session count is exhausted', () => {
    const s = suggestDrillTargetFromProgress(baseSnapshot({}), {
      focusSkills: ['closing'],
      sessionsRemaining: 0,
    });
    expect(s.primarySkill).toBe('closing');
    expect(s.rationale).toContain('zero');
  });

  it('uses lowest skill when no focus', () => {
    const s = suggestDrillTargetFromProgress(
      baseSnapshot({
        lowestSkills: ['empathy'],
        skills: [
          {
            skill: 'empathy',
            currentScore: 4,
            trendDirection: 'stable',
          },
        ],
      }),
      null
    );
    expect(s.primarySkill).toBe('empathy');
  });

  it('falls back to recommendedFocusSkills', () => {
    const s = suggestDrillTargetFromProgress(
      baseSnapshot({
        lowestSkills: [],
        recommendedFocusSkills: ['storytelling'],
        recommendedFocusMessage: 'Focus on storytelling.',
      }),
      null
    );
    expect(s.primarySkill).toBe('storytelling');
  });
});
