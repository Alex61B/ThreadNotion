"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postUserBillingCheckoutSession = postUserBillingCheckoutSession;
exports.postUserBillingPortalSession = postUserBillingPortalSession;
exports.postUserBillingCancel = postUserBillingCancel;
exports.getUserBillingInvoices = getUserBillingInvoices;
exports.getUserBillingStatus = getUserBillingStatus;
exports.postTeamBillingCheckoutSession = postTeamBillingCheckoutSession;
exports.postTeamBillingPortalSession = postTeamBillingPortalSession;
exports.postTeamBillingCancel = postTeamBillingCancel;
exports.getTeamBillingStatus = getTeamBillingStatus;
exports.getTeamBillingInvoices = getTeamBillingInvoices;
const zod_1 = require("zod");
const db_1 = require("../../db");
const checkoutSessions_1 = require("../../billing/checkoutSessions");
const cancellation_1 = require("../../billing/cancellation");
const teamBilling_1 = require("../../billing/teamBilling");
const teamService_1 = require("../../services/teamService");
const teamErrors_1 = require("../teamErrors");
const TeamSeatBundleSchema = zod_1.z.object({
    seatBundle: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(25), zod_1.z.literal(50)]),
});
async function postUserBillingCheckoutSession(rawBody) {
    const body = checkoutSessions_1.CreateCheckoutSessionBodySchema.safeParse(rawBody);
    if (!body.success) {
        return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
    }
    const out = await (0, checkoutSessions_1.createCheckoutSession)(body.data);
    return { status: 200, body: { ok: true, checkoutUrl: out.url } };
}
async function postUserBillingPortalSession(rawBody) {
    const body = checkoutSessions_1.CreatePortalSessionBodySchema.safeParse(rawBody);
    if (!body.success) {
        return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
    }
    const out = await (0, checkoutSessions_1.createPortalSession)(body.data);
    return { status: 200, body: { ok: true, portalUrl: out.url } };
}
async function postUserBillingCancel(userId) {
    await (0, cancellation_1.cancelUserSubscriptionsOnDelete)({ userId });
    return { status: 200, body: { ok: true } };
}
async function getUserBillingInvoices(userId) {
    const acct = await db_1.prisma.billingAccount.findUnique({ where: { userId } });
    if (!acct)
        return { status: 200, body: { ok: true, invoices: [] } };
    const invoices = await db_1.prisma.invoiceRecord.findMany({
        where: { billingAccountId: acct.id },
        orderBy: { issuedAt: 'desc' },
        take: 50,
    });
    return { status: 200, body: { ok: true, invoices } };
}
async function getUserBillingStatus(userId) {
    const ent = await db_1.prisma.entitlement.findUnique({
        where: { subjectType_subjectId: { subjectType: 'USER', subjectId: userId } },
    });
    const planType = ent?.planType ?? 'FREE';
    const dailyLimit = ent?.dailyTokenLimit ?? 0;
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const usageRow = await db_1.prisma.tokenUsageDaily.findUnique({
        where: { scopeType_scopeId_date: { scopeType: 'USER', scopeId: userId, date: today } },
    });
    const tokensUsedToday = usageRow ? Number(usageRow.tokensUsed) : 0;
    const simulationsUsed = await db_1.prisma.conversation.count({ where: { userId } });
    return {
        status: 200,
        body: {
            ok: true,
            plan: {
                planType,
                freeSimulationLimit: ent?.freeSimulationLimit ?? 5,
                dailyTokenLimit: dailyLimit,
            },
            usage: {
                simulationsUsed,
                simulationsRemaining: planType === 'FREE' ? Math.max(0, 5 - simulationsUsed) : null,
                tokensUsedToday,
                tokensRemainingToday: dailyLimit > 0 ? Math.max(0, dailyLimit - tokensUsedToday) : null,
            },
        },
    };
}
async function postTeamBillingCheckoutSession(teamId, actingUserId, rawBody) {
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    const body = TeamSeatBundleSchema.safeParse(rawBody);
    if (!body.success) {
        return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
    }
    const out = await (0, teamBilling_1.createTeamCheckoutSession)({
        actingUserId,
        teamId,
        seatBundle: body.data.seatBundle,
    });
    return { status: 200, body: { ok: true, checkoutUrl: out.url } };
}
async function postTeamBillingPortalSession(teamId, actingUserId) {
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    const out = await (0, teamBilling_1.createTeamPortalSession)({ teamId });
    return { status: 200, body: { ok: true, portalUrl: out.url } };
}
async function postTeamBillingCancel(teamId, actingUserId) {
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    await (0, cancellation_1.cancelTeamSubscriptionsOnDelete)({ teamId });
    return { status: 200, body: { ok: true } };
}
async function getTeamBillingStatus(teamId, actingUserId) {
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    const ent = await db_1.prisma.entitlement.findUnique({
        where: { subjectType_subjectId: { subjectType: 'TEAM', subjectId: teamId } },
    });
    const planType = ent?.planType ?? 'FREE';
    const dailyLimit = ent?.dailyTokenLimit ?? 0;
    const maxSeats = ent?.maxSeats ?? 0;
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const usageRow = await db_1.prisma.tokenUsageDaily.findUnique({
        where: { scopeType_scopeId_date: { scopeType: 'TEAM', scopeId: teamId, date: today } },
    });
    const tokensUsedToday = usageRow ? Number(usageRow.tokensUsed) : 0;
    const activeMembers = await db_1.prisma.teamMember.count({ where: { teamId } });
    return {
        status: 200,
        body: {
            ok: true,
            plan: {
                planType,
                maxSeats,
                dailyTokenLimit: dailyLimit,
            },
            usage: {
                activeMembers,
                seatsRemaining: maxSeats > 0 ? Math.max(0, maxSeats - activeMembers) : null,
                tokensUsedToday,
                tokensRemainingToday: dailyLimit > 0 ? Math.max(0, dailyLimit - tokensUsedToday) : null,
            },
        },
    };
}
async function getTeamBillingInvoices(teamId, actingUserId) {
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    const acct = await db_1.prisma.billingAccount.findUnique({ where: { teamId } });
    if (!acct)
        return { status: 200, body: { ok: true, invoices: [] } };
    const invoices = await db_1.prisma.invoiceRecord.findMany({
        where: { billingAccountId: acct.id },
        orderBy: { issuedAt: 'desc' },
        take: 50,
    });
    return { status: 200, body: { ok: true, invoices } };
}
//# sourceMappingURL=billing.js.map