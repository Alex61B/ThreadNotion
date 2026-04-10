import { describe, it, expect } from 'vitest';
import type { SkillAnalytics } from '../../schemas/trainingAnalytics';
import { selectNotables } from './selectNotables';

function row(
  skill: SkillAnalytics['skill'],
  avg: number,
  imp: number,
  freq: number
): SkillAnalytics {
  return {
    skill,
    averageScore: avg,
    recentAverageScore: avg,
    improvementRate: imp,
    weaknessFrequency: freq,
  };
}

describe('selectNotables', () => {
  it('returns empty object when skills array is empty', () => {
    expect(selectNotables([])).toEqual({});
  });

  it('picks strongest by highest average; tie-break lower SALES_SKILLS index', () => {
    const skills: SkillAnalytics[] = [
      row('discovery_questions', 8, 0, 0),
      row('objection_handling', 8, 0, 0),
      row('empathy', 3, 0, 0),
    ];
    expect(selectNotables(skills).strongestSkill).toBe('discovery_questions');
  });

  it('picks weakest by lowest average; tie-break lower index', () => {
    const skills: SkillAnalytics[] = [
      row('discovery_questions', 2, 0, 0),
      row('objection_handling', 2, 0, 0),
      row('empathy', 9, 0, 0),
    ];
    expect(selectNotables(skills).weakestSkill).toBe('discovery_questions');
  });

  it('picks most improved by highest improvementRate; tie-break lower index', () => {
    const skills: SkillAnalytics[] = [
      row('discovery_questions', 5, 2, 0),
      row('closing', 5, 2, 0),
      row('empathy', 5, 0, 0),
    ];
    expect(selectNotables(skills).mostImprovedSkill).toBe('discovery_questions');
  });

  it('picks persistent weakness by highest frequency then lower average', () => {
    const skills: SkillAnalytics[] = [
      row('discovery_questions', 4, 0, 0.5),
      row('closing', 3, 0, 0.5),
      row('empathy', 9, 0, 0),
    ];
    expect(selectNotables(skills).persistentWeakness).toBe('closing');
  });

  it('breaks frequency ties by lower average then skill index', () => {
    const skills: SkillAnalytics[] = [
      row('discovery_questions', 4, 0, 0.5),
      row('closing', 5, 0, 0.5),
      row('empathy', 9, 0, 0),
    ];
    expect(selectNotables(skills).persistentWeakness).toBe('discovery_questions');
  });

  it('breaks persistent weakness ties on same frequency and same average by lower skill index', () => {
    const skills: SkillAnalytics[] = [
      row('discovery_questions', 5, 0, 0.4),
      row('objection_handling', 5, 0, 0.4),
      row('empathy', 9, 0, 0),
    ];
    expect(selectNotables(skills).persistentWeakness).toBe('discovery_questions');
  });
});
