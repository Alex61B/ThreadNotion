import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const hoisted = vi.hoisted(() => ({
  sessionFindUnique: vi.fn(),
  teamFindUnique: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  teamMemberCount: vi.fn(),
  entitlementFindUnique: vi.fn(),
  tokenUsageFindUnique: vi.fn(),
  createCheckoutSession: vi.fn().mockResolvedValue({ url: 'https://checkout' }),
  createPortalSession: vi.fn().mockResolvedValue({ url: 'https://portal' }),
  billingAccountFindUnique: vi.fn(),
  cancelTeamSubscriptionsOnDelete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./db', () => ({
  prisma: {
    session: { findUnique: hoisted.sessionFindUnique },
    team: { findUnique: hoisted.teamFindUnique },
    teamMember: { findUnique: hoisted.teamMemberFindUnique, count: hoisted.teamMemberCount, findMany: vi.fn() },
    entitlement: { findUnique: hoisted.entitlementFindUnique },
    tokenUsageDaily: { findUnique: hoisted.tokenUsageFindUnique },
    billingAccount: { findUnique: hoisted.billingAccountFindUnique },
    subscription: { findUnique: vi.fn() },
    invoiceRecord: { findMany: vi.fn() },
  },
}));

vi.mock('./billing/teamBilling', () => ({
  createTeamCheckoutSession: hoisted.createCheckoutSession,
  createTeamPortalSession: hoisted.createPortalSession,
}));

vi.mock('./billing/cancellation', () => ({
  cancelUserSubscriptionsOnDelete: vi.fn().mockResolvedValue(undefined),
  cancelTeamSubscriptionsOnDelete: hoisted.cancelTeamSubscriptionsOnDelete,
}));

import { app } from './server';

describe('Phase 3 team billing endpoints', () => {
  beforeEach(() => {
    hoisted.sessionFindUnique.mockReset();
    hoisted.teamFindUnique.mockReset();
    hoisted.teamMemberFindUnique.mockReset();
    hoisted.teamMemberCount.mockReset();
    hoisted.entitlementFindUnique.mockReset();
    hoisted.tokenUsageFindUnique.mockReset();
    hoisted.createCheckoutSession.mockClear();
    hoisted.createPortalSession.mockClear();
  });

  it('blocks non-authenticated requests', async () => {
    const res = await request(app).post('/api/team/t1/billing/checkout-session').send({ seatBundle: 10 });
    expect(res.status).toBe(401);
  });

  it('blocks non-manager from starting team checkout', async () => {
    hoisted.sessionFindUnique.mockResolvedValue({
      sessionToken: 't',
      userId: 'u1',
      expires: new Date(Date.now() + 60_000),
    });
    hoisted.teamFindUnique.mockResolvedValue({ id: 't1', ownerId: 'owner' });
    hoisted.teamMemberFindUnique.mockResolvedValue({ teamId: 't1', userId: 'u1', role: 'rep' });

    const res = await request(app)
      .post('/api/team/t1/billing/checkout-session')
      .set('Cookie', 'next-auth.session-token=t')
      .send({ seatBundle: 10 });
    expect(res.status).toBe(403);
  });

  it('allows manager to start team checkout', async () => {
    hoisted.sessionFindUnique.mockResolvedValue({
      sessionToken: 't',
      userId: 'mgr',
      expires: new Date(Date.now() + 60_000),
    });
    hoisted.teamFindUnique.mockResolvedValue({ id: 't1', ownerId: 'owner' });
    hoisted.teamMemberFindUnique.mockResolvedValue({ teamId: 't1', userId: 'mgr', role: 'manager' });

    const res = await request(app)
      .post('/api/team/t1/billing/checkout-session')
      .set('Cookie', 'next-auth.session-token=t')
      .send({ seatBundle: 25 });
    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toBe('https://checkout');
  });

  it('returns team billing status to manager', async () => {
    hoisted.sessionFindUnique.mockResolvedValue({
      sessionToken: 't',
      userId: 'mgr',
      expires: new Date(Date.now() + 60_000),
    });
    hoisted.teamFindUnique.mockResolvedValue({ id: 't1', ownerId: 'owner' });
    hoisted.teamMemberFindUnique.mockResolvedValue({ teamId: 't1', userId: 'mgr', role: 'manager' });
    hoisted.entitlementFindUnique.mockResolvedValue({ planType: 'TEAM', maxSeats: 10, dailyTokenLimit: 100 } as any);
    hoisted.teamMemberCount.mockResolvedValue(3);
    hoisted.tokenUsageFindUnique.mockResolvedValue({ tokensUsed: BigInt(10) });

    const res = await request(app)
      .get('/api/team/t1/billing/status')
      .set('Cookie', 'next-auth.session-token=t');
    expect(res.status).toBe(200);
    expect(res.body.plan.planType).toBe('TEAM');
    expect(res.body.usage.activeMembers).toBe(3);
  });

  it('team webhook entitlement change is reflected in team billing status', async () => {
    // Minimal guarantee: status endpoint reflects whatever entitlement snapshot exists.
    hoisted.sessionFindUnique.mockResolvedValue({
      sessionToken: 't',
      userId: 'mgr',
      expires: new Date(Date.now() + 60_000),
    });
    hoisted.teamFindUnique.mockResolvedValue({ id: 't1', ownerId: 'owner' });
    hoisted.teamMemberFindUnique.mockResolvedValue({ teamId: 't1', userId: 'mgr', role: 'manager' });
    hoisted.teamMemberCount.mockResolvedValue(1);
    hoisted.tokenUsageFindUnique.mockResolvedValue({ tokensUsed: BigInt(0) });

    // First call: FREE
    hoisted.entitlementFindUnique.mockResolvedValueOnce({ planType: 'FREE', maxSeats: 0, dailyTokenLimit: 0 } as any);
    let res = await request(app)
      .get('/api/team/t1/billing/status')
      .set('Cookie', 'next-auth.session-token=t');
    expect(res.status).toBe(200);
    expect(res.body.plan.planType).toBe('FREE');

    // Next call: TEAM
    hoisted.entitlementFindUnique.mockResolvedValueOnce({ planType: 'TEAM', maxSeats: 10, dailyTokenLimit: 100 } as any);
    res = await request(app)
      .get('/api/team/t1/billing/status')
      .set('Cookie', 'next-auth.session-token=t');
    expect(res.status).toBe(200);
    expect(res.body.plan.planType).toBe('TEAM');
  });
});

