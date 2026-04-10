import type { SalesSkill } from '../../schemas/coaching';
import type { ProgressSnapshot } from '../../schemas/progressSnapshot';
import type { OrchestratedTrainingRecommendation } from '../../schemas/trainingOrchestration';
import type { TrainingFocusInput } from '../drill/drillRecommendation';
import type { RecentGradedSession } from './recentGradedSession';
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
export declare function buildOrchestratedRecommendation(input: OrchestrationEngineInput): OrchestratedTrainingRecommendation;
//# sourceMappingURL=trainingOrchestrationEngine.d.ts.map