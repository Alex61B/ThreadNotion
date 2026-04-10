"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationRealismSchema = exports.DealStageSchema = exports.CustomerBehaviorSchema = exports.BuyerKnowledgeLevelSchema = exports.PersonaTraitsSchema = exports.OpennessToChangeSchema = exports.TimePressureSchema = exports.CommunicationStyleSchema = exports.RiskToleranceSchema = exports.DomainExperienceSchema = void 0;
const zod_1 = require("zod");
exports.DomainExperienceSchema = zod_1.z.enum(['low', 'medium', 'high']);
exports.RiskToleranceSchema = zod_1.z.enum(['low', 'medium', 'high']);
exports.CommunicationStyleSchema = zod_1.z.enum(['concise', 'analytical', 'story-driven', 'skeptical']);
exports.TimePressureSchema = zod_1.z.enum(['low', 'medium', 'high']);
exports.OpennessToChangeSchema = zod_1.z.enum(['low', 'medium', 'high']);
exports.PersonaTraitsSchema = zod_1.z.object({
    role: zod_1.z.string().min(1),
    domainExperience: exports.DomainExperienceSchema,
    riskTolerance: exports.RiskToleranceSchema,
    communicationStyle: exports.CommunicationStyleSchema,
    timePressure: exports.TimePressureSchema,
    opennessToChange: exports.OpennessToChangeSchema,
});
exports.BuyerKnowledgeLevelSchema = zod_1.z.enum([
    'uninformed',
    'partially_informed',
    'competitor_aware',
    'expert',
]);
exports.CustomerBehaviorSchema = zod_1.z.enum([
    'cooperative',
    'guarded',
    'skeptical',
    'impatient',
    'curious',
]);
exports.DealStageSchema = zod_1.z.enum([
    'discovery_call',
    'product_evaluation',
    'vendor_comparison',
    'final_decision',
]);
exports.SimulationRealismSchema = zod_1.z.object({
    personaTraits: exports.PersonaTraitsSchema,
    buyerKnowledgeLevel: exports.BuyerKnowledgeLevelSchema,
    customerBehavior: exports.CustomerBehaviorSchema,
    dealStage: exports.DealStageSchema,
});
//# sourceMappingURL=types.js.map