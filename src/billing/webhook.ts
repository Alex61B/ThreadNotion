import type { Request } from 'express';
import { getStripe } from './stripeClient';

export function requireStripeWebhookSecret(): string {
  const v = process.env.STRIPE_WEBHOOK_SECRET;
  if (!v) throw new Error('STRIPE_WEBHOOK_SECRET is required');
  return v;
}

export function constructStripeEvent(req: Request) {
  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    throw new Error('Missing stripe-signature header');
  }
  const secret = requireStripeWebhookSecret();
  // express.raw() provides Buffer in req.body
  const body = req.body as Buffer;
  return stripe.webhooks.constructEvent(body, signature, secret);
}

