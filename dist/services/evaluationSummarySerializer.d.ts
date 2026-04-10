import type { SimulationEvaluationSummary } from '../../generated/prisma';
/** API-safe summary row including optional Phase 3 coaching narrative. */
export declare function serializeCoachingSummary(summary: SimulationEvaluationSummary): {
    id: string;
    conversationId: string;
    userId: string | null;
    questionCount: number;
    avgMessageLength: number;
    talkRatio: number;
    weaknesses: import("../../generated/prisma/runtime/library").JsonValue;
    recommendedTips: import("../../generated/prisma/runtime/library").JsonValue;
    createdAt: string;
    coachingFeedback: {
        strengths: {
            skill: "discovery_questions" | "objection_handling" | "product_knowledge" | "closing" | "storytelling" | "empathy";
            explanation: string;
        }[];
        improvementAreas: {
            skill: "discovery_questions" | "objection_handling" | "product_knowledge" | "closing" | "storytelling" | "empathy";
            explanation: string;
        }[];
        keyMoments: {
            skill: "discovery_questions" | "objection_handling" | "product_knowledge" | "closing" | "storytelling" | "empathy";
            whyItMatters: string;
            suggestedApproach: string;
            customerMessage?: string | undefined;
            userMessage?: string | undefined;
        }[];
        nextTimeFocus: string[];
        overallCoachingSummary: string;
    } | null;
};
//# sourceMappingURL=evaluationSummarySerializer.d.ts.map