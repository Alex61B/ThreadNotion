import type { SalesSkill } from '../../schemas/coaching';
import type { ProgressSnapshot } from '../../schemas/progressSnapshot';
import type { TrainingRecommendation } from '../../schemas/trainingRecommendation';
import { mergeWeaknessesForScenario } from '../adaptive/weaknessCoherence';
import {
  type TrainingFocusInput,
  type DrillSuggestion,
  suggestDrillTargetFromProgress,
} from '../drill/drillRecommendation';
import { skillLabel } from '../skillLabels';
import {
  consecutiveDrillStreakForSkill,
  stagnationSameLowest,
  type RecentGradedSession,
} from './recentGradedSession';

function confidenceFromHistory(gradedCount: number): 'high' | 'medium' | 'low' {
  if (gradedCount >= 5) return 'high';
  if (gradedCount >= 2) return 'medium';
  return 'low';
}

/**
 * Deterministic training mode + skills from profile, pinned focus, and recent graded sessions.
 */
export function computeTrainingRecommendation(
  progress: ProgressSnapshot,
  trainingFocus: TrainingFocusInput,
  recentSessions: RecentGradedSession[]
): TrainingRecommendation {
  const gradedCount = recentSessions.length;
  const lowest = progress.lowestSkills[0];
  const skillRow = (s: SalesSkill) => progress.skills.find((x) => x.skill === s);

  if (gradedCount === 0) {
    if (progress.lowestSkills.length > 0 && lowest) {
      return {
        recommendedMode: 'adaptive',
        primarySkill: lowest,
        secondarySkill: progress.lowestSkills[1],
        rationale: `Limited graded history—adaptive scenarios can still stress your weakest areas, starting with ${skillLabel(lowest)}.`,
        confidence: 'low',
        sourceFactors: ['No graded sessions yet', 'Profile weaknesses available'],
      };
    }
    return {
      recommendedMode: 'generic',
      rationale:
        'No graded sessions yet—start with a normal simulation to establish a baseline, then we can tailor drills and adaptive runs.',
      confidence: 'low',
      sourceFactors: ['No graded history'],
    };
  }

  const tf = trainingFocus;
  const pinnedActive =
    tf?.focusSkills?.length &&
    (tf.sessionsRemaining == null || tf.sessionsRemaining > 0);

  if (pinnedActive && tf!.focusSkills!.length) {
    const focusSkill = tf!.focusSkills![0]!;
    const remaining = tf!.sessionsRemaining;
    const row = skillRow(focusSkill);
    const isLowest = lowest === focusSkill;
    const declining = row?.trendDirection === 'declining';

    const streak = consecutiveDrillStreakForSkill(recentSessions, focusSkill);
    const delta = row?.latestDelta;
    if (streak >= 2 && delta !== undefined && delta > 0) {
      const secondary =
        progress.lowestSkills.find((s) => s !== focusSkill) ?? progress.lowestSkills[1];
      return {
        recommendedMode: 'adaptive',
        primarySkill: focusSkill,
        secondarySkill: secondary,
        rationale: `You've drilled ${skillLabel(focusSkill)} and your latest score improved—try adaptive training to test transfer in a broader scenario.`,
        confidence: 'medium',
        sourceFactors: ['Pinned focus', 'Drill streak with improvement', 'Transfer'],
      };
    }

    if (declining || isLowest) {
      return {
        recommendedMode: 'drill',
        primarySkill: focusSkill,
        rationale:
          remaining != null && remaining > 0
            ? `Pinned focus: ${skillLabel(focusSkill)} (${remaining} graded session(s) remaining)—short drills stabilize this skill.`
            : `Pinned focus: ${skillLabel(focusSkill)}—use a focused drill while this area is still weak.`,
        confidence: 'high',
        sourceFactors: ['Pinned training focus', declining ? 'Declining trend' : 'Weakest in profile'],
      };
    }

    const secondary =
      lowest && lowest !== focusSkill ? lowest : progress.lowestSkills.find((s) => s !== focusSkill);
    return {
      recommendedMode: 'adaptive',
      primarySkill: focusSkill,
      secondarySkill: secondary,
      rationale: `Pinned focus: ${skillLabel(focusSkill)}—combine it with adaptive practice to integrate related weaknesses.`,
      confidence: 'high',
      sourceFactors: ['Pinned focus', 'Profile supports broader scenario'],
    };
  }

  for (const skill of progress.lowestSkills.slice(0, 3)) {
    const streak = consecutiveDrillStreakForSkill(recentSessions, skill);
    const r = skillRow(skill);
    if (streak >= 2 && r?.latestDelta !== undefined && r.latestDelta > 0) {
      const merged = mergeWeaknessesForScenario([
        skill,
        ...progress.lowestSkills.filter((s) => s !== skill),
      ]);
      return {
        recommendedMode: 'adaptive',
        primarySkill: merged.skills[0],
        secondarySkill: merged.skills[1],
        rationale: `Repeated drills on ${skillLabel(skill)} helped your latest score—step up to adaptive training for realistic transfer.`,
        confidence: 'medium',
        sourceFactors: ['Drill streak', 'Score improvement', 'Transfer'],
      };
    }
  }

  if (lowest) {
    const lr = skillRow(lowest);
    if (lr?.trendDirection === 'declining') {
      return {
        recommendedMode: 'drill',
        primarySkill: lowest,
        rationale: `${skillLabel(lowest)} is low and still trending down—a focused drill adds deliberate reps.`,
        confidence: confidenceFromHistory(gradedCount),
        sourceFactors: ['Weakest skill', 'Declining trend'],
      };
    }
  }

  const improvingSkills = progress.skills
    .filter((s) => s.trendDirection === 'improving')
    .map((s) => s.skill);
  const mixedPartner = improvingSkills.find((s) => lowest && s !== lowest);
  if (lowest && mixedPartner) {
    const merged = mergeWeaknessesForScenario([lowest, mixedPartner]);
    return {
      recommendedMode: 'adaptive',
      primarySkill: merged.skills[0],
      secondarySkill: merged.skills[1],
      rationale: `Mixed signals: ${skillLabel(lowest)} needs work while ${skillLabel(mixedPartner)} is improving—adaptive combines both in one flow.`,
      confidence: 'medium',
      sourceFactors: ['Weak + improving elsewhere', 'Scenario coherence'],
    };
  }

  const stagn = stagnationSameLowest(recentSessions, 3);
  if (stagn) {
    return {
      recommendedMode: 'drill',
      primarySkill: stagn,
      rationale: `${skillLabel(stagn)} has been your lowest score across recent graded runs—targeted drill to break the plateau.`,
      confidence: 'medium',
      sourceFactors: ['Same lowest skill across last 3 graded sessions'],
    };
  }

  if (lowest) {
    return {
      recommendedMode: 'adaptive',
      primarySkill: lowest,
      secondarySkill: progress.lowestSkills[1],
      rationale: `Adaptive training weaves your weakest areas (${skillLabel(lowest)}) into a realistic shopper scenario.`,
      confidence: confidenceFromHistory(gradedCount),
      sourceFactors: ['Profile weaknesses'],
    };
  }

  return {
    recommendedMode: 'generic',
    rationale: 'Your profile looks balanced across skills—keep variety with a normal simulation.',
    confidence: 'medium',
    sourceFactors: ['No standout weakness'],
  };
}

/** Backward-compatible drill line item when clients expect `drillSuggestion` only. */
export function drillSuggestionFromTrainingRecommendation(
  rec: TrainingRecommendation,
  progress: ProgressSnapshot,
  trainingFocus: TrainingFocusInput
): DrillSuggestion {
  if (rec.recommendedMode === 'drill' && rec.primarySkill) {
    return { primarySkill: rec.primarySkill, rationale: rec.rationale };
  }
  if (rec.primarySkill) {
    return {
      primarySkill: rec.primarySkill,
      rationale: `Suggested practice focus: ${rec.rationale}`,
    };
  }
  return suggestDrillTargetFromProgress(progress, trainingFocus);
}
