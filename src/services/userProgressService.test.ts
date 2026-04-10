import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  prisma: {
    simulationEvaluationSummary: {
      findMany: vi.fn(),
    },
    simulationSkillScore: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('./weaknessProfileService', () => ({
  listWeaknessProfilesForUser: vi.fn(),
}));

import { buildProgressSnapshot } from './userProgressService';
import { prisma } from '../db';
import { listWeaknessProfilesForUser } from './weaknessProfileService';
import type { SalesSkill } from '../schemas/coaching';
import { SALES_SKILLS } from '../schemas/coaching';

const mockSummaries = vi.mocked(prisma.simulationEvaluationSummary.findMany);
const mockSkillScores = vi.mocked(prisma.simulationSkillScore.findMany);
const mockListProfiles = vi.mocked(listWeaknessProfilesForUser);

function row(conv: string, skill: SalesSkill, score: number) {
  return { conversationId: conv, skill, score };
}

describe('buildProgressSnapshot', () => {
  beforeEach(() => {
    mockListProfiles.mockResolvedValue([]);
    mockSummaries.mockResolvedValue([]);
    mockSkillScores.mockResolvedValue([]);
  });

  it('sets latestDelta when two graded simulations exist', async () => {
    mockSummaries.mockResolvedValue([{ conversationId: 'c2' }, { conversationId: 'c1' }] as any);

    const rows: ReturnType<typeof row>[] = [];
    for (const s of SALES_SKILLS) {
      rows.push(row('c2', s, 7));
      rows.push(row('c1', s, 6));
    }
    mockSkillScores.mockResolvedValue(rows as any);

    const snap = await buildProgressSnapshot('user-1');

    const closing = snap.skills.find((x) => x.skill === 'closing');
    expect(closing?.latestSimulationScore).toBe(7);
    expect(closing?.previousSimulationScore).toBe(6);
    expect(closing?.latestDelta).toBe(1);
    expect(snap.overallProgressSummary).toMatch(/compared to your previous graded run/i);
  });

  it('omits deltas when only one graded simulation exists', async () => {
    mockSummaries.mockResolvedValue([{ conversationId: 'c1' }] as any);
    const rows = SALES_SKILLS.map((s) => row('c1', s, 8));
    mockSkillScores.mockResolvedValue(rows as any);

    const snap = await buildProgressSnapshot('user-1');
    expect(snap.skills.every((s) => s.latestDelta === undefined)).toBe(true);
    expect(snap.skills[0]?.latestSimulationScore).toBe(8);
  });
});
