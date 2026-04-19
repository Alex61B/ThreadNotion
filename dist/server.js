"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const db_1 = require("./db");
const checkoutSessions_1 = require("./billing/checkoutSessions");
const webhook_1 = require("./billing/webhook");
const webhookHandler_1 = require("./billing/webhookHandler");
const sessionAuth_1 = require("./auth/sessionAuth");
const teamBilling_1 = require("./billing/teamBilling");
const graceSweeper_1 = require("./billing/graceSweeper");
const cancellation_1 = require("./billing/cancellation");
const llm_1 = require("./services/llm");
const quotaGuard_1 = require("./usage/quotaGuard");
const simulationCap_1 = require("./usage/simulationCap");
const simulationEvaluationService_1 = require("./services/simulationEvaluationService");
const weaknessProfileService_1 = require("./services/weaknessProfileService");
const adaptiveScenarioPlanService_1 = require("./services/adaptiveScenarioPlanService");
const adaptiveRoleplayPrompt_1 = require("./services/adaptiveRoleplayPrompt");
const parseStoredAdaptivePlan_1 = require("./domain/adaptive/parseStoredAdaptivePlan");
const evaluationErrors_1 = require("./errors/evaluationErrors");
const evaluationSummarySerializer_1 = require("./services/evaluationSummarySerializer");
const trainingRecommendationService_1 = require("./services/trainingRecommendationService");
const trainingOrchestrationService_1 = require("./services/trainingOrchestrationService");
const userTrainingAnalyticsService_1 = require("./services/userTrainingAnalyticsService");
const teamTrainingAnalyticsService_1 = require("./services/teamTrainingAnalyticsService");
const teamService_1 = require("./services/teamService");
const trainingAssignmentService_1 = require("./services/trainingAssignmentService");
const teamAnalytics_1 = require("./schemas/teamAnalytics");
const drillScenarioPlanService_1 = require("./services/drillScenarioPlanService");
const parseStoredDrillPlan_1 = require("./domain/drill/parseStoredDrillPlan");
const liveCoachingService_1 = require("./services/liveCoachingService");
const deriveFromSeed_1 = require("./domain/simulationRealism/deriveFromSeed");
const userTrainingFocusService_1 = require("./services/userTrainingFocusService");
const coaching_1 = require("./schemas/coaching");
const app = (0, express_1.default)();
exports.app = app;
// Optional request logging (won't crash if morgan isn't installed)
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const morgan = require('morgan');
    app.use(morgan('dev'));
}
catch {
    // no-op
}
// ===========================================
// STRIPE WEBHOOK (raw body required)
// ===========================================
app.post('/api/stripe/webhook', express_1.default.raw({ type: 'application/json' }), (req, res) => {
    try {
        const event = (0, webhook_1.constructStripeEvent)(req);
        (0, webhookHandler_1.handleStripeEvent)(event).catch((e) => {
            console.error('[stripe.webhook] handler error', e);
        });
        return res.json({ received: true });
    }
    catch (err) {
        console.error('[stripe.webhook] signature verification failed', err?.message ?? err);
        return res.status(400).json({ error: 'Invalid webhook signature' });
    }
});
// Middleware (keep after webhook so raw body is preserved)
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
// ===========================================
// UTILITY
// ===========================================
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// ===========================================
// BILLING (MVP scaffolding)
// ===========================================
app.post('/api/billing/checkout-session', asyncHandler(async (req, res) => {
    const body = checkoutSessions_1.CreateCheckoutSessionBodySchema.safeParse(req.body);
    if (!body.success) {
        return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    }
    const out = await (0, checkoutSessions_1.createCheckoutSession)(body.data);
    res.json({ ok: true, checkoutUrl: out.url });
}));
app.post('/api/billing/portal-session', asyncHandler(async (req, res) => {
    const body = checkoutSessions_1.CreatePortalSessionBodySchema.safeParse(req.body);
    if (!body.success) {
        return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    }
    const out = await (0, checkoutSessions_1.createPortalSession)(body.data);
    res.json({ ok: true, portalUrl: out.url });
}));
app.post('/api/billing/cancel', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const userId = req.authUserId;
    // Cancellation is session-scoped; Stripe handles billing-period rules.
    await (0, cancellation_1.cancelUserSubscriptionsOnDelete)({ userId });
    res.json({ ok: true });
}));
app.get('/api/billing/invoices', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const userId = req.authUserId;
    const acct = await db_1.prisma.billingAccount.findUnique({ where: { userId } });
    if (!acct)
        return res.json({ ok: true, invoices: [] });
    const invoices = await db_1.prisma.invoiceRecord.findMany({
        where: { billingAccountId: acct.id },
        orderBy: { issuedAt: 'desc' },
        take: 50,
    });
    res.json({ ok: true, invoices });
}));
// ===========================================
// TEAM BILLING (Phase 3 MVP)
// ===========================================
app.post('/api/team/:teamId/billing/checkout-session', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    const body = zod_1.z.object({ seatBundle: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(25), zod_1.z.literal(50)]) }).safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    const out = await (0, teamBilling_1.createTeamCheckoutSession)({ actingUserId, teamId, seatBundle: body.data.seatBundle });
    res.json({ ok: true, checkoutUrl: out.url });
}));
app.post('/api/team/:teamId/billing/portal-session', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    const out = await (0, teamBilling_1.createTeamPortalSession)({ teamId });
    res.json({ ok: true, portalUrl: out.url });
}));
app.post('/api/team/:teamId/billing/cancel', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    await (0, cancellation_1.cancelTeamSubscriptionsOnDelete)({ teamId });
    res.json({ ok: true });
}));
app.get('/api/team/:teamId/billing/status', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
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
    res.json({
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
    });
}));
app.get('/api/team/:teamId/billing/invoices', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    const acct = await db_1.prisma.billingAccount.findUnique({ where: { teamId } });
    if (!acct)
        return res.json({ ok: true, invoices: [] });
    const invoices = await db_1.prisma.invoiceRecord.findMany({
        where: { billingAccountId: acct.id },
        orderBy: { issuedAt: 'desc' },
        take: 50,
    });
    res.json({ ok: true, invoices });
}));
app.get('/api/billing/status', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const userId = req.authUserId;
    // Entitlement snapshot (single source of truth for enforcement)
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
    res.json({
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
    });
}));
// ===========================================
// HEALTH & BASIC ROUTES
// ===========================================
app.get('/health', asyncHandler(async (_req, res) => {
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        res.json({ ok: true, db: 'connected', timestamp: new Date().toISOString() });
    }
    catch {
        res.status(500).json({ ok: false, db: 'disconnected' });
    }
}));
app.get('/ping', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});
app.get('/personas', asyncHandler(async (_req, res) => {
    const personas = await db_1.prisma.persona.findMany({
        orderBy: { createdAt: 'desc' },
    });
    const transformed = personas.map((p) => ({
        id: p.id,
        name: p.name,
        tone: p.tone,
        values: p.values,
        instructions: p.instructions,
        createdAt: p.createdAt.toISOString(),
    }));
    res.json({ ok: true, personas: transformed, data: transformed });
}));
// Products endpoint - maps 'title' to 'name' for frontend compatibility
app.get('/products', asyncHandler(async (_req, res) => {
    const products = await db_1.prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
    });
    const transformed = products.map((p) => ({
        id: p.id,
        name: p.title,
        title: p.title,
        description: p.description,
        brand: p.brand,
        price: p.price,
        currency: p.currency,
        sku: p.sku,
        attributes: p.attributes,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    }));
    res.json({ ok: true, products: transformed, data: transformed });
}));
// ===========================================
// WEAKNESS PROFILE & EVALUATION SUMMARY
// ===========================================
app.get('/weakness-profile', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const profiles = await (0, weaknessProfileService_1.listWeaknessProfilesForUser)(userId);
    res.json({
        ok: true,
        profiles: profiles.map((p) => ({
            id: p.id,
            userId: p.userId,
            skill: p.skill,
            currentScore: p.currentScore,
            trendDirection: p.trendDirection,
            lastSimulationId: p.lastSimulationId,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        })),
    });
}));
app.get('/user-progress', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const bundle = await (0, trainingRecommendationService_1.buildTrainingRecommendationBundle)(userId);
    const { progressSnapshot, drillSuggestion, trainingRecommendation, trainingFocusRow, orchestratedRecommendation, } = bundle;
    res.json({
        ok: true,
        progressSnapshot,
        drillSuggestion,
        trainingRecommendation,
        orchestratedRecommendation,
        trainingFocus: trainingFocusRow
            ? {
                focusSkills: trainingFocusRow.focusSkills,
                sessionsRemaining: trainingFocusRow.sessionsRemaining,
                source: trainingFocusRow.source,
                updatedAt: trainingFocusRow.updatedAt.toISOString(),
            }
            : null,
    });
}));
app.get('/training-recommendation', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const recommendation = await (0, trainingOrchestrationService_1.getOrchestratedRecommendationForUser)(userId);
    res.json({ ok: true, recommendation });
}));
app.get('/user-training-analytics', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const analytics = await (0, userTrainingAnalyticsService_1.buildUserTrainingAnalytics)(userId);
    res.json({ ok: true, analytics });
}));
function handleTeamError(res, e) {
    if (e instanceof teamService_1.TeamAccessError) {
        if (e instanceof teamService_1.TeamSeatLimitError) {
            res.status(409).json({ error: 'TEAM_SEAT_LIMIT_REACHED' });
            return true;
        }
        res.status(e.statusCode).json({ error: e.message });
        return true;
    }
    return false;
}
app.post('/teams', asyncHandler(async (req, res) => {
    const body = teamAnalytics_1.CreateTeamBodySchema.safeParse(req.body);
    if (!body.success) {
        return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    }
    const team = await (0, teamService_1.createTeam)(body.data.name, body.data.userId);
    res.status(201).json({ ok: true, team: { id: team.id, name: team.name, ownerId: team.ownerId } });
}));
app.get('/teams', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const teams = await (0, teamService_1.listTeamsForUser)(userId);
    res.json({ ok: true, teams });
}));
app.get('/team/:teamId/members', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const { teamId } = req.params;
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, userId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    const members = await (0, teamService_1.listTeamMembers)(teamId);
    res.json({
        ok: true,
        members: members.map((m) => ({
            userId: m.userId,
            role: m.role,
            displayName: m.displayName,
            joinedAt: m.joinedAt.toISOString(),
        })),
    });
}));
app.post('/team/:teamId/members', asyncHandler(async (req, res) => {
    const actingUserId = req.query.userId;
    if (!actingUserId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const { teamId } = req.params;
    const body = teamAnalytics_1.AddTeamMemberBodySchema.safeParse(req.body);
    if (!body.success) {
        return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    }
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    try {
        const m = await (0, teamService_1.addTeamMember)({
            teamId: teamId,
            memberUserId: body.data.memberUserId,
            ...(body.data.role !== undefined ? { role: body.data.role } : {}),
            ...(body.data.displayName !== undefined ? { displayName: body.data.displayName } : {}),
        });
        res.status(201).json({
            ok: true,
            member: {
                userId: m.userId,
                role: m.role,
                displayName: m.displayName,
                joinedAt: m.joinedAt.toISOString(),
            },
        });
    }
    catch (err) {
        if (handleTeamError(res, err))
            return;
        if (err?.code === 'P2002') {
            return res.status(409).json({ error: 'User is already a member of this team' });
        }
        throw err;
    }
}));
app.get('/team/:teamId/analytics', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const { teamId } = req.params;
    try {
        await (0, teamService_1.assertTeamMember)(teamId, userId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    const teamAnalytics = await (0, teamTrainingAnalyticsService_1.buildTeamTrainingAnalytics)(teamId);
    res.json({ ok: true, teamAnalytics });
}));
app.get('/team/:teamId/member-progress', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    const memberUserId = req.query.memberUserId;
    if (!userId || !memberUserId) {
        return res.status(400).json({ error: 'userId and memberUserId query parameters required' });
    }
    const { teamId } = req.params;
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, userId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    const onTeam = await (0, teamService_1.ensureMemberOfTeam)(teamId, memberUserId);
    if (!onTeam) {
        return res.status(404).json({ error: 'Member not on this team' });
    }
    const analytics = await (0, userTrainingAnalyticsService_1.buildUserTrainingAnalytics)(memberUserId);
    const bundle = await (0, trainingRecommendationService_1.buildTrainingRecommendationBundle)(memberUserId);
    const { progressSnapshot, drillSuggestion, trainingRecommendation, trainingFocusRow, orchestratedRecommendation, } = bundle;
    res.json({
        ok: true,
        analytics,
        progressSnapshot,
        drillSuggestion,
        trainingRecommendation,
        orchestratedRecommendation,
        trainingFocus: trainingFocusRow
            ? {
                focusSkills: trainingFocusRow.focusSkills,
                sessionsRemaining: trainingFocusRow.sessionsRemaining,
                source: trainingFocusRow.source,
                updatedAt: trainingFocusRow.updatedAt.toISOString(),
            }
            : null,
    });
}));
app.post('/team/:teamId/assignments', asyncHandler(async (req, res) => {
    const body = teamAnalytics_1.CreateAssignmentBodySchema.safeParse(req.body);
    if (!body.success) {
        return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    }
    const { teamId } = req.params;
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, body.data.userId);
    }
    catch (e) {
        if (handleTeamError(res, e))
            return;
        throw e;
    }
    if (body.data.targetUserId) {
        const ok = await (0, teamService_1.ensureMemberOfTeam)(teamId, body.data.targetUserId);
        if (!ok) {
            return res.status(400).json({ error: 'targetUserId must be a member of the team' });
        }
    }
    const row = await (0, trainingAssignmentService_1.createTrainingAssignment)({
        teamId: teamId,
        assignedBy: body.data.userId,
        targetUserId: body.data.targetUserId ?? null,
        skill: body.data.skill,
        assignmentType: body.data.assignmentType,
    });
    res.status(201).json({
        ok: true,
        assignment: {
            id: row.id,
            teamId: row.teamId,
            skill: row.skill,
            assignmentType: row.assignmentType,
            targetUserId: row.targetUserId,
            active: row.active,
            createdAt: row.createdAt.toISOString(),
        },
    });
}));
app.get('/training-assignments', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const rows = await (0, trainingAssignmentService_1.listActiveAssignmentsForUser)(userId);
    res.json({
        ok: true,
        assignments: rows.map((a) => ({
            id: a.id,
            teamId: a.teamId,
            teamName: a.team.name,
            skill: a.skill,
            assignmentType: a.assignmentType,
            targetUserId: a.targetUserId,
            createdAt: a.createdAt.toISOString(),
        })),
    });
}));
const TrainingFocusPatchBody = zod_1.z.object({
    focusSkills: zod_1.z.array(coaching_1.SalesSkillSchema).max(3).min(1),
    sessionsRemaining: zod_1.z.number().int().min(0).nullable().optional(),
    source: zod_1.z.enum(['user', 'profile', 'progress']).optional(),
});
app.get('/training-focus', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const row = await (0, userTrainingFocusService_1.getTrainingFocusForUser)(userId);
    if (!row) {
        return res.json({ ok: true, trainingFocus: null });
    }
    res.json({
        ok: true,
        trainingFocus: {
            focusSkills: row.focusSkills,
            sessionsRemaining: row.sessionsRemaining,
            source: row.source,
            updatedAt: row.updatedAt.toISOString(),
        },
    });
}));
app.patch('/training-focus', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    const body = TrainingFocusPatchBody.parse(req.body);
    const row = await (0, userTrainingFocusService_1.upsertTrainingFocus)({
        userId,
        focusSkills: body.focusSkills,
        ...(body.sessionsRemaining !== undefined ? { sessionsRemaining: body.sessionsRemaining } : {}),
        ...(body.source !== undefined ? { source: body.source } : {}),
    });
    res.json({
        ok: true,
        trainingFocus: {
            focusSkills: row.focusSkills,
            sessionsRemaining: row.sessionsRemaining,
            source: row.source,
            updatedAt: row.updatedAt.toISOString(),
        },
    });
}));
app.delete('/training-focus', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }
    await (0, userTrainingFocusService_1.clearTrainingFocus)(userId);
    res.json({ ok: true });
}));
app.get('/conversations/:conversationId/evaluation-summary', asyncHandler(async (req, res) => {
    const conversationId = req.params.conversationId;
    if (!conversationId) {
        return res.status(400).json({ error: 'conversationId required' });
    }
    const data = await (0, simulationEvaluationService_1.getEvaluationForConversation)(conversationId);
    if (!data) {
        return res.status(404).json({ error: 'evaluation not found' });
    }
    res.json({
        ok: true,
        summary: (0, evaluationSummarySerializer_1.serializeCoachingSummary)(data.summary),
        skillScores: data.skillScores.map((s) => ({
            id: s.id,
            skill: s.skill,
            score: s.score,
            reasoning: s.reasoning,
            createdAt: s.createdAt.toISOString(),
        })),
    });
}));
// ===========================================
// CONVERSATIONS
// ===========================================
// UPDATED: Now accepts ?userId= query param to filter by user
app.get('/conversations', asyncHandler(async (req, res) => {
    // Get userId from query string: /conversations?userId=abc123
    const userId = req.query.userId;
    // Build the where clause based on whether userId is provided
    const whereClause = userId ? { userId } : {};
    const conversations = await db_1.prisma.conversation.findMany({
        where: whereClause,
        include: {
            messages: { orderBy: { createdAt: 'asc' } },
            persona: true,
            evaluation: true,
            evaluationSummary: true,
            skillScores: { orderBy: { skill: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
    });
    // Ensure consistent shape for frontend
    const transformed = conversations.map((conv) => {
        const adaptiveScenarioPlan = conv.simulationMode === 'adaptive'
            ? (0, parseStoredAdaptivePlan_1.parseStoredAdaptivePlan)(conv.adaptiveScenarioPlan, {
                where: 'GET /conversations',
                conversationId: conv.id,
            })
            : null;
        const drillPlan = conv.simulationMode === 'drill'
            ? (0, parseStoredDrillPlan_1.parseStoredDrillPlan)(conv.drillPlan, {
                where: 'GET /conversations',
                conversationId: conv.id,
            })
            : null;
        return {
            id: conv.id,
            personaId: conv.personaId,
            userId: conv.userId,
            simulationMode: conv.simulationMode,
            adaptiveScenarioPlan,
            drillPlan,
            createdAt: conv.createdAt.toISOString(),
            persona: conv.persona
                ? {
                    id: conv.persona.id,
                    name: conv.persona.name,
                    tone: conv.persona.tone,
                }
                : null,
            messages: conv.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt.toISOString(),
            })),
            evaluation: conv.evaluation
                ? {
                    id: conv.evaluation.id,
                    conversationId: conv.evaluation.conversationId,
                    storytelling: conv.evaluation.storytelling,
                    emotional: conv.evaluation.emotional,
                    persuasion: conv.evaluation.persuasion,
                    productKnow: conv.evaluation.productKnow,
                    total: conv.evaluation.total,
                    strengths: conv.evaluation.strengths,
                    tips: conv.evaluation.tips,
                    createdAt: conv.evaluation.createdAt.toISOString(),
                }
                : null,
            coachingEvaluation: conv.evaluationSummary
                ? {
                    summary: (0, evaluationSummarySerializer_1.serializeCoachingSummary)(conv.evaluationSummary),
                    skillScores: conv.skillScores.map((s) => ({
                        id: s.id,
                        skill: s.skill,
                        score: s.score,
                        reasoning: s.reasoning,
                        createdAt: s.createdAt.toISOString(),
                    })),
                }
                : null,
        };
    });
    res.json({ ok: true, conversations: transformed, data: transformed });
}));
// ===========================================
// CHAT - Fixed persona drift for apparel/fashion
// ===========================================
// UPDATED: Now accepts userId to associate conversations with users
const ChatReq = zod_1.z
    .object({
    conversationId: zod_1.z.string().optional(),
    personaId: zod_1.z.string(),
    productId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    message: zod_1.z.string().min(1),
    mode: zod_1.z.enum(['roleplay', 'assistant']).optional(),
    simulationMode: zod_1.z.enum(['generic', 'adaptive', 'drill']).optional().default('generic'),
    primaryDrillSkill: coaching_1.SalesSkillSchema.optional(),
    secondaryDrillSkill: coaching_1.SalesSkillSchema.optional(),
    variantSeed: zod_1.z.string().optional(),
    liveCoachingEnabled: zod_1.z.boolean().optional().default(false),
})
    .superRefine((data, ctx) => {
    if (data.simulationMode === 'drill' && !data.primaryDrillSkill) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'primaryDrillSkill is required when simulationMode is drill',
            path: ['primaryDrillSkill'],
        });
    }
});
app.post('/chat', asyncHandler(async (req, res) => {
    const { conversationId, personaId, productId, userId, message, mode, simulationMode, primaryDrillSkill, secondaryDrillSkill, variantSeed, liveCoachingEnabled, } = ChatReq.parse(req.body);
    const chatMode = mode ?? 'roleplay';
    const simMode = simulationMode === 'adaptive' ? 'adaptive' : simulationMode === 'drill' ? 'drill' : 'generic';
    const persona = await db_1.prisma.persona.findUnique({ where: { id: personaId } });
    if (!persona)
        return res.status(404).json({ error: 'persona not found' });
    // Load product if specified
    const product = productId
        ? await db_1.prisma.product.findUnique({ where: { id: productId } })
        : null;
    // Get or create conversation (continuing threads use stored adaptive plan; no live profile re-fetch)
    let isContinue = false;
    let convo;
    if (conversationId) {
        const found = await db_1.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (found) {
            convo = found;
            isContinue = true;
        }
        else {
            const gate = await (0, quotaGuard_1.assertCanCreateNewSimulation)(userId ? { userId } : {});
            if (!gate.ok)
                return res.status(402).json(gate);
            if (userId) {
                const cap = await (0, simulationCap_1.assertAndIncrementSimulationCount)({ userId });
                if (!cap.ok)
                    return res.status(402).json(cap);
            }
            convo = await db_1.prisma.conversation.create({
                data: { personaId, userId: userId ?? null, simulationMode: simMode },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
            });
            isContinue = false;
        }
    }
    else {
        const gate = await (0, quotaGuard_1.assertCanCreateNewSimulation)(userId ? { userId } : {});
        if (!gate.ok)
            return res.status(402).json(gate);
        if (userId) {
            const cap = await (0, simulationCap_1.assertAndIncrementSimulationCount)({ userId });
            if (!cap.ok)
                return res.status(402).json(cap);
        }
        convo = await db_1.prisma.conversation.create({
            data: { personaId, userId: userId ?? null, simulationMode: simMode },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        isContinue = false;
    }
    // Build product context for apparel/fashion
    const productContext = product
        ? `
PRODUCT BEING DISCUSSED:
- Item: ${product.title}
- Brand: ${product.brand || 'Store brand'}
- Price: $${product.price ?? 'Ask associate'}
- Description: ${product.description || 'Fashion apparel item'}
${product.attributes ? `- Details: ${JSON.stringify(product.attributes)}` : ''}
`
        : '';
    const effectiveSimMode = convo.simulationMode;
    let adaptivePlan = null;
    let drillStoredForResponse;
    if (chatMode === 'roleplay' && effectiveSimMode === 'adaptive') {
        if (isContinue && convo.adaptiveScenarioPlan != null) {
            adaptivePlan = (0, parseStoredAdaptivePlan_1.parseStoredAdaptivePlan)(convo.adaptiveScenarioPlan, {
                where: 'POST /chat continue',
                conversationId: convo.id,
            });
        }
        else if (!isContinue && userId) {
            const weaknesses = await (0, weaknessProfileService_1.getTopWeaknessesForUser)(userId, 3);
            const plan = (0, adaptiveScenarioPlanService_1.buildAdaptiveScenarioPlan)({
                targetWeaknesses: weaknesses,
                persona: {
                    name: persona.name,
                    tone: persona.tone,
                    instructions: persona.instructions,
                },
                product: product
                    ? {
                        title: product.title,
                        brand: product.brand,
                        price: product.price,
                        description: product.description,
                    }
                    : null,
                realismSeed: convo.id,
            });
            if (plan.targetWeaknesses.length > 0) {
                await db_1.prisma.conversation.update({
                    where: { id: convo.id },
                    data: { adaptiveScenarioPlan: plan },
                });
                adaptivePlan = plan;
            }
        }
    }
    if (chatMode === 'roleplay' && effectiveSimMode === 'drill') {
        if (isContinue && convo.drillPlan != null) {
            const parsed = (0, parseStoredDrillPlan_1.parseStoredDrillPlan)(convo.drillPlan, {
                where: 'POST /chat continue',
                conversationId: convo.id,
            });
            adaptivePlan = parsed?.promptPlan ?? null;
        }
        else if (!isContinue && primaryDrillSkill) {
            const seed = variantSeed ?? userId ?? convo.id;
            const { stored, promptPlan } = (0, drillScenarioPlanService_1.buildDrillScenarioPlan)({
                primarySkill: primaryDrillSkill,
                ...(secondaryDrillSkill ? { secondarySkill: secondaryDrillSkill } : {}),
                persona: {
                    name: persona.name,
                    tone: persona.tone,
                    instructions: persona.instructions,
                },
                product: product
                    ? {
                        title: product.title,
                        brand: product.brand,
                        price: product.price,
                        description: product.description,
                    }
                    : null,
                variantSeed: seed,
                realismSeed: convo.id,
            });
            await db_1.prisma.conversation.update({
                where: { id: convo.id },
                data: { drillPlan: stored },
            });
            drillStoredForResponse = stored;
            adaptivePlan = promptPlan;
        }
    }
    const genericRealismBlock = !isContinue && chatMode === 'roleplay' && effectiveSimMode === 'generic'
        ? (() => {
            const r = (0, deriveFromSeed_1.deriveSimulationRealism)(convo.id, persona.name);
            return `

=== REALISM / BUYER PROFILE (stay consistent) ===
Role: ${r.personaTraits.role}
Knowledge level: ${r.buyerKnowledgeLevel}
Behavior pattern: ${r.customerBehavior}
Deal stage: ${r.dealStage}
Communication style: ${r.personaTraits.communicationStyle}
Time pressure: ${r.personaTraits.timePressure}
`;
        })()
        : '';
    const roleplaySystemPromptBase = `You are roleplaying as a customer shopping for APPAREL AND FASHION items in a retail clothing store.

YOUR PERSONA: ${persona.name}

PERSONA BEHAVIOR & TRAITS:
${persona.instructions}

${productContext}

CRITICAL RULES - FOLLOW STRICTLY:
1. You are shopping for CLOTHING, SHOES, ACCESSORIES, or FASHION items ONLY.
2. Stay 100% in character as ${persona.name} - a customer in a clothing/fashion store.
3. NEVER break character or acknowledge you are AI.
4. NEVER discuss topics outside of fashion/apparel shopping (no tech, cars, appliances, etc.)
5. If the associate mentions non-fashion items, gently redirect: "I'm just here looking at clothes today."
6. React naturally: ask about fit, sizing, materials, colors, styling, care instructions.
7. Express preferences about style, comfort, occasions, wardrobe needs.
8. Raise realistic objections about price, quality, fit, or whether you need the item.
9. Keep responses conversational and brief (1-4 sentences).

FASHION-SPECIFIC BEHAVIORS:
- Ask about available sizes, colors, or patterns
- Inquire about fabric/material quality and care
- Consider how items fit your wardrobe or lifestyle
- Think about occasions: work, casual, formal, athletic
- React to price based on your persona's values${genericRealismBlock}`;
    const roleplaySystemPrompt = (0, adaptiveRoleplayPrompt_1.buildRoleplaySystemPrompt)({
        baseFashionBlock: roleplaySystemPromptBase,
        plan: adaptivePlan,
        practiceKind: effectiveSimMode === 'drill' ? 'drill' : 'adaptive',
    });
    const assistantSystemPrompt = `You are a helpful sales training assistant for APPAREL AND FASHION retail.

Help the sales associate practice selling clothing, shoes, and accessories. Provide tips on:
- Building rapport with fashion customers
- Asking discovery questions about style preferences
- Suggesting complementary items and outfits
- Handling common objections (price, fit, necessity)
- Closing techniques for fashion retail

Keep advice practical and specific to clothing/fashion sales.`;
    const systemContent = chatMode === 'roleplay' ? roleplaySystemPrompt : assistantSystemPrompt;
    const history = [
        { role: 'system', content: systemContent },
        ...convo.messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        { role: 'user', content: message },
    ];
    const tokenGate = await (0, quotaGuard_1.assertCanConsumeTokens)(userId ? { userId, estimatedTokens: 0 } : { estimatedTokens: 0 });
    if (!tokenGate.ok)
        return res.status(402).json(tokenGate);
    const { content: reply, usage } = await llm_1.llm.chatWithUsage(history);
    if (userId) {
        await (0, quotaGuard_1.recordTokenUsage)({ userId, tokens: usage.totalTokens });
    }
    await db_1.prisma.message.createMany({
        data: [
            { conversationId: convo.id, role: 'user', content: message },
            { conversationId: convo.id, role: 'assistant', content: reply },
        ],
    });
    let liveCoaching;
    if (liveCoachingEnabled && chatMode === 'roleplay') {
        liveCoaching = await (0, liveCoachingService_1.getLiveCoachingAfterChatTurn)({
            conversationId: convo.id,
            userId,
            liveCoachingEnabled: true,
            chatMode,
        });
    }
    const responseBody = { conversationId: convo.id, reply };
    if (!isContinue && adaptivePlan && chatMode === 'roleplay' && effectiveSimMode === 'adaptive') {
        responseBody.adaptiveScenario = adaptivePlan;
    }
    if (!isContinue && chatMode === 'roleplay' && effectiveSimMode === 'drill' && drillStoredForResponse) {
        responseBody.drillPlan = drillStoredForResponse;
    }
    if (liveCoachingEnabled && chatMode === 'roleplay') {
        responseBody.liveCoaching = liveCoaching ?? null;
    }
    res.json(responseBody);
}));
// ===========================================
// FEEDBACK
// ===========================================
const FeedbackReq = zod_1.z.object({ conversationId: zod_1.z.string() });
app.post('/feedback', asyncHandler(async (req, res) => {
    const { conversationId } = FeedbackReq.parse(req.body);
    try {
        const result = await (0, simulationEvaluationService_1.evaluateConversation)(conversationId);
        if (result.summary.userId) {
            await (0, userTrainingFocusService_1.decrementTrainingFocusSessionIfAny)(result.summary.userId);
        }
        let progressBundle;
        if (result.summary.userId != null) {
            progressBundle = await (0, trainingRecommendationService_1.buildTrainingRecommendationBundle)(result.summary.userId);
        }
        res.json({
            ok: true,
            coachingEvaluation: {
                conversationId: result.conversationId,
                summary: (0, evaluationSummarySerializer_1.serializeCoachingSummary)(result.summary),
                skillScores: result.skillScores.map((s) => ({
                    id: s.id,
                    skill: s.skill,
                    score: s.score,
                    reasoning: s.reasoning,
                    createdAt: s.createdAt.toISOString(),
                })),
                weaknessProfile: result.weaknessProfile.map((p) => ({
                    id: p.id,
                    userId: p.userId,
                    skill: p.skill,
                    currentScore: p.currentScore,
                    trendDirection: p.trendDirection,
                    lastSimulationId: p.lastSimulationId,
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString(),
                })),
            },
            ...(progressBundle
                ? {
                    progressSnapshot: progressBundle.progressSnapshot,
                    trainingRecommendation: progressBundle.trainingRecommendation,
                    drillSuggestion: progressBundle.drillSuggestion,
                    orchestratedRecommendation: progressBundle.orchestratedRecommendation,
                }
                : {}),
        });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'conversation not found') {
            return res.status(404).json({ error: 'conversation not found' });
        }
        if (msg === 'no messages to evaluate') {
            return res.status(400).json({ error: 'no messages to evaluate' });
        }
        if ((0, evaluationErrors_1.isEvaluationError)(e)) {
            const body = {
                error: e.code === 'EVALUATOR_PARSE'
                    ? 'evaluator_malformed_json'
                    : 'evaluator_validation_failed',
                message: e.message,
            };
            if (e.code === 'EVALUATOR_VALIDATION' && e.cause instanceof zod_1.z.ZodError) {
                body.details = e.cause.flatten();
            }
            return res.status(400).json(body);
        }
        throw e;
    }
}));
// ===========================================
// SCRIPT GENERATION - Fixed JSON shape
// ===========================================
const GenReq = zod_1.z.object({
    productId: zod_1.z.string(),
    personaId: zod_1.z.string().optional(),
    tone: zod_1.z.string().optional(),
});
app.post('/generate-script', asyncHandler(async (req, res) => {
    const { productId, personaId, tone } = GenReq.parse(req.body);
    const userId = req.query.userId ?? undefined;
    const tokenGate = await (0, quotaGuard_1.assertCanConsumeTokens)(userId ? { userId, estimatedTokens: 0 } : { estimatedTokens: 0 });
    if (!tokenGate.ok)
        return res.status(402).json(tokenGate);
    const product = await db_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product)
        return res.status(404).json({ error: 'product not found' });
    const persona = personaId
        ? await db_1.prisma.persona.findUnique({ where: { id: personaId } })
        : null;
    const cacheKey = `${product.id}:${persona?.id ?? 'none'}:${tone ?? 'neutral'}`;
    // Check cache
    const existing = await db_1.prisma.script.findUnique({ where: { cacheKey } });
    if (existing) {
        const content = existing.content;
        return res.json({
            id: existing.id,
            steps: formatScriptToString(content),
            script: formatScriptToString(content),
            personaId: existing.personaId,
            productId: existing.productId,
            tone: existing.tone,
        });
    }
    // Generate new script with structured sections for fashion retail
    const scriptPrompt = `Create a sales script for a FASHION/APPAREL retail associate.

PRODUCT:
- Item: ${product.title}
- Brand: ${product.brand || 'Store brand'}
- Price: $${product.price ?? 'TBD'}
- Description: ${product.description || 'Fashion item'}
${product.attributes ? `- Details: ${JSON.stringify(product.attributes)}` : ''}

${persona
        ? `CUSTOMER TYPE: ${persona.name}\n${persona.instructions}`
        : 'CUSTOMER: General fashion shopper'}

TONE: ${tone || 'neutral'}

Generate a complete sales script with these EXACT sections (use these exact headers):

Opening
---------
[2-3 greeting options and how to approach the customer]

Discovery Questions
---------
[4-5 questions to understand their needs, style, occasion, preferences]

Product Pitch
---------
[How to present the product's benefits, features, styling suggestions]

Objection Handling
---------
[3-4 common objections with suggested responses]

Close
---------
[2-3 ways to guide toward purchase, suggest add-ons]

Write naturally, as a real associate would speak. Focus on fashion-specific language (fit, style, versatility, quality, comfort).`;
    const { content: scriptResponse, usage } = await llm_1.llm.chatWithUsage([
        {
            role: 'system',
            content: 'You are a fashion retail sales training expert. Generate practical, conversational scripts for clothing store associates.',
        },
        { role: 'user', content: scriptPrompt },
    ]);
    if (userId) {
        await (0, quotaGuard_1.recordTokenUsage)({ userId, tokens: usage.totalTokens });
    }
    const scriptContent = {
        persona: persona?.name || 'General',
        script: scriptResponse,
        tone: tone || 'neutral',
        productId: product.id,
        generatedAt: new Date().toISOString(),
    };
    const saved = await db_1.prisma.script.create({
        data: {
            productId: product.id,
            personaId: persona?.id ?? null,
            tone: tone ?? null,
            content: scriptContent,
            cacheKey,
        },
    });
    res.json({
        id: saved.id,
        steps: scriptResponse,
        script: scriptResponse,
        personaId: saved.personaId,
        productId: saved.productId,
        tone: saved.tone,
    });
}));
function formatScriptToString(content) {
    if (typeof content === 'string')
        return content;
    if (content?.script) {
        if (typeof content.script === 'string')
            return content.script;
        if (Array.isArray(content.script))
            return content.script.join('\n\n');
    }
    if (Array.isArray(content))
        return content.join('\n\n');
    return JSON.stringify(content, null, 2);
}
// ===========================================
// TEST ENDPOINTS
// ===========================================
app.get('/test-llm', asyncHandler(async (_req, res) => {
    const response = await llm_1.llm.chat([{ role: 'user', content: 'Say hello! This is a test.' }]);
    res.json({ ok: true, response });
}));
// ===========================================
// ERROR HANDLING
// ===========================================
app.use((err, _req, res, _next) => {
    if (err.name === 'ZodError') {
        // Client validation failures: respond without logging full stack (reduces noise vs expected bad input).
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// ===========================================
// START
// ===========================================
const PORT = process.env.PORT || 3001;
if (!process.env.VITEST) {
    app.listen(PORT, () => {
        console.log(`🚀 ThreadNotion API on port ${PORT}`);
    });
    // Phase 4: deterministic grace expiry sweeper (every 15 minutes).
    setInterval(() => {
        (0, graceSweeper_1.sweepExpiredGracePeriods)().catch((e) => console.error('[graceSweeper] failed', e));
    }, 15 * 60 * 1000);
}
//# sourceMappingURL=server.js.map