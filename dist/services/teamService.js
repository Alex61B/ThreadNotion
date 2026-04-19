"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMultiTeamNotAllowedError = exports.TeamSeatLimitError = exports.TeamAccessError = void 0;
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
const teamEntitlements_1 = require("../billing/teamEntitlements");
class TeamAccessError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'TeamAccessError';
    }
}
exports.TeamAccessError = TeamAccessError;
class TeamSeatLimitError extends TeamAccessError {
    constructor() {
        super('Team seat limit reached', 403);
        this.name = 'TeamSeatLimitError';
    }
}
exports.TeamSeatLimitError = TeamSeatLimitError;
class UserMultiTeamNotAllowedError extends TeamAccessError {
    constructor() {
        super('User is already a member of another team', 409);
        this.name = 'UserMultiTeamNotAllowedError';
    }
}
exports.UserMultiTeamNotAllowedError = UserMultiTeamNotAllowedError;
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
    // MVP constraint: each user may belong to at most one team.
    const existingMembership = await db_1.prisma.teamMember.findFirst({
        where: { userId: args.memberUserId, NOT: { teamId: args.teamId } },
    });
    if (existingMembership) {
        throw new UserMultiTeamNotAllowedError();
    }
    // Seat enforcement (MVP): if team has an active paid TEAM subscription, block joins at seat limit.
    const billing = await db_1.prisma.billingAccount.findUnique({ where: { teamId: args.teamId } });
    if (billing) {
        const sub = await db_1.prisma.subscription.findUnique({ where: { billingAccountId: billing.id } });
        if (sub && (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') && sub.planType === 'TEAM') {
            const maxSeats = (0, teamEntitlements_1.maxSeatsFromBundle)(sub.seatBundle);
            if (maxSeats > 0) {
                const activeCount = await db_1.prisma.teamMember.count({ where: { teamId: args.teamId } });
                if (activeCount >= maxSeats) {
                    throw new TeamSeatLimitError();
                }
            }
        }
    }
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