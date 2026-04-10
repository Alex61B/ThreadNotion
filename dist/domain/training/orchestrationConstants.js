"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DRILL_IF_SCORE_LT = exports.SPACED_MIN_SESSION_GAP = exports.MASTERY_MIN_SCORE = void 0;
/** Score at or above = mastered for orchestration (deprioritize drills). */
exports.MASTERY_MIN_SCORE = 7;
/** Graded sessions without touching a skill before spaced refresh is suggested. */
exports.SPACED_MIN_SESSION_GAP = 5;
/** Below this score → prefer drill when spaced repetition fires. */
exports.DRILL_IF_SCORE_LT = 5;
//# sourceMappingURL=orchestrationConstants.js.map