"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTeamCheckoutSession = createTeamCheckoutSession;
exports.createTeamPortalSession = createTeamPortalSession;
const db_1 = require("../db");
const checkoutSessions_1 = require("./checkoutSessions");
async function createTeamCheckoutSession(args) {
    // Acting userId is stored in metadata for audit/debug; Stripe customer/subscription attaches to Team billing account.
    return (0, checkoutSessions_1.createCheckoutSession)({
        userId: args.actingUserId,
        planType: 'TEAM',
        seatBundle: args.seatBundle,
        teamId: args.teamId,
    });
}
async function createTeamPortalSession(args) {
    const acct = await db_1.prisma.billingAccount.findUnique({ where: { teamId: args.teamId } });
    if (!acct) {
        throw new Error('Team has no billing account');
    }
    return (0, checkoutSessions_1.createPortalSession)({ stripeCustomerId: acct.stripeCustomerId });
}
//# sourceMappingURL=teamBilling.js.map