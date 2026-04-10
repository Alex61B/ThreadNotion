import type { Prisma, PrismaClient } from '../../generated/prisma';

export type LinkAnonymousResult =
  | { ok: true; status: 'noop_same_id' }
  | { ok: true; status: 'already_linked' }
  | { ok: false; status: 'claimed_by_other' }
  | { ok: true; status: 'linked' };

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

function normalizeId(id: string): string {
  return id.trim();
}

function unionFocusSkills(a: unknown, b: unknown): Prisma.InputJsonValue {
  const arrA = Array.isArray(a) ? [...a] : [];
  const arrB = Array.isArray(b) ? [...b] : [];
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const x of [...arrA, ...arrB]) {
    const k = JSON.stringify(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out as Prisma.InputJsonValue;
}

function minSessions(
  a: number | null | undefined,
  b: number | null | undefined
): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b ?? null;
  if (b == null) return a;
  return Math.min(a, b);
}

/**
 * Move anonymous (localStorage UUID) training/team rows onto an authenticated User.id.
 * Idempotent per anonymousUserId via AnonymousIdentityClaim.
 */
export async function linkAnonymousToAuth(
  prisma: PrismaClient,
  args: { anonymousUserId: string; authUserId: string }
): Promise<LinkAnonymousResult> {
  const anonymousUserId = normalizeId(args.anonymousUserId);
  const authUserId = normalizeId(args.authUserId);

  if (!anonymousUserId || !authUserId) {
    return { ok: true, status: 'noop_same_id' };
  }
  if (anonymousUserId === authUserId) {
    return { ok: true, status: 'noop_same_id' };
  }

  const existingClaim = await prisma.anonymousIdentityClaim.findUnique({
    where: { anonymousUserId },
  });
  if (existingClaim) {
    if (existingClaim.authUserId === authUserId) {
      return { ok: true, status: 'already_linked' };
    }
    return { ok: false, status: 'claimed_by_other' };
  }

  let txResult: 'linked' | 'already_in_tx';
  try {
    txResult = await prisma.$transaction(async (tx: Tx) => {
    const claimAgain = await tx.anonymousIdentityClaim.findUnique({
      where: { anonymousUserId },
    });
    if (claimAgain) {
      if (claimAgain.authUserId !== authUserId) {
        throw new Error('CLAIM_CONFLICT');
      }
      return 'already_in_tx' as const;
    }

    await tx.conversation.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: authUserId },
    });

    await tx.team.updateMany({
      where: { ownerId: anonymousUserId },
      data: { ownerId: authUserId },
    });

    await tx.trainingAssignment.updateMany({
      where: { assignedBy: anonymousUserId },
      data: { assignedBy: authUserId },
    });
    await tx.trainingAssignment.updateMany({
      where: { targetUserId: anonymousUserId },
      data: { targetUserId: authUserId },
    });

    await tx.simulationSkillScore.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: authUserId },
    });

    await tx.simulationEvaluationSummary.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: authUserId },
    });

    const anonMembers = await tx.teamMember.findMany({
      where: { userId: anonymousUserId },
    });
    for (const m of anonMembers) {
      const dup = await tx.teamMember.findUnique({
        where: {
          teamId_userId: { teamId: m.teamId, userId: authUserId },
        },
      });
      if (dup) {
        await tx.teamMember.delete({ where: { id: m.id } });
      } else {
        await tx.teamMember.update({
          where: { id: m.id },
          data: { userId: authUserId },
        });
      }
    }

    const anonWeak = await tx.userWeaknessProfile.findMany({
      where: { userId: anonymousUserId },
    });
    for (const row of anonWeak) {
      const existing = await tx.userWeaknessProfile.findUnique({
        where: {
          userId_skill: { userId: authUserId, skill: row.skill },
        },
      });
      if (!existing) {
        await tx.userWeaknessProfile.update({
          where: { id: row.id },
          data: { userId: authUserId },
        });
      } else {
        const prefExisting = existing.currentScore >= row.currentScore;
        const score = prefExisting ? existing.currentScore : row.currentScore;
        const trend = prefExisting ? existing.trendDirection : row.trendDirection;
        const lastSim = prefExisting
          ? existing.lastSimulationId
          : row.lastSimulationId ?? existing.lastSimulationId;
        await tx.userWeaknessProfile.update({
          where: { id: existing.id },
          data: {
            currentScore: score,
            trendDirection: trend,
            lastSimulationId: lastSim,
          },
        });
        await tx.userWeaknessProfile.delete({ where: { id: row.id } });
      }
    }

    const anonFocus = await tx.userTrainingFocus.findUnique({
      where: { userId: anonymousUserId },
    });
    const authFocus = await tx.userTrainingFocus.findUnique({
      where: { userId: authUserId },
    });
    if (anonFocus && !authFocus) {
      await tx.userTrainingFocus.update({
        where: { userId: anonymousUserId },
        data: { userId: authUserId },
      });
    } else if (anonFocus && authFocus) {
      const merged = unionFocusSkills(authFocus.focusSkills, anonFocus.focusSkills);
      const sessions = minSessions(
        authFocus.sessionsRemaining,
        anonFocus.sessionsRemaining
      );
      await tx.userTrainingFocus.update({
        where: { userId: authUserId },
        data: {
          focusSkills: merged,
          sessionsRemaining: sessions,
        },
      });
      await tx.userTrainingFocus.delete({ where: { userId: anonymousUserId } });
    }

    await tx.anonymousIdentityClaim.create({
      data: { anonymousUserId, authUserId },
    });
    return 'linked' as const;
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'CLAIM_CONFLICT') {
      return { ok: false, status: 'claimed_by_other' };
    }
    throw e;
  }

  if (txResult === 'already_in_tx') {
    return { ok: true, status: 'already_linked' };
  }
  return { ok: true, status: 'linked' };
}
