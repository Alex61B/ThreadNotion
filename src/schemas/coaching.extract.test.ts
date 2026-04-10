import { describe, it, expect } from 'vitest';
import { extractCoachingFeedbackFromRaw } from './coaching';

describe('extractCoachingFeedbackFromRaw', () => {
  it('returns null when coaching is absent', () => {
    expect(extractCoachingFeedbackFromRaw(null)).toBeNull();
    expect(extractCoachingFeedbackFromRaw({ skills: {} })).toBeNull();
  });

  it('returns null when coaching shape is invalid', () => {
    expect(extractCoachingFeedbackFromRaw({ coaching: { strengths: [] } })).toBeNull();
  });
});
