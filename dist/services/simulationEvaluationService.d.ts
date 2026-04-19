import { Prisma } from '../../generated/prisma';
export declare function evaluateConversation(conversationId: string): Promise<{
    conversationId: string;
    summary: {
        id: string;
        userId: string | null;
        createdAt: Date;
        recommendedTips: Prisma.JsonValue;
        conversationId: string;
        questionCount: number;
        avgMessageLength: number;
        talkRatio: number;
        weaknesses: Prisma.JsonValue;
        rawEvaluatorOutput: Prisma.JsonValue;
    };
    skillScores: {
        id: string;
        userId: string | null;
        createdAt: Date;
        score: number;
        reasoning: string;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        conversationId: string;
    }[];
    weaknessProfile: {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        trendDirection: import("../../generated/prisma").$Enums.TrendDirection;
        currentScore: number;
        lastSimulationId: string | null;
    }[];
}>;
export declare function getEvaluationForConversation(conversationId: string): Promise<{
    summary: {
        id: string;
        userId: string | null;
        createdAt: Date;
        recommendedTips: Prisma.JsonValue;
        conversationId: string;
        questionCount: number;
        avgMessageLength: number;
        talkRatio: number;
        weaknesses: Prisma.JsonValue;
        rawEvaluatorOutput: Prisma.JsonValue;
    };
    skillScores: {
        id: string;
        userId: string | null;
        createdAt: Date;
        score: number;
        reasoning: string;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        conversationId: string;
    }[];
} | null>;
//# sourceMappingURL=simulationEvaluationService.d.ts.map