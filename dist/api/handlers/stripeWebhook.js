"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processStripeWebhookPost = processStripeWebhookPost;
const webhook_1 = require("../../billing/webhook");
const webhookHandler_1 = require("../../billing/webhookHandler");
function processStripeWebhookPost(rawBody, signatureHeader) {
    if (!signatureHeader) {
        return { status: 400, body: { error: 'Missing stripe-signature header' } };
    }
    try {
        const event = (0, webhook_1.constructStripeEventFromBuffer)(rawBody, signatureHeader);
        void (0, webhookHandler_1.handleStripeEvent)(event).catch((e) => {
            console.error('[stripe.webhook] handler error', e);
        });
        return { status: 200, body: { received: true } };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[stripe.webhook] signature verification failed', msg);
        return { status: 400, body: { error: 'Invalid webhook signature' } };
    }
}
//# sourceMappingURL=stripeWebhook.js.map