import { z } from 'zod';
export declare const CreateCheckoutSessionBodySchema: z.ZodObject<{
    userId: z.ZodString;
    planType: z.ZodEnum<{
        INDIVIDUAL: "INDIVIDUAL";
        TEAM: "TEAM";
    }>;
    seatBundle: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<10>, z.ZodLiteral<25>, z.ZodLiteral<50>]>>;
    teamId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateCheckoutSessionBody = z.infer<typeof CreateCheckoutSessionBodySchema>;
export declare function createCheckoutSession(input: CreateCheckoutSessionBody): Promise<{
    url: string;
}>;
export declare const CreatePortalSessionBodySchema: z.ZodObject<{
    stripeCustomerId: z.ZodString;
}, z.core.$strip>;
export type CreatePortalSessionBody = z.infer<typeof CreatePortalSessionBodySchema>;
export declare function createPortalSession(input: CreatePortalSessionBody): Promise<{
    url: string;
}>;
//# sourceMappingURL=checkoutSessions.d.ts.map