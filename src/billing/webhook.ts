import type { Request } from 'express';
import { getStripe } from './stripeClient';

export function requireStripeWebhookSecret(): string {
  const v = process.env.STRIPE_WEBHOOK_SECRET;
  if (!v) throw new Error('STRIPE_WEBHOOK_SECRET is required');
  return v;
}

/** Raw body + signature (Next.js route handlers, tests, etc.) */
export function constructStripeEventFromBuffer(body: Buffer, signature: string) {
  const stripe = getStripe();
  const secret = requireStripeWebhookSecret();
  return stripe.webhooks.constructEvent(body, signature, secret);
}

export function constructStripeEvent(req: Request) {
  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    throw new Error('Missing stripe-signature header');
  }
  const body = req.body as Buffer;
  return constructStripeEventFromBuffer(body, signature);
}

