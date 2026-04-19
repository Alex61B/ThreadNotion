"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
/**
 * Express app for Vitest/supertest and optional local dev parity — not used for production.
 * Production API: Next.js `web/app/api/*` → shared handlers in `src/api/handlers/`.
 * Stripe webhooks: `POST /api/stripe/webhook` is handled only by Next (`web/app/api/stripe/webhook/route.ts`).
 */
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const sessionAuth_1 = require("./auth/sessionAuth");
const llm_1 = require("./services/llm");
const health_1 = require("./api/handlers/health");
const catalog_1 = require("./api/handlers/catalog");
const billing_1 = require("./api/handlers/billing");
const training_1 = require("./api/handlers/training");
const teams_1 = require("./api/handlers/teams");
const conversations_1 = require("./api/handlers/conversations");
const chat_1 = require("./api/handlers/chat");
const feedback_1 = require("./api/handlers/feedback");
const generateScript_1 = require("./api/handlers/generateScript");
const app = (0, express_1.default)();
exports.app = app;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const morgan = require('morgan');
    app.use(morgan('dev'));
}
catch {
    // no-op
}
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function sendJson(res, r) {
    res.status(r.status).json(r.body);
}
// BILLING
app.post('/api/billing/checkout-session', asyncHandler(async (req, res) => sendJson(res, await (0, billing_1.postUserBillingCheckoutSession)(req.body))));
app.post('/api/billing/portal-session', asyncHandler(async (req, res) => sendJson(res, await (0, billing_1.postUserBillingPortalSession)(req.body))));
app.post('/api/billing/cancel', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const userId = req.authUserId;
    sendJson(res, await (0, billing_1.postUserBillingCancel)(userId));
}));
app.get('/api/billing/invoices', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const userId = req.authUserId;
    sendJson(res, await (0, billing_1.getUserBillingInvoices)(userId));
}));
app.post('/api/team/:teamId/billing/checkout-session', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    sendJson(res, await (0, billing_1.postTeamBillingCheckoutSession)(teamId, actingUserId, req.body));
}));
app.post('/api/team/:teamId/billing/portal-session', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    sendJson(res, await (0, billing_1.postTeamBillingPortalSession)(teamId, actingUserId));
}));
app.post('/api/team/:teamId/billing/cancel', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    sendJson(res, await (0, billing_1.postTeamBillingCancel)(teamId, actingUserId));
}));
app.get('/api/team/:teamId/billing/status', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    sendJson(res, await (0, billing_1.getTeamBillingStatus)(teamId, actingUserId));
}));
app.get('/api/team/:teamId/billing/invoices', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const actingUserId = req.authUserId;
    sendJson(res, await (0, billing_1.getTeamBillingInvoices)(teamId, actingUserId));
}));
app.get('/api/billing/status', (0, sessionAuth_1.requireAuthSession)(), asyncHandler(async (req, res) => {
    const userId = req.authUserId;
    sendJson(res, await (0, billing_1.getUserBillingStatus)(userId));
}));
// HEALTH
app.get('/health', asyncHandler(async (_req, res) => sendJson(res, await (0, health_1.getHealth)())));
app.get('/ping', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});
app.get('/personas', asyncHandler(async (_req, res) => sendJson(res, await (0, catalog_1.listPersonas)())));
app.get('/products', asyncHandler(async (_req, res) => sendJson(res, await (0, catalog_1.listProducts)())));
app.get('/weakness-profile', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, training_1.getWeaknessProfile)(userId));
}));
app.get('/user-progress', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, training_1.getUserProgress)(userId));
}));
app.get('/training-recommendation', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, training_1.getTrainingRecommendation)(userId));
}));
app.get('/user-training-analytics', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, training_1.getUserTrainingAnalytics)(userId));
}));
app.post('/teams', asyncHandler(async (req, res) => sendJson(res, await (0, teams_1.postTeams)(req.body))));
app.get('/teams', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, teams_1.getTeams)(userId));
}));
app.get('/team/:teamId/members', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    const { teamId } = req.params;
    sendJson(res, await (0, teams_1.getTeamMembers)(teamId, userId));
}));
app.post('/team/:teamId/members', asyncHandler(async (req, res) => {
    const actingUserId = req.query.userId;
    if (!actingUserId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    const { teamId } = req.params;
    sendJson(res, await (0, teams_1.postTeamMembers)(teamId, actingUserId, req.body));
}));
app.get('/team/:teamId/analytics', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    const { teamId } = req.params;
    sendJson(res, await (0, training_1.getTeamAnalytics)(teamId, userId));
}));
app.get('/team/:teamId/member-progress', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    const memberUserId = req.query.memberUserId;
    if (!userId || !memberUserId) {
        res.status(400).json({ error: 'userId and memberUserId query parameters required' });
        return;
    }
    const { teamId } = req.params;
    sendJson(res, await (0, training_1.getTeamMemberProgress)(teamId, userId, memberUserId));
}));
app.post('/team/:teamId/assignments', asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    sendJson(res, await (0, training_1.postTeamAssignment)(teamId, req.body));
}));
app.get('/training-assignments', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, training_1.getTrainingAssignments)(userId));
}));
app.get('/training-focus', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, training_1.getTrainingFocus)(userId));
}));
app.patch('/training-focus', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, training_1.patchTrainingFocus)(userId, req.body));
}));
app.delete('/training-focus', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter required' });
        return;
    }
    sendJson(res, await (0, training_1.deleteTrainingFocus)(userId));
}));
app.get('/conversations/:conversationId/evaluation-summary', asyncHandler(async (req, res) => {
    const conversationId = req.params.conversationId;
    sendJson(res, await (0, conversations_1.getConversationEvaluationSummary)(conversationId));
}));
app.get('/conversations', asyncHandler(async (req, res) => {
    const userId = req.query.userId;
    sendJson(res, await (0, conversations_1.listConversations)(userId));
}));
app.post('/chat', asyncHandler(async (req, res) => sendJson(res, await (0, chat_1.postChat)(req.body))));
app.post('/feedback', asyncHandler(async (req, res) => sendJson(res, await (0, feedback_1.postFeedback)(req.body))));
app.post('/generate-script', asyncHandler(async (req, res) => {
    const userId = req.query.userId ?? undefined;
    sendJson(res, await (0, generateScript_1.postGenerateScript)(req.body, userId));
}));
app.get('/test-llm', asyncHandler(async (_req, res) => {
    const response = await llm_1.llm.chat([{ role: 'user', content: 'Say hello! This is a test.' }]);
    res.json({ ok: true, response });
}));
app.use((err, _req, res, _next) => {
    const anyErr = err;
    if (anyErr?.name === 'ZodError') {
        res.status(400).json({ error: 'Validation failed', details: anyErr.errors });
        return;
    }
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? anyErr?.message : undefined,
    });
});
const PORT = process.env.PORT || 3001;
if (!process.env.VITEST) {
    app.listen(PORT, () => {
        console.log(`🚀 ThreadNotion API on port ${PORT}`);
    });
}
//# sourceMappingURL=server.js.map