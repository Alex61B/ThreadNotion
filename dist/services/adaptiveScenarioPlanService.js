"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdaptiveScenarioPlan = buildAdaptiveScenarioPlan;
const weaknessPressureCatalog_1 = require("../domain/adaptive/weaknessPressureCatalog");
const weaknessCoherence_1 = require("../domain/adaptive/weaknessCoherence");
const deriveFromSeed_1 = require("../domain/simulationRealism/deriveFromSeed");
const enrichPlan_1 = require("../domain/simulationRealism/enrichPlan");
function uniqueById(tactics) {
    const seen = new Set();
    const out = [];
    for (const t of tactics) {
        if (seen.has(t.id))
            continue;
        seen.add(t.id);
        out.push(t);
    }
    return out;
}
/**
 * Build a persisted adaptive plan from top weaknesses + persona/product context.
 * No LLM calls—deterministic catalog + coherence only.
 */
function buildAdaptiveScenarioPlan(args) {
    const { targetWeaknesses, persona, product, realismSeed } = args;
    const coherence = (0, weaknessCoherence_1.mergeWeaknessesForScenario)(targetWeaknesses);
    const skills = coherence.skills;
    const personaSummary = `You are shopping as ${persona.name}, matching the tone and values described in your persona.`;
    const productLine = product
        ? `You are looking at ${product.title}${product.brand ? ` (${product.brand})` : ''}${product.price != null ? ` around $${product.price}` : ''}.`
        : 'You are browsing clothing and may or may not have a specific item in mind yet.';
    const customerContext = `Setting: a clothing and fashion retail store. ${productLine}`;
    const scenarioGoal = skills.length === 0
        ? 'Have a natural fitting-room conversation; let the associate guide you without making it too easy.'
        : 'Give the associate realistic chances to practice discovery, handle hesitation, and earn a clear next step—without breaking character.';
    const tactics = [];
    const realism = realismSeed ? (0, deriveFromSeed_1.deriveSimulationRealism)(realismSeed, persona.name) : null;
    const stageSalt = realism ? `stage:${realism.dealStage}` : 'stage:none';
    const knowledgeSalt = realism ? `knowledge:${realism.buyerKnowledgeLevel}` : 'knowledge:none';
    for (const skill of skills) {
        if (realismSeed) {
            const idx = (0, weaknessPressureCatalog_1.pickPressureIndexFromSeed)(realismSeed, skill, `primary:${stageSalt}:${knowledgeSalt}`);
            tactics.push((0, weaknessPressureCatalog_1.pickPressureByIndex)(skill, idx));
        }
        else {
            tactics.push((0, weaknessPressureCatalog_1.pickPressureByIndex)(skill, 0));
        }
        // With multiple focus areas, one tactic per skill avoids stacking too many competing pressures.
        if (skills.length === 1) {
            if (realismSeed) {
                const idx2 = (0, weaknessPressureCatalog_1.pickPressureIndexFromSeed)(realismSeed, skill, `secondary:${stageSalt}:${knowledgeSalt}`);
                tactics.push((0, weaknessPressureCatalog_1.pickPressureByIndex)(skill, idx2));
            }
            else {
                tactics.push((0, weaknessPressureCatalog_1.pickPressureByIndex)(skill, 1));
            }
        }
    }
    const pressureTactics = uniqueById(tactics).slice(0, 4).map((p) => ({
        id: p.id,
        label: p.label,
        customerLine: p.customerLine,
    }));
    const conversationConstraints = [
        'Stay plausible for a real shopper—no lectures, no meta-talk about training or scores.',
        'Keep replies short (about one to four sentences) unless the associate draws you out.',
        'Do not name internal coaching labels or say you are testing the associate.',
    ];
    const coachingFocusSummary = skills.length === 0
        ? 'Practice run: your profile has no coaching history yet, so this session uses a neutral customer stance.'
        : coherence.scenarioTheme
            ? coherence.scenarioTheme.slice(0, 200) + (coherence.scenarioTheme.length > 200 ? '…' : '')
            : `Realistic shopper behavior targeting your current coaching priorities (${skills.length} ${skills.length === 1 ? 'area' : 'areas'}).`;
    const rationaleParts = [];
    if (skills.length === 0) {
        rationaleParts.push('No profile weaknesses were available; generic adaptive framing only.');
    }
    else {
        rationaleParts.push(`Selected pressures for: ${skills.join(', ')}.`);
        if (coherence.droppedSkills.length) {
            rationaleParts.push(`Merged/dropped redundant focus: ${coherence.droppedSkills.join(', ')}.`);
        }
        if (coherence.scenarioTheme) {
            rationaleParts.push(`Theme: ${coherence.scenarioTheme}`);
        }
    }
    const base = {
        targetWeaknesses: skills,
        personaSummary,
        customerContext,
        scenarioGoal,
        pressureTactics,
        conversationConstraints,
        coachingFocusSummary,
        scenarioRationale: rationaleParts.join(' '),
        scenarioTheme: coherence.scenarioTheme,
    };
    return realismSeed ? (0, enrichPlan_1.enrichAdaptiveScenarioPlanWithRealism)(base, realismSeed, persona.name) : base;
}
//# sourceMappingURL=adaptiveScenarioPlanService.js.map