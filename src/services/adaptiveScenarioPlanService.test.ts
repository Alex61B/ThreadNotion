import { describe, it, expect } from 'vitest';
import { AdaptiveScenarioPlanSchema } from '../schemas/adaptiveScenarioPlan';
import { buildAdaptiveScenarioPlan } from './adaptiveScenarioPlanService';

describe('buildAdaptiveScenarioPlan', () => {
  const persona = {
    name: 'Jordan',
    tone: 'friendly',
    instructions: 'Budget-conscious shopper.',
  };

  it('produces a valid plan shape when weaknesses exist', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing', 'discovery_questions'],
      persona,
      product: { title: 'Blazer', brand: 'Acme', price: 120, description: 'Wool' },
      realismSeed: 'seed',
    });
    const parsed = AdaptiveScenarioPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
    expect(plan.scenarioRationale.length).toBeGreaterThan(10);
    expect(plan.pressureTactics.length).toBeGreaterThan(0);
    expect(plan.pressureTactics.length).toBeLessThanOrEqual(4);
    expect(plan.simulationRealism).toBeDefined();
  });

  it('has non-empty rationale when weaknesses exist', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['empathy'],
      persona,
      product: null,
    });
    expect(plan.scenarioRationale).toMatch(/Selected pressures/);
  });

  it('allows empty target list for new users (no profile)', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: [],
      persona,
      product: null,
    });
    expect(plan.targetWeaknesses).toEqual([]);
    expect(plan.scenarioRationale).toMatch(/No profile/);
  });
});
