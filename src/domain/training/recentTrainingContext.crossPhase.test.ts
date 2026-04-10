import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db', () => ({
  prisma: {
    conversation: { findMany: vi.fn() },
    simulationSkillScore: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../db';
import { buildAdaptiveScenarioPlan } from '../../services/adaptiveScenarioPlanService';
import { loadRecentGradedSessions } from '../../services/recentTrainingContextService';

const mockConvs = vi.mocked(prisma.conversation.findMany);
const mockScores = vi.mocked(prisma.simulationSkillScore.findMany);

describe('cross-phase: recent training context ignores realism safely', () => {
  beforeEach(() => {
    mockConvs.mockReset();
    mockScores.mockReset();
  });

  it('loads adaptiveTargetWeaknesses from plan even with simulationRealism', async () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing'],
      persona: { name: 'Sam', tone: null, instructions: 'x' },
      product: null,
      realismSeed: 'seed',
    });
    mockConvs.mockResolvedValue([
      {
        id: 'c1',
        createdAt: new Date(),
        simulationMode: 'adaptive',
        drillPlan: undefined,
        adaptiveScenarioPlan: plan,
      },
    ] as any);
    mockScores.mockResolvedValue([] as any);

    const out = await loadRecentGradedSessions('u1', 8);
    expect(out[0]!.adaptiveTargetWeaknesses).toEqual(['closing']);
  });
});

