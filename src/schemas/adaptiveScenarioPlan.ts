import { z } from 'zod';
import { SalesSkillSchema } from './coaching';
import { SimulationRealismSchema } from '../domain/simulationRealism/types';

/** One pressure tactic the customer can apply (no raw skill enum in customer-facing copy). */
export const PressureTacticSchema = z.object({
  id: z.string().min(1),
  /** Short label for debugging / API; not shown to the model as a skill name. */
  label: z.string().min(1),
  /** Instruction line for the roleplay prompt (customer behavior). */
  customerLine: z.string().min(1),
});

export type PressureTactic = z.infer<typeof PressureTacticSchema>;

export const AdaptiveScenarioPlanSchema = z.object({
  targetWeaknesses: z.array(SalesSkillSchema).max(3),
  /** One line: who the shopper is in this run. */
  personaSummary: z.string().min(1),
  /** Store / situation framing. */
  customerContext: z.string().min(1),
  /** What success looks like for the associate in this scenario. */
  scenarioGoal: z.string().min(1),
  pressureTactics: z.array(PressureTacticSchema).min(0).max(8),
  conversationConstraints: z.array(z.string().min(1)),
  /** Shown in UI as "Scenario focus". */
  coachingFocusSummary: z.string().min(1),
  /** Why these pressures were chosen (inspection, debugging). */
  scenarioRationale: z.string().min(1),
  /** Optional merged theme when coherence combines skills (e.g. discovery + empathy). */
  scenarioTheme: z.string().optional(),
  /** Phase 6: deterministic realism envelope for richer behavior. */
  simulationRealism: SimulationRealismSchema.optional(),
});

export type AdaptiveScenarioPlan = z.infer<typeof AdaptiveScenarioPlanSchema>;

export function parseAdaptiveScenarioPlan(json: unknown): AdaptiveScenarioPlan {
  return AdaptiveScenarioPlanSchema.parse(json);
}

export function safeParseAdaptiveScenarioPlan(json: unknown) {
  return AdaptiveScenarioPlanSchema.safeParse(json);
}
