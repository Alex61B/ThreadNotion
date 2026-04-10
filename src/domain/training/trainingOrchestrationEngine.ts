import type { SalesSkill } from '../../schemas/coaching';
import type { ProgressSnapshot } from '../../schemas/progressSnapshot';
import type { TrainingRecommendation } from '../../schemas/trainingRecommendation';
import type {
  OrchestratedTrainingRecommendation,
  OrchestrationSource,
} from '../../schemas/trainingOrchestration';
import { mergeWeaknessesForScenario } from '../adaptive/weaknessCoherence';
import type { TrainingFocusInput } from '../drill/drillRecommendation';
import { skillLabel } from '../skillLabels';
import { computeTrainingRecommendation } from './trainingRecommendationEngine';
import type { RecentGradedSession } from './recentGradedSession';
import { sessionsSinceLastTouchedSkill } from './recentGradedSession';
import {
  DRILL_IF_SCORE_LT,
  MASTERY_MIN_SCORE,
  SPACED_MIN_SESSION_GAP,
} from './orchestrationConstants';

export type ManagerAssignmentInput = {
  skill: SalesSkill;
  assignmentType: 'drill' | 'adaptive';
  teamName: string;
};

export type OrchestrationEngineInput = {
  progress: ProgressSnapshot;
  trainingFocus: TrainingFocusInput;
  recentSessions: RecentGradedSession[];
  assignments: ManagerAssignmentInput[];
};

function scoreForSkill(progress: ProgressSnapshot, skill: SalesSkill): number {
  return progress.skills.find((s) => s.skill === skill)?.currentScore ?? 5;
}

function isMastered(progress: ProgressSnapshot, skill: SalesSkill): boolean {
  return scoreForSkill(progress, skill) >= MASTERY_MIN_SCORE;
}

function difficultyForScore(score: number): 'easy' | 'medium' | 'hard' {
  if (score < DRILL_IF_SCORE_LT) return 'hard';
  if (score < MASTERY_MIN_SCORE) return 'medium';
  return 'easy';
}

function inferSourceFromLegacy(rec: TrainingRecommendation): OrchestrationSource {
  const factors = rec.sourceFactors ?? [];
  const joined = factors.join(' ').toLowerCase();
  if (joined.includes('pinned')) return 'training_focus';
  if (rec.recommendedMode === 'generic') return 'generic_fallback';
  return 'weakness_engine';
}

function legacyToOrchestrated(
  rec: TrainingRecommendation,
  source: OrchestrationSource,
  progress: ProgressSnapshot
): OrchestratedTrainingRecommendation {
  const skills: SalesSkill[] = [];
  if (rec.primarySkill) skills.push(rec.primarySkill);
  if (rec.secondarySkill && rec.secondarySkill !== rec.primarySkill) skills.push(rec.secondarySkill);
  const primary = skills[0];
  const diff =
    rec.recommendedMode === 'generic' || primary == null
      ? undefined
      : difficultyForScore(scoreForSkill(progress, primary));
  return {
    recommendedMode: rec.recommendedMode,
    targetSkills: skills,
    rationale: rec.rationale,
    difficultyLevel: diff,
    source,
    confidence: rec.confidence,
    sourceFactors: [...(rec.sourceFactors ?? [])],
  };
}

function managerOverride(
  a: ManagerAssignmentInput,
  progress: ProgressSnapshot
): OrchestratedTrainingRecommendation {
  const score = scoreForSkill(progress, a.skill);
  if (a.assignmentType === 'drill') {
    return {
      recommendedMode: 'drill',
      targetSkills: [a.skill],
      rationale: `Manager assigned (${a.teamName}): focused ${skillLabel(a.skill)} drill.`,
      difficultyLevel: difficultyForScore(score),
      source: 'manager_assignment',
      confidence: 'high',
      sourceFactors: ['Manager assignment', a.teamName],
    };
  }
  const merged = mergeWeaknessesForScenario([
    a.skill,
    ...progress.lowestSkills.filter((s) => s !== a.skill),
  ]);
  const ts = merged.skills.length > 0 ? merged.skills : [a.skill];
  const primary = ts[0]!;
  return {
    recommendedMode: 'adaptive',
    targetSkills: ts.slice(0, 3),
    rationale: `Manager assigned (${a.teamName}): adaptive practice emphasizing ${skillLabel(a.skill)}.`,
    difficultyLevel: difficultyForScore(scoreForSkill(progress, primary)),
    source: 'manager_assignment',
    confidence: 'high',
    sourceFactors: ['Manager assignment', a.teamName],
  };
}

function targetsSkill(orch: OrchestratedTrainingRecommendation, skill: SalesSkill): boolean {
  return orch.targetSkills.includes(skill);
}

function applyMasteryAdjustment(
  orch: OrchestratedTrainingRecommendation,
  progress: ProgressSnapshot
): OrchestratedTrainingRecommendation {
  if (orch.recommendedMode !== 'drill') return orch;
  const primary = orch.targetSkills[0];
  if (!primary || !isMastered(progress, primary)) return orch;
  const candidates = progress.lowestSkills.filter((s) => !isMastered(progress, s));
  const extraFactors = [...orch.sourceFactors, 'Mastery threshold met for prior drill target'];
  if (candidates.length === 0) {
    return {
      ...orch,
      recommendedMode: 'generic',
      targetSkills: [],
      rationale: `${skillLabel(primary)} looks strong lately—take a balanced simulation, then we can refresh weaker areas next.`,
      difficultyLevel: undefined,
      source: 'mastery_adjustment',
      sourceFactors: extraFactors,
    };
  }
  const nextWeak = candidates[0]!;
  const merged = mergeWeaknessesForScenario([nextWeak, ...candidates.slice(1)]);
  const ts = merged.skills.slice(0, 2);
  return {
    recommendedMode: 'adaptive',
    targetSkills: ts,
    rationale: `${skillLabel(primary)} is at mastery level—shift to adaptive work on ${skillLabel(nextWeak)} instead.`,
    difficultyLevel: difficultyForScore(scoreForSkill(progress, ts[0]!)),
    source: 'mastery_adjustment',
    confidence: orch.confidence ?? 'medium',
    sourceFactors: extraFactors,
  };
}

function applySpacedRepetition(
  orch: OrchestratedTrainingRecommendation,
  progress: ProgressSnapshot,
  recentSessions: RecentGradedSession[]
): OrchestratedTrainingRecommendation {
  for (const skill of progress.lowestSkills) {
    if (isMastered(progress, skill)) continue;
    const gap = sessionsSinceLastTouchedSkill(recentSessions, skill);
    if (gap < SPACED_MIN_SESSION_GAP) continue;
    if (targetsSkill(orch, skill)) continue;
    const score = scoreForSkill(progress, skill);
    const rationale = `You have not practiced ${skillLabel(skill)} in the last ${gap} graded session(s)—time for a refresher.`;
    if (score < DRILL_IF_SCORE_LT) {
      return {
        recommendedMode: 'drill',
        targetSkills: [skill],
        rationale,
        difficultyLevel: 'hard',
        source: 'spaced_repetition',
        confidence: 'medium',
        sourceFactors: ['Spaced repetition', `${gap} sessions since last practice`],
      };
    }
    if (score < MASTERY_MIN_SCORE) {
      const merged = mergeWeaknessesForScenario([
        skill,
        ...progress.lowestSkills.filter((s) => s !== skill),
      ]);
      const ts = merged.skills.slice(0, 2);
      return {
        recommendedMode: 'adaptive',
        targetSkills: ts,
        rationale,
        difficultyLevel: difficultyForScore(score),
        source: 'spaced_repetition',
        confidence: 'medium',
        sourceFactors: ['Spaced repetition', `${gap} sessions since last practice`],
      };
    }
  }
  return orch;
}

export function buildOrchestratedRecommendation(
  input: OrchestrationEngineInput
): OrchestratedTrainingRecommendation {
  const { progress, trainingFocus, recentSessions, assignments } = input;
  if (assignments.length > 0) {
    return managerOverride(assignments[0]!, progress);
  }
  const base = computeTrainingRecommendation(progress, trainingFocus, recentSessions);
  const inferred = inferSourceFromLegacy(base);
  let orch = legacyToOrchestrated(base, inferred, progress);
  orch = applyMasteryAdjustment(orch, progress);
  orch = applySpacedRepetition(orch, progress, recentSessions);
  return orch;
}
