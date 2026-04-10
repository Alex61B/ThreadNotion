import type { Prisma } from '../../generated/prisma';
import { prisma } from '../db';
import { parseStoredAdaptivePlan } from '../domain/adaptive/parseStoredAdaptivePlan';
import { parseStoredDrillPlan } from '../domain/drill/parseStoredDrillPlan';
import { computeLiveCoachingSuggestion } from '../domain/liveCoaching/liveCoachingEngine';
import {
  DEDUPE_RECENT_KINDS_WINDOW,
  MAX_SUGGESTIONS_PER_CONVERSATION,
  MIN_USER_TURNS_BETWEEN_SUGGESTIONS,
} from '../domain/liveCoaching/liveCoachingPolicy';
import type { SalesSkill } from '../schemas/coaching';
import { SALES_SKILLS } from '../schemas/coaching';
import type { LiveCoachingMeta, LiveCoachingSuggestion } from '../schemas/liveCoaching';
import { parseLiveCoachingMeta } from '../schemas/liveCoaching';
import { getTrainingFocusForUser } from './userTrainingFocusService';
import { getMergedSkillScoresForUser } from './weaknessProfileService';

function defaultSkillScores(): Record<SalesSkill, number> {
  const o = {} as Record<SalesSkill, number>;
  for (const s of SALES_SKILLS) o[s] = 5;
  return o;
}

function countUserTurns(
  messages: { role: string }[]
): number {
  return messages.filter((m) => m.role === 'user').length;
}

/**
 * After a chat turn (user + assistant rows persisted), optionally compute a live coaching tip.
 */
export async function getLiveCoachingAfterChatTurn(args: {
  conversationId: string;
  userId: string | null | undefined;
  liveCoachingEnabled: boolean;
  chatMode: 'roleplay' | 'assistant';
}): Promise<LiveCoachingSuggestion | null> {
  if (!args.liveCoachingEnabled || args.chatMode !== 'roleplay') {
    return null;
  }

  const convo = await prisma.conversation.findUnique({
    where: { id: args.conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!convo) return null;

  const meta = parseLiveCoachingMeta(convo.liveCoachingMeta);
  const userTurnCount = countUserTurns(convo.messages);
  const suggestionsShown = meta.suggestionsShown ?? 0;

  if (suggestionsShown >= MAX_SUGGESTIONS_PER_CONVERSATION) {
    return null;
  }

  const lastIdx = meta.lastSuggestionUserTurnIndex;
  if (
    lastIdx != null &&
    userTurnCount - lastIdx < MIN_USER_TURNS_BETWEEN_SUGGESTIONS
  ) {
    return null;
  }

  const skillScores = args.userId
    ? await getMergedSkillScoresForUser(args.userId)
    : defaultSkillScores();

  const focusRow = args.userId ? await getTrainingFocusForUser(args.userId) : null;
  const focusSkills = focusRow?.focusSkills ?? [];

  const adaptivePlan = parseStoredAdaptivePlan(convo.adaptiveScenarioPlan, {
    where: 'liveCoachingService',
    conversationId: convo.id,
  });
  const targetWeaknesses = adaptivePlan?.targetWeaknesses ?? [];

  const drill = parseStoredDrillPlan(convo.drillPlan, {
    where: 'liveCoachingService',
    conversationId: convo.id,
  });

  const transcript = convo.messages.map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  const engineInput: Parameters<typeof computeLiveCoachingSuggestion>[0] = {
    simulationMode: convo.simulationMode,
    transcript,
    targetWeaknesses,
    skillScores,
    focusSkills,
    currentUserTurnIndex: userTurnCount,
  };
  if (drill?.primarySkill) {
    engineInput.drillPrimary = drill.primarySkill;
  }
  if (drill?.secondarySkill) {
    engineInput.drillSecondary = drill.secondarySkill;
  }
  const suggestion = computeLiveCoachingSuggestion(engineInput);

  if (!suggestion) {
    return null;
  }

  const recent = meta.recentKinds ?? [];
  const window = recent.slice(0, DEDUPE_RECENT_KINDS_WINDOW);
  if (window.includes(suggestion.kind)) {
    return null;
  }

  const nextMeta: LiveCoachingMeta = {
    lastSuggestionUserTurnIndex: userTurnCount,
    suggestionsShown: suggestionsShown + 1,
    recentKinds: [suggestion.kind, ...recent].slice(0, DEDUPE_RECENT_KINDS_WINDOW),
  };

  await prisma.conversation.update({
    where: { id: convo.id },
    data: { liveCoachingMeta: nextMeta as unknown as Prisma.InputJsonValue },
  });

  return suggestion;
}
