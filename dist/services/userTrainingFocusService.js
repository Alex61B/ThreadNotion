"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrainingFocusForUser = getTrainingFocusForUser;
exports.upsertTrainingFocus = upsertTrainingFocus;
exports.clearTrainingFocus = clearTrainingFocus;
exports.decrementTrainingFocusSessionIfAny = decrementTrainingFocusSessionIfAny;
const db_1 = require("../db");
async function getTrainingFocusForUser(userId) {
    const row = await db_1.prisma.userTrainingFocus.findUnique({ where: { userId } });
    if (!row)
        return null;
    const focusSkills = row.focusSkills;
    return {
        userId: row.userId,
        focusSkills: Array.isArray(focusSkills) ? focusSkills : [],
        sessionsRemaining: row.sessionsRemaining,
        source: row.source,
        updatedAt: row.updatedAt,
    };
}
async function upsertTrainingFocus(args) {
    const data = {
        userId: args.userId,
        focusSkills: args.focusSkills,
        sessionsRemaining: args.sessionsRemaining ?? null,
        source: args.source ?? 'user',
    };
    const row = await db_1.prisma.userTrainingFocus.upsert({
        where: { userId: args.userId },
        create: data,
        update: {
            focusSkills: args.focusSkills,
            ...(args.sessionsRemaining !== undefined ? { sessionsRemaining: args.sessionsRemaining } : {}),
            ...(args.source ? { source: args.source } : {}),
        },
    });
    const focusSkills = row.focusSkills;
    return {
        userId: row.userId,
        focusSkills: Array.isArray(focusSkills) ? focusSkills : [],
        sessionsRemaining: row.sessionsRemaining,
        source: row.source,
        updatedAt: row.updatedAt,
    };
}
async function clearTrainingFocus(userId) {
    await db_1.prisma.userTrainingFocus.deleteMany({ where: { userId } });
}
/** After a successful graded session, count down pinned sessions if the user set a limit. */
async function decrementTrainingFocusSessionIfAny(userId) {
    const row = await db_1.prisma.userTrainingFocus.findUnique({ where: { userId } });
    if (!row || row.sessionsRemaining == null || row.sessionsRemaining <= 0)
        return;
    await db_1.prisma.userTrainingFocus.update({
        where: { userId },
        data: { sessionsRemaining: row.sessionsRemaining - 1 },
    });
}
//# sourceMappingURL=userTrainingFocusService.js.map