import type { SalesSkill } from '../schemas/coaching';
import { SALES_SKILLS } from '../schemas/coaching';
import { prisma } from '../db';
import { computeRollingScore } from '../domain/rollingScore';
import { computeTrendDirection, type TrendDirection } from '../domain/trend';
import { selectTopWeaknesses } from '../domain/weaknessSelection';
import type { SalesSkill as PrismaSkill } from '../../generated/prisma';
import { TrendDirection as PrismaTrend } from '../../generated/prisma';

function toPrismaTrend(t: TrendDirection): PrismaTrend {
  if (t === 'improving') return 'improving';
  if (t === 'declining') return 'declining';
  return 'stable';
}

function defaultScores(): Record<SalesSkill, number> {
  return {
    discovery_questions: 5,
    objection_handling: 5,
    product_knowledge: 5,
    closing: 5,
    storytelling: 5,
    empathy: 5,
  };
}

export async function getMergedSkillScoresForUser(
  userId: string
): Promise<Record<SalesSkill, number>> {
  const rows = await prisma.userWeaknessProfile.findMany({ where: { userId } });
  const scores = defaultScores();
  for (const row of rows) {
    scores[row.skill as SalesSkill] = row.currentScore;
  }
  return scores;
}

/** Top weaknesses for adaptive scenario (up to 3). Empty if user has no profile rows yet. */
export async function getTopWeaknessesForUser(
  userId: string,
  limit: number
): Promise<SalesSkill[]> {
  const rows = await prisma.userWeaknessProfile.findMany({ where: { userId } });
  if (rows.length === 0) return [];
  const scores = await getMergedSkillScoresForUser(userId);
  return selectTopWeaknesses(scores).slice(0, limit);
}

export async function updateProfilesAfterSimulation(args: {
  userId: string;
  conversationId: string;
  /** Per-skill score from this simulation (1–10) */
  skillScores: Record<SalesSkill, number>;
}): Promise<void> {
  const { userId, conversationId, skillScores } = args;

  for (const skill of SALES_SKILLS) {
    const newSimulationScore = skillScores[skill];
    const existing = await prisma.userWeaknessProfile.findUnique({
      where: { userId_skill: { userId, skill: skill as PrismaSkill } },
    });

    const previous = existing?.currentScore ?? null;
    const newCurrent = computeRollingScore(previous, newSimulationScore);
    const trend = computeTrendDirection(previous, newCurrent);

    await prisma.userWeaknessProfile.upsert({
      where: { userId_skill: { userId, skill: skill as PrismaSkill } },
      create: {
        userId,
        skill: skill as PrismaSkill,
        currentScore: newCurrent,
        trendDirection: toPrismaTrend(trend),
        lastSimulationId: conversationId,
      },
      update: {
        currentScore: newCurrent,
        trendDirection: toPrismaTrend(trend),
        lastSimulationId: conversationId,
      },
    });
  }
}

export async function listWeaknessProfilesForUser(userId: string) {
  return prisma.userWeaknessProfile.findMany({
    where: { userId },
    orderBy: { skill: 'asc' },
  });
}
