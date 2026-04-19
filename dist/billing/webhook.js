"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStripeWebhookSecret = requireStripeWebhookSecret;
exports.constructStripeEventFromBuffer = constructStripeEventFromBuffer;
exports.constructStripeEvent = constructStripeEvent;
const stripeClient_1 = require("./stripeClient");
function requireStripeWebhookSecret() {
    const v = process.env.STRIPE_WEBHOOK_SECRET;
    if (!v)
        throw new Error('STRIPE_WEBHOOK_SECRET is required');
    return v;
}
/** Raw body + signature (Next.js route handlers, tests, etc.) */
function constructStripeEventFromBuffer(body, signature) {
    const stripe = (0, stripeClient_1.getStripe)();
    const secret = requireStripeWebhookSecret();
    return stripe.webhooks.constructEvent(body, signature, secret);
}
function constructStripeEvent(req) {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
        throw new Error('Missing stripe-signature header');
    }
    const body = req.body;
    return constructStripeEventFromBuffer(body, signature);
}
//# sourceMappingURL=webhook.js.map