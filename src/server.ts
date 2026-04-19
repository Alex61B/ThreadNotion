/**
 * Express app for Vitest/supertest and optional local dev parity — not used for production.
 * Production API: Next.js `web/app/api/*` → shared handlers in `src/api/handlers/`.
 * Stripe webhooks: `POST /api/stripe/webhook` is handled only by Next (`web/app/api/stripe/webhook/route.ts`).
 */
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { requireAuthSession, type AuthedRequest } from './auth/sessionAuth';
import { llm } from './services/llm';
import type { JsonHandlerResult } from './api/httpTypes';
import { getHealth } from './api/handlers/health';
import { listPersonas, listProducts } from './api/handlers/catalog';
import {
  getUserBillingInvoices,
  getUserBillingStatus,
  postUserBillingCancel,
  postUserBillingCheckoutSession,
  postUserBillingPortalSession,
  getTeamBillingInvoices,
  getTeamBillingStatus,
  postTeamBillingCancel,
  postTeamBillingCheckoutSession,
  postTeamBillingPortalSession,
} from './api/handlers/billing';
import {
  getWeaknessProfile,
  getUserProgress,
  getUserTrainingAnalytics,
  getTrainingRecommendation,
  getTrainingAssignments,
  getTrainingFocus,
  patchTrainingFocus,
  deleteTrainingFocus,
  getTeamAnalytics,
  getTeamMemberProgress,
  postTeamAssignment,
} from './api/handlers/training';
import { getTeams, postTeams, getTeamMembers, postTeamMembers } from './api/handlers/teams';
import { listConversations, getConversationEvaluationSummary } from './api/handlers/conversations';
import { postChat } from './api/handlers/chat';
import { postFeedback } from './api/handlers/feedback';
import { postGenerateScript } from './api/handlers/generateScript';

const app = express();
export { app };

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const morgan = require('morgan');
  app.use(morgan('dev'));
} catch {
  // no-op
}

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void | undefined>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function sendJson(res: Response, r: JsonHandlerResult): void {
  res.status(r.status).json(r.body);
}

// BILLING
app.post(
  '/api/billing/checkout-session',
  asyncHandler(async (req, res) => sendJson(res, await postUserBillingCheckoutSession(req.body)))
);
app.post(
  '/api/billing/portal-session',
  asyncHandler(async (req, res) => sendJson(res, await postUserBillingPortalSession(req.body)))
);
app.post(
  '/api/billing/cancel',
  requireAuthSession(),
  asyncHandler(async (req: Request, res) => {
    const userId = (req as AuthedRequest).authUserId!;
    sendJson(res, await postUserBillingCancel(userId));
  })
);
app.get(
  '/api/billing/invoices',
  requireAuthSession(),
  asyncHandler(async (req: Request, res) => {
    const userId = (req as AuthedRequest).authUserId!;
    sendJson(res, await getUserBillingInvoices(userId));
  })
);
app.post(
  '/api/team/:teamId/billing/checkout-session',
  requireAuthSession(),
  asyncHandler(async (req: Request, res) => {
    const teamId = req.params.teamId!;
    const actingUserId = (req as AuthedRequest).authUserId!;
    sendJson(res, await postTeamBillingCheckoutSession(teamId, actingUserId, req.body));
  })
);
app.post(
  '/api/team/:teamId/billing/portal-session',
  requireAuthSession(),
  asyncHandler(async (req: Request, res) => {
    const teamId = req.params.teamId!;
    const actingUserId = (req as AuthedRequest).authUserId!;
    sendJson(res, await postTeamBillingPortalSession(teamId, actingUserId));
  })
);
app.post(
  '/api/team/:teamId/billing/cancel',
  requireAuthSession(),
  asyncHandler(async (req: Request, res) => {
    const teamId = req.params.teamId!;
    const actingUserId = (req as AuthedRequest).authUserId!;
    sendJson(res, await postTeamBillingCancel(teamId, actingUserId));
  })
);
app.get(
  '/api/team/:teamId/billing/status',
  requireAuthSession(),
  asyncHandler(async (req: Request, res) => {
    const teamId = req.params.teamId!;
    const actingUserId = (req as AuthedRequest).authUserId!;
    sendJson(res, await getTeamBillingStatus(teamId, actingUserId));
  })
);
app.get(
  '/api/team/:teamId/billing/invoices',
  requireAuthSession(),
  asyncHandler(async (req: Request, res) => {
    const teamId = req.params.teamId!;
    const actingUserId = (req as AuthedRequest).authUserId!;
    sendJson(res, await getTeamBillingInvoices(teamId, actingUserId));
  })
);
app.get(
  '/api/billing/status',
  requireAuthSession(),
  asyncHandler(async (req: Request, res) => {
    const userId = (req as AuthedRequest).authUserId!;
    sendJson(res, await getUserBillingStatus(userId));
  })
);

// HEALTH
app.get('/health', asyncHandler(async (_req, res) => sendJson(res, await getHealth())));

app.get('/ping', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/personas', asyncHandler(async (_req, res) => sendJson(res, await listPersonas())));
app.get('/products', asyncHandler(async (_req, res) => sendJson(res, await listProducts())));

app.get(
  '/weakness-profile',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await getWeaknessProfile(userId));
  })
);

app.get(
  '/user-progress',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await getUserProgress(userId));
  })
);

app.get(
  '/training-recommendation',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await getTrainingRecommendation(userId));
  })
);

app.get(
  '/user-training-analytics',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await getUserTrainingAnalytics(userId));
  })
);

app.post('/teams', asyncHandler(async (req, res) => sendJson(res, await postTeams(req.body))));

app.get(
  '/teams',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await getTeams(userId));
  })
);

app.get(
  '/team/:teamId/members',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    const { teamId } = req.params;
    sendJson(res, await getTeamMembers(teamId!, userId));
  })
);

app.post(
  '/team/:teamId/members',
  asyncHandler(async (req, res) => {
    const actingUserId = req.query.userId as string | undefined;
    if (!actingUserId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    const { teamId } = req.params;
    sendJson(res, await postTeamMembers(teamId!, actingUserId, req.body));
  })
);

app.get(
  '/team/:teamId/analytics',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    const { teamId } = req.params;
    sendJson(res, await getTeamAnalytics(teamId!, userId));
  })
);

app.get(
  '/team/:teamId/member-progress',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    const memberUserId = req.query.memberUserId as string | undefined;
    if (!userId || !memberUserId) {
      res.status(400).json({ error: 'userId and memberUserId query parameters required' });
      return;
    }
    const { teamId } = req.params;
    sendJson(res, await getTeamMemberProgress(teamId!, userId, memberUserId));
  })
);

app.post(
  '/team/:teamId/assignments',
  asyncHandler(async (req, res) => {
    const { teamId } = req.params;
    sendJson(res, await postTeamAssignment(teamId!, req.body));
  })
);

app.get(
  '/training-assignments',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await getTrainingAssignments(userId));
  })
);

app.get(
  '/training-focus',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await getTrainingFocus(userId));
  })
);

app.patch(
  '/training-focus',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await patchTrainingFocus(userId, req.body));
  })
);

app.delete(
  '/training-focus',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter required' });
      return;
    }
    sendJson(res, await deleteTrainingFocus(userId));
  })
);

app.get(
  '/conversations/:conversationId/evaluation-summary',
  asyncHandler(async (req, res) => {
    const conversationId = req.params.conversationId;
    sendJson(res, await getConversationEvaluationSummary(conversationId!));
  })
);

app.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    sendJson(res, await listConversations(userId));
  })
);

app.post('/chat', asyncHandler(async (req, res) => sendJson(res, await postChat(req.body))));

app.post('/feedback', asyncHandler(async (req, res) => sendJson(res, await postFeedback(req.body))));

app.post(
  '/generate-script',
  asyncHandler(async (req, res) => {
    const userId = (req.query.userId as string | undefined) ?? undefined;
    sendJson(res, await postGenerateScript(req.body, userId));
  })
);

app.get(
  '/test-llm',
  asyncHandler(async (_req, res) => {
    const response = await llm.chat([{ role: 'user', content: 'Say hello! This is a test.' }]);
    res.json({ ok: true, response });
  })
);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const anyErr = err as { name?: string; errors?: unknown; message?: string };
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
