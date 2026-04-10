import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
    simulationSkillScore: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../db';
import { buildDrillScenarioPlan } from './drillScenarioPlanService';
import { buildAdaptiveScenarioPlan } from './adaptiveScenarioPlanService';
import { loadRecentGradedSessions } from './recentTrainingContextService';

const mockConvs = vi.mocked(prisma.conversation.findMany);
const mockScores = vi.mocked(prisma.simulationSkillScore.findMany);

describe('loadRecentGradedSessions', () => {
  beforeEach(() => {
    mockConvs.mockReset();
    mockScores.mockReset();
  });

  it('returns empty when no graded conversations', async () => {
    mockConvs.mockResolvedValue([]);
    const out = await loadRecentGradedSessions('u1');
    expect(out).toEqual([]);
    expect(mockScores).not.toHaveBeenCalled();
  });

  it('maps drill plan, adaptive weaknesses, and lowest skill from scores', async () => {
    const { stored } = buildDrillScenarioPlan({
      primarySkill: 'closing',
      persona: { name: 'A', tone: null, instructions: 'x' },
      product: null,
      variantSeed: 's',
    });
    mockConvs.mockResolvedValue([
      {
        id: 'conv1',
        createdAt: new Date('2025-01-02'),
        simulationMode: 'drill',
        drillPlan: stored,
        adaptiveScenarioPlan: null,
      },
    ] as any);

    const sixSkills = [
      'discovery_questions',
      'objection_handling',
      'product_knowledge',
      'closing',
      'storytelling',
      'empathy',
    ] as const;
    mockScores.mockResolvedValue(
      sixSkills.map((skill, i) => ({
        conversationId: 'conv1',
        skill,
        score: i === 2 ? 3 : 8,
      })) as any
    );

    const out = await loadRecentGradedSessions('u1', 8);
    expect(out).toHaveLength(1);
    expect(out[0]!.simulationMode).toBe('drill');
    expect(out[0]!.drillPrimarySkill).toBe('closing');
    expect(out[0]!.lowestSkillInSession).toBe('product_knowledge');
  });

  it('parses adaptiveScenarioPlan targetWeaknesses even when simulationRealism is present', async () => {
    const plan = buildAdaptiveScenarioPlan({
      targetWeaknesses: ['closing', 'objection_handling'],
      persona: { name: 'Sam', tone: null, instructions: 'x' },
      product: null,
      realismSeed: 'seed',
    });
    mockConvs.mockResolvedValue([
      {
        id: 'conv2',
        createdAt: new Date('2025-02-02'),
        simulationMode: 'adaptive',
        drillPlan: undefined,
        adaptiveScenarioPlan: plan,
      },
    ] as any);
    mockScores.mockResolvedValue([] as any);

    const out = await loadRecentGradedSessions('u1', 8);
    expect(out).toHaveLength(1);
    expect(out[0]!.simulationMode).toBe('adaptive');
    expect(out[0]!.adaptiveTargetWeaknesses).toEqual(['closing', 'objection_handling']);
  });
});
