import { z } from 'zod';
import type { TrainingRecommendation } from './trainingRecommendation';
export declare const OrchestrationSourceSchema: z.ZodEnum<{
    manager_assignment: "manager_assignment";
    training_focus: "training_focus";
    weakness_engine: "weakness_engine";
    spaced_repetition: "spaced_repetition";
    mastery_adjustment: "mastery_adjustment";
    generic_fallback: "generic_fallback";
}>;
export type OrchestrationSource = z.infer<typeof OrchestrationSourceSchema>;
export declare const DifficultyLevelSchema: z.ZodEnum<{
    medium: "medium";
    easy: "easy";
    hard: "hard";
}>;
export declare const OrchestratedTrainingRecommendationSchema: z.ZodObject<{
    recommendedMode: z.ZodEnum<{
        generic: "generic";
        adaptive: "adaptive";
        drill: "drill";
    }>;
    targetSkills: z.ZodArray<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    rationale: z.ZodString;
    difficultyLevel: z.ZodOptional<z.ZodEnum<{
        medium: "medium";
        easy: "easy";
        hard: "hard";
    }>>;
    source: z.ZodOptional<z.ZodEnum<{
        manager_assignment: "manager_assignment";
        training_focus: "training_focus";
        weakness_engine: "weakness_engine";
        spaced_repetition: "spaced_repetition";
        mastery_adjustment: "mastery_adjustment";
        generic_fallback: "generic_fallback";
    }>>;
    confidence: z.ZodOptional<z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>>;
    sourceFactors: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type OrchestratedTrainingRecommendation = z.infer<typeof OrchestratedTrainingRecommendationSchema>;
export declare function toLegacyTrainingRecommendation(orch: OrchestratedTrainingRecommendation): TrainingRecommendation;
//# sourceMappingURL=trainingOrchestration.d.ts.map