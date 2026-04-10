import type { AdaptiveScenarioPlan } from '../../schemas/adaptiveScenarioPlan';
import { deriveSimulationRealism } from './deriveFromSeed';

function realismLines(plan: AdaptiveScenarioPlan): string[] {
  const r = plan.simulationRealism;
  if (!r) return [];

  const lines: string[] = [];
  lines.push(`Buyer role: ${r.personaTraits.role}.`);
  lines.push(`Buyer knowledge: ${r.buyerKnowledgeLevel}.`);
  lines.push(`Behavior pattern: ${r.customerBehavior}.`);
  lines.push(`Deal stage: ${r.dealStage}.`);

  if (r.personaTraits.communicationStyle === 'concise') {
    lines.push('Communication style: concise—give short answers unless asked a strong follow-up.');
  } else if (r.personaTraits.communicationStyle === 'analytical') {
    lines.push('Communication style: analytical—ask clarifying questions and weigh trade-offs.');
  } else if (r.personaTraits.communicationStyle === 'story-driven') {
    lines.push('Communication style: story-driven—share a bit of context when prompted, not unprompted.');
  } else {
    lines.push('Communication style: skeptical—challenge vague claims and ask for specifics.');
  }

  if (r.personaTraits.timePressure === 'high') {
    lines.push('Time pressure: high—keep the pace moving; resist long browsing unless the associate is efficient.');
  }
  return lines;
}

/**
 * Adds a deterministic realism envelope to an adaptive plan, without changing its core shape.
 * New fields are optional so legacy persisted plans continue to parse.
 */
export function enrichAdaptiveScenarioPlanWithRealism(
  plan: AdaptiveScenarioPlan,
  seed: string,
  personaName?: string
): AdaptiveScenarioPlan {
  const realism = deriveSimulationRealism(seed, personaName);
  const next: AdaptiveScenarioPlan = {
    ...plan,
    simulationRealism: realism,
  };

  const lines = realismLines(next);
  if (lines.length === 0) return next;

  const extraConstraints = [
    'Stay consistent with the buyer profile (knowledge level, behavior pattern, and deal stage) throughout the conversation.',
    'Reveal information gradually; do not dump all details in one message unless the associate earns it.',
  ];

  return {
    ...next,
    personaSummary: `${plan.personaSummary}\nBuyer profile: ${realism.personaTraits.role}.`,
    customerContext: `${plan.customerContext}\nRealism cues: ${lines.slice(1, 3).join(' ')}`,
    scenarioGoal: `${plan.scenarioGoal} Keep the pacing and objections consistent with the buyer profile.`,
    conversationConstraints: [...plan.conversationConstraints, ...extraConstraints],
    scenarioRationale: `${plan.scenarioRationale} Realism: ${realism.dealStage}/${realism.buyerKnowledgeLevel}/${realism.customerBehavior}.`,
  };
}

