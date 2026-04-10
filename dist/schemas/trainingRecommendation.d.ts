import { z } from 'zod';
export declare const SimulationModeRecommendationSchema: z.ZodEnum<{
    generic: "generic";
    adaptive: "adaptive";
    drill: "drill";
}>;
export declare const ConfidenceSchema: z.ZodEnum<{
    low: "low";
    medium: "medium";
    high: "high";
}>;
export declare const TrainingRecommendationSchema: z.ZodObject<{
    recommendedMode: z.ZodEnum<{
        generic: "generic";
        adaptive: "adaptive";
        drill: "drill";
    }>;
    primarySkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    secondarySkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    rationale: z.ZodString;
    confidence: z.ZodOptional<z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>>;
    sourceFactors: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type TrainingRecommendation = z.infer<typeof TrainingRecommendationSchema>;
//# sourceMappingURL=trainingRecommendation.d.ts.map