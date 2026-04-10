"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEAKNESS_PRESSURE_CATALOG = void 0;
exports.catalogPressureOptionsForSkill = catalogPressureOptionsForSkill;
exports.pickPrimaryPressure = pickPrimaryPressure;
exports.pickSecondaryPressure = pickSecondaryPressure;
exports.pickPressureIndexFromSeed = pickPressureIndexFromSeed;
exports.pickPressureByIndex = pickPressureByIndex;
exports.assertCatalogHasAllSkills = assertCatalogHasAllSkills;
const coaching_1 = require("../../schemas/coaching");
const hash_1 = require("../simulationRealism/hash");
/**
 * Multiple pressure options per skill. Pick 1–2 per skill in the plan builder;
 * coherence may merge or drop redundant entries.
 */
exports.WEAKNESS_PRESSURE_CATALOG = {
    discovery_questions: [
        {
            id: 'disc_vague_start',
            label: 'Vague opening',
            customerLine: 'Start with a general need (“something for work”) and only add detail when the associate asks specific follow-ups.',
        },
        {
            id: 'disc_short_answers',
            label: 'Short answers',
            customerLine: 'Answer in brief phrases at first; open up only after the associate asks thoughtful questions.',
        },
        {
            id: 'disc_wait_for_questions',
            label: 'Needs only when asked',
            customerLine: 'Do not volunteer budget, timeline, or fit concerns until the associate asks for them.',
        },
    ],
    objection_handling: [
        {
            id: 'obj_price_fit',
            label: 'Price and fit doubts',
            customerLine: 'Raise polite concerns about price, value, or whether you really need the item—stay reasonable, not hostile.',
        },
        {
            id: 'obj_compare_elsewhere',
            label: 'Comparison shopping',
            customerLine: 'Mention you might check other stores or online unless the associate gives a clear reason to decide today.',
        },
        {
            id: 'obj_hesitate_commitment',
            label: 'Hesitate to commit',
            customerLine: 'Hold back from saying yes; ask for reassurance on return policy and wearability before moving forward.',
        },
        {
            id: 'obj_timing',
            label: 'Timing and urgency',
            customerLine: 'Signal you are not ready to buy today—timing, budget cycle, or needing to think it over unless the associate makes it easy to decide.',
        },
        {
            id: 'obj_competitor',
            label: 'Competitor or alternative',
            customerLine: 'Mention you are comparing to another brand or offer you already have in mind; stay fair, not hostile.',
        },
        {
            id: 'obj_switching_cost',
            label: 'Brand loyalty and switching cost',
            customerLine: 'Say you normally buy a different brand and worry about switching—fit, quality, and “I know what works for me” concerns.',
        },
        {
            id: 'obj_budget_cycle',
            label: 'Budget timing',
            customerLine: 'Say you are trying not to spend on clothes this month (or you have a tighter pay-cycle) unless the value is unusually clear.',
        },
        {
            id: 'obj_stakeholder_buyin',
            label: 'Need someone else’s input',
            customerLine: 'Say you want a second opinion (partner/friend) before you commit; resist “yes” until you feel confident explaining the choice.',
        },
        {
            id: 'obj_existing_vendor_contract',
            label: 'Already have a go-to option',
            customerLine: 'Mention you already have something similar at home or a go-to store policy; you need a real reason to change your usual routine.',
        },
        {
            id: 'obj_priority_conflict',
            label: 'Not urgent right now',
            customerLine: 'Acknowledge the need, but downplay urgency—other priorities come first unless the associate makes the next step very easy.',
        },
    ],
    product_knowledge: [
        {
            id: 'pk_care_fabric',
            label: 'Care and fabric',
            customerLine: 'Ask how it washes, what it is made of, and how it holds up over time.',
        },
        {
            id: 'pk_compare_options',
            label: 'Compare options',
            customerLine: 'Ask how this piece compares to similar items in the store or a different price tier.',
        },
        {
            id: 'pk_fit_sizing',
            label: 'Fit and sizing',
            customerLine: 'Ask about cut, stretch, and whether to size up or down for your build.',
        },
    ],
    closing: [
        {
            id: 'cl_noncommittal',
            label: 'Stay interested, not committed',
            customerLine: 'Stay warm but noncommittal; do not agree to buy until the associate earns a clear next step.',
        },
        {
            id: 'cl_need_time',
            label: 'Need time',
            customerLine: 'Signal you are still thinking it over and might come back later unless the offer feels compelling.',
        },
        {
            id: 'cl_micro_commit',
            label: 'Small steps only',
            customerLine: 'Prefer trying one item or a fitting first rather than a big purchase all at once.',
        },
    ],
    storytelling: [
        {
            id: 'st_wants_stories',
            label: 'Engage with examples',
            customerLine: 'Warm up when the associate uses styling ideas or examples; stay cooler if they only list features.',
        },
        {
            id: 'st_occasion',
            label: 'Occasion framing',
            customerLine: 'Share a light story about where you’ll wear it—only if the associate invites it with a good question.',
        },
        {
            id: 'st_visualize',
            label: 'Picture the outfit',
            customerLine: 'Respond better when the associate helps you picture a full look, not just a single item.',
        },
    ],
    empathy: [
        {
            id: 'em_mild_friction',
            label: 'Mild frustration',
            customerLine: 'Show mild hesitation or light frustration that a thoughtful associate can acknowledge.',
        },
        {
            id: 'em_uncertainty',
            label: 'Uncertainty',
            customerLine: 'Admit you are unsure what fits your style or budget until someone listens first.',
        },
        {
            id: 'em_time_pressure',
            label: 'Time pressure',
            customerLine: 'Mention you do not have long; see if the associate respects your pace.',
        },
    ],
};
function catalogPressureOptionsForSkill(skill) {
    return exports.WEAKNESS_PRESSURE_CATALOG[skill];
}
/** Stable pick: first option per skill (deterministic). Plan service can merge picks from coherence. */
function pickPrimaryPressure(skill) {
    const opts = exports.WEAKNESS_PRESSURE_CATALOG[skill];
    return opts[0];
}
function pickSecondaryPressure(skill) {
    const opts = exports.WEAKNESS_PRESSURE_CATALOG[skill];
    return opts[1] ?? null;
}
/**
 * Deterministic index selection for a pressure option, used to add variability without randomness.
 * Keep salts stable so plans are reproducible per conversation.
 */
function pickPressureIndexFromSeed(seed, skill, salt) {
    const opts = exports.WEAKNESS_PRESSURE_CATALOG[skill];
    return (0, hash_1.hashStringToIndex)(`${seed}:${skill}:${salt}`, opts.length);
}
/** Deterministic rotation for drills (0-based index modulo length). */
function pickPressureByIndex(skill, index) {
    const opts = exports.WEAKNESS_PRESSURE_CATALOG[skill];
    const i = ((index % opts.length) + opts.length) % opts.length;
    return opts[i];
}
function assertCatalogHasAllSkills() {
    for (const s of coaching_1.SALES_SKILLS) {
        const opts = exports.WEAKNESS_PRESSURE_CATALOG[s];
        if (!opts || opts.length < 2) {
            throw new Error(`weaknessPressureCatalog: expected at least 2 options for ${s}`);
        }
    }
}
//# sourceMappingURL=weaknessPressureCatalog.js.map