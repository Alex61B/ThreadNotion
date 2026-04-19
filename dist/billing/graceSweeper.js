"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepExpiredGracePeriods = sweepExpiredGracePeriods;
const db_1 = require("../db");
const entitlements_1 = require("./entitlements");
const teamEntitlements_1 = require("./teamEntitlements");
/**
 * Completes grace periods deterministically:
 * - PAST_DUE with gracePeriodEndsAt <= now => SUSPENDED and entitlement downgraded to FREE.
 *
 * Stripe remains the source of truth for payment success/failure events, but
 * this makes expiry deterministic even if no requests hit protected endpoints.
 */
async function sweepExpiredGracePeriods(now = new Date()) {
    const expired = await db_1.prisma.subscription.findMany({
        where: {
            status: 'PAST_DUE',
            gracePeriodEndsAt: { lte: now },
        },
        include: { billingAccount: true },
    });
    let updated = 0;
    for (const sub of expired) {
        // Multi-instance safety: use conditional update so only one instance "wins" the downgrade.
        // MVP note: this is best-effort coordination; long-term, run the sweeper as a single scheduled job/worker.
        const res = await db_1.prisma.subscription.updateMany({
            where: { billingAccountId: sub.billingAccountId, status: 'PAST_DUE', gracePeriodEndsAt: { lte: now } },
            data: { status: 'SUSPENDED' },
        });
        if (res.count === 0)
            continue;
        const acct = sub.billingAccount;
        if (acct.teamId) {
            await (0, teamEntitlements_1.upsertTeamEntitlement)({ teamId: acct.teamId, planType: 'FREE', seatBundle: 'NONE' });
        }
        else if (acct.userId) {
            await (0, entitlements_1.upsertUserEntitlement)({ userId: acct.userId, planType: 'FREE' });
        }
        updated++;
    }
    return updated;
}
//# sourceMappingURL=graceSweeper.js.map