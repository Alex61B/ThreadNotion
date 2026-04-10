"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEDUPE_RECENT_KINDS_WINDOW = exports.MAX_SUGGESTIONS_PER_CONVERSATION = exports.MIN_USER_TURNS_BETWEEN_SUGGESTIONS = void 0;
exports.minConfidenceRankForMode = minConfidenceRankForMode;
exports.confidenceMeetsFloor = confidenceMeetsFloor;
exports.bumpConfidence = bumpConfidence;
/** User turns (count) since last shown suggestion before another may appear. */
exports.MIN_USER_TURNS_BETWEEN_SUGGESTIONS = 2;
/** Cap suggestions per conversation. */
exports.MAX_SUGGESTIONS_PER_CONVERSATION = 5;
/** Do not suggest a kind if it appears in this many most recent suggestion kinds. */
exports.DEDUPE_RECENT_KINDS_WINDOW = 3;
const CONF_RANK = {
    low: 1,
    medium: 2,
    high: 3,
};
/** Minimum effective confidence rank required to show a tip (1=low, 3=high). */
function minConfidenceRankForMode(mode) {
    if (mode === 'generic')
        return CONF_RANK.high;
    if (mode === 'adaptive' || mode === 'drill')
        return CONF_RANK.medium;
    return CONF_RANK.medium;
}
function confidenceMeetsFloor(conf, mode) {
    return CONF_RANK[conf] >= minConfidenceRankForMode(mode);
}
function bumpConfidence(conf) {
    if (conf === 'low')
        return 'medium';
    if (conf === 'medium')
        return 'high';
    return 'high';
}
//# sourceMappingURL=liveCoachingPolicy.js.map