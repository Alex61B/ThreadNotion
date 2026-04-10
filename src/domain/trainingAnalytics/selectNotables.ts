import { SALES_SKILLS, type SalesSkill } from '../../schemas/coaching';
import type { SkillAnalytics } from '../../schemas/trainingAnalytics';

function skillOrder(s: SalesSkill): number {
  return SALES_SKILLS.indexOf(s);
}

/**
 * Deterministic tie-breakers: higher metric wins; on tie, lower SALES_SKILLS index wins.
 * Persistent weakness: higher weaknessFrequency, then lower averageScore, then lower skill index.
 */
export function selectNotables(skills: SkillAnalytics[]): {
  strongestSkill?: SalesSkill;
  weakestSkill?: SalesSkill;
  mostImprovedSkill?: SalesSkill;
  persistentWeakness?: SalesSkill;
} {
  if (skills.length === 0) return {};

  let strongest = skills[0]!;
  for (const s of skills) {
    if (s.averageScore > strongest.averageScore) strongest = s;
    else if (s.averageScore === strongest.averageScore && skillOrder(s.skill) < skillOrder(strongest.skill))
      strongest = s;
  }

  let weakest = skills[0]!;
  for (const s of skills) {
    if (s.averageScore < weakest.averageScore) weakest = s;
    else if (s.averageScore === weakest.averageScore && skillOrder(s.skill) < skillOrder(weakest.skill))
      weakest = s;
  }

  let mostImproved = skills[0]!;
  for (const s of skills) {
    if (s.improvementRate > mostImproved.improvementRate) mostImproved = s;
    else if (s.improvementRate === mostImproved.improvementRate && skillOrder(s.skill) < skillOrder(mostImproved.skill))
      mostImproved = s;
  }

  let persistent = skills[0]!;
  for (const s of skills) {
    if (s.weaknessFrequency > persistent.weaknessFrequency) persistent = s;
    else if (s.weaknessFrequency === persistent.weaknessFrequency) {
      if (s.averageScore < persistent.averageScore) persistent = s;
      else if (s.averageScore === persistent.averageScore && skillOrder(s.skill) < skillOrder(persistent.skill))
        persistent = s;
    }
  }

  return {
    strongestSkill: strongest.skill,
    weakestSkill: weakest.skill,
    mostImprovedSkill: mostImproved.skill,
    persistentWeakness: persistent.skill,
  };
}
