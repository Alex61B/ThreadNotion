import type { DrillSuggestion } from '../domain/drill/drillRecommendation';
import { drillSuggestionFromTrainingRecommendation } from '../domain/training/trainingRecommendationEngine';
import type { ProgressSnapshot } from '../schemas/progressSnapshot';
import type { TrainingRecommendation } from '../schemas/trainingRecommendation';
import type { OrchestratedTrainingRecommendation } from '../schemas/trainingOrchestration';
import { toLegacyTrainingRecommendation } from '../schemas/trainingOrchestration';
import { buildOrchestrationInputs } from './trainingOrchestrationService';
import { buildOrchestratedRecommendation } from '../domain/training/trainingOrchestrationEngine';
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
export async function buildTrainingRecommendationBundle(userId: string): Promise<TrainingRecommendationBundle> {
  const { progress, trainingFocus, recentSessions, assignments, trainingFocusRow } =
    await buildOrchestrationInputs(userId);

  const orchestratedRecommendation = buildOrchestratedRecommendation({
    progress,
    trainingFocus,
    recentSessions,
    assignments,
  });

  const trainingRecommendation = toLegacyTrainingRecommendation(orchestratedRecommendation);

  const drillSuggestion = drillSuggestionFromTrainingRecommendation(
    trainingRecommendation,
    progress,
    trainingFocus
  );

  return {
    progressSnapshot: progress,
    trainingRecommendation,
    drillSuggestion,
    trainingFocusRow,
    orchestratedRecommendation,
  };
}
