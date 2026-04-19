import type { SubscriptionPlanType, SubscriptionSeatBundle, SubscriptionStatus } from '../../generated/prisma';
import { getPlanForStripePriceId } from './planConfig';

export function mapStripeSubscriptionStatus(s: string): SubscriptionStatus {
  switch (s) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    default:
      return 'INACTIVE';
  }
}

export function planTypeFromStripePriceId(priceId: string | null | undefined): SubscriptionPlanType {
  if (!priceId) return 'FREE';
  const plan = getPlanForStripePriceId(priceId);
  if (!plan) return 'FREE';
  return plan.planType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM';
}

export function seatBundleFromStripePriceId(priceId: string | null | undefined): SubscriptionSeatBundle {
  if (!priceId) return 'NONE';
  const plan = getPlanForStripePriceId(priceId);
  if (!plan || plan.planType !== 'TEAM') return 'NONE';
  return plan.seatBundle === 10 ? 'SEATS_10' : plan.seatBundle === 25 ? 'SEATS_25' : 'SEATS_50';
}

