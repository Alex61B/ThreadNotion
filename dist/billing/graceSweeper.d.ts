/**
 * Completes grace periods deterministically:
 * - PAST_DUE with gracePeriodEndsAt <= now => SUSPENDED and entitlement downgraded to FREE.
 *
 * Stripe remains the source of truth for payment success/failure events, but
 * this makes expiry deterministic even if no requests hit protected endpoints.
 */
export declare function sweepExpiredGracePeriods(now?: Date): Promise<number>;
//# sourceMappingURL=graceSweeper.d.ts.map