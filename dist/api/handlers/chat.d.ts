import { z } from 'zod';
import type { JsonHandlerResult } from '../httpTypes';
export declare const ChatReq: z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    personaId: z.ZodString;
    productId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    mode: z.ZodOptional<z.ZodEnum<{
        assistant: "assistant";
        roleplay: "roleplay";
    }>>;
    simulationMode: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        generic: "generic";
        adaptive: "adaptive";
        drill: "drill";
        mixed_practice: "mixed_practice";
    }>>>;
    primaryDrillSkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    secondaryDrillSkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    variantSeed: z.ZodOptional<z.ZodString>;
    liveCoachingEnabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare function postChat(rawBody: unknown): Promise<JsonHandlerResult>;
//# sourceMappingURL=chat.d.ts.map