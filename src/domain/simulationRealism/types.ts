import { z } from 'zod';

export const DomainExperienceSchema = z.enum(['low', 'medium', 'high']);
export type DomainExperience = z.infer<typeof DomainExperienceSchema>;

export const RiskToleranceSchema = z.enum(['low', 'medium', 'high']);
export type RiskTolerance = z.infer<typeof RiskToleranceSchema>;

export const CommunicationStyleSchema = z.enum(['concise', 'analytical', 'story-driven', 'skeptical']);
export type CommunicationStyle = z.infer<typeof CommunicationStyleSchema>;

export const TimePressureSchema = z.enum(['low', 'medium', 'high']);
export type TimePressure = z.infer<typeof TimePressureSchema>;

export const OpennessToChangeSchema = z.enum(['low', 'medium', 'high']);
export type OpennessToChange = z.infer<typeof OpennessToChangeSchema>;

export const PersonaTraitsSchema = z.object({
  role: z.string().min(1),
  domainExperience: DomainExperienceSchema,
  riskTolerance: RiskToleranceSchema,
  communicationStyle: CommunicationStyleSchema,
  timePressure: TimePressureSchema,
  opennessToChange: OpennessToChangeSchema,
});
export type PersonaTraits = z.infer<typeof PersonaTraitsSchema>;

export const BuyerKnowledgeLevelSchema = z.enum([
  'uninformed',
  'partially_informed',
  'competitor_aware',
  'expert',
]);
export type BuyerKnowledgeLevel = z.infer<typeof BuyerKnowledgeLevelSchema>;

export const CustomerBehaviorSchema = z.enum([
  'cooperative',
  'guarded',
  'skeptical',
  'impatient',
  'curious',
]);
export type CustomerBehavior = z.infer<typeof CustomerBehaviorSchema>;

export const DealStageSchema = z.enum([
  'discovery_call',
  'product_evaluation',
  'vendor_comparison',
  'final_decision',
]);
export type DealStage = z.infer<typeof DealStageSchema>;

export const SimulationRealismSchema = z.object({
  personaTraits: PersonaTraitsSchema,
  buyerKnowledgeLevel: BuyerKnowledgeLevelSchema,
  customerBehavior: CustomerBehaviorSchema,
  dealStage: DealStageSchema,
});
export type SimulationRealism = z.infer<typeof SimulationRealismSchema>;

