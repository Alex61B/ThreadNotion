import type { TrainingAnalytics } from '../schemas/trainingAnalytics';
import { type TeamAnalytics } from '../schemas/teamAnalytics';
/**
 * Pure aggregation for tests. Excludes users with sessionsAnalyzed === 0 from per-skill team averages
 * and from weakest/strongest user lists (no session data to rank).
 */
export declare function aggregateTeamAnalyticsFromUserAnalytics(analyticsByUser: Map<string, TrainingAnalytics>): TeamAnalytics;
export declare function buildTeamTrainingAnalytics(teamId: string): Promise<TeamAnalytics>;
//# sourceMappingURL=teamTrainingAnalyticsService.d.ts.map