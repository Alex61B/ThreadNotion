import { describe, it, expect, beforeEach } from 'vitest';
import type { SalesSkill } from '../../schemas/coaching';
import { SALES_SKILLS } from '../../schemas/coaching';
import type { ProgressSnapshot } from '../../schemas/progressSnapshot';
import { toLegacyTrainingRecommendation } from '../../schemas/trainingOrchestration';
import type { RecentGradedSession } from './recentGradedSession';
import type { TrainingFocusInput } from '../drill/drillRecommendation';
import {
  buildOrchestratedRecommendation,
  type ManagerAssignmentInput,
} from './trainingOrchestrationEngine';

type Trend = 'improving' | 'declining' | 'stable';

function makeSnapshot(
  lowestSkills: SalesSkill[],
  scores: Partial<Record<SalesSkill, number>>,
  trends: Partial<Record<SalesSkill, Trend>> = {}
): ProgressSnapshot {
  const skills = SALES_SKILLS.map((skill) => ({
    skill,
    currentScore: scores[skill] ?? 6,
    trendDirection: (trends[skill] ?? 'stable') as Trend,
  }));
  return {
    skills,
    lowestSkills,
    recommendedFocusSkills: lowestSkills.slice(0, 3),
    overallProgressSummary: 'Summary.',
  };
}

let sid = 0;
function gradedSession(
  overrides: Partial<RecentGradedSession> & Pick<RecentGradedSession, 'simulationMode'>
): RecentGradedSession {
  sid += 1;
  return {
    conversationId: `c-${sid}`,
    createdAt: new Date(),
    adaptiveTargetWeaknesses: [],
    ...overrides,
  };
}

beforeEach(() => {
  sid = 0;
});

describe('buildOrchestratedRecommendation', () => {
  it('manager assignment overrides engine (drill)', () => {
    const progress = makeSnapshot(['closing'], {});
    const assignments: ManagerAssignmentInput[] = [
      { skill: 'objection_handling', assignmentType: 'drill', teamName: 'East' },
    ];
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [],
      assignments,
    });
    expect(orch.source).toBe('manager_assignment');
    expect(orch.recommendedMode).toBe('drill');
    expect(orch.targetSkills).toEqual(['objection_handling']);
    expect(orch.rationale).toContain('East');
    const legacy = toLegacyTrainingRecommendation(orch);
    expect(legacy.primarySkill).toBe('objection_handling');
  });

  it('manager adaptive assignment merges weaknesses', () => {
    const progress = makeSnapshot(['closing', 'empathy'], { closing: 4, empathy: 5 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [gradedSession({ simulationMode: 'generic' })],
      assignments: [{ skill: 'closing', assignmentType: 'adaptive', teamName: 'West' }],
    });
    expect(orch.source).toBe('manager_assignment');
    expect(orch.recommendedMode).toBe('adaptive');
    expect(orch.targetSkills.length).toBeGreaterThan(0);
    expect(orch.targetSkills[0]).toBe('closing');
  });

  it('marks training_focus when pinned focus drives recommendation', () => {
    const focus: TrainingFocusInput = {
      focusSkills: ['empathy'],
      sessionsRemaining: 2,
    };
    const sessions: RecentGradedSession[] = [gradedSession({ simulationMode: 'generic' })];
    const progress = makeSnapshot(['closing', 'empathy'], { empathy: 4, closing: 5 }, { empathy: 'declining' });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: focus,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.source).toBe('training_focus');
    expect(orch.recommendedMode).toBe('drill');
    expect(orch.targetSkills[0]).toBe('empathy');
  });

  it('replaces drill on mastered skill with adaptive on next weak skill', () => {
    const focus: TrainingFocusInput = {
      focusSkills: ['closing'],
      sessionsRemaining: 2,
    };
    const sessions: RecentGradedSession[] = [gradedSession({ simulationMode: 'generic' })];
    const progress = makeSnapshot(
      ['closing', 'discovery_questions'],
      { closing: 8, discovery_questions: 4 },
      { closing: 'declining' }
    );
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: focus,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.source).toBe('mastery_adjustment');
    expect(orch.recommendedMode).toBe('adaptive');
    expect(orch.targetSkills[0]).toBe('discovery_questions');
    expect(orch.rationale).toContain('mastery');
  });

  it('spaced repetition suggests drill for weak skill not touched in several sessions', () => {
    const sessions: RecentGradedSession[] = Array.from({ length: 5 }, () =>
      gradedSession({
        simulationMode: 'generic',
        lowestSkillInSession: 'closing',
      })
    );
    const progress = makeSnapshot(
      ['closing', 'discovery_questions'],
      { closing: 5, discovery_questions: 3 },
      { closing: 'stable', discovery_questions: 'stable' }
    );
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.source).toBe('spaced_repetition');
    expect(orch.recommendedMode).toBe('drill');
    expect(orch.targetSkills).toEqual(['discovery_questions']);
    expect(orch.rationale).toContain('have not practiced');
    expect(orch.difficultyLevel).toBe('hard');
  });

  it('assigns difficulty from primary target score', () => {
    const sessions: RecentGradedSession[] = [gradedSession({ simulationMode: 'generic' })];
    const progress = makeSnapshot(['closing'], { closing: 3 }, { closing: 'declining' });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.recommendedMode).toBe('drill');
    expect(orch.difficultyLevel).toBe('hard');
  });

  it('manager assignment overrides pinned training focus', () => {
    const focus: TrainingFocusInput = {
      focusSkills: ['empathy'],
      sessionsRemaining: 2,
    };
    const progress = makeSnapshot(['empathy', 'closing'], { empathy: 3, closing: 4 }, { empathy: 'declining' });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: focus,
      recentSessions: [gradedSession({ simulationMode: 'generic' })],
      assignments: [{ skill: 'objection_handling', assignmentType: 'drill', teamName: 'HQ' }],
    });
    expect(orch.source).toBe('manager_assignment');
    expect(orch.targetSkills).toEqual(['objection_handling']);
  });

  it('uses first manager assignment when multiple exist (deterministic)', () => {
    const progress = makeSnapshot(['closing'], { closing: 4 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [],
      assignments: [
        { skill: 'closing', assignmentType: 'drill', teamName: 'TeamA' },
        { skill: 'empathy', assignmentType: 'drill', teamName: 'TeamB' },
      ],
    });
    expect(orch.targetSkills).toEqual(['closing']);
    expect(orch.rationale).toContain('TeamA');
  });

  it('manager drill on mastered skill is not rewritten by mastery adjustment', () => {
    const progress = makeSnapshot(['closing'], { closing: 9 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [gradedSession({ simulationMode: 'generic' })],
      assignments: [{ skill: 'closing', assignmentType: 'drill', teamName: 'Lead' }],
    });
    expect(orch.source).toBe('manager_assignment');
    expect(orch.recommendedMode).toBe('drill');
    expect(orch.targetSkills).toEqual(['closing']);
    expect(orch.difficultyLevel).toBe('easy');
  });

  it('mastery adjustment falls back to generic when no non-mastered weak skills', () => {
    const focus: TrainingFocusInput = { focusSkills: ['closing'], sessionsRemaining: 2 };
    const sessions: RecentGradedSession[] = [gradedSession({ simulationMode: 'generic' })];
    const progress = makeSnapshot(['closing'], { closing: 8 }, { closing: 'declining' });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: focus,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.source).toBe('mastery_adjustment');
    expect(orch.recommendedMode).toBe('generic');
    expect(orch.targetSkills).toEqual([]);
    expect(orch.difficultyLevel).toBeUndefined();
  });

  it('spaced repetition skips mastered skills in lowestSkills order', () => {
    const sessions: RecentGradedSession[] = Array.from({ length: 5 }, () =>
      gradedSession({ simulationMode: 'generic', lowestSkillInSession: 'closing' })
    );
    const progress = makeSnapshot(
      ['closing', 'empathy', 'discovery_questions'],
      { closing: 3, empathy: 8, discovery_questions: 3 },
      { closing: 'stable', empathy: 'stable', discovery_questions: 'stable' }
    );
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.source).toBe('spaced_repetition');
    expect(orch.targetSkills).toEqual(['discovery_questions']);
    expect(orch.recommendedMode).toBe('drill');
  });

  it('spaced repetition uses adaptive when weak skill score is 5–6', () => {
    const sessions: RecentGradedSession[] = Array.from({ length: 5 }, () =>
      gradedSession({ simulationMode: 'generic', lowestSkillInSession: 'closing' })
    );
    const progress = makeSnapshot(
      ['closing', 'discovery_questions'],
      { closing: 5, discovery_questions: 5 },
      { closing: 'stable', discovery_questions: 'stable' }
    );
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.source).toBe('spaced_repetition');
    expect(orch.recommendedMode).toBe('adaptive');
    expect(orch.difficultyLevel).toBe('medium');
    expect(orch.targetSkills).toContain('discovery_questions');
  });

  it('sparse: 0 graded sessions, no focus, no assignment follows base engine', () => {
    const progress = makeSnapshot(['closing'], { closing: 4 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [],
      assignments: [],
    });
    expect(orch.recommendedMode).toBe('adaptive');
    expect(orch.source).toBe('weakness_engine');
    expect(orch.targetSkills[0]).toBe('closing');
  });

  it('sparse: 0 sessions with balanced profile yields generic', () => {
    const allSix = Object.fromEntries(SALES_SKILLS.map((s) => [s, 6])) as Partial<
      Record<SalesSkill, number>
    >;
    const progress = makeSnapshot([], allSix);
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [],
      assignments: [],
    });
    expect(orch.recommendedMode).toBe('generic');
    expect(orch.source).toBe('generic_fallback');
    expect(orch.difficultyLevel).toBeUndefined();
  });

  it('sparse: 1 graded session with declining weakest yields drill', () => {
    const sessions: RecentGradedSession[] = [gradedSession({ simulationMode: 'generic' })];
    const progress = makeSnapshot(['closing'], { closing: 4 }, { closing: 'declining' });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.recommendedMode).toBe('drill');
    expect(orch.targetSkills[0]).toBe('closing');
  });

  it('sparse: 2 graded sessions same as engine medium-confidence drill', () => {
    const sessions: RecentGradedSession[] = [
      gradedSession({ simulationMode: 'generic' }),
      gradedSession({ simulationMode: 'generic' }),
    ];
    const progress = makeSnapshot(['closing'], { closing: 4 }, { closing: 'declining' });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: sessions,
      assignments: [],
    });
    expect(orch.recommendedMode).toBe('drill');
    expect(orch.confidence).toBe('medium');
  });

  it('sparse history with manager assignment still manager source', () => {
    const progress = makeSnapshot(['closing'], { closing: 4 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [],
      assignments: [{ skill: 'empathy', assignmentType: 'drill', teamName: 'Remote' }],
    });
    expect(orch.source).toBe('manager_assignment');
    expect(orch.targetSkills).toEqual(['empathy']);
  });

  it('difficulty boundary: score 4 hard via manager drill', () => {
    const progress = makeSnapshot(['closing'], { closing: 5, objection_handling: 4 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [],
      assignments: [{ skill: 'objection_handling', assignmentType: 'drill', teamName: 'T' }],
    });
    expect(orch.difficultyLevel).toBe('hard');
  });

  it('difficulty boundary: score 5 medium via manager drill', () => {
    const progress = makeSnapshot(['closing'], { closing: 5, objection_handling: 5 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [],
      assignments: [{ skill: 'objection_handling', assignmentType: 'drill', teamName: 'T' }],
    });
    expect(orch.difficultyLevel).toBe('medium');
  });

  it('difficulty boundary: score 7 easy via manager drill', () => {
    const progress = makeSnapshot(['closing'], { closing: 5, objection_handling: 7 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [],
      assignments: [{ skill: 'objection_handling', assignmentType: 'drill', teamName: 'T' }],
    });
    expect(orch.difficultyLevel).toBe('easy');
  });

  it('adaptive manager assignment difficulty uses merged primary score', () => {
    const progress = makeSnapshot(['closing', 'empathy'], { closing: 3, empathy: 6 });
    const orch = buildOrchestratedRecommendation({
      progress,
      trainingFocus: null,
      recentSessions: [gradedSession({ simulationMode: 'generic' })],
      assignments: [{ skill: 'closing', assignmentType: 'adaptive', teamName: 'T' }],
    });
    expect(orch.recommendedMode).toBe('adaptive');
    expect(orch.difficultyLevel).toBe('hard');
    expect(orch.targetSkills[0]).toBe('closing');
  });

  it('uses default score 5 for difficulty when skill row missing from progress', () => {
    const partial: ProgressSnapshot = {
      skills: [{ skill: 'objection_handling', currentScore: 4, trendDirection: 'stable' }],
      lowestSkills: ['objection_handling'],
      recommendedFocusSkills: ['objection_handling'],
      overallProgressSummary: 'S',
    };
    const orch = buildOrchestratedRecommendation({
      progress: partial,
      trainingFocus: null,
      recentSessions: [],
      assignments: [{ skill: 'closing', assignmentType: 'drill', teamName: 'T' }],
    });
    expect(orch.difficultyLevel).toBe('medium');
  });
});
