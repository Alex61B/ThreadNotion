import { z } from 'zod';
export declare const TrendDirectionSchema: z.ZodEnum<{
    improving: "improving";
    declining: "declining";
    stable: "stable";
}>;
export declare const SkillProgressSchema: z.ZodObject<{
    skill: z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>;
    currentScore: z.ZodNumber;
    trendDirection: z.ZodEnum<{
        improving: "improving";
        declining: "declining";
        stable: "stable";
    }>;
    latestSimulationScore: z.ZodOptional<z.ZodNumber>;
    previousSimulationScore: z.ZodOptional<z.ZodNumber>;
    latestDelta: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type SkillProgress = z.infer<typeof SkillProgressSchema>;
export declare const ProgressSnapshotSchema: z.ZodObject<{
    skills: z.ZodArray<z.ZodObject<{
        skill: z.ZodEnum<{
            discovery_questions: "discovery_questions";
            objection_handling: "objection_handling";
            product_knowledge: "product_knowledge";
            closing: "closing";
            storytelling: "storytelling";
            empathy: "empathy";
        }>;
        currentScore: z.ZodNumber;
        trendDirection: z.ZodEnum<{
            improving: "improving";
            declining: "declining";
            stable: "stable";
        }>;
        latestSimulationScore: z.ZodOptional<z.ZodNumber>;
        previousSimulationScore: z.ZodOptional<z.ZodNumber>;
        latestDelta: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    lowestSkills: z.ZodArray<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    recommendedFocusSkills: z.ZodArray<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    recommendedFocusMessage: z.ZodOptional<z.ZodString>;
    overallProgressSummary: z.ZodString;
}, z.core.$strip>;
export type ProgressSnapshot = z.infer<typeof ProgressSnapshotSchema>;
//# sourceMappingURL=progressSnapshot.d.ts.map