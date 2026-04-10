"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTrainingRecommendationBundle = buildTrainingRecommendationBundle;
const trainingRecommendationEngine_1 = require("../domain/training/trainingRecommendationEngine");
const trainingOrchestration_1 = require("../schemas/trainingOrchestration");
const trainingOrchestrationService_1 = require("./trainingOrchestrationService");
const trainingOrchestrationEngine_1 = require("../domain/training/trainingOrchestrationEngine");
/**
 * Progress snapshot + recent graded context + orchestrated recommendation + legacy drill shim.
 */
async function buildTrainingRecommendationBundle(userId) {
    const { progress, trainingFocus, recentSessions, assignments, trainingFocusRow } = await (0, trainingOrchestrationService_1.buildOrchestrationInputs)(userId);
    const orchestratedRecommendation = (0, trainingOrchestrationEngine_1.buildOrchestratedRecommendation)({
        progress,
        trainingFocus,
        recentSessions,
        assignments,
    });
    const trainingRecommendation = (0, trainingOrchestration_1.toLegacyTrainingRecommendation)(orchestratedRecommendation);
    const drillSuggestion = (0, trainingRecommendationEngine_1.drillSuggestionFromTrainingRecommendation)(trainingRecommendation, progress, trainingFocus);
    return {
        progressSnapshot: progress,
        trainingRecommendation,
        drillSuggestion,
        trainingFocusRow,
        orchestratedRecommendation,
    };
}
//# sourceMappingURL=trainingRecommendationService.js.map