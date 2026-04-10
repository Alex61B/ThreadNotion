import { describe, it, expect } from 'vitest';
import { mergeWeaknessesForScenario } from './weaknessCoherence';

describe('weaknessCoherence', () => {
  it('caps at three skills', () => {
    const r = mergeWeaknessesForScenario([
      'discovery_questions',
      'empathy',
      'closing',
      'objection_handling',
      'product_knowledge',
    ]);
    expect(r.skills.length).toBeLessThanOrEqual(3);
  });

  it('merges discovery + empathy and drops empathy from skills', () => {
    const r = mergeWeaknessesForScenario(['discovery_questions', 'empathy', 'closing']);
    expect(r.skills).not.toContain('empathy');
    expect(r.skills).toContain('discovery_questions');
    expect(r.scenarioTheme).toBeDefined();
    expect(r.droppedSkills).toContain('empathy');
  });

  it('handles objection + closing with a theme', () => {
    const r = mergeWeaknessesForScenario(['objection_handling', 'closing']);
    expect(r.skills).toContain('objection_handling');
    expect(r.skills).toContain('closing');
    expect(r.scenarioTheme).toBeDefined();
  });

  it('handles product_knowledge + storytelling', () => {
    const r = mergeWeaknessesForScenario(['product_knowledge', 'storytelling']);
    expect(r.skills).toContain('product_knowledge');
    expect(r.scenarioTheme).toBeDefined();
  });

  it('returns empty list for empty input', () => {
    const r = mergeWeaknessesForScenario([]);
    expect(r.skills).toEqual([]);
    expect(r.droppedSkills).toEqual([]);
  });
});
