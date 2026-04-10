"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrchestratedRecommendationForUser = getOrchestratedRecommendationForUser;
exports.buildOrchestrationInputs = buildOrchestrationInputs;
const userProgressService_1 = require("./userProgressService");
const userTrainingFocusService_1 = require("./userTrainingFocusService");
const recentTrainingContextService_1 = require("./recentTrainingContextService");
const trainingAssignmentService_1 = require("./trainingAssignmentService");
const trainingOrchestrationEngine_1 = require("../domain/training/trainingOrchestrationEngine");
async function getOrchestratedRecommendationForUser(userId) {
    const inputs = await buildOrchestrationInputs(userId);
    return (0, trainingOrchestrationEngine_1.buildOrchestratedRecommendation)(inputs);
}
async function buildOrchestrationInputs(userId) {
    const [progress, trainingFocusRow, recentSessions, assignmentRows] = await Promise.all([
        (0, userProgressService_1.buildProgressSnapshot)(userId),
        (0, userTrainingFocusService_1.getTrainingFocusForUser)(userId),
        (0, recentTrainingContextService_1.loadRecentGradedSessions)(userId),
        (0, trainingAssignmentService_1.listActiveAssignmentsForUser)(userId),
    ]);
    const trainingFocus = trainingFocusRow
        ? {
            focusSkills: trainingFocusRow.focusSkills,
            sessionsRemaining: trainingFocusRow.sessionsRemaining,
        }
        : null;
    const assignments = assignmentRows.map((r) => ({
        skill: r.skill,
        assignmentType: r.assignmentType,
        teamName: r.team.name,
    }));
    return {
        progress,
        trainingFocus,
        recentSessions,
        assignments,
        trainingFocusRow,
    };
}
//# sourceMappingURL=trainingOrchestrationService.js.map