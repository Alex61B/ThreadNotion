import { describe, it, expect, vi } from 'vitest';
import { buildAdaptiveScenarioPlan } from '../../services/adaptiveScenarioPlanService';
import { parseStoredAdaptivePlan } from './parseStoredAdaptivePlan';

describe('parseStoredAdaptivePlan', () => {
  it('returns null for null or undefined', () => {
    expect(parseStoredAdaptivePlan(null, { where: 'test' })).toBeNull();
    expect(parseStoredAdaptivePlan(undefined, { where: 'test' })).toBeNull();
  });

  it('returns null for malformed JSON-shaped data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseStoredAdaptivePlan({ foo: 1 }, { where: 'test', conversationId: 'c1' })).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns null for valid shape but empty targetWeaknesses', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: [],
      persona: { name: 'A', tone: null, instructions: 'x' },
      product: null,
    });
    const stored = JSON.parse(JSON.stringify(plan));
    expect(parseStoredAdaptivePlan(stored, { where: 'test' })).toBeNull();
  });

  it('returns plan for valid stored object', () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing'],
      persona: { name: 'A', tone: null, instructions: 'x' },
      product: null,
    });
    const stored = JSON.parse(JSON.stringify(plan));
    const out = parseStoredAdaptivePlan(stored, { where: 'test' });
    expect(out?.targetWeaknesses).toContain('closing');
  });
});
