import { z } from 'zod';
export declare const TeamSkillAnalyticsSchema: z.ZodObject<{
    skill: z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>;
    averageScore: z.ZodNumber;
    weakestUsers: z.ZodArray<z.ZodString>;
    strongestUsers: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const TeamAnalyticsSchema: z.ZodObject<{
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
        weakestUsers: z.ZodArray<z.ZodString>;
        strongestUsers: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    teamWeakestSkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    teamStrongestSkill: z.ZodOptional<z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>>;
    averageProgress: z.ZodOptional<z.ZodNumber>;
    totalSessions: z.ZodNumber;
}, z.core.$strip>;
export type TeamSkillAnalytics = z.infer<typeof TeamSkillAnalyticsSchema>;
export type TeamAnalytics = z.infer<typeof TeamAnalyticsSchema>;
export declare const CreateTeamBodySchema: z.ZodObject<{
    name: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const AddTeamMemberBodySchema: z.ZodObject<{
    memberUserId: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<{
        manager: "manager";
        rep: "rep";
    }>>;
    displayName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CreateAssignmentBodySchema: z.ZodObject<{
    skill: z.ZodEnum<{
        discovery_questions: "discovery_questions";
        objection_handling: "objection_handling";
        product_knowledge: "product_knowledge";
        closing: "closing";
        storytelling: "storytelling";
        empathy: "empathy";
    }>;
    assignmentType: z.ZodEnum<{
        adaptive: "adaptive";
        drill: "drill";
    }>;
    targetUserId: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=teamAnalytics.d.ts.map