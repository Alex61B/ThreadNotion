import type { SubscriptionPlanType } from '../../generated/prisma';
export declare const FREE_SIMULATION_LIMIT = 5;
export declare function getFreeDailyTokenLimit(): number;
export declare function getIndividualDailyTokenLimit(): number;
export declare function upsertUserEntitlement(args: {
    userId: string;
    planType: SubscriptionPlanType;
}): Promise<void>;
//# sourceMappingURL=entitlements.d.ts.map