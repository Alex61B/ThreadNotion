import type { TrainingFocusInput } from '../domain/drill/drillRecommendation';
import { type ManagerAssignmentInput } from '../domain/training/trainingOrchestrationEngine';
import type { OrchestratedTrainingRecommendation } from '../schemas/trainingOrchestration';
export declare function getOrchestratedRecommendationForUser(userId: string): Promise<OrchestratedTrainingRecommendation>;
export declare function buildOrchestrationInputs(userId: string): Promise<{
    progress: {
        skills: {
            skill: "discovery_questions" | "objection_handling" | "product_knowledge" | "closing" | "storytelling" | "empathy";
            currentScore: number;
            trendDirection: "improving" | "declining" | "stable";
            latestSimulationScore?: number | undefined;
            previousSimulationScore?: number | undefined;
            latestDelta?: number | undefined;
        }[];
        lowestSkills: ("discovery_questions" | "objection_handling" | "product_knowledge" | "closing" | "storytelling" | "empathy")[];
        recommendedFocusSkills: ("discovery_questions" | "objection_handling" | "product_knowledge" | "closing" | "storytelling" | "empathy")[];
        overallProgressSummary: string;
        recommendedFocusMessage?: string | undefined;
    };
    trainingFocus: TrainingFocusInput;
    recentSessions: import("./recentTrainingContextService").RecentGradedSession[];
    assignments: ManagerAssignmentInput[];
    trainingFocusRow: import("./userTrainingFocusService").TrainingFocusRow | null;
}>;
//# sourceMappingURL=trainingOrchestrationService.d.ts.map