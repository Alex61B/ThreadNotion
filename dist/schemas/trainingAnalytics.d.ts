import { z } from 'zod';
export declare const SimulationModeAnalyticsSchema: z.ZodEnum<{
    generic: "generic";
    adaptive: "adaptive";
    drill: "drill";
}>;
export declare const SkillAnalyticsSchema: z.ZodObject<{
    skill: z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>;
    averageScore: z.ZodNumber;
    recentAverageScore: z.ZodNumber;
    improvementRate: z.ZodNumber;
    weaknessFrequency: z.ZodNumber;
    lastSeenWeakness: z.ZodOptional<z.ZodNumber>;
    trendScores: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
export declare const ModeAnalyticsSchema: z.ZodObject<{
    mode: z.ZodEnum<{
        generic: "generic";
        adaptive: "adaptive";
        drill: "drill";
    }>;
    sessionCount: z.ZodNumber;
    averageScoreImprovement: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const TrainingAnalyticsSchema: z.ZodObject<{
    skills: z.ZodArray<z.ZodObject<{
        skill: z.ZodEnum<{
            discovery_questions: "discovery_questions";
            objection_handling: "objection_handling";
            product_knowledge: "product_knowledge";
            closing: "closing";
            storytelling: "storytelling";
            empathy: "empathy";
        }>;
        averageScore: z.ZodNumber;
        recentAverageScore: z.ZodNumber;
        improvementRate: z.ZodNumber;
        weaknessFrequency: z.ZodNumber;
        lastSeenWeakness: z.ZodOptional<z.ZodNumber>;
        trendScores: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strip>>;
    modes: z.ZodArray<z.ZodObject<{
        mode: z.ZodEnum<{
            generic: "generic";
            adaptive: "adaptive";
            drill: "drill";
        }>;
        sessionCount: z.ZodNumber;
        averageScoreImprovement: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    strongestSkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    weakestSkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    mostImprovedSkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    persistentWeakness: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    sessionsAnalyzed: z.ZodNumber;
}, z.core.$strip>;
export type SkillAnalytics = z.infer<typeof SkillAnalyticsSchema>;
export type ModeAnalytics = z.infer<typeof ModeAnalyticsSchema>;
export type TrainingAnalytics = z.infer<typeof TrainingAnalyticsSchema>;
//# sourceMappingURL=trainingAnalytics.d.ts.map