import type { DrillSuggestion } from '../domain/drill/drillRecommendation';
import type { ProgressSnapshot } from '../schemas/progressSnapshot';
import type { TrainingRecommendation } from '../schemas/trainingRecommendation';
import type { OrchestratedTrainingRecommendation } from '../schemas/trainingOrchestration';
import type { TrainingFocusRow } from './userTrainingFocusService';
export type TrainingRecommendationBundle = {
    progressSnapshot: ProgressSnapshot;
    trainingRecommendation: TrainingRecommendation;
    drillSuggestion: DrillSuggestion;
    trainingFocusRow: TrainingFocusRow | null;
    orchestratedRecommendation: OrchestratedTrainingRecommendation;
};
/**
 * Progress snapshot + recent graded context + orchestrated recommendation + legacy drill shim.
 */
export declare function buildTrainingRecommendationBundle(userId: string): Promise<TrainingRecommendationBundle>;
//# sourceMappingURL=trainingRecommendationService.d.ts.map