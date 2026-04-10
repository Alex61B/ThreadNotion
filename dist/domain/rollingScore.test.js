"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const rollingScore_1 = require("./rollingScore");
(0, vitest_1.describe)('computeRollingScore', () => {
    (0, vitest_1.it)('uses simulation score when no prior aggregate', () => {
        (0, vitest_1.expect)((0, rollingScore_1.computeRollingScore)(null, 8)).toBe(8);
    });
    (0, vitest_1.it)('applies 0.7/0.3 blend', () => {
        (0, vitest_1.expect)((0, rollingScore_1.computeRollingScore)(10, 0)).toBeCloseTo(7, 5);
        (0, vitest_1.expect)((0, rollingScore_1.computeRollingScore)(0, 10)).toBeCloseTo(3, 5);
        (0, vitest_1.expect)((0, rollingScore_1.computeRollingScore)(5, 8)).toBeCloseTo(5 * 0.7 + 8 * 0.3, 5);
    });
});
//# sourceMappingURL=rollingScore.test.js.map