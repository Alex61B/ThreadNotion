"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanForStripePriceId = getPlanForStripePriceId;
exports.getPriceIdForPlan = getPriceIdForPlan;
function reqEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`${name} is required`);
    return v;
}
/**
 * Central mapping from Stripe Price IDs to internal plan meaning.
 * Keep this in one place so webhooks can resolve entitlements deterministically.
 */
function getPlanForStripePriceId(priceId) {
    // Do not throw at module import time (tests may not have env configured).
    const mapping = {};
    const individual = process.env.STRIPE_PRICE_ID_INDIVIDUAL;
    const team10 = process.env.STRIPE_PRICE_ID_TEAM_10;
    const team25 = process.env.STRIPE_PRICE_ID_TEAM_25;
    const team50 = process.env.STRIPE_PRICE_ID_TEAM_50;
    if (individual)
        mapping[individual] = { planType: 'INDIVIDUAL' };
    if (team10)
        mapping[team10] = { planType: 'TEAM', seatBundle: 10 };
    if (team25)
        mapping[team25] = { planType: 'TEAM', seatBundle: 25 };
    if (team50)
        mapping[team50] = { planType: 'TEAM', seatBundle: 50 };
    return mapping[priceId] ?? null;
}
function getPriceIdForPlan(input) {
    if (input.planType === 'INDIVIDUAL')
        return reqEnv('STRIPE_PRICE_ID_INDIVIDUAL');
    if (input.seatBundle === 10)
        return reqEnv('STRIPE_PRICE_ID_TEAM_10');
    if (input.seatBundle === 25)
        return reqEnv('STRIPE_PRICE_ID_TEAM_25');
    return reqEnv('STRIPE_PRICE_ID_TEAM_50');
}
//# sourceMappingURL=planConfig.js.map