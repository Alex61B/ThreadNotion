"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const weaknessSelection_1 = require("./weaknessSelection");
function scores(partial) {
    return {
        discovery_questions: 5,
        objection_handling: 5,
        product_knowledge: 5,
        closing: 5,
        storytelling: 5,
        empathy: 5,
        ...partial,
    };
}
(0, vitest_1.describe)('selectTopWeaknesses', () => {
    (0, vitest_1.it)('returns three lowest when none below 5', () => {
        const s = scores({ discovery_questions: 6, objection_handling: 7, product_knowledge: 8 });
        const top = (0, weaknessSelection_1.selectTopWeaknesses)(s);
        (0, vitest_1.expect)(top).toHaveLength(3);
        (0, vitest_1.expect)(top).toEqual(vitest_1.expect.arrayContaining(['closing', 'storytelling', 'empathy']));
    });
    (0, vitest_1.it)('includes skills below 5 first', () => {
        const s = scores({
            discovery_questions: 3,
            objection_handling: 4,
            product_knowledge: 9,
            closing: 9,
            storytelling: 9,
            empathy: 9,
        });
        const top = (0, weaknessSelection_1.selectTopWeaknesses)(s);
        (0, vitest_1.expect)(top.slice(0, 2)).toEqual(vitest_1.expect.arrayContaining(['discovery_questions', 'objection_handling']));
    });
    (0, vitest_1.it)('when four below 5, returns three lowest scores', () => {
        const s = scores({
            discovery_questions: 2,
            objection_handling: 3,
            product_knowledge: 1,
            closing: 4,
            storytelling: 9,
            empathy: 9,
        });
        const top = (0, weaknessSelection_1.selectTopWeaknesses)(s);
        (0, vitest_1.expect)(top).toHaveLength(3);
        (0, vitest_1.expect)(top).toContain('product_knowledge');
        (0, vitest_1.expect)(top).toContain('discovery_questions');
    });
});
//# sourceMappingURL=weaknessSelection.test.js.map