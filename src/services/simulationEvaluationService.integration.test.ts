import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  evaluateSalesSkills: vi.fn(),
  store: null as null | Awaited<ReturnType<typeof import('../test-helpers/mockPrismaEvaluation').createEvaluationPrismaMock>>,
  validEvaluatorOutput: null as null | (() => ReturnType<
    typeof import('../test-helpers/evaluationFixtures').validEvaluatorOutput
  >),
}));

vi.mock('../db', async () => {
  const { createEvaluationPrismaMock } = await import('../test-helpers/mockPrismaEvaluation');
  const { validEvaluatorOutput } = await import('../test-helpers/evaluationFixtures');
  const m = createEvaluationPrismaMock();
  hoisted.store = m;
  hoisted.validEvaluatorOutput = validEvaluatorOutput;
  return { prisma: m.prisma };
});

vi.mock('./llm', () => ({
  llm: {
    evaluateSalesSkills: hoisted.evaluateSalesSkills,
    chat: vi.fn(),
    judge: vi.fn(),
    generateScript: vi.fn(),
  },
}));

import { EvaluationError } from '../errors/evaluationErrors';
import { evaluateConversation } from './simulationEvaluationService';

describe('evaluateConversation (integration with mocked Prisma + LLM)', () => {
  beforeEach(() => {
    hoisted.store?.reset();
    hoisted.evaluateSalesSkills.mockReset();
    hoisted.evaluateSalesSkills.mockResolvedValue(hoisted.validEvaluatorOutput!());
  });

  function seedConv(opts: { id: string; userId: string | null }) {
    hoisted.store!.seedConversation({
      id: opts.id,
      userId: opts.userId,
      personaId: 'p1',
      persona: { name: 'Alex' },
      messages: [
        { role: 'user', content: 'Hi, can you help me?' },
        { role: 'assistant', content: 'Sure, what are you looking for?' },
      ],
    });
  }

  it('writes one SimulationEvaluationSummary and six SimulationSkillScore rows', async () => {
    seedConv({ id: 'conv-1', userId: 'user-1' });
    await evaluateConversation('conv-1');

    expect(hoisted.store!.getSummary().size).toBe(1);
    expect(hoisted.store!.getSummary().get('conv-1')).toBeDefined();
    const scores = hoisted.store!.getScores().get('conv-1') ?? [];
    expect(scores).toHaveLength(6);
  });

  it('updates UserWeaknessProfile rows when userId is present', async () => {
    seedConv({ id: 'conv-1', userId: 'user-1' });
    await evaluateConversation('conv-1');
    expect(hoisted.store!.getProfiles().size).toBe(6);
  });

  it('persists summary and skill scores but does not write profiles when userId is null', async () => {
    seedConv({ id: 'conv-2', userId: null });
    await evaluateConversation('conv-2');
    expect(hoisted.store!.getSummary().get('conv-2')).toBeDefined();
    expect((hoisted.store!.getScores().get('conv-2') ?? []).length).toBe(6);
    expect(hoisted.store!.getProfiles().size).toBe(0);
  });

  it('throws EvaluationError EVALUATOR_VALIDATION and does not persist on invalid schema-shaped output', async () => {
    seedConv({ id: 'conv-3', userId: 'user-1' });
    hoisted.evaluateSalesSkills.mockResolvedValue({ invalid: true });
    await expect(evaluateConversation('conv-3')).rejects.toMatchObject({
      code: 'EVALUATOR_VALIDATION',
    });
    expect(hoisted.store!.getSummary().size).toBe(0);
    expect(hoisted.store!.getScores().get('conv-3')).toBeFalsy();
  });

  it('throws EvaluationError EVALUATOR_PARSE when LLM layer signals parse failure', async () => {
    seedConv({ id: 'conv-4', userId: 'user-1' });
    hoisted.evaluateSalesSkills.mockRejectedValue(
      new EvaluationError('Evaluator returned malformed JSON', 'EVALUATOR_PARSE', new SyntaxError())
    );
    await expect(evaluateConversation('conv-4')).rejects.toMatchObject({
      code: 'EVALUATOR_PARSE',
    });
    expect(hoisted.store!.getSummary().size).toBe(0);
  });

  it('re-grade replaces skill rows and updates summary (upsert)', async () => {
    seedConv({ id: 'conv-5', userId: 'user-1' });
    await evaluateConversation('conv-5');
    const firstTips = hoisted.store!.getSummary().get('conv-5')?.recommendedTips;
    hoisted.evaluateSalesSkills.mockResolvedValue({
      ...hoisted.validEvaluatorOutput!(),
      recommendedTips: ['Updated tip'],
    });
    await evaluateConversation('conv-5');
    const tipsAfter = hoisted.store!.getSummary().get('conv-5')?.recommendedTips as string[];
    expect(tipsAfter[0]).toBe('Updated tip');
    expect(tipsAfter.length).toBeGreaterThan(1);
    expect((hoisted.store!.getScores().get('conv-5') ?? []).length).toBe(6);
    expect(firstTips).toBeDefined();
  });

  it('second simulation updates rolling profile scores with one row per user per skill', async () => {
    seedConv({ id: 'conv-a', userId: 'user-1' });
    await evaluateConversation('conv-a');
    const afterFirst = hoisted.store!.getProfiles().get('user-1::closing')?.currentScore;
    expect(afterFirst).toBe(5);

    const improved = hoisted.validEvaluatorOutput!();
    improved.skills.closing = { score: 8, reasoning: 'Stronger close.' };
    hoisted.store!.seedConversation({
      id: 'conv-b',
      userId: 'user-1',
      personaId: 'p1',
      persona: { name: 'Alex' },
      messages: [
        { role: 'user', content: 'Another turn' },
        { role: 'assistant', content: 'Ok' },
      ],
    });
    hoisted.evaluateSalesSkills.mockResolvedValue(improved);
    await evaluateConversation('conv-b');

    expect(hoisted.store!.getProfiles().size).toBe(6);
    const afterSecond = hoisted.store!.getProfiles().get('user-1::closing')?.currentScore;
    expect(afterSecond).toBeCloseTo(5 * 0.7 + 8 * 0.3, 5);
  });
});
