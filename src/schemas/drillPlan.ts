import { z } from 'zod';
import { SalesSkillSchema } from './coaching';
import { AdaptiveScenarioPlanSchema } from './adaptiveScenarioPlan';

/** Persisted on Conversation.drillPlan; includes the prompt-ready plan for reload fidelity. */
export const DrillPlanStoredSchema = z.object({
  mode: z.literal('drill'),
  primarySkill: SalesSkillSchema,
  secondarySkill: SalesSkillSchema.optional(),
  /** Catalog pressure id or composite variant key for diversity debugging. */
  variantKey: z.string().min(1),
  coachingFocusSummary: z.string().min(1),
  drillObjective: z.string().min(1),
  promptPlan: AdaptiveScenarioPlanSchema,
});

export type DrillPlanStored = z.infer<typeof DrillPlanStoredSchema>;

export function parseDrillPlanStored(json: unknown): DrillPlanStored {
  return DrillPlanStoredSchema.parse(json);
}

export function safeParseDrillPlanStored(json: unknown) {
  return DrillPlanStoredSchema.safeParse(json);
}
