import { prisma } from '../db';
import { upsertUserEntitlement } from './entitlements';
import { upsertTeamEntitlement } from './teamEntitlements';

/**
 * Completes grace periods deterministically:
 * - PAST_DUE with gracePeriodEndsAt <= now => SUSPENDED and entitlement downgraded to FREE.
 *
 * Stripe remains the source of truth for payment success/failure events, but
 * this makes expiry deterministic even if no requests hit protected endpoints.
 */
export async function sweepExpiredGracePeriods(now: Date = new Date()): Promise<number> {
  const expired = await prisma.subscription.findMany({
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
    const res = await prisma.subscription.updateMany({
      where: { billingAccountId: sub.billingAccountId, status: 'PAST_DUE', gracePeriodEndsAt: { lte: now } },
      data: { status: 'SUSPENDED' },
    });
    if (res.count === 0) continue;
    const acct = sub.billingAccount;
    if (acct.teamId) {
      await upsertTeamEntitlement({ teamId: acct.teamId, planType: 'FREE', seatBundle: 'NONE' });
    } else if (acct.userId) {
      await upsertUserEntitlement({ userId: acct.userId, planType: 'FREE' });
    }
    updated++;
  }
  return updated;
}

