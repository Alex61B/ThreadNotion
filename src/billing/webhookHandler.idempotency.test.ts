import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: {
  findFirstCalls: number;
  billingLogs: any[];
  invoiceUpserts: any[];
  subscriptionUpserts: any[];
  subscriptionUpdateMany: any[];
  entitlementUpserts: any[];
} = {
  findFirstCalls: 0,
  billingLogs: [],
  invoiceUpserts: [],
  subscriptionUpserts: [],
  subscriptionUpdateMany: [],
  entitlementUpserts: [],
};

vi.mock('../db', () => ({
  prisma: {
    billingEventLog: {
      findFirst: vi.fn(async ({ where }: any) => {
        state.findFirstCalls++;
        // First time: not seen. Second time: seen.
        return state.findFirstCalls === 1 ? null : { stripeEventId: where.stripeEventId };
      }),
      create: vi.fn(async (args: any) => {
        state.billingLogs.push(args);
        return {};
      }),
    },
    billingAccount: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.stripeCustomerId) return { id: 'ba1', stripeCustomerId: where.stripeCustomerId, userId: 'u1', teamId: null };
        if (where.userId) return null;
        if (where.id) return { id: where.id, userId: 'u1', teamId: null };
        return null;
      }),
      create: vi.fn(async (args: any) => ({ id: 'ba1', ...args.data })),
      update: vi.fn(async () => ({})),
    },
    subscription: {
      upsert: vi.fn(async (args: any) => {
        state.subscriptionUpserts.push(args);
        return {};
      }),
      updateMany: vi.fn(async (args: any) => {
        state.subscriptionUpdateMany.push(args);
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => ({ seatBundle: 'NONE' })),
    },
    entitlement: {
      upsert: vi.fn(async (args: any) => {
        state.entitlementUpserts.push(args);
        return {};
      }),
    },
    invoiceRecord: {
      upsert: vi.fn(async (args: any) => {
        state.invoiceUpserts.push(args);
        return {};
      }),
    },
  },
}));

import { handleStripeEvent } from './webhookHandler';

describe('Stripe webhook idempotency', () => {
  beforeEach(() => {
    state.findFirstCalls = 0;
    state.billingLogs = [];
    state.invoiceUpserts = [];
    state.subscriptionUpserts = [];
    state.subscriptionUpdateMany = [];
    state.entitlementUpserts = [];
  });

  it('dedupes the same stripeEventId and avoids double-applying side effects', async () => {
    const event: any = {
      id: 'evt_same',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_1',
          customer: 'cus_1',
          created: 1_700_000_000,
          amount_due: 1000,
          amount_paid: 1000,
          currency: 'usd',
          status: 'paid',
          hosted_invoice_url: 'https://invoice',
          invoice_pdf: 'https://pdf',
        },
      },
    };

    await handleStripeEvent(event);
    await handleStripeEvent(event);

    expect(state.billingLogs.length).toBe(1);
    expect(state.invoiceUpserts.length).toBe(1);
    expect(state.subscriptionUpdateMany.length).toBe(1);
    expect(state.entitlementUpserts.length).toBe(1);
  });
});

