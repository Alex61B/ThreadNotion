import type { SalesSkill } from '../../schemas/coaching';
export type RecentGradedSession = {
    conversationId: string;
    createdAt: Date;
    simulationMode: 'generic' | 'adaptive' | 'drill';
    drillPrimarySkill?: SalesSkill;
    drillSecondarySkill?: SalesSkill;
    adaptiveTargetWeaknesses: SalesSkill[];
    /** Lowest-scoring skill in that graded session when all six scores exist. */
    lowestSkillInSession?: SalesSkill;
};
/** Count consecutive drills (from newest) targeting the same primary skill. */
export declare function consecutiveDrillStreakForSkill(sessions: RecentGradedSession[], skill: SalesSkill): number;
/** True if the last N sessions share the same lowest skill (when all have lowestSkillInSession). */
export declare function stagnationSameLowest(sessions: RecentGradedSession[], n: number): SalesSkill | null;
/**
 * Sessions are newest-first. Returns how many graded sessions sit above the last time `skill`
 * was practiced in drill/adaptive/lowest-skill context. 0 = touched in the latest session.
 */
export declare function sessionsSinceLastTouchedSkill(sessions: RecentGradedSession[], skill: SalesSkill): number;
/** Primary focus skill from the most recent graded session, if inferable. */
export declare function lastPracticedSkillFromSessions(sessions: RecentGradedSession[]): SalesSkill | undefined;
//# sourceMappingURL=recentGradedSession.d.ts.map