import { prisma } from '../db';
import type { EntitlementSubjectType, SubscriptionPlanType } from '../../generated/prisma';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export const FREE_SIMULATION_LIMIT = 5;

export function getFreeDailyTokenLimit(): number {
  // MVP default keeps Free usable while still enforcing a cap.
  return envInt('FREE_DAILY_TOKEN_LIMIT', 20_000);
}

export function getIndividualDailyTokenLimit(): number {
  return envInt('INDIVIDUAL_DAILY_TOKEN_LIMIT', 200_000);
}

export async function upsertUserEntitlement(args: {
  userId: string;
  planType: SubscriptionPlanType;
}): Promise<void> {
  const dailyTokenLimit =
    args.planType === 'INDIVIDUAL' ? getIndividualDailyTokenLimit() : getFreeDailyTokenLimit();

  await prisma.entitlement.upsert({
    where: {
      subjectType_subjectId: { subjectType: 'USER' as EntitlementSubjectType, subjectId: args.userId },
    },
    create: {
      subjectType: 'USER' as EntitlementSubjectType,
      subjectId: args.userId,
      planType: args.planType,
      maxSeats: 1,
      dailyTokenLimit,
      freeSimulationLimit: FREE_SIMULATION_LIMIT,
    },
    update: {
      planType: args.planType,
      maxSeats: 1,
      dailyTokenLimit,
      freeSimulationLimit: FREE_SIMULATION_LIMIT,
    },
  });
}

