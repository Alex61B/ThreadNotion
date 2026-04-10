import { prisma } from '../db';
import { parseStoredAdaptivePlan } from '../domain/adaptive/parseStoredAdaptivePlan';
import { parseStoredDrillPlan } from '../domain/drill/parseStoredDrillPlan';
import type { RecentGradedSession } from '../domain/training/recentGradedSession';
import type { SalesSkill } from '../schemas/coaching';

export const RECENT_GRADED_SESSION_LIMIT = 8;

export type { RecentGradedSession } from '../domain/training/recentGradedSession';
export {
  consecutiveDrillStreakForSkill,
  stagnationSameLowest,
} from '../domain/training/recentGradedSession';

/**
 * Last N graded conversations for a user, newest first, with parsed plan metadata and per-session lowest skill.
 */
export async function loadRecentGradedSessions(
  userId: string,
  max: number = RECENT_GRADED_SESSION_LIMIT
): Promise<RecentGradedSession[]> {
  const convs = await prisma.conversation.findMany({
    where: {
      userId,
      evaluationSummary: { isNot: null },
    },
    orderBy: { createdAt: 'desc' },
    take: max,
    select: {
      id: true,
      createdAt: true,
      simulationMode: true,
      drillPlan: true,
      adaptiveScenarioPlan: true,
    },
  });

  if (convs.length === 0) return [];

  const ids = convs.map((c) => c.id);
  const scoreRows = await prisma.simulationSkillScore.findMany({
    where: { conversationId: { in: ids } },
  });

  const scoresByConv = new Map<string, typeof scoreRows>();
  for (const row of scoreRows) {
    const list = scoresByConv.get(row.conversationId) ?? [];
    list.push(row);
    scoresByConv.set(row.conversationId, list);
  }

  return convs.map((conv) => {
    const drill = parseStoredDrillPlan(conv.drillPlan, {
      where: 'recentTrainingContext',
      conversationId: conv.id,
    });
    const adaptive = parseStoredAdaptivePlan(conv.adaptiveScenarioPlan, {
      where: 'recentTrainingContext',
      conversationId: conv.id,
    });

    const rows = scoresByConv.get(conv.id) ?? [];
    let lowestSkillInSession: SalesSkill | undefined;
    if (rows.length >= 6) {
      const sorted = [...rows].sort((a, b) => a.score - b.score);
      lowestSkillInSession = sorted[0]!.skill as SalesSkill;
    }

    const session: RecentGradedSession = {
      conversationId: conv.id,
      createdAt: conv.createdAt,
      simulationMode: conv.simulationMode as RecentGradedSession['simulationMode'],
      adaptiveTargetWeaknesses: adaptive?.targetWeaknesses ?? [],
      ...(drill?.primarySkill != null ? { drillPrimarySkill: drill.primarySkill } : {}),
      ...(drill?.secondarySkill != null ? { drillSecondarySkill: drill.secondarySkill } : {}),
      ...(lowestSkillInSession != null ? { lowestSkillInSession } : {}),
    };
    return session;
  });
}
