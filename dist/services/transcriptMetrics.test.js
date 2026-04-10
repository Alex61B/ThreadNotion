"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const transcriptMetrics_1 = require("./transcriptMetrics");
(0, vitest_1.describe)('computeTranscriptMetrics', () => {
    (0, vitest_1.it)('counts user messages with question marks', () => {
        const m = (0, transcriptMetrics_1.computeTranscriptMetrics)([
            { role: 'user', content: 'Hi?' },
            { role: 'assistant', content: 'Hello' },
            { role: 'user', content: 'No question here' },
        ]);
        (0, vitest_1.expect)(m.questionCount).toBe(1);
    });
    (0, vitest_1.it)('computes talk ratio', () => {
        const m = (0, transcriptMetrics_1.computeTranscriptMetrics)([
            { role: 'user', content: 'abcd' },
            { role: 'assistant', content: 'abcdefgh' },
        ]);
        (0, vitest_1.expect)(m.talkRatio).toBeCloseTo(4 / 12, 5);
        (0, vitest_1.expect)(m.avgMessageLength).toBe(4);
    });
});
(0, vitest_1.describe)('formatTranscript', () => {
    (0, vitest_1.it)('joins roles and content', () => {
        const t = (0, transcriptMetrics_1.formatTranscript)([{ role: 'user', content: 'a' }]);
        (0, vitest_1.expect)(t).toContain('USER:');
        (0, vitest_1.expect)(t).toContain('a');
    });
});
//# sourceMappingURL=transcriptMetrics.test.js.map