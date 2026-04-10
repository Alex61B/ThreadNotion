export type MessageLike = {
    role: string;
    content: string;
};
/**
 * Associate messages use role "user"; customer uses "assistant".
 */
export declare function computeTranscriptMetrics(messages: MessageLike[]): {
    questionCount: number;
    avgMessageLength: number;
    talkRatio: number;
};
export declare function formatTranscript(messages: MessageLike[]): string;
/**
 * Same as formatTranscript but prefixes each turn with a bracketed line number for evaluator grounding.
 * USER = sales associate; ASSISTANT = customer (roleplay).
 */
export declare function formatTranscriptNumbered(messages: MessageLike[]): string;
//# sourceMappingURL=transcriptMetrics.d.ts.map