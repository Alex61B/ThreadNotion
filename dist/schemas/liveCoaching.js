"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveCoachingMetaSchema = exports.LiveCoachingSuggestionSchema = exports.LiveCoachingConfidenceSchema = void 0;
exports.parseLiveCoachingMeta = parseLiveCoachingMeta;
const zod_1 = require("zod");
const coaching_1 = require("./coaching");
exports.LiveCoachingConfidenceSchema = zod_1.z.enum(['low', 'medium', 'high']);
exports.LiveCoachingSuggestionSchema = zod_1.z.object({
    kind: coaching_1.SalesSkillSchema,
    message: zod_1.z.string().min(1),
    rationale: zod_1.z.string().optional(),
    confidence: exports.LiveCoachingConfidenceSchema,
    triggerSource: zod_1.z.string().min(1),
});
/** Persisted on Conversation.liveCoachingMeta for cooldown and dedupe. */
exports.LiveCoachingMetaSchema = zod_1.z.object({
    lastSuggestionUserTurnIndex: zod_1.z.number().int().min(0).nullable().optional(),
    suggestionsShown: zod_1.z.number().int().min(0).optional(),
    /** Most recent suggestion kinds (newest first), max 3. */
    recentKinds: zod_1.z.array(coaching_1.SalesSkillSchema).optional(),
});
function parseLiveCoachingMeta(raw) {
    const p = exports.LiveCoachingMetaSchema.safeParse(raw);
    if (p.success)
        return p.data;
    return {};
}
//# sourceMappingURL=liveCoaching.js.map