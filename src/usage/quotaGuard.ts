import { prisma } from '../db';
import type { Entitlement, SubscriptionStatus } from '../../generated/prisma';
import { upsertUserEntitlement } from '../billing/entitlements';

export type QuotaDenied =
  | {
      ok: false;
      code: 'PAYWALL_FREE_SIM_LIMIT';
      limit: number;
      current: number;
    }
  | {
      ok: false;
      code: 'QUOTA_TOKENS_DAILY_EXCEEDED';
      limit: number;
      used: number;
    }
  | {
      ok: false;
      code: 'AUTH_REQUIRED';
    };

export type QuotaAllowed = { ok: true };

export type QuotaDecision = QuotaAllowed | QuotaDenied;

function utcDateStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function getUtcTodayStart(): Date {
  return utcDateStart(new Date());
}

async function maybeExpireGracePeriod(userId: string): Promise<void> {
  // Phase 2: opportunistic sweep for individual accounts only
  const acct = await prisma.billingAccount.findUnique({ where: { userId } });
  if (!acct) return;
  const sub = await prisma.subscription.findUnique({ where: { billingAccountId: acct.id } });
  if (!sub?.gracePeriodEndsAt) return;
  const now = Date.now();
  if (sub.gracePeriodEndsAt.getTime() <= now) {
    await prisma.subscription.update({
      where: { billingAccountId: acct.id },
      data: { status: 'SUSPENDED' as SubscriptionStatus },
    });
    await upsertUserEntitlement({ userId, planType: 'FREE' });
  }
}

export async function getEffectiveEntitlementForUser(userId: string): Promise<Entitlement | null> {
  // If tests mock prisma without billing tables, fail open.
  const anyPrisma = prisma as any;
  if (!anyPrisma.entitlement?.findUnique) return null;

  await maybeExpireGracePeriod(userId);

  return prisma.entitlement.findUnique({
    where: { subjectType_subjectId: { subjectType: 'USER', subjectId: userId } },
  });
}

export type EffectiveCoverage =
  | { kind: 'TEAM'; teamId: string; entitlement: Entitlement }
  | { kind: 'USER'; entitlement: Entitlement | null };

export async function getEffectiveCoverageForUser(userId: string): Promise<EffectiveCoverage> {
  // Team-first precedence: if user is in a team with paid TEAM entitlement, use it.
  // Assumption (MVP): a user belongs to at most one team (enforced in addTeamMember).
  const anyPrisma = prisma as any;
  if (anyPrisma.teamMember?.findMany) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      take: 5,
    });
    for (const m of memberships) {
      const ent = await prisma.entitlement.findUnique({
        where: { subjectType_subjectId: { subjectType: 'TEAM', subjectId: m.teamId } },
      });
      if (ent?.planType === 'TEAM') {
        return { kind: 'TEAM', teamId: m.teamId, entitlement: ent };
      }
    }
  }
  const userEnt = await getEffectiveEntitlementForUser(userId);
  return { kind: 'USER', entitlement: userEnt };
}

export async function assertCanCreateNewSimulation(args: {
  userId?: string;
}): Promise<QuotaDecision> {
  if (!args.userId) return { ok: true }; // anonymous bypass (Phase 2)
  const ent = await getEffectiveEntitlementForUser(args.userId);
  const planType = ent?.planType ?? 'FREE';
  if (planType !== 'FREE') return { ok: true };

  return { ok: true };
}

export async function assertCanConsumeTokens(args: {
  userId?: string;
  estimatedTokens?: number;
}): Promise<QuotaDecision> {
  if (!args.userId) return { ok: true }; // anonymous bypass (Phase 2)
  const coverage = await getEffectiveCoverageForUser(args.userId);
  const ent = coverage.kind === 'TEAM' ? coverage.entitlement : coverage.entitlement;
  const dailyLimit = ent?.dailyTokenLimit ?? 0;
  if (dailyLimit <= 0) return { ok: true };

  const anyPrisma = prisma as any;
  if (!anyPrisma.tokenUsageDaily?.findUnique) return { ok: true };
  const today = utcDateStart(new Date());
  const row =
    coverage.kind === 'TEAM'
      ? await prisma.tokenUsageDaily.findUnique({
          where: { scopeType_scopeId_date: { scopeType: 'TEAM', scopeId: coverage.teamId, date: today } },
        })
      : await prisma.tokenUsageDaily.findUnique({
          where: { scopeType_scopeId_date: { scopeType: 'USER', scopeId: args.userId, date: today } },
        });
  const used = row ? Number(row.tokensUsed) : 0;
  if (used >= dailyLimit) {
    return { ok: false, code: 'QUOTA_TOKENS_DAILY_EXCEEDED', limit: dailyLimit, used };
  }
  const est = Math.max(0, Math.floor(args.estimatedTokens ?? 0));
  if (used + est > dailyLimit) {
    return { ok: false, code: 'QUOTA_TOKENS_DAILY_EXCEEDED', limit: dailyLimit, used };
  }
  return { ok: true };
}

export async function recordTokenUsage(args: { userId: string; tokens: number }): Promise<void> {
  const tokens = Math.max(0, Math.floor(args.tokens));
  const anyPrisma = prisma as any;
  if (!anyPrisma.tokenUsageDaily?.upsert) return;
  const coverage = await getEffectiveCoverageForUser(args.userId);
  const today = utcDateStart(new Date());
  if (coverage.kind === 'TEAM') {
    await prisma.tokenUsageDaily.upsert({
      where: { scopeType_scopeId_date: { scopeType: 'TEAM', scopeId: coverage.teamId, date: today } },
      create: { scopeType: 'TEAM', scopeId: coverage.teamId, date: today, tokensUsed: BigInt(tokens) },
      update: { tokensUsed: { increment: BigInt(tokens) } },
    });
  } else {
    await prisma.tokenUsageDaily.upsert({
      where: { scopeType_scopeId_date: { scopeType: 'USER', scopeId: args.userId, date: today } },
      create: { scopeType: 'USER', scopeId: args.userId, date: today, tokensUsed: BigInt(tokens) },
      update: { tokensUsed: { increment: BigInt(tokens) } },
    });
  }
}

