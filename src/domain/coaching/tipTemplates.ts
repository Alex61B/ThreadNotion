import type { SalesSkill } from '../../schemas/coaching';

/** Short, skill-specific fallbacks when merging LLM tips with weaknesses. */
export const TIP_TEMPLATES_BY_SKILL: Record<SalesSkill, string[]> = {
  discovery_questions: [
    'Ask 2–3 discovery questions before pitching or recommending a specific item.',
    'Uncover priorities, timeline, and how they plan to use the piece.',
  ],
  objection_handling: [
    'Acknowledge the concern before responding; clarify if it is price, fit, timing, or need.',
    'Reflect their words back briefly, then address the underlying worry.',
  ],
  product_knowledge: [
    'Tie fabric, fit, or care details to the outcome they care about (comfort, durability, occasion).',
    'Offer one comparison to another option only when it helps them decide.',
  ],
  closing: [
    'Summarize value, check interest, and propose a clear next step (try-on, hold, or alternate).',
    'Ask a simple trial close: "Want to try it on?" or "Should I check another size?"',
  ],
  storytelling: [
    'Use one short customer or styling example instead of a generic feature list.',
    'Connect the item to a real situation (work, travel, weather) they mentioned.',
  ],
  empathy: [
    'Name the feeling you hear ("sounds frustrating") before moving to solutions.',
    'Slow down and match their pace when they seem uncertain or rushed.',
  ],
};

export function normalizeTipKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
