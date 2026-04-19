import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: { subs: any[]; entUpserts: any[]; subUpdates: any[] } = {
  subs: [],
  entUpserts: [],
  subUpdates: [],
};

vi.mock('../db', () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(async () => state.subs),
      updateMany: vi.fn(async (args: any) => {
        state.subUpdates.push(args);
        return { count: 1 };
      }),
    },
    entitlement: {
      upsert: vi.fn(async (args: any) => {
        state.entUpserts.push(args);
        return {};
      }),
    },
  },
}));

import { sweepExpiredGracePeriods } from './graceSweeper';

describe('grace sweeper (TEAM)', () => {
  beforeEach(() => {
    state.subs = [];
    state.entUpserts = [];
    state.subUpdates = [];
  });

  it('downgrades TEAM entitlement after grace expiry', async () => {
    state.subs = [
      {
        billingAccountId: 'ba1',
        status: 'PAST_DUE',
        gracePeriodEndsAt: new Date('2026-01-01T00:00:00.000Z'),
        billingAccount: { teamId: 't1', userId: null },
      },
    ];

    const n = await sweepExpiredGracePeriods(new Date('2026-01-02T00:00:00.000Z'));
    expect(n).toBe(1);
    expect(state.subUpdates[0]?.data?.status).toBe('SUSPENDED');
    expect(state.entUpserts.length).toBe(1);
    expect(state.entUpserts[0]?.create?.subjectType).toBe('TEAM');
    expect(state.entUpserts[0]?.update?.planType).toBe('FREE');
  });
});

