import type { RecentGradedSession } from '../domain/training/recentGradedSession';
export declare const RECENT_GRADED_SESSION_LIMIT = 8;
export type { RecentGradedSession } from '../domain/training/recentGradedSession';
export { consecutiveDrillStreakForSkill, stagnationSameLowest, } from '../domain/training/recentGradedSession';
/**
 * Last N graded conversations for a user, newest first, with parsed plan metadata and per-session lowest skill.
 */
export declare function loadRecentGradedSessions(userId: string, max?: number): Promise<RecentGradedSession[]>;
//# sourceMappingURL=recentTrainingContextService.d.ts.map