/**
 * In-memory Prisma subset for simulationEvaluationService integration tests.
 */
type ProfileRow = {
    id: string;
    userId: string;
    skill: string;
    currentScore: number;
    trendDirection: string;
    lastSimulationId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
export declare function createEvaluationPrismaMock(): {
    prisma: any;
    reset(): void;
    seedConversation(row: any): void;
    getSummary(): Map<string, any>;
    getScores(): Map<string, any[]>;
    getProfiles(): Map<string, ProfileRow>;
};
export {};
//# sourceMappingURL=mockPrismaEvaluation.d.ts.map