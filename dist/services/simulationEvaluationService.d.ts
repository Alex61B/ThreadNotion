import { Prisma } from '../../generated/prisma';
export declare function evaluateConversation(conversationId: string): Promise<{
    conversationId: string;
    summary: {
        id: string;
        recommendedTips: Prisma.JsonValue;
        userId: string | null;
        createdAt: Date;
        conversationId: string;
        questionCount: number;
        avgMessageLength: number;
        talkRatio: number;
        weaknesses: Prisma.JsonValue;
        rawEvaluatorOutput: Prisma.JsonValue;
    };
    skillScores: {
        id: string;
        score: number;
        reasoning: string;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        userId: string | null;
        createdAt: Date;
        conversationId: string;
    }[];
    weaknessProfile: {
        id: string;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        userId: string;
        currentScore: number;
        trendDirection: import("../../generated/prisma").$Enums.TrendDirection;
        lastSimulationId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[];
}>;
export declare function getEvaluationForConversation(conversationId: string): Promise<{
    summary: {
        id: string;
        recommendedTips: Prisma.JsonValue;
        userId: string | null;
        createdAt: Date;
        conversationId: string;
        questionCount: number;
        avgMessageLength: number;
        talkRatio: number;
        weaknesses: Prisma.JsonValue;
        rawEvaluatorOutput: Prisma.JsonValue;
    };
    skillScores: {
        id: string;
        score: number;
        reasoning: string;
        skill: import("../../generated/prisma").$Enums.SalesSkill;
        userId: string | null;
        createdAt: Date;
        conversationId: string;
    }[];
} | null>;
//# sourceMappingURL=simulationEvaluationService.d.ts.map