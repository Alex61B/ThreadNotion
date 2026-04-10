import type { ProgressSnapshot } from '../../schemas/progressSnapshot';
import type { TrainingRecommendation } from '../../schemas/trainingRecommendation';
import { type TrainingFocusInput, type DrillSuggestion } from '../drill/drillRecommendation';
import { type RecentGradedSession } from './recentGradedSession';
/**
 * Deterministic training mode + skills from profile, pinned focus, and recent graded sessions.
 */
export declare function computeTrainingRecommendation(progress: ProgressSnapshot, trainingFocus: TrainingFocusInput, recentSessions: RecentGradedSession[]): TrainingRecommendation;
/** Backward-compatible drill line item when clients expect `drillSuggestion` only. */
export declare function drillSuggestionFromTrainingRecommendation(rec: TrainingRecommendation, progress: ProgressSnapshot, trainingFocus: TrainingFocusInput): DrillSuggestion;
//# sourceMappingURL=trainingRecommendationEngine.d.ts.map