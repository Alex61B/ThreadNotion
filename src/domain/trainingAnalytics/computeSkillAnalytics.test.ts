import { describe, it, expect } from 'vitest';
import { SALES_SKILLS, type SalesSkill } from '../../schemas/coaching';
import { bottomTierSkillsForSession, computeSkillAnalytics } from './computeSkillAnalytics';
import type { GradedSessionScores } from './types';

function fullScores(overrides: Partial<Record<SalesSkill, number>>): Record<SalesSkill, number> {
  const out = {} as Record<SalesSkill, number>;
  for (const s of SALES_SKILLS) {
    out[s] = overrides[s] ?? 7;
  }
  return out;
}

function makeSession(
  id: string,
  mode: GradedSessionScores['mode'],
  overrides: Partial<Record<SalesSkill, number>>,
  gradedAt: string
): GradedSessionScores {
  return {
    conversationId: id,
    gradedAt,
    mode,
    scores: fullScores(overrides),
  };
}

describe('bottomTierSkillsForSession', () => {
  it('picks lowest two by score; tie-breaks by lower enum index first', () => {
    const scores = fullScores({
      discovery_questions: 5,
      objection_handling: 5,
      product_knowledge: 6,
      closing: 6,
      storytelling: 6,
      empathy: 6,
    });
    const bottom = bottomTierSkillsForSession(scores);
    expect(bottom).toEqual(['discovery_questions', 'objection_handling']);
  });

  it('uses distinct lowest scores when clear', () => {
    const scores = fullScores({
      discovery_questions: 2,
      objection_handling: 3,
      product_knowledge: 9,
      closing: 9,
      storytelling: 9,
      empathy: 9,
    });
    expect(bottomTierSkillsForSession(scores)).toEqual(['discovery_questions', 'objection_handling']);
  });

  it('when three skills tie for lowest score, bottom-2 uses enum order (first two)', () => {
    const scores = fullScores({
      discovery_questions: 1,
      objection_handling: 1,
      product_knowledge: 1,
      closing: 9,
      storytelling: 9,
      empathy: 9,
    });
    expect(bottomTierSkillsForSession(scores)).toEqual(['discovery_questions', 'objection_handling']);
  });
});

describe('computeSkillAnalytics', () => {
  it('returns empty array when no sessions', () => {
    expect(computeSkillAnalytics([])).toEqual([]);
  });

  it('computes averages and improvement rate from early vs recent windows', () => {
    const sessions: GradedSessionScores[] = [];
    for (let i = 0; i < 7; i++) {
      const disc = i < 3 ? 5 : 8;
      sessions.push(
        makeSession(
          `c${i}`,
          'generic',
          { discovery_questions: disc },
          `2025-01-0${i + 1}T12:00:00.000Z`
        )
      );
    }
    const disc = computeSkillAnalytics(sessions).find((s) => s.skill === 'discovery_questions')!;
    expect(disc.averageScore).toBeCloseTo((3 * 5 + 4 * 8) / 7, 5);
    expect(disc.recentAverageScore).toBe(8);
    expect(disc.improvementRate).toBeCloseTo(3, 5);
  });

  it('computes weakness frequency for bottom-tier membership', () => {
    const s1 = makeSession('a', 'generic', { discovery_questions: 2 }, '2025-01-01T12:00:00.000Z');
    const s2 = makeSession('b', 'generic', { discovery_questions: 9 }, '2025-01-02T12:00:00.000Z');
    const disc = computeSkillAnalytics([s1, s2]).find((x) => x.skill === 'discovery_questions')!;
    expect(disc.weaknessFrequency).toBe(0.5);
  });

  it('sets lastSeenWeakness to 0 when weak in latest session', () => {
    const s1 = makeSession('a', 'generic', { discovery_questions: 9 }, '2025-01-01T12:00:00.000Z');
    const s2 = makeSession('b', 'generic', { discovery_questions: 1 }, '2025-01-02T12:00:00.000Z');
    const disc = computeSkillAnalytics([s1, s2]).find((x) => x.skill === 'discovery_questions')!;
    expect(disc.lastSeenWeakness).toBe(0);
  });

  it('sets lastSeenWeakness to sessions since last weak appearance', () => {
    const s1 = makeSession('a', 'generic', { discovery_questions: 1 }, '2025-01-01T12:00:00.000Z');
    const s2 = makeSession('b', 'generic', { discovery_questions: 9 }, '2025-01-02T12:00:00.000Z');
    const s3 = makeSession('c', 'generic', { discovery_questions: 9 }, '2025-01-03T12:00:00.000Z');
    const disc = computeSkillAnalytics([s1, s2, s3]).find((x) => x.skill === 'discovery_questions')!;
    expect(disc.lastSeenWeakness).toBe(2);
  });

  it('includes trendScores capped to last 8 sessions', () => {
    const sessions: GradedSessionScores[] = [];
    for (let i = 0; i < 10; i++) {
      sessions.push(
        makeSession(`x${i}`, 'generic', { empathy: i + 1 }, `2025-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`)
      );
    }
    const emp = computeSkillAnalytics(sessions).find((s) => s.skill === 'empathy')!;
    expect(emp.trendScores?.length).toBe(8);
    expect(emp.trendScores?.[0]).toBe(3);
    expect(emp.trendScores?.[7]).toBe(10);
  });

  it('with exactly 1 session: avg equals recent, improvement 0, trend is single point', () => {
    const s = makeSession('only', 'generic', { discovery_questions: 6 }, '2025-01-01T12:00:00.000Z');
    const disc = computeSkillAnalytics([s]).find((x) => x.skill === 'discovery_questions')!;
    expect(disc.averageScore).toBe(6);
    expect(disc.recentAverageScore).toBe(6);
    expect(disc.improvementRate).toBe(0);
    expect(disc.trendScores).toEqual([6]);
  });

  it('with exactly 2 sessions: recent uses both (fewer than 4), improvement 0 when windows fully overlap', () => {
    const s1 = makeSession('a', 'generic', { discovery_questions: 4 }, '2025-01-01T12:00:00.000Z');
    const s2 = makeSession('b', 'generic', { discovery_questions: 8 }, '2025-01-02T12:00:00.000Z');
    const disc = computeSkillAnalytics([s1, s2]).find((x) => x.skill === 'discovery_questions')!;
    expect(disc.recentAverageScore).toBe(6);
    expect(disc.averageScore).toBe(6);
    expect(disc.improvementRate).toBe(0);
    expect(disc.trendScores).toEqual([4, 8]);
  });

  it('with exactly 4 sessions: recent window is all four; early window is first three', () => {
    const sessions = [5, 5, 5, 8].map((v, i) =>
      makeSession(`c${i}`, 'generic', { discovery_questions: v }, `2025-01-0${i + 1}T12:00:00.000Z`)
    );
    const disc = computeSkillAnalytics(sessions).find((x) => x.skill === 'discovery_questions')!;
    expect(disc.recentAverageScore).toBeCloseTo((5 + 5 + 5 + 8) / 4, 5);
    expect(disc.improvementRate).toBeCloseTo(5.75 - 5, 5);
  });

  it('with 3 sessions: early and recent windows overlap entirely so improvement uses same slice means', () => {
    const sessions = [3, 6, 9].map((v, i) =>
      makeSession(`c${i}`, 'generic', { discovery_questions: v }, `2025-01-0${i + 1}T12:00:00.000Z`)
    );
    const disc = computeSkillAnalytics(sessions).find((x) => x.skill === 'discovery_questions')!;
    expect(disc.recentAverageScore).toBe(6);
    expect(disc.improvementRate).toBe(0);
  });

  it('omits lastSeenWeakness when skill was never in bottom tier', () => {
    const sessions: GradedSessionScores[] = [
      makeSession('a', 'generic', { storytelling: 10 }, '2025-01-01T12:00:00.000Z'),
      makeSession('b', 'generic', { storytelling: 10 }, '2025-01-02T12:00:00.000Z'),
    ];
    const story = computeSkillAnalytics(sessions).find((x) => x.skill === 'storytelling')!;
    expect(story.lastSeenWeakness).toBeUndefined();
  });

  it('lastSeenWeakness reflects last weak session far in the past (not recent)', () => {
    const sessions: GradedSessionScores[] = [];
    sessions.push(makeSession('w', 'generic', { discovery_questions: 1 }, '2025-01-01T12:00:00.000Z'));
    for (let i = 1; i <= 5; i++) {
      sessions.push(
        makeSession(`s${i}`, 'generic', { discovery_questions: 9 }, `2025-01-0${i + 1}T12:00:00.000Z`)
      );
    }
    const disc = computeSkillAnalytics(sessions).find((x) => x.skill === 'discovery_questions')!;
    expect(disc.lastSeenWeakness).toBe(5);
  });
});
