import type { GradedSessionScores } from '../domain/trainingAnalytics/types';
import { type TrainingAnalytics } from '../schemas/trainingAnalytics';
export declare function computeTrainingAnalyticsFromSessions(sessions: GradedSessionScores[]): TrainingAnalytics;
export declare function buildUserTrainingAnalytics(userId: string): Promise<TrainingAnalytics>;
//# sourceMappingURL=userTrainingAnalyticsService.d.ts.map