"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const trend_1 = require("./trend");
(0, vitest_1.describe)('computeTrendDirection', () => {
    (0, vitest_1.it)('is stable when no prior score', () => {
        (0, vitest_1.expect)((0, trend_1.computeTrendDirection)(null, 7)).toBe('stable');
    });
    (0, vitest_1.it)('detects improving', () => {
        (0, vitest_1.expect)((0, trend_1.computeTrendDirection)(5, 6)).toBe('improving');
    });
    (0, vitest_1.it)('detects declining', () => {
        (0, vitest_1.expect)((0, trend_1.computeTrendDirection)(8, 7)).toBe('declining');
    });
    (0, vitest_1.it)('is stable within epsilon', () => {
        (0, vitest_1.expect)((0, trend_1.computeTrendDirection)(5, 5.02)).toBe('stable');
    });
});
//# sourceMappingURL=trend.test.js.map