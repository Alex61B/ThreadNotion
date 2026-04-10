"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bottomTierSkillsForSession = bottomTierSkillsForSession;
exports.computeSkillAnalytics = computeSkillAnalytics;
const coaching_1 = require("../../schemas/coaching");
const RECENT_SESSIONS = 4;
const EARLY_SESSIONS = 3;
const BOTTOM_TIER_COUNT = 2;
const TREND_MAX_SESSIONS = 8;
function skillIndex(skill) {
    return coaching_1.SALES_SKILLS.indexOf(skill);
}
/** Session skills sorted weakest→strongest; ties broken by lower enum order first (stable). */
function bottomTierSkillsForSession(scores) {
    const ranked = [...coaching_1.SALES_SKILLS].sort((a, b) => {
        const d = scores[a] - scores[b];
        if (d !== 0)
            return d;
        return skillIndex(a) - skillIndex(b);
    });
    return ranked.slice(0, BOTTOM_TIER_COUNT);
}
function computeSkillAnalytics(sessions) {
    const n = sessions.length;
    if (n === 0) {
        return [];
    }
    const perSkillSeries = coaching_1.SALES_SKILLS.map((skill) => sessions.map((s) => s.scores[skill]));
    return coaching_1.SALES_SKILLS.map((skill, si) => {
        const series = perSkillSeries[si];
        const sum = series.reduce((a, b) => a + b, 0);
        const averageScore = sum / n;
        const recentSlice = series.slice(Math.max(0, n - RECENT_SESSIONS));
        const recentAverageScore = recentSlice.length > 0
            ? recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length
            : 0;
        const earlyCount = Math.min(EARLY_SESSIONS, n);
        const recentCount = Math.min(RECENT_SESSIONS, n);
        const earlySlice = series.slice(0, earlyCount);
        const recentWindow = series.slice(Math.max(0, n - recentCount));
        const earlyAvg = earlySlice.length > 0
            ? earlySlice.reduce((a, b) => a + b, 0) / earlySlice.length
            : 0;
        const recentAvgForImprovement = recentWindow.length > 0
            ? recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length
            : 0;
        let improvementRate = 0;
        if (n >= 2 && earlyCount >= 1 && recentCount >= 1) {
            improvementRate = recentAvgForImprovement - earlyAvg;
        }
        let weakSessions = 0;
        for (const s of sessions) {
            const bottom = new Set(bottomTierSkillsForSession(s.scores));
            if (bottom.has(skill))
                weakSessions += 1;
        }
        const weaknessFrequency = weakSessions / n;
        let lastSeenWeakness;
        let lastWeakIndex = -1;
        for (let i = 0; i < sessions.length; i++) {
            if (bottomTierSkillsForSession(sessions[i].scores).includes(skill)) {
                lastWeakIndex = i;
            }
        }
        if (lastWeakIndex >= 0) {
            lastSeenWeakness = n - 1 - lastWeakIndex;
        }
        const trendScores = series.slice(Math.max(0, n - TREND_MAX_SESSIONS));
        return {
            skill,
            averageScore,
            recentAverageScore,
            improvementRate,
            weaknessFrequency,
            lastSeenWeakness,
            trendScores,
        };
    });
}
//# sourceMappingURL=computeSkillAnalytics.js.map