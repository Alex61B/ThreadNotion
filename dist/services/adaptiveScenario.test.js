"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const adaptiveScenario_1 = require("./adaptiveScenario");
(0, vitest_1.describe)('buildAdaptiveCustomerGuidance', () => {
    (0, vitest_1.it)('returns empty string when no weaknesses', () => {
        (0, vitest_1.expect)((0, adaptiveScenario_1.buildAdaptiveCustomerGuidance)([])).toBe('');
    });
    (0, vitest_1.it)('includes natural pressure text for weaknesses', () => {
        const g = (0, adaptiveScenario_1.buildAdaptiveCustomerGuidance)(['objection_handling', 'closing']);
        (0, vitest_1.expect)(g.length).toBeGreaterThan(20);
        (0, vitest_1.expect)(g.toLowerCase()).not.toContain('objection_handling');
        (0, vitest_1.expect)(g.toLowerCase()).not.toContain('training');
    });
});
//# sourceMappingURL=adaptiveScenario.test.js.map