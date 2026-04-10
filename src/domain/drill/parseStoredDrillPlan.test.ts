import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseStoredDrillPlan } from './parseStoredDrillPlan';
import { buildDrillScenarioPlan } from '../../services/drillScenarioPlanService';

describe('parseStoredDrillPlan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null and warns on malformed JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = parseStoredDrillPlan({ notValid: true }, { where: 'test', conversationId: 'c1' });
    expect(r).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('parses valid stored drill plan', () => {
    const { stored } = buildDrillScenarioPlan({
      primarySkill: 'closing',
      persona: { name: 'A', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 's',
    });
    const r = parseStoredDrillPlan(stored, { where: 'test', conversationId: 'c2' });
    expect(r?.mode).toBe('drill');
    expect(r?.primarySkill).toBe('closing');
  });
});
