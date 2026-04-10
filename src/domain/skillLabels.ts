import type { SalesSkill } from '../schemas/coaching';

/** Short labels for API/UI copy (matches frontend SKILL_LABELS). */
export const SKILL_LABEL_SHORT: Record<SalesSkill, string> = {
  discovery_questions: 'Discovery',
  objection_handling: 'Objections',
  product_knowledge: 'Product knowledge',
  closing: 'Closing',
  storytelling: 'Storytelling',
  empathy: 'Empathy',
};

export function skillLabel(skill: SalesSkill): string {
  return SKILL_LABEL_SHORT[skill];
}
