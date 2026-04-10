import { safeParseDrillPlanStored } from '../../schemas/drillPlan';
import type { DrillPlanStored } from '../../schemas/drillPlan';

/**
 * Parse `Conversation.drillPlan` from DB JSON. Never throws.
 */
export function parseStoredDrillPlan(
  json: unknown,
  ctx: { where: string; conversationId: string }
): DrillPlanStored | null {
  if (json == null) return null;
  const parsed = safeParseDrillPlanStored(json);
  if (parsed.success) return parsed.data;
  console.warn(
    `[drillPlan] invalid stored JSON (${ctx.where}) conversationId=${ctx.conversationId}`
  );
  return null;
}
