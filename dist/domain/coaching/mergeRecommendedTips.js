"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeRecommendedTips = mergeRecommendedTips;
const tipTemplates_1 = require("./tipTemplates");
const MAX_TIPS = 8;
/**
 * Merge LLM tips with deterministic templates for top weaknesses.
 * Dedupes by normalized string; caps length.
 */
function mergeRecommendedTips(args) {
    const seen = new Set();
    const out = [];
    function push(tip) {
        const k = (0, tipTemplates_1.normalizeTipKey)(tip);
        if (!k || seen.has(k))
            return;
        seen.add(k);
        out.push(tip.trim());
    }
    for (const t of args.llmTips) {
        push(t);
        if (out.length >= MAX_TIPS)
            return out;
    }
    for (const w of args.weaknesses) {
        for (const template of tipTemplates_1.TIP_TEMPLATES_BY_SKILL[w]) {
            push(template);
            if (out.length >= MAX_TIPS)
                return out;
        }
    }
    return out;
}
//# sourceMappingURL=mergeRecommendedTips.js.map