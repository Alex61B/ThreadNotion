"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stagnationSameLowest = exports.consecutiveDrillStreakForSkill = exports.RECENT_GRADED_SESSION_LIMIT = void 0;
exports.loadRecentGradedSessions = loadRecentGradedSessions;
const db_1 = require("../db");
const parseStoredAdaptivePlan_1 = require("../domain/adaptive/parseStoredAdaptivePlan");
const parseStoredDrillPlan_1 = require("../domain/drill/parseStoredDrillPlan");
exports.RECENT_GRADED_SESSION_LIMIT = 8;
var recentGradedSession_1 = require("../domain/training/recentGradedSession");
Object.defineProperty(exports, "consecutiveDrillStreakForSkill", { enumerable: true, get: function () { return recentGradedSession_1.consecutiveDrillStreakForSkill; } });
Object.defineProperty(exports, "stagnationSameLowest", { enumerable: true, get: function () { return recentGradedSession_1.stagnationSameLowest; } });
/**
 * Last N graded conversations for a user, newest first, with parsed plan metadata and per-session lowest skill.
 */
async function loadRecentGradedSessions(userId, max = exports.RECENT_GRADED_SESSION_LIMIT) {
    const convs = await db_1.prisma.conversation.findMany({
        where: {
            userId,
            evaluationSummary: { isNot: null },
        },
        orderBy: { createdAt: 'desc' },
        take: max,
        select: {
            id: true,
            createdAt: true,
            simulationMode: true,
            drillPlan: true,
            adaptiveScenarioPlan: true,
        },
    });
    if (convs.length === 0)
        return [];
    const ids = convs.map((c) => c.id);
    const scoreRows = await db_1.prisma.simulationSkillScore.findMany({
        where: { conversationId: { in: ids } },
    });
    const scoresByConv = new Map();
    for (const row of scoreRows) {
        const list = scoresByConv.get(row.conversationId) ?? [];
        list.push(row);
        scoresByConv.set(row.conversationId, list);
    }
    return convs.map((conv) => {
        const drill = (0, parseStoredDrillPlan_1.parseStoredDrillPlan)(conv.drillPlan, {
            where: 'recentTrainingContext',
            conversationId: conv.id,
        });
        const adaptive = (0, parseStoredAdaptivePlan_1.parseStoredAdaptivePlan)(conv.adaptiveScenarioPlan, {
            where: 'recentTrainingContext',
            conversationId: conv.id,
        });
        const rows = scoresByConv.get(conv.id) ?? [];
        let lowestSkillInSession;
        if (rows.length >= 6) {
            const sorted = [...rows].sort((a, b) => a.score - b.score);
            lowestSkillInSession = sorted[0].skill;
        }
        const session = {
            conversationId: conv.id,
            createdAt: conv.createdAt,
            simulationMode: conv.simulationMode,
            adaptiveTargetWeaknesses: adaptive?.targetWeaknesses ?? [],
            ...(drill?.primarySkill != null ? { drillPrimarySkill: drill.primarySkill } : {}),
            ...(drill?.secondarySkill != null ? { drillSecondarySkill: drill.secondarySkill } : {}),
            ...(lowestSkillInSession != null ? { lowestSkillInSession } : {}),
        };
        return session;
    });
}
//# sourceMappingURL=recentTrainingContextService.js.map