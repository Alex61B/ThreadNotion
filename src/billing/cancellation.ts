import { prisma } from '../db';
import { getStripe } from './stripeClient';

export async function cancelSubscriptionForBillingAccount(args: { billingAccountId: string }): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { billingAccountId: args.billingAccountId } });
  if (!sub?.stripeSubscriptionId) return;
  const stripe = getStripe();
  await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
}

export async function cancelUserSubscriptionsOnDelete(args: { userId: string }): Promise<void> {
  const acct = await prisma.billingAccount.findUnique({ where: { userId: args.userId } });
  if (!acct) return;
  await cancelSubscriptionForBillingAccount({ billingAccountId: acct.id });
}

export async function cancelTeamSubscriptionsOnDelete(args: { teamId: string }): Promise<void> {
  const acct = await prisma.billingAccount.findUnique({ where: { teamId: args.teamId } });
  if (!acct) return;
  await cancelSubscriptionForBillingAccount({ billingAccountId: acct.id });
}

