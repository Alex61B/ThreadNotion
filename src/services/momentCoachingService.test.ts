import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runMomentCoaching, buildMomentCoachingEntries } from './momentCoachingService';
import { llm } from './llm';
import { MOMENT_PLAYBOOK_CATALOG } from '../domain/coaching/momentPlaybooks';

vi.mock('./llm', () => ({
  llm: {
    classifyConversationMoments: vi.fn(),
    evaluateMomentResponses: vi.fn(),
  },
}));

const mockClassify = vi.mocked(llm.classifyConversationMoments);
const mockEvaluate = vi.mocked(llm.evaluateMomentResponses);

const FOUR_MESSAGES = [
  { role: 'assistant', content: "Hi, can I help you find something today?" },
  { role: 'user', content: "I'm just browsing, thanks." },
  { role: 'assistant', content: "No problem — let me know if you need anything." },
  { role: 'user', content: "Actually, I love this jacket but it's quite expensive." },
];

const TRANSCRIPT = '[1] ASSISTANT: Hi, can I help?\n[2] USER: Just browsing.\n[3] ASSISTANT: No problem.\n[4] USER: I love this jacket but it\'s quite expensive.';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runMomentCoaching', () => {
  it('returns null for fewer than 4 messages without calling LLM', async () => {
    const result = await runMomentCoaching({
      messages: FOUR_MESSAGES.slice(0, 3),
      transcript: TRANSCRIPT,
      personaName: 'Sophie',
    });
    expect(result).toBeNull();
    expect(mockClassify).not.toHaveBeenCalled();
  });

  it('returns empty entries when classification finds no moments', async () => {
    mockClassify.mockResolvedValueOnce({ detectedMoments: [] });

    const result = await runMomentCoaching({
      messages: FOUR_MESSAGES,
      transcript: TRANSCRIPT,
      personaName: 'Sophie',
    });

    expect(result).toEqual({ entries: [], detectedMomentCount: 0 });
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('returns empty entries when classification output fails Zod validation', async () => {
    mockClassify.mockResolvedValueOnce({ detectedMoments: [{ momentType: 'invalid_type' }] });

    const result = await runMomentCoaching({
      messages: FOUR_MESSAGES,
      transcript: TRANSCRIPT,
      personaName: 'Sophie',
    });

    expect(result).toEqual({ entries: [], detectedMomentCount: 0 });
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('returns empty entries (with count) when rubric output fails Zod validation', async () => {
    mockClassify.mockResolvedValueOnce({
      detectedMoments: [
        {
          momentType: 'price_hesitation',
          customerTurnIndex: 4,
          associateTurnIndex: 5,
          customerExcerpt: "it's quite expensive",
          associateExcerpt: "I understand, it's popular",
          confidence: 'high',
        },
      ],
    });
    mockEvaluate.mockResolvedValueOnce({ momentEvaluations: [{ momentType: 'invalid' }] });

    const result = await runMomentCoaching({
      messages: FOUR_MESSAGES,
      transcript: TRANSCRIPT,
      personaName: 'Sophie',
    });

    expect(result).toEqual({ entries: [], detectedMomentCount: 1 });
  });

  it('happy path: returns a well-formed MomentCoachingResult for a detected moment', async () => {
    mockClassify.mockResolvedValueOnce({
      detectedMoments: [
        {
          momentType: 'price_hesitation',
          customerTurnIndex: 4,
          associateTurnIndex: 5,
          customerExcerpt: "it's quite expensive",
          associateExcerpt: "I understand, it's really popular",
          confidence: 'high',
        },
      ],
    });

    mockEvaluate.mockResolvedValueOnce({
      momentEvaluations: [
        {
          momentType: 'price_hesitation',
          overallHandling: 'partial',
          stepResults: [
            { stepNumber: 1, addressed: true, observation: 'Said "I understand" which acknowledges the concern.' },
            { stepNumber: 2, addressed: false, observation: 'Did not diagnose whether this was a budget or value concern.' },
            { stepNumber: 3, addressed: false, observation: 'No value reframe provided.' },
            { stepNumber: 4, addressed: false, observation: 'No next step offered.' },
          ],
          missedStepNumbers: [2, 3, 4],
          betterResponseExample: "I totally hear you — it is an investment. Is it more the price itself, or are you just not sure if it's the right piece for you? [Let customer respond, then reframe value and offer try-on.]",
          coachingSummary: "The associate acknowledged the concern but jumped straight to a generic popularity claim without diagnosing the real hesitation. Steps 2–4 were skipped.",
        },
      ],
    });

    const result = await runMomentCoaching({
      messages: FOUR_MESSAGES,
      transcript: TRANSCRIPT,
      personaName: 'Sophie',
    });

    expect(result).not.toBeNull();
    expect(result!.detectedMomentCount).toBe(1);
    expect(result!.entries).toHaveLength(1);

    const entry = result!.entries[0];
    expect(entry.momentType).toBe('price_hesitation');
    expect(entry.label).toBe('Price Hesitation');
    expect(entry.skillMappings).toContain('objection_handling');
    expect(entry.overallHandling).toBe('partial');
    expect(entry.missedStepNumbers).toEqual([2, 3, 4]);
    expect(entry.stepResults).toHaveLength(4); // price_hesitation has 4 steps
    expect(entry.stepResults[0].addressed).toBe(true);
    expect(entry.stepResults[0].description).toBeTruthy();
    expect(entry.betterResponseExample).toContain('investment');
    expect(entry.coachingSummary).toBeTruthy();
  });

  it('propagates errors thrown by the LLM (caller should catch)', async () => {
    mockClassify.mockRejectedValueOnce(new Error('OpenAI timeout'));

    await expect(
      runMomentCoaching({
        messages: FOUR_MESSAGES,
        transcript: TRANSCRIPT,
        personaName: 'Sophie',
      })
    ).rejects.toThrow('OpenAI timeout');
  });
});

describe('buildMomentCoachingEntries', () => {
  it('merges playbook step descriptions with LLM step results', () => {
    const pb = MOMENT_PLAYBOOK_CATALOG['price_hesitation'];

    const detected = [{
      momentType: 'price_hesitation' as const,
      customerTurnIndex: 2,
      associateTurnIndex: 3,
      customerExcerpt: "too expensive",
      associateExcerpt: "it's popular",
      confidence: 'high' as const,
    }];

    const evaluations = [{
      momentType: 'price_hesitation' as const,
      overallHandling: 'missed' as const,
      stepResults: pb.steps.map((s: { stepNumber: number }) => ({
        stepNumber: s.stepNumber,
        addressed: false,
        observation: 'Not addressed.',
      })),
      missedStepNumbers: pb.steps.map((s: { stepNumber: number }) => s.stepNumber),
      betterResponseExample: 'A better response.',
      coachingSummary: 'All steps missed.',
    }];

    const entries = buildMomentCoachingEntries(detected, [pb], evaluations);

    expect(entries).toHaveLength(1);
    expect(entries[0].stepResults).toHaveLength(pb.steps.length);
    entries[0].stepResults.forEach((sr, i) => {
      expect(sr.description).toBe(pb.steps[i].description);
      expect(sr.addressed).toBe(false);
    });
  });
});
