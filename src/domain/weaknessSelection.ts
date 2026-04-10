import type { SalesSkill } from '../schemas/coaching';
import { SALES_SKILLS } from '../schemas/coaching';

/**
 * Top 3 weaknesses: include all skills with score < 5; if fewer than 3, fill with lowest scores overall.
 * If 3+ skills are below 5, take the 3 lowest scores.
 */
export function selectTopWeaknesses(scores: Record<SalesSkill, number>): SalesSkill[] {
  const entries = SALES_SKILLS.map((skill) => ({ skill, score: scores[skill] }));
  entries.sort((a, b) => a.score - b.score);

  const below5 = entries.filter((e) => e.score < 5);
  if (below5.length >= 3) {
    return entries.slice(0, 3).map((e) => e.skill);
  }

  const result: SalesSkill[] = [];
  for (const e of below5) {
    if (result.length >= 3) break;
    result.push(e.skill);
  }
  for (const e of entries) {
    if (result.length >= 3) break;
    if (!result.includes(e.skill)) result.push(e.skill);
  }
  return result.slice(0, 3);
}
