import { z } from 'zod';
import { prisma } from '../../db';
import {
  CreateCheckoutSessionBodySchema,
  CreatePortalSessionBodySchema,
  createCheckoutSession,
  createPortalSession,
} from '../../billing/checkoutSessions';
import { cancelUserSubscriptionsOnDelete, cancelTeamSubscriptionsOnDelete } from '../../billing/cancellation';
import { createTeamCheckoutSession, createTeamPortalSession } from '../../billing/teamBilling';
import {
  assertTeamManagerOrOwner,
} from '../../services/teamService';
import { teamAccessErrorToResult } from '../teamErrors';
import type { JsonHandlerResult } from '../httpTypes';
import { zodErrorResult } from '../zodHttp';

const TeamSeatBundleSchema = z.object({
  seatBundle: z.union([z.literal(10), z.literal(25), z.literal(50)]),
});

export async function postUserBillingCheckoutSession(rawBody: unknown): Promise<JsonHandlerResult> {
  const body = CreateCheckoutSessionBodySchema.safeParse(rawBody);
  if (!body.success) {
    return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
  }
  const out = await createCheckoutSession(body.data);
  return { status: 200, body: { ok: true, checkoutUrl: out.url } };
}

export async function postUserBillingPortalSession(rawBody: unknown): Promise<JsonHandlerResult> {
  const body = CreatePortalSessionBodySchema.safeParse(rawBody);
  if (!body.success) {
    return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
  }
  const out = await createPortalSession(body.data);
  return { status: 200, body: { ok: true, portalUrl: out.url } };
}

export async function postUserBillingCancel(userId: string): Promise<JsonHandlerResult> {
  await cancelUserSubscriptionsOnDelete({ userId });
  return { status: 200, body: { ok: true } };
}

export async function getUserBillingInvoices(userId: string): Promise<JsonHandlerResult> {
  const acct = await prisma.billingAccount.findUnique({ where: { userId } });
  if (!acct) return { status: 200, body: { ok: true, invoices: [] } };
  const invoices = await prisma.invoiceRecord.findMany({
    where: { billingAccountId: acct.id },
    orderBy: { issuedAt: 'desc' },
    take: 50,
  });
  return { status: 200, body: { ok: true, invoices } };
}

export async function getUserBillingStatus(userId: string): Promise<JsonHandlerResult> {
  const ent = await prisma.entitlement.findUnique({
    where: { subjectType_subjectId: { subjectType: 'USER', subjectId: userId } },
  });
  const planType = ent?.planType ?? 'FREE';
  const dailyLimit = ent?.dailyTokenLimit ?? 0;

  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const usageRow = await prisma.tokenUsageDaily.findUnique({
    where: { scopeType_scopeId_date: { scopeType: 'USER', scopeId: userId, date: today } },
  });
  const tokensUsedToday = usageRow ? Number(usageRow.tokensUsed) : 0;

  const simulationsUsed = await prisma.conversation.count({ where: { userId } });

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

export async function postTeamBillingCheckoutSession(
  teamId: string,
  actingUserId: string,
  rawBody: unknown
): Promise<JsonHandlerResult> {
  try {
    await assertTeamManagerOrOwner(teamId, actingUserId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }

  const body = TeamSeatBundleSchema.safeParse(rawBody);
  if (!body.success) {
    return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
  }

  const out = await createTeamCheckoutSession({
    actingUserId,
    teamId,
    seatBundle: body.data.seatBundle,
  });
  return { status: 200, body: { ok: true, checkoutUrl: out.url } };
}

export async function postTeamBillingPortalSession(
  teamId: string,
  actingUserId: string
): Promise<JsonHandlerResult> {
  try {
    await assertTeamManagerOrOwner(teamId, actingUserId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }
  const out = await createTeamPortalSession({ teamId });
  return { status: 200, body: { ok: true, portalUrl: out.url } };
}

export async function postTeamBillingCancel(teamId: string, actingUserId: string): Promise<JsonHandlerResult> {
  try {
    await assertTeamManagerOrOwner(teamId, actingUserId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }
  await cancelTeamSubscriptionsOnDelete({ teamId });
  return { status: 200, body: { ok: true } };
}

export async function getTeamBillingStatus(teamId: string, actingUserId: string): Promise<JsonHandlerResult> {
  try {
    await assertTeamManagerOrOwner(teamId, actingUserId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }

  const ent = await prisma.entitlement.findUnique({
    where: { subjectType_subjectId: { subjectType: 'TEAM', subjectId: teamId } },
  });
  const planType = ent?.planType ?? 'FREE';
  const dailyLimit = ent?.dailyTokenLimit ?? 0;
  const maxSeats = ent?.maxSeats ?? 0;

  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const usageRow = await prisma.tokenUsageDaily.findUnique({
    where: { scopeType_scopeId_date: { scopeType: 'TEAM', scopeId: teamId, date: today } },
  });
  const tokensUsedToday = usageRow ? Number(usageRow.tokensUsed) : 0;

  const activeMembers = await prisma.teamMember.count({ where: { teamId } });

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

export async function getTeamBillingInvoices(teamId: string, actingUserId: string): Promise<JsonHandlerResult> {
  try {
    await assertTeamManagerOrOwner(teamId, actingUserId);
  } catch (e) {
    const mapped = teamAccessErrorToResult(e);
    if (mapped) return mapped;
    throw e;
  }
  const acct = await prisma.billingAccount.findUnique({ where: { teamId } });
  if (!acct) return { status: 200, body: { ok: true, invoices: [] } };
  const invoices = await prisma.invoiceRecord.findMany({
    where: { billingAccountId: acct.id },
    orderBy: { issuedAt: 'desc' },
    take: 50,
  });
  return { status: 200, body: { ok: true, invoices } };
}
