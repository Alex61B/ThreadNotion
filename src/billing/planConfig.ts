export type BillingPlanType = 'INDIVIDUAL' | 'TEAM';
export type TeamSeatBundle = 10 | 25 | 50;

export type PlanDescriptor =
  | { planType: 'INDIVIDUAL' }
  | { planType: 'TEAM'; seatBundle: TeamSeatBundle };

type PriceId = string;

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

/**
 * Central mapping from Stripe Price IDs to internal plan meaning.
 * Keep this in one place so webhooks can resolve entitlements deterministically.
 */
export function getPlanForStripePriceId(priceId: PriceId): PlanDescriptor | null {
  // Do not throw at module import time (tests may not have env configured).
  const mapping: Record<PriceId, PlanDescriptor> = {};
  const individual = process.env.STRIPE_PRICE_ID_INDIVIDUAL;
  const team10 = process.env.STRIPE_PRICE_ID_TEAM_10;
  const team25 = process.env.STRIPE_PRICE_ID_TEAM_25;
  const team50 = process.env.STRIPE_PRICE_ID_TEAM_50;
  if (individual) mapping[individual] = { planType: 'INDIVIDUAL' };
  if (team10) mapping[team10] = { planType: 'TEAM', seatBundle: 10 };
  if (team25) mapping[team25] = { planType: 'TEAM', seatBundle: 25 };
  if (team50) mapping[team50] = { planType: 'TEAM', seatBundle: 50 };
  return mapping[priceId] ?? null;
}

export function getPriceIdForPlan(input: PlanDescriptor): string {
  if (input.planType === 'INDIVIDUAL') return reqEnv('STRIPE_PRICE_ID_INDIVIDUAL');
  if (input.seatBundle === 10) return reqEnv('STRIPE_PRICE_ID_TEAM_10');
  if (input.seatBundle === 25) return reqEnv('STRIPE_PRICE_ID_TEAM_25');
  return reqEnv('STRIPE_PRICE_ID_TEAM_50');
}

