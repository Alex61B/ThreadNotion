import type { SalesSkill } from '../schemas/coaching';
/** Deterministic valid payload matching SalesEvaluationLLMSchema (for mocked LLM). */
export declare function validEvaluatorOutput(): {
    skills: {
        discovery_questions: {
            score: number;
            reasoning: string;
        };
        objection_handling: {
            score: number;
            reasoning: string;
        };
        product_knowledge: {
            score: number;
            reasoning: string;
        };
        closing: {
            score: number;
            reasoning: string;
        };
        storytelling: {
            score: number;
            reasoning: string;
        };
        empathy: {
            score: number;
            reasoning: string;
        };
    };
    topWeaknesses: [SalesSkill, SalesSkill, SalesSkill];
    recommendedTips: string[];
    coaching: {
        strengths: ({
            skill: "product_knowledge";
            explanation: string;
        } | {
            skill: "discovery_questions";
            explanation: string;
        })[];
        improvementAreas: ({
            skill: "closing";
            explanation: string;
        } | {
            skill: "empathy";
            explanation: string;
        })[];
        keyMoments: ({
            skill: "closing";
            userMessage: string;
            whyItMatters: string;
            suggestedApproach: string;
            customerMessage?: never;
        } | {
            skill: "discovery_questions";
            customerMessage: string;
            whyItMatters: string;
            suggestedApproach: string;
            userMessage?: never;
        })[];
        nextTimeFocus: string[];
        overallCoachingSummary: string;
    };
};
//# sourceMappingURL=evaluationFixtures.d.ts.map