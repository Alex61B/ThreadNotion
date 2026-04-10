"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamAccessError = void 0;
exports.createTeam = createTeam;
exports.listTeamsForUser = listTeamsForUser;
exports.getTeam = getTeam;
exports.listTeamMembers = listTeamMembers;
exports.isTeamManagerOrOwner = isTeamManagerOrOwner;
exports.assertTeamManagerOrOwner = assertTeamManagerOrOwner;
exports.assertTeamMember = assertTeamMember;
exports.addTeamMember = addTeamMember;
exports.ensureMemberOfTeam = ensureMemberOfTeam;
const db_1 = require("../db");
class TeamAccessError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'TeamAccessError';
    }
}
exports.TeamAccessError = TeamAccessError;
async function createTeam(name, ownerId) {
    const team = await db_1.prisma.team.create({
        data: {
            name,
            ownerId,
            members: {
                create: {
                    userId: ownerId,
                    role: 'manager',
                },
            },
        },
    });
    return team;
}
async function listTeamsForUser(userId) {
    const rows = await db_1.prisma.teamMember.findMany({
        where: { userId },
        include: { team: true },
        orderBy: { joinedAt: 'asc' },
    });
    return rows.map((r) => ({
        teamId: r.teamId,
        name: r.team.name,
        role: r.role,
        ownerId: r.team.ownerId,
    }));
}
async function getTeam(teamId) {
    return db_1.prisma.team.findUnique({ where: { id: teamId } });
}
async function listTeamMembers(teamId) {
    return db_1.prisma.teamMember.findMany({
        where: { teamId },
        orderBy: { joinedAt: 'asc' },
    });
}
async function isTeamManagerOrOwner(teamId, userId) {
    const team = await db_1.prisma.team.findUnique({ where: { id: teamId } });
    if (!team)
        return false;
    if (team.ownerId === userId)
        return true;
    const m = await db_1.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
    });
    return m?.role === 'manager';
}
async function assertTeamManagerOrOwner(teamId, userId) {
    const team = await db_1.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
        throw new TeamAccessError('Team not found', 404);
    }
    const ok = await isTeamManagerOrOwner(teamId, userId);
    if (!ok) {
        throw new TeamAccessError('Not allowed to manage this team', 403);
    }
}
async function assertTeamMember(teamId, userId) {
    const m = await db_1.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
    });
    if (!m) {
        throw new TeamAccessError('Not a team member', 403);
    }
}
async function addTeamMember(args) {
    return db_1.prisma.teamMember.create({
        data: {
            teamId: args.teamId,
            userId: args.memberUserId,
            role: args.role ?? 'rep',
            displayName: args.displayName ?? null,
        },
    });
}
async function ensureMemberOfTeam(teamId, memberUserId) {
    const m = await db_1.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: memberUserId } },
    });
    return !!m;
}
//# sourceMappingURL=teamService.js.map