import { describe, it, expect } from 'vitest';
import { SalesEvaluationLLMSchema, normalizeRawEvaluatorOutput } from './coaching';
import { validEvaluatorOutput } from '../test-helpers/evaluationFixtures';

describe('SalesEvaluationLLMSchema (Phase 3)', () => {
  it('accepts full fixture output', () => {
    const parsed = SalesEvaluationLLMSchema.safeParse(validEvaluatorOutput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.coaching.keyMoments.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('recovers when coaching.strengths has an aliased and an unknown skill', () => {
    const output = validEvaluatorOutput();
    (output.coaching.strengths[0] as any).skill = 'rapport_building'; // → empathy
    (output.coaching.strengths as any[]).push({ skill: 'charisma', explanation: 'Very charming.' }); // dropped

    const parsed = SalesEvaluationLLMSchema.safeParse(normalizeRawEvaluatorOutput(output));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const skills = parsed.data.coaching.strengths.map((s) => s.skill);
      expect(skills).toContain('empathy');
      expect(skills).not.toContain('charisma');
    }
  });

  it('normalizes improvementAreas with multiple aliases', () => {
    const output = validEvaluatorOutput();
    output.coaching.improvementAreas = [
      { skill: 'active_listening' as any, explanation: 'Needs to listen more.' },
      { skill: 'upselling' as any, explanation: 'Push toward closing.' },
      { skill: 'charisma' as any, explanation: 'Dropped.' },
    ];

    const parsed = SalesEvaluationLLMSchema.safeParse(normalizeRawEvaluatorOutput(output));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const skills = parsed.data.coaching.improvementAreas.map((s) => s.skill);
      expect(skills).toContain('empathy');
      expect(skills).toContain('closing');
      expect(skills).not.toContain('charisma');
    }
  });

  it('fails validation with clear Zod errors when all keyMoments have unrecognized skills', () => {
    const output = validEvaluatorOutput();
    output.coaching.keyMoments = [
      { skill: 'charisma' as any, whyItMatters: 'Charming.', suggestedApproach: 'Be charming.' },
      { skill: 'enthusiasm' as any, whyItMatters: 'Exciting.', suggestedApproach: 'Show excitement.' },
    ];

    const parsed = SalesEvaluationLLMSchema.safeParse(normalizeRawEvaluatorOutput(output));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((e) => e.path.join('.'));
      expect(paths.some((p) => p.includes('keyMoments'))).toBe(true);
    }
  });

  it('normalizeRawEvaluatorOutput is a no-op for already-valid input', () => {
    const output = validEvaluatorOutput();
    const parsedDirect = SalesEvaluationLLMSchema.safeParse(output);
    const parsedNormalized = SalesEvaluationLLMSchema.safeParse(normalizeRawEvaluatorOutput(output));
    expect(parsedDirect.success).toBe(true);
    expect(parsedNormalized.success).toBe(true);
    if (parsedDirect.success && parsedNormalized.success) {
      expect(parsedNormalized.data).toEqual(parsedDirect.data);
    }
  });
});
