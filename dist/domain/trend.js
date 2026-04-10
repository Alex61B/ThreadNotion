"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTrendDirection = computeTrendDirection;
const EPSILON = 0.05;
function computeTrendDirection(previousScore, newScore) {
    if (previousScore === null || previousScore === undefined) {
        return 'stable';
    }
    if (newScore > previousScore + EPSILON)
        return 'improving';
    if (newScore < previousScore - EPSILON)
        return 'declining';
    return 'stable';
}
//# sourceMappingURL=trend.js.map