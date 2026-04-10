import { prisma } from '../db';
import { computeModeAnalytics } from '../domain/trainingAnalytics/computeModeAnalytics';
import { computeSkillAnalytics } from '../domain/trainingAnalytics/computeSkillAnalytics';
import { selectNotables } from '../domain/trainingAnalytics/selectNotables';
import type { GradedSessionScores } from '../domain/trainingAnalytics/types';
import { SALES_SKILLS, type SalesSkill } from '../schemas/coaching';
import { TrainingAnalyticsSchema, type TrainingAnalytics } from '../schemas/trainingAnalytics';

function scoresFromRows(
  rows: Array<{ skill: string; score: number }>
): Record<SalesSkill, number> | null {
  const map = new Map(rows.map((r) => [r.skill, r.score] as const));
  const out = {} as Record<SalesSkill, number>;
  for (const skill of SALES_SKILLS) {
    const v = map.get(skill);
    if (v === undefined) return null;
    out[skill] = v;
  }
  return out;
}

export function computeTrainingAnalyticsFromSessions(
  sessions: GradedSessionScores[]
): TrainingAnalytics {
  if (sessions.length === 0) {
    const parsed = TrainingAnalyticsSchema.safeParse({
      skills: [],
      modes: computeModeAnalytics([]),
      sessionsAnalyzed: 0,
    });
    return parsed.success ? parsed.data : { skills: [], modes: computeModeAnalytics([]), sessionsAnalyzed: 0 };
  }

  const skills = computeSkillAnalytics(sessions);
  const modes = computeModeAnalytics(sessions);
  const notables = selectNotables(skills);
  const raw = {
    skills,
    modes,
    sessionsAnalyzed: sessions.length,
    strongestSkill: notables.strongestSkill,
    weakestSkill: notables.weakestSkill,
    mostImprovedSkill: notables.mostImprovedSkill,
    persistentWeakness: notables.persistentWeakness,
  };
  const parsed = TrainingAnalyticsSchema.safeParse(raw);
  return parsed.success ? parsed.data : { skills, modes, sessionsAnalyzed: sessions.length };
}

export async function buildUserTrainingAnalytics(userId: string): Promise<TrainingAnalytics> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        evaluationSummary: { isNot: null },
      },
      orderBy: { evaluationSummary: { createdAt: 'asc' } },
      select: {
        id: true,
        createdAt: true,
        simulationMode: true,
        evaluationSummary: { select: { createdAt: true } },
        skillScores: { select: { skill: true, score: true } },
      },
    });

    const sessions: GradedSessionScores[] = [];
    for (const c of conversations) {
      const scores = scoresFromRows(c.skillScores);
      if (!scores) continue;
      const gradedAt = c.evaluationSummary?.createdAt ?? c.createdAt;
      sessions.push({
        conversationId: c.id,
        gradedAt: gradedAt.toISOString(),
        mode: c.simulationMode as GradedSessionScores['mode'],
        scores,
      });
    }

    sessions.sort(
      (a, b) => new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime()
    );

    return computeTrainingAnalyticsFromSessions(sessions);
  } catch {
    const empty = TrainingAnalyticsSchema.safeParse({
      skills: [],
      modes: computeModeAnalytics([]),
      sessionsAnalyzed: 0,
    });
    return empty.success
      ? empty.data
      : { skills: [], modes: computeModeAnalytics([]), sessionsAnalyzed: 0 };
  }
}
