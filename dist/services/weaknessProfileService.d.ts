import type { SalesSkill } from '../schemas/coaching';
export declare function getMergedSkillScoresForUser(userId: string): Promise<Record<SalesSkill, number>>;
/** Top weaknesses for adaptive scenario (up to 3). Empty if user has no profile rows yet. */
export declare function getTopWeaknessesForUser(userId: string, limit: number): Promise<SalesSkill[]>;
export declare function updateProfilesAfterSimulation(args: {
    userId: string;
    conversationId: string;
    /** Per-skill score from this simulation (1–10) */
    skillScores: Record<SalesSkill, number>;
}): Promise<void>;
export declare function listWeaknessProfilesForUser(userId: string): Promise<{
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    skill: import("../../generated/prisma").$Enums.SalesSkill;
    trendDirection: import("../../generated/prisma").$Enums.TrendDirection;
    currentScore: number;
    lastSimulationId: string | null;
}[]>;
//# sourceMappingURL=weaknessProfileService.d.ts.map