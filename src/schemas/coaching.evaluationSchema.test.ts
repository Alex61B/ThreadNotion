import { describe, it, expect } from 'vitest';
import { SalesEvaluationLLMSchema } from './coaching';
import { validEvaluatorOutput } from '../test-helpers/evaluationFixtures';

describe('SalesEvaluationLLMSchema (Phase 3)', () => {
  it('accepts full fixture output', () => {
    const parsed = SalesEvaluationLLMSchema.safeParse(validEvaluatorOutput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.coaching.keyMoments.length).toBeGreaterThanOrEqual(2);
    }
  });
});
