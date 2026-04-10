import { SALES_SKILLS, type SalesSkill } from '../schemas/coaching';
import type { TrainingAnalytics } from '../schemas/trainingAnalytics';
import { TeamAnalyticsSchema, type TeamAnalytics, type TeamSkillAnalytics } from '../schemas/teamAnalytics';
import { prisma } from '../db';
import { buildUserTrainingAnalytics } from './userTrainingAnalyticsService';

function skillIndex(s: SalesSkill): number {
  return SALES_SKILLS.indexOf(s);
}

/**
 * Pure aggregation for tests. Excludes users with sessionsAnalyzed === 0 from per-skill team averages
 * and from weakest/strongest user lists (no session data to rank).
 */
export function aggregateTeamAnalyticsFromUserAnalytics(
  analyticsByUser: Map<string, TrainingAnalytics>
): TeamAnalytics {
  const memberIds = [...analyticsByUser.keys()].sort((a, b) => a.localeCompare(b));

  const activeMembers = memberIds.filter((uid) => (analyticsByUser.get(uid)?.sessionsAnalyzed ?? 0) > 0);

  const skills: TeamSkillAnalytics[] = SALES_SKILLS.map((skill) => {
    const scores: { userId: string; score: number }[] = [];
    for (const uid of activeMembers) {
      const a = analyticsByUser.get(uid)!;
      const row = a.skills.find((s) => s.skill === skill);
      if (row) {
        scores.push({ userId: uid, score: row.averageScore });
      }
    }

    let averageScore = 0;
    if (scores.length > 0) {
      averageScore = scores.reduce((sum, x) => sum + x.score, 0) / scores.length;
    }

    let weakestUsers: string[] = [];
    let strongestUsers: string[] = [];
    if (scores.length > 0) {
      const minS = Math.min(...scores.map((s) => s.score));
      const maxS = Math.max(...scores.map((s) => s.score));
      weakestUsers = scores
        .filter((s) => s.score === minS)
        .map((s) => s.userId)
        .sort((a, b) => a.localeCompare(b));
      strongestUsers = scores
        .filter((s) => s.score === maxS)
        .map((s) => s.userId)
        .sort((a, b) => a.localeCompare(b));
    }

    return {
      skill,
      averageScore,
      weakestUsers,
      strongestUsers,
    };
  });

  let teamWeakestSkill: SalesSkill | undefined;
  let teamStrongestSkill: SalesSkill | undefined;
  if (activeMembers.length > 0) {
    let bestAvg = -Infinity;
    for (const row of skills) {
      if (row.averageScore > bestAvg) {
        bestAvg = row.averageScore;
        teamStrongestSkill = row.skill;
      } else if (row.averageScore === bestAvg && teamStrongestSkill !== undefined) {
        if (skillIndex(row.skill) < skillIndex(teamStrongestSkill)) {
          teamStrongestSkill = row.skill;
        }
      }
    }
    let worstAvg = Infinity;
    for (const row of skills) {
      if (row.averageScore < worstAvg) {
        worstAvg = row.averageScore;
        teamWeakestSkill = row.skill;
      } else if (row.averageScore === worstAvg && teamWeakestSkill !== undefined) {
        if (skillIndex(row.skill) < skillIndex(teamWeakestSkill)) {
          teamWeakestSkill = row.skill;
        }
      }
    }
  }

  let totalSessions = 0;
  const memberMeans: number[] = [];
  for (const uid of memberIds) {
    const a = analyticsByUser.get(uid)!;
    totalSessions += a.sessionsAnalyzed;
    if (a.sessionsAnalyzed > 0 && a.skills.length > 0) {
      const m = a.skills.reduce((s, r) => s + r.averageScore, 0) / a.skills.length;
      memberMeans.push(m);
    }
  }

  let averageProgress: number | undefined;
  if (memberMeans.length > 0) {
    averageProgress = memberMeans.reduce((s, x) => s + x, 0) / memberMeans.length;
  }

  const raw: TeamAnalytics = {
    skills,
    teamWeakestSkill,
    teamStrongestSkill,
    averageProgress,
    totalSessions,
  };

  const parsed = TeamAnalyticsSchema.safeParse(raw);
  return parsed.success ? parsed.data : raw;
}

export async function buildTeamTrainingAnalytics(teamId: string): Promise<TeamAnalytics> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });
  const map = new Map<string, TrainingAnalytics>();
  for (const m of members) {
    map.set(m.userId, await buildUserTrainingAnalytics(m.userId));
  }
  return aggregateTeamAnalyticsFromUserAnalytics(map);
}
