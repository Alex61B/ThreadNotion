"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveCoachingAfterChatTurn = getLiveCoachingAfterChatTurn;
const db_1 = require("../db");
const parseStoredAdaptivePlan_1 = require("../domain/adaptive/parseStoredAdaptivePlan");
const parseStoredDrillPlan_1 = require("../domain/drill/parseStoredDrillPlan");
const liveCoachingEngine_1 = require("../domain/liveCoaching/liveCoachingEngine");
const liveCoachingPolicy_1 = require("../domain/liveCoaching/liveCoachingPolicy");
const coaching_1 = require("../schemas/coaching");
const liveCoaching_1 = require("../schemas/liveCoaching");
const userTrainingFocusService_1 = require("./userTrainingFocusService");
const weaknessProfileService_1 = require("./weaknessProfileService");
function defaultSkillScores() {
    const o = {};
    for (const s of coaching_1.SALES_SKILLS)
        o[s] = 5;
    return o;
}
function countUserTurns(messages) {
    return messages.filter((m) => m.role === 'user').length;
}
/**
 * After a chat turn (user + assistant rows persisted), optionally compute a live coaching tip.
 */
async function getLiveCoachingAfterChatTurn(args) {
    if (!args.liveCoachingEnabled || args.chatMode !== 'roleplay') {
        return null;
    }
    const convo = await db_1.prisma.conversation.findUnique({
        where: { id: args.conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!convo)
        return null;
    const meta = (0, liveCoaching_1.parseLiveCoachingMeta)(convo.liveCoachingMeta);
    const userTurnCount = countUserTurns(convo.messages);
    const suggestionsShown = meta.suggestionsShown ?? 0;
    if (suggestionsShown >= liveCoachingPolicy_1.MAX_SUGGESTIONS_PER_CONVERSATION) {
        return null;
    }
    const lastIdx = meta.lastSuggestionUserTurnIndex;
    if (lastIdx != null &&
        userTurnCount - lastIdx < liveCoachingPolicy_1.MIN_USER_TURNS_BETWEEN_SUGGESTIONS) {
        return null;
    }
    const skillScores = args.userId
        ? await (0, weaknessProfileService_1.getMergedSkillScoresForUser)(args.userId)
        : defaultSkillScores();
    const focusRow = args.userId ? await (0, userTrainingFocusService_1.getTrainingFocusForUser)(args.userId) : null;
    const focusSkills = focusRow?.focusSkills ?? [];
    const adaptivePlan = (0, parseStoredAdaptivePlan_1.parseStoredAdaptivePlan)(convo.adaptiveScenarioPlan, {
        where: 'liveCoachingService',
        conversationId: convo.id,
    });
    const targetWeaknesses = adaptivePlan?.targetWeaknesses ?? [];
    const drill = (0, parseStoredDrillPlan_1.parseStoredDrillPlan)(convo.drillPlan, {
        where: 'liveCoachingService',
        conversationId: convo.id,
    });
    const transcript = convo.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
    }));
    const engineInput = {
        simulationMode: convo.simulationMode,
        transcript,
        targetWeaknesses,
        skillScores,
        focusSkills,
        currentUserTurnIndex: userTurnCount,
    };
    if (drill?.primarySkill) {
        engineInput.drillPrimary = drill.primarySkill;
    }
    if (drill?.secondarySkill) {
        engineInput.drillSecondary = drill.secondarySkill;
    }
    const suggestion = (0, liveCoachingEngine_1.computeLiveCoachingSuggestion)(engineInput);
    if (!suggestion) {
        return null;
    }
    const recent = meta.recentKinds ?? [];
    const window = recent.slice(0, liveCoachingPolicy_1.DEDUPE_RECENT_KINDS_WINDOW);
    if (window.includes(suggestion.kind)) {
        return null;
    }
    const nextMeta = {
        lastSuggestionUserTurnIndex: userTurnCount,
        suggestionsShown: suggestionsShown + 1,
        recentKinds: [suggestion.kind, ...recent].slice(0, liveCoachingPolicy_1.DEDUPE_RECENT_KINDS_WINDOW),
    };
    await db_1.prisma.conversation.update({
        where: { id: convo.id },
        data: { liveCoachingMeta: nextMeta },
    });
    return suggestion;
}
//# sourceMappingURL=liveCoachingService.js.map