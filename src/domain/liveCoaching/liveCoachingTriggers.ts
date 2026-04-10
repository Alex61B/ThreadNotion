import type { SalesSkill } from '../../schemas/coaching';

/**
 * Deterministic pattern helpers for live coaching (v1, no LLM).
 * In roleplay, `assistant` is the customer; `user` is the trainee.
 */

function norm(s: string): string {
  return s.toLowerCase();
}

function matchesAny(haystack: string, needles: readonly string[]): boolean {
  const h = norm(haystack);
  return needles.some((n) => h.includes(n));
}

function matchesAnyRegex(haystack: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((re) => re.test(haystack));
}

/** Customer pushback / objection cues in the last assistant line. */
const OBJECTION_SUBSTRINGS = [
  'too expensive',
  "can't afford",
  'cannot afford',
  'not sure',
  "don't think",
  'do not think',
  'maybe later',
  'need to think',
  'talk to my',
  'talk to my spouse',
  'cheaper',
  'competitor',
  'compare',
  'not interested',
  'warranty',
  'return policy',
  'risky',
  'sketchy',
] as const;

export function detectObjectionInCustomerMessage(text: string): boolean {
  return matchesAny(text, OBJECTION_SUBSTRINGS);
}

/** Hesitation, skepticism, discomfort — empathy before pitch. */
const EMPATHY_SUBSTRINGS = [
  'frustrated',
  'annoyed',
  'confusing',
  'confused',
  'not comfortable',
  'worried',
  'hesitant',
  'skeptical',
  "doesn't feel",
  'does not feel',
  'overwhelmed',
  'pressure',
  'pushy',
] as const;

export function detectEmpathySignalInCustomerMessage(text: string): boolean {
  return matchesAny(text, EMPATHY_SUBSTRINGS);
}

/** Interest / buying signal in customer message. */
const CLOSING_SUBSTRINGS = [
  "sounds good",
  "i'll take",
  "i will take",
  "let's do it",
  'lets do it',
  'when can i',
  'how much is it',
  'total price',
  'i want it',
  'love it',
  'perfect',
  'sold',
  'ring me up',
  'check out',
  'buy it',
  'get one',
] as const;

export function detectBuyingSignalInCustomerMessage(text: string): boolean {
  return matchesAny(text, CLOSING_SUBSTRINGS);
}

/** Capability / product questions from the customer. */
const PRODUCT_QUESTION_SUBSTRINGS = [
  'what is ',
  'what are ',
  'how does ',
  'how do ',
  'is it ',
  'does it ',
  'can i ',
  'made of',
  'material',
  'size chart',
  'fit true',
  'machine wash',
  'care instructions',
  'ingredients',
  'allerg',
  'return policy',
  'shipping',
] as const;

const PRODUCT_QUESTION_REGEX = [
  /\bhow\s+(long|many|much)\b/i,
  /\bwhat('?s|\s+is|\s+are)\s+the\b/i,
] as const;

export function detectProductQuestionInCustomerMessage(text: string): boolean {
  if (text.includes('?')) {
    return (
      matchesAny(text, PRODUCT_QUESTION_SUBSTRINGS) ||
      matchesAnyRegex(text, PRODUCT_QUESTION_REGEX)
    );
  }
  return (
    matchesAny(text, PRODUCT_QUESTION_SUBSTRINGS) ||
    matchesAnyRegex(text, PRODUCT_QUESTION_REGEX)
  );
}

/** Spec-like tokens (crude) for feature-heavy user monologue heuristic. */
const SPEC_TOKENS = [
  'percent',
  '%',
  'cotton',
  'polyester',
  'organic',
  'gsm',
  'thread count',
  'hypoallergenic',
  'breathable',
  'moisture',
  'durable',
  'warranty',
  'certified',
  'bpa',
  'vegan',
  'spf',
  'waterproof',
] as const;

/**
 * Long user turn with many spec-like tokens and no question mark — info-dump pattern.
 * Documented as crude v1 heuristic.
 */
export function detectFeatureHeavyUserTurn(text: string): boolean {
  const t = text.trim();
  if (t.includes('?')) return false;
  if (t.length < 80) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 18) return false;
  let hits = 0;
  const lower = norm(t);
  for (const tok of SPEC_TOKENS) {
    if (lower.includes(tok)) hits += 1;
  }
  return hits >= 3;
}

const QUESTION_STEMS = [
  'what ',
  'how ',
  'why ',
  'when ',
  'where ',
  'who ',
  'which ',
  'could you',
  'can you',
  'tell me',
] as const;

/** True if line looks like a question (includes ? or common interrogative stem). */
export function userLineLooksLikeQuestion(text: string): boolean {
  if (text.includes('?')) return true;
  const h = norm(text);
  return QUESTION_STEMS.some((s) => h.includes(s));
}

export type TriggerHit = {
  kind: SalesSkill;
  triggerSource: string;
  baseConfidence: 'low' | 'medium' | 'high';
};

/**
 * Discovery gap: within first `maxTurns` user messages, few question-like lines.
 * `userTurnIndex` is 1-based index of the latest user message.
 */
export function detectDiscoveryGap(args: {
  userMessagesContents: string[];
  userTurnIndex: number;
  maxEarlyTurns?: number;
  minQuestionsExpected?: number;
}): TriggerHit | null {
  const maxEarly = args.maxEarlyTurns ?? 4;
  const minQ = args.minQuestionsExpected ?? 1;
  if (args.userTurnIndex > maxEarly) return null;

  const early = args.userMessagesContents.slice(0, maxEarly);
  let questionish = 0;
  for (const line of early) {
    if (userLineLooksLikeQuestion(line)) questionish += 1;
  }
  if (questionish >= minQ) return null;

  return {
    kind: 'discovery_questions',
    triggerSource: 'discovery_gap_early_turns',
    baseConfidence: 'medium',
  };
}
