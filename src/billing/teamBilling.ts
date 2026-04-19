import { prisma } from '../db';
import { createCheckoutSession, createPortalSession } from './checkoutSessions';
import type { TeamSeatBundle } from './planConfig';

export async function createTeamCheckoutSession(args: {
  actingUserId: string;
  teamId: string;
  seatBundle: TeamSeatBundle;
}): Promise<{ url: string }> {
  // Acting userId is stored in metadata for audit/debug; Stripe customer/subscription attaches to Team billing account.
  return createCheckoutSession({
    userId: args.actingUserId,
    planType: 'TEAM',
    seatBundle: args.seatBundle,
    teamId: args.teamId,
  });
}

export async function createTeamPortalSession(args: { teamId: string }): Promise<{ url: string }> {
  const acct = await prisma.billingAccount.findUnique({ where: { teamId: args.teamId } });
  if (!acct) {
    throw new Error('Team has no billing account');
  }
  return createPortalSession({ stripeCustomerId: acct.stripeCustomerId });
}

