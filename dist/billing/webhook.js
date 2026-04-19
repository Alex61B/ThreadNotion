"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStripeWebhookSecret = requireStripeWebhookSecret;
exports.constructStripeEvent = constructStripeEvent;
const stripeClient_1 = require("./stripeClient");
function requireStripeWebhookSecret() {
    const v = process.env.STRIPE_WEBHOOK_SECRET;
    if (!v)
        throw new Error('STRIPE_WEBHOOK_SECRET is required');
    return v;
}
function constructStripeEvent(req) {
    const stripe = (0, stripeClient_1.getStripe)();
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
        throw new Error('Missing stripe-signature header');
    }
    const secret = requireStripeWebhookSecret();
    // express.raw() provides Buffer in req.body
    const body = req.body;
    return stripe.webhooks.constructEvent(body, signature, secret);
}
//# sourceMappingURL=webhook.js.map