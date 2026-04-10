"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRollingScore = computeRollingScore;
/**
 * Rolling aggregate: newCurrent = oldCurrent * 0.7 + newSimulationScore * 0.3
 */
function computeRollingScore(oldCurrent, newSimulationScore) {
    if (oldCurrent === null || oldCurrent === undefined) {
        return newSimulationScore;
    }
    return oldCurrent * 0.7 + newSimulationScore * 0.3;
}
//# sourceMappingURL=rollingScore.js.map