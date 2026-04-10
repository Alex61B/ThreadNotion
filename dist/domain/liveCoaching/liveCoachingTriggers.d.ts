import type { SalesSkill } from '../../schemas/coaching';
export declare function detectObjectionInCustomerMessage(text: string): boolean;
export declare function detectEmpathySignalInCustomerMessage(text: string): boolean;
export declare function detectBuyingSignalInCustomerMessage(text: string): boolean;
export declare function detectProductQuestionInCustomerMessage(text: string): boolean;
/**
 * Long user turn with many spec-like tokens and no question mark — info-dump pattern.
 * Documented as crude v1 heuristic.
 */
export declare function detectFeatureHeavyUserTurn(text: string): boolean;
/** True if line looks like a question (includes ? or common interrogative stem). */
export declare function userLineLooksLikeQuestion(text: string): boolean;
export type TriggerHit = {
    kind: SalesSkill;
    triggerSource: string;
    baseConfidence: 'low' | 'medium' | 'high';
};
/**
 * Discovery gap: within first `maxTurns` user messages, few question-like lines.
 * `userTurnIndex` is 1-based index of the latest user message.
 */
export declare function detectDiscoveryGap(args: {
    userMessagesContents: string[];
    userTurnIndex: number;
    maxEarlyTurns?: number;
    minQuestionsExpected?: number;
}): TriggerHit | null;
//# sourceMappingURL=liveCoachingTriggers.d.ts.map