/** Score at or above = mastered for orchestration (deprioritize drills). */
export const MASTERY_MIN_SCORE = 7;

/** Graded sessions without touching a skill before spaced refresh is suggested. */
export const SPACED_MIN_SESSION_GAP = 5;

/** Below this score → prefer drill when spaced repetition fires. */
export const DRILL_IF_SCORE_LT = 5;
