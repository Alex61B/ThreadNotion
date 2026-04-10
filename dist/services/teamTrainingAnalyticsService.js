"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateTeamAnalyticsFromUserAnalytics = aggregateTeamAnalyticsFromUserAnalytics;
exports.buildTeamTrainingAnalytics = buildTeamTrainingAnalytics;
const coaching_1 = require("../schemas/coaching");
const teamAnalytics_1 = require("../schemas/teamAnalytics");
const db_1 = require("../db");
const userTrainingAnalyticsService_1 = require("./userTrainingAnalyticsService");
function skillIndex(s) {
    return coaching_1.SALES_SKILLS.indexOf(s);
}
/**
 * Pure aggregation for tests. Excludes users with sessionsAnalyzed === 0 from per-skill team averages
 * and from weakest/strongest user lists (no session data to rank).
 */
function aggregateTeamAnalyticsFromUserAnalytics(analyticsByUser) {
    const memberIds = [...analyticsByUser.keys()].sort((a, b) => a.localeCompare(b));
    const activeMembers = memberIds.filter((uid) => (analyticsByUser.get(uid)?.sessionsAnalyzed ?? 0) > 0);
    const skills = coaching_1.SALES_SKILLS.map((skill) => {
        const scores = [];
        for (const uid of activeMembers) {
            const a = analyticsByUser.get(uid);
            const row = a.skills.find((s) => s.skill === skill);
            if (row) {
                scores.push({ userId: uid, score: row.averageScore });
            }
        }
        let averageScore = 0;
        if (scores.length > 0) {
            averageScore = scores.reduce((sum, x) => sum + x.score, 0) / scores.length;
        }
        let weakestUsers = [];
        let strongestUsers = [];
        if (scores.length > 0) {
            const minS = Math.min(...scores.map((s) => s.score));
            const maxS = Math.max(...scores.map((s) => s.score));
            weakestUsers = scores
                .filter((s) => s.score === minS)
                .map((s) => s.userId)
                .sort((a, b) => a.localeCompare(b));
            strongestUsers = scores
                .filter((s) => s.score === maxS)
                .map((s) => s.userId)
                .sort((a, b) => a.localeCompare(b));
        }
        return {
            skill,
            averageScore,
            weakestUsers,
            strongestUsers,
        };
    });
    let teamWeakestSkill;
    let teamStrongestSkill;
    if (activeMembers.length > 0) {
        let bestAvg = -Infinity;
        for (const row of skills) {
            if (row.averageScore > bestAvg) {
                bestAvg = row.averageScore;
                teamStrongestSkill = row.skill;
            }
            else if (row.averageScore === bestAvg && teamStrongestSkill !== undefined) {
                if (skillIndex(row.skill) < skillIndex(teamStrongestSkill)) {
                    teamStrongestSkill = row.skill;
                }
            }
        }
        let worstAvg = Infinity;
        for (const row of skills) {
            if (row.averageScore < worstAvg) {
                worstAvg = row.averageScore;
                teamWeakestSkill = row.skill;
            }
            else if (row.averageScore === worstAvg && teamWeakestSkill !== undefined) {
                if (skillIndex(row.skill) < skillIndex(teamWeakestSkill)) {
                    teamWeakestSkill = row.skill;
                }
            }
        }
    }
    let totalSessions = 0;
    const memberMeans = [];
    for (const uid of memberIds) {
        const a = analyticsByUser.get(uid);
        totalSessions += a.sessionsAnalyzed;
        if (a.sessionsAnalyzed > 0 && a.skills.length > 0) {
            const m = a.skills.reduce((s, r) => s + r.averageScore, 0) / a.skills.length;
            memberMeans.push(m);
        }
    }
    let averageProgress;
    if (memberMeans.length > 0) {
        averageProgress = memberMeans.reduce((s, x) => s + x, 0) / memberMeans.length;
    }
    const raw = {
        skills,
        teamWeakestSkill,
        teamStrongestSkill,
        averageProgress,
        totalSessions,
    };
    const parsed = teamAnalytics_1.TeamAnalyticsSchema.safeParse(raw);
    return parsed.success ? parsed.data : raw;
}
async function buildTeamTrainingAnalytics(teamId) {
    const members = await db_1.prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true },
    });
    const map = new Map();
    for (const m of members) {
        map.set(m.userId, await (0, userTrainingAnalyticsService_1.buildUserTrainingAnalytics)(m.userId));
    }
    return aggregateTeamAnalyticsFromUserAnalytics(map);
}
//# sourceMappingURL=teamTrainingAnalyticsService.js.map