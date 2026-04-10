import type { SimulationRealism } from './types';
import {
  type BuyerKnowledgeLevel,
  type CommunicationStyle,
  type CustomerBehavior,
  type DealStage,
  type DomainExperience,
  type OpennessToChange,
  type RiskTolerance,
} from './types';
import { hashStringToIndex } from './hash';

const DOMAIN_EXPERIENCE: DomainExperience[] = ['low', 'medium', 'high'];
const RISK_TOLERANCE: RiskTolerance[] = ['low', 'medium', 'high'];
const COMM_STYLE: CommunicationStyle[] = ['concise', 'analytical', 'story-driven', 'skeptical'];
const TIME_PRESSURE: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
const OPENNESS: OpennessToChange[] = ['low', 'medium', 'high'];
const KNOWLEDGE: BuyerKnowledgeLevel[] = [
  'uninformed',
  'partially_informed',
  'competitor_aware',
  'expert',
];
const BEHAVIOR: CustomerBehavior[] = ['cooperative', 'guarded', 'skeptical', 'impatient', 'curious'];
const STAGE: DealStage[] = ['discovery_call', 'product_evaluation', 'vendor_comparison', 'final_decision'];

function pick<T>(seed: string, salt: string, arr: T[]): T {
  const idx = hashStringToIndex(`${seed}:${salt}`, arr.length);
  return arr[idx]!;
}

function deriveRole(seed: string, personaName?: string): string {
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
export function deriveSimulationRealism(seed: string, personaName?: string): SimulationRealism {
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
  const adjustedRiskTolerance: RiskTolerance =
    timePressure === 'high' && riskTolerance === 'low'
      ? pick(seed, 'riskTolerance_adjusted', ['low', 'medium'] as RiskTolerance[])
      : riskTolerance;

  const adjustedOpenness: OpennessToChange =
    customerBehavior === 'skeptical' && opennessToChange === 'high'
      ? pick(seed, 'openness_adjusted', ['medium', 'high'] as OpennessToChange[])
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

