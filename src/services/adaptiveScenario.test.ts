import { describe, expect, it } from 'vitest';
import { buildAdaptiveCustomerGuidance } from './adaptiveScenario';

describe('buildAdaptiveCustomerGuidance', () => {
  it('returns empty string when no weaknesses', () => {
    expect(buildAdaptiveCustomerGuidance([])).toBe('');
  });

  it('includes natural pressure text for weaknesses', () => {
    const g = buildAdaptiveCustomerGuidance(['objection_handling', 'closing']);
    expect(g.length).toBeGreaterThan(20);
    expect(g.toLowerCase()).not.toContain('objection_handling');
    expect(g.toLowerCase()).not.toContain('training');
  });
});
