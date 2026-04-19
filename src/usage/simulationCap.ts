import { prisma } from '../db';
import { FREE_SIMULATION_LIMIT } from '../billing/entitlements';

export type SimulationCapDenied = {
  ok: false;
  code: 'PAYWALL_FREE_SIM_LIMIT';
  limit: number;
  current: number;
};

export type SimulationCapAllowed = { ok: true };

export type SimulationCapDecision = SimulationCapAllowed | SimulationCapDenied;

/**
 * Atomically checks and increments the per-user simulation count.
 * Uses row-level locking on UserSimulationUsage to prevent concurrent bypass.
 */
export async function assertAndIncrementSimulationCount(args: {
  userId: string;
}): Promise<SimulationCapDecision> {
  const userId = args.userId;

  return prisma.$transaction(async (tx) => {
    await tx.userSimulationUsage.upsert({
      where: { userId },
      create: { userId, uniqueSimulationsCount: 0 },
      update: {},
    });

    const locked = (await tx.$queryRaw<
      { userId: string; uniqueSimulationsCount: number }[]
    >`SELECT "userId", "uniqueSimulationsCount" FROM "UserSimulationUsage" WHERE "userId" = ${userId} FOR UPDATE`)[0];

    const current = locked?.uniqueSimulationsCount ?? 0;
    if (current >= FREE_SIMULATION_LIMIT) {
      return { ok: false, code: 'PAYWALL_FREE_SIM_LIMIT', limit: FREE_SIMULATION_LIMIT, current };
    }

    await tx.userSimulationUsage.update({
      where: { userId },
      data: { uniqueSimulationsCount: { increment: 1 } },
    });

    return { ok: true };
  });
}

