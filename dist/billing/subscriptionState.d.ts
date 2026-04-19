import type { SubscriptionPlanType, SubscriptionSeatBundle, SubscriptionStatus } from '../../generated/prisma';
export declare function mapStripeSubscriptionStatus(s: string): SubscriptionStatus;
export declare function planTypeFromStripePriceId(priceId: string | null | undefined): SubscriptionPlanType;
export declare function seatBundleFromStripePriceId(priceId: string | null | undefined): SubscriptionSeatBundle;
//# sourceMappingURL=subscriptionState.d.ts.map