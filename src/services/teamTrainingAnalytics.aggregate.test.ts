import { describe, it, expect } from 'vitest';
import type { TrainingAnalytics } from '../schemas/trainingAnalytics';
import { TeamAnalyticsSchema } from '../schemas/teamAnalytics';
import { aggregateTeamAnalyticsFromUserAnalytics } from './teamTrainingAnalyticsService';

function analytics(
  uid: string,
  sessions: number,
  skillAvgs: Partial<Record<string, number>>,
  notables?: Partial<{
    strongestSkill: string;
    weakestSkill: string;
  }>
): TrainingAnalytics {
  const skills = [
    'discovery_questions',
    'objection_handling',
    'product_knowledge',
    'closing',
    'storytelling',
    'empathy',
  ].map((skill) => ({
    skill: skill as TrainingAnalytics['skills'][0]['skill'],
    averageScore: skillAvgs[skill] ?? 5,
    recentAverageScore: skillAvgs[skill] ?? 5,
    improvementRate: 0,
    weaknessFrequency: 0,
  }));
  return {
    skills,
    modes: [
      { mode: 'generic' as const, sessionCount: 0 },
      { mode: 'adaptive' as const, sessionCount: 0 },
      { mode: 'drill' as const, sessionCount: 0 },
    ],
    sessionsAnalyzed: sessions,
    strongestSkill: notables?.strongestSkill as any,
    weakestSkill: notables?.weakestSkill as any,
  };
}

describe('aggregateTeamAnalyticsFromUserAnalytics', () => {
  it('returns zeros and empty user lists when no members have graded sessions', () => {
    const map = new Map<string, TrainingAnalytics>();
    map.set('a', analytics('a', 0, {}));
    const t = aggregateTeamAnalyticsFromUserAnalytics(map);
    expect(t.totalSessions).toBe(0);
    expect(t.averageProgress).toBeUndefined();
    expect(t.teamWeakestSkill).toBeUndefined();
    t.skills.forEach((s) => {
      expect(s.averageScore).toBe(0);
      expect(s.weakestUsers).toEqual([]);
    });
  });

  it('averages skill scores only across members with sessions', () => {
    const map = new Map<string, TrainingAnalytics>();
    map.set('u1', analytics('u1', 2, { closing: 4 }));
    map.set('u2', analytics('u2', 0, { closing: 10 }));
    const t = aggregateTeamAnalyticsFromUserAnalytics(map);
    const closing = t.skills.find((s) => s.skill === 'closing')!;
    expect(closing.averageScore).toBe(4);
    expect(t.totalSessions).toBe(2);
  });

  it('lists all users tied at min and max per skill', () => {
    const map = new Map<string, TrainingAnalytics>();
    map.set('b', analytics('b', 1, { empathy: 3 }));
    map.set('a', analytics('a', 1, { empathy: 3 }));
    map.set('c', analytics('c', 1, { empathy: 8 }));
    const t = aggregateTeamAnalyticsFromUserAnalytics(map);
    const emp = t.skills.find((s) => s.skill === 'empathy')!;
    expect(emp.weakestUsers.sort()).toEqual(['a', 'b']);
    expect(emp.strongestUsers).toEqual(['c']);
  });

  it('computes totalSessions as sum of member sessionsAnalyzed', () => {
    const map = new Map<string, TrainingAnalytics>();
    map.set('x', analytics('x', 3, {}));
    map.set('y', analytics('y', 2, {}));
    expect(aggregateTeamAnalyticsFromUserAnalytics(map).totalSessions).toBe(5);
  });

  it('computes averageProgress from per-rep mean skill scores', () => {
    const map = new Map<string, TrainingAnalytics>();
    map.set('x', analytics('x', 1, { empathy: 10, closing: 0 }));
    const t = aggregateTeamAnalyticsFromUserAnalytics(map);
    expect(t.averageProgress).toBeDefined();
    expect(t.averageProgress!).toBeGreaterThan(0);
  });

  it('one-member team with graded sessions picks distinct team strongest and weakest skills', () => {
    const map = new Map<string, TrainingAnalytics>();
    map.set('solo', analytics('solo', 2, { closing: 9, empathy: 2, product_knowledge: 5 }));
    const t = aggregateTeamAnalyticsFromUserAnalytics(map);
    expect(t.teamStrongestSkill).toBe('closing');
    expect(t.teamWeakestSkill).toBe('empathy');
    expect(TeamAnalyticsSchema.safeParse(t).success).toBe(true);
  });

  it('uses deterministic SALES_SKILLS tie-break when all per-skill team averages are equal', () => {
    const map = new Map<string, TrainingAnalytics>();
    map.set('u1', analytics('u1', 1, {}));
    const t = aggregateTeamAnalyticsFromUserAnalytics(map);
    expect(t.teamStrongestSkill).toBe('discovery_questions');
    expect(t.teamWeakestSkill).toBe('discovery_questions');
  });

  it('omits a member from a skill average when that skill row is missing but sessions exist', () => {
    const full = analytics('u1', 1, { closing: 8 });
    const partial: TrainingAnalytics = {
      ...full,
      skills: full.skills.filter((s) => s.skill !== 'closing'),
    };
    const map = new Map<string, TrainingAnalytics>();
    map.set('u1', partial);
    const t = aggregateTeamAnalyticsFromUserAnalytics(map);
    const closing = t.skills.find((s) => s.skill === 'closing')!;
    expect(closing.averageScore).toBe(0);
    expect(closing.weakestUsers).toEqual([]);
    expect(TeamAnalyticsSchema.safeParse(t).success).toBe(true);
  });
});
