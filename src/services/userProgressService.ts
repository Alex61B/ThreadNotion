import type { SalesSkill } from '../schemas/coaching';
import { SALES_SKILLS } from '../schemas/coaching';
import type { ProgressSnapshot, SkillProgress } from '../schemas/progressSnapshot';
import { prisma } from '../db';
import { selectTopWeaknesses } from '../domain/weaknessSelection';
import {
  buildOverallProgressSummary,
  buildRecommendedFocusMessage,
  pickRecommendedFocusSkills,
  type ProfileRow,
  type TrendDir,
} from '../domain/progressRecommendation';
import { listWeaknessProfilesForUser } from './weaknessProfileService';
import type { SalesSkill as PrismaSkill } from '../../generated/prisma';

function scoresMapFromRows(
  rows: { conversationId: string; skill: PrismaSkill; score: number }[]
): Map<string, Record<SalesSkill, number>> {
  const byConv = new Map<string, Record<SalesSkill, number>>();
  for (const r of rows) {
    let m = byConv.get(r.conversationId);
    if (!m) {
      m = {} as Record<SalesSkill, number>;
      byConv.set(r.conversationId, m);
    }
    m[r.skill as SalesSkill] = r.score;
  }
  return byConv;
}

/**
 * Aggregates profile + last two graded simulation scores into a lightweight progress snapshot.
 */
export async function buildProgressSnapshot(userId: string): Promise<ProgressSnapshot> {
  const rows = await listWeaknessProfilesForUser(userId);
  const rowBySkill = new Map(rows.map((r) => [r.skill as SalesSkill, r]));

  const profiles: ProfileRow[] = SALES_SKILLS.map((skill) => {
    const r = rowBySkill.get(skill);
    return {
      skill,
      currentScore: r?.currentScore ?? 5,
      trendDirection: (r?.trendDirection ?? 'stable') as TrendDir,
    };
  });

  const scoresRecord = {} as Record<SalesSkill, number>;
  for (const p of profiles) {
    scoresRecord[p.skill] = p.currentScore;
  }
  const lowestSkills = selectTopWeaknesses(scoresRecord);

  const profilesBySkill = new Map<SalesSkill, TrendDir>();
  for (const p of profiles) {
    profilesBySkill.set(p.skill, p.trendDirection);
  }

  const decliningSkills = SALES_SKILLS.filter((s) => profilesBySkill.get(s) === 'declining');

  const recommendedFocusSkills = pickRecommendedFocusSkills({
    lowestSkills,
    profilesBySkill,
    maxSkills: 3,
  });

  const recommendedFocusMessage = buildRecommendedFocusMessage(recommendedFocusSkills, decliningSkills);

  const recentSummaries = await prisma.simulationEvaluationSummary.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: { conversationId: true },
  });

  const conversationIds = recentSummaries.map((s) => s.conversationId);
  const hasTwoSimulations = conversationIds.length >= 2;

  let latestBySkill: Record<SalesSkill, number> | undefined;
  let previousBySkill: Record<SalesSkill, number> | undefined;

  if (conversationIds.length > 0) {
    const skillRows = await prisma.simulationSkillScore.findMany({
      where: { conversationId: { in: conversationIds } },
    });
    const grouped = scoresMapFromRows(skillRows);

    const latestId = conversationIds[0]!;
    latestBySkill = grouped.get(latestId);

    if (conversationIds.length >= 2) {
      const prevId = conversationIds[1]!;
      previousBySkill = grouped.get(prevId);
    }
  }

  const skillProgressList: SkillProgress[] = SALES_SKILLS.map((skill) => {
    const prof = profiles.find((p) => p.skill === skill)!;
    const latest = latestBySkill?.[skill];
    const previous = previousBySkill?.[skill];
    let latestDelta: number | undefined;
    if (latest !== undefined && previous !== undefined) {
      latestDelta = Math.round((latest - previous) * 10) / 10;
    }
    const entry: SkillProgress = {
      skill,
      currentScore: Math.round(prof.currentScore * 10) / 10,
      trendDirection: prof.trendDirection,
    };
    if (latest !== undefined) entry.latestSimulationScore = latest;
    if (previous !== undefined) entry.previousSimulationScore = previous;
    if (latestDelta !== undefined) entry.latestDelta = latestDelta;
    return entry;
  });

  const overallProgressSummary = buildOverallProgressSummary({
    lowestSkills,
    profiles,
    hasTwoSimulations,
  });

  return {
    skills: skillProgressList,
    lowestSkills,
    recommendedFocusSkills,
    recommendedFocusMessage,
    overallProgressSummary,
  };
}
