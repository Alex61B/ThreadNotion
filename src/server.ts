import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { prisma } from './db';
import { llm } from './services/llm';
import { evaluateConversation, getEvaluationForConversation } from './services/simulationEvaluationService';
import {
  getTopWeaknessesForUser,
  listWeaknessProfilesForUser,
} from './services/weaknessProfileService';
import { buildAdaptiveScenarioPlan } from './services/adaptiveScenarioPlanService';
import { buildRoleplaySystemPrompt } from './services/adaptiveRoleplayPrompt';
import type { AdaptiveScenarioPlan } from './schemas/adaptiveScenarioPlan';
import { parseStoredAdaptivePlan } from './domain/adaptive/parseStoredAdaptivePlan';
import { isEvaluationError } from './errors/evaluationErrors';
import { serializeCoachingSummary } from './services/evaluationSummarySerializer';
import { buildTrainingRecommendationBundle } from './services/trainingRecommendationService';
import { getOrchestratedRecommendationForUser } from './services/trainingOrchestrationService';
import { buildUserTrainingAnalytics } from './services/userTrainingAnalyticsService';
import { buildTeamTrainingAnalytics } from './services/teamTrainingAnalyticsService';
import {
  addTeamMember,
  assertTeamManagerOrOwner,
  createTeam,
  ensureMemberOfTeam,
  listTeamMembers,
  listTeamsForUser,
  TeamAccessError,
  assertTeamMember,
} from './services/teamService';
import {
  createTrainingAssignment,
  listActiveAssignmentsForUser,
} from './services/trainingAssignmentService';
import {
  AddTeamMemberBodySchema,
  CreateAssignmentBodySchema,
  CreateTeamBodySchema,
} from './schemas/teamAnalytics';
import { buildDrillScenarioPlan } from './services/drillScenarioPlanService';
import { parseStoredDrillPlan } from './domain/drill/parseStoredDrillPlan';
import type { DrillPlanStored } from './schemas/drillPlan';
import type { LiveCoachingSuggestion } from './schemas/liveCoaching';
import { getLiveCoachingAfterChatTurn } from './services/liveCoachingService';
import { deriveSimulationRealism } from './domain/simulationRealism/deriveFromSeed';
import {
  clearTrainingFocus,
  decrementTrainingFocusSessionIfAny,
  getTrainingFocusForUser,
  upsertTrainingFocus,
} from './services/userTrainingFocusService';
import { SalesSkillSchema } from './schemas/coaching';
import type { Prisma } from '../generated/prisma';

const app = express();
export { app };

// Optional request logging (won't crash if morgan isn't installed)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const morgan = require('morgan');
  app.use(morgan('dev'));
} catch {
  // no-op
}

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// ===========================================
// UTILITY
// ===========================================

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ===========================================
// HEALTH & BASIC ROUTES
// ===========================================

app.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: 'connected', timestamp: new Date().toISOString() });
    } catch {
      res.status(500).json({ ok: false, db: 'disconnected' });
    }
  })
);

app.get('/ping', (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get(
  '/personas',
  asyncHandler(async (_req: Request, res: Response) => {
    const personas = await prisma.persona.findMany({
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
  })
);

// Products endpoint - maps 'title' to 'name' for frontend compatibility
app.get(
  '/products',
  asyncHandler(async (_req: Request, res: Response) => {
    const products = await prisma.product.findMany({
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
  })
);

// ===========================================
// WEAKNESS PROFILE & EVALUATION SUMMARY
// ===========================================

app.get(
  '/weakness-profile',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const profiles = await listWeaknessProfilesForUser(userId);
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
  })
);

app.get(
  '/user-progress',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const bundle = await buildTrainingRecommendationBundle(userId);
    const {
      progressSnapshot,
      drillSuggestion,
      trainingRecommendation,
      trainingFocusRow,
      orchestratedRecommendation,
    } = bundle;
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
  })
);

app.get(
  '/training-recommendation',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const recommendation = await getOrchestratedRecommendationForUser(userId);
    res.json({ ok: true, recommendation });
  })
);

app.get(
  '/user-training-analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const analytics = await buildUserTrainingAnalytics(userId);
    res.json({ ok: true, analytics });
  })
);

function handleTeamError(res: Response, e: unknown): boolean {
  if (e instanceof TeamAccessError) {
    res.status(e.statusCode).json({ error: e.message });
    return true;
  }
  return false;
}

app.post(
  '/teams',
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreateTeamBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    }
    const team = await createTeam(body.data.name, body.data.userId);
    res.status(201).json({ ok: true, team: { id: team.id, name: team.name, ownerId: team.ownerId } });
  })
);

app.get(
  '/teams',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const teams = await listTeamsForUser(userId);
    res.json({ ok: true, teams });
  })
);

app.get(
  '/team/:teamId/members',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const { teamId } = req.params;
    try {
      await assertTeamManagerOrOwner(teamId!, userId);
    } catch (e) {
      if (handleTeamError(res, e)) return;
      throw e;
    }
    const members = await listTeamMembers(teamId!);
    res.json({
      ok: true,
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        displayName: m.displayName,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  })
);

app.post(
  '/team/:teamId/members',
  asyncHandler(async (req: Request, res: Response) => {
    const actingUserId = req.query.userId as string | undefined;
    if (!actingUserId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const { teamId } = req.params;
    const body = AddTeamMemberBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    }
    try {
      await assertTeamManagerOrOwner(teamId!, actingUserId);
    } catch (e) {
      if (handleTeamError(res, e)) return;
      throw e;
    }
    try {
      const m = await addTeamMember({
        teamId: teamId!,
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
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return res.status(409).json({ error: 'User is already a member of this team' });
      }
      throw err;
    }
  })
);

app.get(
  '/team/:teamId/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const { teamId } = req.params;
    try {
      await assertTeamMember(teamId!, userId);
    } catch (e) {
      if (handleTeamError(res, e)) return;
      throw e;
    }
    const teamAnalytics = await buildTeamTrainingAnalytics(teamId!);
    res.json({ ok: true, teamAnalytics });
  })
);

app.get(
  '/team/:teamId/member-progress',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    const memberUserId = req.query.memberUserId as string | undefined;
    if (!userId || !memberUserId) {
      return res.status(400).json({ error: 'userId and memberUserId query parameters required' });
    }
    const { teamId } = req.params;
    try {
      await assertTeamManagerOrOwner(teamId!, userId);
    } catch (e) {
      if (handleTeamError(res, e)) return;
      throw e;
    }
    const onTeam = await ensureMemberOfTeam(teamId!, memberUserId);
    if (!onTeam) {
      return res.status(404).json({ error: 'Member not on this team' });
    }
    const analytics = await buildUserTrainingAnalytics(memberUserId);
    const bundle = await buildTrainingRecommendationBundle(memberUserId);
    const {
      progressSnapshot,
      drillSuggestion,
      trainingRecommendation,
      trainingFocusRow,
      orchestratedRecommendation,
    } = bundle;
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
  })
);

app.post(
  '/team/:teamId/assignments',
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreateAssignmentBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: 'Invalid body', details: body.error.flatten() });
    }
    const { teamId } = req.params;
    try {
      await assertTeamManagerOrOwner(teamId!, body.data.userId);
    } catch (e) {
      if (handleTeamError(res, e)) return;
      throw e;
    }
    if (body.data.targetUserId) {
      const ok = await ensureMemberOfTeam(teamId!, body.data.targetUserId);
      if (!ok) {
        return res.status(400).json({ error: 'targetUserId must be a member of the team' });
      }
    }
    const row = await createTrainingAssignment({
      teamId: teamId!,
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
  })
);

app.get(
  '/training-assignments',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const rows = await listActiveAssignmentsForUser(userId);
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
  })
);

const TrainingFocusPatchBody = z.object({
  focusSkills: z.array(SalesSkillSchema).max(3).min(1),
  sessionsRemaining: z.number().int().min(0).nullable().optional(),
  source: z.enum(['user', 'profile', 'progress']).optional(),
});

app.get(
  '/training-focus',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const row = await getTrainingFocusForUser(userId);
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
  })
);

app.patch(
  '/training-focus',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    const body = TrainingFocusPatchBody.parse(req.body);
    const row = await upsertTrainingFocus({
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
  })
);

app.delete(
  '/training-focus',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    await clearTrainingFocus(userId);
    res.json({ ok: true });
  })
);

app.get(
  '/conversations/:conversationId/evaluation-summary',
  asyncHandler(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId;
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId required' });
    }
    const data = await getEvaluationForConversation(conversationId);
    if (!data) {
      return res.status(404).json({ error: 'evaluation not found' });
    }
    res.json({
      ok: true,
      summary: serializeCoachingSummary(data.summary),
      skillScores: data.skillScores.map((s) => ({
        id: s.id,
        skill: s.skill,
        score: s.score,
        reasoning: s.reasoning,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  })
);

// ===========================================
// CONVERSATIONS
// ===========================================
// UPDATED: Now accepts ?userId= query param to filter by user

app.get(
  '/conversations',
  asyncHandler(async (req: Request, res: Response) => {
    // Get userId from query string: /conversations?userId=abc123
    const userId = req.query.userId as string | undefined;

    // Build the where clause based on whether userId is provided
    const whereClause = userId ? { userId } : {};

    const conversations = await prisma.conversation.findMany({
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
      const adaptiveScenarioPlan =
        conv.simulationMode === 'adaptive'
          ? parseStoredAdaptivePlan(conv.adaptiveScenarioPlan, {
              where: 'GET /conversations',
              conversationId: conv.id,
            })
          : null;
      const drillPlan =
        conv.simulationMode === 'drill'
          ? parseStoredDrillPlan(conv.drillPlan, {
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
        role: m.role as 'user' | 'assistant',
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
            summary: serializeCoachingSummary(conv.evaluationSummary),
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
  })
);

// ===========================================
// CHAT - Fixed persona drift for apparel/fashion
// ===========================================
// UPDATED: Now accepts userId to associate conversations with users

const ChatReq = z
  .object({
    conversationId: z.string().optional(),
    personaId: z.string(),
    productId: z.string().optional(),
    userId: z.string().optional(),
    message: z.string().min(1),
    mode: z.enum(['roleplay', 'assistant']).optional(),
    simulationMode: z.enum(['generic', 'adaptive', 'drill']).optional().default('generic'),
    primaryDrillSkill: SalesSkillSchema.optional(),
    secondaryDrillSkill: SalesSkillSchema.optional(),
    variantSeed: z.string().optional(),
    liveCoachingEnabled: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.simulationMode === 'drill' && !data.primaryDrillSkill) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'primaryDrillSkill is required when simulationMode is drill',
        path: ['primaryDrillSkill'],
      });
    }
  });

app.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      conversationId,
      personaId,
      productId,
      userId,
      message,
      mode,
      simulationMode,
      primaryDrillSkill,
      secondaryDrillSkill,
      variantSeed,
      liveCoachingEnabled,
    } = ChatReq.parse(req.body);
    const chatMode = mode ?? 'roleplay';
    const simMode =
      simulationMode === 'adaptive' ? 'adaptive' : simulationMode === 'drill' ? 'drill' : 'generic';

    const persona = await prisma.persona.findUnique({ where: { id: personaId } });
    if (!persona) return res.status(404).json({ error: 'persona not found' });

    // Load product if specified
    const product = productId
      ? await prisma.product.findUnique({ where: { id: productId } })
      : null;

    // Get or create conversation (continuing threads use stored adaptive plan; no live profile re-fetch)
    let isContinue = false;
    let convo: {
      id: string;
      simulationMode: 'generic' | 'adaptive' | 'drill';
      adaptiveScenarioPlan: unknown | null;
      drillPlan: unknown | null;
      messages: { role: string; content: string; createdAt: Date }[];
    };

    if (conversationId) {
      const found = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (found) {
        convo = found;
        isContinue = true;
      } else {
        convo = await prisma.conversation.create({
          data: { personaId, userId: userId ?? null, simulationMode: simMode },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        isContinue = false;
      }
    } else {
      convo = await prisma.conversation.create({
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

    let adaptivePlan: AdaptiveScenarioPlan | null = null;
    let drillStoredForResponse: DrillPlanStored | undefined;

    if (chatMode === 'roleplay' && effectiveSimMode === 'adaptive') {
      if (isContinue && convo.adaptiveScenarioPlan != null) {
        adaptivePlan = parseStoredAdaptivePlan(convo.adaptiveScenarioPlan, {
          where: 'POST /chat continue',
          conversationId: convo.id,
        });
      } else if (!isContinue && userId) {
        const weaknesses = await getTopWeaknessesForUser(userId, 3);
        const plan = buildAdaptiveScenarioPlan({
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
          await prisma.conversation.update({
            where: { id: convo.id },
            data: { adaptiveScenarioPlan: plan as unknown as Prisma.InputJsonValue },
          });
          adaptivePlan = plan;
        }
      }
    }

    if (chatMode === 'roleplay' && effectiveSimMode === 'drill') {
      if (isContinue && convo.drillPlan != null) {
        const parsed = parseStoredDrillPlan(convo.drillPlan, {
          where: 'POST /chat continue',
          conversationId: convo.id,
        });
        adaptivePlan = parsed?.promptPlan ?? null;
      } else if (!isContinue && primaryDrillSkill) {
        const seed = variantSeed ?? userId ?? convo.id;
        const { stored, promptPlan } = buildDrillScenarioPlan({
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
        await prisma.conversation.update({
          where: { id: convo.id },
          data: { drillPlan: stored as unknown as Prisma.InputJsonValue },
        });
        drillStoredForResponse = stored;
        adaptivePlan = promptPlan;
      }
    }

    const genericRealismBlock =
      !isContinue && chatMode === 'roleplay' && effectiveSimMode === 'generic'
        ? (() => {
            const r = deriveSimulationRealism(convo.id, persona.name);
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

    const roleplaySystemPrompt = buildRoleplaySystemPrompt({
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

    const systemContent =
      chatMode === 'roleplay' ? roleplaySystemPrompt : assistantSystemPrompt;

    const history = [
      { role: 'system' as const, content: systemContent },
      ...convo.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const reply = await llm.chat(history);

    await prisma.message.createMany({
      data: [
        { conversationId: convo.id, role: 'user', content: message },
        { conversationId: convo.id, role: 'assistant', content: reply },
      ],
    });

    let liveCoaching: LiveCoachingSuggestion | null | undefined;
    if (liveCoachingEnabled && chatMode === 'roleplay') {
      liveCoaching = await getLiveCoachingAfterChatTurn({
        conversationId: convo.id,
        userId,
        liveCoachingEnabled: true,
        chatMode,
      });
    }

    const responseBody: {
      conversationId: string;
      reply: string;
      adaptiveScenario?: AdaptiveScenarioPlan;
      drillPlan?: DrillPlanStored;
      liveCoaching?: LiveCoachingSuggestion | null;
    } = { conversationId: convo.id, reply };
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
  })
);

// ===========================================
// FEEDBACK
// ===========================================

const FeedbackReq = z.object({ conversationId: z.string() });

app.post(
  '/feedback',
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = FeedbackReq.parse(req.body);

    try {
      const result = await evaluateConversation(conversationId);
      if (result.summary.userId) {
        await decrementTrainingFocusSessionIfAny(result.summary.userId);
      }
      let progressBundle: Awaited<ReturnType<typeof buildTrainingRecommendationBundle>> | undefined;
      if (result.summary.userId != null) {
        progressBundle = await buildTrainingRecommendationBundle(result.summary.userId);
      }

      res.json({
        ok: true,
        coachingEvaluation: {
          conversationId: result.conversationId,
          summary: serializeCoachingSummary(result.summary),
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'conversation not found') {
        return res.status(404).json({ error: 'conversation not found' });
      }
      if (msg === 'no messages to evaluate') {
        return res.status(400).json({ error: 'no messages to evaluate' });
      }
      if (isEvaluationError(e)) {
        const body: Record<string, unknown> = {
          error:
            e.code === 'EVALUATOR_PARSE'
              ? 'evaluator_malformed_json'
              : 'evaluator_validation_failed',
          message: e.message,
        };
        if (e.code === 'EVALUATOR_VALIDATION' && e.cause instanceof z.ZodError) {
          body.details = e.cause.flatten();
        }
        return res.status(400).json(body);
      }
      throw e;
    }
  })
);

// ===========================================
// SCRIPT GENERATION - Fixed JSON shape
// ===========================================

const GenReq = z.object({
  productId: z.string(),
  personaId: z.string().optional(),
  tone: z.string().optional(),
});

app.post(
  '/generate-script',
  asyncHandler(async (req: Request, res: Response) => {
    const { productId, personaId, tone } = GenReq.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'product not found' });

    const persona = personaId
      ? await prisma.persona.findUnique({ where: { id: personaId } })
      : null;

    const cacheKey = `${product.id}:${persona?.id ?? 'none'}:${tone ?? 'neutral'}`;

    // Check cache
    const existing = await prisma.script.findUnique({ where: { cacheKey } });
    if (existing) {
      const content: any = existing.content;
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

${
  persona
    ? `CUSTOMER TYPE: ${persona.name}\n${persona.instructions}`
    : 'CUSTOMER: General fashion shopper'
}

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

    const scriptResponse = await llm.chat([
      {
        role: 'system',
        content:
          'You are a fashion retail sales training expert. Generate practical, conversational scripts for clothing store associates.',
      },
      { role: 'user', content: scriptPrompt },
    ]);

    const scriptContent = {
      persona: persona?.name || 'General',
      script: scriptResponse,
      tone: tone || 'neutral',
      productId: product.id,
      generatedAt: new Date().toISOString(),
    };

    const saved = await prisma.script.create({
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
  })
);

function formatScriptToString(content: any): string {
  if (typeof content === 'string') return content;
  if (content?.script) {
    if (typeof content.script === 'string') return content.script;
    if (Array.isArray(content.script)) return content.script.join('\n\n');
  }
  if (Array.isArray(content)) return content.join('\n\n');
  return JSON.stringify(content, null, 2);
}

// ===========================================
// TEST ENDPOINTS
// ===========================================

app.get(
  '/test-llm',
  asyncHandler(async (_req: Request, res: Response) => {
    const response = await llm.chat([{ role: 'user', content: 'Say hello! This is a test.' }]);
    res.json({ ok: true, response });
  })
);

// ===========================================
// ERROR HANDLING
// ===========================================

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
}
