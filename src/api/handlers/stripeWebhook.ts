import { constructStripeEventFromBuffer } from '../../billing/webhook';
import { handleStripeEvent } from '../../billing/webhookHandler';
import type { JsonHandlerResult } from '../httpTypes';

export function processStripeWebhookPost(
  rawBody: Buffer,
  signatureHeader: string | null
): JsonHandlerResult {
  if (!signatureHeader) {
    return { status: 400, body: { error: 'Missing stripe-signature header' } };
  }
  try {
    const event = constructStripeEventFromBuffer(rawBody, signatureHeader);
    void handleStripeEvent(event).catch((e) => {
      console.error('[stripe.webhook] handler error', e);
    });
    return { status: 200, body: { received: true } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe.webhook] signature verification failed', msg);
    return { status: 400, body: { error: 'Invalid webhook signature' } };
  }
}
