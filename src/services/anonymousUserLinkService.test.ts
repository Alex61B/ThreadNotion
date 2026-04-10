import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkAnonymousToAuth } from './anonymousUserLinkService';

const hoisted = vi.hoisted(() => {
  const tx = {
    anonymousIdentityClaim: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    conversation: { updateMany: vi.fn() },
    team: { updateMany: vi.fn() },
    trainingAssignment: { updateMany: vi.fn() },
    simulationSkillScore: { updateMany: vi.fn() },
    simulationEvaluationSummary: { updateMany: vi.fn() },
    teamMember: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userWeaknessProfile: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userTrainingFocus: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  };
  return { tx };
});

const prismaMock = vi.hoisted(() => ({
  anonymousIdentityClaim: { findUnique: vi.fn() },
  $transaction: vi.fn((fn: (tx: typeof hoisted.tx) => unknown) => fn(hoisted.tx)),
}));

describe('linkAnonymousToAuth', () => {
  beforeEach(() => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockReset();
    vi.mocked(prismaMock.$transaction).mockImplementation(async (fn) =>
      fn(hoisted.tx)
    );
    for (const k of Object.keys(hoisted.tx) as (keyof typeof hoisted.tx)[]) {
      const obj = hoisted.tx[k] as Record<string, ReturnType<typeof vi.fn>>;
      for (const fn of Object.values(obj)) {
        if (typeof fn?.mockReset === 'function') fn.mockReset();
      }
    }
  });

  it('returns noop_same_id when ids match', async () => {
    const r = await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: ' u1 ',
      authUserId: 'u1',
    });
    expect(r).toEqual({ ok: true, status: 'noop_same_id' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns already_linked when claim exists for same auth user', async () => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockResolvedValue({
      anonymousUserId: 'anon',
      authUserId: 'auth',
      createdAt: new Date(),
    });
    const r = await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: 'anon',
      authUserId: 'auth',
    });
    expect(r).toEqual({ ok: true, status: 'already_linked' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns claimed_by_other when claim exists for different auth user', async () => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockResolvedValue({
      anonymousUserId: 'anon',
      authUserId: 'other',
      createdAt: new Date(),
    });
    const r = await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: 'anon',
      authUserId: 'auth',
    });
    expect(r).toEqual({ ok: false, status: 'claimed_by_other' });
  });

  it('runs migration and creates claim when clean', async () => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockResolvedValue(null);
    hoisted.tx.anonymousIdentityClaim.findUnique.mockResolvedValue(null);
    hoisted.tx.teamMember.findMany.mockResolvedValue([]);
    hoisted.tx.userWeaknessProfile.findMany.mockResolvedValue([]);
    hoisted.tx.userTrainingFocus.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const r = await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: 'anon',
      authUserId: 'auth',
    });
    expect(r).toEqual({ ok: true, status: 'linked' });
    expect(hoisted.tx.conversation.updateMany).toHaveBeenCalledWith({
      where: { userId: 'anon' },
      data: { userId: 'auth' },
    });
    expect(hoisted.tx.anonymousIdentityClaim.create).toHaveBeenCalledWith({
      data: { anonymousUserId: 'anon', authUserId: 'auth' },
    });
  });

  it('is idempotent inside transaction when claim appears (same auth)', async () => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockResolvedValue(null);
    hoisted.tx.anonymousIdentityClaim.findUnique.mockResolvedValue({
      anonymousUserId: 'anon',
      authUserId: 'auth',
      createdAt: new Date(),
    });

    const r = await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: 'anon',
      authUserId: 'auth',
    });
    expect(r).toEqual({ ok: true, status: 'already_linked' });
    expect(hoisted.tx.anonymousIdentityClaim.create).not.toHaveBeenCalled();
  });

  it('merges UserTrainingFocus when both rows exist', async () => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockResolvedValue(null);
    hoisted.tx.anonymousIdentityClaim.findUnique.mockResolvedValue(null);
    hoisted.tx.teamMember.findMany.mockResolvedValue([]);
    hoisted.tx.userWeaknessProfile.findMany.mockResolvedValue([]);
    hoisted.tx.userTrainingFocus.findUnique
      .mockResolvedValueOnce({
        userId: 'anon',
        focusSkills: ['a'],
        sessionsRemaining: 3,
        source: 'user',
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        userId: 'auth',
        focusSkills: ['b'],
        sessionsRemaining: 5,
        source: 'user',
        updatedAt: new Date(),
      });

    await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: 'anon',
      authUserId: 'auth',
    });

    expect(hoisted.tx.userTrainingFocus.update).toHaveBeenCalledWith({
      where: { userId: 'auth' },
      data: expect.objectContaining({
        sessionsRemaining: 3,
        focusSkills: expect.any(Array),
      }),
    });
    expect(hoisted.tx.userTrainingFocus.delete).toHaveBeenCalledWith({
      where: { userId: 'anon' },
    });
  });

  it('merges weakness profile duplicates by keeping higher score row', async () => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockResolvedValue(null);
    hoisted.tx.anonymousIdentityClaim.findUnique.mockResolvedValue(null);
    hoisted.tx.teamMember.findMany.mockResolvedValue([]);

    hoisted.tx.userWeaknessProfile.findMany.mockResolvedValue([
      {
        id: 'w-anon',
        userId: 'anon',
        skill: 'closing',
        currentScore: 3,
        trendDirection: 'declining',
        lastSimulationId: 's1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    hoisted.tx.userWeaknessProfile.findUnique.mockResolvedValue({
      id: 'w-auth',
      userId: 'auth',
      skill: 'closing',
      currentScore: 6,
      trendDirection: 'stable',
      lastSimulationId: 's0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    hoisted.tx.userTrainingFocus.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: 'anon',
      authUserId: 'auth',
    });

    // Should keep existing auth row (higher score), delete anon duplicate.
    expect(hoisted.tx.userWeaknessProfile.update).toHaveBeenCalledWith({
      where: { id: 'w-auth' },
      data: expect.objectContaining({ currentScore: 6 }),
    });
    expect(hoisted.tx.userWeaknessProfile.delete).toHaveBeenCalledWith({ where: { id: 'w-anon' } });
  });

  it('deletes anon TeamMember row when auth user already on team', async () => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockResolvedValue(null);
    hoisted.tx.anonymousIdentityClaim.findUnique.mockResolvedValue(null);

    hoisted.tx.teamMember.findMany.mockResolvedValue([
      { id: 'tm1', teamId: 't1', userId: 'anon', role: 'rep', displayName: null, joinedAt: new Date() },
    ]);
    hoisted.tx.teamMember.findUnique.mockResolvedValue({
      id: 'tm-auth',
      teamId: 't1',
      userId: 'auth',
      role: 'rep',
      displayName: null,
      joinedAt: new Date(),
    });

    hoisted.tx.userWeaknessProfile.findMany.mockResolvedValue([]);
    hoisted.tx.userTrainingFocus.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: 'anon',
      authUserId: 'auth',
    });

    expect(hoisted.tx.teamMember.delete).toHaveBeenCalledWith({ where: { id: 'tm1' } });
    expect(hoisted.tx.teamMember.update).not.toHaveBeenCalled();
  });

  it('updates TrainingAssignment assignedBy and targetUserId for anon', async () => {
    vi.mocked(prismaMock.anonymousIdentityClaim.findUnique).mockResolvedValue(null);
    hoisted.tx.anonymousIdentityClaim.findUnique.mockResolvedValue(null);
    hoisted.tx.teamMember.findMany.mockResolvedValue([]);
    hoisted.tx.userWeaknessProfile.findMany.mockResolvedValue([]);
    hoisted.tx.userTrainingFocus.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await linkAnonymousToAuth(prismaMock as never, {
      anonymousUserId: 'anon',
      authUserId: 'auth',
    });

    expect(hoisted.tx.trainingAssignment.updateMany).toHaveBeenCalledWith({
      where: { assignedBy: 'anon' },
      data: { assignedBy: 'auth' },
    });
    expect(hoisted.tx.trainingAssignment.updateMany).toHaveBeenCalledWith({
      where: { targetUserId: 'anon' },
      data: { targetUserId: 'auth' },
    });
  });
});
