"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postTeams = postTeams;
exports.getTeams = getTeams;
exports.getTeamMembers = getTeamMembers;
exports.postTeamMembers = postTeamMembers;
const teamService_1 = require("../../services/teamService");
const teamAnalytics_1 = require("../../schemas/teamAnalytics");
const teamErrors_1 = require("../teamErrors");
async function postTeams(rawBody) {
    const body = teamAnalytics_1.CreateTeamBodySchema.safeParse(rawBody);
    if (!body.success) {
        return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
    }
    const team = await (0, teamService_1.createTeam)(body.data.name, body.data.userId);
    return {
        status: 201,
        body: { ok: true, team: { id: team.id, name: team.name, ownerId: team.ownerId } },
    };
}
async function getTeams(userId) {
    const teams = await (0, teamService_1.listTeamsForUser)(userId);
    return { status: 200, body: { ok: true, teams } };
}
async function getTeamMembers(teamId, userId) {
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, userId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    const members = await (0, teamService_1.listTeamMembers)(teamId);
    return {
        status: 200,
        body: {
            ok: true,
            members: members.map((m) => ({
                userId: m.userId,
                role: m.role,
                displayName: m.displayName,
                joinedAt: m.joinedAt.toISOString(),
            })),
        },
    };
}
async function postTeamMembers(teamId, actingUserId, rawBody) {
    const body = teamAnalytics_1.AddTeamMemberBodySchema.safeParse(rawBody);
    if (!body.success) {
        return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
    }
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, actingUserId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    try {
        const m = await (0, teamService_1.addTeamMember)({
            teamId,
            memberUserId: body.data.memberUserId,
            ...(body.data.role !== undefined ? { role: body.data.role } : {}),
            ...(body.data.displayName !== undefined ? { displayName: body.data.displayName } : {}),
        });
        return {
            status: 201,
            body: {
                ok: true,
                member: {
                    userId: m.userId,
                    role: m.role,
                    displayName: m.displayName,
                    joinedAt: m.joinedAt.toISOString(),
                },
            },
        };
    }
    catch (err) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(err);
        if (mapped)
            return mapped;
        const anyErr = err;
        if (anyErr?.code === 'P2002') {
            return { status: 409, body: { error: 'User is already a member of this team' } };
        }
        throw err;
    }
}
//# sourceMappingURL=teams.js.map