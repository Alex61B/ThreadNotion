"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL_LABEL_SHORT = void 0;
exports.skillLabel = skillLabel;
/** Short labels for API/UI copy (matches frontend SKILL_LABELS). */
exports.SKILL_LABEL_SHORT = {
    discovery_questions: 'Discovery',
    objection_handling: 'Objections',
    product_knowledge: 'Product knowledge',
    closing: 'Closing',
    storytelling: 'Storytelling',
    empathy: 'Empathy',
};
function skillLabel(skill) {
    return exports.SKILL_LABEL_SHORT[skill];
}
//# sourceMappingURL=skillLabels.js.map