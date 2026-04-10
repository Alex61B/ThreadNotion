import { z } from 'zod';
export declare const SALES_SKILLS: readonly ["discovery_questions", "objection_handling", "product_knowledge", "closing", "storytelling", "empathy"];
export type SalesSkill = (typeof SALES_SKILLS)[number];
export declare const SalesSkillSchema: z.ZodEnum<{
    discovery_questions: "discovery_questions";
    objection_handling: "objection_handling";
    product_knowledge: "product_knowledge";
    closing: "closing";
    storytelling: "storytelling";
    empathy: "empathy";
}>;
/** Transcript-grounded coaching narrative (Phase 3). */
export declare const CoachingFeedbackBlockSchema: z.ZodObject<{
    strengths: z.ZodArray<z.ZodObject<{
        skill: z.ZodEnum<{
            discovery_questions: "discovery_questions";
            objection_handling: "objection_handling";
            product_knowledge: "product_knowledge";
            closing: "closing";
            storytelling: "storytelling";
            empathy: "empathy";
        }>;
        explanation: z.ZodString;
    }, z.core.$strip>>;
    improvementAreas: z.ZodArray<z.ZodObject<{
        skill: z.ZodEnum<{
            discovery_questions: "discovery_questions";
            objection_handling: "objection_handling";
            product_knowledge: "product_knowledge";
            closing: "closing";
            storytelling: "storytelling";
            empathy: "empathy";
        }>;
        explanation: z.ZodString;
    }, z.core.$strip>>;
    keyMoments: z.ZodArray<z.ZodObject<{
        skill: z.ZodEnum<{
            discovery_questions: "discovery_questions";
            objection_handling: "objection_handling";
            product_knowledge: "product_knowledge";
            closing: "closing";
            storytelling: "storytelling";
            empathy: "empathy";
        }>;
        customerMessage: z.ZodOptional<z.ZodString>;
        userMessage: z.ZodOptional<z.ZodString>;
        whyItMatters: z.ZodString;
        suggestedApproach: z.ZodString;
    }, z.core.$strip>>;
    nextTimeFocus: z.ZodArray<z.ZodString>;
    overallCoachingSummary: z.ZodString;
}, z.core.$strip>;
export type CoachingFeedback = z.infer<typeof CoachingFeedbackBlockSchema>;
/**
 * Strict LLM output for new evaluations (Phase 3).
 */
export declare const SalesEvaluationLLMSchema: z.ZodObject<{
    skills: z.ZodObject<{
        discovery_questions: z.ZodObject<{
            score: z.ZodCoercedNumber<unknown>;
            reasoning: z.ZodString;
        }, z.core.$strip>;
        objection_handling: z.ZodObject<{
            score: z.ZodCoercedNumber<unknown>;
            reasoning: z.ZodString;
        }, z.core.$strip>;
        product_knowledge: z.ZodObject<{
            score: z.ZodCoercedNumber<unknown>;
            reasoning: z.ZodString;
        }, z.core.$strip>;
        closing: z.ZodObject<{
            score: z.ZodCoercedNumber<unknown>;
            reasoning: z.ZodString;
        }, z.core.$strip>;
        storytelling: z.ZodObject<{
            score: z.ZodCoercedNumber<unknown>;
            reasoning: z.ZodString;
        }, z.core.$strip>;
        empathy: z.ZodObject<{
            score: z.ZodCoercedNumber<unknown>;
            reasoning: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
    topWeaknesses: z.ZodArray<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    recommendedTips: z.ZodArray<z.ZodString>;
    coaching: z.ZodObject<{
        strengths: z.ZodArray<z.ZodObject<{
            skill: z.ZodEnum<{
                discovery_questions: "discovery_questions";
                objection_handling: "objection_handling";
                product_knowledge: "product_knowledge";
                closing: "closing";
                storytelling: "storytelling";
                empathy: "empathy";
            }>;
            explanation: z.ZodString;
        }, z.core.$strip>>;
        improvementAreas: z.ZodArray<z.ZodObject<{
            skill: z.ZodEnum<{
                discovery_questions: "discovery_questions";
                objection_handling: "objection_handling";
                product_knowledge: "product_knowledge";
                closing: "closing";
                storytelling: "storytelling";
                empathy: "empathy";
            }>;
            explanation: z.ZodString;
        }, z.core.$strip>>;
        keyMoments: z.ZodArray<z.ZodObject<{
            skill: z.ZodEnum<{
                discovery_questions: "discovery_questions";
                objection_handling: "objection_handling";
                product_knowledge: "product_knowledge";
                closing: "closing";
                storytelling: "storytelling";
                empathy: "empathy";
            }>;
            customerMessage: z.ZodOptional<z.ZodString>;
            userMessage: z.ZodOptional<z.ZodString>;
            whyItMatters: z.ZodString;
            suggestedApproach: z.ZodString;
        }, z.core.$strip>>;
        nextTimeFocus: z.ZodArray<z.ZodString>;
        overallCoachingSummary: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SalesEvaluationLLM = z.infer<typeof SalesEvaluationLLMSchema>;
/**
 * Extract validated coaching block from persisted raw evaluator output (backward compatible).
 */
export declare function extractCoachingFeedbackFromRaw(raw: unknown): CoachingFeedback | null;
//# sourceMappingURL=coaching.d.ts.map