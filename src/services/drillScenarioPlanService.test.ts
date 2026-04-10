import { describe, it, expect } from 'vitest';
import { buildDrillScenarioPlan } from './drillScenarioPlanService';
import { buildAdaptiveScenarioPlan } from './adaptiveScenarioPlanService';

describe('buildDrillScenarioPlan', () => {
  it('is deterministic for same seed and skills', () => {
    const a = buildDrillScenarioPlan({
      primarySkill: 'objection_handling',
      secondarySkill: 'closing',
      persona: { name: 'Sam', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 'fixed-seed',
      realismSeed: 'realism-seed',
    });
    const b = buildDrillScenarioPlan({
      primarySkill: 'objection_handling',
      secondarySkill: 'closing',
      persona: { name: 'Sam', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 'fixed-seed',
      realismSeed: 'realism-seed',
    });
    expect(a.stored.variantKey).toBe(b.stored.variantKey);
    expect(a.promptPlan.pressureTactics).toEqual(b.promptPlan.pressureTactics);
    expect(a.promptPlan.simulationRealism).toEqual(b.promptPlan.simulationRealism);
  });

  it('uses a drill salt so drill realism differs from adaptive realism for same seed', () => {
    const adaptive = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing'],
      persona: { name: 'Sam', tone: null, instructions: 'x' },
      product: null,
      realismSeed: 'seed',
    });
    const drill = buildDrillScenarioPlan({
      primarySkill: 'closing',
      persona: { name: 'Sam', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 'v',
      realismSeed: 'seed',
    });
    expect(adaptive.simulationRealism).toBeDefined();
    expect(drill.promptPlan.simulationRealism).toBeDefined();
    expect(drill.promptPlan.simulationRealism).not.toEqual(adaptive.simulationRealism);
  });

  it('sets mode drill and embeds promptPlan', () => {
    const { stored } = buildDrillScenarioPlan({
      primarySkill: 'discovery_questions',
      persona: { name: 'Sam', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 's2',
      realismSeed: 'realism-seed',
    });
    expect(stored.mode).toBe('drill');
    expect(stored.promptPlan.targetWeaknesses.length).toBeGreaterThan(0);
    expect(stored.promptPlan.simulationRealism).toBeDefined();
  });
});
