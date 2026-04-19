import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const hoisted = vi.hoisted(() => ({
  entitlementFindUnique: vi.fn(),
  tokenUsageFindUnique: vi.fn(),
  conversationCount: vi.fn(),
  sessionFindUnique: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    entitlement: { findUnique: hoisted.entitlementFindUnique },
    tokenUsageDaily: { findUnique: hoisted.tokenUsageFindUnique },
    conversation: { count: hoisted.conversationCount },
    session: { findUnique: hoisted.sessionFindUnique },
    billingAccount: { findUnique: vi.fn() },
    invoiceRecord: { findMany: vi.fn() },
  },
}));

import { app } from './server';

describe('GET /api/billing/status auth hardening', () => {
  beforeEach(() => {
    hoisted.entitlementFindUnique.mockReset();
    hoisted.tokenUsageFindUnique.mockReset();
    hoisted.conversationCount.mockReset();
    hoisted.sessionFindUnique.mockReset();
  });

  it('rejects without session cookie', async () => {
    const res = await request(app).get('/api/billing/status');
    expect(res.status).toBe(401);
  });

  it('uses session identity (ignores query userId)', async () => {
    hoisted.sessionFindUnique.mockResolvedValue({
      sessionToken: 't',
      userId: 'u_session',
      expires: new Date(Date.now() + 60_000),
    });
    hoisted.entitlementFindUnique.mockResolvedValue({
      planType: 'FREE',
      dailyTokenLimit: 20,
      freeSimulationLimit: 5,
    } as any);
    hoisted.tokenUsageFindUnique.mockResolvedValue(null);
    hoisted.conversationCount.mockResolvedValue(3);

    const res = await request(app)
      .get('/api/billing/status?userId=u_other')
      .set('Cookie', 'next-auth.session-token=t');

    expect(res.status).toBe(200);
    expect(hoisted.entitlementFindUnique).toHaveBeenCalledWith({
      where: { subjectType_subjectId: { subjectType: 'USER', subjectId: 'u_session' } },
    });
  });
});

