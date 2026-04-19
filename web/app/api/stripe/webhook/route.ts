export const dynamic = 'force-dynamic';

import { processStripeWebhookPost } from '@server/api/handlers/stripeWebhook';
import { nextFromHandlerResult } from '@/lib/nextJsonHandler';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const buf = Buffer.from(await request.arrayBuffer());
  const r = processStripeWebhookPost(buf, signature);
  return nextFromHandlerResult(r);
}
