import { z } from 'zod';
/** One pressure tactic the customer can apply (no raw skill enum in customer-facing copy). */
export declare const PressureTacticSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    customerLine: z.ZodString;
}, z.core.$strip>;
export type PressureTactic = z.infer<typeof PressureTacticSchema>;
export declare const AdaptiveScenarioPlanSchema: z.ZodObject<{
    targetWeaknesses: z.ZodArray<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    personaSummary: z.ZodString;
    customerContext: z.ZodString;
    scenarioGoal: z.ZodString;
    pressureTactics: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        customerLine: z.ZodString;
    }, z.core.$strip>>;
    conversationConstraints: z.ZodArray<z.ZodString>;
    coachingFocusSummary: z.ZodString;
    scenarioRationale: z.ZodString;
    scenarioTheme: z.ZodOptional<z.ZodString>;
    simulationRealism: z.ZodOptional<z.ZodObject<{
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
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AdaptiveScenarioPlan = z.infer<typeof AdaptiveScenarioPlanSchema>;
export declare function parseAdaptiveScenarioPlan(json: unknown): AdaptiveScenarioPlan;
export declare function safeParseAdaptiveScenarioPlan(json: unknown): z.ZodSafeParseResult<{
    targetWeaknesses: ("discovery_questions" | "objection_handling" | "product_knowledge" | "closing" | "storytelling" | "empathy")[];
    personaSummary: string;
    customerContext: string;
    scenarioGoal: string;
    pressureTactics: {
        id: string;
        label: string;
        customerLine: string;
    }[];
    conversationConstraints: string[];
    coachingFocusSummary: string;
    scenarioRationale: string;
    scenarioTheme?: string | undefined;
    simulationRealism?: {
        personaTraits: {
            role: string;
            domainExperience: "low" | "medium" | "high";
            riskTolerance: "low" | "medium" | "high";
            communicationStyle: "concise" | "analytical" | "story-driven" | "skeptical";
            timePressure: "low" | "medium" | "high";
            opennessToChange: "low" | "medium" | "high";
        };
        buyerKnowledgeLevel: "uninformed" | "partially_informed" | "competitor_aware" | "expert";
        customerBehavior: "skeptical" | "cooperative" | "guarded" | "impatient" | "curious";
        dealStage: "discovery_call" | "product_evaluation" | "vendor_comparison" | "final_decision";
    } | undefined;
}>;
//# sourceMappingURL=adaptiveScenarioPlan.d.ts.map