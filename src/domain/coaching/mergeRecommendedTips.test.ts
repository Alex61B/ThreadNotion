import { describe, it, expect } from 'vitest';
import { mergeRecommendedTips } from './mergeRecommendedTips';

describe('mergeRecommendedTips', () => {
  it('dedupes identical tips', () => {
    const r = mergeRecommendedTips({
      llmTips: ['Ask more questions', 'Ask more questions'],
      weaknesses: ['closing'],
    });
    expect(r.filter((t) => t.includes('Ask more questions')).length).toBe(1);
  });

  it('adds template tips for weaknesses when LLM list is sparse', () => {
    const r = mergeRecommendedTips({
      llmTips: ['One tip only'],
      weaknesses: ['discovery_questions', 'closing'],
    });
    expect(r.length).toBeGreaterThan(1);
    expect(r.some((t) => t.toLowerCase().includes('discovery'))).toBe(true);
  });

  it('caps at max tips', () => {
    const r = mergeRecommendedTips({
      llmTips: Array.from({ length: 10 }, (_, i) => `Tip ${i}`),
      weaknesses: ['empathy'],
    });
    expect(r.length).toBeLessThanOrEqual(8);
  });
});
