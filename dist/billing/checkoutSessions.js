"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePortalSessionBodySchema = exports.CreateCheckoutSessionBodySchema = void 0;
exports.createCheckoutSession = createCheckoutSession;
exports.createPortalSession = createPortalSession;
const zod_1 = require("zod");
const stripeClient_1 = require("./stripeClient");
const planConfig_1 = require("./planConfig");
exports.CreateCheckoutSessionBodySchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    planType: zod_1.z.enum(['INDIVIDUAL', 'TEAM']),
    seatBundle: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(25), zod_1.z.literal(50)]).optional(),
    teamId: zod_1.z.string().min(1).optional(),
}).superRefine((data, ctx) => {
    if (data.planType === 'TEAM' && !data.teamId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'teamId is required for TEAM plan checkout',
            path: ['teamId'],
        });
    }
});
function requireFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
}
async function createCheckoutSession(input) {
    const stripe = (0, stripeClient_1.getStripe)();
    const frontendUrl = requireFrontendUrl();
    let plan;
    if (input.planType === 'INDIVIDUAL') {
        plan = { planType: 'INDIVIDUAL' };
    }
    else {
        const bundle = (input.seatBundle ?? 10);
        plan = { planType: 'TEAM', seatBundle: bundle };
    }
    const priceId = (0, planConfig_1.getPriceIdForPlan)(plan);
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
    if (!session.url)
        throw new Error('Stripe checkout session missing url');
    return { url: session.url };
}
exports.CreatePortalSessionBodySchema = zod_1.z.object({
    stripeCustomerId: zod_1.z.string().min(1),
});
async function createPortalSession(input) {
    const stripe = (0, stripeClient_1.getStripe)();
    const frontendUrl = requireFrontendUrl();
    const session = await stripe.billingPortal.sessions.create({
        customer: input.stripeCustomerId,
        return_url: `${frontendUrl}/billing`,
    });
    return { url: session.url };
}
//# sourceMappingURL=checkoutSessions.js.map