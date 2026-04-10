import type { SalesSkill } from '../schemas/coaching';

const BEHAVIOR_HINTS: Record<SalesSkill, string> = {
  discovery_questions:
    'Share information sparingly at first; only elaborate when the associate asks strong, specific questions.',
  objection_handling:
    'Raise believable concerns about price, fit, or whether you really need the item—stay polite, not hostile.',
  product_knowledge:
    'Ask natural questions about fabric, care, fit, or how this compares to other options.',
  closing:
    'Stay interested but noncommittal; do not agree to buy until the associate earns a clear next step.',
  storytelling:
    'Engage more when the associate uses examples, styling ideas, or stories—not when they only list features.',
  empathy:
    'Show mild hesitation, uncertainty, or light frustration that a thoughtful associate can acknowledge.',
};

/**
 * @deprecated Use Phase 2 adaptive pipeline: `buildAdaptiveScenarioPlan` + `buildRoleplaySystemPrompt`.
 * Kept for tests and emergency fallback.
 *
 * Extra instructions appended to the customer roleplay prompt in adaptive mode.
 * Does not name skills in-character; keeps scenarios plausible.
 */
export function buildAdaptiveCustomerGuidance(weaknesses: SalesSkill[]): string {
  if (weaknesses.length === 0) return '';
  const bullets = weaknesses.map((w) => `- ${BEHAVIOR_HINTS[w]}`).join('\n');
  return `ADDITIONAL BEHAVIOR FOR THIS SCENARIO (remain ${weaknesses.length > 1 ? 'consistent' : 'natural'}; stay in character—do not mention coaching or skill labels):
${bullets}
Keep dialogue realistic for a real clothing-store shopper.`;
}
