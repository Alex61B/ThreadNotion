"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveSimulationRealism = deriveSimulationRealism;
const hash_1 = require("./hash");
const DOMAIN_EXPERIENCE = ['low', 'medium', 'high'];
const RISK_TOLERANCE = ['low', 'medium', 'high'];
const COMM_STYLE = ['concise', 'analytical', 'story-driven', 'skeptical'];
const TIME_PRESSURE = ['low', 'medium', 'high'];
const OPENNESS = ['low', 'medium', 'high'];
const KNOWLEDGE = [
    'uninformed',
    'partially_informed',
    'competitor_aware',
    'expert',
];
const BEHAVIOR = ['cooperative', 'guarded', 'skeptical', 'impatient', 'curious'];
const STAGE = ['discovery_call', 'product_evaluation', 'vendor_comparison', 'final_decision'];
function pick(seed, salt, arr) {
    const idx = (0, hash_1.hashStringToIndex)(`${seed}:${salt}`, arr.length);
    return arr[idx];
}
function deriveRole(seed, personaName) {
    const roles = [
        'working professional',
        'college student',
        'parent shopping for family',
        'traveler planning a trip',
        'creative professional',
        'fitness-focused shopper',
    ];
    const adjectives = ['budget-conscious', 'style-forward', 'comfort-first', 'practical', 'trend-curious', 'minimalist'];
    const role = pick(seed, 'role', roles);
    const adj = pick(seed, 'role_adj', adjectives);
    const namePrefix = personaName ? `${personaName}—` : '';
    return `${namePrefix}${adj} ${role}`;
}
/**
 * Deterministic realism profile from a stable seed.
 * This intentionally avoids fully random selection so planners remain reproducible and testable.
 */
function deriveSimulationRealism(seed, personaName) {
    const domainExperience = pick(seed, 'domainExperience', DOMAIN_EXPERIENCE);
    const riskTolerance = pick(seed, 'riskTolerance', RISK_TOLERANCE);
    const communicationStyle = pick(seed, 'communicationStyle', COMM_STYLE);
    const timePressure = pick(seed, 'timePressure', TIME_PRESSURE);
    const opennessToChange = pick(seed, 'opennessToChange', OPENNESS);
    const buyerKnowledgeLevel = pick(seed, 'buyerKnowledgeLevel', KNOWLEDGE);
    const customerBehavior = pick(seed, 'customerBehavior', BEHAVIOR);
    const dealStage = pick(seed, 'dealStage', STAGE);
    // Lightweight realism: nudge some combos away from extremes when seed produces clashes.
    // Still deterministic: the adjustment uses the same seed.
    const adjustedRiskTolerance = timePressure === 'high' && riskTolerance === 'low'
        ? pick(seed, 'riskTolerance_adjusted', ['low', 'medium'])
        : riskTolerance;
    const adjustedOpenness = customerBehavior === 'skeptical' && opennessToChange === 'high'
        ? pick(seed, 'openness_adjusted', ['medium', 'high'])
        : opennessToChange;
    return {
        personaTraits: {
            role: deriveRole(seed, personaName),
            domainExperience,
            riskTolerance: adjustedRiskTolerance,
            communicationStyle,
            timePressure,
            opennessToChange: adjustedOpenness,
        },
        buyerKnowledgeLevel,
        customerBehavior,
        dealStage,
    };
}
//# sourceMappingURL=deriveFromSeed.js.map