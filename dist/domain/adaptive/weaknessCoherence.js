"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeWeaknessesForScenario = mergeWeaknessesForScenario;
/**
 * Deterministic trimming and merging:
 * - Cap at 3 weaknesses.
 * - Merge known pairs into a single "theme" so we do not stack redundant pressures.
 */
function mergeWeaknessesForScenario(orderedWeaknesses) {
    const unique = [];
    for (const w of orderedWeaknesses) {
        if (!unique.includes(w))
            unique.push(w);
    }
    let skills = unique.slice(0, 3);
    const dropped = [];
    let scenarioTheme;
    // discovery + empathy → one shopper stance
    if (skills.includes('discovery_questions') && skills.includes('empathy')) {
        scenarioTheme =
            'You are a bit guarded and unsure at first; share needs slowly and show mild discomfort until the associate earns trust with good questions.';
        skills = skills.filter((s) => s !== 'empathy');
        dropped.push('empathy');
    }
    // objection + closing → price/commitment thread (keep both but note theme)
    if (skills.includes('objection_handling') && skills.includes('closing')) {
        scenarioTheme =
            scenarioTheme ??
                'You are interested but careful about committing—raise concerns naturally and avoid a quick yes.';
    }
    // product_knowledge + storytelling → want substance, not a catalog
    if (skills.includes('product_knowledge') && skills.includes('storytelling')) {
        scenarioTheme =
            scenarioTheme ??
                'You respond when the associate explains how pieces work and fit real life—not when they only recite specs.';
    }
    skills = skills.slice(0, 3);
    const result = {
        skills,
        droppedSkills: dropped,
    };
    if (scenarioTheme !== undefined) {
        result.scenarioTheme = scenarioTheme;
    }
    return result;
}
//# sourceMappingURL=weaknessCoherence.js.map