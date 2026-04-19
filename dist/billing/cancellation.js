"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelSubscriptionForBillingAccount = cancelSubscriptionForBillingAccount;
exports.cancelUserSubscriptionsOnDelete = cancelUserSubscriptionsOnDelete;
exports.cancelTeamSubscriptionsOnDelete = cancelTeamSubscriptionsOnDelete;
const db_1 = require("../db");
const stripeClient_1 = require("./stripeClient");
async function cancelSubscriptionForBillingAccount(args) {
    const sub = await db_1.prisma.subscription.findUnique({ where: { billingAccountId: args.billingAccountId } });
    if (!sub?.stripeSubscriptionId)
        return;
    const stripe = (0, stripeClient_1.getStripe)();
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
}
async function cancelUserSubscriptionsOnDelete(args) {
    const acct = await db_1.prisma.billingAccount.findUnique({ where: { userId: args.userId } });
    if (!acct)
        return;
    await cancelSubscriptionForBillingAccount({ billingAccountId: acct.id });
}
async function cancelTeamSubscriptionsOnDelete(args) {
    const acct = await db_1.prisma.billingAccount.findUnique({ where: { teamId: args.teamId } });
    if (!acct)
        return;
    await cancelSubscriptionForBillingAccount({ billingAccountId: acct.id });
}
//# sourceMappingURL=cancellation.js.map