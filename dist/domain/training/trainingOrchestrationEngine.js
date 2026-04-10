"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOrchestratedRecommendation = buildOrchestratedRecommendation;
const weaknessCoherence_1 = require("../adaptive/weaknessCoherence");
const skillLabels_1 = require("../skillLabels");
const trainingRecommendationEngine_1 = require("./trainingRecommendationEngine");
const recentGradedSession_1 = require("./recentGradedSession");
const orchestrationConstants_1 = require("./orchestrationConstants");
function scoreForSkill(progress, skill) {
    return progress.skills.find((s) => s.skill === skill)?.currentScore ?? 5;
}
function isMastered(progress, skill) {
    return scoreForSkill(progress, skill) >= orchestrationConstants_1.MASTERY_MIN_SCORE;
}
function difficultyForScore(score) {
    if (score < orchestrationConstants_1.DRILL_IF_SCORE_LT)
        return 'hard';
    if (score < orchestrationConstants_1.MASTERY_MIN_SCORE)
        return 'medium';
    return 'easy';
}
function inferSourceFromLegacy(rec) {
    const factors = rec.sourceFactors ?? [];
    const joined = factors.join(' ').toLowerCase();
    if (joined.includes('pinned'))
        return 'training_focus';
    if (rec.recommendedMode === 'generic')
        return 'generic_fallback';
    return 'weakness_engine';
}
function legacyToOrchestrated(rec, source, progress) {
    const skills = [];
    if (rec.primarySkill)
        skills.push(rec.primarySkill);
    if (rec.secondarySkill && rec.secondarySkill !== rec.primarySkill)
        skills.push(rec.secondarySkill);
    const primary = skills[0];
    const diff = rec.recommendedMode === 'generic' || primary == null
        ? undefined
        : difficultyForScore(scoreForSkill(progress, primary));
    return {
        recommendedMode: rec.recommendedMode,
        targetSkills: skills,
        rationale: rec.rationale,
        difficultyLevel: diff,
        source,
        confidence: rec.confidence,
        sourceFactors: [...(rec.sourceFactors ?? [])],
    };
}
function managerOverride(a, progress) {
    const score = scoreForSkill(progress, a.skill);
    if (a.assignmentType === 'drill') {
        return {
            recommendedMode: 'drill',
            targetSkills: [a.skill],
            rationale: `Manager assigned (${a.teamName}): focused ${(0, skillLabels_1.skillLabel)(a.skill)} drill.`,
            difficultyLevel: difficultyForScore(score),
            source: 'manager_assignment',
            confidence: 'high',
            sourceFactors: ['Manager assignment', a.teamName],
        };
    }
    const merged = (0, weaknessCoherence_1.mergeWeaknessesForScenario)([
        a.skill,
        ...progress.lowestSkills.filter((s) => s !== a.skill),
    ]);
    const ts = merged.skills.length > 0 ? merged.skills : [a.skill];
    const primary = ts[0];
    return {
        recommendedMode: 'adaptive',
        targetSkills: ts.slice(0, 3),
        rationale: `Manager assigned (${a.teamName}): adaptive practice emphasizing ${(0, skillLabels_1.skillLabel)(a.skill)}.`,
        difficultyLevel: difficultyForScore(scoreForSkill(progress, primary)),
        source: 'manager_assignment',
        confidence: 'high',
        sourceFactors: ['Manager assignment', a.teamName],
    };
}
function targetsSkill(orch, skill) {
    return orch.targetSkills.includes(skill);
}
function applyMasteryAdjustment(orch, progress) {
    if (orch.recommendedMode !== 'drill')
        return orch;
    const primary = orch.targetSkills[0];
    if (!primary || !isMastered(progress, primary))
        return orch;
    const candidates = progress.lowestSkills.filter((s) => !isMastered(progress, s));
    const extraFactors = [...orch.sourceFactors, 'Mastery threshold met for prior drill target'];
    if (candidates.length === 0) {
        return {
            ...orch,
            recommendedMode: 'generic',
            targetSkills: [],
            rationale: `${(0, skillLabels_1.skillLabel)(primary)} looks strong lately—take a balanced simulation, then we can refresh weaker areas next.`,
            difficultyLevel: undefined,
            source: 'mastery_adjustment',
            sourceFactors: extraFactors,
        };
    }
    const nextWeak = candidates[0];
    const merged = (0, weaknessCoherence_1.mergeWeaknessesForScenario)([nextWeak, ...candidates.slice(1)]);
    const ts = merged.skills.slice(0, 2);
    return {
        recommendedMode: 'adaptive',
        targetSkills: ts,
        rationale: `${(0, skillLabels_1.skillLabel)(primary)} is at mastery level—shift to adaptive work on ${(0, skillLabels_1.skillLabel)(nextWeak)} instead.`,
        difficultyLevel: difficultyForScore(scoreForSkill(progress, ts[0])),
        source: 'mastery_adjustment',
        confidence: orch.confidence ?? 'medium',
        sourceFactors: extraFactors,
    };
}
function applySpacedRepetition(orch, progress, recentSessions) {
    for (const skill of progress.lowestSkills) {
        if (isMastered(progress, skill))
            continue;
        const gap = (0, recentGradedSession_1.sessionsSinceLastTouchedSkill)(recentSessions, skill);
        if (gap < orchestrationConstants_1.SPACED_MIN_SESSION_GAP)
            continue;
        if (targetsSkill(orch, skill))
            continue;
        const score = scoreForSkill(progress, skill);
        const rationale = `You have not practiced ${(0, skillLabels_1.skillLabel)(skill)} in the last ${gap} graded session(s)—time for a refresher.`;
        if (score < orchestrationConstants_1.DRILL_IF_SCORE_LT) {
            return {
                recommendedMode: 'drill',
                targetSkills: [skill],
                rationale,
                difficultyLevel: 'hard',
                source: 'spaced_repetition',
                confidence: 'medium',
                sourceFactors: ['Spaced repetition', `${gap} sessions since last practice`],
            };
        }
        if (score < orchestrationConstants_1.MASTERY_MIN_SCORE) {
            const merged = (0, weaknessCoherence_1.mergeWeaknessesForScenario)([
                skill,
                ...progress.lowestSkills.filter((s) => s !== skill),
            ]);
            const ts = merged.skills.slice(0, 2);
            return {
                recommendedMode: 'adaptive',
                targetSkills: ts,
                rationale,
                difficultyLevel: difficultyForScore(score),
                source: 'spaced_repetition',
                confidence: 'medium',
                sourceFactors: ['Spaced repetition', `${gap} sessions since last practice`],
            };
        }
    }
    return orch;
}
function buildOrchestratedRecommendation(input) {
    const { progress, trainingFocus, recentSessions, assignments } = input;
    if (assignments.length > 0) {
        return managerOverride(assignments[0], progress);
    }
    const base = (0, trainingRecommendationEngine_1.computeTrainingRecommendation)(progress, trainingFocus, recentSessions);
    const inferred = inferSourceFromLegacy(base);
    let orch = legacyToOrchestrated(base, inferred, progress);
    orch = applyMasteryAdjustment(orch, progress);
    orch = applySpacedRepetition(orch, progress, recentSessions);
    return orch;
}
//# sourceMappingURL=trainingOrchestrationEngine.js.map