import type { SalesSkill } from '../schemas/coaching';
import { SALES_SKILLS } from '../schemas/coaching';
import { skillLabel } from './skillLabels';

export type TrendDir = 'improving' | 'declining' | 'stable';

export type ProfileRow = {
  skill: SalesSkill;
  currentScore: number;
  trendDirection: TrendDir;
};

/**
 * Merge lowest skills with declining trends; cap length; deterministic order.
 */
export function pickRecommendedFocusSkills(args: {
  lowestSkills: SalesSkill[];
  profilesBySkill: Map<SalesSkill, TrendDir>;
  maxSkills?: number;
}): SalesSkill[] {
  const max = args.maxSkills ?? 3;
  const declining = SALES_SKILLS.filter((s) => args.profilesBySkill.get(s) === 'declining');
  const out: SalesSkill[] = [];

  for (const s of args.lowestSkills) {
    if (out.length >= max) break;
    if (!out.includes(s)) out.push(s);
  }
  for (const s of declining) {
    if (out.length >= max) break;
    if (!out.includes(s)) out.push(s);
  }
  for (const s of SALES_SKILLS) {
    if (out.length >= max) break;
    if (!out.includes(s)) out.push(s);
  }
  return out.slice(0, max);
}

export function buildRecommendedFocusMessage(focus: SalesSkill[], declining: SalesSkill[]): string {
  if (focus.length === 0) return 'Keep practicing across all six skills.';
  const names = focus.map(skillLabel);
  const focusStr =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  const decliningOverlap = declining.filter((s) => focus.includes(s));
  if (decliningOverlap.length > 0) {
    const d = decliningOverlap.map(skillLabel).join(', ');
    return `Focus next on ${focusStr}. ${d} ${decliningOverlap.length === 1 ? 'is' : 'are'} still trending down—extra reps help.`;
  }
  return `Focus next on ${focusStr}.`;
}

export function buildOverallProgressSummary(args: {
  lowestSkills: SalesSkill[];
  profiles: ProfileRow[];
  hasTwoSimulations: boolean;
}): string {
  const improving = args.profiles.filter((p) => p.trendDirection === 'improving').map((p) => skillLabel(p.skill));
  const declining = args.profiles.filter((p) => p.trendDirection === 'declining').map((p) => skillLabel(p.skill));
  const stable = args.profiles.filter((p) => p.trendDirection === 'stable').length;
  const weakest = args.lowestSkills[0] ? skillLabel(args.lowestSkills[0]) : null;

  const parts: string[] = [];

  if (improving.length > 0 && declining.length === 0) {
    parts.push(
      improving.length <= 2
        ? `You're improving in ${improving.join(' and ')}.`
        : `You're improving in several areas, including ${improving.slice(0, 2).join(' and ')}.`
    );
  } else if (declining.length > 0 && improving.length === 0) {
    parts.push(
      declining.length <= 2
        ? `${declining.join(' and ')} ${declining.length === 1 ? 'needs' : 'need'} attention compared with your rolling average.`
        : `Several skills are trending down—prioritize deliberate practice on your weakest areas.`
    );
  } else if (improving.length > 0 && declining.length > 0) {
    parts.push(
      `You're gaining ground in ${improving.slice(0, 2).join(' and ')} while ${declining.slice(0, 2).join(' and ')} still lag.`
    );
  } else {
    parts.push(`Your rolling scores are holding steady across most skills (${stable} stable).`);
  }

  if (weakest) {
    parts.push(`${weakest} remains among your lowest areas—targeted reps will move the needle.`);
  }

  if (args.hasTwoSimulations) {
    parts.push('Latest simulation scores are compared to your previous graded run where available.');
  } else if (!args.hasTwoSimulations && args.profiles.length > 0) {
    parts.push('Complete another graded simulation to see skill-by-skill movement vs your last run.');
  }

  return parts.join(' ');
}
