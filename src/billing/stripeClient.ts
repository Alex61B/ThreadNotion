import Stripe from 'stripe';

type StripeClient = InstanceType<typeof Stripe>;

let stripeSingleton: StripeClient | null = null;

export function getStripe(): StripeClient {
  if (stripeSingleton) return stripeSingleton;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }
  stripeSingleton = new Stripe(secretKey, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
  });
  return stripeSingleton;
}

