import type { SalesSkill } from '../../schemas/coaching';

export type CoherenceResult = {
  /** Max 3 skills, ordered by input priority. */
  skills: SalesSkill[];
  /** When two skills are merged into one stance, set theme; otherwise undefined. */
  scenarioTheme?: string;
  /** Skill ids dropped because merged with another (subset of input). */
  droppedSkills: SalesSkill[];
};

/**
 * Deterministic trimming and merging:
 * - Cap at 3 weaknesses.
 * - Merge known pairs into a single "theme" so we do not stack redundant pressures.
 */
export function mergeWeaknessesForScenario(orderedWeaknesses: SalesSkill[]): CoherenceResult {
  const unique: SalesSkill[] = [];
  for (const w of orderedWeaknesses) {
    if (!unique.includes(w)) unique.push(w);
  }

  let skills = unique.slice(0, 3);
  const dropped: SalesSkill[] = [];
  let scenarioTheme: string | undefined;

  // discovery + empathy → one shopper stance
  if (skills.includes('discovery_questions') && skills.includes('empathy')) {
    scenarioTheme =
      'You are a bit guarded and unsure at first; share needs slowly and show mild discomfort until the associate earns trust with good questions.';
    skills = skills.filter((s) => s !== 'empathy');
    dropped.push('empathy');
  }

  // objection + closing → price/commitment thread (keep both but note theme)
  if (skills.includes('objection_handling') && skills.includes('closing')) {
    scenarioTheme =
      scenarioTheme ??
      'You are interested but careful about committing—raise concerns naturally and avoid a quick yes.';
  }

  // product_knowledge + storytelling → want substance, not a catalog
  if (skills.includes('product_knowledge') && skills.includes('storytelling')) {
    scenarioTheme =
      scenarioTheme ??
      'You respond when the associate explains how pieces work and fit real life—not when they only recite specs.';
  }

  skills = skills.slice(0, 3);

  const result: CoherenceResult = {
    skills,
    droppedSkills: dropped,
  };
  if (scenarioTheme !== undefined) {
    result.scenarioTheme = scenarioTheme;
  }
  return result;
}
