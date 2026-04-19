import { z } from 'zod';
import { getStripe } from './stripeClient';
import { getPriceIdForPlan, type PlanDescriptor, type TeamSeatBundle } from './planConfig';

export const CreateCheckoutSessionBodySchema = z.object({
  userId: z.string().min(1),
  planType: z.enum(['INDIVIDUAL', 'TEAM']),
  seatBundle: z.union([z.literal(10), z.literal(25), z.literal(50)]).optional(),
  teamId: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.planType === 'TEAM' && !data.teamId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'teamId is required for TEAM plan checkout',
      path: ['teamId'],
    });
  }
});

export type CreateCheckoutSessionBody = z.infer<typeof CreateCheckoutSessionBodySchema>;

function requireFrontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

export async function createCheckoutSession(input: CreateCheckoutSessionBody): Promise<{ url: string }> {
  const stripe = getStripe();
  const frontendUrl = requireFrontendUrl();

  let plan: PlanDescriptor;
  if (input.planType === 'INDIVIDUAL') {
    plan = { planType: 'INDIVIDUAL' };
  } else {
    const bundle = (input.seatBundle ?? 10) as TeamSeatBundle;
    plan = { planType: 'TEAM', seatBundle: bundle };
  }

  const priceId = getPriceIdForPlan(plan);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/billing/cancel`,
    metadata: {
      userId: input.userId,
      ...(input.teamId ? { teamId: input.teamId } : {}),
      planType: input.planType,
      ...(input.planType === 'TEAM' ? { seatBundle: String(input.seatBundle ?? 10) } : {}),
    },
  });

  if (!session.url) throw new Error('Stripe checkout session missing url');
  return { url: session.url };
}

export const CreatePortalSessionBodySchema = z.object({
  stripeCustomerId: z.string().min(1),
});

export type CreatePortalSessionBody = z.infer<typeof CreatePortalSessionBodySchema>;

export async function createPortalSession(input: CreatePortalSessionBody): Promise<{ url: string }> {
  const stripe = getStripe();
  const frontendUrl = requireFrontendUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: `${frontendUrl}/billing`,
  });
  return { url: session.url };
}

