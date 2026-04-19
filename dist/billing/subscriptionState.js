"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapStripeSubscriptionStatus = mapStripeSubscriptionStatus;
exports.planTypeFromStripePriceId = planTypeFromStripePriceId;
exports.seatBundleFromStripePriceId = seatBundleFromStripePriceId;
const planConfig_1 = require("./planConfig");
function mapStripeSubscriptionStatus(s) {
    switch (s) {
        case 'active':
        case 'trialing':
            return 'ACTIVE';
        case 'past_due':
        case 'unpaid':
            return 'PAST_DUE';
        case 'canceled':
            return 'CANCELED';
        default:
            return 'INACTIVE';
    }
}
function planTypeFromStripePriceId(priceId) {
    if (!priceId)
        return 'FREE';
    const plan = (0, planConfig_1.getPlanForStripePriceId)(priceId);
    if (!plan)
        return 'FREE';
    return plan.planType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TEAM';
}
function seatBundleFromStripePriceId(priceId) {
    if (!priceId)
        return 'NONE';
    const plan = (0, planConfig_1.getPlanForStripePriceId)(priceId);
    if (!plan || plan.planType !== 'TEAM')
        return 'NONE';
    return plan.seatBundle === 10 ? 'SEATS_10' : plan.seatBundle === 25 ? 'SEATS_25' : 'SEATS_50';
}
//# sourceMappingURL=subscriptionState.js.map