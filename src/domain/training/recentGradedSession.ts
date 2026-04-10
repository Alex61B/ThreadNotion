import type { SalesSkill } from '../../schemas/coaching';

export type RecentGradedSession = {
  conversationId: string;
  createdAt: Date;
  simulationMode: 'generic' | 'adaptive' | 'drill';
  drillPrimarySkill?: SalesSkill;
  drillSecondarySkill?: SalesSkill;
  adaptiveTargetWeaknesses: SalesSkill[];
  /** Lowest-scoring skill in that graded session when all six scores exist. */
  lowestSkillInSession?: SalesSkill;
};

/** Count consecutive drills (from newest) targeting the same primary skill. */
export function consecutiveDrillStreakForSkill(
  sessions: RecentGradedSession[],
  skill: SalesSkill
): number {
  let n = 0;
  for (const s of sessions) {
    if (s.simulationMode !== 'drill') break;
    if (s.drillPrimarySkill === skill) n += 1;
    else break;
  }
  return n;
}

/** True if the last N sessions share the same lowest skill (when all have lowestSkillInSession). */
export function stagnationSameLowest(
  sessions: RecentGradedSession[],
  n: number
): SalesSkill | null {
  const slice = sessions.slice(0, n);
  if (slice.length < n) return null;
  const lows = slice.map((s) => s.lowestSkillInSession).filter(Boolean) as SalesSkill[];
  if (lows.length < n) return null;
  const first = lows[0]!;
  return lows.every((x) => x === first) ? first : null;
}

function sessionTouchesSkill(session: RecentGradedSession, skill: SalesSkill): boolean {
  if (session.drillPrimarySkill === skill || session.drillSecondarySkill === skill) return true;
  if (session.adaptiveTargetWeaknesses.includes(skill)) return true;
  if (session.lowestSkillInSession === skill) return true;
  return false;
}

/**
 * Sessions are newest-first. Returns how many graded sessions sit above the last time `skill`
 * was practiced in drill/adaptive/lowest-skill context. 0 = touched in the latest session.
 */
export function sessionsSinceLastTouchedSkill(
  sessions: RecentGradedSession[],
  skill: SalesSkill
): number {
  for (let i = 0; i < sessions.length; i++) {
    if (sessionTouchesSkill(sessions[i]!, skill)) return i;
  }
  return sessions.length;
}

/** Primary focus skill from the most recent graded session, if inferable. */
export function lastPracticedSkillFromSessions(
  sessions: RecentGradedSession[]
): SalesSkill | undefined {
  const s = sessions[0];
  if (!s) return undefined;
  if (s.simulationMode === 'drill' && s.drillPrimarySkill) return s.drillPrimarySkill;
  if (s.adaptiveTargetWeaknesses.length > 0) return s.adaptiveTargetWeaknesses[0];
  return s.lowestSkillInSession;
}
