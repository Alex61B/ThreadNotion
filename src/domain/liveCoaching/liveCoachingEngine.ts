import type { SimulationMode } from '../../../generated/prisma';
import type { SalesSkill } from '../../schemas/coaching';
import type { LiveCoachingSuggestion } from '../../schemas/liveCoaching';
import {
  bumpConfidence,
  confidenceMeetsFloor,
  type LiveCoachingConfidence,
} from './liveCoachingPolicy';
import {
  detectBuyingSignalInCustomerMessage,
  detectDiscoveryGap,
  detectEmpathySignalInCustomerMessage,
  detectFeatureHeavyUserTurn,
  detectObjectionInCustomerMessage,
  detectProductQuestionInCustomerMessage,
  type TriggerHit,
} from './liveCoachingTriggers';

export type TranscriptTurn = { role: 'user' | 'assistant'; content: string };

export type LiveCoachingEngineInput = {
  simulationMode: SimulationMode;
  transcript: TranscriptTurn[];
  targetWeaknesses: SalesSkill[];
  drillPrimary?: SalesSkill;
  drillSecondary?: SalesSkill;
  skillScores: Record<SalesSkill, number>;
  focusSkills: SalesSkill[];
  /** 1-based count of user messages in the conversation (including the turn just completed). */
  currentUserTurnIndex: number;
};

const MESSAGES: Record<
  SalesSkill,
  { message: string; rationale?: string }
> = {
  objection_handling: {
    message:
      'The customer pushed back — name the concern briefly, then bridge with a question or one clear benefit.',
    rationale: 'Objection cues in their last line.',
  },
  empathy: {
    message:
      'They sound hesitant or tense — acknowledge the feeling in one line before you move forward.',
    rationale: 'Hesitation or discomfort in their wording.',
  },
  closing: {
    message:
      'Buying signal — mirror their interest, then offer a simple next step (size, quantity, or checkout).',
    rationale: 'Interest or intent language detected.',
  },
  product_knowledge: {
    message:
      'They asked about the product — answer plainly, then check you got it right with a short question.',
    rationale: 'Product or capability question detected.',
  },
  discovery_questions: {
    message:
      'Early in the chat — lead with one open question about their situation before you explain more.',
    rationale: 'Few discovery-style questions in your first turns.',
  },
  storytelling: {
    message:
      'Lots of specs in one go — try one short story or a single crisp benefit, then pause.',
    rationale: 'Long, spec-heavy reply without a question.',
  },
};

function collectRawHits(input: LiveCoachingEngineInput): TriggerHit[] {
  const hits: TriggerHit[] = [];
  const { transcript, currentUserTurnIndex } = input;

  const userContents = transcript
    .filter((t) => t.role === 'user')
    .map((t) => t.content);
  const lastUser = userContents[userContents.length - 1] ?? '';
  let lastAssistant = '';
  for (let i = transcript.length - 1; i >= 0; i -= 1) {
    const turn = transcript[i];
    if (!turn) continue;
    if (turn.role === 'assistant') {
      lastAssistant = turn.content;
      break;
    }
  }

  if (lastAssistant) {
    if (detectObjectionInCustomerMessage(lastAssistant)) {
      hits.push({
        kind: 'objection_handling',
        triggerSource: 'customer_objection_cues',
        baseConfidence: 'high',
      });
    } else if (detectEmpathySignalInCustomerMessage(lastAssistant)) {
      hits.push({
        kind: 'empathy',
        triggerSource: 'customer_hesitation_empathy_cues',
        baseConfidence: 'medium',
      });
    }

    if (detectBuyingSignalInCustomerMessage(lastAssistant)) {
      hits.push({
        kind: 'closing',
        triggerSource: 'customer_buying_signal',
        baseConfidence: 'high',
      });
    }

    const productQ = detectProductQuestionInCustomerMessage(lastAssistant);
    if (productQ) {
      const hasQ = lastAssistant.includes('?');
      hits.push({
        kind: 'product_knowledge',
        triggerSource: 'customer_product_question',
        baseConfidence: hasQ ? 'high' : 'medium',
      });
    }
  }

  if (detectFeatureHeavyUserTurn(lastUser)) {
    hits.push({
      kind: 'storytelling',
      triggerSource: 'user_feature_heavy_turn',
      baseConfidence: 'medium',
    });
  }

  const discovery = detectDiscoveryGap({
    userMessagesContents: userContents,
    userTurnIndex: currentUserTurnIndex,
    maxEarlyTurns: 4,
    minQuestionsExpected: 1,
  });
  if (discovery) hits.push(discovery);

  return hits;
}

function effectiveConfidence(
  hit: TriggerHit,
  input: LiveCoachingEngineInput
): LiveCoachingConfidence {
  let c = hit.baseConfidence;
  const { simulationMode, targetWeaknesses, drillPrimary, drillSecondary, focusSkills } =
    input;

  if (simulationMode === 'adaptive' && targetWeaknesses.includes(hit.kind)) {
    c = bumpConfidence(c);
  }
  if (
    simulationMode === 'drill' &&
    (hit.kind === drillPrimary || hit.kind === drillSecondary)
  ) {
    c = bumpConfidence(c);
  }
  if (focusSkills.includes(hit.kind)) {
    c = bumpConfidence(c);
  }

  return c;
}

function rankConfidence(c: LiveCoachingConfidence): number {
  if (c === 'high') return 3;
  if (c === 'medium') return 2;
  return 1;
}

function scoreHit(hit: TriggerHit, input: LiveCoachingEngineInput): number {
  const eff = effectiveConfidence(hit, input);
  const confPart = rankConfidence(eff) * 100;
  const skill = input.skillScores[hit.kind] ?? 5;
  const weaknessPart = (10 - skill) * 2;
  const focusTie = input.focusSkills.includes(hit.kind) ? 3 : 0;
  return confPart + weaknessPart + focusTie;
}

/**
 * Pure: pick at most one coaching suggestion from transcript + mode context.
 * Cooldown / per-conversation caps are enforced in the service using persisted meta.
 */
export function computeLiveCoachingSuggestion(
  input: LiveCoachingEngineInput
): LiveCoachingSuggestion | null {
  const rawHits = collectRawHits(input);
  if (rawHits.length === 0) return null;

  const scored = rawHits.map((hit) => ({
    hit,
    score: scoreHit(hit, input),
    eff: effectiveConfidence(hit, input),
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return null;
  if (!confidenceMeetsFloor(best.eff, input.simulationMode)) {
    return null;
  }

  const copy = MESSAGES[best.hit.kind];
  return {
    kind: best.hit.kind,
    message: copy.message,
    rationale: copy.rationale,
    confidence: best.eff,
    triggerSource: best.hit.triggerSource,
  };
}
