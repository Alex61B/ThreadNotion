import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  prisma: {
    teamMember: { findMany: vi.fn() },
    trainingAssignment: { findMany: vi.fn() },
  },
}));

import { prisma } from '../db';
import { listActiveAssignmentsForUser } from './trainingAssignmentService';

const mockMemberFindMany = vi.mocked(prisma.teamMember.findMany);
const mockAssignmentFindMany = vi.mocked(prisma.trainingAssignment.findMany);

describe('listActiveAssignmentsForUser', () => {
  beforeEach(() => {
    mockMemberFindMany.mockReset();
    mockAssignmentFindMany.mockReset();
  });

  it('returns empty array when user has no team memberships', async () => {
    mockMemberFindMany.mockResolvedValue([]);
    const out = await listActiveAssignmentsForUser('u1');
    expect(out).toEqual([]);
    expect(mockAssignmentFindMany).not.toHaveBeenCalled();
  });

  it('queries assignments with active true, teamId in memberships, and targeted or team-wide OR', async () => {
    mockMemberFindMany.mockResolvedValue([{ teamId: 't1' }, { teamId: 't2' }] as any);
    mockAssignmentFindMany.mockResolvedValue([]);

    await listActiveAssignmentsForUser('repA');

    expect(mockAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          teamId: { in: ['t1', 't2'] },
          OR: [{ targetUserId: 'repA' }, { targetUserId: null }],
        },
        orderBy: { createdAt: 'desc' },
        include: { team: true },
      })
    );
  });

  it('returns rows from prisma (inactive assignments excluded at query level)', async () => {
    mockMemberFindMany.mockResolvedValue([{ teamId: 't1' }] as any);
    const row = {
      id: 'a1',
      teamId: 't1',
      targetUserId: null,
      active: true,
      skill: 'closing',
      assignmentType: 'drill',
      createdAt: new Date(),
      team: { name: 'T' },
    };
    mockAssignmentFindMany.mockResolvedValue([row] as any);

    const out = await listActiveAssignmentsForUser('rep1');
    expect(out).toEqual([row]);
  });
});
