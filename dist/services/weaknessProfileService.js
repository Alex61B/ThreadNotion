"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMergedSkillScoresForUser = getMergedSkillScoresForUser;
exports.getTopWeaknessesForUser = getTopWeaknessesForUser;
exports.updateProfilesAfterSimulation = updateProfilesAfterSimulation;
exports.listWeaknessProfilesForUser = listWeaknessProfilesForUser;
const coaching_1 = require("../schemas/coaching");
const db_1 = require("../db");
const rollingScore_1 = require("../domain/rollingScore");
const trend_1 = require("../domain/trend");
const weaknessSelection_1 = require("../domain/weaknessSelection");
function toPrismaTrend(t) {
    if (t === 'improving')
        return 'improving';
    if (t === 'declining')
        return 'declining';
    return 'stable';
}
function defaultScores() {
    return {
        discovery_questions: 5,
        objection_handling: 5,
        product_knowledge: 5,
        closing: 5,
        storytelling: 5,
        empathy: 5,
    };
}
async function getMergedSkillScoresForUser(userId) {
    const rows = await db_1.prisma.userWeaknessProfile.findMany({ where: { userId } });
    const scores = defaultScores();
    for (const row of rows) {
        scores[row.skill] = row.currentScore;
    }
    return scores;
}
/** Top weaknesses for adaptive scenario (up to 3). Empty if user has no profile rows yet. */
async function getTopWeaknessesForUser(userId, limit) {
    const rows = await db_1.prisma.userWeaknessProfile.findMany({ where: { userId } });
    if (rows.length === 0)
        return [];
    const scores = await getMergedSkillScoresForUser(userId);
    return (0, weaknessSelection_1.selectTopWeaknesses)(scores).slice(0, limit);
}
async function updateProfilesAfterSimulation(args) {
    const { userId, conversationId, skillScores } = args;
    for (const skill of coaching_1.SALES_SKILLS) {
        const newSimulationScore = skillScores[skill];
        const existing = await db_1.prisma.userWeaknessProfile.findUnique({
            where: { userId_skill: { userId, skill: skill } },
        });
        const previous = existing?.currentScore ?? null;
        const newCurrent = (0, rollingScore_1.computeRollingScore)(previous, newSimulationScore);
        const trend = (0, trend_1.computeTrendDirection)(previous, newCurrent);
        await db_1.prisma.userWeaknessProfile.upsert({
            where: { userId_skill: { userId, skill: skill } },
            create: {
                userId,
                skill: skill,
                currentScore: newCurrent,
                trendDirection: toPrismaTrend(trend),
                lastSimulationId: conversationId,
            },
            update: {
                currentScore: newCurrent,
                trendDirection: toPrismaTrend(trend),
                lastSimulationId: conversationId,
            },
        });
    }
}
async function listWeaknessProfilesForUser(userId) {
    return db_1.prisma.userWeaknessProfile.findMany({
        where: { userId },
        orderBy: { skill: 'asc' },
    });
}
//# sourceMappingURL=weaknessProfileService.js.map