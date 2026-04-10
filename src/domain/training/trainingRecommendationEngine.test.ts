import { describe, it, expect } from 'vitest';
import type { SalesSkill } from '../../schemas/coaching';
import { SALES_SKILLS } from '../../schemas/coaching';
import type { ProgressSnapshot } from '../../schemas/progressSnapshot';
import type { RecentGradedSession } from './recentGradedSession';
import type { TrainingFocusInput } from '../drill/drillRecommendation';
import {
  computeTrainingRecommendation,
  drillSuggestionFromTrainingRecommendation,
} from './trainingRecommendationEngine';

type Trend = 'improving' | 'declining' | 'stable';

function makeSnapshot(args: {
  lowestSkills: SalesSkill[];
  skillTrends?: Partial<Record<SalesSkill, Trend>>;
  latestDeltas?: Partial<Record<SalesSkill, number>>;
}): ProgressSnapshot {
  const { lowestSkills, skillTrends = {}, latestDeltas = {} } = args;
  const skills = SALES_SKILLS.map((skill) => {
    const trend = skillTrends[skill] ?? 'stable';
    const d = latestDeltas[skill];
    const base = {
      skill,
      currentScore: 5,
      trendDirection: trend,
    };
    if (d === undefined) return base;
    return {
      ...base,
      latestSimulationScore: 7,
      previousSimulationScore: 7 - d,
      latestDelta: d,
    };
  });
  return {
    skills,
    lowestSkills,
    recommendedFocusSkills: lowestSkills.slice(0, 3),
    overallProgressSummary: 'Summary.',
  };
}

function gradedSession(
  overrides: Partial<RecentGradedSession> & Pick<RecentGradedSession, 'simulationMode'>
): RecentGradedSession {
  return {
    conversationId: 'c1',
    createdAt: new Date(),
    adaptiveTargetWeaknesses: [],
    ...overrides,
  };
}

describe('computeTrainingRecommendation', () => {
  it('sparse-ish history: 1 graded session + declining weakest → drill with low confidence', () => {
    const sessions: RecentGradedSession[] = [gradedSession({ simulationMode: 'generic' })];
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        skillTrends: { closing: 'declining' },
      }),
      null,
      sessions
    );
    expect(rec.recommendedMode).toBe('drill');
    expect(rec.primarySkill).toBe('closing');
    expect(rec.confidence).toBe('low');
  });

  it('2 graded sessions: declining weakest → drill with medium confidence', () => {
    const sessions: RecentGradedSession[] = [
      gradedSession({ simulationMode: 'generic', conversationId: 'a' }),
      gradedSession({ simulationMode: 'generic', conversationId: 'b' }),
    ];
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        skillTrends: { closing: 'declining' },
      }),
      null,
      sessions
    );
    expect(rec.recommendedMode).toBe('drill');
    expect(rec.primarySkill).toBe('closing');
    expect(rec.confidence).toBe('medium');
  });

  it('sparse history: no graded sessions + profile weaknesses → adaptive, low confidence', () => {
    const rec = computeTrainingRecommendation(
      makeSnapshot({ lowestSkills: ['closing'] }),
      null,
      []
    );
    expect(rec.recommendedMode).toBe('adaptive');
    expect(rec.confidence).toBe('low');
    expect(rec.primarySkill).toBe('closing');
  });

  it('sparse history: no graded sessions + no weakness ordering → generic', () => {
    const snap = makeSnapshot({ lowestSkills: [] });
    const rec = computeTrainingRecommendation(snap, null, []);
    expect(rec.recommendedMode).toBe('generic');
    expect(rec.confidence).toBe('low');
  });

  it('pinned focus with sessions remaining + declining → drill', () => {
    const focus: TrainingFocusInput = {
      focusSkills: ['empathy'],
      sessionsRemaining: 2,
    };
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        skillTrends: { empathy: 'declining' },
      }),
      focus,
      [gradedSession({ simulationMode: 'generic' })]
    );
    expect(rec.recommendedMode).toBe('drill');
    expect(rec.primarySkill).toBe('empathy');
    expect(rec.sourceFactors).toContain('Pinned training focus');
  });

  it('pinned focus active but not lowest and not declining → adaptive uses pinned skill', () => {
    const focus: TrainingFocusInput = {
      focusSkills: ['empathy'],
      sessionsRemaining: 3,
    };
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        skillTrends: { empathy: 'stable' },
      }),
      focus,
      [gradedSession({ simulationMode: 'generic' })]
    );
    expect(rec.recommendedMode).toBe('adaptive');
    expect(rec.primarySkill).toBe('empathy');
    expect(rec.rationale).toMatch(/Pinned focus/i);
  });

  it('pinned focus sessionsRemaining=0 does not pin recommendation', () => {
    const focus: TrainingFocusInput = {
      focusSkills: ['empathy'],
      sessionsRemaining: 0,
    };
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        skillTrends: { closing: 'declining' },
      }),
      focus,
      [gradedSession({ simulationMode: 'generic' })]
    );
    // Should follow general rules (declining weakest), not pinned focus.
    expect(rec.recommendedMode).toBe('drill');
    expect(rec.primarySkill).toBe('closing');
    expect(rec.rationale).not.toMatch(/Pinned focus/i);
  });

  it('two drill streak on skill with positive delta → adaptive transfer', () => {
    const sessions: RecentGradedSession[] = [
      gradedSession({
        simulationMode: 'drill',
        drillPrimarySkill: 'closing',
        conversationId: 'c1',
      }),
      gradedSession({
        simulationMode: 'drill',
        drillPrimarySkill: 'closing',
        conversationId: 'c2',
      }),
    ];
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        latestDeltas: { closing: 1 },
      }),
      null,
      sessions
    );
    expect(rec.recommendedMode).toBe('adaptive');
    expect(rec.sourceFactors.some((f) => f.includes('Drill streak'))).toBe(true);
  });

  it('drill streak without improvement does not force transfer', () => {
    const sessions: RecentGradedSession[] = [
      gradedSession({ simulationMode: 'drill', drillPrimarySkill: 'closing', conversationId: 'c1' }),
      gradedSession({ simulationMode: 'drill', drillPrimarySkill: 'closing', conversationId: 'c2' }),
    ];
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        latestDeltas: { closing: 0 },
      }),
      null,
      sessions
    );
    // With stable trend and no other signals, default should remain adaptive-by-weakness,
    // but not the explicit transfer rationale.
    expect(rec.rationale).not.toMatch(/transfer/i);
  });

  it('same lowest skill across last three graded sessions → drill stagnation', () => {
    const sessions: RecentGradedSession[] = [
      gradedSession({
        simulationMode: 'generic',
        lowestSkillInSession: 'product_knowledge',
        conversationId: 'a',
      }),
      gradedSession({
        simulationMode: 'generic',
        lowestSkillInSession: 'product_knowledge',
        conversationId: 'b',
      }),
      gradedSession({
        simulationMode: 'generic',
        lowestSkillInSession: 'product_knowledge',
        conversationId: 'c',
      }),
    ];
    const rec = computeTrainingRecommendation(
      makeSnapshot({ lowestSkills: ['product_knowledge'] }),
      null,
      sessions
    );
    expect(rec.recommendedMode).toBe('drill');
    expect(rec.primarySkill).toBe('product_knowledge');
  });

  it('stagnation does not trigger when some sessions lack lowestSkillInSession', () => {
    const sessions: RecentGradedSession[] = [
      gradedSession({ simulationMode: 'generic', lowestSkillInSession: 'product_knowledge', conversationId: 'a' }),
      gradedSession({ simulationMode: 'generic', conversationId: 'b' }),
      gradedSession({ simulationMode: 'generic', lowestSkillInSession: 'product_knowledge', conversationId: 'c' }),
    ];
    const rec = computeTrainingRecommendation(
      makeSnapshot({ lowestSkills: ['product_knowledge'] }),
      null,
      sessions
    );
    // Should fall back to adaptive (weakness) rather than stagnation drill.
    expect(rec.sourceFactors).not.toContain('Same lowest skill across last 3 graded sessions');
  });

  it('weakest declining → drill before stagnation', () => {
    const sessions: RecentGradedSession[] = [
      gradedSession({ simulationMode: 'generic', conversationId: 'a' }),
    ];
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        skillTrends: { closing: 'declining' },
      }),
      null,
      sessions
    );
    expect(rec.recommendedMode).toBe('drill');
    expect(rec.primarySkill).toBe('closing');
  });

  it('sourceFactors are non-empty and non-duplicated in common paths', () => {
    const rec = computeTrainingRecommendation(
      makeSnapshot({ lowestSkills: ['closing'], skillTrends: { closing: 'declining' } }),
      null,
      [gradedSession({ simulationMode: 'generic' })]
    );
    expect(rec.sourceFactors.length).toBeGreaterThan(0);
    expect(new Set(rec.sourceFactors).size).toBe(rec.sourceFactors.length);
  });
});

describe('drillSuggestionFromTrainingRecommendation', () => {
  it('drill mode returns same primary skill and rationale as recommendation', () => {
    const progress = makeSnapshot({ lowestSkills: ['closing'] });
    const rec = computeTrainingRecommendation(
      makeSnapshot({
        lowestSkills: ['closing'],
        skillTrends: { closing: 'declining' },
      }),
      null,
      [gradedSession({ simulationMode: 'generic' })]
    );
    expect(rec.recommendedMode).toBe('drill');
    const drill = drillSuggestionFromTrainingRecommendation(rec, progress, null);
    expect(drill.primarySkill).toBe(rec.primarySkill);
    expect(drill.rationale).toBe(rec.rationale);
  });

  it('generic mode falls back to legacy drill target when no primary', () => {
    const progress = makeSnapshot({ lowestSkills: [] });
    const rec = {
      recommendedMode: 'generic' as const,
      rationale: 'Balanced.',
      sourceFactors: [] as string[],
    };
    const drill = drillSuggestionFromTrainingRecommendation(rec, progress, null);
    expect(drill.primarySkill).toBeDefined();
    expect(drill.rationale.length).toBeGreaterThan(0);
  });

  it('adaptive/generic mode with primarySkill prefixes rationale for legacy drillSuggestion', () => {
    const progress = makeSnapshot({ lowestSkills: ['closing'] });
    const rec = {
      recommendedMode: 'adaptive' as const,
      primarySkill: 'closing' as const,
      rationale: 'Adaptive next.',
      sourceFactors: ['Profile weaknesses'],
    };
    const drill = drillSuggestionFromTrainingRecommendation(rec, progress, null);
    expect(drill.primarySkill).toBe('closing');
    expect(drill.rationale).toMatch(/^Suggested practice focus:/);
  });
});
