import type { Prisma } from '../../generated/prisma';
import { prisma } from '../db';
import type { SalesSkill } from '../schemas/coaching';

export type TrainingFocusRow = {
  userId: string;
  focusSkills: SalesSkill[];
  sessionsRemaining: number | null;
  source: string;
  updatedAt: Date;
};

export async function getTrainingFocusForUser(userId: string): Promise<TrainingFocusRow | null> {
  const row = await prisma.userTrainingFocus.findUnique({ where: { userId } });
  if (!row) return null;
  const focusSkills = row.focusSkills as unknown as SalesSkill[];
  return {
    userId: row.userId,
    focusSkills: Array.isArray(focusSkills) ? focusSkills : [],
    sessionsRemaining: row.sessionsRemaining,
    source: row.source,
    updatedAt: row.updatedAt,
  };
}

export async function upsertTrainingFocus(args: {
  userId: string;
  focusSkills: SalesSkill[];
  sessionsRemaining?: number | null;
  source?: string;
}): Promise<TrainingFocusRow> {
  const data: Prisma.UserTrainingFocusCreateInput = {
    userId: args.userId,
    focusSkills: args.focusSkills as unknown as Prisma.InputJsonValue,
    sessionsRemaining: args.sessionsRemaining ?? null,
    source: args.source ?? 'user',
  };

  const row = await prisma.userTrainingFocus.upsert({
    where: { userId: args.userId },
    create: data,
    update: {
      focusSkills: args.focusSkills as unknown as Prisma.InputJsonValue,
      ...(args.sessionsRemaining !== undefined ? { sessionsRemaining: args.sessionsRemaining } : {}),
      ...(args.source ? { source: args.source } : {}),
    },
  });

  const focusSkills = row.focusSkills as unknown as SalesSkill[];
  return {
    userId: row.userId,
    focusSkills: Array.isArray(focusSkills) ? focusSkills : [],
    sessionsRemaining: row.sessionsRemaining,
    source: row.source,
    updatedAt: row.updatedAt,
  };
}

export async function clearTrainingFocus(userId: string): Promise<void> {
  await prisma.userTrainingFocus.deleteMany({ where: { userId } });
}

/** After a successful graded session, count down pinned sessions if the user set a limit. */
export async function decrementTrainingFocusSessionIfAny(userId: string): Promise<void> {
  const row = await prisma.userTrainingFocus.findUnique({ where: { userId } });
  if (!row || row.sessionsRemaining == null || row.sessionsRemaining <= 0) return;
  await prisma.userTrainingFocus.update({
    where: { userId },
    data: { sessionsRemaining: row.sessionsRemaining - 1 },
  });
}
