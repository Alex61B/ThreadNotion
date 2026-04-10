import { describe, it, expect } from 'vitest';
import { buildAdaptiveScenarioPlan } from '../services/adaptiveScenarioPlanService';
import { AdaptiveScenarioPlanSchema, safeParseAdaptiveScenarioPlan } from './adaptiveScenarioPlan';

describe('AdaptiveScenarioPlan persistence boundary', () => {
  it('round-trips through JSON like DB storage', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing', 'objection_handling'],
      persona: { name: 'Sam', tone: 'warm', instructions: 'Careful buyer.' },
      product: { title: 'Coat', brand: 'X', price: 99, description: 'Wool' },
      realismSeed: 'seed',
    });
    const asStored = JSON.parse(JSON.stringify(plan)) as unknown;
    const parsed = safeParseAdaptiveScenarioPlan(asStored);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(AdaptiveScenarioPlanSchema.safeParse(parsed.data).success).toBe(true);
    }
  });

  it('accepts legacy stored JSON without simulationRealism', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing', 'objection_handling'],
      persona: { name: 'Sam', tone: 'warm', instructions: 'Careful buyer.' },
      product: { title: 'Coat', brand: 'X', price: 99, description: 'Wool' },
      realismSeed: 'seed',
    });
    const asStored = JSON.parse(JSON.stringify(plan)) as any;
    delete asStored.simulationRealism;
    const parsed = safeParseAdaptiveScenarioPlan(asStored);
    expect(parsed.success).toBe(true);
  });

  it('rejects malformed stored JSON', () => {
    const parsed = safeParseAdaptiveScenarioPlan({ foo: 1 });
    expect(parsed.success).toBe(false);
  });
});
