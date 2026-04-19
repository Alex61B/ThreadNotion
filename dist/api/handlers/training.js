"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeaknessProfile = getWeaknessProfile;
exports.getUserProgress = getUserProgress;
exports.getUserTrainingAnalytics = getUserTrainingAnalytics;
exports.getTrainingRecommendation = getTrainingRecommendation;
exports.getTrainingAssignments = getTrainingAssignments;
exports.getTrainingFocus = getTrainingFocus;
exports.patchTrainingFocus = patchTrainingFocus;
exports.deleteTrainingFocus = deleteTrainingFocus;
exports.getTeamAnalytics = getTeamAnalytics;
exports.getTeamMemberProgress = getTeamMemberProgress;
exports.postTeamAssignment = postTeamAssignment;
const zod_1 = require("zod");
const trainingRecommendationService_1 = require("../../services/trainingRecommendationService");
const trainingOrchestrationService_1 = require("../../services/trainingOrchestrationService");
const userTrainingAnalyticsService_1 = require("../../services/userTrainingAnalyticsService");
const teamTrainingAnalyticsService_1 = require("../../services/teamTrainingAnalyticsService");
const trainingAssignmentService_1 = require("../../services/trainingAssignmentService");
const userTrainingFocusService_1 = require("../../services/userTrainingFocusService");
const teamService_1 = require("../../services/teamService");
const weaknessProfileService_1 = require("../../services/weaknessProfileService");
const teamAnalytics_1 = require("../../schemas/teamAnalytics");
const coaching_1 = require("../../schemas/coaching");
const teamErrors_1 = require("../teamErrors");
const zodHttp_1 = require("../zodHttp");
const TrainingFocusPatchBody = zod_1.z.object({
    focusSkills: zod_1.z.array(coaching_1.SalesSkillSchema).max(3).min(1),
    sessionsRemaining: zod_1.z.number().int().min(0).nullable().optional(),
    source: zod_1.z.enum(['user', 'profile', 'progress']).optional(),
});
async function getWeaknessProfile(userId) {
    const profiles = await (0, weaknessProfileService_1.listWeaknessProfilesForUser)(userId);
    return {
        status: 200,
        body: {
            ok: true,
            profiles: profiles.map((p) => ({
                id: p.id,
                userId: p.userId,
                skill: p.skill,
                currentScore: p.currentScore,
                trendDirection: p.trendDirection,
                lastSimulationId: p.lastSimulationId,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            })),
        },
    };
}
async function getUserProgress(userId) {
    const bundle = await (0, trainingRecommendationService_1.buildTrainingRecommendationBundle)(userId);
    const { progressSnapshot, drillSuggestion, trainingRecommendation, trainingFocusRow, orchestratedRecommendation, } = bundle;
    return {
        status: 200,
        body: {
            ok: true,
            progressSnapshot,
            drillSuggestion,
            trainingRecommendation,
            orchestratedRecommendation,
            trainingFocus: trainingFocusRow
                ? {
                    focusSkills: trainingFocusRow.focusSkills,
                    sessionsRemaining: trainingFocusRow.sessionsRemaining,
                    source: trainingFocusRow.source,
                    updatedAt: trainingFocusRow.updatedAt.toISOString(),
                }
                : null,
        },
    };
}
async function getUserTrainingAnalytics(userId) {
    const analytics = await (0, userTrainingAnalyticsService_1.buildUserTrainingAnalytics)(userId);
    return { status: 200, body: { ok: true, analytics } };
}
async function getTrainingRecommendation(userId) {
    const recommendation = await (0, trainingOrchestrationService_1.getOrchestratedRecommendationForUser)(userId);
    return { status: 200, body: { ok: true, recommendation } };
}
async function getTrainingAssignments(userId) {
    const rows = await (0, trainingAssignmentService_1.listActiveAssignmentsForUser)(userId);
    return {
        status: 200,
        body: {
            ok: true,
            assignments: rows.map((a) => ({
                id: a.id,
                teamId: a.teamId,
                teamName: a.team.name,
                skill: a.skill,
                assignmentType: a.assignmentType,
                targetUserId: a.targetUserId,
                createdAt: a.createdAt.toISOString(),
            })),
        },
    };
}
async function getTrainingFocus(userId) {
    const row = await (0, userTrainingFocusService_1.getTrainingFocusForUser)(userId);
    if (!row) {
        return { status: 200, body: { ok: true, trainingFocus: null } };
    }
    return {
        status: 200,
        body: {
            ok: true,
            trainingFocus: {
                focusSkills: row.focusSkills,
                sessionsRemaining: row.sessionsRemaining,
                source: row.source,
                updatedAt: row.updatedAt.toISOString(),
            },
        },
    };
}
async function patchTrainingFocus(userId, rawBody) {
    let body;
    try {
        body = TrainingFocusPatchBody.parse(rawBody);
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError)
            return (0, zodHttp_1.zodErrorResult)(e);
        throw e;
    }
    const row = await (0, userTrainingFocusService_1.upsertTrainingFocus)({
        userId,
        focusSkills: body.focusSkills,
        ...(body.sessionsRemaining !== undefined ? { sessionsRemaining: body.sessionsRemaining } : {}),
        ...(body.source !== undefined ? { source: body.source } : {}),
    });
    return {
        status: 200,
        body: {
            ok: true,
            trainingFocus: {
                focusSkills: row.focusSkills,
                sessionsRemaining: row.sessionsRemaining,
                source: row.source,
                updatedAt: row.updatedAt.toISOString(),
            },
        },
    };
}
async function deleteTrainingFocus(userId) {
    await (0, userTrainingFocusService_1.clearTrainingFocus)(userId);
    return { status: 200, body: { ok: true } };
}
async function getTeamAnalytics(teamId, userId) {
    try {
        await (0, teamService_1.assertTeamMember)(teamId, userId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    const teamAnalytics = await (0, teamTrainingAnalyticsService_1.buildTeamTrainingAnalytics)(teamId);
    return { status: 200, body: { ok: true, teamAnalytics } };
}
async function getTeamMemberProgress(teamId, managerUserId, memberUserId) {
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, managerUserId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    const onTeam = await (0, teamService_1.ensureMemberOfTeam)(teamId, memberUserId);
    if (!onTeam) {
        return { status: 404, body: { error: 'Member not on this team' } };
    }
    const analytics = await (0, userTrainingAnalyticsService_1.buildUserTrainingAnalytics)(memberUserId);
    const bundle = await (0, trainingRecommendationService_1.buildTrainingRecommendationBundle)(memberUserId);
    const { progressSnapshot, drillSuggestion, trainingRecommendation, trainingFocusRow, orchestratedRecommendation, } = bundle;
    return {
        status: 200,
        body: {
            ok: true,
            analytics,
            progressSnapshot,
            drillSuggestion,
            trainingRecommendation,
            orchestratedRecommendation,
            trainingFocus: trainingFocusRow
                ? {
                    focusSkills: trainingFocusRow.focusSkills,
                    sessionsRemaining: trainingFocusRow.sessionsRemaining,
                    source: trainingFocusRow.source,
                    updatedAt: trainingFocusRow.updatedAt.toISOString(),
                }
                : null,
        },
    };
}
async function postTeamAssignment(teamId, rawBody) {
    const body = teamAnalytics_1.CreateAssignmentBodySchema.safeParse(rawBody);
    if (!body.success) {
        return { status: 400, body: { error: 'Invalid body', details: body.error.flatten() } };
    }
    try {
        await (0, teamService_1.assertTeamManagerOrOwner)(teamId, body.data.userId);
    }
    catch (e) {
        const mapped = (0, teamErrors_1.teamAccessErrorToResult)(e);
        if (mapped)
            return mapped;
        throw e;
    }
    if (body.data.targetUserId) {
        const ok = await (0, teamService_1.ensureMemberOfTeam)(teamId, body.data.targetUserId);
        if (!ok) {
            return { status: 400, body: { error: 'targetUserId must be a member of the team' } };
        }
    }
    const row = await (0, trainingAssignmentService_1.createTrainingAssignment)({
        teamId,
        assignedBy: body.data.userId,
        targetUserId: body.data.targetUserId ?? null,
        skill: body.data.skill,
        assignmentType: body.data.assignmentType,
    });
    return {
        status: 201,
        body: {
            ok: true,
            assignment: {
                id: row.id,
                teamId: row.teamId,
                skill: row.skill,
                assignmentType: row.assignmentType,
                targetUserId: row.targetUserId,
                active: row.active,
                createdAt: row.createdAt.toISOString(),
            },
        },
    };
}
//# sourceMappingURL=training.js.map