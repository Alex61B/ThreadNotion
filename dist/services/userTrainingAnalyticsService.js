"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTrainingAnalyticsFromSessions = computeTrainingAnalyticsFromSessions;
exports.buildUserTrainingAnalytics = buildUserTrainingAnalytics;
const db_1 = require("../db");
const computeModeAnalytics_1 = require("../domain/trainingAnalytics/computeModeAnalytics");
const computeSkillAnalytics_1 = require("../domain/trainingAnalytics/computeSkillAnalytics");
const selectNotables_1 = require("../domain/trainingAnalytics/selectNotables");
const coaching_1 = require("../schemas/coaching");
const trainingAnalytics_1 = require("../schemas/trainingAnalytics");
function scoresFromRows(rows) {
    const map = new Map(rows.map((r) => [r.skill, r.score]));
    const out = {};
    for (const skill of coaching_1.SALES_SKILLS) {
        const v = map.get(skill);
        if (v === undefined)
            return null;
        out[skill] = v;
    }
    return out;
}
function computeTrainingAnalyticsFromSessions(sessions) {
    if (sessions.length === 0) {
        const parsed = trainingAnalytics_1.TrainingAnalyticsSchema.safeParse({
            skills: [],
            modes: (0, computeModeAnalytics_1.computeModeAnalytics)([]),
            sessionsAnalyzed: 0,
        });
        return parsed.success ? parsed.data : { skills: [], modes: (0, computeModeAnalytics_1.computeModeAnalytics)([]), sessionsAnalyzed: 0 };
    }
    const skills = (0, computeSkillAnalytics_1.computeSkillAnalytics)(sessions);
    const modes = (0, computeModeAnalytics_1.computeModeAnalytics)(sessions);
    const notables = (0, selectNotables_1.selectNotables)(skills);
    const raw = {
        skills,
        modes,
        sessionsAnalyzed: sessions.length,
        strongestSkill: notables.strongestSkill,
        weakestSkill: notables.weakestSkill,
        mostImprovedSkill: notables.mostImprovedSkill,
        persistentWeakness: notables.persistentWeakness,
    };
    const parsed = trainingAnalytics_1.TrainingAnalyticsSchema.safeParse(raw);
    return parsed.success ? parsed.data : { skills, modes, sessionsAnalyzed: sessions.length };
}
async function buildUserTrainingAnalytics(userId) {
    try {
        const conversations = await db_1.prisma.conversation.findMany({
            where: {
                userId,
                evaluationSummary: { isNot: null },
            },
            orderBy: { evaluationSummary: { createdAt: 'asc' } },
            select: {
                id: true,
                createdAt: true,
                simulationMode: true,
                evaluationSummary: { select: { createdAt: true } },
                skillScores: { select: { skill: true, score: true } },
            },
        });
        const sessions = [];
        for (const c of conversations) {
            const scores = scoresFromRows(c.skillScores);
            if (!scores)
                continue;
            const gradedAt = c.evaluationSummary?.createdAt ?? c.createdAt;
            sessions.push({
                conversationId: c.id,
                gradedAt: gradedAt.toISOString(),
                mode: c.simulationMode,
                scores,
            });
        }
        sessions.sort((a, b) => new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime());
        return computeTrainingAnalyticsFromSessions(sessions);
    }
    catch {
        const empty = trainingAnalytics_1.TrainingAnalyticsSchema.safeParse({
            skills: [],
            modes: (0, computeModeAnalytics_1.computeModeAnalytics)([]),
            sessionsAnalyzed: 0,
        });
        return empty.success
            ? empty.data
            : { skills: [], modes: (0, computeModeAnalytics_1.computeModeAnalytics)([]), sessionsAnalyzed: 0 };
    }
}
//# sourceMappingURL=userTrainingAnalyticsService.js.map