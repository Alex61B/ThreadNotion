import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const hoisted = vi.hoisted(() => ({
  sessionFindUnique: vi.fn(),
  billingAccountFindUnique: vi.fn(),
  invoiceFindMany: vi.fn(),
  teamFindUnique: vi.fn(),
  teamMemberFindUnique: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    session: { findUnique: hoisted.sessionFindUnique },
    billingAccount: { findUnique: hoisted.billingAccountFindUnique },
    invoiceRecord: { findMany: hoisted.invoiceFindMany },
    team: { findUnique: hoisted.teamFindUnique },
    teamMember: { findUnique: hoisted.teamMemberFindUnique },
    entitlement: { findUnique: vi.fn() },
    tokenUsageDaily: { findUnique: vi.fn() },
  },
}));

import { app } from './server';

describe('Invoice visibility APIs (Phase 4)', () => {
  beforeEach(() => {
    hoisted.sessionFindUnique.mockReset();
    hoisted.billingAccountFindUnique.mockReset();
    hoisted.invoiceFindMany.mockReset();
    hoisted.teamFindUnique.mockReset();
    hoisted.teamMemberFindUnique.mockReset();
  });

  it('GET /api/billing/invoices rejects without session', async () => {
    const res = await request(app).get('/api/billing/invoices');
    expect(res.status).toBe(401);
  });

  it('GET /api/billing/invoices returns invoices for session user', async () => {
    hoisted.sessionFindUnique.mockResolvedValue({
      sessionToken: 't',
      userId: 'u1',
      expires: new Date(Date.now() + 60_000),
    });
    hoisted.billingAccountFindUnique.mockResolvedValue({ id: 'ba1' });
    hoisted.invoiceFindMany.mockResolvedValue([{ stripeInvoiceId: 'in_1' }]);

    const res = await request(app).get('/api/billing/invoices').set('Cookie', 'next-auth.session-token=t');
    expect(res.status).toBe(200);
    expect(res.body.invoices[0].stripeInvoiceId).toBe('in_1');
  });

  it('GET /api/team/:teamId/billing/invoices rejects non-manager', async () => {
    hoisted.sessionFindUnique.mockResolvedValue({
      sessionToken: 't',
      userId: 'u1',
      expires: new Date(Date.now() + 60_000),
    });
    hoisted.teamFindUnique.mockResolvedValue({ id: 't1', ownerId: 'owner' });
    hoisted.teamMemberFindUnique.mockResolvedValue({ teamId: 't1', userId: 'u1', role: 'rep' });

    const res = await request(app)
      .get('/api/team/t1/billing/invoices')
      .set('Cookie', 'next-auth.session-token=t');
    expect(res.status).toBe(403);
  });
});

