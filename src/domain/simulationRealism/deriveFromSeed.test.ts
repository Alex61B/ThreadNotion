import { describe, it, expect } from 'vitest';
import { deriveSimulationRealism } from './deriveFromSeed';

describe('deriveSimulationRealism', () => {
  it('is deterministic for a given seed', () => {
    const a = deriveSimulationRealism('seed-1', 'Alex');
    const b = deriveSimulationRealism('seed-1', 'Alex');
    expect(a).toEqual(b);
  });

  it('changes when seed changes', () => {
    const a = deriveSimulationRealism('seed-1', 'Alex');
    const b = deriveSimulationRealism('seed-2', 'Alex');
    expect(a).not.toEqual(b);
  });

  it('always returns valid enum values', () => {
    const r = deriveSimulationRealism('seed-1', 'Alex');
    expect(['low', 'medium', 'high']).toContain(r.personaTraits.domainExperience);
    expect(['low', 'medium', 'high']).toContain(r.personaTraits.riskTolerance);
    expect(['concise', 'analytical', 'story-driven', 'skeptical']).toContain(r.personaTraits.communicationStyle);
    expect(['low', 'medium', 'high']).toContain(r.personaTraits.timePressure);
    expect(['low', 'medium', 'high']).toContain(r.personaTraits.opennessToChange);
    expect(['uninformed', 'partially_informed', 'competitor_aware', 'expert']).toContain(r.buyerKnowledgeLevel);
    expect(['cooperative', 'guarded', 'skeptical', 'impatient', 'curious']).toContain(r.customerBehavior);
    expect(['discovery_call', 'product_evaluation', 'vendor_comparison', 'final_decision']).toContain(r.dealStage);
  });
});

