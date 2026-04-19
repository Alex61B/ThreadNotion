import { Prisma } from '../../generated/prisma';
export declare function evaluateConversation(conversationId: string): Promise<{
    conversationId: string;
    summary: {
        userId: string | null;
        id: string;
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
        userId: string | null;
        id: string;
        createdAt: Date;
        score: number;
        reasoning: string;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        conversationId: string;
    }[];
    weaknessProfile: {
        userId: string;
        id: string;
        updatedAt: Date;
        createdAt: Date;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        currentScore: number;
        trendDirection: import("../../generated/prisma").$Enums.TrendDirection;
        lastSimulationId: string | null;
    }[];
}>;
export declare function getEvaluationForConversation(conversationId: string): Promise<{
    summary: {
        userId: string | null;
        id: string;
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
        userId: string | null;
        id: string;
        createdAt: Date;
        score: number;
        reasoning: string;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        conversationId: string;
    }[];
} | null>;
//# sourceMappingURL=simulationEvaluationService.d.ts.map