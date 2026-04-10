import type { SalesSkill } from '../../schemas/coaching';
import type { ProgressSnapshot } from '../../schemas/progressSnapshot';
export type TrainingFocusInput = {
    focusSkills: SalesSkill[];
    sessionsRemaining: number | null;
} | null;
export type DrillSuggestion = {
    primarySkill: SalesSkill;
    rationale: string;
};
/**
 * Deterministic next drill target from progress snapshot and optional pinned training focus.
 */
export declare function suggestDrillTargetFromProgress(progress: ProgressSnapshot, trainingFocus: TrainingFocusInput): DrillSuggestion;
//# sourceMappingURL=drillRecommendation.d.ts.map