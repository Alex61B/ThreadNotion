"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestDrillTargetFromProgress = suggestDrillTargetFromProgress;
const skillLabels_1 = require("../skillLabels");
/**
 * Deterministic next drill target from progress snapshot and optional pinned training focus.
 */
function suggestDrillTargetFromProgress(progress, trainingFocus) {
    if (trainingFocus?.focusSkills?.length) {
        const s = trainingFocus.focusSkills[0];
        const remaining = trainingFocus.sessionsRemaining;
        return {
            primarySkill: s,
            rationale: remaining != null && remaining > 0
                ? `Pinned focus: ${(0, skillLabels_1.skillLabel)(s)} (${remaining} graded session(s) remaining on your counter).`
                : remaining === 0
                    ? `Pinned focus: ${(0, skillLabels_1.skillLabel)(s)}—session count reached zero; clear or set a new focus when you are done.`
                    : `Your training focus is ${(0, skillLabels_1.skillLabel)(s)}.`,
        };
    }
    const lowest = progress.lowestSkills[0];
    if (lowest) {
        const row = progress.skills.find((x) => x.skill === lowest);
        if (row?.trendDirection === 'declining') {
            return {
                primarySkill: lowest,
                rationale: `${(0, skillLabels_1.skillLabel)(lowest)} is low and still trending down—a focused drill adds deliberate reps.`,
            };
        }
        return {
            primarySkill: lowest,
            rationale: `${(0, skillLabels_1.skillLabel)(lowest)} is among your weakest areas; a short drill targets it directly.`,
        };
    }
    const rec = progress.recommendedFocusSkills[0];
    if (rec) {
        return {
            primarySkill: rec,
            rationale: progress.recommendedFocusMessage?.trim() ||
                `Next recommended focus: ${(0, skillLabels_1.skillLabel)(rec)}.`,
        };
    }
    return {
        primarySkill: 'discovery_questions',
        rationale: 'Practice discovery to open conversations with clearer needs.',
    };
}
//# sourceMappingURL=drillRecommendation.js.map