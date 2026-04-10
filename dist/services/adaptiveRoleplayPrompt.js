"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRoleplaySystemPrompt = buildRoleplaySystemPrompt;
function realismBlock(plan) {
    const r = plan.simulationRealism;
    if (!r)
        return '';
    const knowledge = r.buyerKnowledgeLevel === 'uninformed'
        ? 'Ask basic questions to understand the item and options.'
        : r.buyerKnowledgeLevel === 'partially_informed'
            ? 'You understand your need; ask clarifying questions before deciding.'
            : r.buyerKnowledgeLevel === 'competitor_aware'
                ? 'Reference other brands/options and ask for comparisons.'
                : 'Challenge vague claims; ask for concrete details and trade-offs.';
    const behavior = r.customerBehavior === 'cooperative'
        ? 'Be warm and easy to talk to, but still realistic.'
        : r.customerBehavior === 'guarded'
            ? 'Do not overshare; reveal details only after good questions.'
            : r.customerBehavior === 'skeptical'
                ? 'Push back on generic pitches; ask for specifics.'
                : r.customerBehavior === 'impatient'
                    ? 'Keep it brisk; resist long detours.'
                    : 'Ask curious follow-ups; explore options when invited.';
    const stage = r.dealStage === 'discovery_call'
        ? 'You are exploring options and trying to understand what fits.'
        : r.dealStage === 'product_evaluation'
            ? 'You are evaluating details (fit, comfort, care, value) before committing.'
            : r.dealStage === 'vendor_comparison'
                ? 'You are comparing alternatives and looking for a reason to choose this store/item.'
                : 'You are close to a decision; focus on final concerns and next steps.';
    const comms = r.personaTraits.communicationStyle === 'concise'
        ? 'Keep replies short unless a great follow-up draws you out.'
        : r.personaTraits.communicationStyle === 'analytical'
            ? 'Ask structured questions and weigh trade-offs.'
            : r.personaTraits.communicationStyle === 'story-driven'
                ? 'Share small personal context when asked; be vivid but brief.'
                : 'Be skeptical and specific; challenge vague claims.';
    const pace = r.personaTraits.timePressure === 'high'
        ? 'You are on a tight clock—steer away from long browsing.'
        : r.personaTraits.timePressure === 'medium'
            ? 'You have some time, but prefer an efficient conversation.'
            : 'You have time to explore, as long as it stays relevant.';
    return `

=== REALISM / BUYER PROFILE (stay consistent) ===
Role: ${r.personaTraits.role}
Knowledge level: ${r.buyerKnowledgeLevel} — ${knowledge}
Behavior pattern: ${r.customerBehavior} — ${behavior}
Deal stage: ${r.dealStage} — ${stage}
Communication style: ${r.personaTraits.communicationStyle} — ${comms}
Time pressure: ${r.personaTraits.timePressure} — ${pace}
`;
}
/**
 * Fashion / apparel base block (persona + product) without adaptive sections.
 * Caller supplies the same base they use today for generic roleplay.
 */
function buildRoleplaySystemPrompt(args) {
    const { baseFashionBlock, plan } = args;
    const practiceKind = args.practiceKind ?? 'adaptive';
    if (!plan || plan.targetWeaknesses.length === 0) {
        return baseFashionBlock;
    }
    const seenLines = new Set();
    const uniqueTactics = plan.pressureTactics.filter((t) => {
        const k = t.customerLine.trim().toLowerCase();
        if (seenLines.has(k))
            return false;
        seenLines.add(k);
        return true;
    });
    const tacticsSection = uniqueTactics
        .map((t) => `- ${t.customerLine}`)
        .join('\n');
    const constraintsSection = plan.conversationConstraints.map((c) => `- ${c}`).join('\n');
    const themeBlock = plan.scenarioTheme
        ? `\nOVERALL SCENARIO STANCE:\n${plan.scenarioTheme}\n`
        : '';
    const sectionTitle = practiceKind === 'drill'
        ? '=== FOCUSED DRILL (short skill practice) ==='
        : '=== SCENARIO REALISM (adaptive practice) ===';
    const closingLine = practiceKind === 'drill'
        ? 'This is a compact drill: surface the skill-relevant moment early; avoid long rapport-building before the core challenge.'
        : 'Allow the associate to succeed when they listen well and respond specifically—stay human, not theatrical.';
    const adaptiveSections = `

${sectionTitle}
${plan.personaSummary}
${realismBlock(plan)}

CONTEXT:
${plan.customerContext}

GOAL FOR THIS RUN:
${plan.scenarioGoal}
${themeBlock}
CUSTOMER BEHAVIOR TACTICS (apply naturally; do not mention coaching or tests):
${tacticsSection}

CONSTRAINTS:
${constraintsSection}

${closingLine}
`;
    return `${baseFashionBlock}${adaptiveSections}`;
}
//# sourceMappingURL=adaptiveRoleplayPrompt.js.map