import { z } from 'zod';
import { SalesSkillSchema } from './coaching';

export const LiveCoachingConfidenceSchema = z.enum(['low', 'medium', 'high']);

export const LiveCoachingSuggestionSchema = z.object({
  kind: SalesSkillSchema,
  message: z.string().min(1),
  rationale: z.string().optional(),
  confidence: LiveCoachingConfidenceSchema,
  triggerSource: z.string().min(1),
});

export type LiveCoachingSuggestion = z.infer<typeof LiveCoachingSuggestionSchema>;

/** Persisted on Conversation.liveCoachingMeta for cooldown and dedupe. */
export const LiveCoachingMetaSchema = z.object({
  lastSuggestionUserTurnIndex: z.number().int().min(0).nullable().optional(),
  suggestionsShown: z.number().int().min(0).optional(),
  /** Most recent suggestion kinds (newest first), max 3. */
  recentKinds: z.array(SalesSkillSchema).optional(),
});

export type LiveCoachingMeta = z.infer<typeof LiveCoachingMetaSchema>;

export function parseLiveCoachingMeta(raw: unknown): LiveCoachingMeta {
  const p = LiveCoachingMetaSchema.safeParse(raw);
  if (p.success) return p.data;
  return {};
}
