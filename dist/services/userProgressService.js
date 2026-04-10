"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProgressSnapshot = buildProgressSnapshot;
const coaching_1 = require("../schemas/coaching");
const db_1 = require("../db");
const weaknessSelection_1 = require("../domain/weaknessSelection");
const progressRecommendation_1 = require("../domain/progressRecommendation");
const weaknessProfileService_1 = require("./weaknessProfileService");
function scoresMapFromRows(rows) {
    const byConv = new Map();
    for (const r of rows) {
        let m = byConv.get(r.conversationId);
        if (!m) {
            m = {};
            byConv.set(r.conversationId, m);
        }
        m[r.skill] = r.score;
    }
    return byConv;
}
/**
 * Aggregates profile + last two graded simulation scores into a lightweight progress snapshot.
 */
async function buildProgressSnapshot(userId) {
    const rows = await (0, weaknessProfileService_1.listWeaknessProfilesForUser)(userId);
    const rowBySkill = new Map(rows.map((r) => [r.skill, r]));
    const profiles = coaching_1.SALES_SKILLS.map((skill) => {
        const r = rowBySkill.get(skill);
        return {
            skill,
            currentScore: r?.currentScore ?? 5,
            trendDirection: (r?.trendDirection ?? 'stable'),
        };
    });
    const scoresRecord = {};
    for (const p of profiles) {
        scoresRecord[p.skill] = p.currentScore;
    }
    const lowestSkills = (0, weaknessSelection_1.selectTopWeaknesses)(scoresRecord);
    const profilesBySkill = new Map();
    for (const p of profiles) {
        profilesBySkill.set(p.skill, p.trendDirection);
    }
    const decliningSkills = coaching_1.SALES_SKILLS.filter((s) => profilesBySkill.get(s) === 'declining');
    const recommendedFocusSkills = (0, progressRecommendation_1.pickRecommendedFocusSkills)({
        lowestSkills,
        profilesBySkill,
        maxSkills: 3,
    });
    const recommendedFocusMessage = (0, progressRecommendation_1.buildRecommendedFocusMessage)(recommendedFocusSkills, decliningSkills);
    const recentSummaries = await db_1.prisma.simulationEvaluationSummary.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { conversationId: true },
    });
    const conversationIds = recentSummaries.map((s) => s.conversationId);
    const hasTwoSimulations = conversationIds.length >= 2;
    let latestBySkill;
    let previousBySkill;
    if (conversationIds.length > 0) {
        const skillRows = await db_1.prisma.simulationSkillScore.findMany({
            where: { conversationId: { in: conversationIds } },
        });
        const grouped = scoresMapFromRows(skillRows);
        const latestId = conversationIds[0];
        latestBySkill = grouped.get(latestId);
        if (conversationIds.length >= 2) {
            const prevId = conversationIds[1];
            previousBySkill = grouped.get(prevId);
        }
    }
    const skillProgressList = coaching_1.SALES_SKILLS.map((skill) => {
        const prof = profiles.find((p) => p.skill === skill);
        const latest = latestBySkill?.[skill];
        const previous = previousBySkill?.[skill];
        let latestDelta;
        if (latest !== undefined && previous !== undefined) {
            latestDelta = Math.round((latest - previous) * 10) / 10;
        }
        const entry = {
            skill,
            currentScore: Math.round(prof.currentScore * 10) / 10,
            trendDirection: prof.trendDirection,
        };
        if (latest !== undefined)
            entry.latestSimulationScore = latest;
        if (previous !== undefined)
            entry.previousSimulationScore = previous;
        if (latestDelta !== undefined)
            entry.latestDelta = latestDelta;
        return entry;
    });
    const overallProgressSummary = (0, progressRecommendation_1.buildOverallProgressSummary)({
        lowestSkills,
        profiles,
        hasTwoSimulations,
    });
    return {
        skills: skillProgressList,
        lowestSkills,
        recommendedFocusSkills,
        recommendedFocusMessage,
        overallProgressSummary,
    };
}
//# sourceMappingURL=userProgressService.js.map