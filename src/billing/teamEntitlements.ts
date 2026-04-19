import { prisma } from '../db';
import type { EntitlementSubjectType, SubscriptionSeatBundle, SubscriptionPlanType } from '../../generated/prisma';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function maxSeatsFromBundle(bundle: SubscriptionSeatBundle): number {
  switch (bundle) {
    case 'SEATS_10':
      return 10;
    case 'SEATS_25':
      return 25;
    case 'SEATS_50':
      return 50;
    default:
      return 0;
  }
}

export function getTeamDailyTokenLimit(bundle: SubscriptionSeatBundle): number {
  switch (bundle) {
    case 'SEATS_10':
      return envInt('TEAM_DAILY_TOKEN_LIMIT_10', 500_000);
    case 'SEATS_25':
      return envInt('TEAM_DAILY_TOKEN_LIMIT_25', 1_250_000);
    case 'SEATS_50':
      return envInt('TEAM_DAILY_TOKEN_LIMIT_50', 2_500_000);
    default:
      return 0;
  }
}

export async function upsertTeamEntitlement(args: {
  teamId: string;
  planType: SubscriptionPlanType;
  seatBundle: SubscriptionSeatBundle;
}): Promise<void> {
  if (args.planType !== 'TEAM') {
    // If team is not paid, remove entitlement by setting FREE-like values.
    await prisma.entitlement.upsert({
      where: { subjectType_subjectId: { subjectType: 'TEAM' as EntitlementSubjectType, subjectId: args.teamId } },
      create: {
        subjectType: 'TEAM' as EntitlementSubjectType,
        subjectId: args.teamId,
        planType: 'FREE',
        maxSeats: 0,
        dailyTokenLimit: 0,
        freeSimulationLimit: 5,
      },
      update: { planType: 'FREE', maxSeats: 0, dailyTokenLimit: 0, freeSimulationLimit: 5 },
    });
    return;
  }

  const maxSeats = maxSeatsFromBundle(args.seatBundle);
  const dailyTokenLimit = getTeamDailyTokenLimit(args.seatBundle);

  await prisma.entitlement.upsert({
    where: { subjectType_subjectId: { subjectType: 'TEAM' as EntitlementSubjectType, subjectId: args.teamId } },
    create: {
      subjectType: 'TEAM' as EntitlementSubjectType,
      subjectId: args.teamId,
      planType: 'TEAM',
      maxSeats,
      dailyTokenLimit,
      freeSimulationLimit: 5,
    },
    update: {
      planType: 'TEAM',
      maxSeats,
      dailyTokenLimit,
      freeSimulationLimit: 5,
    },
  });
}

