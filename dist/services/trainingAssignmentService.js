"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrainingAssignment = createTrainingAssignment;
exports.listAssignmentsForTeam = listAssignmentsForTeam;
exports.listActiveAssignmentsForUser = listActiveAssignmentsForUser;
exports.deactivateTrainingAssignment = deactivateTrainingAssignment;
const db_1 = require("../db");
const teamService_1 = require("./teamService");
async function createTrainingAssignment(args) {
    return db_1.prisma.trainingAssignment.create({
        data: {
            teamId: args.teamId,
            assignedBy: args.assignedBy,
            targetUserId: args.targetUserId ?? null,
            skill: args.skill,
            assignmentType: args.assignmentType,
            active: true,
        },
        include: { team: true },
    });
}
async function listAssignmentsForTeam(teamId) {
    return db_1.prisma.trainingAssignment.findMany({
        where: { teamId },
        orderBy: { createdAt: 'desc' },
        include: { team: true },
    });
}
/** Active assignments visible to this user (direct or team-wide for teams they belong to). */
async function listActiveAssignmentsForUser(userId) {
    const memberships = await db_1.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);
    if (teamIds.length === 0)
        return [];
    const rows = await db_1.prisma.trainingAssignment.findMany({
        where: {
            active: true,
            teamId: { in: teamIds },
            OR: [{ targetUserId: userId }, { targetUserId: null }],
        },
        orderBy: { createdAt: 'desc' },
        include: { team: true },
    });
    return rows;
}
async function deactivateTrainingAssignment(id, teamId, managerUserId) {
    await (0, teamService_1.assertTeamManagerOrOwner)(teamId, managerUserId);
    await db_1.prisma.trainingAssignment.updateMany({
        where: { id, teamId },
        data: { active: false },
    });
}
//# sourceMappingURL=trainingAssignmentService.js.map