import type { AdaptiveScenarioPlan } from '../../schemas/adaptiveScenarioPlan';
import { safeParseAdaptiveScenarioPlan } from '../../schemas/adaptiveScenarioPlan';

export type ParseStoredPlanContext = {
  /** e.g. "GET /conversations", "POST /chat continue" */
  where: string;
  conversationId?: string;
};

/**
 * Parse `Conversation.adaptiveScenarioPlan` from DB JSON. Never throws.
 * Invalid or drifted shapes are treated as absent; chat and list stay up.
 */
export function parseStoredAdaptivePlan(
  raw: unknown,
  ctx: ParseStoredPlanContext
): AdaptiveScenarioPlan | null {
  if (raw == null) return null;

  const parsed = safeParseAdaptiveScenarioPlan(raw);
  if (parsed.success) {
    const plan = parsed.data;
    // We only persist plans with ≥1 weakness; empty means bad/corrupt row—fall back silently.
    if (plan.targetWeaknesses.length === 0) return null;
    return plan;
  }

  const suffix = ctx.conversationId ? ` conversationId=${ctx.conversationId}` : '';
  console.warn(`[adaptiveScenarioPlan] invalid stored JSON (${ctx.where})${suffix}`);
  return null;
}
