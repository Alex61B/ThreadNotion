import { z } from 'zod';
export declare const DomainExperienceSchema: z.ZodEnum<{
    low: "low";
    medium: "medium";
    high: "high";
}>;
export type DomainExperience = z.infer<typeof DomainExperienceSchema>;
export declare const RiskToleranceSchema: z.ZodEnum<{
    low: "low";
    medium: "medium";
    high: "high";
}>;
export type RiskTolerance = z.infer<typeof RiskToleranceSchema>;
export declare const CommunicationStyleSchema: z.ZodEnum<{
    concise: "concise";
    analytical: "analytical";
    "story-driven": "story-driven";
    skeptical: "skeptical";
}>;
export type CommunicationStyle = z.infer<typeof CommunicationStyleSchema>;
export declare const TimePressureSchema: z.ZodEnum<{
    low: "low";
    medium: "medium";
    high: "high";
}>;
export type TimePressure = z.infer<typeof TimePressureSchema>;
export declare const OpennessToChangeSchema: z.ZodEnum<{
    low: "low";
    medium: "medium";
    high: "high";
}>;
export type OpennessToChange = z.infer<typeof OpennessToChangeSchema>;
export declare const PersonaTraitsSchema: z.ZodObject<{
    role: z.ZodString;
    domainExperience: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>;
    riskTolerance: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>;
    communicationStyle: z.ZodEnum<{
        concise: "concise";
        analytical: "analytical";
        "story-driven": "story-driven";
        skeptical: "skeptical";
    }>;
    timePressure: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>;
    opennessToChange: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>;
}, z.core.$strip>;
export type PersonaTraits = z.infer<typeof PersonaTraitsSchema>;
export declare const BuyerKnowledgeLevelSchema: z.ZodEnum<{
    uninformed: "uninformed";
    partially_informed: "partially_informed";
    competitor_aware: "competitor_aware";
    expert: "expert";
}>;
export type BuyerKnowledgeLevel = z.infer<typeof BuyerKnowledgeLevelSchema>;
export declare const CustomerBehaviorSchema: z.ZodEnum<{
    skeptical: "skeptical";
    cooperative: "cooperative";
    guarded: "guarded";
    impatient: "impatient";
    curious: "curious";
}>;
export type CustomerBehavior = z.infer<typeof CustomerBehaviorSchema>;
export declare const DealStageSchema: z.ZodEnum<{
    discovery_call: "discovery_call";
    product_evaluation: "product_evaluation";
    vendor_comparison: "vendor_comparison";
    final_decision: "final_decision";
}>;
export type DealStage = z.infer<typeof DealStageSchema>;
export declare const SimulationRealismSchema: z.ZodObject<{
    personaTraits: z.ZodObject<{
        role: z.ZodString;
        domainExperience: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
        }>;
        riskTolerance: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
        }>;
        communicationStyle: z.ZodEnum<{
            concise: "concise";
            analytical: "analytical";
            "story-driven": "story-driven";
            skeptical: "skeptical";
        }>;
        timePressure: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
        }>;
        opennessToChange: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
        }>;
    }, z.core.$strip>;
    buyerKnowledgeLevel: z.ZodEnum<{
        uninformed: "uninformed";
        partially_informed: "partially_informed";
        competitor_aware: "competitor_aware";
        expert: "expert";
    }>;
    customerBehavior: z.ZodEnum<{
        skeptical: "skeptical";
        cooperative: "cooperative";
        guarded: "guarded";
        impatient: "impatient";
        curious: "curious";
    }>;
    dealStage: z.ZodEnum<{
        discovery_call: "discovery_call";
        product_evaluation: "product_evaluation";
        vendor_comparison: "vendor_comparison";
        final_decision: "final_decision";
    }>;
}, z.core.$strip>;
export type SimulationRealism = z.infer<typeof SimulationRealismSchema>;
//# sourceMappingURL=types.d.ts.map