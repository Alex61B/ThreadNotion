import { buildProgressSnapshot } from './userProgressService';
import { getTrainingFocusForUser } from './userTrainingFocusService';
import { loadRecentGradedSessions } from './recentTrainingContextService';
import { listActiveAssignmentsForUser } from './trainingAssignmentService';
import type { TrainingFocusInput } from '../domain/drill/drillRecommendation';
import {
  buildOrchestratedRecommendation,
  type ManagerAssignmentInput,
} from '../domain/training/trainingOrchestrationEngine';
import type { OrchestratedTrainingRecommendation } from '../schemas/trainingOrchestration';

export async function getOrchestratedRecommendationForUser(
  userId: string
): Promise<OrchestratedTrainingRecommendation> {
  const inputs = await buildOrchestrationInputs(userId);
  return buildOrchestratedRecommendation(inputs);
}

export async function buildOrchestrationInputs(userId: string) {
  const [progress, trainingFocusRow, recentSessions, assignmentRows] = await Promise.all([
    buildProgressSnapshot(userId),
    getTrainingFocusForUser(userId),
    loadRecentGradedSessions(userId),
    listActiveAssignmentsForUser(userId),
  ]);

  const trainingFocus: TrainingFocusInput = trainingFocusRow
    ? {
        focusSkills: trainingFocusRow.focusSkills,
        sessionsRemaining: trainingFocusRow.sessionsRemaining,
      }
    : null;

  const assignments: ManagerAssignmentInput[] = assignmentRows.map((r) => ({
    skill: r.skill,
    assignmentType: r.assignmentType as 'drill' | 'adaptive',
    teamName: r.team.name,
  }));

  return {
    progress,
    trainingFocus,
    recentSessions,
    assignments,
    trainingFocusRow,
  };
}
