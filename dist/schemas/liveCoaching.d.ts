import { z } from 'zod';
export declare const LiveCoachingConfidenceSchema: z.ZodEnum<{
    low: "low";
    medium: "medium";
    high: "high";
}>;
export declare const LiveCoachingSuggestionSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>;
    message: z.ZodString;
    rationale: z.ZodOptional<z.ZodString>;
    confidence: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>;
    triggerSource: z.ZodString;
}, z.core.$strip>;
export type LiveCoachingSuggestion = z.infer<typeof LiveCoachingSuggestionSchema>;
/** Persisted on Conversation.liveCoachingMeta for cooldown and dedupe. */
export declare const LiveCoachingMetaSchema: z.ZodObject<{
    lastSuggestionUserTurnIndex: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    suggestionsShown: z.ZodOptional<z.ZodNumber>;
    recentKinds: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>>;
}, z.core.$strip>;
export type LiveCoachingMeta = z.infer<typeof LiveCoachingMetaSchema>;
export declare function parseLiveCoachingMeta(raw: unknown): LiveCoachingMeta;
//# sourceMappingURL=liveCoaching.d.ts.map