import type { SubscriptionSeatBundle, SubscriptionPlanType } from '../../generated/prisma';
export declare function maxSeatsFromBundle(bundle: SubscriptionSeatBundle): number;
export declare function getTeamDailyTokenLimit(bundle: SubscriptionSeatBundle): number;
export declare function upsertTeamEntitlement(args: {
    teamId: string;
    planType: SubscriptionPlanType;
    seatBundle: SubscriptionSeatBundle;
}): Promise<void>;
//# sourceMappingURL=teamEntitlements.d.ts.map