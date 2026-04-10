"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTranscriptMetrics = computeTranscriptMetrics;
exports.formatTranscript = formatTranscript;
exports.formatTranscriptNumbered = formatTranscriptNumbered;
/**
 * Associate messages use role "user"; customer uses "assistant".
 */
function computeTranscriptMetrics(messages) {
    const userMsgs = messages.filter((m) => m.role === 'user');
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');
    const questionCount = userMsgs.filter((m) => m.content.includes('?')).length;
    const userChars = userMsgs.reduce((s, m) => s + m.content.length, 0);
    const assistantChars = assistantMsgs.reduce((s, m) => s + m.content.length, 0);
    const totalChars = userChars + assistantChars;
    const avgMessageLength = userMsgs.length > 0 ? userChars / userMsgs.length : 0;
    const talkRatio = totalChars > 0 ? userChars / totalChars : 0;
    return { questionCount, avgMessageLength, talkRatio };
}
function formatTranscript(messages) {
    return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
}
/**
 * Same as formatTranscript but prefixes each turn with a bracketed line number for evaluator grounding.
 * USER = sales associate; ASSISTANT = customer (roleplay).
 */
function formatTranscriptNumbered(messages) {
    return messages
        .map((m, i) => `[${i + 1}] ${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');
}
//# sourceMappingURL=transcriptMetrics.js.map