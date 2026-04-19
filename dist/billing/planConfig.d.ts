export type BillingPlanType = 'INDIVIDUAL' | 'TEAM';
export type TeamSeatBundle = 10 | 25 | 50;
export type PlanDescriptor = {
    planType: 'INDIVIDUAL';
} | {
    planType: 'TEAM';
    seatBundle: TeamSeatBundle;
};
type PriceId = string;
/**
 * Central mapping from Stripe Price IDs to internal plan meaning.
 * Keep this in one place so webhooks can resolve entitlements deterministically.
 */
export declare function getPlanForStripePriceId(priceId: PriceId): PlanDescriptor | null;
export declare function getPriceIdForPlan(input: PlanDescriptor): string;
export {};
//# sourceMappingURL=planConfig.d.ts.map